// src/app/page.tsx
import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center gap-8">
      {/* Hero */}
      <div className="flex flex-col items-center gap-4">
        <span className="text-brand-500 text-sm font-mono tracking-widest uppercase">
          CS2 Stats Visualizing System
        </span>
        <h1 className="text-5xl font-bold text-zinc-100">
          Frag<span className="text-brand-500">ify</span>
        </h1>
        <p className="text-zinc-400 max-w-md text-lg">
          Consulta tus estadísticas de Counter-Strike 2, evolución de ELO
          y partidas recientes en tiempo real.
        </p>
      </div>

      {/* CTA */}
      <div className="flex gap-4 flex-wrap justify-center">
        <Link
          href="/ranking"
          className="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          Ver Ranking PREMIER
        </Link>
        <Link
          href="/player"
          className="bg-surface-700 hover:bg-surface-600 text-zinc-100 font-semibold px-6 py-3 rounded-lg border border-surface-500 transition-colors"
        >
          Buscar jugador
        </Link>
      </div>

      {/* Stats resumen (placeholder) */}
      <div className="grid grid-cols-3 gap-6 mt-8 w-full max-w-lg">
        {[
          { label: 'Jugadores', value: '—' },
          { label: 'Partidas', value: '—' },
          { label: 'Reportes', value: '—' },
        ].map((s) => (
          <div key={s.label} className="card text-center">
            <p className="text-2xl font-bold text-brand-500">{s.value}</p>
            <p className="text-xs text-zinc-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
