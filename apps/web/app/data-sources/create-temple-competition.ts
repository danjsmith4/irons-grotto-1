import 'server-only';
import { clientConstants } from '@/config/constants.client';
import { serverConstants } from '@/config/constants.server';
import {
  TempleCompetitionCreateResponse,
  TempleErrorResponse,
} from '@/app/schemas/clan-events';

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
    }
  | { success: false; error: string };

/**
 * Creates the competition on TempleOSRS.
 *
 * Always linked to the clan group and always `group-sync`: participants are
 * whoever is in the group at the time, which is the entire reason staff no
 * longer have to paste a member list. `participants` is therefore deliberately
 * not sent — Temple's docs mark it as the alternative to a linked group, and
 * sending both is asking Temple to choose.
 *
 * Parameters go in the body as form fields. The endpoint is documented as
 * "parameters in the body", with no content type named; form encoding is what
 * Temple's own competition form posts.
 */
export async function createTempleCompetition({
  name,
  metricId,
  startsAt,
  endsAt,
}: CreateTempleCompetitionInput): Promise<CreateTempleCompetitionResult> {
  const body = new URLSearchParams({
    name,
    skill: String(metricId),
    'team-comp': '0',
    'start-date': String(Math.floor(startsAt.getTime() / 1000)),
    'end-date': String(Math.floor(endsAt.getTime() / 1000)),
    'group-id': serverConstants.temple.groupId,
    'group-key': serverConstants.temple.groupKey,
    'group-sync': '1',
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

  return {
    success: true,
    competitionId: result.data.id,
    competitionKey: result.data.key ?? null,
  };
}
