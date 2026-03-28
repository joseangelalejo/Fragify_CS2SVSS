'use client'
import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'

const S = {
  card:  { background:'var(--bg-card)', border:'1px solid var(--bg-border)', borderRadius:12, padding:24, marginBottom:20 },
  title: { fontSize:12, fontWeight:600, letterSpacing:'0.08em', color:'var(--t3)', marginBottom:20 },
  label: { fontSize:12, fontWeight:500, color:'var(--t2)', display:'block', marginBottom:6 },
  input: { width:'100%', background:'#0d0e13', border:'1px solid var(--bg-border)', borderRadius:6, padding:'10px 12px', fontSize:13, color:'var(--t1)', outline:'none', boxSizing:'border-box' as const },
  btn:   { background:'var(--orange)', color:'#fff', fontWeight:700, fontSize:13, padding:'9px 20px', borderRadius:8, border:'none', cursor:'pointer' },
  err:   { background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:6, padding:'10px 12px', fontSize:13, color:'#ef4444', marginBottom:12 },
  ok:    { background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', borderRadius:6, padding:'10px 12px', fontSize:13, color:'#22c55e', marginBottom:12 },
  hint:  { fontSize:11, color:'var(--t3)', marginTop:6 },
}

export default function SettingsPage() {
  const { data: session, update } = useSession()
  const user = session?.user as any

  // Avatar
  const fileRef                   = useRef<HTMLInputElement>(null)
  const [preview,   setPreview]   = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [avatarMsg, setAvatarMsg] = useState<{ type:'ok'|'err', text:string } | null>(null)

  // Account — se inicializan vacíos y se rellenan desde BD via GET
  const [username,    setUsername]    = useState('')
  const [email,       setEmail]       = useState('')
  const [loadingData, setLoadingData] = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [acctMsg,     setAcctMsg]     = useState<{ type:'ok'|'err', text:string } | null>(null)

  // Carga datos reales desde BD (no depende del JWT, que no tiene el email en cuentas Steam)
  useEffect(() => {
    fetch('/api/profile/settings')
      .then(r => r.json())
      .then(data => {
        if (data.username) setUsername(data.username)
        setEmail(data.email ?? '')
      })
      .catch(() => {
        // fallback a sesión si la API falla
        setUsername(user?.name ?? '')
        setEmail(user?.email ?? '')
      })
      .finally(() => setLoadingData(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { setAvatarMsg({ type:'err', text:'File too large (max 5MB)' }); return }
    setPreview(URL.createObjectURL(f))
  }

  async function uploadAvatar() {
    const f = fileRef.current?.files?.[0]
    if (!f) return
    setUploading(true); setAvatarMsg(null)
    const fd = new FormData(); fd.append('avatar', f)
    const res  = await fetch('/api/profile/avatar', { method:'POST', body:fd })
    const data = await res.json()
    setUploading(false)
    if (!res.ok) { setAvatarMsg({ type:'err', text:data.error }); return }
    setAvatarMsg({ type:'ok', text:'Avatar updated!' })
    await update({ image: data.url })
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function removeAvatar() {
    setUploading(true); setAvatarMsg(null)
    const res = await fetch('/api/profile/avatar', { method:'DELETE' })
    setUploading(false)
    if (res.ok) { setAvatarMsg({ type:'ok', text:'Avatar removed.' }); await update({ image: null }) }
  }

  async function saveAccount(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setAcctMsg(null)
    const body: any = {}
    if (username !== (user?.name ?? '')) body.username = username
    if (email    !== (user?.email ?? '')) body.email   = email

    if (Object.keys(body).length === 0) {
      setSaving(false)
      setAcctMsg({ type:'ok', text:'No changes to save.' })
      return
    }

    const res  = await fetch('/api/profile/settings', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setAcctMsg({ type:'err', text:data.error }); return }
    if (data.emailPending) {
      setAcctMsg({ type:'ok', text:'Username saved! A verification email has been sent to your new address. Please verify it before it becomes active.' })
    } else {
      setAcctMsg({ type:'ok', text:'Account updated!' })
    }
    if (body.username) await update({ name: body.username })
  }

  const currentAvatar = preview ?? user?.image

  return (
    <div>
      <h2 style={{ fontSize:24, marginBottom:24, fontFamily:'Rajdhani,sans-serif' }}>Settings</h2>

      {/* Avatar */}
      <div style={S.card}>
        <div style={S.title}>PROFILE PICTURE</div>
        {avatarMsg && <div style={avatarMsg.type === 'ok' ? S.ok : S.err}>{avatarMsg.text}</div>}

        <div style={{ display:'flex', alignItems:'center', gap:24, flexWrap:'wrap' }}>
          <div style={{ width:80, height:80, borderRadius:'50%', overflow:'hidden', background:'var(--bg-border)', flexShrink:0 }}>
            {currentAvatar
              ? <img src={currentAvatar} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32 }}>👤</div>
            }
          </div>
          <div>
            {user?.steamId
              ? <p style={{ color:'var(--t2)', fontSize:13, margin:'0 0 8px' }}>Your avatar is synced from Steam. Unlink Steam to use a custom image.</p>
              : <>
                  <p style={{ color:'var(--t2)', fontSize:13, margin:'0 0 12px' }}>Upload a JPG, PNG or WebP image. Max 5MB.</p>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <button onClick={() => fileRef.current?.click()}
                      style={{ ...S.btn, background:'var(--bg-hover)', border:'1px solid var(--bg-border)', color:'var(--t1)' }}>
                      Choose image
                    </button>
                    {preview && (
                      <button onClick={uploadAvatar} disabled={uploading} style={{ ...S.btn, opacity: uploading ? 0.7 : 1 }}>
                        {uploading ? 'Uploading...' : 'Save avatar'}
                      </button>
                    )}
                    {user?.image && !preview && (
                      <button onClick={removeAvatar} disabled={uploading}
                        style={{ ...S.btn, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444' }}>
                        Remove
                      </button>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} style={{ display:'none' }} />
                </>
            }
          </div>
        </div>
      </div>

      {/* Account */}
      <div style={S.card}>
        <div style={S.title}>ACCOUNT</div>
        {acctMsg && <div style={acctMsg.type === 'ok' ? S.ok : S.err}>{acctMsg.text}</div>}
        <form onSubmit={saveAccount}>
          <div style={{ marginBottom:16 }}>
            <label style={S.label}>Username</label>
            <input
              value={loadingData ? '' : username}
              onChange={e => setUsername(e.target.value)}
              style={S.input}
              placeholder={loadingData ? 'Loading...' : 'Your username'}
              disabled={loadingData}
              onFocus={e => (e.target.style.borderColor = 'var(--orange)')}
              onBlur={e  => (e.target.style.borderColor = 'var(--bg-border)')}
            />
            <div style={S.hint}>3-20 characters, letters, numbers, _ or -</div>
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={S.label}>Email</label>
            <input
              type="email"
              value={loadingData ? '' : email}
              onChange={e => setEmail(e.target.value)}
              style={S.input}
              placeholder={loadingData ? 'Loading...' : 'your@email.com'}
              disabled={loadingData}
              onFocus={e => (e.target.style.borderColor = 'var(--orange)')}
              onBlur={e  => (e.target.style.borderColor = 'var(--bg-border)')}
            />
            <div style={S.hint}>Used for notifications and account recovery.</div>
          </div>
          <button type="submit" disabled={saving || loadingData} style={{ ...S.btn, opacity: (saving || loadingData) ? 0.7 : 1 }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
