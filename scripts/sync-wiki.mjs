#!/usr/bin/env node
/**
 * Fetches the IC Promotion Wiki page using the user's Midway session
 * and writes it as a static asset (public/content/) fetched by the Guidelines page.
 *
 * Usage: node scripts/sync-wiki.mjs
 * Requires: active Midway session (run `mwinit` first)
 */
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

const WIKI_URL =
  'https://w.amazon.com/bin/view/ITSERVICES/guest-speaker/templates/drafts/ic-promotion-wiki/?xpage=plain';
const HUMAN_URL =
  'https://w.amazon.com/bin/view/ITSERVICES/guest-speaker/templates/drafts/ic-promotion-wiki';
const COOKIE_PATH = `${process.env.HOME}/.midway/cookie`;
const OUTPUT_DIR = resolve(PROJECT_ROOT, 'public/content');
const OUTPUT_FILE = resolve(OUTPUT_DIR, 'guidelines-wiki.html');
const META_FILE = resolve(OUTPUT_DIR, 'guidelines-wiki.meta.json');

console.log('🔄 Fetching IC Promotion Wiki...');

let html;
try {
  // Prefer mcurl (Midway-aware curl) if available; fall back to curl with cookie jar
  const hasMcurl = (() => {
    try { execSync('which /usr/local/bin/mcurl', { stdio: 'ignore' }); return true; } catch { return false; }
  })();
  const cmd = hasMcurl
    ? `mcurl -sL "${WIKI_URL}"`
    : `curl -sL -b "${COOKIE_PATH}" "${WIKI_URL}"`;
  html = execSync(cmd, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
} catch (err) {
  console.error('❌ Failed to fetch wiki page. Run mwinit first.');
  process.exit(1);
}

// Detect auth redirect — Midway returns a redirect to midway-auth/federate when cookie is expired
if (
  html.includes('midway-auth') ||
  html.includes('/federate') ||
  html.includes('"status":"error"') ||
  html.includes('Unauthenticated') ||
  !html.includes('<') // not HTML at all
) {
  console.error('❌ Midway session expired or invalid. Run mwinit first.');
  process.exit(1);
}

const now = new Date().toISOString();

mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(OUTPUT_FILE, html, 'utf-8');
writeFileSync(META_FILE, JSON.stringify({ syncedAt: now, sourceUrl: HUMAN_URL }, null, 2) + '\n', 'utf-8');

const sizeKB = (Buffer.byteLength(html, 'utf-8') / 1024).toFixed(1);
console.log(`✅ Written ${OUTPUT_FILE} (${sizeKB} KB)`);
console.log(`   Synced at: ${now}`);
