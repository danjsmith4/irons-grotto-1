import 'server-only';
import { z } from 'zod';
import { clientConstants } from '@/config/constants.client';
import { serverConstants } from '@/config/constants.server';
import { TempleErrorResponse } from '@/app/schemas/clan-events';

const TempleGroupInfoResponse = z.object({
  data: z.object({
    info: z.object({
      id: z.coerce.number().int(),
      name: z.string(),
    }),
    members: z.array(z.string()),
  }),
});

/**
 * The clan group's member list, as TempleOSRS holds it.
 *
 * Only one caller: creating a competition. `competition_create.php` rejects a
 * request with no `participants` ("Invalid memberlist!") **even when the group
 * is linked and synced**, so a list has to be sent — and the only honest list
 * to send is the group's own. Temple then replaces it via the sync anyway
 * (verified: sending 268 names produced a 278-participant competition), so
 * this is about satisfying the endpoint, not about deciding who competes.
 */
export async function fetchTempleGroupMembers(): Promise<string[] | null> {
  try {
    const response = await fetch(
      `${clientConstants.temple.baseUrl}/api/group_info.php?id=${serverConstants.temple.groupId}`,
      { cache: 'no-store' },
    );

    if (!response.ok) {
      console.error(`Temple group_info returned ${response.status}`);

      return null;
    }

    const body: unknown = await response.json();
    const templeError = TempleErrorResponse.safeParse(body);

    if (templeError.success) {
      console.error(`Temple group_info: ${templeError.data.error.Message}`);

      return null;
    }

    return TempleGroupInfoResponse.parse(body).data.members;
  } catch (error) {
    console.error('Failed to fetch Temple group members:', error);

    return null;
  }
}
