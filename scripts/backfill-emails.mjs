import { createRequire } from 'node:module'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')
const nodemailer = require('nodemailer')

const isDryRun = process.argv.includes('--dry-run')

// ── Load .env.local ──────────────────────────────────────────────
const envPath = resolve(__dirname, '..', '.env.local')
const env = {}
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    let val = trimmed.slice(eqIdx + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
      val = val.slice(1, -1)
    env[key] = val
  }
}

const APP_URL = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// ── SMTP Transporter ─────────────────────────────────────────────
function getTransporter() {
  const host = env.SMTP_HOST
  const user = env.SMTP_USER
  const pass = env.SMTP_PASS
  if (!host || !user || !pass) return null
  return nodemailer.createTransport({
    host,
    port: parseInt(env.SMTP_PORT || '587', 10),
    secure: (env.SMTP_PORT || '587') === '465',
    auth: { user, pass },
  })
}

// ── Connect SQLite ───────────────────────────────────────────────
const dbPath = resolve(__dirname, '..', 'booksure-dev.db')
if (!existsSync(dbPath)) {
  console.error(`[backfill] Database not found at ${dbPath}`)
  process.exit(1)
}
const db = new Database(dbPath)

// ── Fetch un-emailed appointments ────────────────────────────────
const rows = db
  .prepare(
    `SELECT a.id, a.customerName, a.customerEmail, a.eventStart, a.duration, a.notes,
            a.manage_token, a.client_token, a.userId,
            b.businessName
     FROM appointments a
     JOIN businesses b ON b.userId = a.userId
     WHERE a.status = 'confirmed'
       AND (a.email_sent IS NULL OR a.email_sent = 0)
     ORDER BY a.eventStart ASC`
  )
  .all()

console.log(`[backfill] Found ${rows.length} appointment(s) without email_sent\n`)

// ── HTML template ────────────────────────────────────────────────
function buildHtml(p) {
  const manageUrl = p.manageLink || APP_URL
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4CAF50; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { color: white; margin: 0; }
    .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
    .details { background-color: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .details table { width: 100%; }
    .details td { padding: 8px; }
    .details td:first-child { font-weight: bold; width: 100px; }
    .button { display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px 0 0; }
    .footer { margin-top: 20px; font-size: 12px; text-align: center; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Booking Confirmed! ✅</h1></div>
    <div class="content">
      <p>Hello <strong>${p.customerName}</strong>,</p>
      <p>Your appointment with <strong>${p.businessName}</strong> has been confirmed.</p>
      <div class="details">
        <table>
          <tr><td>📅 Date:</td><td>${p.date}</td></tr>
          <tr><td>⏰ Time:</td><td>${p.time}</td></tr>
          <tr><td>⏱️ Duration:</td><td>${p.duration} minutes</td></tr>
          ${p.notes ? `<tr><td>📝 Notes:</td><td>${p.notes}</td></tr>` : ''}
        </table>
      </div>
      <div style="text-align: center;">
        <a href="${manageUrl}" class="button">View / Edit Appointment</a>
      </div>
      ${p.dashboardLink ? `<p style="margin-top: 16px; text-align: center;"><a href="${p.dashboardLink}" style="color: #4CAF50;">Manage all your appointments</a></p>` : ''}
      <p style="margin-top: 20px;">Need to make changes? Click the button above to reschedule or cancel.</p>
    </div>
    <div class="footer"><p>This is an automated message. Please do not reply to this email.</p></div>
  </div>
</body>
</html>`
}

// ── Send ─────────────────────────────────────────────────────────
const transporter = getTransporter()
const from = env.SMTP_FROM || env.SMTP_USER || 'noreply@example.com'

if (!transporter && !isDryRun) {
  console.error('[backfill] SMTP not configured. Run with --dry-run to preview only.')
  process.exit(1)
}

const updateStmt = db.prepare(`UPDATE appointments SET email_sent = 1 WHERE id = ?`)
let success = 0
let failure = 0

for (const row of rows) {
  const dateStr = new Date(row.eventStart).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
  const timeStr = new Date(row.eventStart).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  })

  const manageLink = row.manage_token ? `${APP_URL}/manage/${row.manage_token}` : null
  const dashboardLink = row.client_token ? `${APP_URL}/client/dashboard/${row.client_token}` : null

  const subject = `Confirmed: ${row.businessName} – ${dateStr} at ${timeStr}`
  const html = buildHtml({
    customerName: row.customerName,
    businessName: row.businessName,
    date: dateStr,
    time: timeStr,
    duration: row.duration,
    manageLink,
    dashboardLink,
    notes: row.notes,
  })

  if (isDryRun) {
    console.log(`[dry-run] Would send to ${row.customerEmail} (ID: ${row.id})`)
    console.log(`  Subject: ${subject}`)
    console.log(`  Manage: ${manageLink || 'N/A'}`)
    console.log(`  Dashboard: ${dashboardLink || 'N/A'}`)
    console.log()
    continue
  }

  try {
    await transporter.sendMail({
      from,
      to: row.customerEmail,
      subject,
      html,
    })
    updateStmt.run(row.id)
    console.log(`[OK]     ID ${row.id} → ${row.customerEmail} (${dateStr} ${timeStr})`)
    success++
  } catch (err) {
    console.error(`[FAIL]   ID ${row.id} → ${row.customerEmail}: ${err.message}`)
    failure++
  }
}

db.close()

console.log(`\n[backfill] Done. Sent: ${success}, Failed: ${failure}, Dry-run: ${isDryRun ? 'Yes' : 'No'}`)
if (failure > 0) process.exit(1)
