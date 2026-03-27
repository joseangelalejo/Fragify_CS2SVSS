export function Footer() {
  return (
    <footer style={{ borderTop:'1px solid var(--bg-border)', background:'var(--bg-main)', marginTop:48, padding:'24px 16px' }}>
      <div className="max-w-screen-2xl mx-auto text-center" style={{ color:'var(--t3)', fontSize:11 }}>
        <p>Fragify is an online service for CS2 stat tracking.</p>
        <p style={{ marginTop:4 }}>
          Not affiliated with Valve Corporation. Counter-Strike 2 is a trademark of Valve Corporation.
        </p>
        <p style={{ marginTop:8 }}>
          © 2026 José Ángel Alejo Sillero · CS2-SVSS · DAW 2025–2027
        </p>
      </div>
    </footer>
  )
}
