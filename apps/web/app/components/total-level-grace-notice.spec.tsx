import { render, screen } from '@testing-library/react';
import { totalLevelGraceDeadline } from '@/config/clan-requirements';
import { hasAccountsBelowMinimum } from '@/app/utils/resolve-total-level-grace';
import { TotalLevelGraceNotice } from './total-level-grace-notice';

const wellBefore = new Date(
  totalLevelGraceDeadline.getTime() - 30 * 24 * 60 * 60 * 1000,
);
const after = new Date(totalLevelGraceDeadline.getTime() + 24 * 60 * 60 * 1000);

describe('TotalLevelGraceNotice', () => {
  it('renders nothing when every account is above the minimum', () => {
    const { container } = render(
      <TotalLevelGraceNotice
        accounts={[{ totalLevel: 2000 }, { totalLevel: 1500 }]}
        now={wellBefore}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when there are no accounts at all', () => {
    const { container } = render(
      <TotalLevelGraceNotice accounts={[]} now={wellBefore} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('explains the deadline once and lists every short account under it', () => {
    render(
      <TotalLevelGraceNotice
        accounts={[
          { playerName: 'Riftletics', totalLevel: 1342 },
          { playerName: 'Clogging', totalLevel: 900 },
        ]}
        now={wellBefore}
      />,
    );

    // One notice, not one per account: the deadline is a single clan-wide date
    // and repeating the whole paragraph per account is what this shape avoids.
    expect(screen.getAllByRole('note')).toHaveLength(1);
    expect(screen.getAllByText(/to get there/i)).toHaveLength(1);

    expect(screen.getByText('Riftletics')).toBeInTheDocument();
    expect(screen.getByText('Clogging')).toBeInTheDocument();

    // Each account reads as a ratio: where they are over what they need.
    expect(
      screen.getByText((_, node) => node?.textContent === '1,342 / 1,500'),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, node) => node?.textContent === '900 / 1,500'),
    ).toBeInTheDocument();
  });

  it('leaves out the accounts that are fine', () => {
    render(
      <TotalLevelGraceNotice
        accounts={[
          { playerName: 'Riftletics', totalLevel: 1342 },
          { playerName: 'Maxed Main', totalLevel: 2277 },
        ]}
        now={wellBefore}
      />,
    );

    expect(screen.getByText('Riftletics')).toBeInTheDocument();
    expect(screen.queryByText('Maxed Main')).not.toBeInTheDocument();
  });

  it('never says a member has been removed once the deadline passes', () => {
    render(
      <TotalLevelGraceNotice accounts={[{ totalLevel: 1342 }]} now={after} />,
    );

    // Overdue changes the wording and nothing else. Nothing in the app removes
    // anybody, and the copy must not imply that it has.
    expect(
      screen.getByText(/have a word with a moderator/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/removed|kicked/i)).not.toBeInTheDocument();
  });
});

describe('hasAccountsBelowMinimum', () => {
  it('matches what the notice decides to render', () => {
    // The call sites use this to avoid wrapping an empty notice in layout that
    // still takes a gap, so the two must never disagree.
    expect(hasAccountsBelowMinimum([{ totalLevel: 2000 }])).toBe(false);
    expect(hasAccountsBelowMinimum([])).toBe(false);
    expect(
      hasAccountsBelowMinimum([{ totalLevel: 2000 }, { totalLevel: 1342 }]),
    ).toBe(true);
  });
});
