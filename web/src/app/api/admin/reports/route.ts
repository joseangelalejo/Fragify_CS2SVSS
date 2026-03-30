// src/app/api/admin/reports/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

async function checkAdmin() {
  const session = await auth()
  if (!session) return false
  return (session.user as any)?.role === 'ADMIN'
}

// GET — listar reportes filtrados por estado
export async function GET(req: NextRequest) {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const estado = req.nextUrl.searchParams.get('estado') ?? 'PENDIENTE'
  const validEstados = ['PENDIENTE', 'EN_PROCESO', 'RESUELTO', 'DESESTIMADO']
  if (!validEstados.includes(estado))
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })

  try {
    const rows = await query<any[]>(`
      SELECT
        r.id_reporte,
        r.estado_reporte,
        r.fecha_reporte,
        r.descripcion,
        r.steam_id64_reportado,
        jr.nombre_usuario_steam  AS jugador_reportado,
        jd.nombre_usuario_steam  AS jugador_reportador,
        ti.codigo                AS tipo_infraccion,
        ti.severidad
      FROM reportes_conducta r
      JOIN jugadores_cs2 jr ON r.steam_id64_reportado  = jr.steam_id64
      JOIN jugadores_cs2 jd ON r.steam_id64_reportador = jd.steam_id64
      JOIN tipos_infraccion ti ON r.id_tipo_infraccion = ti.id_tipo_infraccion
      WHERE r.estado_reporte = ?
      ORDER BY ti.severidad DESC, r.fecha_reporte DESC
      LIMIT 200
    `, [estado])

    return NextResponse.json({ data: rows, total: rows.length })
  } catch (err) {
    console.error('[admin/reports GET]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// PATCH — cambiar estado de un reporte
export async function PATCH(req: NextRequest) {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id_reporte, estado_reporte } = await req.json()
  const validEstados = ['PENDIENTE', 'EN_PROCESO', 'RESUELTO', 'DESESTIMADO']

  if (!id_reporte || !validEstados.includes(estado_reporte))
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  try {
    await query(
      `UPDATE reportes_conducta SET estado_reporte = ? WHERE id_reporte = ?`,
      [estado_reporte, id_reporte]
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/reports PATCH]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
