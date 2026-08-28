import { act, fireEvent, render, screen } from '@testing-library/react';
import { MaggotKingSpeedChaser } from './maggot-king-speed-chaser';

/**
 * The stat tiles are queried by their `aria-label`, which is the lowercased
 * label shown above each figure. Renaming a label renames the query.
 */
function statValue(label: string) {
  return screen.getByLabelText(label).textContent;
}

function logKill(index: number, time: string) {
  act(() => {
    fireEvent.change(screen.getByLabelText(`Kill ${index} time`), {
      target: { value: time },
    });
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

  it('re-averages the remaining kills as times are logged', () => {
    logKill(1, '1:30.0');

    expect(statValue('time used')).toBe('01:30.0');
    expect(statValue('time left')).toBe('07:30.0');
    // 750 ticks over four kills is 187.5 each, floored to a whole 187.
    expect(statValue('need per kill')).toBe('01:52.2');
    expect(statValue('banked')).toBe('+00:18.0');

    // A slow one: 220 ticks, putting the attempt behind the flat pace.
    logKill(2, '2:12.0');

    expect(statValue('time used')).toBe('03:42.0');
    expect(statValue('time left')).toBe('05:18.0');
    expect(statValue('banked')).toBe('-00:06.0');
  });

  it('echoes each kill back snapped to the tick it was scored as', () => {
    // 1:42.5 is not a time the game can produce; 1:42.6 (171 ticks) is.
    logKill(1, '1:42.5');

    // The same figure also lands in the scoreboard and the verdict.
    expect(screen.getAllByText('01:42.6').length).toBeGreaterThan(0);
    expect(screen.getByText('171 ticks')).toBeInTheDocument();
  });

  it('reports what is left rather than a bare pass/fail', () => {
    logKill(1, '1:30.0');

    expect(
      screen.getByRole('status').textContent?.replace(/\s+/g, ' '),
    ).toContain('07:30.0 left for 4 kills — average 01:52.2 each from here.');
  });

  it('calls the attempt off once the remaining kills cannot fit', () => {
    logKill(1, '2:15.0');
    logKill(2, '2:15.0');
    logKill(3, '2:15.0');
    logKill(4, '2:15.0');

    expect(statValue('time left')).toBe('00:00.0');
    expect(screen.getByRole('status').textContent).toContain('Out of time');
  });

  it('reports a completed attempt with the time to spare', () => {
    // 150 ticks each — five of them is 07:30.0, well inside the budget.
    logKill(1, '1:30.0');
    logKill(2, '1:30.0');
    logKill(3, '1:30.0');
    logKill(4, '1:30.0');
    logKill(5, '1:30.0');

    expect(statValue('time used')).toBe('07:30.0');
    expect(statValue('need per kill')).toBe('—');
    expect(screen.getByRole('status').textContent).toContain('Task complete');
    expect(screen.getByRole('status').textContent).toContain('01:30.0');
  });

  it('flags an unreadable time without scoring it', () => {
    logKill(1, 'oops');

    expect(screen.getByText('Use m:ss.t')).toBeInTheDocument();
    expect(statValue('time used')).toBe('00:00.0');
  });

  it('clears the attempt on reset', () => {
    logKill(1, '1:30.0');

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    });

    expect(statValue('time used')).toBe('00:00.0');
    expect(screen.getByLabelText('Kill 1 time')).toHaveValue('');
  });
});
