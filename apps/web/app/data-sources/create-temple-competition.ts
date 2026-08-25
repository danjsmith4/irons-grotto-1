import 'server-only';
import { clientConstants } from '@/config/constants.client';
import { serverConstants } from '@/config/constants.server';
import {
  TempleCompetitionCreateResponse,
  TempleErrorResponse,
} from '@/app/schemas/clan-events';
import { fetchTempleGroupMembers } from './fetch-temple-group-members';
import { fetchTempleCompetition } from './fetch-temple-competition';

export interface CreateTempleCompetitionInput {
  name: string;
  /** Temple's skill/boss id — see `config/clan-events.ts`. */
  metricId: number;
  startsAt: Date;
  endsAt: Date;
}

export type CreateTempleCompetitionResult =
  | {
      success: true;
      competitionId: number;
      /**
       * The competition's edit password. Temple hands this out once and never
       * again, so a caller that does not persist it has thrown it away.
       * Absent if Temple's reply did not carry one.
       */
      competitionKey: string | null;
      /**
       * The name Temple actually stored, which is not the one we sent: it
       * title-cases and flattens punctuation, so "Thieving SOTW" is kept as
       * "Thieving Sotw". Null if it could not be read back.
       */
      storedName: string | null;
    }
  | { success: false; error: string };

/**
 * Creates the competition on TempleOSRS.
 *
 * Always linked to the clan group and always `group-sync`, so the entrants are
 * whoever is in the group — the entire reason staff no longer paste a member
 * list. Two things about this endpoint were only learnable by calling it, and
 * both are load-bearing:
 *
 * ⚠️ **`team-comp` must be absent, not `0`.** Temple checks whether the
 * parameter is *present*, not what it says, so sending `team-comp=0` routes
 * the request down the team-competition path and it fails with "Invalid
 * memberlist JSON!" — it is looking for `teams`, which we never send. This is
 * what broke the first attempt to create an event from the site.
 *
 * ⚠️ **`participants` is required even with a linked, synced group.** Omitting
 * it, or sending `[]`, is rejected with "Invalid memberlist!". So the group's
 * own member list is sent — the only honest list to send, and one that cannot
 * introduce a non-member. Temple then applies the sync over the top: sending
 * 268 names produced a 278-participant competition, the group's real size.
 *
 * Parameters go in the body as form fields. The endpoint is documented as
 * "parameters in the body" with no content type named; form encoding is what
 * Temple's own competition form posts, and it is what works.
 */
export async function createTempleCompetition({
  name,
  metricId,
  startsAt,
  endsAt,
}: CreateTempleCompetitionInput): Promise<CreateTempleCompetitionResult> {
  const members = await fetchTempleGroupMembers();

  if (!members?.length) {
    return {
      success: false,
      error:
        'Could not read the clan group from TempleOSRS, so the competition was not created. Try again in a moment.',
    };
  }

  const body = new URLSearchParams({
    name,
    skill: String(metricId),
    'start-date': String(Math.floor(startsAt.getTime() / 1000)),
    'end-date': String(Math.floor(endsAt.getTime() / 1000)),
    'group-id': serverConstants.temple.groupId,
    'group-key': serverConstants.temple.groupKey,
    'group-sync': '1',
    participants: JSON.stringify(members),
  });

  let raw: string;

  try {
    const response = await fetch(
      `${clientConstants.temple.baseUrl}/api/competition_create.php`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
        cache: 'no-store',
      },
    );

    raw = await response.text();

    if (!response.ok) {
      console.error(
        `Temple competition_create returned ${response.status}: ${raw}`,
      );

      return {
        success: false,
        error: `TempleOSRS rejected the competition (HTTP ${response.status}).`,
      };
    }
  } catch (error) {
    console.error('Failed to reach Temple competition_create:', error);

    return { success: false, error: 'Could not reach TempleOSRS.' };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error(`Temple competition_create returned non-JSON: ${raw}`);

    return {
      success: false,
      error: 'TempleOSRS returned an unreadable response.',
    };
  }

  // Temple answers its own errors with a 200 and an `error` envelope.
  const templeError = TempleErrorResponse.safeParse(parsed);

  if (templeError.success) {
    return { success: false, error: templeError.data.error.Message };
  }

  const result = TempleCompetitionCreateResponse.safeParse(parsed);

  if (!result.success) {
    // The competition may well exist at this point — we simply cannot tell
    // which one it is. Logging the body is the only way to recover it.
    console.error(
      `Temple competition_create reply did not parse: ${raw}`,
      result.error,
    );

    return {
      success: false,
      error:
        'TempleOSRS accepted the request but replied in an unexpected shape. Check the competition list on Temple before retrying.',
    };
  }

  // Read back what Temple settled on, rather than trusting what we asked for:
  // it rewrites the name on storage, and this is the one moment we can capture
  // the version members will actually see.
  const stored = await fetchTempleCompetition(result.data.id);

  return {
    success: true,
    competitionId: result.data.id,
    competitionKey: result.data.key ?? null,
    storedName: stored?.name ?? null,
  };
}
