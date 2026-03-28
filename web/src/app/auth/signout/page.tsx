'use client'
import { useEffect } from 'react'
import { signOut } from 'next-auth/react'

export default function SignOutPage() {
  useEffect(() => { signOut({ callbackUrl: '/' }) }, [])
  return (
    <div style={{ minHeight:'60vh', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--t2)' }}>
      Signing out...
    </div>
  )
}
