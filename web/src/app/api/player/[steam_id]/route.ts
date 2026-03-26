// src/app/api/player/[steam_id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import type { PlayerStats, MatchHistory, EloSnapshot } from '@/lib/types'

type Params = { params: Promise<{ steam_id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { steam_id } = await params

  // Validar formato Steam ID64
  if (!/^\d{17}$/.test(steam_id)) {
    return NextResponse.json({ error: 'Steam ID inválido' }, { status: 400 })
  }

  try {
    // Stats del jugador
    const [stats] = await query<PlayerStats[]>(
      'SELECT * FROM vw_estadisticas_jugador_resumen WHERE steam_id64 = ?',
      [steam_id]
    )

    if (!stats) {
      return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 })
    }

    // Últimas 20 partidas
    const matches = await query<MatchHistory[]>(
      `SELECT * FROM vw_match_history
       WHERE steam_id64 = ?
       ORDER BY fecha_partida DESC
       LIMIT 20`,
      [steam_id]
    )

    // Historial ELO (últimos 50 snapshots)
    const eloHistory = await query<EloSnapshot[]>(
      `SELECT * FROM vw_evolucion_elo
       WHERE steam_id64 = ?
       ORDER BY fecha_snapshot DESC
       LIMIT 50`,
      [steam_id]
    )

    // Ranking actual PREMIERE
    const [ranking] = await query<{ puntos_elo: number; tier: string; posicion_global: number | null }[]>(
      `SELECT puntos_elo, tier, posicion_global
       FROM rankings_cs2
       WHERE steam_id64 = ? AND tipo_ranking = 'PREMIERE'
       ORDER BY ultima_actualizacion DESC
       LIMIT 1`,
      [steam_id]
    )

    return NextResponse.json({
      data: {
        stats,
        matches,
        eloHistory: eloHistory.reverse(), // cronológico para gráficas
        ranking: ranking ?? null,
      },
    })
  } catch (err) {
    console.error('[API /player]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
