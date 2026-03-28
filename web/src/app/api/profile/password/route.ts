// src/app/api/profile/password/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { query } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any)?.id
  const { current, newPass } = await req.json()

  if (!current || !newPass)
    return NextResponse.json({ error: 'All fields required' }, { status: 400 })
  if (newPass.length < 8)
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  if (!/\d/.test(newPass))
    return NextResponse.json({ error: 'Password must contain at least one number' }, { status: 400 })

  const rows = await query<any[]>(
    `SELECT password_hash FROM usuarios_fragify WHERE id_usuario = ?`, [userId]
  )
  const user = rows[0]
  if (!user?.password_hash)
    return NextResponse.json({ error: 'No password set for this account' }, { status: 400 })

  const valid = await bcrypt.compare(current, user.password_hash)
  if (!valid)
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })

  const hash = await bcrypt.hash(newPass, 12)
  await query(`UPDATE usuarios_fragify SET password_hash = ? WHERE id_usuario = ?`, [hash, userId])

  return NextResponse.json({ ok: true })
}
