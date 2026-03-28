// src/app/api/support/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

function getIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0'
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { nombre, email, asunto, mensaje, categoria, honeypot } = body

    if (honeypot) return NextResponse.json({ error: 'Bot detected' }, { status: 400 })

    if (!nombre?.trim() || !email?.trim() || !asunto?.trim() || !mensaje?.trim())
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })

    if (mensaje.length > 2000)
      return NextResponse.json({ error: 'Message too long (max 2000 chars)' }, { status: 400 })

    const session = await getServerSession(authOptions)
    const userId  = session ? (session.user as any)?.id : null
    const ip      = getIP(req)

    // Rate limit: max 3 tickets por IP en 24h
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ')
    const recent = await query<any[]>(
      `SELECT COUNT(*) AS cnt FROM support_tickets WHERE ip_origen = ? AND fecha_creacion > ?`,
      [ip, cutoff]
    )
    if (Number(recent[0]?.cnt ?? 0) >= 3)
      return NextResponse.json({ error: 'Too many tickets submitted. Try again tomorrow.' }, { status: 429 })

    const validCategories = ['BUG', 'CUENTA', 'DATOS', 'OTRO']
    const cat = validCategories.includes(categoria) ? categoria : 'OTRO'

    await query(
      `INSERT INTO support_tickets (nombre, email, asunto, mensaje, categoria, id_usuario, ip_origen)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nombre.trim(), email.toLowerCase().trim(), asunto.trim(), mensaje.trim(), cat, userId, ip]
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[support]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Admin: listar tickets
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'ADMIN')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const estado  = req.nextUrl.searchParams.get('estado') ?? 'ABIERTO'
  const tickets = await query<any[]>(
    `SELECT * FROM support_tickets WHERE estado = ? ORDER BY fecha_creacion DESC LIMIT 100`,
    [estado]
  )
  return NextResponse.json({ tickets })
}

// Admin: actualizar estado ticket
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'ADMIN')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { id, estado, notas_admin } = await req.json()
  await query(
    `UPDATE support_tickets SET estado = ?, notas_admin = ? WHERE id = ?`,
    [estado, notas_admin ?? null, id]
  )
  return NextResponse.json({ ok: true })
}
