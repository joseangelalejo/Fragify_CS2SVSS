import type { Metadata } from 'next'
import './globals.css'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title:       { default: 'Fragify — CS2 Stats', template: '%s | Fragify' },
  description: 'Track your CS2 stats in Competitive and Premier matchmaking.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ minHeight:'100vh', display:'flex', flexDirection:'column',
                     margin:0, padding:0 }}>
        <Navbar />
        <main style={{ flex:1, maxWidth:1400, width:'100%', margin:'0 auto',
                       padding:'24px 16px' }}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
