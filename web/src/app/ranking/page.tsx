'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Player = {
  steam_id64: string
  nombre_usuario_steam: string
  puntos_elo: number
  tier: string
  posicion_global: number | null
  ultima_actualizacion: string
  ranking_posicion: number
  region_geografica: string | null
}

function tierColor(tier: string) {
  const t = (tier ?? '').toLowerCase()
  if (t.includes('global') || t.includes('elite')) return '#f97316'
  if (t.includes('supreme'))  return '#fb923c'
  if (t.includes('master'))   return '#c084fc'
  if (t.includes('diamond'))  return '#818cf8'
  if (t.includes('platinum')) return '#67e8f9'
  if (t.includes('gold'))     return '#eab308'
  return '#9ca3af'
}

export default function RankingPage() {
  const [tab,     setTab]     = useState<'PREMIER'|'COMPETITIVE'>('PREMIER')
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch('/api/ranking?pageSize=100')
      .then(r => r.json())
      .then(d => { setPlayers(d.data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const TABS: ('PREMIER'|'COMPETITIVE')[] = ['PREMIER', 'COMPETITIVE']

  return (
    <div>
      <h1 style={{ fontFamily:'Rajdhani,sans-serif', fontSize:28, marginBottom:4 }}>CS2 Leaderboards</h1>
      <p style={{ color:'var(--t3)', fontSize:12, marginBottom:24 }}>
        Up to date rankings for CS2 matchmaking modes.
      </p>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid var(--bg-border)', marginBottom:24 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:'8px 16px', fontSize:12, fontWeight:600, letterSpacing:'0.06em',
            color: tab === t ? 'var(--t1)' : 'var(--t2)',
            borderBottom: tab === t ? '2px solid var(--orange)' : '2px solid transparent',
            background:'none', border:'none', borderBottom: tab === t ? '2px solid var(--orange)' : '2px solid transparent',
            cursor:'pointer', transition:'color 0.15s',
          }}>
            {t}
          </button>
        ))}
      </div>

      {/* ELO distribution bar chart */}
      {!loading && players.length > 0 && tab === 'PREMIER' && (
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--bg-border)', borderRadius:8, padding:20, marginBottom:24 }}>
          <div style={{ display:'flex', alignItems:'flex-end', height:80, gap:2 }}>
            {Array.from({ length: 28 }, (_, i) => {
              const lo = 1000 + i * 1000
              const hi = lo + 999
              const count = players.filter(p => p.puntos_elo >= lo && p.puntos_elo <= hi).length
              const maxC = Math.max(1, ...Array.from({length:28}, (_,j) => {
                const l = 1000+j*1000
                return players.filter(p => p.puntos_elo >= l && p.puntos_elo <= l+999).length
              }))
              const h = Math.max((count / maxC) * 70, count > 0 ? 4 : 0)
              const color = lo >= 25000 ? '#f97316' : lo >= 20000 ? '#c084fc' :
                            lo >= 15000 ? '#818cf8' : lo >= 10000 ? '#67e8f9' :
                            lo >= 7000  ? '#eab308' : '#3b82f6'
              return (
                <div key={i} title={`${lo.toLocaleString()}–${hi.toLocaleString()}: ${count}`}
                     style={{ flex:1, height:h || 2, background:color, borderRadius:'2px 2px 0 0',
                               opacity: count > 0 ? 1 : 0.15 }} />
              )
            })}
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, fontSize:9, color:'var(--t3)' }}>
            {['1k','4k','7k','10k','13k','16k','19k','22k','25k','28k'].map(v => <span key={v}>{v}</span>)}
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--bg-border)', borderRadius:8, overflow:'hidden' }}>
        <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:'1px solid var(--bg-border)' }}>
              {['#','Player','Region','Current Rank','Best Rank','Last Match'].map(h => (
                <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:10,
                                     textTransform:'uppercase', letterSpacing:'0.08em',
                                     color:'var(--t3)', fontWeight:500 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({length:5}).map((_,i) => (
                <tr key={i} style={{ borderBottom:'1px solid #191c28' }}>
                  {Array.from({length:6}).map((_,j) => (
                    <td key={j} style={{ padding:'10px 12px' }}>
                      <div style={{ height:14, width:'80%', background:'var(--bg-hover)', borderRadius:4,
                                    animation:'shimmer 1.5s infinite', backgroundSize:'200% 100%' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : players.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign:'center', padding:48, color:'var(--t3)' }}>
                No ranking data yet.
              </td></tr>
            ) : players.map(p => (
              <tr key={p.steam_id64} style={{ borderBottom:'1px solid #191c28', transition:'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}>
                <td style={{ padding:'9px 12px', color:'var(--t3)', fontFamily:'IBM Plex Mono,monospace', fontSize:12 }}>
                  {p.ranking_posicion <= 3 ? ['🥇','🥈','🥉'][p.ranking_posicion-1] : p.ranking_posicion}
                </td>
                <td style={{ padding:'9px 12px' }}>
                  <Link href={`/player/${p.steam_id64}`}
                        style={{ color:'var(--t1)', fontWeight:500, textDecoration:'none' }}
                        onMouseEnter={e => (e.currentTarget.style.color='var(--orange)')}
                        onMouseLeave={e => (e.currentTarget.style.color='var(--t1)')}>
                    {p.nombre_usuario_steam}
                  </Link>
                </td>
                <td style={{ padding:'9px 12px', color:'var(--t3)', fontSize:11 }}>
                  {p.region_geografica ?? '—'}
                </td>
                <td style={{ padding:'9px 12px' }}>
                  <span style={{ color:'var(--orange)', fontFamily:'IBM Plex Mono,monospace', fontWeight:700,
                                  background:'rgba(249,115,22,0.1)', padding:'2px 8px', borderRadius:3 }}>
                    {p.puntos_elo.toLocaleString()}
                  </span>
                </td>
                <td style={{ padding:'9px 12px', color:tierColor(p.tier),
                              fontFamily:'IBM Plex Mono,monospace', fontSize:12 }}>
                  {p.puntos_elo.toLocaleString()}
                </td>
                <td style={{ padding:'9px 12px', color:'var(--t3)', fontSize:11 }}>
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
