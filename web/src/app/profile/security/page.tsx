'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'

const S = {
  card:  { background:'var(--bg-card)', border:'1px solid var(--bg-border)', borderRadius:12, padding:24 },
  title: { fontSize:12, fontWeight:600, letterSpacing:'0.08em', color:'var(--t3)', marginBottom:20 },
  label: { fontSize:12, fontWeight:500, color:'var(--t2)', display:'block', marginBottom:6 },
  input: { width:'100%', background:'#0d0e13', border:'1px solid var(--bg-border)', borderRadius:6, padding:'10px 12px', fontSize:13, color:'var(--t1)', outline:'none', boxSizing:'border-box' as const },
  btn:   { background:'var(--orange)', color:'#fff', fontWeight:700, fontSize:13, padding:'9px 20px', borderRadius:8, border:'none', cursor:'pointer' },
  err:   { background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:6, padding:'10px 12px', fontSize:13, color:'#ef4444', marginBottom:12 },
  ok:    { background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', borderRadius:6, padding:'10px 12px', fontSize:13, color:'#22c55e', marginBottom:12 },
  field: { marginBottom:16 },
}

export default function SecurityPage() {
  const { data: session } = useSession()
  const user = session?.user as any

  const [form, setForm]   = useState({ current: '', newPass: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]     = useState<{ type:'ok'|'err', text:string } | null>(null)

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.newPass !== form.confirm) { setMsg({ type:'err', text:'New passwords do not match' }); return }
    if (form.newPass.length < 8) { setMsg({ type:'err', text:'Password must be at least 8 characters' }); return }
    if (!/\d/.test(form.newPass)) { setMsg({ type:'err', text:'Password must contain at least one number' }); return }

    setLoading(true); setMsg(null)
    const res  = await fetch('/api/profile/password', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ current: form.current, newPass: form.newPass }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) setMsg({ type:'err', text: data.error })
    else { setMsg({ type:'ok', text:'Password updated successfully!' }); setForm({ current:'', newPass:'', confirm:'' }) }
  }

  if (!user?.email) return (
    <div style={S.card}>
      <div style={S.title}>SECURITY</div>
      <p style={{ color:'var(--t2)', fontSize:13 }}>Password management is only available for accounts created with email.</p>
    </div>
  )

  return (
    <div>
      <h2 style={{ fontSize:24, marginBottom:24, fontFamily:'Rajdhani,sans-serif' }}>Security</h2>
      <div style={S.card}>
        <div style={S.title}>CHANGE PASSWORD</div>
        {msg && <div style={msg.type === 'ok' ? S.ok : S.err}>{msg.text}</div>}
        <form onSubmit={handleSubmit}>
          <div style={S.field}>
            <label style={S.label}>Current Password</label>
            <input type="password" value={form.current} onChange={e => set('current', e.target.value)}
              style={S.input} required
              onFocus={e => (e.target.style.borderColor = 'var(--orange)')}
              onBlur={e  => (e.target.style.borderColor = 'var(--bg-border)')}
            />
          </div>
          <div style={S.field}>
            <label style={S.label}>New Password</label>
            <input type="password" value={form.newPass} onChange={e => set('newPass', e.target.value)}
              style={S.input} placeholder="Min 8 chars, at least 1 number" required
              onFocus={e => (e.target.style.borderColor = 'var(--orange)')}
              onBlur={e  => (e.target.style.borderColor = 'var(--bg-border)')}
            />
          </div>
          <div style={S.field}>
            <label style={S.label}>Confirm New Password</label>
            <input type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)}
              style={S.input} required
              onFocus={e => (e.target.style.borderColor = 'var(--orange)')}
              onBlur={e  => (e.target.style.borderColor = 'var(--bg-border)')}
            />
          </div>
          <button type="submit" disabled={loading} style={{ ...S.btn, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
