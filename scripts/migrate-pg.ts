#!/usr/bin/env tsx
/**
 * PostgreSQL BOS Migration Runner
 *
 * Runs the 0000_soft_tigra.sql migration against PostgreSQL.
 * Only use when DATABASE_URL is configured.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/migrate-pg.ts
 */

import { Pool } from 'pg'
import { readFileSync } from 'fs'
import { join } from 'path'

const EXPECTED_TABLES = [
  'business_profiles',
  'contacts',
  'contact_timeline',
  'tasks',
  'opportunities',
  'invoices',
  'invoice_items',
  'payments',
  'ai_providers',
  'ai_insights',
]

async function migrate() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('ERROR: DATABASE_URL not set. This script requires a PostgreSQL connection.')
    console.error('Set DATABASE_URL in .env.local and try again.')
    process.exit(1)
  }

  console.log('=== PostgreSQL BOS Migration ===\n')
  console.log(`Connecting to: ${url.replace(/:[^@]+@/, ':***@')}\n`)

  const pool = new Pool({
    connectionString: url,
    connectionTimeoutMillis: 10000,
    max: 5,
  })

  try {
    // Test connection
    const client = await pool.connect()
    console.log('Connected to PostgreSQL successfully.\n')

    // Run migration
    const sqlPath = join(__dirname, '..', 'drizzle', '0000_soft_tigra.sql')
    const sql = readFileSync(sqlPath, 'utf-8')
    console.log('Running migration: 0000_soft_tigra.sql')
    await client.query(sql)
    console.log('Migration completed.\n')

    // Verify tables exist
    console.log('Verifying tables:')
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)
    const tables = result.rows.map(r => r.table_name)

    let allPresent = true
    for (const table of EXPECTED_TABLES) {
      const exists = tables.includes(table)
      if (!exists) allPresent = false
      console.log(`  ${exists ? '✓' : '✗'} ${table}`)
    }

    // Check existing tables are untouched
    const existingTables = [
      'user', 'session', 'account', 'verification', 'google_calendars',
      'appointments', 'manual_blocks', 'businesses', 'email_verification_codes',
      'teams', 'team_members', 'meeting_polls', 'poll_votes',
      'workflows', 'workflow_actions', 'workflow_logs',
      'routing_forms', 'form_submissions', 'email_log',
    ]

    console.log('\nExisting tables (must be intact):')
    let allExistingOk = true
    for (const table of existingTables) {
      const exists = tables.includes(table)
      if (!exists) allExistingOk = false
      console.log(`  ${exists ? '✓' : '✗'} ${table}`)
    }

    // Check indexes
    console.log('\nBOS Indexes:')
    const idxResult = await client.query(`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
      ORDER BY indexname
    `)
    const indexes = idxResult.rows.map(r => r.indexname)
    const expectedIndexes = [
      'idx_contacts_user_id', 'idx_contacts_email', 'idx_contacts_status',
      'idx_contact_timeline_contact_id', 'idx_contact_timeline_user_id',
      'idx_tasks_user_id', 'idx_tasks_status', 'idx_tasks_due_date',
      'idx_opportunities_user_id', 'idx_opportunities_stage',
      'idx_invoices_user_id', 'idx_invoices_status', 'idx_invoices_contact_id',
      'idx_payments_invoice_id',
      'idx_ai_insights_user_id',
      'idx_business_profiles_user_id',
    ]
    for (const idx of expectedIndexes) {
      const exists = indexes.includes(idx)
      if (!exists) allPresent = false
      console.log(`  ${exists ? '✓' : '✗'} ${idx}`)
    }

    console.log('\n=== Summary ===')
    const pass = allPresent && allExistingOk
    console.log(pass ? '✓ ALL CHECKS PASSED' : '✗ SOME CHECKS FAILED')

    client.release()
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

migrate()
