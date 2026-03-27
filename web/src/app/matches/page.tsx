import type { Metadata } from 'next'
import { query } from '@/lib/db'

export const metadata: Metadata = { title: 'All Matches' }
export const dynamic = 'force-dynamic'

async function getMatches() {
  try {
    return await query<any[]>(`
      SELECT p.id_partida, p.fecha_partida,
             COALESCE(m.nombre_display, p.mapa) AS mapa,
             p.resultado_puntuacion, p.duracion_minutos,
             COUNT(pj.steam_id64)   AS total_jugadores,
             SUM(pj.kills)          AS total_kills,
             SUM(pj.deaths)         AS total_deaths,
             SUM(pj.assists)        AS total_assists
      FROM partidas_cs2 p
      LEFT JOIN mapas m            ON p.id_mapa = m.id_mapa
      LEFT JOIN partida_jugador pj ON p.id_partida = pj.id_partida
      GROUP BY p.id_partida, p.fecha_partida, mapa,
               p.resultado_puntuacion, p.duracion_minutos
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
  if (d > 0) return `${d}d ago`
  if (h > 0) return `${h}h ago`
  return `${m}m ago`
}

export default async function MatchesPage() {
  const matches = await getMatches()
  return (
    <div>
      <h1 style={{ fontFamily:'Rajdhani,sans-serif', fontSize:28, marginBottom:4 }}>CS2 Matches</h1>
      <p style={{ color:'var(--t3)', fontSize:12, marginBottom:24 }}>Live feed of recently processed matches</p>
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--bg-border)', borderRadius:8, overflow:'hidden' }}>
        <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:'1px solid var(--bg-border)' }}>
              {['Mode','Date','Map','Score','Players','K','D','A','Min'].map(h => (
                <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:10, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--t3)', fontWeight:500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matches.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign:'center', padding:48, color:'var(--t3)' }}>No matches yet.</td></tr>
            ) : matches.map((m: any) => (
              <tr key={m.id_partida} style={{ borderBottom:'1px solid #191c28' }}>
                <td style={{ padding:'9px 12px' }}><span style={{ fontSize:10, fontWeight:700, background:'#1a2040', color:'#818cf8', padding:'2px 6px', borderRadius:3 }}>CS2</span></td>
                <td style={{ padding:'9px 12px', color:'var(--t3)', fontSize:11 }}>{timeAgo(m.fecha_partida)}</td>
                <td style={{ padding:'9px 12px', fontWeight:500 }}>{m.mapa ?? '—'}</td>
                <td style={{ padding:'9px 12px', fontFamily:'IBM Plex Mono,monospace', fontSize:12, fontWeight:600 }}>{m.resultado_puntuacion ?? '—'}</td>
                <td style={{ padding:'9px 12px', color:'var(--t3)' }}>{m.total_jugadores ?? 0}</td>
                <td style={{ padding:'9px 12px', fontFamily:'IBM Plex Mono,monospace', fontSize:12, color:'var(--t2)' }}>{m.total_kills ?? 0}</td>
                <td style={{ padding:'9px 12px', fontFamily:'IBM Plex Mono,monospace', fontSize:12, color:'var(--t2)' }}>{m.total_deaths ?? 0}</td>
                <td style={{ padding:'9px 12px', fontFamily:'IBM Plex Mono,monospace', fontSize:12, color:'var(--t2)' }}>{m.total_assists ?? 0}</td>
                <td style={{ padding:'9px 12px', color:'var(--t3)', fontSize:11 }}>{m.duracion_minutos ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
