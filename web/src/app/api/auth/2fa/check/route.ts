// src/app/api/auth/2fa/check/route.ts
// Verifica credenciales sin crear sesión — para saber si necesita 2FA
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password)
    return NextResponse.json({ error: 'Credenciales requeridas' }, { status: 400 })

  const [user] = await query<any[]>(
    `SELECT id_usuario, email, password_hash, email_verified, activo,
            steam_id64, two_fa_enabled, two_fa_method
     FROM usuarios_fragify WHERE email = ? LIMIT 1`,
    [String(email).toLowerCase()]
  )

  if (!user || !user.activo)
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
  if (!user.email_verified)
    return NextResponse.json({ error: 'EMAIL_NOT_VERIFIED' }, { status: 401 })
  if (!user.password_hash)
    return NextResponse.json({ error: 'USE_STEAM' }, { status: 401 })

  const valid = await bcrypt.compare(String(password), user.password_hash)
  if (!valid)
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })

  // Credenciales OK — ¿tiene 2FA?
  if (user.two_fa_enabled) {
    return NextResponse.json({
      requires2FA: true,
      userId: String(user.id_usuario),
      method: user.two_fa_method,
    })
  }

  return NextResponse.json({ requires2FA: false })
}
