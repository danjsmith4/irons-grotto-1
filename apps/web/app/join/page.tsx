import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { fetchClanStats } from '@/app/data-sources/fetch-clan-stats';
import { JoinExperience } from './join-experience';

export const metadata = {
  title: 'Join the Grotto',
};

/**
 * Onboarding.
 *
 * A route of its own rather than a page inside the calculator, because it is
 * full-bleed and has no nav — a member arrives here once and leaves with an
 * account, and anything in the chrome is a way out of that.
 */
export default async function JoinPage() {
  const session = await auth();

  // The middleware already gates this, but the page writes a player row
  // against a Discord id and reads it from the session rather than the client.
  if (!session?.user?.id) {
    redirect('/');
  }

  const statsResult = await fetchClanStats();

  return (
    <JoinExperience
      // The welcome panel is decoration with a job — it is the only proof on
      // screen that there is a clan behind this form. If the aggregate query
      // fails, the panel is dropped rather than shown as a row of zeroes.
      stats={statsResult.success ? statsResult.data : null}
    />
  );
}
