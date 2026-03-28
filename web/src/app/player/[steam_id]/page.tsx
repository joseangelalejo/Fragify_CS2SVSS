// src/app/player/[steam_id]/page.tsx
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { query } from '@/lib/db'
import { PlayerTabs } from './PlayerTabs'

type Props = { params: Promise<{ steam_id: string }> }
export const dynamic = 'force-dynamic'

const STEAM_KEY  = process.env.STEAM_API_KEY
const CS2_APP_ID = 730

// Solo se llama si el jugador NO tiene ninguna partida en partidas_cs2
// (es decir, usuario nuevo que visita por primera vez su perfil).
// NO sobreescribe estadísticas de jugadores con datos reales importados.
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
    const kd      = deaths > 0 ? parseFloat((kills / deaths).toFixed(2)) : kills > 0 ? kills : 0
    const hsRatio = kills  > 0 ? parseFloat((hs / kills * 100).toFixed(2)) : 0
    const partidas_estimadas = Math.round(rounds / 30)
    const partidas_jugadas   = wins > 0 ? Math.max(wins, partidas_estimadas) : partidas_estimadas

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

async function getCsgoStats(steamId: string) {
  if (!STEAM_KEY) return null
  try {
    const res  = await fetch(
      `https://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v2/?key=${STEAM_KEY}&steamid=${steamId}&appid=730`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    // La API de CS:GO (730) devuelve stats acumuladas de CS:GO + CS2 mezcladas.
    // Solo las mostramos como referencia histórica en la tab CS:GO.
    const stats = data.playerstats?.stats ?? []
    if (stats.length === 0) return null
    const get = (name: string) => stats.find((s: any) => s.name === name)?.value ?? 0

    const kills   = get('total_kills')
    const deaths  = get('total_deaths')
    const hs      = get('total_kills_headshot')
    const wins    = get('total_wins')
    const rounds  = get('total_rounds_played')
    const tiempo  = Math.round(get('total_time_played') / 3600)
    const mvps    = get('total_mvps')
    const kd      = deaths > 0 ? parseFloat((kills / deaths).toFixed(2)) : 0
    const hsRatio = kills  > 0 ? Math.round(hs / kills * 100) : 0
    const matches = Math.round(rounds / 30)

    return { kills, deaths, hs, wins, rounds, tiempo, mvps, kd, hsRatio, matches }
  } catch { return null }
}

// Fuente de verdad: calcula stats directamente desde partidas_cs2 + partida_jugador
async function getRealStatsFromMatches(steamId: string): Promise<any | null> {
  try {
    const [row] = await query<any[]>(`
      SELECT
        COUNT(*)                                                          AS total_partidas_jugadas,
        SUM(pj.resultado = 'VICTORIA')                                    AS total_partidas_ganadas,
        SUM(pj.resultado = 'DERROTA')                                     AS total_partidas_perdidas,
        SUM(pj.resultado = 'EMPATE')                                      AS total_empates,
        ROUND(SUM(pj.resultado = 'VICTORIA') * 100.0 / COUNT(*), 1)      AS porcentaje_victorias,
        SUM(pj.kills)                                                     AS kills,
        SUM(pj.deaths)                                                    AS deaths,
        SUM(pj.assists)                                                   AS assists,
        SUM(pj.headshots)                                                 AS headshots,
        SUM(pj.mvp)                                                       AS mvps,
        CASE WHEN SUM(pj.deaths) > 0
             THEN ROUND(SUM(pj.kills) / SUM(pj.deaths), 2)
             ELSE SUM(pj.kills) END                                       AS kd_ratio,
        CASE WHEN SUM(pj.kills) > 0
             THEN ROUND(SUM(pj.headshots) * 100.0 / SUM(pj.kills), 1)
             ELSE 0 END                                                   AS ratio_headshots,
        SUM(p.duracion_minutos)                                           AS tiempo_jugado
      FROM partida_jugador pj
      JOIN partidas_cs2 p ON pj.id_partida = p.id_partida
      WHERE pj.steam_id64 = ?
    `, [steamId])
    if (!row || row.total_partidas_jugadas === 0) return null
    return row
  } catch (err) {
    console.error('[getRealStatsFromMatches]', err)
    return null
  }
}

async function getPlayerData(steamId: string) {
  try {
    const [[existing], [matchCount]] = await Promise.all([
      query<any[]>('SELECT * FROM vw_estadisticas_jugador_resumen WHERE steam_id64 = ?', [steamId]),
      query<any[]>('SELECT COUNT(*) AS total FROM partida_jugador WHERE steam_id64 = ?', [steamId]),
    ])

    const hasRealMatches = Number(matchCount?.total ?? 0) > 0

    if (!existing && !hasRealMatches) {
      // Jugador totalmente nuevo: intentar import desde Steam API
      const imported = await importFromSteam(steamId)
      if (!imported) return null
      const [newStats] = await query<any[]>(
        'SELECT * FROM vw_estadisticas_jugador_resumen WHERE steam_id64 = ?', [steamId]
      )
      if (!newStats) return null
      return buildPlayerData(steamId, newStats, false)
    }

    if (!existing) return null

    // Jugador con partidas reales: calcular stats desde BD en vez de usar estadisticas_cs2
    if (hasRealMatches) {
      const realStats = await getRealStatsFromMatches(steamId)
      const mergedStats = {
        ...existing,
        ...(realStats && {
          kills:                  realStats.kills,
          deaths:                 realStats.deaths,
          assists:                realStats.assists,
          headshots:              realStats.headshots,
          mvps:                   realStats.mvps,
          kd_ratio:               realStats.kd_ratio,
          ratio_headshots:        realStats.ratio_headshots,
          total_partidas_jugadas: realStats.total_partidas_jugadas,
          total_partidas_ganadas: realStats.total_partidas_ganadas,
          porcentaje_victorias:   realStats.porcentaje_victorias,
          tiempo_jugado:          realStats.tiempo_jugado,
        }),
      }
      return buildPlayerData(steamId, mergedStats, true)
    }

    return buildPlayerData(steamId, existing, false)
  } catch (err) {
    console.error('[getPlayerData]', err)
    return null
  }
}

async function buildPlayerData(steamId: string, stats: any, hasRealMatches: boolean) {
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

  return { stats, ranking: ranking ?? null, rankHistory, matches, maps, elo, hasRealMatches }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { steam_id } = await params
  try {
    const [p] = await query<any[]>(
      'SELECT nombre_usuario_steam FROM jugadores_cs2 WHERE steam_id64 = ?', [steam_id]
    )
    return { title: p?.nombre_usuario_steam ? `${p.nombre_usuario_steam} — Fragify` : steam_id }
  } catch { return { title: steam_id } }
}

export default async function PlayerProfilePage({ params }: Props) {
  const { steam_id } = await params
  if (!/^\d{17}$/.test(steam_id)) notFound()

  const [data, steamProfile, csgoStats] = await Promise.all([
    getPlayerData(steam_id),
    getSteamProfile(steam_id),
    getCsgoStats(steam_id),
  ])
  if (!data) notFound()

  return (
    <>
      <style>{`
        .player-layout {
          display: grid;
          grid-template-columns: 220px 1fr;
          gap: 20px;
          align-items: start;
        }
        @media (max-width: 768px) {
          .player-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div className="player-layout">
        <Sidebar
          stats={data.stats}
          rankHistory={data.rankHistory ?? []}
          steamProfile={steamProfile}
          steamId={steam_id}
          csgoStats={csgoStats}
          hasRealMatches={data.hasRealMatches}
        />
        <PlayerTabs data={data} csgoStats={csgoStats} />
      </div>
    </>
  )
}

function tierBadgeColor(tier: string) {
  const t = (tier ?? '').toLowerCase()
  if (t.includes('global') || t.includes('elite'))     return { bg:'rgba(249,115,22,0.15)', color:'#f97316' }
  if (t.includes('supreme') || t.includes('master'))   return { bg:'rgba(192,132,252,0.15)', color:'#c084fc' }
  if (t.includes('legendary') || t.includes('legend')) return { bg:'rgba(251,191,36,0.15)', color:'#fbbf24' }
  if (t.includes('distinguished'))                     return { bg:'rgba(96,165,250,0.15)', color:'#60a5fa' }
  if (t.includes('guardian') || t.includes('gold'))    return { bg:'rgba(234,179,8,0.15)',  color:'#eab308' }
  return { bg:'rgba(100,116,139,0.15)', color:'#94a3b8' }
}

function Sidebar({ stats, rankHistory, steamProfile, steamId, csgoStats, hasRealMatches }: {
  stats: any; rankHistory: any[]; steamProfile: any; steamId: string; csgoStats: any; hasRealMatches: boolean
}) {
  const premiers    = rankHistory.filter(r => r.tipo_ranking === 'PREMIERE')
  const maps        = rankHistory.filter(r => r.tipo_ranking === 'MAPA')
  const avatarUrl   = steamProfile?.avatarfull ?? steamProfile?.avatarmedium ?? null
  const name        = stats.nombre_usuario_steam
  const played      = Number(stats.total_partidas_jugadas ?? 0)
  const won         = Number(stats.total_partidas_ganadas ?? 0)
  const kills       = Number(stats.kills ?? 0)
  const kd          = Number(stats.kd_ratio ?? 0)
  const hoursPlayed = stats.tiempo_jugado ? Math.round(Number(stats.tiempo_jugado) / 60) : null

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>

      {/* Avatar + nombre */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--bg-border)',
                    borderRadius:8, padding:16, marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
          <div style={{ width:64, height:64, borderRadius:6, overflow:'hidden', flexShrink:0,
                        background:'var(--bg-border)' }}>
            {avatarUrl
              ? <img src={avatarUrl} alt={name} width={64} height={64} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : <div style={{ width:64, height:64, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, background:'var(--bg-border)' }}>🎮</div>
            }
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:16, fontWeight:700,
                           color:'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {name}
            </div>
            {stats.region_geografica && (
              <div style={{ fontSize:11, color:'var(--t3)', marginTop:2 }}>📍 {stats.region_geografica}</div>
            )}
            <a href={`https://steamcommunity.com/profiles/${steamId}`}
               target="_blank" rel="noopener noreferrer"
               style={{ fontSize:10, color:'var(--orange)', textDecoration:'none',
                         display:'inline-flex', alignItems:'center', gap:3, marginTop:3 }}>
              Steam Profile ↗
            </a>
          </div>
        </div>

        {/* Indicador fuente de datos */}
        <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.12em',
                      color: hasRealMatches ? '#22c55e' : '#eab308', marginBottom:8,
                      display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ display:'inline-block', width:5, height:5, borderRadius:'50%',
                          background: hasRealMatches ? '#22c55e' : '#eab308' }} />
          {hasRealMatches ? 'CS2 · DATOS REALES' : 'CS2 · STEAM API'}
        </div>

        {/* CS2 mini stats */}
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

      {/* CS:GO Legacy — solo si tiene datos reales y difieren de Steam API */}
      {csgoStats && hasRealMatches && Math.abs(csgoStats.kills - kills) > kills * 0.05 && (
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--bg-border)',
                      borderRadius:8, padding:12, marginBottom:12 }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.12em', color:'var(--t3)', marginBottom:8 }}>
            CS:GO LEGACY
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            {[
              { label:'KILLS',  value: csgoStats.kills.toLocaleString('en-US') },
              { label:'K/D',    value: csgoStats.kd.toFixed(2) },
              { label:'HS%',    value: `${csgoStats.hsRatio}%` },
              { label:'HOURS',  value: csgoStats.tiempo.toLocaleString('en-US') },
            ].map(s => (
              <div key={s.label} style={{ background:'#0d0e13', borderRadius:6, padding:'6px 8px' }}>
                <div style={{ fontSize:9, color:'var(--t3)', letterSpacing:'0.1em', marginBottom:1 }}>{s.label}</div>
                <div style={{ fontSize:13, fontFamily:'IBM Plex Mono,monospace', fontWeight:600, color:'#818cf8' }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize:10, color:'var(--t3)', marginTop:8, lineHeight:1.4 }}>
            Stats acumuladas CS:GO + CS2 (Steam API)
          </div>
        </div>
      )}

      {/* Premier */}
      {premiers.length > 0 && (
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--bg-border)',
                      borderRadius:8, padding:12, marginBottom:8 }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.12em', color:'var(--t3)', marginBottom:8 }}>
            CS2 PREMIER
          </div>
          {premiers.slice(0,3).map((r, i) => {
            const { bg, color } = tierBadgeColor(r.tier)
            return (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                                     padding:'6px 0', borderBottom: i < premiers.length-1 ? '1px solid #191c28' : 'none' }}>
                <span style={{ fontSize:11, background:bg, color, padding:'2px 7px', borderRadius:4, fontWeight:700 }}>
                  {r.tier ?? 'PREMIER'}
                </span>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--orange)', fontFamily:'IBM Plex Mono,monospace' }}>
                  {Number(r.puntos_elo).toLocaleString('en-US')}
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
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.12em', color:'var(--t3)', marginBottom:8 }}>
            CS2 COMPETITIVE
          </div>
          {maps.slice(0,6).map((r, i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                                   padding:'5px 0', borderBottom: i < maps.length-1 ? '1px solid #191c28' : 'none' }}>
              <span style={{ fontSize:11, color:'var(--t2)' }}>{r.nombre_mapa ?? 'Map'}</span>
              <span style={{ fontSize:11, color:'var(--t1)', fontFamily:'IBM Plex Mono,monospace' }}>{r.tier}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
