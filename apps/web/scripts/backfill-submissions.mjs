/**
 * Moves rank submissions out of Redis and into `rank_submissions`.
 *
 * Run once, after migration 0022:
 *
 *     node scripts/backfill-submissions.mjs            # dry run, reports only
 *     node scripts/backfill-submissions.mjs --write
 *
 * **Every status is migrated, not just pending.** The submission view URL is
 * embedded in Discord threads permanently, so a 404 on a two-year-old approval
 * link is a real regression. Rows keep their original id for the same reason.
 *
 * Verification is per record rather than a summary at the end: each row is read
 * back after insert and compared against what it meant to write. A bad mapping
 * shows up on record three instead of after nine hundred.
 *
 * Idempotent — re-running skips ids that already exist.
 */
import { config } from 'dotenv';

config({ path: '.env.local' });

const write = process.argv.includes('--write');

const { Redis } = await import('@upstash/redis');
const postgres = (await import('postgres')).default;

const redis = Redis.fromEnv({ keepAlive: false });
// Discord ids are numeric strings; the default client turns them into numbers
// and loses precision. This is the last place that workaround is needed.
const redisRaw = Redis.fromEnv({
  keepAlive: false,
  automaticDeserialization: false,
});
const sql = postgres(process.env.DATABASE_URL, { prepare: false });

/** Redis stored these as 'Pending' | 'Approved' | 'Rejected'. */
const statusMap = {
  Pending: 'pending',
  Approved: 'approved',
  Rejected: 'rejected',
};

const toBool = (value) => value === true || value === 'true';

async function scanSubmissionIds() {
  const ids = new Set();
  let cursor = '0';

  do {
    const [next, keys] = await redis.scan(cursor, {
      match: 'rank-submission:*:metadata',
      count: 200,
    });

    cursor = next;
    keys.forEach((key) => ids.add(key.split(':')[1]));
  } while (cursor !== '0');

  return [...ids];
}

const ids = await scanSubmissionIds();
console.log(`found ${ids.length} submissions in redis\n`);

let migrated = 0;
let skipped = 0;
const problems = [];

for (const id of ids) {
  const [snapshot, metadata, diff] = await Promise.all([
    redis.json.get(`rank-submission:${id}`),
    redisRaw.hgetall(`rank-submission:${id}:metadata`),
    redis.hgetall(`rank-submission:${id}:diff`),
  ]);

  if (!snapshot || !metadata) {
    problems.push(`${id}: missing snapshot or metadata, skipped`);
    continue;
  }

  // Only checked when writing: a dry run should be useful *before* the
  // migration has been applied, which is exactly when you want to read it.
  if (write) {
    const [existing] =
      await sql`select id from rank_submissions where id = ${id}`;

    if (existing) {
      skipped += 1;
      continue;
    }
  }

  const row = {
    id,
    player_name: snapshot.playerName,
    submitted_by_discord_id: String(metadata.submittedBy),
    submitted_at: metadata.submittedAt
      ? new Date(metadata.submittedAt)
      : new Date(),
    // Neither the applied rank nor the points were ever stored in Redis — the
    // snapshot is the form minus both, and the metadata hash never carried
    // them. They exist only in the Discord embed, so these stay null and the
    // moderator view shows "—".
    rank: null,
    previous_rank: null,
    total_points: null,
    status: statusMap[metadata.status] ?? 'pending',
    actioned_by_discord_id: metadata.actionedBy
      ? String(metadata.actionedBy)
      : null,
    actioned_at: metadata.status === 'Pending' ? null : new Date(),
    is_automatic: toBool(metadata.automaticApproval),
    discord_message_id: String(metadata.discordMessageId),
    has_temple_player_stats: toBool(metadata.hasTemplePlayerStats),
    has_temple_collection_log: toBool(metadata.hasTempleCollectionLog),
    has_wikisync_data: toBool(metadata.hasWikiSyncData),
    is_temple_collection_log_outdated: toBool(
      metadata.isTempleCollectionLogOutdated,
    ),
    snapshot: { version: 1, data: snapshot },
    diff: { version: 1, data: diff ?? {} },
  };

  if (!write) {
    console.log(
      `  would migrate ${id}  ${row.player_name.padEnd(13)} ${row.status}`,
    );
    migrated += 1;
    continue;
  }

  await sql`insert into rank_submissions ${sql(row)}`;

  // Read back and compare, rather than trusting the insert.
  const [stored] = await sql`
    select id, player_name, status, discord_message_id, submitted_by_discord_id
    from rank_submissions where id = ${id}`;

  const mismatch =
    !stored ||
    stored.player_name !== row.player_name ||
    stored.status !== row.status ||
    stored.discord_message_id !== row.discord_message_id ||
    stored.submitted_by_discord_id !== row.submitted_by_discord_id;

  if (mismatch) {
    problems.push(`${id} (${row.player_name}): read-back mismatch`);
  } else {
    migrated += 1;
    console.log(`  ✓ ${id}  ${row.player_name.padEnd(13)} ${row.status}`);
  }
}

console.log(
  `\n${write ? 'migrated' : 'would migrate'} ${migrated}, skipped ${skipped} already present`,
);

if (problems.length > 0) {
  console.log(`\n${problems.length} problem(s):`);
  problems.forEach((problem) => console.log(`  ${problem}`));
  process.exitCode = 1;
}

if (!write) {
  console.log('\ndry run — pass --write to apply');
}

await sql.end();
