import type { Metadata } from 'next'
import Link from 'next/link'
import { query } from '@/lib/db'

export const metadata: Metadata = { title: 'Leaderboards' }
export const revalidate = 60

async function getPremierRanking(limit = 100) {
  try {
    return await query<any[]>(
      `SELECT * FROM vw_ranking_jugadores_elo LIMIT ?`, [limit]
    )
  } catch { return [] }
}

async function getMapRankings() {
  try {
    return await query<any[]>(`
      SELECT r.steam_id64, j.nombre_usuario_steam, r.tier, r.puntos_elo,
             r.victorias_mapa, r.ultima_actualizacion,
             COALESCE(m.nombre_display, r.mapa) AS nombre_mapa
      FROM rankings_cs2 r
      JOIN jugadores_cs2 j ON r.steam_id64 = j.steam_id64
      LEFT JOIN mapas m ON r.id_mapa = m.id_mapa
      WHERE r.tipo_ranking = 'MAPA'
      ORDER BY r.puntos_elo DESC
      LIMIT 100
    `)
  } catch { return [] }
}

function tierColor(tier: string) {
  const t = tier?.toLowerCase() ?? ''
  if (t.includes('global') || t.includes('elite')) return '#f97316'
  if (t.includes('supreme'))  return '#fb923c'
  if (t.includes('master'))   return '#c084fc'
  if (t.includes('diamond'))  return '#818cf8'
  if (t.includes('platinum')) return '#67e8f9'
  if (t.includes('gold'))     return '#eab308'
  return '#9ca3af'
}

export default async function RankingPage() {
  const [premier, mapRanks] = await Promise.all([getPremierRanking(), getMapRankings()])

  return (
    <div>
      <h1 style={{ fontFamily:'Rajdhani,sans-serif', fontSize:28, marginBottom:4 }}>CS2 Leaderboards</h1>
      <p style={{ color:'var(--t3)', fontSize:12, marginBottom:24 }}>
        Up to date rankings for CS2 matchmaking modes.
      </p>

      {/* Tabs */}
      <div style={{ display:'flex', gap:0, borderBottom:'1px solid var(--bg-border)', marginBottom:24 }}>
        {['PREMIER', 'COMPETITIVE'].map((t, i) => (
          <div key={t} className={`tab ${i === 0 ? 'active' : ''}`}>{t}</div>
        ))}
      </div>

      {/* Distribución de ELO — mini bar chart */}
      {premier.length > 0 && (
        <div className="card" style={{ padding:20, marginBottom:24 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end',
                        height:80, gap:2 }}>
            {Array.from({ length: 28 }, (_, i) => {
              const lo = 1000 + i * 1000
              const hi = lo + 999
              const count = premier.filter(p => p.puntos_elo >= lo && p.puntos_elo <= hi).length
              const maxC  = Math.max(...Array.from({length:28},(_,j) => {
                const l = 1000+j*1000, h = l+999
                return premier.filter(p => p.puntos_elo >= l && p.puntos_elo <= h).length
              }))
              const h = maxC > 0 ? Math.max((count / maxC) * 70, count > 0 ? 4 : 0) : 0
              const color = lo >= 25000 ? '#f97316' : lo >= 20000 ? '#c084fc' :
                            lo >= 15000 ? '#818cf8' : lo >= 10000 ? '#67e8f9' :
                            lo >= 7000  ? '#eab308' : '#3b82f6'
              return (
                <div key={i} title={`${lo.toLocaleString()}–${hi.toLocaleString()}: ${count}`}
                     style={{ flex:1, height:h, background:color, borderRadius:'2px 2px 0 0',
                               opacity: count > 0 ? 1 : 0.2, minHeight: count > 0 ? 3 : 0 }} />
              )
            })}
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:6,
                        fontSize:9, color:'var(--t3)' }}>
            <span>1k</span><span>7k</span><span>10k</span><span>15k</span>
            <span>20k</span><span>25k</span><span>35k</span>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="card" style={{ overflow:'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width:48 }}>#</th>
              <th>Player</th>
              <th>Tracked</th>
              <th>Current Rank</th>
              <th>Best Rank</th>
              <th>Last Match</th>
            </tr>
          </thead>
          <tbody>
            {premier.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign:'center', padding:48, color:'var(--t3)' }}>
                No ranking data yet.
              </td></tr>
            ) : premier.map((p: any) => (
              <tr key={p.steam_id64}>
                <td style={{ color:'var(--t3)', fontFamily:'IBM Plex Mono,monospace', fontSize:12 }}>
                  {p.ranking_posicion <= 3
                    ? ['🥇','🥈','🥉'][p.ranking_posicion - 1]
                    : p.ranking_posicion}
                </td>
                <td>
                  <Link href={`/player/${p.steam_id64}`}
                        style={{ color:'var(--t1)', fontWeight:500, fontSize:13 }}
                        className="hover:text-orange-400 transition-colors">
                    {p.nombre_usuario_steam}
                  </Link>
                </td>
                <td style={{ color:'var(--t3)', fontSize:12 }}>—</td>
                <td>
                  <span style={{ color:'var(--orange)', fontFamily:'IBM Plex Mono,monospace',
                                 fontWeight:700, fontSize:13,
                                 background:'rgba(249,115,22,0.1)', padding:'2px 8px', borderRadius:3 }}>
                    {p.puntos_elo.toLocaleString()}
                  </span>
                </td>
                <td>
                  <span style={{ color:tierColor(p.tier), fontFamily:'IBM Plex Mono,monospace',
                                 fontSize:12 }}>
                    {p.puntos_elo.toLocaleString()}
                  </span>
                </td>
                <td style={{ color:'var(--t3)', fontSize:11 }}>
                  {new Date(p.ultima_actualizacion).toLocaleDateString('es-ES')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
