import { eq, inArray, sql } from 'drizzle-orm';
import { db } from './index';
import { playerDerivedItems } from './schema';

/**
 * Records what a source last said about the notable items nothing logs.
 *
 * **Only ever call this when the deriving source actually answered.** Writing
 * a screenful of `false` after a failed WikiSync read is precisely the bug
 * this table exists to prevent: it would turn "we could not ask" into "they do
 * not have it", and then the floor underneath the next sync would be a lie
 * rather than a missing row.
 *
 * Upserts rather than replacing the set. An item absent from `answers` keeps
 * whatever was last known about it, which matters when the item list gains an
 * entry that older rows have never been asked about.
 */
export async function syncDerivedItems(
  playerName: string,
  answers: Record<string, boolean>,
): Promise<number> {
  const rows = Object.entries(answers).map(([itemName, isAcquired]) => ({
    playerName,
    itemName,
    isAcquired,
  }));

  if (rows.length === 0) {
    return 0;
  }

  await db
    .insert(playerDerivedItems)
    .values(rows)
    .onConflictDoUpdate({
      target: [playerDerivedItems.playerName, playerDerivedItems.itemName],
      set: {
        isAcquired: sql`excluded.is_acquired`,
        updatedAt: new Date(),
      },
    });

  return rows.length;
}

/**
 * What was last known about one player's unlogged items.
 *
 * A missing key means the source has never been read for that item — not that
 * the player lacks it. Callers must treat absence and `false` differently.
 */
export async function getDerivedItems(
  playerName: string,
): Promise<Record<string, boolean>> {
  try {
    const rows = await db
      .select({
        itemName: playerDerivedItems.itemName,
        isAcquired: playerDerivedItems.isAcquired,
      })
      .from(playerDerivedItems)
      .where(eq(playerDerivedItems.playerName, playerName));

    return rows.reduce<Record<string, boolean>>(
      (acc, { itemName, isAcquired }) => ({ ...acc, [itemName]: isAcquired }),
      {},
    );
  } catch (error) {
    // An empty map is "we know nothing", which is a value every caller already
    // handles — it is the state every player is in before their first sync.
    //
    // Swallowed rather than thrown because this read sits on the calculator's
    // load path: between merging this and running the migration the table does
    // not exist, and a safety net that can take down the page it protects is
    // worse than no net. Degrades to the behaviour that shipped before it.
    console.error('Failed to read derived items, continuing without:', error);

    return {};
  }
}

/**
 * The same, for several players at once — the profile comparison scores two
 * members side by side and should not issue a query per member to do it.
 */
export async function getDerivedItemsForPlayers(
  playerNames: string[],
): Promise<Record<string, Record<string, boolean>>> {
  if (playerNames.length === 0) {
    return {};
  }

  const rows = await db
    .select({
      playerName: playerDerivedItems.playerName,
      itemName: playerDerivedItems.itemName,
      isAcquired: playerDerivedItems.isAcquired,
    })
    .from(playerDerivedItems)
    .where(inArray(playerDerivedItems.playerName, playerNames));

  return rows.reduce<Record<string, Record<string, boolean>>>(
    (acc, { playerName, itemName, isAcquired }) => ({
      ...acc,
      [playerName]: { ...acc[playerName], [itemName]: isAcquired },
    }),
    {},
  );
}

/**
 * Deletes a player's rows. Called from `deletePlayer` alongside the other
 * per-player tables, and from the rename path so the answers follow the name.
 */
export async function deleteDerivedItems(playerName: string): Promise<void> {
  await db
    .delete(playerDerivedItems)
    .where(eq(playerDerivedItems.playerName, playerName));
}
