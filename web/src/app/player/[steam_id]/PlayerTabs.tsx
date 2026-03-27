'use client'
import { useState } from 'react'
import { CircleStat } from '@/components/ui/CircleStat'
import { WinCircle }  from '@/components/ui/WinCircle'

type Tab = 'STATS' | 'GRAPHS' | 'MAPS' | 'MATCHES'

export function PlayerTabs({ data }: { data: any }) {
  const [tab, setTab] = useState<Tab>('STATS')
  const { stats, ranking, matches, maps, elo } = data

  return (
    <div className="card" style={{ padding:0, overflow:'hidden' }}>
      {/* Filter bar */}
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 16px',
                    borderBottom:'1px solid var(--bg-border)', background:'#111318' }}>
        <span style={{ fontSize:11, color:'var(--t3)', fontWeight:700, letterSpacing:'0.08em',
                       background:'#1a1d27', padding:'3px 8px', borderRadius:4 }}>
          CS2
        </span>
        <span style={{ fontSize:11, color:'var(--t3)', fontWeight:700, letterSpacing:'0.08em',
                       background:'#1a1d27', padding:'3px 8px', borderRadius:4 }}>
          5v5
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid var(--bg-border)', padding:'0 16px' }}>
        {(['STATS','GRAPHS','MAPS','MATCHES'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
                  className={`tab ${tab === t ? 'active' : ''}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding:20 }}>
        {tab === 'STATS'   && <StatsTab   stats={stats} ranking={ranking} matches={matches} maps={maps} />}
        {tab === 'GRAPHS'  && <GraphsTab  elo={elo} matches={matches} />}
        {tab === 'MAPS'    && <MapsTab    maps={maps} />}
        {tab === 'MATCHES' && <MatchesTab matches={matches} />}
      </div>
    </div>
  )
}

/* ── STATS TAB ── */
function StatsTab({ stats, ranking, matches, maps }: any) {
  const recentMatches = matches.slice(0, 20)

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:16 }}>
      {/* K/D circular */}
      <div className="card" style={{ padding:20, display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
        <CircleStat value={(stats.kd_ratio ?? 0).toFixed(2)} label="K/D" size={130} color="#f97316" />
      </div>

      {/* Win rate */}
      <div className="card" style={{ padding:20, display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
        <CircleStat value={`${stats.porcentaje_victorias ?? 0}%`} label="WIN RATE" size={130} color="#22c55e" />
      </div>

      {/* HS% */}
      <div className="card" style={{ padding:20, display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
        <CircleStat value={`${stats.ratio_headshots ?? 0}%`} label="HS%" size={130} color="#3b82f6" />
      </div>

      {/* ADR */}
      <div className="card" style={{ padding:20, display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
        <CircleStat value={stats.dano_promedio_ronda ?? '—'} label="ADR" size={130} color="#eab308" />
      </div>

      {/* Win/Loss numbers */}
      <div className="card" style={{ padding:20, gridColumn:'1/3' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:0 }}>
          {[
            ['WIN RATE', `${stats.porcentaje_victorias ?? 0}%`],
            ['HS%',      `${stats.ratio_headshots ?? 0}%`],
            ['ADR',      stats.dano_promedio_ronda ?? '—'],
          ].map(([l,v]) => (
            <div key={l} style={{ textAlign:'center', padding:'8px 0' }}>
              <div style={{ fontSize:11, color:'var(--t3)', letterSpacing:'0.08em', marginBottom:4 }}>{l}</div>
              <div style={{ fontSize:22, fontFamily:'Rajdhani,sans-serif', fontWeight:700 }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ borderTop:'1px solid var(--bg-border)', marginTop:12, paddingTop:12,
                      display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:0 }}>
          {[
            ['PLAYED', stats.total_partidas_jugadas ?? 0],
            ['WON',    stats.total_partidas_ganadas ?? 0],
            ['KILLS',  stats.kills ?? 0],
            ['DEATHS', stats.deaths ?? 0],
          ].map(([l,v]) => (
            <div key={l} style={{ textAlign:'center' }}>
              <div style={{ fontSize:10, color:'var(--t3)', letterSpacing:'0.08em' }}>{l}</div>
              <div style={{ fontSize:15, fontWeight:600, marginTop:2, fontFamily:'IBM Plex Mono,monospace' }}>
                {Number(v).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ranking PREMIER */}
      {ranking && (
        <div className="card" style={{ padding:20, gridColumn:'3/5', display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ fontSize:10, color:'var(--t3)', letterSpacing:'0.1em' }}>PREMIER RANK</div>
          <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:36, fontWeight:700, color:'var(--orange)' }}>
            {ranking.puntos_elo.toLocaleString()}
          </div>
          <div style={{ fontSize:13, color:'var(--t2)' }}>{ranking.tier}</div>
          {ranking.posicion_global && (
            <div style={{ fontSize:11, color:'var(--t3)' }}>#{ranking.posicion_global} global</div>
          )}
        </div>
      )}

      {/* Recent match results row */}
      <div className="card" style={{ padding:16, gridColumn:'1/5' }}>
        <div style={{ fontSize:10, color:'var(--t3)', letterSpacing:'0.1em', marginBottom:10 }}>
          RECENT MATCHES
        </div>
        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
          {recentMatches.map((m: any, i: number) => (
            <div key={i} style={{
              width:28, height:28, borderRadius:4, display:'flex', alignItems:'center',
              justifyContent:'center', fontSize:11, fontWeight:700,
              background: m.resultado === 'VICTORIA' ? 'rgba(34,197,94,0.15)' :
                          m.resultado === 'DERROTA'  ? 'rgba(239,68,68,0.15)' :
                          'rgba(156,163,175,0.1)',
              color: m.resultado === 'VICTORIA' ? '#22c55e' :
                     m.resultado === 'DERROTA'  ? '#ef4444' : '#9ca3af',
            }}>
              {m.resultado === 'VICTORIA' ? 'W' : m.resultado === 'DERROTA' ? 'L' : 'T'}
            </div>
          ))}
        </div>
      </div>

      {/* Top maps */}
      {maps.length > 0 && (
        <div className="card" style={{ padding:16, gridColumn:'1/3' }}>
          <div style={{ fontSize:10, color:'var(--t3)', letterSpacing:'0.1em', marginBottom:10 }}>
            MOST PLAYED
          </div>
          {maps.slice(0,4).map((m: any, i: number) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between',
                                   padding:'5px 0', borderBottom:'1px solid #191c28' }}>
              <span style={{ color:'var(--t2)', fontSize:12 }}>{m.mapa}</span>
              <span style={{ color:'var(--t1)', fontSize:12, fontFamily:'IBM Plex Mono,monospace' }}>
                {m.total_partidas_mapa}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Most successful maps */}
      {maps.length > 0 && (
        <div className="card" style={{ padding:16, gridColumn:'3/5' }}>
          <div style={{ fontSize:10, color:'var(--t3)', letterSpacing:'0.1em', marginBottom:10 }}>
            MOST SUCCESS
          </div>
          {[...maps].sort((a,b) => b.tasa_victoria_mapa - a.tasa_victoria_mapa).slice(0,4).map((m: any, i: number) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between',
                                   padding:'5px 0', borderBottom:'1px solid #191c28' }}>
              <span style={{ color:'var(--t2)', fontSize:12 }}>{m.mapa}</span>
              <span style={{ color:'#22c55e', fontSize:12, fontFamily:'IBM Plex Mono,monospace' }}>
                {m.tasa_victoria_mapa}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── GRAPHS TAB ── */
function GraphsTab({ elo, matches }: any) {
  if (elo.length === 0) {
    return (
      <div style={{ textAlign:'center', padding:'48px 0', color:'var(--t3)' }}>
        No ELO history data available yet.
      </div>
    )
  }

  // Simple SVG line chart of ELO over time
  const w = 800, h = 280, pad = 40
  const eloVals = elo.map((e: any) => e.puntos_elo)
  const min = Math.min(...eloVals)
  const max = Math.max(...eloVals) || 1
  const xStep = (w - pad*2) / Math.max(elo.length - 1, 1)

  const points = elo.map((e: any, i: number) => {
    const x = pad + i * xStep
    const y = h - pad - ((e.puntos_elo - min) / (max - min || 1)) * (h - pad*2)
    return `${x},${y}`
  }).join(' ')

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        <select style={{ background:'var(--bg-deep)', border:'1px solid var(--bg-border)',
                         color:'var(--t1)', borderRadius:6, padding:'5px 10px', fontSize:12 }}>
          <option>By Game</option>
        </select>
        <div style={{ background:'var(--bg-deep)', border:'1px solid var(--bg-border)',
                      borderRadius:6, padding:'5px 12px', fontSize:12, color:'var(--t2)',
                      display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ width:10, height:10, background:'#818cf8', borderRadius:2, display:'inline-block' }}/>
          All Ranks
        </div>
      </div>

      <div className="card" style={{ padding:16, overflowX:'auto' }}>
        <svg viewBox={`0 0 ${w} ${h}`} style={{ width:'100%', minWidth:400 }}>
          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1].map(p => {
            const y = pad + (1 - p) * (h - pad*2)
            const v = Math.round(min + p * (max - min))
            return (
              <g key={p}>
                <line x1={pad} y1={y} x2={w-pad} y2={y}
                      stroke="#1e2130" strokeWidth={1} />
                <text x={w-pad+6} y={y+4} fontSize={9} fill="#4b5563">{v}</text>
              </g>
            )
          })}
          {/* ELO line */}
          <polyline points={points} fill="none" stroke="#818cf8" strokeWidth={2} />
          {/* Dots */}
          {elo.map((e: any, i: number) => {
            const x = pad + i * xStep
            const y = h - pad - ((e.puntos_elo - min) / (max - min || 1)) * (h - pad*2)
            return <circle key={i} cx={x} cy={y} r={3} fill="#818cf8" />
          })}
        </svg>
        {/* Date labels */}
        <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 40px 0',
                      fontSize:9, color:'var(--t3)' }}>
          {[0, Math.floor(elo.length/4), Math.floor(elo.length/2),
            Math.floor(3*elo.length/4), elo.length-1]
            .filter((v,i,a) => a.indexOf(v) === i)
            .map((i: number) => (
              <span key={i}>
                {new Date(elo[i]?.fecha_snapshot).toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit'})}
              </span>
            ))}
        </div>
      </div>
    </div>
  )
}

/* ── MAPS TAB ── */
function MapsTab({ maps }: any) {
  if (maps.length === 0) {
    return <div style={{ textAlign:'center', padding:'48px 0', color:'var(--t3)' }}>No map data yet.</div>
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Map</th>
          <th>WR%</th>
          <th>Times Played</th>
          <th style={{ width:220 }}>% T Rounds Won</th>
          <th style={{ width:220 }}>% CT Rounds Won</th>
        </tr>
      </thead>
      <tbody>
        {maps.map((m: any, i: number) => {
          const wr = Math.round(m.tasa_victoria_mapa ?? 0)
          return (
            <tr key={i}>
              <td>
                <span style={{ color:'var(--t1)', fontWeight:500 }}>{m.mapa}</span>
              </td>
              <td>
                <WinCircle pct={wr} />
              </td>
              <td>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:12 }}>
                    {m.total_partidas_mapa}
                  </span>
                  <div style={{ flex:1, maxWidth:80, height:3, background:'var(--bg-border)', borderRadius:2 }}>
                    <div style={{ height:'100%', borderRadius:2, background:'var(--blue)',
                                  width:`${Math.min(m.total_partidas_mapa / 10, 1) * 100}%` }} />
                  </div>
                </div>
              </td>
              {/* T rounds bar */}
              <td>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:10, color:'var(--gold)', minWidth:28, textAlign:'right' }}>
                    {wr}%
                  </span>
                  <div style={{ flex:1, height:4, background:'var(--bg-border)', borderRadius:2 }}>
                    <div style={{ height:'100%', borderRadius:2, background:'var(--gold)',
                                  width:`${wr}%` }} />
                  </div>
                </div>
              </td>
              {/* CT rounds bar */}
              <td>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:10, color:'var(--blue)', minWidth:28, textAlign:'right' }}>
                    {100-wr}%
                  </span>
                  <div style={{ flex:1, height:4, background:'var(--bg-border)', borderRadius:2 }}>
                    <div style={{ height:'100%', borderRadius:2, background:'var(--blue)',
                                  width:`${100-wr}%` }} />
                  </div>
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

/* ── MATCHES TAB ── */
function MatchesTab({ matches }: any) {
  if (matches.length === 0) {
    return <div style={{ textAlign:'center', padding:'48px 0', color:'var(--t3)' }}>No matches recorded yet.</div>
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Map</th>
          <th>Score</th>
          <th>Result</th>
          <th>K/D/A</th>
          <th>HS%</th>
          <th>ADR</th>
          <th>Duration</th>
        </tr>
      </thead>
      <tbody>
        {matches.map((m: any, i: number) => {
          const kd = m.deaths > 0 ? (m.kills / m.deaths).toFixed(2) : m.kills.toFixed(2)
          const hs = m.kills > 0 ? Math.round((m.headshots / m.kills) * 100) : 0
          const adr = m.dano_total > 0 ? Math.round(m.dano_total / 24) : 0
          return (
            <tr key={i}>
              <td style={{ color:'var(--t3)', fontSize:11 }}>
                {new Date(m.fecha_partida).toLocaleDateString('es-ES')}
              </td>
              <td style={{ fontWeight:500, color:'var(--t1)' }}>{m.mapa}</td>
              <td style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:12, color:'var(--t2)' }}>
                {m.resultado_puntuacion ?? '—'}
              </td>
              <td>
                <span className={
                  m.resultado === 'VICTORIA' ? 'badge-win' :
                  m.resultado === 'DERROTA'  ? 'badge-loss' : 'badge-tie'
                }>
                  {m.resultado === 'VICTORIA' ? 'W' : m.resultado === 'DERROTA' ? 'L' : 'T'}
                </span>
              </td>
              <td style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:12 }}>
                {m.kills}/{m.deaths}/{m.assists}
              </td>
              <td style={{ color: hs >= 50 ? '#22c55e' : 'var(--t2)', fontFamily:'IBM Plex Mono,monospace', fontSize:12 }}>
                {hs}%
              </td>
              <td style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:12, color:'var(--t2)' }}>
                {adr}
              </td>
              <td style={{ color:'var(--t3)', fontSize:11 }}>
                {m.duracion_minutos}m
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
