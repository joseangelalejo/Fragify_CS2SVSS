// src/app/api/profile/settings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { query } from '@/lib/db'
import dns from 'dns/promises'

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

  // Validar username si se proporciona
  if (username !== undefined) {
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(username))
      return NextResponse.json({ error: 'Username must be 3-20 characters, letters, numbers, _ or -' }, { status: 400 })

    const existing = await query<any[]>(
      `SELECT id_usuario FROM usuarios_fragify WHERE username = ? AND id_usuario != ?`,
      [username, userId]
    )
    if (existing.length > 0)
      return NextResponse.json({ error: 'Username already in use' }, { status: 409 })
  }

  // Validar email si se proporciona
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
  }

  // Actualizar
  if (username !== undefined && email !== undefined) {
    await query(
      `UPDATE usuarios_fragify SET username = ?, email = ? WHERE id_usuario = ?`,
      [username, email.toLowerCase(), userId]
    )
  } else if (username !== undefined) {
    await query(`UPDATE usuarios_fragify SET username = ? WHERE id_usuario = ?`, [username, userId])
  } else if (email !== undefined) {
    await query(`UPDATE usuarios_fragify SET email = ? WHERE id_usuario = ?`, [email.toLowerCase(), userId])
  }

  return NextResponse.json({ ok: true })
}
