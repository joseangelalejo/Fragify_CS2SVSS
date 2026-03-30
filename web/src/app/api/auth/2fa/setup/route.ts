// src/app/api/auth/2fa/setup/route.ts
// Configura 2FA para el usuario: genera secret TOTP o envía OTP por email
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { query } from '@/lib/db'
import { authenticator } from 'otplib'
import { send2FASetupEmail } from '@/lib/email'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// GET — obtener estado 2FA del usuario
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any)?.id

  const [row] = await query<any[]>(
    `SELECT two_fa_enabled, two_fa_method FROM usuarios_fragify WHERE id_usuario = ?`,
    [userId]
  )
  return NextResponse.json({
    enabled: row?.two_fa_enabled === 1,
    method:  row?.two_fa_method ?? null,
  })
}

// POST — iniciar setup de 2FA
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any)?.id
  const { method } = await req.json()

  if (!['TOTP', 'EMAIL'].includes(method))
    return NextResponse.json({ error: 'Método inválido' }, { status: 400 })

  const [user] = await query<any[]>(
    `SELECT email, username, two_fa_enabled FROM usuarios_fragify WHERE id_usuario = ?`,
    [userId]
  )
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  if (user.two_fa_enabled) return NextResponse.json({ error: '2FA ya está activo' }, { status: 400 })

  if (method === 'TOTP') {
    const secret = authenticator.generateSecret()
    const otpauth = authenticator.keyuri(
      user.email ?? user.username ?? `user_${userId}`,
      'Fragify',
      secret
    )
    // Guardar secret temporal (no activo hasta confirmar)
    await query(
      `UPDATE usuarios_fragify SET two_fa_secret = ?, two_fa_method = 'TOTP' WHERE id_usuario = ?`,
      [secret, userId]
    )
    return NextResponse.json({ method: 'TOTP', otpauth, secret })
  }

  if (method === 'EMAIL') {
    if (!user.email) return NextResponse.json({ error: 'No tienes email configurado' }, { status: 400 })
    const otp    = crypto.randomInt(100000, 999999).toString()
    const expiry = new Date(Date.now() + 10 * 60 * 1000)
      .toISOString().slice(0, 19).replace('T', ' ')

    await query(
      `UPDATE usuarios_fragify
       SET two_fa_otp = ?, two_fa_otp_exp = ?, two_fa_method = 'EMAIL'
       WHERE id_usuario = ?`,
      [otp, expiry, userId]
    )
    await send2FASetupEmail(user.email, user.username ?? 'User', otp)
    return NextResponse.json({ method: 'EMAIL', email: user.email })
  }
}

// PATCH — confirmar y activar 2FA
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any)?.id
  const { code } = await req.json()

  if (!code || code.length < 6)
    return NextResponse.json({ error: 'Código inválido' }, { status: 400 })

  const [user] = await query<any[]>(
    `SELECT two_fa_method, two_fa_secret, two_fa_otp, two_fa_otp_exp
     FROM usuarios_fragify WHERE id_usuario = ?`,
    [userId]
  )
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  let valid = false

  if (user.two_fa_method === 'TOTP' && user.two_fa_secret) {
    valid = authenticator.verify({ token: code, secret: user.two_fa_secret })
  } else if (user.two_fa_method === 'EMAIL' && user.two_fa_otp) {
    const now = new Date()
    const exp = new Date(user.two_fa_otp_exp)
    valid = code === user.two_fa_otp && now < exp
  }

  if (!valid) return NextResponse.json({ error: 'Código incorrecto o expirado' }, { status: 400 })

  // Generar código de respaldo
  const backup = crypto.randomBytes(4).toString('hex').toUpperCase()

  await query(
    `UPDATE usuarios_fragify
     SET two_fa_enabled = 1, two_fa_otp = NULL, two_fa_otp_exp = NULL,
         two_fa_backup = ?
     WHERE id_usuario = ?`,
    [backup, userId]
  )
  return NextResponse.json({ ok: true, backup })
}

// DELETE — desactivar 2FA
export async function DELETE() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any)?.id

  await query(
    `UPDATE usuarios_fragify
     SET two_fa_enabled = 0, two_fa_method = NULL, two_fa_secret = NULL,
         two_fa_otp = NULL, two_fa_otp_exp = NULL, two_fa_backup = NULL
     WHERE id_usuario = ?`,
    [userId]
  )
  return NextResponse.json({ ok: true })
}
