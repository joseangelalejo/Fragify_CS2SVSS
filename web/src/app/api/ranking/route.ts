import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const pageSize = Math.min(100, parseInt(searchParams.get('pageSize') ?? '50'))
  const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const region   = searchParams.get('region') ?? null
  const offset   = (page - 1) * pageSize

  try {
    const where      = region ? 'WHERE region_geografica = ?' : ''
    const baseParams = region ? [region] : []

    const rows = await query<any[]>(
      `SELECT steam_id64, nombre_usuario_steam, region_geografica,
              puntos_elo, tier, posicion_global, ultima_actualizacion,
              RANK() OVER (ORDER BY puntos_elo DESC) AS ranking_posicion
       FROM vw_ranking_jugadores_elo
       ${where}
       ORDER BY puntos_elo DESC
       LIMIT ${Number(pageSize)} OFFSET ${Number(offset)}`,
      baseParams
    )

    const countRows = await query<any[]>(
      `SELECT COUNT(*) AS total FROM vw_ranking_jugadores_elo ${where}`,
      baseParams
    )
    const total = countRows[0]?.total ?? 0

    return NextResponse.json({ data: rows, total, page, pageSize })
  } catch (err) {
    console.error('[API /ranking]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
