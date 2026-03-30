'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

const estColor: Record<string, string> = {
  ABIERTO:    '#f97316',
  EN_PROCESO: '#3b82f6',
  CERRADO:    '#22c55e',
}
const catColor: Record<string, string> = {
  BUG: '#ef4444', CUENTA: '#3b82f6', DATOS: '#eab308', OTRO: '#9ca3af',
}

const S = {
  card:   { background:'var(--bg-card)', border:'1px solid var(--bg-border)', borderRadius:12, padding:24, marginBottom:20 },
  title:  { fontSize:12, fontWeight:600, letterSpacing:'0.08em', color:'var(--t3)', marginBottom:20 },
  badge:  (color: string) => ({ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:4, background:`${color}22`, color, letterSpacing:'0.06em' }),
  overlay:{ position:'fixed' as const, inset:0, background:'rgba(0,0,0,0.75)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 },
  modal:  { background:'var(--bg-card)', border:'1px solid var(--bg-border)', borderRadius:12, padding:28, width:'100%', maxWidth:540, maxHeight:'85vh', overflowY:'auto' as const },
}

export default function MyTicketsPage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const [tickets,  setTickets]  = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => {
    fetch('/api/support/my-tickets')
      .then(r => r.json())
      .then(d => { setTickets(d.tickets ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (!user) return null

  return (
    <div>
      <h2 style={{ fontSize:24, marginBottom:24, fontFamily:'Rajdhani,sans-serif' }}>Mis Tickets</h2>

      <div style={S.card}>
        <div style={S.title}>HISTORIAL DE SOPORTE</div>

        {loading ? (
          <div style={{ color:'var(--t3)', textAlign:'center', padding:32 }}>Cargando...</div>
        ) : tickets.length === 0 ? (
          <div style={{ color:'var(--t3)', fontSize:13, textAlign:'center', padding:32 }}>
            No has enviado ningún ticket de soporte todavía.<br/>
            <span style={{ fontSize:12 }}>Usa el botón ❓ en la esquina inferior derecha para contactar con soporte.</span>
          </div>
        ) : (
          <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--bg-border)' }}>
                {['#','Asunto','Categoría','Estado','Fecha','Respuesta',''].map(h => (
                  <th key={h} style={{ textAlign:'left', padding:'8px 12px', fontSize:10,
                                       color:'var(--t3)', fontWeight:500, letterSpacing:'0.06em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tickets.map((t: any) => (
                <tr key={t.id} style={{ borderBottom:'1px solid #191c28' }}>
                  <td style={{ padding:'10px 12px', color:'var(--t3)', fontFamily:'IBM Plex Mono,monospace', fontSize:11 }}>
                    #{t.id}
                  </td>
                  <td style={{ padding:'10px 12px', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {t.asunto}
                  </td>
                  <td style={{ padding:'10px 12px' }}>
                    <span style={S.badge(catColor[t.categoria] ?? '#9ca3af')}>{t.categoria}</span>
                  </td>
                  <td style={{ padding:'10px 12px' }}>
                    <span style={S.badge(estColor[t.estado] ?? '#9ca3af')}>{t.estado}</span>
                  </td>
                  <td style={{ padding:'10px 12px', color:'var(--t3)', fontSize:11 }}>
                    {new Date(t.fecha_creacion).toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'2-digit' })}
                  </td>
                  <td style={{ padding:'10px 12px' }}>
                    {t.respuesta_admin
                      ? <span style={{ fontSize:11, color:'#22c55e' }}>✓ Respondido</span>
                      : <span style={{ fontSize:11, color:'var(--t3)' }}>Pendiente</span>
                    }
                  </td>
                  <td style={{ padding:'10px 12px' }}>
                    <button onClick={() => setSelected(t)} style={{
                      fontSize:11, fontWeight:600, padding:'4px 10px', borderRadius:4,
                      background:'var(--bg-hover)', border:'1px solid var(--bg-border)',
                      color:'var(--t2)', cursor:'pointer',
                    }}>
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal detalle ticket */}
      {selected && (
        <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}>
          <div style={S.modal}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'start', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:700, marginBottom:6 }}>Ticket #{selected.id}</div>
                <div style={{ display:'flex', gap:8 }}>
                  <span style={S.badge(catColor[selected.categoria] ?? '#9ca3af')}>{selected.categoria}</span>
                  <span style={S.badge(estColor[selected.estado] ?? '#9ca3af')}>{selected.estado}</span>
                </div>
              </div>
              <button onClick={() => setSelected(null)}
                      style={{ background:'none', border:'none', color:'var(--t3)', cursor:'pointer', fontSize:20 }}>×</button>
            </div>

            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, color:'var(--t3)', letterSpacing:'0.06em', marginBottom:4 }}>ASUNTO</div>
              <div style={{ fontSize:14, fontWeight:600 }}>{selected.asunto}</div>
            </div>

            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, color:'var(--t3)', letterSpacing:'0.06em', marginBottom:4 }}>TU MENSAJE</div>
              <div style={{ background:'#0d0e13', borderRadius:8, padding:'12px 14px', fontSize:13,
                             lineHeight:1.7, color:'var(--t2)', whiteSpace:'pre-wrap' }}>
                {selected.mensaje}
              </div>
            </div>

            <div style={{ fontSize:11, color:'var(--t3)', marginBottom:16 }}>
              Enviado el {new Date(selected.fecha_creacion).toLocaleString('es-ES')}
            </div>

            {selected.respuesta_admin ? (
              <div>
                <div style={{ fontSize:11, color:'#22c55e', letterSpacing:'0.06em', marginBottom:8,
                               fontWeight:700 }}>
                  ✉️ RESPUESTA DEL EQUIPO
                  {selected.fecha_respuesta && (
                    <span style={{ fontWeight:400, color:'var(--t3)', marginLeft:8 }}>
                      · {new Date(selected.fecha_respuesta).toLocaleString('es-ES')}
                    </span>
                  )}
                </div>
                <div style={{ background:'#111318', borderLeft:'3px solid #22c55e',
                               borderRadius:'0 8px 8px 0', padding:'14px 18px', fontSize:13,
                               lineHeight:1.7, color:'var(--t1)', whiteSpace:'pre-wrap' }}>
                  {selected.respuesta_admin}
                </div>
              </div>
            ) : (
              <div style={{ background:'rgba(249,115,22,0.06)', border:'1px solid rgba(249,115,22,0.2)',
                             borderRadius:8, padding:'12px 14px', fontSize:13, color:'#f97316' }}>
                ⏳ Tu ticket está siendo revisado. Te responderemos por email cuando tengamos una respuesta.
              </div>
            )}

            <div style={{ textAlign:'right', marginTop:20 }}>
              <button onClick={() => setSelected(null)} style={{
                background:'transparent', color:'var(--t3)', border:'1px solid var(--bg-border)',
                padding:'8px 16px', borderRadius:6, cursor:'pointer', fontSize:13,
              }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
