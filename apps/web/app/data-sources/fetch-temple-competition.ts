import { clientConstants } from '@/config/constants.client';
import {
  TempleCompetitionResponse,
  TempleErrorResponse,
  type TempleCompetitionParticipant,
} from '@/app/schemas/clan-events';

export interface TempleCompetition {
  id: number;
  name: string;
  /** Temple's display name for the tracked skill or boss. */
  metricName: string;
  metricId: number;
  participantCount: number;
  startsAt: Date;
  endsAt: Date;
  statusText: string;
  linkedGroupId: number | null;
  /** Standings, highest gain first. */
  participants: TempleCompetitionParticipant[];
}

/**
 * A competition's live standings.
 *
 * Public on Temple — no key needed, which is why the status modal can render
 * these for any signed-in member rather than only for staff. The edit key we
 * store is for *changing* a competition, not reading one.
 *
 * Cached for a few minutes: Temple re-polls its participants continuously, so
 * a fresher read would only add load without telling anyone anything new, and
 * a 278-member competition is not a small payload.
 */
export async function fetchTempleCompetition(
  competitionId: number,
): Promise<TempleCompetition | null> {
  try {
    const response = await fetch(
      `${clientConstants.temple.baseUrl}/api/competition_info.php?id=${competitionId}`,
      { next: { revalidate: 180 } },
    );

    if (!response.ok) {
      console.error(
        `Temple competition ${competitionId} returned ${response.status}`,
      );

      return null;
    }

    const body: unknown = await response.json();
    const templeError = TempleErrorResponse.safeParse(body);

    if (templeError.success) {
      console.error(
        `Temple competition ${competitionId}: ${templeError.data.error.Message}`,
      );

      return null;
    }

    const { data } = TempleCompetitionResponse.parse(body);

    return {
      id: data.info.id,
      name: data.info.name,
      metricName: data.info.skill,
      metricId: data.info.skill_index,
      participantCount: data.info.participant_count,
      startsAt: data.info.start_date,
      endsAt: data.info.end_date,
      statusText: data.info.status_text,
      linkedGroupId: data.info.linked_group_id ?? null,
      // Temple already returns these in order, but the standings are the whole
      // point of this call and nothing here should depend on that.
      participants: [...data.participants].sort((a, b) => b.gained - a.gained),
    };
  } catch (error) {
    console.error(
      `Failed to fetch Temple competition ${competitionId}:`,
      error,
    );

    return null;
  }
}
