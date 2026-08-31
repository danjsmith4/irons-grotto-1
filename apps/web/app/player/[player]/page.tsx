import { auth } from '@/auth';
import * as Sentry from '@sentry/nextjs';
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query';
import { fetchSessionContext } from '@/app/data-sources/fetch-session-context';
import {
  fetchItemDropRates,
  generateRequiredItemList,
} from '../data-sources/fetch-dropped-item-info';
import { buildNotableItemList } from '../utils/build-notable-item-list';
import { CalculatorLoader } from './calculator-loader';

interface Params {
  player: string;
}

/**
 * The calculator's shell.
 *
 * ⚠️ **The player's sheet is deliberately *not* awaited here.** It used to be:
 * `fetchPlayerDetails` ran inside this component, so the first byte of the page
 * waited on a hiscores check, a TempleOSRS datapoint push, then WikiSync,
 * Temple stats, Temple collection log and Discord roles, then the write-back —
 * seconds, every visit, with `loading.tsx` the only thing on screen. It now
 * runs behind `GET /api/player-details` and is read from the React Query cache
 * (`CalculatorLoader`), which the dashboard warms on mount. The click that used
 * to start that work now finds it finished.
 *
 * What stays server-side is the work that is genuinely cheap here: the drop
 * rates and the notable-item list are both `unstable_cache`d and shared by
 * every player, so hydrating them into the query cache costs a cache read and
 * saves the browser two round trips. Their query hooks call the server
 * functions directly and rely on this seeding — do not remove it.
 */
export default async function RankCalculatorPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { player } = await params;
  const decodedPlayer = decodeURIComponent(player);

  Sentry.setTag('rsn', decodedPlayer);

  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('No user session');
  }

  const [dropRates, viewer] = await Promise.all([
    fetchItemDropRates([...generateRequiredItemList()]),
    fetchSessionContext(),
  ]);

  const notableItemList = await buildNotableItemList(dropRates);

  const queryClient = new QueryClient();

  queryClient.setQueryData(['drop-rates'], dropRates);
  queryClient.setQueryData(['items'], Object.entries(notableItemList));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CalculatorLoader playerName={decodedPlayer} session={viewer} />
    </HydrationBoundary>
  );
}
