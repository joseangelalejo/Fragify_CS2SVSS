'use client'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'

const NAV_LINKS = [
  { href: '/',        label: 'HOME' },
  { href: '/ranking', label: 'LEADERBOARDS' },
  { href: '/matches', label: 'ALL MATCHES' },
]

const S = {
  header:     { background:'var(--bg-main)', borderBottom:'1px solid var(--bg-border)', position:'sticky' as const, top:0, zIndex:50 },
  topBar:     { display:'flex', flexDirection:'row' as const, alignItems:'center', height:48, padding:'0 16px', gap:12, maxWidth:1400, margin:'0 auto', width:'100%' },
  logo:       { fontFamily:'Rajdhani,sans-serif', fontWeight:700, fontSize:20, color:'var(--t1)', letterSpacing:'0.04em', textDecoration:'none', flexShrink:0, marginRight:8 },
  searchWrap: { flex:1, position:'relative' as const, maxWidth:600 },
  searchIcon: { position:'absolute' as const, left:10, top:'50%', transform:'translateY(-50%)', color:'var(--t3)', pointerEvents:'none' as const, display:'flex' },
  searchInput:{ width:'100%', background:'#0d0e13', border:'1px solid var(--bg-border)', borderRadius:6, padding:'6px 12px 6px 32px', fontSize:12, color:'var(--t1)', outline:'none', fontFamily:'inherit' },
  rightGroup: { display:'flex', flexDirection:'row' as const, alignItems:'center', gap:8, marginLeft:'auto', flexShrink:0 },
  iconBtn:    { display:'flex', alignItems:'center', justifyContent:'center', color:'var(--t2)', background:'#1a1d27', border:'1px solid var(--bg-border)', borderRadius:6, padding:'5px 8px', cursor:'pointer', fontSize:15 },
  profileBtn: { display:'flex', flexDirection:'row' as const, alignItems:'center', gap:8, background:'#1a1d27', border:'1px solid var(--bg-border)', borderRadius:6, padding:'4px 10px', cursor:'pointer' },
  avatar:     { width:24, height:24, borderRadius:'50%', background:'var(--bg-border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'var(--t2)' },
  dropdown:   { position:'absolute' as const, right:0, top:'calc(100% + 6px)', minWidth:180, background:'#1a1d27', border:'1px solid var(--bg-border)', borderRadius:8, boxShadow:'0 8px 24px rgba(0,0,0,0.5)', zIndex:100 },
  dropItem:   { display:'flex', alignItems:'center', gap:10, padding:'10px 14px', fontSize:13, color:'var(--t1)', textDecoration:'none', width:'100%', background:'none', border:'none', cursor:'pointer' },
  navBar:     { borderTop:'1px solid var(--bg-border)' },
  nav:        { display:'flex', flexDirection:'row' as const, alignItems:'center', padding:'0 16px', maxWidth:1400, margin:'0 auto' },
}

export function Navbar() {
  const router   = useRouter()
  const pathname = usePathname()
  const [q,           setQ]           = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setProfileOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const val = q.trim()
    if (!val) return
    const id64 = val.match(/\d{17}/)?.[0]
    router.push(id64 ? `/player/${id64}` : `/player?q=${encodeURIComponent(val)}`)
    setQ('')
  }

  return (
    <header style={S.header}>
      <div style={S.topBar}>
        <Link href="/" style={S.logo}>
          FRAG<span style={{ color:'var(--orange)' }}>IFY</span>
        </Link>

        <form onSubmit={handleSearch} style={S.searchWrap}>
          <div style={S.searchIcon}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search for a player (Steam ID / Steam Profile Link) or add a match"
            style={S.searchInput}
            onFocus={e => (e.target.style.borderColor = 'var(--orange)')}
            onBlur={e  => (e.target.style.borderColor = 'var(--bg-border)')}
          />
        </form>

        <div style={S.rightGroup}>
          <button style={S.iconBtn}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </button>

          <div ref={profileRef} style={{ position:'relative' }}>
            <button onClick={() => setProfileOpen(p => !p)} style={S.profileBtn}>
              <div style={S.avatar}>👤</div>
              <span style={{ fontSize:12, color:'var(--t1)' }}>Account</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>

            {profileOpen && (
              <div style={S.dropdown}>
                <Link href="/player" onClick={() => setProfileOpen(false)} style={S.dropItem}>
                  👤 Your Profile
                </Link>
                <div style={{ borderTop:'1px solid var(--bg-border)', margin:'4px 0' }} />
                <button style={{ ...S.dropItem, color:'var(--t2)' }}>
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={S.navBar}>
        <nav style={S.nav}>
          {NAV_LINKS.map(l => {
            const active = pathname === l.href || (l.href !== '/' && pathname.startsWith(l.href))
            return (
              <Link key={l.href} href={l.href} style={{
                padding:'8px 14px', fontSize:12, fontWeight:600, letterSpacing:'0.06em',
                color: active ? 'var(--t1)' : 'var(--t2)',
                borderBottom: active ? '2px solid var(--orange)' : '2px solid transparent',
                transition:'color 0.15s', display:'block', textDecoration:'none',
              }}>
                {l.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
