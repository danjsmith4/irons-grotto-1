/**
 * "in 3 days", "in 5 hours", "2 hours ago" — coarse on purpose. The exact
 * instant is on Temple; what a reader wants is whether there is still time.
 *
 * Shared by the nav bar's event indicator and the homepage's event strip so
 * the same event never describes itself two different ways on two pages.
 */
export function formatEventWhen(iso: string): string {
  const target = new Date(iso).getTime();
  const deltaMinutes = Math.round((target - Date.now()) / 60_000);
  const absolute = Math.abs(deltaMinutes);

  const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (absolute < 60) {
    return relative.format(deltaMinutes, 'minute');
  }

  if (absolute < 60 * 24) {
    return relative.format(Math.round(deltaMinutes / 60), 'hour');
  }

  return relative.format(Math.round(deltaMinutes / (60 * 24)), 'day');
}
