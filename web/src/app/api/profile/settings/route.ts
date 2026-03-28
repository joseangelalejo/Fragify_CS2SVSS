// src/app/api/profile/settings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { query } from '@/lib/db'
import { sendVerificationEmail } from '@/lib/email'
import dns from 'dns/promises'
import crypto from 'crypto'

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

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any)?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { username, email } = await req.json()

  // Validar username
  if (username !== undefined) {
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(username))
      return NextResponse.json({ error: 'Username must be 3-20 characters, letters, numbers, _ or -' }, { status: 400 })

    const existing = await query<any[]>(
      `SELECT id_usuario FROM usuarios_fragify WHERE username = ? AND id_usuario != ?`,
      [username, userId]
    )
    if (existing.length > 0)
      return NextResponse.json({ error: 'Username already in use' }, { status: 409 })

    await query(`UPDATE usuarios_fragify SET username = ? WHERE id_usuario = ?`, [username, userId])
  }

  // Validar y procesar email
  if (email !== undefined) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })

    const domainCheck = await validateEmailDomain(email.toLowerCase())
    if (!domainCheck.valid)
      return NextResponse.json({ error: domainCheck.reason }, { status: 400 })

    const existing = await query<any[]>(
      `SELECT id_usuario FROM usuarios_fragify WHERE email = ? AND id_usuario != ?`,
      [email.toLowerCase(), userId]
    )
    if (existing.length > 0)
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 })

    // Generar token de verificación
    const token   = crypto.randomBytes(32).toString('hex')
    const expDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 19).replace('T', ' ')

    // Guardar email con verified=0 y token
    await query(
      `UPDATE usuarios_fragify
       SET email = ?, email_verified = 0, email_verify_token = ?, email_verify_exp = ?
       WHERE id_usuario = ?`,
      [email.toLowerCase(), token, expDate, userId]
    )

    // Enviar email de verificación
    const name = (session.user as any)?.name ?? 'User'
    await sendVerificationEmail(email.toLowerCase(), token, name)

    return NextResponse.json({
      ok: true,
      emailPending: true,
      message: 'Verification email sent. Please check your inbox to confirm your new email.',
    })
  }

  return NextResponse.json({ ok: true })
}
