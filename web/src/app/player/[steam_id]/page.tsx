import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { query } from '@/lib/db'
import { PlayerTabs } from './PlayerTabs'

type Props = { params: Promise<{ steam_id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { steam_id } = await params
  try {
    const [p] = await query<{ nombre_usuario_steam: string }[]>(
      'SELECT nombre_usuario_steam FROM jugadores_cs2 WHERE steam_id64 = ?', [steam_id]
    )
    return { title: p?.nombre_usuario_steam ?? steam_id }
  } catch { return { title: steam_id } }
}

async function getPlayerData(steamId: string) {
  // Stats globales
  const [stats] = await query<any[]>(
    'SELECT * FROM vw_estadisticas_jugador_resumen WHERE steam_id64 = ?', [steamId]
  )
  if (!stats) return null

  // Ranking actual PREMIER
  const [ranking] = await query<any[]>(`
    SELECT puntos_elo, tier, posicion_global FROM rankings_cs2
    WHERE steam_id64 = ? AND tipo_ranking = 'PREMIERE'
    ORDER BY ultima_actualizacion DESC LIMIT 1`, [steamId])

  // Historial de rankings (sidebar)
  const rankHistory = await query<any[]>(`
    SELECT tipo_ranking, tier, puntos_elo, victorias_mapa, ultima_actualizacion, id_mapa,
           m.nombre_display AS nombre_mapa
    FROM rankings_cs2 r
    LEFT JOIN mapas m ON r.id_mapa = m.id_mapa
    WHERE r.steam_id64 = ?
    ORDER BY r.ultima_actualizacion DESC`, [steamId])

  // Últimas 50 partidas
  const matches = await query<any[]>(`
    SELECT * FROM vw_match_history WHERE steam_id64 = ?
    ORDER BY fecha_partida DESC LIMIT 50`, [steamId])

  // Rendimiento por mapa
  const maps = await query<any[]>(`
    SELECT * FROM vw_rendimiento_por_mapa WHERE steam_id64 = ?
    ORDER BY total_partidas_mapa DESC`, [steamId])

  // Historial ELO
  const elo = await query<any[]>(`
    SELECT puntos_elo, tier, variacion_elo, fecha_snapshot
    FROM vw_evolucion_elo WHERE steam_id64 = ?
    ORDER BY fecha_snapshot ASC LIMIT 100`, [steamId])

  return { stats, ranking: ranking ?? null, rankHistory, matches, maps, elo }
}

export default async function PlayerProfilePage({ params }: Props) {
  const { steam_id } = await params
  if (!/^\d{17}$/.test(steam_id)) notFound()

  const data = await getPlayerData(steam_id).catch(() => null)
  if (!data) notFound()

  return (
    <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:16, alignItems:'start' }}>
      {/* ── Sidebar ── */}
      <Sidebar stats={data.stats} rankHistory={data.rankHistory} />
      {/* ── Main content con tabs ── */}
      <PlayerTabs data={data} />
    </div>
  )
}

function Sidebar({ stats, rankHistory }: { stats: any; rankHistory: any[] }) {
  const premiers = rankHistory.filter(r => r.tipo_ranking === 'PREMIERE')
  const maps     = rankHistory.filter(r => r.tipo_ranking === 'MAPA')

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
      {/* Avatar + nombre */}
      <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:12 }}>
        <div style={{ width:64, height:64, borderRadius:4, background:'var(--bg-border)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:28 }}>
          🎮
        </div>
        <div>
          <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:18, fontWeight:700, color:'var(--t1)' }}>
            {stats.nombre_usuario_steam}
          </div>
          {stats.region_geografica && (
            <div style={{ fontSize:11, color:'var(--t3)', marginTop:2 }}>
              📍 {stats.region_geografica}
            </div>
          )}
        </div>
      </div>

      {/* CS2 section */}
      <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'var(--t3)',
                    marginBottom:6, paddingBottom:4, borderBottom:'1px solid var(--bg-border)' }}>
        CS2
      </div>

      {/* Premier history */}
      {premiers.length > 0 && (
        <div style={{ marginBottom:8 }}>
          {premiers.slice(0,6).map((r, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                                   padding:'5px 0', borderBottom:'1px solid #191c28' }}>
              <div>
                <div style={{ fontSize:10, background:'#1a2040', color:'#818cf8',
                               padding:'1px 6px', borderRadius:3, fontWeight:700, display:'inline-block' }}>
                  PREMIER
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--orange)',
                               fontFamily:'IBM Plex Mono,monospace' }}>
                  {r.puntos_elo.toLocaleString()}
                </div>
                <div style={{ fontSize:10, color:'var(--t3)' }}>
                  Wins: {r.victorias_mapa ?? '—'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Map rankings */}
      {maps.slice(0,8).map((r, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                               padding:'5px 0', borderBottom:'1px solid #191c28' }}>
          <div style={{ fontSize:11, color:'var(--t2)' }}>{r.nombre_mapa ?? 'Mapa'}</div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:11, color:'var(--t1)', fontFamily:'IBM Plex Mono,monospace' }}>
              {r.tier}
            </div>
            <div style={{ fontSize:10, color:'var(--t3)' }}>Wins: {r.victorias_mapa ?? '—'}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
