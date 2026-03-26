// src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: {
    default: 'Fragify — CS2 Stats',
    template: '%s | Fragify',
  },
  description: 'Plataforma de estadísticas para Counter-Strike 2',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
