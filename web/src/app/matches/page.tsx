import type { Metadata } from 'next'
import Link from 'next/link'
import { query } from '@/lib/db'

export const metadata: Metadata = { title: 'All Matches' }
export const revalidate = 30

async function getMatches() {
  try {
    return await query<any[]>(`
      SELECT p.id_partida, p.fecha_partida,
             COALESCE(m.nombre_display, p.mapa) AS mapa,
             p.resultado_puntuacion, p.duracion_minutos,
             COUNT(pj.steam_id64) AS total_jugadores,
             SUM(pj.kills)        AS total_kills,
             SUM(pj.deaths)       AS total_deaths,
             SUM(pj.assists)      AS total_assists
      FROM partidas_cs2 p
      LEFT JOIN mapas m ON p.id_mapa = m.id_mapa
      LEFT JOIN partida_jugador pj ON p.id_partida = pj.id_partida
      GROUP BY p.id_partida
      ORDER BY p.fecha_partida DESC
      LIMIT 100
    `)
  } catch { return [] }
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d > 0)  return `${d} day${d>1?'s':''} ago`
  if (h > 0)  return `${h} hour${h>1?'s':''} ago`
  return `${m} minute${m!==1?'s':''} ago`
}

export default async function MatchesPage() {
  const matches = await getMatches()

  return (
    <div>
      <h1 style={{ fontFamily:'Rajdhani,sans-serif', fontSize:28, marginBottom:4 }}>CS2 Stats</h1>
      <p style={{ color:'var(--t3)', fontSize:12, marginBottom:24 }}>
        Live feed of recently processed matches
      </p>

      <div className="card" style={{ overflow:'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width:60 }}>Mode</th>
              <th>Date</th>
              <th>Map</th>
              <th>Team 1</th>
              <th>Score</th>
              <th>Team 2</th>
              <th>K</th>
              <th>D</th>
              <th>A</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            {matches.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign:'center', padding:48, color:'var(--t3)' }}>
                No matches processed yet.
              </td></tr>
            ) : matches.map((m: any) => (
              <tr key={m.id_partida}>
                <td>
                  <span style={{ fontSize:10, fontWeight:700, background:'#1a2040',
                                  color:'#818cf8', padding:'2px 6px', borderRadius:3 }}>
                    CS2
                  </span>
                </td>
                <td style={{ color:'var(--t3)', fontSize:11 }}>{timeAgo(m.fecha_partida)}</td>
                <td style={{ fontWeight:500, color:'var(--t1)', fontSize:12 }}>{m.mapa ?? '—'}</td>
                <td>
                  <div style={{ display:'flex', gap:2 }}>
                    {/* Placeholder avatars */}
                    {Array.from({length: Math.min(5, Math.floor((m.total_jugadores??0)/2))}).map((_,i) => (
                      <div key={i} style={{ width:18, height:18, borderRadius:2,
                                            background:'var(--bg-border)', border:'1px solid #2a2d3e' }} />
                    ))}
                  </div>
                </td>
                <td style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:12,
                              color:'var(--t1)', fontWeight:600 }}>
                  {m.resultado_puntuacion ?? '— : —'}
                </td>
                <td>
                  <div style={{ display:'flex', gap:2 }}>
                    {Array.from({length: Math.min(5, Math.floor((m.total_jugadores??0)/2))}).map((_,i) => (
                      <div key={i} style={{ width:18, height:18, borderRadius:2,
                                            background:'var(--bg-border)', border:'1px solid #2a2d3e' }} />
                    ))}
                  </div>
                </td>
                <td style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:12, color:'var(--t2)' }}>
                  {m.total_kills ?? 0}
                </td>
                <td style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:12, color:'var(--t2)' }}>
                  {m.total_deaths ?? 0}
                </td>
                <td style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:12, color:'var(--t2)' }}>
                  {m.total_assists ?? 0}
                </td>
                <td style={{ color:'var(--t3)', fontSize:11 }}>
                  {m.duracion_minutos ? `${m.duracion_minutos}m` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
