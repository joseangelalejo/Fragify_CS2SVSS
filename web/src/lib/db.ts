// src/lib/db.ts
// Cliente MySQL singleton para Fragify.
// Soporta dos modos:
//   - Dev local en homelab: DATABASE_URL apunta a mysql:3306 (red Docker interna)
//   - Vercel producción:    DATABASE_URL apunta al homelab expuesto

import mysql from 'mysql2/promise'

declare global {
  // eslint-disable-next-line no-var
  var _fragifyPool: mysql.Pool | undefined
}

function createPool(): mysql.Pool {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL no definida en .env.local / variables de Vercel')

  // Parsear mysql://user:pass@host:port/db
  const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)
  if (!m) throw new Error(`DATABASE_URL inválida: ${url}`)

  return mysql.createPool({
    user:               m[1],
    password:           m[2],
    host:               m[3],
    port:               parseInt(m[4]),
    database:           m[5],
    connectionLimit:    10,
    waitForConnections: true,
    queueLimit:         0,
    timezone:           '+00:00',
    charset:            'utf8mb4',
    connectTimeout:     10000,
  })
}

export const db: mysql.Pool =
  globalThis._fragifyPool ?? (globalThis._fragifyPool = createPool())

export async function query<T = mysql.RowDataPacket[]>(
  sql: string,
  values?: unknown[]
): Promise<T> {
  const [rows] = await db.execute(sql, values)
  return rows as T
}
