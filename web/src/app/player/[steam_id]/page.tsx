// src/app/player/[steam_id]/page.tsx
// Auto-import: si el jugador no está en BD, lo importa desde Steam automáticamente
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { query } from '@/lib/db'
import { PlayerTabs } from './PlayerTabs'

type Props = { params: Promise<{ steam_id: string }> }

export const dynamic = 'force-dynamic'

const STEAM_KEY  = process.env.STEAM_API_KEY
const CS2_APP_ID = 730

async function importFromSteam(steamId: string): Promise<boolean> {
  if (!STEAM_KEY) return false
  try {
    const [profileRes, statsRes] = await Promise.all([
      fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_KEY}&steamids=${steamId}`),
      fetch(`https://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v2/?key=${STEAM_KEY}&steamid=${steamId}&appid=${CS2_APP_ID}`)
    ])
    const profileData = await profileRes.json()
    const statsData   = await statsRes.json()

    const player = profileData.response?.players?.[0]
    if (!player) return false

    const stats = statsData.playerstats?.stats ?? []
    const get = (name: string) => stats.find((s: any) => s.name === name)?.value ?? 0

    const kills   = get('total_kills')
    const deaths  = get('total_deaths')
    const hs      = get('total_kills_headshot')
    const mvps    = get('total_mvps')
    const wins    = get('total_wins')
    const rounds  = get('total_rounds_played')
    const tiempo  = Math.round(get('total_time_played') / 60)
    const kd      = deaths > 0 ? parseFloat((kills / deaths).toFixed(2)) : kills
    const hsRatio = kills  > 0 ? parseFloat((hs / kills * 100).toFixed(2)) : 0
    const partidas_jugadas = Math.max(wins, Math.round(rounds / 24))

    // Comprobar límite de 500 jugadores
    const countRows = await query<any[]>('SELECT COUNT(*) AS total FROM jugadores_cs2')
    if ((countRows[0]?.total ?? 0) >= 500) return false

    await query(`
      INSERT INTO jugadores_cs2
        (steam_id64, nombre_usuario_steam, fecha_registro_fragify,
         estado_verificacion, ultima_actualizacion_datos, estado_actividad)
      VALUES (?, ?, NOW(), 1, NOW(), 1)
      ON DUPLICATE KEY UPDATE
        nombre_usuario_steam       = VALUES(nombre_usuario_steam),
        ultima_actualizacion_datos = NOW()
    `, [steamId, player.personaname])

    await query(`
      INSERT INTO estadisticas_cs2
        (steam_id64, kills, deaths, headshots, kd_ratio, mvps,
         tiempo_jugado, ratio_headshots,
         total_partidas_jugadas, total_partidas_ganadas, ultima_actualizacion)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        kills                  = VALUES(kills),
        deaths                 = VALUES(deaths),
        headshots              = VALUES(headshots),
        kd_ratio               = VALUES(kd_ratio),
        mvps                   = VALUES(mvps),
        tiempo_jugado          = VALUES(tiempo_jugado),
        ratio_headshots        = VALUES(ratio_headshots),
        total_partidas_jugadas = VALUES(total_partidas_jugadas),
        total_partidas_ganadas = VALUES(total_partidas_ganadas),
        ultima_actualizacion   = NOW()
    `, [steamId, kills, deaths, hs, kd, mvps, tiempo, hsRatio, partidas_jugadas, wins])

    return true
  } catch (err) {
    console.error('[auto-import]', err)
    return false
  }
}

async function getPlayerData(steamId: string) {
  try {
    // Stats globales
    const [stats] = await query<any[]>(
      'SELECT * FROM vw_estadisticas_jugador_resumen WHERE steam_id64 = ?', [steamId]
    )

    // Si no existe en BD → intentar importar desde Steam
    if (!stats) {
      const imported = await importFromSteam(steamId)
      if (!imported) return null
      // Reintentar tras importar
      const [newStats] = await query<any[]>(
        'SELECT * FROM vw_estadisticas_jugador_resumen WHERE steam_id64 = ?', [steamId]
      )
      if (!newStats) return null
      return buildPlayerData(steamId, newStats)
    }

    return buildPlayerData(steamId, stats)
  } catch (err) {
    console.error('[getPlayerData]', err)
    return null
  }
}

