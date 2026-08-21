import { eq } from 'drizzle-orm';
import { db } from './index';
import { playerItemOverrides } from './schema';

export interface ItemOverrideSync {
  /** Items the data sources account for on their own. */
  derived: Iterable<string>;
  /** What the player's sheet actually says, keyed the way the form keys it. */
  submitted: Record<string, boolean>;
}

/**
 * Splits a player's answers into the ones the sources already explain and the
 * ones only the player is asserting.
 *
 * Pure, so the rule is testable without a database. An override is stored only
 * where the two disagree:
 *
 * | derived | submitted | meaning                    | stored |
 * |---------|-----------|----------------------------|--------|
 * | no      | yes       | a claim nothing backs up   | `true` |
 * | yes     | no        | an explicit untick         | `false`|
 * | yes     | yes       | sources agree              | —      |
 * | no      | no        | nothing to say             | —      |
 *
 * The two "—" rows are what makes this self-healing: when Temple catches up on
 * a claimed item, the disagreement disappears and the row goes with it.
 */
export function diffItemOverrides({ derived, submitted }: ItemOverrideSync) {
  const derivedSet = new Set(derived);
  const overrides: { itemName: string; isAcquired: boolean }[] = [];

  // A claim the sources do not account for.
  Object.entries(submitted).forEach(([itemName, isAcquired]) => {
    if (isAcquired && !derivedSet.has(itemName)) {
      overrides.push({ itemName, isAcquired: true });
    }
  });

  // An explicit untick of something a source *does* report. `submitted` only
  // carries truthy keys once the schema's `pickBy` has run, so absence is the
  // untick.
  derivedSet.forEach((itemName) => {
    if (!submitted[itemName]) {
      overrides.push({ itemName, isAcquired: false });
    }
  });

  return overrides;
}

/**
 * Brings a player's stored overrides in line with their sheet.
 *
 * Replaces the whole set rather than patching it, because the set is small
 * (most members override nothing) and a partial update would leave rows behind
 * for items that have since been explained by a source — which is exactly the
 * drift this table is meant not to accumulate.
 */
export async function syncItemOverrides(
  playerName: string,
  input: ItemOverrideSync,
): Promise<number> {
  const overrides = diffItemOverrides(input);

  await db.transaction(async (tx) => {
    // Delete-then-insert rather than a diffed upsert. The set is small — most
    // members override nothing — and doing it wholesale is what guarantees no
    // row survives for an item a source has since explained.
    await tx
      .delete(playerItemOverrides)
      .where(eq(playerItemOverrides.playerName, playerName));

    if (overrides.length > 0) {
      await tx.insert(playerItemOverrides).values(
        overrides.map(({ itemName, isAcquired }) => ({
          playerName,
          itemName,
          isAcquired,
        })),
      );
    }
  });

  return overrides.length;
}

/**
 * A player's stored overrides, as the form keys them.
 */
export async function getItemOverrides(
  playerName: string,
): Promise<Record<string, boolean>> {
  const rows = await db
    .select({
      itemName: playerItemOverrides.itemName,
      isAcquired: playerItemOverrides.isAcquired,
    })
    .from(playerItemOverrides)
    .where(eq(playerItemOverrides.playerName, playerName));

  return rows.reduce<Record<string, boolean>>(
    (acc, { itemName, isAcquired }) => ({ ...acc, [itemName]: isAcquired }),
    {},
  );
}
