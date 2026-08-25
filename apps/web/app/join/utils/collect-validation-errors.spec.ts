import { collectValidationErrors } from './collect-validation-errors';

describe('collectValidationErrors', () => {
  it('is null when there is nothing to report', () => {
    expect(collectValidationErrors(undefined)).toBeNull();
    expect(collectValidationErrors(null)).toBeNull();
    expect(collectValidationErrors({})).toBeNull();
  });

  it('reads a single field error', () => {
    expect(
      collectValidationErrors({
        playerName: { _errors: ['You have already registered this account'] },
      }),
    ).toBe('You have already registered this account');
  });

  it('reads a field nobody anticipated', () => {
    // The whole point: a field this function has never heard of still reaches
    // the player, instead of being swallowed by a generic message.
    expect(
      collectValidationErrors({
        joinDate: { _errors: ['Your join date cannot be in the future.'] },
      }),
    ).toBe('Your join date cannot be in the future.');
  });

  it('reads root-level errors', () => {
    expect(
      collectValidationErrors({ _errors: ['Something is off with this form'] }),
    ).toBe('Something is off with this form');
  });

  it('joins several errors into one line', () => {
    expect(
      collectValidationErrors({
        playerName: { _errors: ['Invalid player name'] },
        joinDate: { _errors: ['Your join date cannot be in the future.'] },
      }),
    ).toBe('Invalid player name Your join date cannot be in the future.');
  });

  it('ignores fields with an empty error list', () => {
    expect(
      collectValidationErrors({
        playerName: { _errors: [] },
        joinDate: { _errors: ['Your join date cannot be in the future.'] },
      }),
    ).toBe('Your join date cannot be in the future.');
  });

  it('survives a shape it does not recognise', () => {
    expect(
      collectValidationErrors({
        weird: 'not an error tree',
        alsoWeird: { nested: { _errors: ['too deep'] } },
        good: { _errors: ['this one counts'] },
      }),
    ).toBe('this one counts');
  });
});
