// src/app/api/profile/avatar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { put, del } from '@vercel/blob'
import { query } from '@/lib/db'

const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED  = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any)?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file     = formData.get('avatar') as File | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!ALLOWED.includes(file.type))
    return NextResponse.json({ error: 'Only JPEG, PNG, WebP and GIF allowed' }, { status: 400 })
  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })

  // Borrar avatar anterior si no es de Steam
  const rows = await query<any[]>(
    `SELECT avatar_url, steam_linked FROM usuarios_fragify WHERE id_usuario = ?`,
    [userId]
  )
  const user = rows[0]
  if (user?.avatar_url && !user.steam_linked) {
    try { await del(user.avatar_url) } catch {}
  }

  const ext  = file.type.split('/')[1]
  const blob = await put(`avatars/${userId}.${ext}`, file, {
    access:    'public',
    addRandomSuffix: true,
  })

  await query(
    `UPDATE usuarios_fragify SET avatar_url = ? WHERE id_usuario = ?`,
    [blob.url, userId]
  )

  return NextResponse.json({ ok: true, url: blob.url })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any)?.id
  const rows   = await query<any[]>(
    `SELECT avatar_url, steam_linked FROM usuarios_fragify WHERE id_usuario = ?`,
    [userId]
  )
  const user = rows[0]
  if (user?.avatar_url && !user.steam_linked) {
    try { await del(user.avatar_url) } catch {}
  }

  await query(`UPDATE usuarios_fragify SET avatar_url = NULL WHERE id_usuario = ?`, [userId])
  return NextResponse.json({ ok: true })
}
