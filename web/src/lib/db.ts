// src/lib/db.ts
// Cliente MySQL singleton para el backend Next.js de Fragify.
// En producción conecta al MySQL del homelab vía DATABASE_URL.

import mysql from 'mysql2/promise'

declare global {
  // Evita crear múltiples pools en hot-reload de Next.js dev
  // eslint-disable-next-line no-var
  var _fragifyPool: mysql.Pool | undefined
}

function createPool(): mysql.Pool {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL no definida')

  // Parsear mysql://user:pass@host:port/db
  const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)
  if (!match) throw new Error('DATABASE_URL con formato inválido')

  return mysql.createPool({
    user:            match[1],
    password:        match[2],
    host:            match[3],
    port:            parseInt(match[4]),
    database:        match[5],
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit:      0,
    timezone:        '+00:00',
    charset:         'utf8mb4',
  })
}

export const db: mysql.Pool =
  globalThis._fragifyPool ?? (globalThis._fragifyPool = createPool())

// Helper tipado para queries
export async function query<T = mysql.RowDataPacket[]>(
  sql: string,
  values?: unknown[]
): Promise<T> {
  const [rows] = await db.execute(sql, values)
  return rows as T
}
