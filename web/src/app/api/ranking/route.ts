// src/app/api/ranking/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import type { RankingEntry, ApiResponse } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page     = Math.max(1, parseInt(searchParams.get('page')     ?? '1'))
  const pageSize = Math.min(100, parseInt(searchParams.get('pageSize') ?? '50'))
  const region   = searchParams.get('region') ?? null
  const offset   = (page - 1) * pageSize

  try {
    const params: unknown[] = []
    let where = ''
    if (region) {
      where = 'WHERE region_geografica = ?'
      params.push(region)
    }

    const rows = await query<RankingEntry[]>(
      `SELECT steam_id64, nombre_usuario_steam, region_geografica,
              puntos_elo, tier, posicion_global, ultima_actualizacion,
              RANK() OVER (ORDER BY puntos_elo DESC) AS ranking_posicion
       FROM vw_ranking_jugadores_elo
       ${where}
       ORDER BY puntos_elo DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    )

    const [[{ total }]] = await query<[{ total: number }]>(
      `SELECT COUNT(*) AS total FROM vw_ranking_jugadores_elo ${where}`,
      params
    )

    return NextResponse.json<ApiResponse<RankingEntry[]>>({
      data: rows,
      total,
      page,
      pageSize,
    })
  } catch (err) {
    console.error('[API /ranking]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
