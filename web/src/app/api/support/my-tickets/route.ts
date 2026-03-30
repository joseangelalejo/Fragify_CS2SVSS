// src/app/api/support/my-tickets/route.ts
// Devuelve los tickets del usuario autenticado
import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any)?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const tickets = await query<any[]>(`
      SELECT id, asunto, mensaje, categoria, estado,
             fecha_creacion, fecha_respuesta,
             respuesta_admin
      FROM support_tickets
      WHERE id_usuario = ?
      ORDER BY fecha_creacion DESC
      LIMIT 50
    `, [userId])

    return NextResponse.json({ tickets })
  } catch (err) {
    console.error('[my-tickets]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
