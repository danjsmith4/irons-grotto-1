import { auth } from '@/auth';
import { getPlayersByDiscordId } from '@/lib/db/player-operations';
import { Rank } from '@/config/enums';

export async function fetchPlayerAccounts() {
  const session = await auth();

  if (!session?.user?.id) {
    return {};
  }

  const players = await getPlayersByDiscordId(session.user.id);

  // Convert to the expected format that components are expecting
  // This maintains compatibility with existing code that expects this structure
  return players.reduce(
    (acc, player) => {
      return {
        ...acc,
        [player.playerName.toLowerCase()]: {
          joinDate: new Date(player.joinDate),
          rank: player.rank as Rank,
          rsn: player.playerName,
          isMobileOnly: player.isMobileOnly,
          // For the minimum-total-level notice on the dashboard, so a member
          // below the line hears about it without opening their rank sheet.
          totalLevel: player.totalLevel,
        },
      };
    },
    {} as Record<
      string,
      {
        joinDate: Date;
        rank?: Rank;
        rsn: string;
        isMobileOnly: boolean;
        totalLevel: number;
        isNameInvalid?: true;
      }
    >,
  );
}
