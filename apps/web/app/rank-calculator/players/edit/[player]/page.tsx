import * as Sentry from '@sentry/nextjs';
import { list } from '@vercel/blob';
import { ClanMemberList } from '@/app/schemas/inactivity-checker';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { EditPlayerForm } from './edit-player-form';
import { getPlayerByName } from '@/lib/db/player-operations';
import { Rank } from '@/config/enums';

async function getLatestMemberList() {
  const blobList = await list();
  const [{ url }] = blobList.blobs.sort(
    (a, b) => +b.uploadedAt - +a.uploadedAt,
  );

  try {
    const response = await fetch(url);
    const data = ClanMemberList.parse(await response.json());

    return data.map(({ rsn }) => rsn);
  } catch (error) {
    Sentry.captureException(error);

    return [];
  }
}

export default async function RankCalculatorEditPlayerPage({
  params,
}: {
  params: Promise<{ player: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/dashboard');
  }

  const { player } = await params;
  const playerRecord = await getPlayerByName(
    decodeURIComponent(player),
    session.user.id,
  );

  if (!playerRecord) {
    redirect('/dashboard');
  }

  const memberList = await getLatestMemberList();

  // Convert database Player type to the format expected by the form
  const playerRecordForForm = {
    joinDate: new Date(playerRecord.joinDate),
    rsn: playerRecord.playerName,
    rank: playerRecord.rank as Rank, // Cast to handle Rank enum compatibility
    isMobileOnly: playerRecord.isMobileOnly,
  };

  return (
    <EditPlayerForm members={memberList} playerRecord={playerRecordForForm} />
  );
}
