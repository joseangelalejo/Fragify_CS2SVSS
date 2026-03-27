// src/app/api/player/[steam_id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ steam_id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { steam_id } = await params

  if (!/^\d{17}$/.test(steam_id)) {
    return NextResponse.json({ error: 'Steam ID inválido' }, { status: 400 })
  }

  try {
    const [stats] = await query<any[]>(
      'SELECT * FROM vw_estadisticas_jugador_resumen WHERE steam_id64 = ?',
      [steam_id]
    )
    if (!stats) {
      return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 })
    }

    const [ranking] = await query<any[]>(
      `SELECT puntos_elo, tier, posicion_global FROM rankings_cs2
       WHERE steam_id64 = ? AND tipo_ranking = 'PREMIERE'
       ORDER BY ultima_actualizacion DESC LIMIT 1`,
      [steam_id]
    )

    const matches = await query<any[]>(
      `SELECT * FROM vw_match_history WHERE steam_id64 = ?
       ORDER BY fecha_partida DESC LIMIT 20`,
      [steam_id]
    )

    const eloHistory = await query<any[]>(
      `SELECT * FROM vw_evolucion_elo WHERE steam_id64 = ?
       ORDER BY fecha_snapshot ASC LIMIT 100`,
      [steam_id]
    )

    const rankHistory = await query<any[]>(
      `SELECT r.tipo_ranking, r.tier, r.puntos_elo, r.victorias_mapa,
              r.ultima_actualizacion, COALESCE(m.nombre_display, r.mapa) AS nombre_mapa
       FROM rankings_cs2 r
       LEFT JOIN mapas m ON r.id_mapa = m.id_mapa
       WHERE r.steam_id64 = ?
       ORDER BY r.ultima_actualizacion DESC`,
      [steam_id]
    )

    const maps = await query<any[]>(
      `SELECT * FROM vw_rendimiento_por_mapa WHERE steam_id64 = ?
       ORDER BY total_partidas_mapa DESC`,
      [steam_id]
    )

    return NextResponse.json({
      data: { stats, ranking: ranking ?? null, rankHistory, matches, maps, eloHistory },
    })
  } catch (err) {
    console.error('[API /player]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
