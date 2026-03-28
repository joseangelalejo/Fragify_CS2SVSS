// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth'
import { getAuthOptions } from '@/lib/auth'
import type { NextRequest } from 'next/server'

async function handler(req: NextRequest, context: any) {
  return NextAuth(req as any, context, getAuthOptions(req))
}

export { handler as GET, handler as POST }
