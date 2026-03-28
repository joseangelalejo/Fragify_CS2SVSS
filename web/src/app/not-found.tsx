// src/app/not-found.tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '24px',
    }}>
      {/* Radar SVG */}
      <div style={{ position: 'relative', width: 160, height: 160, marginBottom: 32 }}>
        <svg viewBox="0 0 160 160" width="160" height="160">
          {/* Círculos del radar */}
          <circle cx="80" cy="80" r="75" fill="none" stroke="#1e2130" strokeWidth="1.5" />
          <circle cx="80" cy="80" r="50" fill="none" stroke="#1e2130" strokeWidth="1.5" />
          <circle cx="80" cy="80" r="25" fill="none" stroke="#1e2130" strokeWidth="1.5" />
          {/* Líneas cruzadas */}
          <line x1="80" y1="5" x2="80" y2="155" stroke="#1e2130" strokeWidth="1" />
          <line x1="5" y1="80" x2="155" y2="80" stroke="#1e2130" strokeWidth="1" />
          {/* Barrido del radar */}
          <path d="M 80 80 L 80 5 A 75 75 0 0 1 155 80 Z" fill="rgba(249,115,22,0.15)" />
          <line x1="80" y1="80" x2="155" y2="80" stroke="#f97316" strokeWidth="2" />
        </svg>
        {/* 404 centrado */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: 42,
            fontWeight: 700,
            color: '#f97316',
            letterSpacing: '0.05em',
          }}>
            404
          </span>
        </div>
      </div>

      <h1 style={{
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: 28,
        fontWeight: 700,
        color: 'var(--t1)',
        marginBottom: 12,
      }}>
        Target lost
      </h1>
      <p style={{ color: 'var(--t3)', fontSize: 14, marginBottom: 32 }}>
        This page does not exist.
      </p>
      <Link href="/" style={{
        background: 'var(--orange)',
        color: '#fff',
        fontWeight: 700,
        fontSize: 14,
        padding: '11px 28px',
        borderRadius: 8,
        textDecoration: 'none',
        display: 'inline-block',
      }}>
        Return to homepage
      </Link>
    </div>
  )
}
