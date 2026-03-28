// src/app/api/ranking/competitive/route.ts
import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const rows = await query<any[]>(`
      SELECT
        pj.steam_id64,
        j.nombre_usuario_steam,
        COUNT(*)                                                          AS total_partidas,
        SUM(pj.resultado = 'VICTORIA')                                    AS victorias,
        SUM(pj.resultado = 'DERROTA')                                     AS derrotas,
        SUM(pj.resultado = 'EMPATE')                                      AS empates,
        ROUND(SUM(pj.resultado = 'VICTORIA') * 100.0 / COUNT(*), 1)      AS win_rate,
        ROUND(SUM(CASE WHEN pj.kills > 0 THEN pj.kills ELSE 0 END) /
              NULLIF(SUM(CASE WHEN pj.kills > 0 THEN pj.deaths ELSE 0 END), 0), 2)
                                                                          AS kd_ratio,
        RANK() OVER (ORDER BY
          ROUND(SUM(pj.resultado = 'VICTORIA') * 100.0 / COUNT(*), 1) DESC,
          COUNT(*) DESC
        )                                                                 AS ranking_posicion
      FROM partida_jugador pj
      JOIN jugadores_cs2 j ON pj.steam_id64 = j.steam_id64
      GROUP BY pj.steam_id64, j.nombre_usuario_steam
      HAVING total_partidas >= 10
      ORDER BY win_rate DESC, total_partidas DESC
      LIMIT 100
    `)
    return NextResponse.json({ data: rows })
  } catch (err) {
    console.error('[API /ranking/competitive]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
