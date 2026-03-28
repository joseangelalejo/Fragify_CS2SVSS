// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import dns from 'dns/promises'
import { sendVerificationEmail } from '@/lib/email'

const MAX_ACCOUNTS_PER_IP = 3
const RATE_LIMIT_WINDOW   = 60 * 60 * 1000 // 1 hora

function getIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? '0.0.0.0'
}

async function validateEmailDomain(email: string): Promise<{ valid: boolean; reason?: string }> {
  const domain = email.split('@')[1]
  if (!domain) return { valid: false, reason: 'Invalid email format' }
  try {
    const records = await dns.resolveMx(domain)
    if (!records || records.length === 0)
      return { valid: false, reason: 'Email domain has no mail server' }
    return { valid: true }
  } catch {
    return { valid: false, reason: 'Email domain does not exist' }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { username, email, password, honeypot } = body

    // Honeypot anti-bot
    if (honeypot) return NextResponse.json({ error: 'Bot detected' }, { status: 400 })

    // Validar campos
    if (!username || !email || !password)
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })

    // Validar username
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(username))
      return NextResponse.json({ error: 'Username must be 3-20 characters, letters, numbers, _ or -' }, { status: 400 })

    // Validar email formato
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })

    // Validar password
    if (password.length < 8)
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    if (!/\d/.test(password))
      return NextResponse.json({ error: 'Password must contain at least one number' }, { status: 400 })

    // Validar dominio email
    const domainCheck = await validateEmailDomain(email.toLowerCase())
    if (!domainCheck.valid)
      return NextResponse.json({ error: domainCheck.reason }, { status: 400 })

    const ip = getIP(req)

    // Rate limit por IP
    const cutoff = new Date(Date.now() - RATE_LIMIT_WINDOW).toISOString().slice(0, 19).replace('T', ' ')
    const recentAttempts = await query<any[]>(
      `SELECT COUNT(*) AS cnt FROM registro_intentos WHERE ip = ? AND fecha > ?`,
      [ip, cutoff]
    )
    if (Number(recentAttempts[0]?.cnt ?? 0) >= 5)
      return NextResponse.json({ error: 'Too many registration attempts. Try again later.' }, { status: 429 })

    // Límite de cuentas por IP
    const accountsFromIP = await query<any[]>(
      `SELECT COUNT(*) AS cnt FROM usuarios_fragify WHERE ip_registro = ?`,
      [ip]
    )
    if (Number(accountsFromIP[0]?.cnt ?? 0) >= MAX_ACCOUNTS_PER_IP)
      return NextResponse.json({ error: 'Maximum accounts per IP reached' }, { status: 429 })

    // Registrar intento
    await query(`INSERT INTO registro_intentos (ip) VALUES (?)`, [ip])

    // Comprobar username y email únicos
    const existing = await query<any[]>(
      `SELECT id_usuario FROM usuarios_fragify WHERE email = ? OR username = ? LIMIT 1`,
      [email.toLowerCase(), username]
    )
    if (existing.length > 0)
      return NextResponse.json({ error: 'Email or username already in use' }, { status: 409 })

    // Hash password
    const hash = await bcrypt.hash(password, 12)

    // Token verificación
    const token   = crypto.randomBytes(32).toString('hex')
    const expDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 19).replace('T', ' ')

    // Crear usuario
    await query(
      `INSERT INTO usuarios_fragify
        (username, email, password_hash, email_verify_token, email_verify_exp,
         email_verified, steam_linked, ip_registro, fecha_registro, activo)
       VALUES (?, ?, ?, ?, ?, 0, 0, ?, NOW(), 1)`,
      [username, email.toLowerCase(), hash, token, expDate, ip]
    )

    // Enviar email verificación
    await sendVerificationEmail(email.toLowerCase(), token, username)

    return NextResponse.json({ ok: true, message: 'Check your email to verify your account' })
  } catch (err) {
    console.error('[register]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
