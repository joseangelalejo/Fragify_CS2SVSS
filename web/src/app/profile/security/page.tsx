'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

const S = {
  card:  { background:'var(--bg-card)', border:'1px solid var(--bg-border)', borderRadius:12, padding:24, marginBottom:20 },
  title: { fontSize:12, fontWeight:600, letterSpacing:'0.08em', color:'var(--t3)', marginBottom:20 },
  label: { fontSize:12, fontWeight:500, color:'var(--t2)', display:'block', marginBottom:6 },
  input: { width:'100%', background:'#0d0e13', border:'1px solid var(--bg-border)', borderRadius:6, padding:'10px 12px', fontSize:13, color:'var(--t1)', outline:'none', boxSizing:'border-box' as const },
  btn:   { background:'var(--orange)', color:'#fff', fontWeight:700, fontSize:13, padding:'9px 20px', borderRadius:8, border:'none', cursor:'pointer' },
  err:   { background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:6, padding:'10px 12px', fontSize:13, color:'#ef4444', marginBottom:12 },
  ok:    { background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', borderRadius:6, padding:'10px 12px', fontSize:13, color:'#22c55e', marginBottom:12 },
  info:  { background:'rgba(129,140,248,0.08)', border:'1px solid rgba(129,140,248,0.2)', borderRadius:6, padding:'10px 14px', fontSize:12, color:'#818cf8', marginBottom:16, lineHeight:1.6 },
  field: { marginBottom:16 },
}

type AccountInfo = {
  hasPassword: boolean
  hasSteam: boolean
  hasEmail: boolean
}

export default function SecurityPage() {
  const { data: session } = useSession()
  const user = session?.user as any

  const [acct,    setAcct]    = useState<AccountInfo | null>(null)
  const [loading, setLoading] = useState(true)

  // Formulario cambio/set password
  const [form, setForm]       = useState({ current: '', newPass: '', confirm: '' })
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState<{ type:'ok'|'err', text:string } | null>(null)

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  // Cargar info de cuenta desde BD (no depender del JWT)
  useEffect(() => {
    fetch('/api/profile/password')
      .then(r => r.json())
      .then(d => { setAcct(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.newPass !== form.confirm) { setMsg({ type:'err', text:'New passwords do not match' }); return }
    if (form.newPass.length < 8)       { setMsg({ type:'err', text:'Password must be at least 8 characters' }); return }
    if (!/\d/.test(form.newPass))      { setMsg({ type:'err', text:'Password must contain at least one number' }); return }

    setSaving(true); setMsg(null)
    const body: any = { newPass: form.newPass }
    if (acct?.hasPassword) body.current = form.current  // solo si ya tiene password

    const res  = await fetch('/api/profile/password', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      setMsg({ type:'err', text: data.error })
    } else {
      setMsg({ type:'ok', text: acct?.hasPassword ? 'Password updated successfully!' : 'Password set successfully! You can now log in with email + password.' })
      setForm({ current: '', newPass: '', confirm: '' })
      setAcct(prev => prev ? { ...prev, hasPassword: true } : prev)
    }
  }

  if (loading) {
    return (
      <div style={S.card}>
        <div style={S.title}>SECURITY</div>
        <div style={{ color:'var(--t3)', fontSize:13 }}>Loading...</div>
      </div>
    )
  }

  // Cuenta sin email y sin Steam verificado — no puede hacer nada
  if (!acct?.hasSteam && !acct?.hasEmail) {
    return (
      <div style={S.card}>
        <div style={S.title}>SECURITY</div>
        <p style={{ color:'var(--t2)', fontSize:13 }}>
          Password management is only available for accounts with a verified email address.
        </p>
      </div>
    )
  }

  const isSettingFirst = !acct?.hasPassword

  return (
    <div>
      <h2 style={{ fontSize:24, marginBottom:24, fontFamily:'Rajdhani,sans-serif' }}>Security</h2>

      <div style={S.card}>
        <div style={S.title}>{isSettingFirst ? 'SET PASSWORD' : 'CHANGE PASSWORD'}</div>

        {/* Aviso para cuentas Steam que establecen password por primera vez */}
        {isSettingFirst && acct?.hasSteam && (
          <div style={S.info}>
            🔐 Tu cuenta usa Steam para iniciar sesión. Puedes establecer una contraseña para poder acceder también con tu email <strong>{user?.email ?? ''}</strong>.
          </div>
        )}

        {msg && <div style={msg.type === 'ok' ? S.ok : S.err}>{msg.text}</div>}

        <form onSubmit={handleSubmit}>
          {/* Solo pedir contraseña actual si ya tiene una */}
          {acct?.hasPassword && (
            <div style={S.field}>
              <label style={S.label}>Current Password</label>
              <input type="password" value={form.current} onChange={e => set('current', e.target.value)}
                style={S.input} required
                onFocus={e => (e.target.style.borderColor = 'var(--orange)')}
                onBlur={e  => (e.target.style.borderColor = 'var(--bg-border)')}
              />
            </div>
          )}

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

          <button type="submit" disabled={saving} style={{ ...S.btn, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : isSettingFirst ? 'Set Password' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
