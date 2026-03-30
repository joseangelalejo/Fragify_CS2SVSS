'use client'
import { useEffect, useState } from 'react'

const ESTADOS = ['ABIERTO', 'EN_PROCESO', 'CERRADO']
const CATS    = ['BUG', 'CUENTA', 'DATOS', 'OTRO']

const catColor: Record<string, string> = {
  BUG:    '#ef4444', CUENTA: '#3b82f6',
  DATOS:  '#eab308', OTRO:   '#9ca3af',
}
const estColor: Record<string, string> = {
  ABIERTO:    '#ef4444', EN_PROCESO: '#f97316', CERRADO: '#22c55e',
}

const S = {
  card:    { background:'var(--bg-card)', border:'1px solid var(--bg-border)', borderRadius:12, padding:24 },
  badge:   (color: string) => ({ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:4, background:`${color}22`, color, letterSpacing:'0.06em' }),
  btn:     { background:'var(--orange)', color:'#fff', fontWeight:700, fontSize:12, padding:'6px 14px', borderRadius:6, border:'none', cursor:'pointer' },
  overlay: { position:'fixed' as const, inset:0, background:'rgba(0,0,0,0.7)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 },
  modal:   { background:'var(--bg-card)', border:'1px solid var(--bg-border)', borderRadius:12, padding:28, width:'100%', maxWidth:560, maxHeight:'80vh', overflowY:'auto' as const },
}

export default function AdminSupportPage() {
  const [tickets, setTickets]   = useState<any[]>([])
  const [filter,  setFilter]    = useState('ABIERTO')
  const [selected, setSelected] = useState<any>(null)
  const [notas,    setNotas]    = useState('')
  const [respuesta, setRespuesta] = useState('')
  const [saving,   setSaving]   = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  function load(estado: string) {
    fetch(`/api/support?estado=${estado}`).then(r => r.json()).then(d => setTickets(d.tickets ?? []))
  }

  useEffect(() => { load(filter) }, [filter])

  async function updateTicket(id: number, estado: string) {
    setSaving(true); setEmailSent(false)
    const res  = await fetch('/api/support', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id, estado, notas_admin: notas, respuesta_admin: respuesta }),
    })
    const data = await res.json()
    setSaving(false)
    setEmailSent(data.emailSent === true)
    setSelected(null)
    load(filter)
  }

  return (
    <div>
      <h2 style={{ fontSize:24, marginBottom:24, fontFamily:'Rajdhani,sans-serif' }}>Support Tickets</h2>

      {/* Filtros */}
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {ESTADOS.map(e => (
          <button key={e} onClick={() => setFilter(e)} style={{
            padding:'6px 16px', fontSize:12, fontWeight:600, borderRadius:6, cursor:'pointer',
            background: filter === e ? 'var(--orange)' : 'var(--bg-card)',
            color: filter === e ? '#fff' : 'var(--t2)',
            border: `1px solid ${filter === e ? 'var(--orange)' : 'var(--bg-border)'}`,
          }}>
            {e}
          </button>
        ))}
      </div>

      <div style={S.card}>
        {tickets.length === 0 ? (
          <p style={{ color:'var(--t3)', fontSize:13 }}>No tickets with status: {filter}</p>
        ) : (
          <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse', minWidth:600 }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--bg-border)' }}>
                {['#','Name','Email','Subject','Category','Status','Date',''].map(h => (
                  <th key={h} style={{ textAlign:'left', padding:'8px 10px', fontSize:10, color:'var(--t3)', fontWeight:500, letterSpacing:'0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tickets.map((t: any) => (
                <tr key={t.id} style={{ borderBottom:'1px solid #191c28' }}>
                  <td style={{ padding:'9px 10px', color:'var(--t3)' }}>#{t.id}</td>
                  <td style={{ padding:'9px 10px' }}>{t.nombre}</td>
                  <td style={{ padding:'9px 10px', color:'var(--t2)' }}>{t.email}</td>
                  <td style={{ padding:'9px 10px', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.asunto}</td>
                  <td style={{ padding:'9px 10px' }}><span style={S.badge(catColor[t.categoria] ?? '#9ca3af')}>{t.categoria}</span></td>
                  <td style={{ padding:'9px 10px' }}><span style={S.badge(estColor[t.estado] ?? '#9ca3af')}>{t.estado}</span></td>
                  <td style={{ padding:'9px 10px', color:'var(--t3)', fontSize:11 }}>{new Date(t.fecha_creacion).toLocaleDateString()}</td>
                  <td style={{ padding:'9px 10px' }}>
                    <button onClick={() => { setSelected(t); setNotas(t.notas_admin ?? ''); setRespuesta(t.respuesta_admin ?? ''); setEmailSent(false) }} style={S.btn}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Modal detalle */}
      {selected && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div style={S.modal}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'start', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>Ticket #{selected.id}</div>
                <div style={{ display:'flex', gap:8 }}>
                  <span style={S.badge(catColor[selected.categoria] ?? '#9ca3af')}>{selected.categoria}</span>
                  <span style={S.badge(estColor[selected.estado] ?? '#9ca3af')}>{selected.estado}</span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', color:'var(--t3)', cursor:'pointer', fontSize:20 }}>×</button>
            </div>

            <div style={{ display:'grid', gap:10, marginBottom:20, fontSize:13 }}>
              <div><span style={{ color:'var(--t3)' }}>From: </span><strong>{selected.nombre}</strong> &lt;{selected.email}&gt;</div>
              <div><span style={{ color:'var(--t3)' }}>Subject: </span>{selected.asunto}</div>
              <div><span style={{ color:'var(--t3)' }}>Date: </span>{new Date(selected.fecha_creacion).toLocaleString()}</div>
            </div>

            <div style={{ background:'#0d0e13', border:'1px solid var(--bg-border)', borderRadius:8, padding:16, fontSize:13, lineHeight:1.7, marginBottom:20, color:'var(--t2)', whiteSpace:'pre-wrap' }}>
              {selected.mensaje}
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:12, color:'var(--t3)', display:'block', marginBottom:6 }}>
                Admin Notes <span style={{ fontWeight:400 }}>(interno, el usuario no lo ve)</span>
              </label>
              <textarea value={notas} onChange={e => setNotas(e.target.value)}
                style={{ width:'100%', background:'#0d0e13', border:'1px solid var(--bg-border)', borderRadius:6, padding:'10px 12px', fontSize:13, color:'var(--t1)', outline:'none', resize:'vertical', minHeight:60, boxSizing:'border-box' }}
              />
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:12, color:'var(--t3)', display:'block', marginBottom:6 }}>
                Respuesta al usuario{' '}
                <span style={{ color:'#22c55e', fontWeight:400 }}>✉️ Se enviará por email al guardar</span>
              </label>
              <textarea value={respuesta} onChange={e => setRespuesta(e.target.value)}
                style={{ width:'100%', background:'#0d0e13', border:'1px solid rgba(34,197,94,0.3)', borderRadius:6, padding:'10px 12px', fontSize:13, color:'var(--t1)', outline:'none', resize:'vertical', minHeight:100, boxSizing:'border-box' }}
                placeholder="Escribe aquí la respuesta que verá el usuario en su email..."
                onFocus={e => (e.target.style.borderColor = '#22c55e')}
                onBlur={e  => (e.target.style.borderColor = 'rgba(34,197,94,0.3)')}
              />
              {selected?.fecha_respuesta && (
                <div style={{ fontSize:11, color:'var(--t3)', marginTop:4 }}>
                  Última respuesta enviada: {new Date(selected.fecha_respuesta).toLocaleString('es-ES')}
                </div>
              )}
            </div>

            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {ESTADOS.filter(e => e !== selected.estado).map(e => (
                <button key={e} disabled={saving} onClick={() => updateTicket(selected.id, e)}
                  style={{ ...S.btn, background: e === 'CERRADO' ? '#22c55e22' : e === 'EN_PROCESO' ? '#f9731622' : 'var(--bg-hover)', color: estColor[e], border:`1px solid ${estColor[e]}44`, opacity: saving ? 0.7 : 1 }}>
                  Mark as {e}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
