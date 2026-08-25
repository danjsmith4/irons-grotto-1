/**
 * Flattens a `next-safe-action` validation-error tree into one readable string.
 *
 * ⚠️ **This exists because a generic fallback hid a real message.** Onboarding
 * used to check the two fields it expected to fail — the player name and the
 * GIM group name — and send everything else to "Something went wrong setting up
 * your account." When a stale `joinDate` ceiling started rejecting every
 * signup, the server was saying exactly what was wrong and the player was shown
 * a shrug.
 *
 * So: read whatever the server refused, whichever field it came from. A message
 * a player cannot act on is barely better than no message, and a field this
 * function does not know about is precisely the case where the generic text is
 * least useful.
 *
 * Handles both shapes zod produces here — a root `_errors` array, and per-field
 * `{ _errors: string[] }` objects.
 */
export function collectValidationErrors(
  errors: Record<string, unknown> | undefined | null,
): string | null {
  if (!errors) {
    return null;
  }

  const asMessages = (value: unknown) =>
    Array.isArray(value)
      ? value.filter((entry): entry is string => typeof entry === 'string')
      : [];

  const messages = Object.values(errors).flatMap((value) => {
    if (Array.isArray(value)) {
      return asMessages(value);
    }

    if (value && typeof value === 'object' && '_errors' in value) {
      return asMessages((value as { _errors?: unknown })._errors);
    }

    return [];
  });

  return messages.length > 0 ? messages.join(' ') : null;
}
