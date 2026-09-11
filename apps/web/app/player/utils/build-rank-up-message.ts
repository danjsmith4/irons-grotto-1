import {
  ButtonStyle,
  ComponentType,
  RESTPostAPIChannelMessageJSONBody,
} from 'discord-api-types/v10';
import { Rank } from '@/config/enums';
import { rankThresholds } from '@/config/ranks';
import { getRankName } from './get-rank-name';
import { formatNumber } from './format-number';

/**
 * `--ig-secondary`, the site's green accent. Discord takes an embed colour as
 * a number, so it cannot read the token — keep the two in step by hand.
 */
const embedColour = 0x35d29a;

export interface RankUpMessageInput {
  playerName: string;
  /** The rank they hold today — where the arrow starts. */
  heldRank: Rank | null | undefined;
  newRank: Rank;
  totalPoints: number;
  /** What this refresh added. Omitted when there is no earlier score to compare. */
  pointsGained?: number;
  nextRank: Rank | null;
  /** The site's origin — links and images are resolved against it. */
  publicUrl: string;
  sentAt: Date;
}

/**
 * The DM a member gets when a refresh pushes them over a rank threshold.
 *
 * Pure, so the whole message can be read (and spec'd) without Discord.
 *
 * The rank icons are the 6x nearest-neighbour copies in `public/icons/large`.
 * The originals are 13px, and Discord shows a thumbnail at its own size rather
 * than scaling it up, so the badge — the thing the message is about — would
 * render as a speck in the corner.
 */
export function buildRankUpMessage({
  playerName,
  heldRank,
  newRank,
  totalPoints,
  pointsGained,
  nextRank,
  publicUrl,
  sentAt,
}: RankUpMessageInput): RESTPostAPIChannelMessageJSONBody {
  const rankName = getRankName(newRank);
  const calculatorUrl = new URL(
    `/player/${encodeURIComponent(playerName)}`,
    publicUrl,
  ).toString();
  const nextRankThreshold = nextRank ? rankThresholds[nextRank] : undefined;

  const points =
    pointsGained && pointsGained > 0
      ? `${formatNumber(totalPoints)} (+${formatNumber(pointsGained)})`
      : formatNumber(totalPoints);

  const nextUp =
    nextRank && nextRankThreshold !== undefined
      ? `${getRankName(nextRank)} · ${formatNumber(Math.max(nextRankThreshold - totalPoints, 0))} to go`
      : 'Top of the ladder';

  return {
    embeds: [
      {
        color: embedColour,
        author: {
          name: "Irons' Grotto",
          icon_url: new URL('/L1.png', publicUrl).toString(),
        },
        title: `Rank up: ${rankName}`,
        url: calculatorUrl,
        description: [
          `Hey **${playerName}**, you are now eligible for **${rankName}**!`,
          'Apply from your rank calculator to claim it.',
        ].join('\n\n'),
        thumbnail: {
          url: new URL(
            `/icons/large/${newRank.replaceAll(' ', '_').toLowerCase()}.png`,
            publicUrl,
          ).toString(),
        },
        fields: [
          {
            name: 'Rank',
            value: heldRank
              ? `${getRankName(heldRank)} → **${rankName}**`
              : `**${rankName}**`,
            inline: true,
          },
          { name: 'Points', value: points, inline: true },
          { name: 'Next up', value: nextUp, inline: true },
        ],
        footer: { text: 'Spotted in your latest TempleOSRS update' },
        timestamp: sentAt.toISOString(),
      },
    ],
    components: [
      {
        type: ComponentType.ActionRow,
        components: [
          {
            type: ComponentType.Button,
            style: ButtonStyle.Link,
            label: `Apply for ${rankName}`,
            url: calculatorUrl,
          },
        ],
      },
    ],
  };
}
