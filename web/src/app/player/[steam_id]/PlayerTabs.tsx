'use client'
import { useState } from 'react'

type Tab = 'STATS' | 'GRAPHS' | 'MAPS' | 'MATCHES'

// ── Círculo SVG para K/D, Winrate, HS%, ADR ──
function CircleGauge({ value, label, max = 2, color = '#f97316' }: { value: number; label: string; max?: number; color?: string }) {
  const size = 130, r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const pct  = Math.min(value / max, 1)
  const dash = circ * pct

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
      <div style={{ fontSize:10, letterSpacing:'0.1em', color:'var(--t3)', fontWeight:500 }}>{label}</div>
      <div style={{ position:'relative', width:size, height:size }}>
        <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e2130" strokeWidth={6} />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
                  strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
        </svg>
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontFamily:'Rajdhani,sans-serif', fontSize:28, fontWeight:700, color:'var(--t1)' }}>
            {value}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Círculo pequeño para WR% de mapas ──
function WinCircle({ pct }: { pct: number }) {
  const size = 44, r = (size - 4) / 2
  const circ = 2 * Math.PI * r
  const dash = circ * (pct / 100)
  const color = pct >= 55 ? '#22c55e' : pct >= 45 ? '#eab308' : '#ef4444'
  return (
    <div style={{ position:'relative', width:size, height:size, display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
      <svg width={size} height={size} style={{ position:'absolute', transform:'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e2130" strokeWidth={3} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={3}
                strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <span style={{ fontSize:10, fontWeight:700, color, fontFamily:'IBM Plex Mono,monospace', position:'relative' }}>
        {pct}%
      </span>
    </div>
  )
}

export function PlayerTabs({ data }: { data: any }) {
  const [tab, setTab] = useState<Tab>('STATS')
  const { stats, ranking, matches, maps, elo } = data

  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--bg-border)', borderRadius:8, overflow:'hidden' }}>
      {/* Filter bar */}
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 16px',
                    borderBottom:'1px solid var(--bg-border)', background:'#111318' }}>
        {['CS2','5v5'].map(label => (
          <span key={label} style={{ fontSize:11, color:'var(--t3)', fontWeight:700, letterSpacing:'0.08em',
                                      background:'#1a1d27', padding:'3px 8px', borderRadius:4, border:'1px solid var(--bg-border)' }}>
            {label}
          </span>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid var(--bg-border)', padding:'0 16px' }}>
        {(['STATS','GRAPHS','MAPS','MATCHES'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:'9px 16px', fontSize:12, fontWeight:600, letterSpacing:'0.06em',
            color: tab === t ? 'var(--t1)' : 'var(--t2)',
            borderBottom: tab === t ? '2px solid var(--orange)' : '2px solid transparent',
            background:'none', border:'none',
            borderBottom: tab === t ? '2px solid var(--orange)' : '2px solid transparent',
            cursor:'pointer', transition:'color 0.15s', whiteSpace:'nowrap',
          }}>
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding:20 }}>
        {tab === 'STATS'   && <StatsTab   stats={stats} ranking={ranking} matches={matches} maps={maps} />}
        {tab === 'GRAPHS'  && <GraphsTab  elo={elo} />}
        {tab === 'MAPS'    && <MapsTab    maps={maps} />}
        {tab === 'MATCHES' && <MatchesTab matches={matches} />}
      </div>
    </div>
  )
}

/* ── STATS ── */
function StatsTab({ stats, ranking, matches, maps }: any) {
  const recent = (matches ?? []).slice(0, 20)

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
      {/* 4 gauges */}
      {[
        { value: parseFloat((stats.kd_ratio ?? 0).toFixed(2)), label:'K/D',    max:2,   color:'#f97316' },
        { value: parseFloat((stats.porcentaje_victorias ?? 0).toFixed(0)),  label:'WIN RATE', max:100, color:'#22c55e' },
        { value: parseFloat((stats.ratio_headshots ?? 0).toFixed(0)),       label:'HS%',      max:100, color:'#3b82f6' },
        { value: parseFloat((stats.dano_promedio_ronda ?? 0).toFixed(0)),   label:'ADR',      max:200, color:'#eab308' },
      ].map(g => (
        <div key={g.label} style={{ background:'#111318', border:'1px solid var(--bg-border)', borderRadius:8,
                                     padding:20, display:'flex', justifyContent:'center' }}>
          <CircleGauge {...g} />
        </div>
      ))}

      {/* Win/Loss stats */}
      <div style={{ gridColumn:'1/3', background:'#111318', border:'1px solid var(--bg-border)', borderRadius:8, padding:20 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:0 }}>
          {[
            ['PLAYED', stats.total_partidas_jugadas ?? 0],
            ['WON',    stats.total_partidas_ganadas ?? 0],
            ['KILLS',  stats.kills ?? 0],
            ['DEATHS', stats.deaths ?? 0],
          ].map(([l, v]) => (
            <div key={l} style={{ textAlign:'center', padding:'8px 0' }}>
              <div style={{ fontSize:10, color:'var(--t3)', letterSpacing:'0.08em', marginBottom:4 }}>{l}</div>
              <div style={{ fontSize:18, fontFamily:'IBM Plex Mono,monospace', fontWeight:600 }}>
                {Number(v).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
        <div style={{ borderTop:'1px solid var(--bg-border)', marginTop:12, paddingTop:12,
                      display:'grid', gridTemplateColumns:'repeat(3,1fr)' }}>
          {[
            ['WIN RATE', `${stats.porcentaje_victorias ?? 0}%`],
            ['HS%',      `${stats.ratio_headshots ?? 0}%`],
            ['ADR',      stats.dano_promedio_ronda?.toFixed(1) ?? '—'],
          ].map(([l, v]) => (
            <div key={l} style={{ textAlign:'center' }}>
              <div style={{ fontSize:10, color:'var(--t3)', letterSpacing:'0.08em' }}>{l}</div>
              <div style={{ fontSize:20, fontFamily:'Rajdhani,sans-serif', fontWeight:700, marginTop:2 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Ranking PREMIER */}
      <div style={{ gridColumn:'3/5', background:'#111318', border:'1px solid var(--bg-border)', borderRadius:8, padding:20 }}>
        {ranking ? (
          <>
            <div style={{ fontSize:10, color:'var(--t3)', letterSpacing:'0.1em', marginBottom:8 }}>PREMIER RANK</div>
            <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:40, fontWeight:700, color:'var(--orange)', lineHeight:1 }}>
              {ranking.puntos_elo.toLocaleString()}
            </div>
            <div style={{ fontSize:13, color:'var(--t2)', marginTop:4 }}>{ranking.tier}</div>
            {ranking.posicion_global && (
              <div style={{ fontSize:11, color:'var(--t3)', marginTop:2 }}>#{ranking.posicion_global} global</div>
            )}
          </>
        ) : (
          <div style={{ color:'var(--t3)', fontSize:12 }}>No Premier rank yet</div>
        )}
      </div>

      {/* Recent match W/L dots */}
      <div style={{ gridColumn:'1/5', background:'#111318', border:'1px solid var(--bg-border)', borderRadius:8, padding:16 }}>
        <div style={{ fontSize:10, color:'var(--t3)', letterSpacing:'0.1em', marginBottom:10 }}>RECENT MATCHES</div>
        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
          {recent.length === 0
            ? <span style={{ color:'var(--t3)', fontSize:12 }}>No matches yet</span>
            : recent.map((m: any, i: number) => {
                const isW = m.resultado === 'VICTORIA', isL = m.resultado === 'DERROTA'
                return (
                  <div key={i} title={`${m.mapa} — ${m.resultado}`} style={{
                    width:28, height:28, borderRadius:4, display:'flex', alignItems:'center',
                    justifyContent:'center', fontSize:11, fontWeight:700,
                    background: isW ? 'rgba(34,197,94,0.15)' : isL ? 'rgba(239,68,68,0.15)' : 'rgba(156,163,175,0.1)',
                    color: isW ? '#22c55e' : isL ? '#ef4444' : '#9ca3af',
                  }}>
                    {isW ? 'W' : isL ? 'L' : 'T'}
                  </div>
                )
              })
          }
        </div>
      </div>

      {/* Most played / Most success */}
      {maps && maps.length > 0 && (<>
        <div style={{ gridColumn:'1/3', background:'#111318', border:'1px solid var(--bg-border)', borderRadius:8, padding:16 }}>
          <div style={{ fontSize:10, color:'var(--t3)', letterSpacing:'0.1em', marginBottom:10 }}>MOST PLAYED</div>
          {maps.slice(0,4).map((m: any, i: number) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                                   padding:'5px 0', borderBottom:'1px solid #191c28' }}>
              <span style={{ color:'var(--t2)', fontSize:12 }}>{m.mapa}</span>
              <span style={{ color:'var(--t1)', fontSize:12, fontFamily:'IBM Plex Mono,monospace' }}>
                {m.total_partidas_mapa}
              </span>
            </div>
          ))}
        </div>
        <div style={{ gridColumn:'3/5', background:'#111318', border:'1px solid var(--bg-border)', borderRadius:8, padding:16 }}>
          <div style={{ fontSize:10, color:'var(--t3)', letterSpacing:'0.1em', marginBottom:10 }}>MOST SUCCESS</div>
          {[...maps].sort((a,b) => b.tasa_victoria_mapa - a.tasa_victoria_mapa).slice(0,4).map((m: any, i: number) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                                   padding:'5px 0', borderBottom:'1px solid #191c28' }}>
              <span style={{ color:'var(--t2)', fontSize:12 }}>{m.mapa}</span>
              <span style={{ color:'#22c55e', fontSize:12, fontFamily:'IBM Plex Mono,monospace' }}>
                {m.tasa_victoria_mapa}%
              </span>
            </div>
          ))}
        </div>
      </>)}
    </div>
  )
}

/* ── GRAPHS ── */
function GraphsTab({ elo }: any) {
  const [mode, setMode] = useState<'game'|'day'|'week'|'month'>('game')

  if (!elo || elo.length === 0) {
    return <div style={{ textAlign:'center', padding:48, color:'var(--t3)' }}>No ELO history yet.</div>
  }

  const w = 760, h = 260, padX = 40, padY = 20
  const vals = elo.map((e: any) => e.puntos_elo)
  const min  = Math.min(...vals), max = Math.max(...vals) || 1
  const xStep = (w - padX*2) / Math.max(elo.length - 1, 1)

  const pts = elo.map((e: any, i: number) => {
    const x = padX + i * xStep
    const y = h - padY - ((e.puntos_elo - min) / (max - min || 1)) * (h - padY*2)
    return { x, y, ...e }
  })

  const polyline = pts.map((p: any) => `${p.x},${p.y}`).join(' ')

  return (
    <div>
      {/* Controls */}
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {[['game','By Game'],['day','By Day'],['week','By Week'],['month','By Month']].map(([v, label]) => (
          <button key={v} onClick={() => setMode(v as any)} style={{
            background: mode === v ? '#1a1d27' : 'var(--bg-deep)',
            border:'1px solid var(--bg-border)', borderRadius:6,
            padding:'5px 12px', fontSize:12, color: mode === v ? 'var(--t1)' : 'var(--t2)',
            cursor:'pointer',
          }}>
            {label}
          </button>
        ))}
        <div style={{ background:'var(--bg-deep)', border:'1px solid var(--bg-border)', borderRadius:6,
                      padding:'5px 12px', fontSize:12, color:'var(--t2)', display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ width:10, height:10, background:'#818cf8', borderRadius:2, display:'inline-block' }}/>
          All Ranks
        </div>
      </div>

      <div style={{ background:'#111318', border:'1px solid var(--bg-border)', borderRadius:8, padding:16, overflowX:'auto' }}>
        <svg viewBox={`0 0 ${w} ${h}`} style={{ width:'100%', minWidth:400 }}>
          {/* Horizontal grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(p => {
            const y = padY + (1 - p) * (h - padY*2)
            const v = Math.round(min + p * (max - min))
            return (
              <g key={p}>
                <line x1={padX} y1={y} x2={w-padX} y2={y} stroke="#1e2130" strokeWidth={1} />
                <text x={w-padX+6} y={y+4} fontSize={9} fill="#4b5563">{v}</text>
              </g>
            )
          })}
          {/* Gradient area under line */}
          <defs>
            <linearGradient id="eloGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon
            points={`${padX},${h-padY} ${polyline} ${w-padX},${h-padY}`}
            fill="url(#eloGrad)"
          />
          {/* ELO line */}
          <polyline points={polyline} fill="none" stroke="#818cf8" strokeWidth={2} />
          {/* Dots */}
          {pts.map((p: any, i: number) => (
            <circle key={i} cx={p.x} cy={p.y} r={3} fill="#818cf8" />
          ))}
        </svg>
        {/* Date axis */}
        <div style={{ display:'flex', justifyContent:'space-between', padding:`4px ${padX}px 0`, fontSize:9, color:'var(--t3)' }}>
          {[0, Math.floor(elo.length/4), Math.floor(elo.length/2), Math.floor(3*elo.length/4), elo.length-1]
            .filter((v,i,a) => a.indexOf(v) === i && v < elo.length)
            .map((i: number) => (
              <span key={i}>
                {new Date(elo[i]?.fecha_snapshot).toLocaleDateString('es-ES', {day:'2-digit', month:'2-digit'})}
              </span>
            ))}
        </div>
      </div>
    </div>
  )
}

/* ── MAPS ── */
function MapsTab({ maps }: any) {
  if (!maps || maps.length === 0) {
    return <div style={{ textAlign:'center', padding:48, color:'var(--t3)' }}>No map data yet.</div>
  }

  return (
    <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
      <thead>
        <tr style={{ borderBottom:'1px solid var(--bg-border)' }}>
          {['Map','WR%','Times Played','% T Rounds Won','% CT Rounds Won'].map(h => (
            <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:10,
                                  textTransform:'uppercase', letterSpacing:'0.08em',
                                  color:'var(--t3)', fontWeight:500 }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {maps.map((m: any, i: number) => {
          const wr = Math.round(m.tasa_victoria_mapa ?? 0)
          return (
            <tr key={i} style={{ borderBottom:'1px solid #191c28' }}
                onMouseEnter={e => (e.currentTarget.style.background='var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background='')}>
              <td style={{ padding:'10px 12px', fontWeight:500, color:'var(--t1)' }}>{m.mapa}</td>
              <td style={{ padding:'10px 12px' }}><WinCircle pct={wr} /></td>
              <td style={{ padding:'10px 12px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:12 }}>{m.total_partidas_mapa}</span>
                  <div style={{ width:60, height:3, background:'var(--bg-border)', borderRadius:2 }}>
                    <div style={{ height:'100%', borderRadius:2, background:'var(--blue)',
                                  width:`${Math.min(m.total_partidas_mapa / 10, 1) * 100}%` }} />
                  </div>
                </div>
              </td>
              <td style={{ padding:'10px 12px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:10, color:'#eab308', minWidth:32, textAlign:'right' }}>{wr}%</span>
                  <div style={{ flex:1, height:4, background:'var(--bg-border)', borderRadius:2 }}>
                    <div style={{ height:'100%', borderRadius:2, background:'#eab308', width:`${wr}%` }} />
                  </div>
                </div>
              </td>
              <td style={{ padding:'10px 12px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:10, color:'#3b82f6', minWidth:32, textAlign:'right' }}>{100-wr}%</span>
                  <div style={{ flex:1, height:4, background:'var(--bg-border)', borderRadius:2 }}>
                    <div style={{ height:'100%', borderRadius:2, background:'#3b82f6', width:`${100-wr}%` }} />
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

/* ── MATCHES ── */
function MatchesTab({ matches }: any) {
  if (!matches || matches.length === 0) {
    return <div style={{ textAlign:'center', padding:48, color:'var(--t3)' }}>No matches yet.</div>
  }

  return (
    <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
      <thead>
        <tr style={{ borderBottom:'1px solid var(--bg-border)' }}>
          {['Date','Map','Score','Result','K/D/A','HS%','ADR','Duration'].map(h => (
            <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:10,
                                  textTransform:'uppercase', letterSpacing:'0.08em',
                                  color:'var(--t3)', fontWeight:500 }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {matches.map((m: any, i: number) => {
          const kda  = `${m.kills}/${m.deaths}/${m.assists}`
          const hs   = m.kills > 0 ? Math.round((m.headshots / m.kills) * 100) : 0
          const adr  = m.dano_total > 0 ? Math.round(m.dano_total / 24) : 0
          const isW  = m.resultado === 'VICTORIA'
          const isL  = m.resultado === 'DERROTA'
          return (
            <tr key={i} style={{ borderBottom:'1px solid #191c28' }}
                onMouseEnter={e => (e.currentTarget.style.background='var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background='')}>
              <td style={{ padding:'9px 12px', color:'var(--t3)', fontSize:11 }}>
                {new Date(m.fecha_partida).toLocaleDateString('es-ES')}
              </td>
              <td style={{ padding:'9px 12px', fontWeight:500, color:'var(--t1)' }}>{m.mapa}</td>
              <td style={{ padding:'9px 12px', fontFamily:'IBM Plex Mono,monospace', fontSize:12, color:'var(--t2)' }}>
                {m.resultado_puntuacion ?? '—'}
              </td>
              <td style={{ padding:'9px 12px' }}>
                <span style={{
                  fontSize:11, fontWeight:700, padding:'2px 7px', borderRadius:4,
                  background: isW ? 'rgba(34,197,94,0.12)' : isL ? 'rgba(239,68,68,0.12)' : 'rgba(156,163,175,0.1)',
                  color: isW ? '#22c55e' : isL ? '#ef4444' : '#9ca3af',
                }}>
                  {isW ? 'W' : isL ? 'L' : 'T'}
                </span>
              </td>
              <td style={{ padding:'9px 12px', fontFamily:'IBM Plex Mono,monospace', fontSize:12 }}>{kda}</td>
              <td style={{ padding:'9px 12px', fontFamily:'IBM Plex Mono,monospace', fontSize:12,
                            color: hs >= 50 ? '#22c55e' : 'var(--t2)' }}>
                {hs}%
              </td>
              <td style={{ padding:'9px 12px', fontFamily:'IBM Plex Mono,monospace', fontSize:12, color:'var(--t2)' }}>
                {adr}
              </td>
              <td style={{ padding:'9px 12px', color:'var(--t3)', fontSize:11 }}>{m.duracion_minutos}m</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
