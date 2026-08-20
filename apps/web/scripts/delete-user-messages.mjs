#!/usr/bin/env node
// One-off: delete all messages from a specific user in a specific Discord channel.
//
// Usage:
//   node scripts/delete-user-messages.mjs [--dry-run]
//
// Requires DISCORD_TOKEN (a bot token) in apps/web/.env.local.
// The bot must be in the guild and have, in the target channel:
//   View Channel, Read Message History, Manage Messages.
//
// Notes:
//   - Individual DELETE is used (works on messages of any age, unlike bulk
//     delete which only handles messages < 14 days old).
//   - Discord rate limits are respected (honours 429 retry_after headers).

const userId = '1527719537703653447';
const channelId = '697877518513864793';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- minimal .env.local loader (avoids adding a dependency) ---------------
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const raw of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnv();

const dryRun = process.argv.includes('--dry-run');

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('DISCORD_TOKEN not found in environment / .env.local');
  process.exit(1);
}

const API = 'https://discord.com/api/v10';
const headers = {
  Authorization: `Bot ${token}`,
  'Content-Type': 'application/json',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// fetch wrapper that transparently retries on 429 rate limits
async function api(url, init = {}) {
  for (;;) {
    const res = await fetch(url, { ...init, headers });
    if (res.status === 429) {
      const body = await res.json().catch(() => ({}));
      const wait = ((body.retry_after ?? 1) + 0.25) * 1000;
      console.warn(`  rate limited, waiting ${Math.round(wait)}ms`);
      await sleep(wait);
      continue;
    }
    return res;
  }
}

async function* iterateMessages() {
  let before;
  for (;;) {
    const qs = new URLSearchParams({ limit: '100' });
    if (before) qs.set('before', before);
    const res = await api(`${API}/channels/${channelId}/messages?${qs}`);
    if (!res.ok) {
      throw new Error(
        `Failed to fetch messages: ${res.status} ${await res.text()}`,
      );
    }
    const batch = await res.json();
    if (batch.length === 0) return;
    for (const msg of batch) yield msg;
    before = batch[batch.length - 1].id;
  }
}

async function main() {
  console.log(
    `Scanning channel ${channelId} for messages from user ${userId}${dryRun ? ' (dry run)' : ''}…`,
  );

  let scanned = 0;
  let deleted = 0;

  for await (const msg of iterateMessages()) {
    scanned += 1;
    if (scanned % 500 === 0) console.log(`  scanned ${scanned}…`);
    if (msg.author?.id !== userId) continue;

    if (dryRun) {
      deleted += 1;
      console.log(
        `  would delete ${msg.id} @ ${msg.timestamp}: ${JSON.stringify(msg.content).slice(0, 80)}`,
      );
      continue;
    }

    const res = await api(
      `${API}/channels/${channelId}/messages/${msg.id}`,
      { method: 'DELETE' },
    );
    if (res.status === 204) {
      deleted += 1;
      console.log(`  deleted ${msg.id} @ ${msg.timestamp}`);
    } else if (res.status === 404) {
      // already gone
    } else {
      console.warn(`  failed to delete ${msg.id}: ${res.status} ${await res.text()}`);
    }
    // gentle self-throttle in addition to 429 handling
    await sleep(350);
  }

  console.log(
    `Done. Scanned ${scanned} messages, ${dryRun ? 'matched' : 'deleted'} ${deleted}.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
