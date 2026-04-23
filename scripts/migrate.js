#!/usr/bin/env node
/**
 * Migration runner for the AWC App Supabase project.
 *
 * Reads SQL files from supabase/migrations/ and runs them in order.
 * Tracks applied migrations in a `_migrations` table.
 *
 * Connection strings (set one):
 *   DATABASE_URL           — preferred (anything libpq-compatible)
 *   SUPABASE_DB_PASSWORD   — uses the pooler URL for the configured project
 */

import { readFile, readdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const { Client } = pg

const ROOT = dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = join(ROOT, '..', 'supabase', 'migrations')

const PROJECT_REF = 'ssnzebudcbrtpiwilroo'

function buildConnString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const pwd = process.env.SUPABASE_DB_PASSWORD
  if (!pwd) {
    console.error('Set DATABASE_URL or SUPABASE_DB_PASSWORD env var.')
    process.exit(1)
  }
  // Transaction pooler (IPv4, no prepared statements — fine for DDL)
  return `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(pwd)}@aws-0-eu-west-2.pooler.supabase.com:6543/postgres`
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

async function getApplied(client) {
  const { rows } = await client.query('SELECT name FROM _migrations ORDER BY name')
  return new Set(rows.map(r => r.name))
}

async function main() {
  const connString = buildConnString()
  console.log(`→ Connecting to ${connString.replace(/:([^:@]+)@/, ':***@')}`)
  const client = new Client({ connectionString: connString, statement_timeout: 60000 })
  await client.connect()

  try {
    await ensureMigrationsTable(client)
    const applied = await getApplied(client)

    const all = (await readdir(MIGRATIONS_DIR))
      .filter(f => f.endsWith('.sql') && !f.startsWith('_'))
      .sort()

    const pending = all.filter(f => !applied.has(f))
    if (pending.length === 0) {
      console.log('✓ No pending migrations')
      return
    }

    for (const name of pending) {
      console.log(`→ Applying ${name} …`)
      const sql = await readFile(join(MIGRATIONS_DIR, name), 'utf8')
      try {
        // Each migration runs in its own transaction
        await client.query('BEGIN')
        await client.query(sql)
        await client.query('INSERT INTO _migrations(name) VALUES($1)', [name])
        await client.query('COMMIT')
        console.log(`  ✓ ${name}`)
      } catch (e) {
        await client.query('ROLLBACK').catch(() => {})
        console.error(`  ✗ ${name}: ${e.message}`)
        throw e
      }
    }

    console.log(`\n✓ Applied ${pending.length} migration${pending.length === 1 ? '' : 's'}`)
  } finally {
    await client.end()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
