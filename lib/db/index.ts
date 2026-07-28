import * as schema from './schema'

const isDev = process.env.NODE_ENV === 'development' && !process.env.DATABASE_URL

let _pool: any
let _db: any
let _loaded = false

function ensureProdDb() {
  if (_loaded) return
  _loaded = true
  const { Pool } = require('pg')
  const { drizzle } = require('drizzle-orm/node-postgres')
  _pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
    max: 10,
  })
  _db = drizzle(_pool, { schema })
}

let devDbRef: any = null
if (isDev) {
  const sqlite = require('./sqlite')
  devDbRef = sqlite.devDb
}

// In dev mode, export devDb directly (it already has its own lazy Proxy).
// In prod mode, pg was loaded above — export the Drizzle/Pool instances directly.
export const db: any = isDev ? devDbRef : _db
export const pool: any = isDev ? undefined : _pool

export function getDb() {
  return db
}

export function getPool() {
  return pool
}
