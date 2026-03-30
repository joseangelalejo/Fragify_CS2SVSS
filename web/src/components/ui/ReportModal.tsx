// Componente ReportModal — se importa en PlayerTabs
// Permite reportar a un jugador desde su perfil

'use client'
import { useState } from 'react'

const TIPOS = [
  { id: 2, codigo: 'CHEATING',  label: 'Cheating',          desc: 'Uso de trampas o software no autorizado',       emoji: '🎯', severidad: 3 },
  { id: 1, codigo: 'GRIEFING',  label: 'Griefing',          desc: 'Sabotaje deliberado al equipo propio',          emoji: '💥', severidad: 2 },
  { id: 4, codigo: 'SMURFING',  label: 'Smurfing',          desc: 'Jugar con cuenta alternativa en nivel inferior', emoji: '👤', severidad: 2 },
  { id: 3, codigo: 'TOXICITY',  label: 'Toxicidad',         desc: 'Comportamiento tóxico, insultos o acoso verbal', emoji: '🤬', severidad: 1 },
  { id: 5, codigo: 'AFK',       label: 'AFK / Abandono',    desc: 'Abandono o inactividad durante la partida',     emoji: '💤', severidad: 1 },
  { id: 6, codigo: 'OTRO',      label: 'Otro',              desc: 'Otro tipo de infracción no categorizada',       emoji: '⚠️', severidad: 1 },
]

const SEV_COLOR: Record<number, string> = { 1: '#eab308', 2: '#f97316', 3: '#ef4444' }
const SEV_LABEL: Record<number, string> = { 1: 'Baja', 2: 'Media', 3: 'Alta' }

const S = {
  overlay: { position:'fixed' as const, inset:0, background:'rgba(0,0,0,0.75)',
              zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:16 },
  modal:   { background:'var(--bg-card)', border:'1px solid var(--bg-border)', borderRadius:12,
              padding:28, width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto' as const },
  title:   { fontSize:18, fontWeight:700, fontFamily:'Rajdhani,sans-serif', marginBottom:4 },
  sub:     { fontSize:12, color:'var(--t3)', marginBottom:20 },
  tipoBtn: (selected: boolean, sev: number) => ({
    width:'100%', textAlign:'left' as const, padding:'10px 14px', borderRadius:8, cursor:'pointer',
    border: selected ? `1px solid ${SEV_COLOR[sev]}` : '1px solid var(--bg-border)',
    background: selected ? `${SEV_COLOR[sev]}11` : '#111318',
    marginBottom:8, transition:'all 0.15s',
  }),
  label:   { fontSize:12, color:'var(--t1)', fontWeight:600 },
  desc:    { fontSize:11, color:'var(--t3)', marginTop:2 },
  sevBadge:(sev: number) => ({
    fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:3,
    background:`${SEV_COLOR[sev]}22`, color:SEV_COLOR[sev], float:'right' as const,
  }),
  textarea:{ width:'100%', background:'#0d0e13', border:'1px solid var(--bg-border)', borderRadius:6,
             padding:'10px 12px', fontSize:13, color:'var(--t1)', outline:'none',
             resize:'vertical' as const, minHeight:80, boxSizing:'border-box' as const,
             fontFamily:'inherit' },
  btn:     { background:'var(--orange)', color:'#fff', fontWeight:700, fontSize:13,
             padding:'10px 20px', borderRadius:8, border:'none', cursor:'pointer' },
  btnGhost:{ background:'transparent', color:'var(--t3)', fontWeight:500, fontSize:13,
             padding:'10px 16px', borderRadius:8, border:'1px solid var(--bg-border)', cursor:'pointer' },
  ok:      { background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)',
             borderRadius:8, padding:'12px 14px', fontSize:13, color:'#22c55e', marginBottom:16 },
  err:     { background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)',
             borderRadius:8, padding:'12px 14px', fontSize:13, color:'#ef4444', marginBottom:16 },
}

interface Props {
  steamId: string         // jugador a reportar
  playerName: string      // nombre del jugador a reportar
  reporterSteamId: string // steam_id del usuario que reporta
  onClose: () => void
}

export function ReportModal({ steamId, playerName, reporterSteamId, onClose }: Props) {
  const [tipo,     setTipo]     = useState<number | null>(null)
  const [desc,     setDesc]     = useState('')
  const [loading,  setLoading]  = useState(false)
  const [msg,      setMsg]      = useState<{ type:'ok'|'err'; text:string } | null>(null)

  async function handleSubmit() {
    if (!tipo) { setMsg({ type:'err', text:'Selecciona un tipo de infracción' }); return }

    setLoading(true); setMsg(null)
    const res = await fetch('/api/reports', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        steam_id64_reportado:  steamId,
        steam_id64_reportador: reporterSteamId,
        id_tipo_infraccion:    tipo,
        descripcion:           desc.trim() || null,
      }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setMsg({ type:'err', text: data.error ?? 'Error al enviar el reporte' })
    } else {
      setMsg({ type:'ok', text: '✅ Reporte enviado correctamente. Gracias por ayudar a mantener la comunidad.' })
    }
  }

  return (
    <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={S.modal}>
        <div style={S.title}>🚩 Reportar jugador</div>
        <div style={S.sub}>Reportando a <strong>{playerName}</strong></div>

        {msg && <div style={msg.type === 'ok' ? S.ok : S.err}>{msg.text}</div>}

        {!msg?.type || msg.type === 'err' ? (
          <>
            <div style={{ fontSize:11, color:'var(--t3)', letterSpacing:'0.08em', marginBottom:10 }}>
              TIPO DE INFRACCIÓN
            </div>

            {TIPOS.map(t => (
              <button key={t.id} onClick={() => setTipo(t.id)} style={S.tipoBtn(tipo === t.id, t.severidad)}>
                <span style={S.sevBadge(t.severidad)}>Severidad {SEV_LABEL[t.severidad]}</span>
                <div style={S.label}>{t.emoji} {t.label}</div>
                <div style={S.desc}>{t.desc}</div>
              </button>
            ))}

            <div style={{ fontSize:11, color:'var(--t3)', letterSpacing:'0.08em', margin:'16px 0 8px' }}>
              DESCRIPCIÓN ADICIONAL <span style={{ color:'var(--t3)', fontWeight:400 }}>(opcional)</span>
            </div>
            <textarea
              style={S.textarea}
              placeholder="Describe lo que ocurrió, partida, fecha aproximada..."
              value={desc}
              onChange={e => setDesc(e.target.value)}
              maxLength={500}
              onFocus={e => (e.target.style.borderColor = 'var(--orange)')}
              onBlur={e  => (e.target.style.borderColor = 'var(--bg-border)')}
            />
            <div style={{ fontSize:10, color:'var(--t3)', textAlign:'right', marginBottom:16 }}>
              {desc.length}/500
            </div>

            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={onClose} style={S.btnGhost}>Cancelar</button>
              <button onClick={handleSubmit} disabled={loading || !tipo}
                      style={{ ...S.btn, opacity: (loading || !tipo) ? 0.6 : 1 }}>
                {loading ? 'Enviando...' : 'Enviar reporte'}
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign:'right' }}>
            <button onClick={onClose} style={S.btn}>Cerrar</button>
          </div>
        )}
      </div>
    </div>
  )
}
