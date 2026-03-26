// src/app/player/page.tsx
// Página de búsqueda — redirige al perfil del jugador por Steam ID64
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PlayerSearchPage() {
  const [input, setInput] = useState('')
  const [error, setError]  = useState('')
  const router = useRouter()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const id = input.trim()
    if (!/^\d{17}$/.test(id)) {
      setError('El Steam ID64 debe tener exactamente 17 dígitos numéricos.')
      return
    }
    setError('')
    router.push(`/player/${id}`)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Buscar jugador</h1>
        <p className="text-zinc-400 mt-2">
          Introduce tu Steam ID64 para ver tus estadísticas
        </p>
        <p className="text-zinc-500 text-sm mt-1">
          Puedes encontrarlo en{' '}
          <a
            href="https://www.steamidfinder.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-500 hover:underline"
          >
            steamidfinder.com
          </a>
        </p>
      </div>

      <form onSubmit={handleSearch} className="w-full max-w-md flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="76561198012345678"
          className="flex-1 bg-surface-700 border border-surface-500 rounded-lg px-4 py-3
                     text-zinc-100 placeholder-zinc-600 font-mono
                     focus:outline-none focus:border-brand-500 transition-colors"
          maxLength={17}
        />
        <button
          type="submit"
          className="bg-brand-500 hover:bg-brand-600 text-white font-semibold
                     px-5 py-3 rounded-lg transition-colors"
        >
          Buscar
        </button>
      </form>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}
    </div>
  )
}
