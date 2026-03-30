'use client'
import { useEffect, useState } from 'react'

const SEV_COLOR: Record<number, string> = { 1: '#eab308', 2: '#f97316', 3: '#ef4444' }
const SEV_LABEL: Record<number, string> = { 1: 'Baja', 2: 'Media', 3: 'Alta' }
const EST_COLOR: Record<string, string> = {
  PENDIENTE:  '#f97316',
  EN_PROCESO: '#3b82f6',
  RESUELTO:   '#22c55e',
  DESESTIMADO:'#9ca3af',
}

const S = {
  card:   { background:'var(--bg-card)', border:'1px solid var(--bg-border)', borderRadius:12, padding:24 },
  badge:  (color: string) => ({
    fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:4,
    background:`${color}22`, color, letterSpacing:'0.06em',
  }),
  btn:    { background:'var(--orange)', color:'#fff', fontWeight:700, fontSize:12,
            padding:'6px 14px', borderRadius:6, border:'none', cursor:'pointer' },
  filter: (active: boolean) => ({
    padding:'6px 14px', fontSize:12, fontWeight:600, borderRadius:6, cursor:'pointer',
    border: active ? '1px solid var(--orange)' : '1px solid var(--bg-border)',
    background: active ? 'rgba(249,115,22,0.1)' : 'transparent',
    color: active ? 'var(--orange)' : 'var(--t3)',
  }),
}

const ESTADOS = ['PENDIENTE', 'EN_PROCESO', 'RESUELTO', 'DESESTIMADO']

export default function AdminReportsPage() {
  const [reports,  setReports]  = useState<any[]>([])
  const [filter,   setFilter]   = useState('PENDIENTE')
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [saving,   setSaving]   = useState(false)

  async function load(estado: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/reports?estado=${estado}`)
      const d   = await res.json()
      setReports(d.data ?? [])
    } catch { setReports([]) }
    setLoading(false)
  }

  useEffect(() => { load(filter) }, [filter])

  async function updateEstado(id: number, estado: string) {
    setSaving(true)
    await fetch(`/api/admin/reports`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id_reporte: id, estado_reporte: estado }),
    })
    setSaving(false)
    setSelected(null)
    load(filter)
  }

  return (
    <div>
      <h2 style={{ fontSize:24, marginBottom:8, fontFamily:'Rajdhani,sans-serif' }}>Reportes de Conducta</h2>
      <p style={{ color:'var(--t3)', fontSize:13, marginBottom:24 }}>
        Gestión de reportes enviados por la comunidad.
      </p>

      {/* Filtros por estado */}
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {ESTADOS.map(e => (
          <button key={e} onClick={() => setFilter(e)} style={S.filter(filter === e)}>
            {e}
          </button>
        ))}
      </div>

      <div style={S.card}>
        {loading ? (
          <div style={{ color:'var(--t3)', textAlign:'center', padding:32 }}>Cargando...</div>
        ) : reports.length === 0 ? (
          <div style={{ color:'var(--t3)', textAlign:'center', padding:32 }}>
            No hay reportes con estado {filter}.
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse', minWidth:640 }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--bg-border)' }}>
                {['#','Reportado','Reportador','Tipo','Severidad','Fecha','Estado',''].map(h => (
                  <th key={h} style={{ textAlign:'left', padding:'8px 12px', fontSize:10,
                                       color:'var(--t3)', fontWeight:500, letterSpacing:'0.06em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.map((r: any) => (
                <tr key={r.id_reporte} style={{ borderBottom:'1px solid #191c28' }}>
                  <td style={{ padding:'10px 12px', color:'var(--t3)', fontFamily:'IBM Plex Mono,monospace', fontSize:11 }}>
                    #{r.id_reporte}
                  </td>
                  <td style={{ padding:'10px 12px', fontWeight:600 }}>
                    <a href={`/player/${r.steam_id64_reportado}`} target="_blank"
                       style={{ color:'var(--t1)', textDecoration:'none' }}
                       onMouseEnter={e => (e.currentTarget.style.color='var(--orange)')}
                       onMouseLeave={e => (e.currentTarget.style.color='var(--t1)')}>
                      {r.jugador_reportado}
                    </a>
                  </td>
                  <td style={{ padding:'10px 12px', color:'var(--t2)', fontSize:12 }}>
                    {r.jugador_reportador}
                  </td>
                  <td style={{ padding:'10px 12px' }}>
                    <span style={S.badge('#818cf8')}>{r.tipo_infraccion}</span>
                  </td>
                  <td style={{ padding:'10px 12px' }}>
                    <span style={S.badge(SEV_COLOR[r.severidad] ?? '#9ca3af')}>
                      {SEV_LABEL[r.severidad] ?? r.severidad}
                    </span>
                  </td>
                  <td style={{ padding:'10px 12px', color:'var(--t3)', fontSize:11 }}>
                    {new Date(r.fecha_reporte).toLocaleDateString('es-ES', {
                      day:'2-digit', month:'short', year:'2-digit'
                    })}
                  </td>
                  <td style={{ padding:'10px 12px' }}>
                    <span style={S.badge(EST_COLOR[r.estado_reporte] ?? '#9ca3af')}>
                      {r.estado_reporte}
                    </span>
                  </td>
                  <td style={{ padding:'10px 12px' }}>
                    <button onClick={() => setSelected(r)} style={S.btn}>Ver</button>
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
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:200,
                      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--bg-border)', borderRadius:12,
                        padding:28, width:'100%', maxWidth:520 }}>
            <div style={{ fontSize:18, fontWeight:700, fontFamily:'Rajdhani,sans-serif', marginBottom:16 }}>
              Reporte #{selected.id_reporte}
            </div>

            {[
              ['Jugador reportado', selected.jugador_reportado],
              ['Reportado por',     selected.jugador_reportador],
              ['Tipo',             selected.tipo_infraccion],
              ['Descripción',      selected.descripcion || '—'],
              ['Estado actual',    selected.estado_reporte],
            ].map(([label, value]) => (
              <div key={label} style={{ marginBottom:12 }}>
                <div style={{ fontSize:11, color:'var(--t3)', letterSpacing:'0.06em', marginBottom:3 }}>{label}</div>
                <div style={{ fontSize:13, color:'var(--t1)' }}>{value}</div>
              </div>
            ))}

            <div style={{ fontSize:11, color:'var(--t3)', letterSpacing:'0.06em', marginBottom:8 }}>
              CAMBIAR ESTADO
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 }}>
              {ESTADOS.filter(e => e !== selected.estado_reporte).map(e => (
                <button key={e} disabled={saving}
                        onClick={() => updateEstado(selected.id_reporte, e)}
                        style={{ ...S.filter(false), opacity: saving ? 0.6 : 1 }}>
                  → {e}
                </button>
              ))}
            </div>

            <div style={{ textAlign:'right' }}>
              <button onClick={() => setSelected(null)}
                      style={{ background:'transparent', color:'var(--t3)', border:'1px solid var(--bg-border)',
                               padding:'8px 16px', borderRadius:6, cursor:'pointer', fontSize:13 }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
