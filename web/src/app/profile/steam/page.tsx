'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

const NEXTAUTH_URL = 'https://fragify.miniserver.online'

const S = {
  card:  { background:'var(--bg-card)', border:'1px solid var(--bg-border)', borderRadius:12, padding:24, marginBottom:20 },
  title: { fontSize:12, fontWeight:600, letterSpacing:'0.08em', color:'var(--t3)', marginBottom:20 },
  label: { fontSize:12, fontWeight:500, color:'var(--t2)', display:'block', marginBottom:6 },
  input: { width:'100%', background:'#0d0e13', border:'1px solid var(--bg-border)', borderRadius:6, padding:'10px 12px', fontSize:13, color:'var(--t1)', outline:'none', boxSizing:'border-box' as const },
  btn:   { background:'var(--orange)', color:'#fff', fontWeight:700, fontSize:13, padding:'9px 20px', borderRadius:8, border:'none', cursor:'pointer' },
  err:   { background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:6, padding:'10px 12px', fontSize:13, color:'#ef4444', marginBottom:12 },
  ok:    { background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', borderRadius:6, padding:'10px 12px', fontSize:13, color:'#22c55e', marginBottom:12 },
  hint:  { color:'var(--t3)', fontSize:12, marginTop:8, lineHeight:1.6 },
}

function buildSteamOpenIDUrl() {
  const params = new URLSearchParams({
    'openid.ns':         'http://specs.openid.net/auth/2.0',
    'openid.mode':       'checkid_setup',
    'openid.return_to':  `${NEXTAUTH_URL}/api/auth/steam/callback`,
    'openid.realm':      NEXTAUTH_URL,
    'openid.identity':   'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  })
  return `https://steamcommunity.com/openid/login?${params.toString()}`
}

export default function SteamPage() {
  const { data: session } = useSession()
  const user = session?.user as any

  const [steamData, setSteamData] = useState<any>(null)
  const [loading,   setLoading]   = useState(true)
  const [codes,     setCodes]     = useState({ cs2: '', csgo: '' })
  const [saving,    setSaving]    = useState(false)
  const [msg,       setMsg]       = useState<{ type:'ok'|'err', text:string } | null>(null)

  useEffect(() => {
    fetch('/api/profile/steam')
      .then(r => r.json())
      .then(d => {
        setSteamData(d)
        setCodes({ cs2: d.sharecode_cs2 ?? '', csgo: d.sharecode_csgo ?? '' })
      })
      .finally(() => setLoading(false))
  }, [])

  async function saveCodes() {
    setSaving(true); setMsg(null)
    const res = await fetch('/api/profile/steam', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ sharecode_cs2: codes.cs2 || null, sharecode_csgo: codes.csgo || null }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) setMsg({ type:'err', text: data.error })
    else setMsg({ type:'ok', text:'Sharecodes saved!' })
  }

  function handleLinkSteam() {
    window.location.href = buildSteamOpenIDUrl()
  }

  // Determinar si Steam está vinculado leyendo de BD (no de sesión, que puede estar desactualizada)
  const isLinked = loading
    ? !!user?.steamId  // fallback a sesión mientras carga
    : (steamData?.steam_linked === 1 || !!steamData?.steam_id64)

  return (
    <div>
      <h2 style={{ fontSize:24, marginBottom:24, fontFamily:'Rajdhani,sans-serif' }}>Steam & CS2</h2>

      {/* Steam Link */}
      <div style={S.card}>
        <div style={S.title}>STEAM ACCOUNT</div>
        {loading ? (
          <div style={{ color:'var(--t3)', fontSize:13 }}>Loading...</div>
        ) : isLinked ? (
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:'#22c55e' }} />
              <span style={{ fontSize:13, color:'var(--t1)', fontWeight:500 }}>Steam account linked</span>
            </div>
            <div style={{ fontSize:13, color:'var(--t2)', marginBottom:8 }}>
              Steam ID: <span style={{ color:'var(--t1)', fontFamily:'monospace' }}>{steamData?.steam_id64 ?? user?.steamId}</span>
            </div>
            {(steamData?.avatar_url || user?.image) && (
              <img src={steamData?.avatar_url ?? user?.image} alt="steam avatar"
                style={{ width:48, height:48, borderRadius:'50%', border:'2px solid var(--bg-border)', marginBottom:12 }} />
            )}
            <p style={S.hint}>Your profile avatar is synced from Steam. To use a custom avatar, unlink your Steam account from Settings.</p>
          </div>
        ) : (
          <div>
            <p style={{ color:'var(--t2)', fontSize:13, marginBottom:16 }}>
              Link your Steam account to view your CS2 stats and use your Steam avatar.
            </p>
            <button onClick={handleLinkSteam}
              style={{ ...S.btn, background:'#1b2838', border:'1px solid #2a475e', color:'#c6d4df',
                       display:'flex', alignItems:'center', gap:10 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#c6d4df">
                <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.718L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0z"/>
              </svg>
              Link Steam Account
            </button>
          </div>
        )}
      </div>

      {/* Sharecodes */}
      <div style={S.card}>
        <div style={S.title}>MATCH HISTORY SHARECODES</div>
        {msg && <div style={msg.type === 'ok' ? S.ok : S.err}>{msg.text}</div>}

        <p style={{ color:'var(--t2)', fontSize:13, marginBottom:20, lineHeight:1.6 }}>
          To import your match history, provide your CS2 or CS:GO sharecode.
          Find it in-game: <strong style={{ color:'var(--t1)' }}>CS2 → Your matches → Share → Copy sharecode</strong>
        </p>

        <div style={{ display:'grid', gap:16 }}>
          <div>
            <label style={S.label}>CS2 Sharecode</label>
            <input value={codes.cs2} onChange={e => setCodes(c => ({ ...c, cs2: e.target.value }))}
              style={S.input} placeholder="CSGO-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
              onFocus={e => (e.target.style.borderColor = 'var(--orange)')}
              onBlur={e  => (e.target.style.borderColor = 'var(--bg-border)')}
            />
          </div>
          <div>
            <label style={S.label}>CS:GO Sharecode <span style={{ color:'var(--t3)' }}>(optional)</span></label>
            <input value={codes.csgo} onChange={e => setCodes(c => ({ ...c, csgo: e.target.value }))}
              style={S.input} placeholder="CSGO-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
              onFocus={e => (e.target.style.borderColor = 'var(--orange)')}
              onBlur={e  => (e.target.style.borderColor = 'var(--bg-border)')}
            />
          </div>
        </div>

        <button onClick={saveCodes} disabled={saving} style={{ ...S.btn, marginTop:16, opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving...' : 'Save Sharecodes'}
        </button>

        <p style={S.hint}>
          Sharecodes allow Fragify to access your recent match history. Your code is private and only used to fetch your matches.
        </p>
      </div>
    </div>
  )
}
