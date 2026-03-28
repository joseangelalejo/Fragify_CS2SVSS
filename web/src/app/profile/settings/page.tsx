'use client'
import { useState, useRef } from 'react'
import { useSession } from 'next-auth/react'

const S = {
  card:  { background:'var(--bg-card)', border:'1px solid var(--bg-border)', borderRadius:12, padding:24, marginBottom:20 },
  title: { fontSize:12, fontWeight:600, letterSpacing:'0.08em', color:'var(--t3)', marginBottom:20 },
  label: { fontSize:12, fontWeight:500, color:'var(--t2)', display:'block', marginBottom:6 },
  input: { width:'100%', background:'#0d0e13', border:'1px solid var(--bg-border)', borderRadius:6, padding:'10px 12px', fontSize:13, color:'var(--t1)', outline:'none', boxSizing:'border-box' as const },
  btn:   { background:'var(--orange)', color:'#fff', fontWeight:700, fontSize:13, padding:'9px 20px', borderRadius:8, border:'none', cursor:'pointer' },
  err:   { background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:6, padding:'10px 12px', fontSize:13, color:'#ef4444', marginBottom:12 },
  ok:    { background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', borderRadius:6, padding:'10px 12px', fontSize:13, color:'#22c55e', marginBottom:12 },
}

export default function SettingsPage() {
  const { data: session, update } = useSession()
  const user = session?.user as any

  const fileRef        = useRef<HTMLInputElement>(null)
  const [preview, setPreview]     = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg]             = useState<{ type:'ok'|'err', text:string } | null>(null)

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { setMsg({ type:'err', text:'File too large (max 5MB)' }); return }
    setPreview(URL.createObjectURL(f))
  }

  async function uploadAvatar() {
    const f = fileRef.current?.files?.[0]
    if (!f) return
    setUploading(true); setMsg(null)
    const fd = new FormData(); fd.append('avatar', f)
    const res  = await fetch('/api/profile/avatar', { method:'POST', body:fd })
    const data = await res.json()
    setUploading(false)
    if (!res.ok) { setMsg({ type:'err', text:data.error }); return }
    setMsg({ type:'ok', text:'Avatar updated!' })
    await update({ image: data.url })
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function removeAvatar() {
    setUploading(true); setMsg(null)
    const res = await fetch('/api/profile/avatar', { method:'DELETE' })
    setUploading(false)
    if (res.ok) { setMsg({ type:'ok', text:'Avatar removed.' }); await update({ image: null }) }
  }

  const currentAvatar = preview ?? user?.image

  return (
    <div>
      <h2 style={{ fontSize:24, marginBottom:24, fontFamily:'Rajdhani,sans-serif' }}>Settings</h2>

      {/* Avatar */}
      <div style={S.card}>
        <div style={S.title}>PROFILE PICTURE</div>
        {msg && <div style={msg.type === 'ok' ? S.ok : S.err}>{msg.text}</div>}

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

      {/* Account info (read-only for now) */}
      <div style={S.card}>
        <div style={S.title}>ACCOUNT</div>
        <div style={{ display:'grid', gap:16 }}>
          <div>
            <label style={S.label}>Username</label>
            <input value={user?.name ?? ''} readOnly style={{ ...S.input, opacity:0.6, cursor:'not-allowed' }} />
          </div>
          <div>
            <label style={S.label}>Email</label>
            <input value={user?.email ?? ''} readOnly style={{ ...S.input, opacity:0.6, cursor:'not-allowed' }} />
          </div>
        </div>
        <p style={{ color:'var(--t3)', fontSize:12, marginTop:12 }}>Username and email changes coming soon.</p>
      </div>
    </div>
  )
}
