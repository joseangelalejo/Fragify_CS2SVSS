'use client'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'

const NAV_LINKS = [
  { href: '/',        label: 'HOME' },
  { href: '/ranking', label: 'LEADERBOARDS' },
  { href: '/matches', label: 'ALL MATCHES' },
]

export function Navbar() {
  const router   = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()
  const user = session?.user as any

  const [q,           setQ]           = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const [searchOpen,  setSearchOpen]  = useState(false)
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
    setQ(''); setSearchOpen(false)
  }

  return (
    <>
      <header style={{ background:'var(--bg-main)', borderBottom:'1px solid var(--bg-border)', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', height:48, padding:'0 12px', gap:8, maxWidth:1400, margin:'0 auto' }}>
          <Link href="/" style={{ fontFamily:'Rajdhani,sans-serif', fontWeight:700, fontSize:20, color:'var(--t1)', letterSpacing:'0.04em', textDecoration:'none', flexShrink:0 }}>
            FRAG<span style={{ color:'var(--orange)' }}>IFY</span>
          </Link>

          {/* Search desktop */}
          <form onSubmit={handleSearch} style={{ flex:1, position:'relative', maxWidth:600, display:'none' }} className="search-desktop">
            <div style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--t3)', pointerEvents:'none', display:'flex' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <input value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search for a player (Steam ID / Steam Profile Link) or add a match"
              style={{ width:'100%', background:'#0d0e13', border:'1px solid var(--bg-border)', borderRadius:6, padding:'6px 12px 6px 32px', fontSize:12, color:'var(--t1)', outline:'none' }}
              onFocus={e => (e.target.style.borderColor = 'var(--orange)')}
              onBlur={e  => (e.target.style.borderColor = 'var(--bg-border)')}
            />
          </form>

          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
            {/* Search icon mobile */}
            <button onClick={() => setSearchOpen(o => !o)}
              style={{ display:'none', background:'none', border:'none', color:'var(--t2)', cursor:'pointer', padding:6 }}
              className="search-mobile-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </button>

            {session ? (
              <div ref={profileRef} style={{ position:'relative' }}>
                <button onClick={() => setProfileOpen(p => !p)}
                  style={{ display:'flex', alignItems:'center', gap:6, background:'#1a1d27', border:'1px solid var(--bg-border)', borderRadius:6, padding:'4px 8px', cursor:'pointer' }}>
                  <div style={{ width:24, height:24, borderRadius:'50%', overflow:'hidden', background:'var(--bg-border)', flexShrink:0 }}>
                    {user?.image
                      ? <img src={user.image} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      : <span style={{ fontSize:11, color:'var(--t2)', display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>👤</span>
                    }
                  </div>
                  <span style={{ fontSize:12, color:'var(--t1)', maxWidth:80, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} className="username-text">
                    {user?.name ?? 'Account'}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2">
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </button>

                {profileOpen && (
                  <div style={{ position:'absolute', right:0, top:'calc(100% + 6px)', minWidth:180, background:'#1a1d27', border:'1px solid var(--bg-border)', borderRadius:8, boxShadow:'0 8px 24px rgba(0,0,0,0.5)', zIndex:100 }}>
                    {user?.steamId && (
                      <Link href={`/player/${user.steamId}`} onClick={() => setProfileOpen(false)}
                        style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', fontSize:13, color:'var(--t1)', textDecoration:'none' }}>
                        🎮 My CS2 Profile
                      </Link>
                    )}
                    <Link href="/profile" onClick={() => setProfileOpen(false)}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', fontSize:13, color:'var(--t1)', textDecoration:'none' }}>
                      👤 Account Settings
                    </Link>
                    {user?.role === 'ADMIN' && (
                      <Link href="/admin/dashboard" onClick={() => setProfileOpen(false)}
                        style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', fontSize:13, color:'var(--orange)', textDecoration:'none' }}>
                        ⚙️ Admin Panel
                      </Link>
                    )}
                    <div style={{ borderTop:'1px solid var(--bg-border)', margin:'4px 0' }} />
                    <button onClick={() => { setProfileOpen(false); signOut({ callbackUrl: '/' }) }}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', fontSize:13, color:'var(--t2)', width:'100%', background:'none', border:'none', cursor:'pointer' }}>
                      🚪 Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/auth/login" style={{ display:'flex', alignItems:'center', gap:6, background:'var(--orange)', color:'#fff', fontWeight:700, fontSize:12, padding:'5px 14px', borderRadius:6, textDecoration:'none' }}>
                Sign In
              </Link>
            )}
          </div>
        </div>

        {/* Mobile search bar */}
        {searchOpen && (
          <div style={{ padding:'8px 12px', borderTop:'1px solid var(--bg-border)' }}>
            <form onSubmit={handleSearch} style={{ position:'relative' }}>
              <div style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--t3)', pointerEvents:'none' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </div>
              <input value={q} onChange={e => setQ(e.target.value)}
                placeholder="Search player..." autoFocus
                style={{ width:'100%', background:'#0d0e13', border:'1px solid var(--orange)', borderRadius:6, padding:'8px 12px 8px 32px', fontSize:13, color:'var(--t1)', outline:'none', boxSizing:'border-box' }}
              />
            </form>
          </div>
        )}

        <div style={{ borderTop:'1px solid var(--bg-border)', overflowX:'auto' }}>
          <nav style={{ display:'flex', alignItems:'center', padding:'0 12px', maxWidth:1400, margin:'0 auto', minWidth:'max-content' }}>
            {NAV_LINKS.map(l => {
              const active = pathname === l.href || (l.href !== '/' && pathname.startsWith(l.href))
              return (
                <Link key={l.href} href={l.href} style={{
                  padding:'8px 12px', fontSize:12, fontWeight:600, letterSpacing:'0.06em',
                  color: active ? 'var(--t1)' : 'var(--t2)',
                  borderBottom: active ? '2px solid var(--orange)' : '2px solid transparent',
                  display:'block', textDecoration:'none', whiteSpace:'nowrap',
                }}>
                  {l.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      <style>{`
        @media (min-width: 601px) {
          .search-desktop { display: flex !important; }
          .search-mobile-btn { display: none !important; }
          .username-text { display: inline !important; max-width: 100px !important; }
        }
        @media (max-width: 600px) {
          .search-desktop { display: none !important; }
          .search-mobile-btn { display: flex !important; }
          .username-text { display: none !important; }
        }
      `}</style>
    </>
  )
}
