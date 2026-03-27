'use client'
// Gráfico circular para K/D, HLTV Rating, etc.
interface CircleStatProps {
  value: string | number
  label: string
  size?: number
  color?: string
  subtitle?: string
}

export function CircleStat({ value, label, size = 140, color = '#f97316', subtitle }: CircleStatProps) {
  const r    = (size - 12) / 2
  const circ = 2 * Math.PI * r
  // Calcular progreso: para K/D, 1.0 = 50%, 2.0 = 100%
  const num  = parseFloat(String(value)) || 0
  const pct  = Math.min(num / 2, 1)
  const dash = circ * pct

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
      <div style={{ fontSize:10, letterSpacing:'0.1em', color:'var(--t3)', fontWeight:500 }}>{label}</div>
      <div style={{ position:'relative', width:size, height:size }}>
        <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
          {/* Track */}
          <circle cx={size/2} cy={size/2} r={r}
                  fill="none" stroke="#1e2130" strokeWidth={6} />
          {/* Progress */}
          <circle cx={size/2} cy={size/2} r={r}
                  fill="none" stroke={color} strokeWidth={6}
                  strokeDasharray={`${dash} ${circ}`}
                  strokeLinecap="round" />
        </svg>
        <div style={{
          position:'absolute', inset:0, display:'flex',
          flexDirection:'column', alignItems:'center', justifyContent:'center'
        }}>
          <span style={{ fontFamily:'Rajdhani,sans-serif', fontSize:size > 120 ? 32 : 24,
                         fontWeight:700, color:'var(--t1)', lineHeight:1 }}>
            {value}
          </span>
          {subtitle && (
            <span style={{ fontSize:10, color:'var(--t3)', marginTop:2 }}>{subtitle}</span>
          )}
        </div>
      </div>
    </div>
  )
}
