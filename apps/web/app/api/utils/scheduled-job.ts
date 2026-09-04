import 'server-only';
import { NextRequest } from 'next/server';
import { sendDiscordMessage } from '@/app/player/utils/send-discord-message';
import { scheduledJobAlertChannelId } from '@/config/scheduled-jobs';

/**
 * Whether a request is genuinely the scheduler.
 *
 * Vercel sends `Authorization: Bearer $CRON_SECRET` on every cron invocation
 * when that environment variable is set. These endpoints move real data and
 * spend a rate-limited third-party budget, so they must not be a URL anyone
 * can hit repeatedly.
 *
 * ⚠️ **With no `CRON_SECRET` set, this returns false and the endpoints refuse
 * to run.** Failing closed is deliberate: an unset secret is indistinguishable
 * from a misconfigured deploy, and the failure mode of guessing wrong is a
 * public endpoint that hammers TempleOSRS. Set `CRON_SECRET` in the Vercel
 * project before enabling the crons.
 */
export function isScheduledRequest(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return false;
  }

  return request.headers.get('authorization') === `Bearer ${secret}`;
}

/**
 * Tells staff that a scheduled job needs looking at.
 *
 * Never throws. This is the reporting path for something that has already gone
 * wrong, and a failure to report must not become a second, louder failure that
 * takes down the handler trying to describe the first one.
 */
export async function reportScheduledJobFailure(
  jobName: string,
  summary: string,
  details: string[] = [],
): Promise<void> {
  const body = [
    `⚠️ **${jobName}** needs attention.`,
    summary,
    // Discord rejects a message over 2000 characters, and a run that failed for
    // every player would comfortably exceed that. The count is the signal; the
    // names are a sample.
    ...details.slice(0, 10).map((detail) => `• ${detail}`),
    ...(details.length > 10 ? [`• …and ${details.length - 10} more`] : []),
  ].join('\n');

  try {
    await sendDiscordMessage({ content: body }, scheduledJobAlertChannelId);
  } catch (error) {
    console.error(`Could not report ${jobName} failure to Discord:`, error);
  }
}
