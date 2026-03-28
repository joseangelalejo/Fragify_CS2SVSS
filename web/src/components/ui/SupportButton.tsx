'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'

const CATS = ['BUG', 'CUENTA', 'DATOS', 'OTRO']

const S = {
  fab:     { position:'fixed' as const, bottom:24, right:24, width:48, height:48, borderRadius:'50%', background:'var(--orange)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px rgba(249,115,22,0.4)', zIndex:100, color:'#fff', fontSize:20 },
  panel:   { position:'fixed' as const, bottom:84, right:24, width:340, background:'var(--bg-card)', border:'1px solid var(--bg-border)', borderRadius:16, boxShadow:'0 16px 48px rgba(0,0,0,0.6)', zIndex:100, overflow:'hidden' },
  header:  { background:'var(--orange)', padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' },
  hTitle:  { fontFamily:'Rajdhani,sans-serif', fontWeight:700, fontSize:16, color:'#fff' },
  body:    { padding:20 },
  label:   { fontSize:12, fontWeight:500, color:'var(--t2)', display:'block', marginBottom:5 },
  input:   { width:'100%', background:'#0d0e13', border:'1px solid var(--bg-border)', borderRadius:6, padding:'9px 11px', fontSize:12, color:'var(--t1)', outline:'none', boxSizing:'border-box' as const, marginBottom:12 },
  select:  { width:'100%', background:'#0d0e13', border:'1px solid var(--bg-border)', borderRadius:6, padding:'9px 11px', fontSize:12, color:'var(--t1)', outline:'none', boxSizing:'border-box' as const, marginBottom:12 },
  textarea:{ width:'100%', background:'#0d0e13', border:'1px solid var(--bg-border)', borderRadius:6, padding:'9px 11px', fontSize:12, color:'var(--t1)', outline:'none', resize:'vertical' as const, minHeight:80, boxSizing:'border-box' as const, marginBottom:12 },
  btn:     { width:'100%', background:'var(--orange)', color:'#fff', fontWeight:700, fontSize:13, padding:'10px', borderRadius:8, border:'none', cursor:'pointer' },
  err:     { background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:6, padding:'8px 12px', fontSize:12, color:'#ef4444', marginBottom:10 },
  ok:      { background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', borderRadius:6, padding:'8px 12px', fontSize:12, color:'#22c55e' },
}

export function SupportButton() {
  const { data: session } = useSession()
  const user = session?.user as any

  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg,     setMsg]     = useState<{ type:'ok'|'err', text:string } | null>(null)
  const [form,    setForm]    = useState({
    nombre:    user?.name  ?? '',
    email:     user?.email ?? '',
    asunto:    '',
    mensaje:   '',
    categoria: 'OTRO',
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setMsg(null)
    const res  = await fetch('/api/support', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ...form, honeypot: '' }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setMsg({ type:'err', text: data.error ?? 'Error sending ticket' }); return }
    setMsg({ type:'ok', text:'Ticket submitted! We\'ll get back to you soon.' })
    setForm(f => ({ ...f, asunto:'', mensaje:'' }))
  }

  return (
    <>
      <button onClick={() => { setOpen(o => !o); setMsg(null) }} style={S.fab} title="Support">
        {open ? '×' : '?'}
      </button>

      {open && (
        <div style={S.panel}>
          <div style={S.header}>
            <span style={S.hTitle}>Support</span>
            <button onClick={() => setOpen(false)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.7)', cursor:'pointer', fontSize:18 }}>×</button>
          </div>
          <div style={S.body}>
            {msg?.type === 'ok' ? (
              <div style={S.ok}>{msg.text}</div>
            ) : (
              <form onSubmit={submit}>
                {/* Honeypot */}
                <input name="honeypot" style={{ display:'none' }} tabIndex={-1} autoComplete="off" />

                {msg?.type === 'err' && <div style={S.err}>{msg.text}</div>}

                <label style={S.label}>Your Name</label>
                <input value={form.nombre} onChange={e => set('nombre', e.target.value)}
                  style={S.input} placeholder="Name" required
                  onFocus={e => (e.target.style.borderColor = 'var(--orange)')}
                  onBlur={e  => (e.target.style.borderColor = 'var(--bg-border)')}
                />

                <label style={S.label}>Email</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  style={S.input} placeholder="your@email.com" required
                  onFocus={e => (e.target.style.borderColor = 'var(--orange)')}
                  onBlur={e  => (e.target.style.borderColor = 'var(--bg-border)')}
                />

                <label style={S.label}>Category</label>
                <select value={form.categoria} onChange={e => set('categoria', e.target.value)} style={S.select}>
                  {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <label style={S.label}>Subject</label>
                <input value={form.asunto} onChange={e => set('asunto', e.target.value)}
                  style={S.input} placeholder="Brief description" required
                  onFocus={e => (e.target.style.borderColor = 'var(--orange)')}
                  onBlur={e  => (e.target.style.borderColor = 'var(--bg-border)')}
                />

                <label style={S.label}>Message</label>
                <textarea value={form.mensaje} onChange={e => set('mensaje', e.target.value)}
                  style={S.textarea} placeholder="Describe your issue..." required
                  onFocus={e => (e.target.style.borderColor = 'var(--orange)')}
                  onBlur={e  => (e.target.style.borderColor = 'var(--bg-border)')}
                />

                <button type="submit" disabled={loading} style={{ ...S.btn, opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
