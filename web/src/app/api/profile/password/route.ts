// src/app/api/profile/password/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'

// GET — devuelve info de cuenta para que la UI sepa qué mostrar
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any)?.id
  const rows   = await query<any[]>(
    `SELECT password_hash, steam_linked, email, email_verified
     FROM usuarios_fragify WHERE id_usuario = ? LIMIT 1`,
    [userId]
  )
  const user = rows[0]
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json({
    hasPassword: !!user.password_hash,
    hasSteam:    user.steam_linked === 1,
    hasEmail:    !!(user.email && user.email_verified === 1),
  })
}

// PATCH — establece o cambia contraseña
// Si hasPassword=false (primer set): solo requiere newPass
// Si hasPassword=true (cambio):      requiere current + newPass
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any)?.id
  const { current, newPass } = await req.json()

  if (!newPass)
    return NextResponse.json({ error: 'New password is required' }, { status: 400 })
  if (newPass.length < 8)
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  if (!/\d/.test(newPass))
    return NextResponse.json({ error: 'Password must contain at least one number' }, { status: 400 })

  const rows = await query<any[]>(
    `SELECT password_hash, steam_linked, email, email_verified
     FROM usuarios_fragify WHERE id_usuario = ?`,
    [userId]
  )
  const user = rows[0]
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Verificar que tiene email verificado o Steam — necesario para poder recuperar acceso
  const canSetPassword = user.steam_linked === 1 || (user.email && user.email_verified === 1)
  if (!canSetPassword)
    return NextResponse.json({ error: 'Account must have a verified email or Steam to set a password' }, { status: 400 })

  // Si ya tiene password: verificar la actual antes de cambiar
  if (user.password_hash) {
    if (!current)
      return NextResponse.json({ error: 'Current password is required' }, { status: 400 })
    const valid = await bcrypt.compare(current, user.password_hash)
    if (!valid)
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
  }
  // Si no tiene password (primer set): no pedir current — se acepta directamente

  const hash = await bcrypt.hash(newPass, 12)
  await query(
    `UPDATE usuarios_fragify SET password_hash = ? WHERE id_usuario = ?`,
    [hash, userId]
  )

  return NextResponse.json({ ok: true })
}
