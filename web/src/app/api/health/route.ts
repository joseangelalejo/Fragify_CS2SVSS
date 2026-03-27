// src/app/api/health/route.ts
// Health check endpoint — usado por Docker healthcheck y el monitor
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    await db.execute('SELECT 1')
    return NextResponse.json({
      status: 'ok',
      db: 'connected',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { status: 'error', db: 'disconnected', error: msg },
      { status: 503 }
    )
  }
}
