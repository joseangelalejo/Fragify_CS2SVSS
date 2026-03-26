// src/components/layout/Navbar.tsx
import Link from 'next/link'

const links = [
  { href: '/ranking', label: 'Ranking' },
  { href: '/player',  label: 'Jugadores' },
  { href: '/matches', label: 'Partidas' },
]

export function Navbar() {
  return (
    <header className="border-b border-surface-700 bg-surface-900/80 backdrop-blur sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-7xl">
        <nav className="flex items-center h-14 gap-8">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold text-zinc-100 shrink-0">
            Frag<span className="text-brand-500">ify</span>
          </Link>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Badge CS2 */}
          <span className="text-xs text-zinc-600 font-mono hidden sm:block">
            CS2-SVSS v2.0
          </span>
        </nav>
      </div>
    </header>
  )
}
