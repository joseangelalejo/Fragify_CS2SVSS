import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Necesario para el Dockerfile standalone (producción en homelab)
  output: 'standalone',

  // IPs permitidas para hot-reload en desarrollo
  allowedDevOrigins: ['192.168.24.235', '192.168.24.103'],

  // En Vercel: /api/* se reescribe al backend del homelab
  // En dev local (homelab con npm run dev): sin rewrite, Next.js sirve las rutas directamente
  async rewrites() {
    const apiUrl = process.env.API_URL
    if (!apiUrl || apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')) {
      return []
    }
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ]
  },

  // Imágenes de Steam permitidas
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.steamstatic.com' },
      { protocol: 'https', hostname: 'steamcdn-a.akamaihd.net' },
    ],
  },
}

export default nextConfig
