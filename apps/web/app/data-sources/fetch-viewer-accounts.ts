import { auth } from '@/auth';
import { getPlayersByDiscordId } from '@/lib/db/player-operations';

export interface ViewerAccount {
  playerName: string;
  rank: string;
  points: number;
}

/**
 * The signed-in user's own accounts, for the profile comparison's picker.
 *
 * Members routinely have more than one, so the comparison has to be told which
 * of them "you" means. Signed out is a legitimate answer, not an error — the
 * homepage and leaderboard are public and the profile modal opens there too,
 * so the Compare tab is simply absent.
 */
export async function fetchViewerAccounts(): Promise<
  | { success: true; data: { accounts: ViewerAccount[] } }
  | { success: false; error: string }
> {
  try {
    const session = await auth();
    const discordUserId = session?.user?.id;

    if (!discordUserId) {
      return { success: true, data: { accounts: [] } };
    }

    const accounts = await getPlayersByDiscordId(discordUserId);

    return {
      success: true,
      data: {
        accounts: accounts
          .map(({ playerName, rank, points }) => ({
            playerName,
            rank,
            points: Math.round(points),
          }))
          .sort((a, b) => b.points - a.points),
      },
    };
  } catch (error) {
    console.error('Failed to fetch viewer accounts:', error);

    return { success: false, error: String(error) };
  }
}
