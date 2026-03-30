// src/app/api/auth/2fa/verify/route.ts
// Verifica el código 2FA durante el login
// El flujo es: login OK → si 2FA activo → POST aquí con el código → devuelve token temporal

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { authenticator } from 'otplib/preset/default'
import { send2FALoginEmail } from '@/lib/email'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// POST — enviar OTP por email (para método EMAIL antes de verificar)
export async function PUT(req: NextRequest) {
  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 })

  const [user] = await query<any[]>(
    `SELECT email, username, two_fa_method, two_fa_enabled FROM usuarios_fragify WHERE id_usuario = ?`,
    [userId]
  )
  if (!user || !user.two_fa_enabled || user.two_fa_method !== 'EMAIL')
    return NextResponse.json({ error: 'No aplica' }, { status: 400 })

  const otp    = crypto.randomInt(100000, 999999).toString()
  const expiry = new Date(Date.now() + 10 * 60 * 1000)
    .toISOString().slice(0, 19).replace('T', ' ')

  await query(
    `UPDATE usuarios_fragify SET two_fa_otp = ?, two_fa_otp_exp = ? WHERE id_usuario = ?`,
    [otp, expiry, userId]
  )
  await send2FALoginEmail(user.email, user.username ?? 'User', otp)
  return NextResponse.json({ ok: true, email: user.email })
}

// POST — verificar código 2FA
export async function POST(req: NextRequest) {
  const { userId, code, backup } = await req.json()
  if (!userId || (!code && !backup))
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })

  const [user] = await query<any[]>(
    `SELECT two_fa_method, two_fa_secret, two_fa_otp, two_fa_otp_exp,
            two_fa_backup, two_fa_enabled
     FROM usuarios_fragify WHERE id_usuario = ?`,
    [userId]
  )
  if (!user || !user.two_fa_enabled)
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  // Código de respaldo
  if (backup) {
    if (backup.toUpperCase() === user.two_fa_backup) {
      // Desactivar 2FA tras usar el backup
      await query(
        `UPDATE usuarios_fragify
         SET two_fa_enabled = 0, two_fa_method = NULL, two_fa_secret = NULL,
             two_fa_backup = NULL, two_fa_otp = NULL, two_fa_otp_exp = NULL
         WHERE id_usuario = ?`,
        [userId]
      )
      return NextResponse.json({ ok: true, backupUsed: true })
    }
    return NextResponse.json({ error: 'Código de respaldo incorrecto' }, { status: 400 })
  }

  let valid = false
  if (user.two_fa_method === 'TOTP' && user.two_fa_secret) {
    valid = authenticator.verify({ token: code, secret: user.two_fa_secret })
  } else if (user.two_fa_method === 'EMAIL' && user.two_fa_otp) {
    const now = new Date()
    const exp = new Date(user.two_fa_otp_exp)
    valid = code === user.two_fa_otp && now < exp
    if (valid) {
      await query(
        `UPDATE usuarios_fragify SET two_fa_otp = NULL, two_fa_otp_exp = NULL WHERE id_usuario = ?`,
        [userId]
      )
    }
  }

  if (!valid) return NextResponse.json({ error: 'Código incorrecto o expirado' }, { status: 400 })
  return NextResponse.json({ ok: true })
}
