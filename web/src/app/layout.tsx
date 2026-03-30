import type { Metadata } from 'next'
import './globals.css'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Providers } from '@/components/auth/Providers'
import { SupportButton } from '@/components/ui/SupportButton'
import { Analytics } from '@vercel/analytics/next'

export const metadata: Metadata = {
  title:       { default: 'Fragify — CS2 Stats', template: '%s | Fragify' },
  description: 'Track your CS2 stats in Competitive and Premier matchmaking. Search any player by Steam ID.',
  keywords:    ['CS2', 'Counter-Strike 2', 'stats', 'competitive', 'premier', 'leaderboards'],
  openGraph: {
    title:       'Fragify — CS2 Stats',
    description: 'Track your CS2 stats in Competitive and Premier matchmaking.',
    siteName:    'Fragify',
    locale:      'en_US',
    type:        'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ minHeight:'100vh', display:'flex', flexDirection:'column', margin:0, padding:0 }}>
        <Providers>
          <Navbar />
          <main style={{ flex:1, maxWidth:1400, width:'100%', margin:'0 auto', padding:'24px 16px' }}>
            {children}
          </main>
          <Footer />
          <SupportButton />
          <Analytics />
        </Providers>
      </body>
    </html>
  )
}
