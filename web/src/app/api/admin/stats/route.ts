// src/app/api/admin/stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'ADMIN')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const [counts, recent] = await Promise.all([
    query<any[]>(`
      SELECT
        (SELECT COUNT(*) FROM usuarios_fragify) AS users,
        (SELECT COUNT(*) FROM jugadores_cs2)    AS players,
        (SELECT COUNT(*) FROM rankings_cs2)     AS rankings,
        (SELECT COUNT(*) FROM support_tickets WHERE estado = 'ABIERTO') AS tickets,
        (SELECT COUNT(*) FROM reportes_conducta WHERE estado_reporte = 'PENDIENTE') AS reports_pending
    `),
    query<any[]>(`
      SELECT id_usuario, username, email, fecha_registro, steam_linked
      FROM usuarios_fragify ORDER BY fecha_registro DESC LIMIT 10
    `),
  ])

  return NextResponse.json({ ...counts[0], recent })
}
