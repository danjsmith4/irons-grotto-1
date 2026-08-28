import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MaggotKingSpeedChaser } from './maggot-king-speed-chaser';

/**
 * The stat tiles are queried by their `aria-label`, which is the lowercased
 * label shown above each figure. Renaming a label renames the query.
 */
function statValue(label: string) {
  return screen.getByLabelText(label).textContent;
}

function killField() {
  return screen.getByLabelText('Kill time');
}

/** Types a time into the single entry field without committing it. */
function type(time: string) {
  act(() => {
    fireEvent.change(killField(), { target: { value: time } });
  });
}

/** Types a time and commits it as a split. */
function logKill(time: string) {
  type(time);

  act(() => {
    fireEvent.click(screen.getByRole('button', { name: 'Log kill' }));
  });
}

describe('<MaggotKingSpeedChaser />', () => {
  beforeEach(() => {
    render(<MaggotKingSpeedChaser />);
  });

  it('offers the whole budget at the flat pace before anything is logged', () => {
    expect(statValue('time used')).toBe('00:00.0');
    expect(statValue('time left')).toBe('09:00.0');
    expect(statValue('need per kill')).toBe('01:48.0');
    expect(statValue('banked')).toBe('+00:00.0');
  });

  it('asks for one kill at a time and advances as each is committed', () => {
    expect(screen.getByText('Kill 1 of 5')).toBeInTheDocument();

    logKill('1:30.0');

    expect(screen.getByText('Kill 2 of 5')).toBeInTheDocument();
    // The field is cleared for the next one rather than holding the last.
    expect(killField()).toHaveValue('');
  });

  it('re-averages the remaining kills as splits are committed', () => {
    logKill('1:30.0');

    expect(statValue('time used')).toBe('01:30.0');
    expect(statValue('time left')).toBe('07:30.0');
    // 750 ticks over four kills is 187.5 each, floored to a whole 187.
    expect(statValue('need per kill')).toBe('01:52.2');
    expect(statValue('banked')).toBe('+00:18.0');

    // A slow one: 220 ticks, putting the attempt behind the flat pace.
    logKill('2:12.0');

    expect(statValue('time used')).toBe('03:42.0');
    expect(statValue('time left')).toBe('05:18.0');
    expect(statValue('banked')).toBe('-00:06.0');
  });

  it('previews the tick a time will be scored as before it is committed', () => {
    // 1:42.5 is not a time the game can produce; 1:42.6 (171 ticks) is.
    type('1:42.5');

    expect(screen.getByText('01:42.6')).toBeInTheDocument();
    expect(screen.getByText(/171 ticks/)).toBeInTheDocument();
    // Still uncommitted — nothing has been spent.
    expect(statValue('time used')).toBe('00:00.0');
  });

  it('commits a split that can no longer be edited', () => {
    logKill('1:36.0');

    // The split is on the board (the same figure is also in the scoreboard,
    // so this looks inside the splits list specifically)...
    expect(
      within(screen.getByRole('list')).getByText('01:36.0'),
    ).toBeInTheDocument();
    // ...and the only field on the page is the next kill's, which is empty.
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    expect(killField()).toHaveValue('');
  });

  it('refuses an unreadable time and spends nothing', () => {
    logKill('oops');

    expect(screen.getByText('Use m:ss.t')).toBeInTheDocument();
    expect(statValue('time used')).toBe('00:00.0');
    expect(screen.getByText('Kill 1 of 5')).toBeInTheDocument();
  });

  it('closes the entry once five kills are in', () => {
    // 150 ticks each — five of them is 07:30.0, well inside the budget.
    logKill('1:30.0');
    logKill('1:30.0');
    logKill('1:30.0');
    logKill('1:30.0');
    logKill('1:30.0');

    expect(statValue('time used')).toBe('07:30.0');
    expect(screen.getByRole('status').textContent).toContain('Task complete');
    expect(screen.queryByLabelText('Kill time')).not.toBeInTheDocument();
  });

  it('closes the entry once the kills still to come cannot fit', () => {
    logKill('2:15.0');
    logKill('2:15.0');
    logKill('2:15.0');
    logKill('2:15.0');

    expect(statValue('time left')).toBe('00:00.0');
    expect(screen.getByRole('status').textContent).toContain('Out of time');
    expect(screen.queryByLabelText('Kill time')).not.toBeInTheDocument();
  });

  it('reopens the entry on reset — the only way back out of a committed split', () => {
    logKill('2:15.0');
    logKill('2:15.0');
    logKill('2:15.0');
    logKill('2:15.0');

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    });

    expect(statValue('time used')).toBe('00:00.0');
    expect(screen.getByText('Kill 1 of 5')).toBeInTheDocument();
    expect(killField()).toHaveValue('');
  });

  it('leaves reset disabled while there is nothing to reset', () => {
    expect(screen.getByRole('button', { name: /reset/i })).toBeDisabled();

    logKill('1:30.0');

    expect(screen.getByRole('button', { name: /reset/i })).toBeEnabled();
  });
});
