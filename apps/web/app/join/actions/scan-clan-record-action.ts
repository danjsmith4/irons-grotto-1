'use server';

import { z } from 'zod';
import { authActionClient } from '@/app/safe-action';
import { PlayerName } from '@/app/schemas/player';
import { fetchPlayerMeta } from '@/app/player/data-sources/fetch-player-meta';
import type { ClanRecordScan } from '../scan-types';

/**
 * What the clan's own member list says: when this player joined, and how they
 * spell their name.
 *
 * The join date is presented to the player as something we already know rather
 * than something to type, which is the whole reason this is a scan step and
 * not a form field. When the list has no record — a brand new member whose
 * export has not run yet — the caller defaults to today and says so, because
 * an empty date field is a question nobody can answer better than we can.
 */
export const scanClanRecordAction = authActionClient
  .metadata({ actionName: 'join-scan-clan-record' })
  .schema(z.object({ playerName: PlayerName }))
  .action(async ({ parsedInput: { playerName } }): Promise<ClanRecordScan> => {
    const meta = await fetchPlayerMeta(playerName);

    return {
      joinDate: meta?.joinDate ? meta.joinDate.toISOString() : null,
      isClanMember: Boolean(meta?.rank),
      rsn: meta?.rsn ?? playerName,
    };
  });
