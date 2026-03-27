interface WinCircleProps { pct: number; size?: number }

export function WinCircle({ pct, size = 44 }: WinCircleProps) {
  const r    = (size - 4) / 2
  const circ = 2 * Math.PI * r
  const dash = circ * (pct / 100)
  const color = pct >= 55 ? '#22c55e' : pct >= 45 ? '#eab308' : '#ef4444'

  return (
    <div style={{ position:'relative', width:size, height:size, display:'inline-flex',
                  alignItems:'center', justifyContent:'center' }}>
      <svg width={size} height={size} style={{ position:'absolute', transform:'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e2130" strokeWidth={3} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={3}
                strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <span style={{ fontSize:10, fontWeight:700, color, fontFamily:'IBM Plex Mono,monospace',
                     position:'relative', zIndex:1 }}>
        {pct}%
      </span>
    </div>
  )
}
