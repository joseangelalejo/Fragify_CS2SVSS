// src/app/player/[steam_id]/page.tsx
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
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

async function getSteamProfile(steamId: string) {
  if (!STEAM_KEY) return null
  try {
    const res  = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_KEY}&steamids=${steamId}`,
      { next: { revalidate: 300 } }
    )
    const data = await res.json()
    return data.response?.players?.[0] ?? null
  } catch { return null }
}

async function getPlayerData(steamId: string) {
  try {
    const [stats] = await query<any[]>(
      'SELECT * FROM vw_estadisticas_jugador_resumen WHERE steam_id64 = ?', [steamId]
    )
    if (!stats) {
      const imported = await importFromSteam(steamId)
      if (!imported) return null
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

  const [data, steamProfile] = await Promise.all([
    getPlayerData(steam_id),
    getSteamProfile(steam_id),
  ])
  if (!data) notFound()

  return (
    <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:20, alignItems:'start' }}>
      <Sidebar stats={data.stats} rankHistory={data.rankHistory ?? []} steamProfile={steamProfile} steamId={steam_id} />
      <PlayerTabs data={data} />
    </div>
  )
}

function tierBadgeColor(tier: string) {
  const t = (tier ?? '').toLowerCase()
  if (t.includes('global') || t.includes('elite'))   return { bg:'rgba(249,115,22,0.15)', color:'#f97316' }
  if (t.includes('supreme') || t.includes('master'))  return { bg:'rgba(192,132,252,0.15)', color:'#c084fc' }
  if (t.includes('legendary') || t.includes('legend'))return { bg:'rgba(251,191,36,0.15)', color:'#fbbf24' }
  if (t.includes('distinguished'))                    return { bg:'rgba(96,165,250,0.15)', color:'#60a5fa' }
  if (t.includes('guardian') || t.includes('gold'))   return { bg:'rgba(234,179,8,0.15)',  color:'#eab308' }
  return { bg:'rgba(100,116,139,0.15)', color:'#94a3b8' }
}

function Sidebar({ stats, rankHistory, steamProfile, steamId }: {
  stats: any; rankHistory: any[]; steamProfile: any; steamId: string
}) {
  const premiers = rankHistory.filter(r => r.tipo_ranking === 'PREMIERE')
  const maps     = rankHistory.filter(r => r.tipo_ranking === 'MAPA')
  const avatarUrl= steamProfile?.avatarfull ?? steamProfile?.avatarmedium ?? null
  const name     = stats.nombre_usuario_steam
  const played   = Number(stats.total_partidas_jugadas ?? 0)
  const won      = Number(stats.total_partidas_ganadas ?? 0)
  const kills    = Number(stats.kills ?? 0)
  const kd       = Number(stats.kd_ratio ?? 0)
  const hoursPlayed = stats.tiempo_jugado ? Math.round(Number(stats.tiempo_jugado) / 60) : null

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>

      {/* Avatar + nombre */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--bg-border)',
                    borderRadius:8, padding:16, marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
          <div style={{ width:64, height:64, borderRadius:6, overflow:'hidden', flexShrink:0,
                        background:'var(--bg-border)', position:'relative' }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} width={64} height={64}
                   style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            ) : (
              <div style={{ width:64, height:64, display:'flex', alignItems:'center',
                             justifyContent:'center', fontSize:28, background:'var(--bg-border)' }}>
                🎮
              </div>
            )}
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:16, fontWeight:700,
                           color:'var(--t1)', overflow:'hidden', textOverflow:'ellipsis',
                           whiteSpace:'nowrap' }}>
              {name}
            </div>
            {stats.region_geografica && (
              <div style={{ fontSize:11, color:'var(--t3)', marginTop:2 }}>
                📍 {stats.region_geografica}
              </div>
            )}
            <a href={`https://steamcommunity.com/profiles/${steamId}`}
               target="_blank" rel="noopener noreferrer"
               style={{ fontSize:10, color:'var(--orange)', textDecoration:'none',
                         display:'inline-flex', alignItems:'center', gap:3, marginTop:3 }}>
              Steam Profile ↗
            </a>
          </div>
        </div>

        {/* Mini stats */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {[
            { label:'MATCHES', value: played.toLocaleString('en-US') },
            { label:'WINS',    value: won.toLocaleString('en-US') },
            { label:'KILLS',   value: kills.toLocaleString('en-US') },
            { label:'K/D',     value: kd.toFixed(2) },
            ...(hoursPlayed ? [{ label:'HOURS', value: hoursPlayed.toLocaleString('en-US') }] : []),
          ].map(s => (
            <div key={s.label} style={{ background:'#0d0e13', borderRadius:6, padding:'8px 10px' }}>
              <div style={{ fontSize:9, color:'var(--t3)', letterSpacing:'0.1em', marginBottom:2 }}>{s.label}</div>
              <div style={{ fontSize:14, fontFamily:'IBM Plex Mono,monospace', fontWeight:600, color:'var(--t1)' }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Premier */}
      {premiers.length > 0 && (
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--bg-border)',
                      borderRadius:8, padding:12, marginBottom:8 }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.12em', color:'var(--t3)',
                        marginBottom:8 }}>
            CS2 PREMIER
          </div>
          {premiers.slice(0,3).map((r, i) => {
            const { bg, color } = tierBadgeColor(r.tier)
            return (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                                     padding:'6px 0', borderBottom: i < premiers.length-1 ? '1px solid #191c28' : 'none' }}>
                <span style={{ fontSize:11, background:bg, color, padding:'2px 7px',
                                borderRadius:4, fontWeight:700 }}>
                  {r.tier ?? 'PREMIER'}
                </span>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:14, fontWeight:700, color:'var(--orange)',
                                 fontFamily:'IBM Plex Mono,monospace' }}>
                    {Number(r.puntos_elo).toLocaleString('en-US')}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Map rankings */}
      {maps.length > 0 && (
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--bg-border)',
                      borderRadius:8, padding:12 }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.12em', color:'var(--t3)',
                        marginBottom:8 }}>
            CS2 COMPETITIVE
          </div>
          {maps.slice(0,6).map((r, i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                                   padding:'5px 0', borderBottom: i < maps.length-1 ? '1px solid #191c28' : 'none' }}>
              <span style={{ fontSize:11, color:'var(--t2)' }}>{r.nombre_mapa ?? 'Map'}</span>
              <span style={{ fontSize:11, color:'var(--t1)', fontFamily:'IBM Plex Mono,monospace' }}>
                {r.tier}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
