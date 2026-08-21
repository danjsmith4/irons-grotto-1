import { db } from '@/lib/db';
import { playerAccomplishments, players } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import { accomplishmentFeedSize } from '@/config/accomplishments';
import type { AccomplishmentType } from '@/app/schemas/accomplishments';

export interface RecentAccomplishment {
  id: string;
  playerName: string;
  type: AccomplishmentType;
  label: string;
  achievedAt: Date;
}

/**
 * The clan's latest accomplishments, newest first — **at most one per player
 * per detection run**.
 *
 * Detection stamps everything found in a single run with one timestamp, so a
 * member being tracked for the first time, or syncing Temple after a long gap,
 * produces a burst of rows sharing one `achieved_at`. Left alone that member
 * fills the feed — but worse, the burst reads as an artefact rather than an
 * achievement: nobody earns 100, 250 and 500 efficient hours played in the same
 * instant, and a first sync reports exactly that.
 *
 * Taking one row per `(player, achieved_at)` makes that **structurally
 * impossible** rather than merely unlikely, which is why this is a
 * `row_number()` over the group rather than a cap on how many may appear.
 *
 * **Which one survives** is decided by the `order by` inside the window:
 * one-off feats first (an inferno cape beats a round number), then the highest
 * threshold reached, then id as a deterministic tiebreak so the feed doesn't
 * reshuffle between requests. The exact winner matters little in what is a
 * niche case — that it is *guaranteed* to be one is the point.
 *
 * Mains are included — they are members, and this is not the ladder.
 */
export async function fetchRecentAccomplishments(
  limit = accomplishmentFeedSize,
) {
  try {
    const rows = await db.execute<{
      id: string;
      player_name: string;
      type: AccomplishmentType;
      label: string;
      achieved_at: Date;
    }>(
      sql`
        with ranked as (
          select
            ${playerAccomplishments.id} as id,
            ${playerAccomplishments.playerName} as player_name,
            ${playerAccomplishments.type} as type,
            ${playerAccomplishments.label} as label,
            ${playerAccomplishments.achievedAt} as achieved_at,
            row_number() over (
              partition by
                ${playerAccomplishments.playerName},
                ${playerAccomplishments.achievedAt}
              order by
                -- One-off feats (null value) ahead of threshold milestones...
                (${playerAccomplishments.value} is null) desc,
                -- ...then the biggest number reached...
                ${playerAccomplishments.value} desc,
                -- ...then something stable, so the feed doesn't reshuffle.
                ${playerAccomplishments.id}
            ) as rank
          from ${playerAccomplishments}
          inner join ${players}
            on ${players.playerName} = ${playerAccomplishments.playerName}
          where ${players.isActive} = true
        )
        select id, player_name, type, label, achieved_at
        from ranked
        where rank = 1
        order by achieved_at desc
        limit ${limit}
      `,
    );

    const data: RecentAccomplishment[] = Array.from(rows).map((row) => ({
      id: row.id,
      playerName: row.player_name,
      type: row.type,
      label: row.label,
      achievedAt: new Date(row.achieved_at),
    }));

    return { success: true, data };
  } catch (error) {
    console.error('Failed to fetch recent accomplishments:', error);
    return { success: false, error: String(error) };
  }
}
