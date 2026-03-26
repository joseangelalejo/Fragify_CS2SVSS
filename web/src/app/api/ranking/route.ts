// src/app/api/ranking/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import type { RankingEntry, ApiResponse } from '@/lib/types'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page     = Math.max(1, parseInt(searchParams.get('page')     ?? '1'))
  const pageSize = Math.min(100, parseInt(searchParams.get('pageSize') ?? '25'))
  const region   = searchParams.get('region')
  const offset   = (page - 1) * pageSize

  try {
    let sql = `
      SELECT steam_id64, nombre_usuario_steam, region_geografica,
             puntos_elo, tier, posicion_global, ultima_actualizacion,
             RANK() OVER (ORDER BY puntos_elo DESC) AS ranking_posicion
      FROM vw_ranking_jugadores_elo
    `
    const params: unknown[] = []

    if (region) {
      sql += ' WHERE region_geografica = ?'
      params.push(region)
    }

    sql += ' LIMIT ? OFFSET ?'
    params.push(pageSize, offset)

    const rows = await query<RankingEntry[]>(sql, params)

    const [[{ total }]] = await query<[{ total: number }]>(
      `SELECT COUNT(*) AS total FROM vw_ranking_jugadores_elo
       ${region ? 'WHERE region_geografica = ?' : ''}`,
      region ? [region] : []
    )

    return NextResponse.json<ApiResponse<RankingEntry[]>>({
      data: rows,
      total,
      page,
      pageSize,
    })
  } catch (err) {
    console.error('[API /ranking]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
