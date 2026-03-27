'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'

function FindPlayerInner() {
  const router = useRouter()
  const params = useSearchParams()
  const invalid = params.get('invalid') === '1'
  const [input, setInput] = useState(params.get('q') ?? '')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = input.trim()
    if (!q) return
    const id64 = q.match(/\d{17}/)?.[0]
    if (id64) {
      router.push(`/player/${id64}`)
    } else {
      router.push(`/player?q=${encodeURIComponent(q)}&invalid=1`)
    }
  }

  return (
    <div style={{ maxWidth:860, margin:'0 auto', paddingTop:32 }}>
      <h1 style={{ fontSize:28, marginBottom:4 }}>Find Player</h1>
      <p style={{ color:'var(--t2)', marginBottom:24, fontSize:13 }}>
        Steam ID must be entered in one of the formats listed below
      </p>

      {/* Error banner */}
      {invalid && (
        <div style={{ background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.4)',
                      borderRadius:6, padding:'12px 16px', marginBottom:24, display:'flex',
                      alignItems:'center', gap:10, color:'#ef4444', fontSize:13 }}>
          <span>⚠</span>
          <span>Invalid Steam Id, please try again</span>
        </div>
      )}

      {/* Search form */}
      <form onSubmit={handleSearch} style={{ display:'flex', gap:8, marginBottom:32 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Enter Steam ID, profile URL or vanity name..."
          style={{
            flex:1, background:'#0d0e13', border:'1px solid var(--bg-border)',
            borderRadius:6, padding:'10px 14px', fontSize:13, color:'var(--t1)', outline:'none'
          }}
          onFocus={e  => (e.target.style.borderColor='var(--orange)')}
          onBlur={e   => (e.target.style.borderColor='var(--bg-border)')}
          autoFocus
        />
        <button type="submit"
                style={{ background:'var(--orange)', color:'#fff', fontWeight:700, fontSize:13,
                         padding:'10px 24px', borderRadius:6, border:'none', cursor:'pointer' }}>
          Search
        </button>
      </form>

      {/* Examples + visual guide */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
        <div className="card" style={{ padding:20 }}>
          <h3 style={{ fontSize:16, marginBottom:14, color:'var(--t1)' }}>Examples</h3>
          <ul style={{ listStyle:'disc', paddingLeft:20, color:'var(--t2)', fontSize:13, lineHeight:2 }}>
            {[
              'STEAM_0:0:404014',
              '[U:1:808028]',
              '76561197961073756',
              'http://steamcommunity.com/profiles/76561197961073756/',
              'http://steamcommunity.com/id/vanityname',
              'https://s.team/p/rhghr/?????',
              'vanityname',
            ].map(ex => (
              <li key={ex}>
                <button onClick={() => setInput(ex)}
                        style={{ background:'none', border:'none', color:'var(--t2)', cursor:'pointer',
                                 fontFamily:'IBM Plex Mono,monospace', fontSize:12, padding:0,
                                 textAlign:'left' }}
                        className="hover:text-white transition-colors">
                  {ex}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="card" style={{ padding:20 }}>
          <h3 style={{ fontSize:16, marginBottom:14, color:'var(--t1)' }}>How to find your Steam ID</h3>
          <ol style={{ paddingLeft:20, color:'var(--t2)', fontSize:13, lineHeight:2 }}>
            <li>Go to your Steam profile page</li>
            <li>The numbers in the URL are your Steam ID64</li>
            <li>Example: steamcommunity.com/profiles/<span style={{ color:'var(--orange)' }}>76561199630051475</span></li>
          </ol>
          <div style={{ marginTop:16, background:'var(--bg-deep)', borderRadius:6, padding:'10px 14px',
                        fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'var(--t2)',
                        wordBreak:'break-all' }}>
            https://steamcommunity.com/profiles/
            <span style={{ color:'var(--orange)', background:'rgba(249,115,22,0.15)',
                           padding:'1px 3px', borderRadius:3 }}>
              76561199630051475
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PlayerPage() {
  return (
    <Suspense>
      <FindPlayerInner />
    </Suspense>
  )
}
