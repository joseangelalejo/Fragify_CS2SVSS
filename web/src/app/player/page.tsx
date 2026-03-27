'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'

const EXAMPLES = [
  'STEAM_0:0:404014',
  '[U:1:808028]',
  '76561197961073756',
  'http://steamcommunity.com/profiles/76561197961073756/',
  'http://steamcommunity.com/id/vanityname',
  'https://s.team/p/rhghr/?????',
  'vanityname',
]

function FindPlayerInner() {
  const router  = useRouter()
  const params  = useSearchParams()
  const invalid = params.get('invalid') === '1'
  const [input,   setInput]   = useState(params.get('q') ?? '')
  const [loading, setLoading] = useState(false)

  async function resolveVanity(vanity: string): Promise<string | null> {
    try {
      const res  = await fetch(`/api/steam/resolve?vanity=${encodeURIComponent(vanity)}`)
      const data = await res.json()
      return data.steam_id ?? null
    } catch { return null }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = input.trim()
    if (!q) return

    setLoading(true)

    // 1 — ID64 directo
    const id64direct = q.match(/(\d{17})/)?.[0]
    if (id64direct) {
      router.push(`/player/${id64direct}`)
      return
    }

    // 2 — URL de Steam (profiles/ID64 o /id/vanity)
    const profileMatch = q.match(/profiles\/(\d{17})/)
    if (profileMatch) {
      router.push(`/player/${profileMatch[1]}`)
      return
    }

    const vanityMatch = q.match(/steamcommunity\.com\/id\/([^\/\?]+)/)
    if (vanityMatch) {
      const resolved = await resolveVanity(vanityMatch[1])
      if (resolved) { router.push(`/player/${resolved}`); return }
    }

    // 3 — s.team/p/ short URL → intentar resolver
    const steamShort = q.match(/s\.team\/p\/([^\/\?]+)/)
    if (steamShort) {
      const resolved = await resolveVanity(steamShort[1])
      if (resolved) { router.push(`/player/${resolved}`); return }
    }

    // 4 — Tratar como vanity URL directa
    const vanityClean = q.replace(/^https?:\/\//, '').replace(/\/$/, '').split('/').pop() ?? q
    const resolved = await resolveVanity(vanityClean)
    if (resolved) {
      router.push(`/player/${resolved}`)
      return
    }

    setLoading(false)
    router.push(`/player?q=${encodeURIComponent(q)}&invalid=1`)
  }

  return (
    <div style={{ maxWidth:860, margin:'0 auto', paddingTop:32 }}>
      <h1 style={{ fontSize:28, marginBottom:4 }}>Find Player</h1>
      <p style={{ color:'var(--t2)', marginBottom:24, fontSize:13 }}>
        Steam ID must be entered in one of the formats listed below
      </p>

      {invalid && (
        <div style={{ background:'#2d0f0f', border:'1px solid #7f1d1d', borderRadius:6,
                      padding:'10px 14px', marginBottom:20, fontSize:13, color:'#fca5a5',
                      display:'flex', alignItems:'center', gap:8 }}>
          ⚠ Invalid Steam Id, please try again
        </div>
      )}

      <form onSubmit={handleSearch}
            style={{ display:'flex', gap:8, marginBottom:32 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Steam ID64, profile URL, or vanity name"
          style={{ flex:1, background:'#0d0e13', border:'1px solid var(--orange)',
                   borderRadius:6, padding:'10px 14px', fontSize:13, color:'var(--t1)',
                   outline:'none' }}
        />
        <button type="submit" disabled={loading}
                style={{ background:'var(--orange)', color:'#fff', fontWeight:700,
                         fontSize:13, padding:'10px 20px', borderRadius:6,
                         border:'none', cursor:'pointer', whiteSpace:'nowrap',
                         opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {/* Examples */}
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--bg-border)',
                      borderRadius:8, padding:20 }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>Examples</div>
          <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex',
                       flexDirection:'column', gap:6 }}>
            {EXAMPLES.map(ex => (
              <li key={ex}>
                <button onClick={() => { setInput(ex) }}
                        style={{ background:'none', border:'none', cursor:'pointer',
                                 color:'var(--t2)', fontSize:12, textAlign:'left',
                                 padding:0 }}>
                  • {ex}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* How to find */}
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--bg-border)',
                      borderRadius:8, padding:20 }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>
            How to find your Steam ID
          </div>
          <ol style={{ paddingLeft:16, margin:0, display:'flex',
                       flexDirection:'column', gap:8, fontSize:12, color:'var(--t2)' }}>
            <li>Go to your Steam profile page</li>
            <li>The numbers in the URL are your Steam ID64</li>
            <li>Example: steamcommunity.com/<br/>
                profiles/<span style={{ color:'var(--orange)' }}>76561199630051475</span>
            </li>
          </ol>
          <div style={{ marginTop:12, background:'#0d0e13', borderRadius:6,
                        padding:'8px 12px', fontSize:11, color:'var(--t3)',
                        wordBreak:'break-all' }}>
            https://steamcommunity.com/profiles/
            <span style={{ color:'var(--orange)' }}>76561199630051475</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FindPlayerPage() {
  return (
    <Suspense>
      <FindPlayerInner />
    </Suspense>
  )
}
