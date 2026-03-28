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

function SharecodeDiagram() {
  return (
    <div style={{ background:'#0a0c10', border:'1px solid var(--bg-border)', borderRadius:8, padding:16, marginTop:16 }}>
      <svg viewBox="0 0 480 140" style={{ width:'100%', maxWidth:480, display:'block', margin:'0 auto' }}>
        <rect width="480" height="140" fill="#0d0e13" rx="4"/>
        <rect width="480" height="28" fill="#111318"/>
        <rect x="180" width="120" height="28" fill="#1a1d27"/>
        <text x="240" y="18" textAnchor="middle" fill="#e5e7eb" fontSize="13" fontWeight="bold">16  —  10</text>
        <text x="90"  y="18" textAnchor="middle" fill="#60a5fa" fontSize="10">CT SIDE</text>
        <text x="390" y="18" textAnchor="middle" fill="#f97316" fontSize="10">T SIDE</text>
        <line x1="0" y1="28" x2="480" y2="28" stroke="#1e2130" strokeWidth="1"/>
        {[0,1,2,3,4].map(i => (
          <g key={i}>
            <rect x="0" y={32+i*20} width="480" height="20" fill={i%2===0?'#111318':'#0d0e13'}/>
            <rect x="8"  y={36+i*20} width="14" height="12" rx="2" fill="#1e2130"/>
            <rect x="28" y={39+i*20} width={55+i*8} height="7" rx="2" fill="#374151"/>
            <rect x="320" y={39+i*20} width="18" height="7" rx="2" fill="#374151"/>
            <rect x="348" y={39+i*20} width="18" height="7" rx="2" fill="#374151"/>
            <rect x="376" y={39+i*20} width="18" height="7" rx="2" fill="#374151"/>
          </g>
        ))}
        <rect x="288" y="108" width="80" height="24" rx="4" fill="#22c55e"/>
        <text x="328" y="124" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">DOWNLOAD</text>
        <rect x="375" y="105" width="34" height="30" rx="5" fill="none" stroke="#f97316" strokeWidth="2" opacity="0.7"/>
        <rect x="377" y="107" width="30" height="26" rx="4" fill="#f97316"/>
        <circle cx="383" cy="120" r="2.5" fill="white"/>
        <circle cx="391" cy="115" r="2.5" fill="white"/>
        <circle cx="391" cy="125" r="2.5" fill="white"/>
        <line x1="385.5" y1="118.5" x2="389" y2="116" stroke="white" strokeWidth="1.5"/>
        <line x1="385.5" y1="121.5" x2="389" y2="124" stroke="white" strokeWidth="1.5"/>
        <rect x="411" y="108" width="28" height="24" rx="4" fill="#1e2130"/>
        <text x="425" y="124" textAnchor="middle" fill="#6b7280" fontSize="12">🗑</text>
        <rect x="295" y="88" width="160" height="16" rx="3" fill="#f97316"/>
        <text x="375" y="100" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">Copy match sharing code</text>
        <polygon points="390,104 396,104 393,108" fill="#f97316"/>
      </svg>
      <p style={{ fontSize:11, color:'var(--t3)', marginTop:10, textAlign:'center' }}>
        Click the <span style={{ color:'var(--orange)', fontWeight:700 }}>share icon</span> (highlighted) next to DOWNLOAD to copy your sharecode
      </p>
    </div>
  )
}

function HowToSection() {
  const steps = [
    { n:1, text:'Open CS2 and go to your match history' },
    { n:2, text:'Click "Watch" on any recent match' },
    { n:3, text:'Select "Your Matches" at the top and pick a match' },
    { n:4, text:'Click the share icon next to DOWNLOAD — it copies the code to your clipboard' },
  ]
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontSize:13, fontWeight:600, color:'var(--t2)', marginBottom:12 }}>
        How to get your sharecode
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {steps.map(s => (
          <div key={s.n} style={{ display:'flex', alignItems:'flex-start', gap:10,
                                   background:'#0d0e13', borderRadius:8, padding:'10px 12px' }}>
            <div style={{ width:22, height:22, borderRadius:'50%', flexShrink:0,
                          background:'rgba(249,115,22,0.15)', border:'1px solid rgba(249,115,22,0.4)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:11, fontWeight:700, color:'var(--orange)' }}>
              {s.n}
            </div>
            <span style={{ fontSize:12, color:'var(--t2)', lineHeight:1.5, paddingTop:2 }}>{s.text}</span>
          </div>
        ))}
      </div>
      <SharecodeDiagram />
      <div style={{ marginTop:12, padding:'10px 14px',
                    background:'rgba(34,197,94,0.06)', border:'1px solid rgba(34,197,94,0.2)',
                    borderRadius:8, fontSize:12, color:'#22c55e' }}>
        ✓ Paste the sharecode in the field below and click <strong>Save Sharecodes</strong>
      </div>
    </div>
  )
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
      .then(d => { setSteamData(d); setCodes({ cs2: d.sharecode_cs2 ?? '', csgo: d.sharecode_csgo ?? '' }) })
      .finally(() => setLoading(false))
  }, [])

  async function saveCodes() {
    setSaving(true); setMsg(null)
    const res = await fetch('/api/profile/steam', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sharecode_cs2: codes.cs2 || null, sharecode_csgo: codes.csgo || null }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) setMsg({ type:'err', text: data.error })
    else setMsg({ type:'ok', text:'Sharecodes saved!' })
  }

  const isLinked = loading ? !!user?.steamId : (steamData?.steam_linked === 1 || !!steamData?.steam_id64)

  return (
    <div>
      <h2 style={{ fontSize:24, marginBottom:24, fontFamily:'Rajdhani,sans-serif' }}>Steam & CS2</h2>

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
            <button onClick={() => { window.location.href = buildSteamOpenIDUrl() }}
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

      <div style={S.card}>
        <div style={S.title}>MATCH HISTORY SHARECODES</div>
        {msg && <div style={msg.type === 'ok' ? S.ok : S.err}>{msg.text}</div>}

        <HowToSection />

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
