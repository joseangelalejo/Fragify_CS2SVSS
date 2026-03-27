'use client'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { Search, Bell, ChevronDown, User, LogOut, Settings } from 'lucide-react'

const NAV_LINKS = [
  { href: '/',           label: 'HOME' },
  { href: '/ranking',    label: 'LEADERBOARDS' },
  { href: '/matches',    label: 'ALL MATCHES' },
  { href: '/reports',    label: 'REPORTS' },
]

export function Navbar() {
  const router   = useRouter()
  const pathname = usePathname()
  const [query,       setQuery]       = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    // Soporta Steam ID64 directo o URL de steam
    const id64Match = q.match(/\d{17}/)
    if (id64Match) {
      router.push(`/player/${id64Match[0]}`)
    } else {
      router.push(`/player?q=${encodeURIComponent(q)}`)
    }
    setQuery('')
  }

  return (
    <header style={{ background:'var(--bg-main)', borderBottom:'1px solid var(--bg-border)' }}
            className="sticky top-0 z-50">
      {/* Top bar */}
      <div style={{ display:'flex', flexDirection:'row', alignItems:'center', height:48, padding:'0 16px', gap:12, maxWidth:1400, margin:'0 auto', width:'100%' }}>
        {/* Logo */}
        <Link href="/" className="shrink-0 flex items-center gap-1.5 mr-2">
          <span style={{ fontFamily:'Rajdhani,sans-serif', fontWeight:700, fontSize:20, color:'var(--t1)', letterSpacing:'0.04em' }}>
            FRAG<span style={{ color:'var(--orange)' }}>IFY</span>
          </span>
        </Link>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color:'var(--t3)' }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search for a player (Steam ID / Steam Profile Link) or add a match"
              style={{
                width:'100%', background:'#0d0e13', border:'1px solid var(--bg-border)',
                borderRadius:6, padding:'6px 12px 6px 32px', fontSize:12,
                color:'var(--t1)', outline:'none'
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--orange)')}
              onBlur={e  => (e.target.style.borderColor = 'var(--bg-border)')}
            />
          </div>
        </form>

        {/* Right icons */}
        <div style={{ display:'flex', flexDirection:'row', alignItems:'center', gap:8, marginLeft:'auto', flexShrink:0 }}>
          {/* Bell */}
          <button style={{ color:'var(--t2)', background:'#1a1d27', border:'1px solid var(--bg-border)', borderRadius:6, padding:'5px 8px' }}
                  className="hover:text-white transition-colors">
            <Bell size={15} />
          </button>

          {/* Profile dropdown */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setProfileOpen(p => !p)}
              style={{ background:'#1a1d27', border:'1px solid var(--bg-border)', borderRadius:6, padding:'4px 10px' }}
              className="flex items-center gap-2 hover:border-gray-500 transition-colors"
            >
              <div style={{ width:24, height:24, borderRadius:'50%', background:'var(--bg-border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <User size={12} style={{ color:'var(--t2)' }} />
              </div>
              <span style={{ fontSize:12, color:'var(--t1)' }}>Account</span>
              <ChevronDown size={12} style={{ color:'var(--t3)' }} />
            </button>

            {profileOpen && (
              <div style={{
                position:'absolute', right:0, top:'calc(100% + 6px)', minWidth:180,
                background:'#1a1d27', border:'1px solid var(--bg-border)', borderRadius:8,
                boxShadow:'0 8px 24px rgba(0,0,0,0.5)', zIndex:100
              }}>
                <Link href="/player"
                      onClick={() => setProfileOpen(false)}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', fontSize:13, color:'var(--t1)' }}
                      className="hover:bg-[#252836] transition-colors">
                  <User size={13} style={{ color:'var(--t2)' }} /> Your Profile
                </Link>
                <Link href="/settings"
                      onClick={() => setProfileOpen(false)}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', fontSize:13, color:'var(--t1)' }}
                      className="hover:bg-[#252836] transition-colors">
                  <Settings size={13} style={{ color:'var(--t2)' }} /> Settings
                </Link>
                <div style={{ borderTop:'1px solid var(--bg-border)', margin:'4px 0' }} />
                <button style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', fontSize:13, color:'var(--t2)', width:'100%' }}
                        className="hover:bg-[#252836] hover:text-white transition-colors">
                  <LogOut size={13} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nav links */}
      <div style={{ borderTop:'1px solid var(--bg-border)' }}>
        <nav style={{ display:'flex', flexDirection:'row', alignItems:'center', padding:'0 16px', maxWidth:1400, margin:'0 auto' }}>
          {NAV_LINKS.map(l => (
            <Link key={l.href} href={l.href}
                  style={{
                    padding:'8px 14px', fontSize:12, fontWeight:600, letterSpacing:'0.06em',
                    color: pathname === l.href ? 'var(--t1)' : 'var(--t2)',
                    borderBottom: pathname === l.href ? '2px solid var(--orange)' : '2px solid transparent',
                    transition:'color 0.15s',
                    display:'block',
                  }}
                  className="hover:text-white">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}