import { existsSync } from 'fs';
import { join } from 'path';
import { APIButtonComponentWithURL } from 'discord-api-types/v10';
import { StandardRank } from '@/config/ranks';
import { buildRankUpMessage, RankUpMessageInput } from './build-rank-up-message';

const input = {
  playerName: 'Iron Man',
  heldRank: 'Captain',
  newRank: 'General',
  totalPoints: 16040,
  pointsGained: 156,
  nextRank: 'Skulled',
  publicUrl: 'https://ironsgrotto.xyz',
  sentAt: new Date('2026-09-11T12:00:00Z'),
} satisfies RankUpMessageInput;

function render(overrides: Partial<RankUpMessageInput> = {}) {
  const message = buildRankUpMessage({ ...input, ...overrides });
  const [embed] = message.embeds ?? [];
  const [row] = message.components ?? [];
  const [button] = (row as { components: APIButtonComponentWithURL[] })
    .components;

  return {
    embed,
    button,
    field: (name: string) =>
      embed.fields?.find((field) => field.name === name)?.value,
  };
}

describe('buildRankUpMessage', () => {
  it('names the rank and the account it was earned on', () => {
    const { embed } = render();

    expect(embed.title).toBe('Rank up: General');
    expect(embed.description).toContain('**Iron Man**');
    expect(embed.description).toContain('**16,000 points**');
  });

  it('shows the move from the held rank', () => {
    expect(render().field('Rank')).toBe('Captain → **General**');
  });

  it('shows the total and what the refresh added', () => {
    expect(render().field('Points')).toBe('16,040 (+156)');
  });

  it('leaves the gain off when there is nothing to compare against', () => {
    expect(render({ pointsGained: undefined }).field('Points')).toBe('16,040');
  });

  it('counts down to the next rank', () => {
    expect(render().field('Next up')).toBe('Skulled · 2,960 to go');
  });

  it('says so at the top of the ladder', () => {
    expect(
      render({ newRank: 'Beast', nextRank: null, totalPoints: 24500 }).field(
        'Next up',
      ),
    ).toBe('Top of the ladder');
  });

  // The 13px originals render as a speck at thumbnail size.
  it('uses the enlarged rank icon', () => {
    expect(render().embed.thumbnail?.url).toBe(
      'https://ironsgrotto.xyz/icons/large/general.png',
    );
  });

  // Generated once from `public/icons` (6x, nearest-neighbour). A rank added to
  // the ladder without one sends a message with a broken image.
  it.each(StandardRank.options)('has an enlarged icon for %s', (rank) => {
    expect(
      existsSync(
        join(__dirname, '../../../public/icons/large', `${rank.toLowerCase()}.png`),
      ),
    ).toBe(true);
  });

  it('links to the account’s calculator, encoding the name', () => {
    const { embed, button } = render();

    expect(button.url).toBe('https://ironsgrotto.xyz/player/Iron%20Man');
    expect(button.label).toBe('Apply for General');
    expect(embed.url).toBe(button.url);
  });

  it('resolves against an origin given with a trailing slash', () => {
    expect(
      render({ publicUrl: 'https://ironsgrotto.xyz/' }).button.url,
    ).toBe('https://ironsgrotto.xyz/player/Iron%20Man');
  });
});
