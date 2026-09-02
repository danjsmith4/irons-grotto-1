import { render, screen, waitFor } from '@testing-library/react';
import type { ClanEventSummary } from '@/app/data-sources/fetch-clan-event-status';
import { ClanEventHighlight } from './clan-event-highlight';

const hour = 60 * 60 * 1000;

const botw: ClanEventSummary = {
  id: 38899,
  type: 'botw',
  typeLabel: 'Boss of the Week',
  // Temple's stored name, flattened and truncated — exactly as it comes back.
  name: 'Theatre Of Blood Hard Mode Bot',
  metricName: 'Theatre of Blood Hard Mode',
  icon: 'Theatre_of_Blood_logo',
  startsAt: new Date(Date.now() - 24 * hour).toISOString(),
  endsAt: new Date(Date.now() + 48 * hour).toISOString(),
};

const sotw: ClanEventSummary = {
  ...botw,
  id: 38933,
  type: 'sotw',
  typeLabel: 'Skill of the Week',
  name: 'Runecraft Sotw',
  metricName: 'Runecraft',
  icon: 'Runecraft_icon',
  startsAt: new Date(Date.now() + 72 * hour).toISOString(),
  endsAt: new Date(Date.now() + 144 * hour).toISOString(),
};

const fetchMock = jest.fn<Promise<unknown>, [string, unknown]>();

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue({
    json: () =>
      Promise.resolve({
        success: true,
        data: { active: { ...botw, participantCount: 278 }, next: null },
      }),
  });

  global.fetch = fetchMock as unknown as typeof global.fetch;
});

describe('ClanEventHighlight', () => {
  /**
   * The homepage runs a week in eight, so the strip has to be absent rather
   * than empty — a permanent slot saying "no event" is the noise this is
   * meant to avoid.
   */
  it('renders nothing when no event is running or queued', () => {
    const { container } = render(
      <ClanEventHighlight events={{ active: null, next: null }} />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('names the running event by its metric and says when it ends', () => {
    render(<ClanEventHighlight events={{ active: botw, next: sotw }} />);

    expect(screen.getByText('Running now')).toBeVisible();
    expect(screen.getByText('Theatre of Blood Hard Mode')).toBeVisible();
    expect(screen.getByText(/Ends in 2 days/)).toBeVisible();
  });

  /**
   * ⚠️ Not `name`. Temple rewrites what it stores, so this event's own name
   * comes back truncated to "…Hard Mode Bot" — fine as a record of what is on
   * Temple, not something to read out to a screen reader.
   */
  it('labels itself from the metric, not from the name Temple stored', () => {
    render(<ClanEventHighlight events={{ active: botw, next: null }} />);

    expect(
      screen.getByLabelText(
        'Boss of the Week: Theatre of Blood Hard Mode is running now',
      ),
    ).toBeVisible();
  });

  it('fills in the entrant count once it arrives', async () => {
    render(<ClanEventHighlight events={{ active: botw, next: null }} />);

    expect(screen.queryByText(/competing/)).not.toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByText(/278 competing/)).toBeVisible(),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/clan-events/public',
      expect.anything(),
    );
  });

  /**
   * The count is one clause of a sentence; the event is the whole point of the
   * strip. Temple being unreachable must cost the former and never the latter.
   */
  it('still shows the event when the count cannot be loaded', async () => {
    jest.spyOn(console, 'error').mockImplementationOnce(jest.fn);
    fetchMock.mockRejectedValue(new Error('offline'));

    render(<ClanEventHighlight events={{ active: botw, next: null }} />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    expect(screen.getByText('Theatre of Blood Hard Mode')).toBeVisible();
    expect(screen.queryByText(/competing/)).not.toBeInTheDocument();
  });

  /**
   * A queued event has no entrants and no standings, so there is nothing to
   * ask Temple for — and between events the upcoming one is the better sell
   * anyway, since it is an invitation rather than a scoreboard.
   */
  it('falls back to the queued event without calling the endpoint', () => {
    render(<ClanEventHighlight events={{ active: null, next: sotw }} />);

    expect(screen.getByText('Up next')).toBeVisible();
    expect(screen.getByText('Runecraft')).toBeVisible();
    expect(screen.getByText(/Starts in 3 days/)).toBeVisible();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
