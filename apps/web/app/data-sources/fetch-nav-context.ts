import type { StaffRole } from '@/app/schemas/staff';
import { fetchViewerStaffRole } from './fetch-viewer-staff-role';
import {
  fetchClanEventStatus,
  type ClanEventStatus,
} from './fetch-clan-event-status';

export interface NavContext {
  viewerStaffRole: StaffRole | null;
  eventStatus: ClanEventStatus | null;
}

/**
 * Everything the nav bar used to fetch from the browser after it had mounted.
 *
 * Both answers are known on the server at render time, so making the viewer
 * watch them arrive was never buying anything: the Admin link and the event
 * indicator appeared a beat after the bar had settled and popped into place.
 * Nav chrome arriving late reads as the page still loading.
 *
 * ⚠️ **Call this inside a page's existing `Promise.all`, not before it.** The
 * two reads here are independent of everything else a page fetches, so run in
 * parallel they cost the slowest of them rather than adding to the total.
 *
 * ⚠️ **It never throws and never returns a failure.** A nav bar is chrome on
 * every page in the app; a fault in it must degrade to the pre-existing
 * behaviour (the client fetches, or the link stays hidden) rather than take
 * down the page it decorates. This is the same call `getClanEventDuty` makes
 * for the same reason.
 */
export async function fetchNavContext(): Promise<NavContext> {
  const [staffRole, eventStatus] = await Promise.all([
    fetchViewerStaffRole().catch(() => null),
    fetchClanEventStatus().catch(() => null),
  ]);

  return {
    viewerStaffRole: staffRole?.success ? staffRole.data.staffRole : null,
    eventStatus: eventStatus?.success ? eventStatus.data : null,
  };
}