async function buildPlayerData(steamId: string, stats: any) {
  const [ranking] = await query<any[]>(`
    SELECT puntos_elo, tier, posicion_global FROM rankings_cs2
    WHERE steam_id64 = ? AND tipo_ranking = 'PREMIERE'
    ORDER BY ultima_actualizacion DESC LIMIT 1`, [steamId])

  const rankHistory = await query<any[]>(`
    SELECT r.tipo_ranking, r.tier, r.puntos_elo, r.victorias_mapa,
           r.ultima_actualizacion, COALESCE(m.nombre_display, r.mapa) AS nombre_mapa
    FROM rankings_cs2 r
    LEFT JOIN mapas m ON r.id_mapa = m.id_mapa
    WHERE r.steam_id64 = ?
    ORDER BY r.ultima_actualizacion DESC`, [steamId])

  const matches = await query<any[]>(`
    SELECT * FROM vw_match_history WHERE steam_id64 = ?
    ORDER BY fecha_partida DESC LIMIT 50`, [steamId])

  const maps = await query<any[]>(`
    SELECT * FROM vw_rendimiento_por_mapa WHERE steam_id64 = ?
    ORDER BY total_partidas_mapa DESC`, [steamId])

  const elo = await query<any[]>(`
    SELECT puntos_elo, tier, variacion_elo, fecha_snapshot
    FROM vw_evolucion_elo WHERE steam_id64 = ?
    ORDER BY fecha_snapshot ASC LIMIT 100`, [steamId])

  return { stats, ranking: ranking ?? null, rankHistory, matches, maps, elo }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { steam_id } = await params
  try {
    const [p] = await query<any[]>(
      'SELECT nombre_usuario_steam FROM jugadores_cs2 WHERE steam_id64 = ?', [steam_id]
    )
    return { title: p?.nombre_usuario_steam ?? steam_id }
  } catch { return { title: steam_id } }
}

export default async function PlayerProfilePage({ params }: Props) {
  const { steam_id } = await params
  if (!/^\d{17}$/.test(steam_id)) notFound()

  const data = await getPlayerData(steam_id)
  if (!data) notFound()

  return (
    <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:16, alignItems:'start' }}>
      <Sidebar stats={data.stats} rankHistory={data.rankHistory ?? []} />
      <PlayerTabs data={data} />
    </div>
  )
}

function Sidebar({ stats, rankHistory }: { stats: any; rankHistory: any[] }) {
  const premiers = rankHistory.filter(r => r.tipo_ranking === 'PREMIERE')
  const maps     = rankHistory.filter(r => r.tipo_ranking === 'MAPA')

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
      <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
        <div style={{ width:64, height:64, borderRadius:4, background:'var(--bg-border)',
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>
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

      <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'var(--t3)',
                    marginBottom:6, paddingBottom:4, borderBottom:'1px solid var(--bg-border)' }}>
        CS2
      </div>

      {premiers.slice(0,6).map((r, i) => (
        <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                               padding:'5px 0', borderBottom:'1px solid #191c28' }}>
          <span style={{ fontSize:10, background:'#1a2040', color:'#818cf8',
                          padding:'1px 6px', borderRadius:3, fontWeight:700 }}>
            PREMIER
          </span>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--orange)',
                           fontFamily:'IBM Plex Mono,monospace' }}>
              {r.puntos_elo?.toLocaleString()}
            </div>
            <div style={{ fontSize:10, color:'var(--t3)' }}>
              Wins: {r.victorias_mapa ?? '—'}
            </div>
          </div>
        </div>
      ))}

      {maps.slice(0,8).map((r, i) => (
        <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                               padding:'5px 0', borderBottom:'1px solid #191c28' }}>
          <span style={{ fontSize:11, color:'var(--t2)' }}>{r.nombre_mapa ?? 'Mapa'}</span>
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
