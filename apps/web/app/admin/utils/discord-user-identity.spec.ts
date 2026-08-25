import type { APIUser } from 'discord-api-types/v10';
import {
  buildBanAuditReason,
  describeDiscordUser,
  isDiscordSnowflake,
} from './discord-user-identity';

const user = (overrides: Partial<APIUser> = {}) =>
  ({
    id: '80351110224678912',
    username: 'nelly',
    global_name: null,
    discriminator: '0',
    avatar: null,
    ...overrides,
  }) as APIUser;

describe('describeDiscordUser', () => {
  it('prefers the server nickname over every other name', () => {
    expect(
      describeDiscordUser(user({ global_name: 'Nelly' }), 'Zezima'),
    ).toMatchObject({ displayName: 'Zezima' });
  });

  it('falls back to the display name, then the username', () => {
    expect(describeDiscordUser(user({ global_name: 'Nelly' }))).toMatchObject({
      displayName: 'Nelly',
    });

    expect(describeDiscordUser(user())).toMatchObject({ displayName: 'nelly' });
  });

  it('treats an empty nickname as no nickname', () => {
    expect(
      describeDiscordUser(user({ global_name: 'Nelly' }), ''),
    ).toMatchObject({ displayName: 'Nelly' });
  });

  it('renders a migrated account as an @handle', () => {
    expect(describeDiscordUser(user())).toMatchObject({ handle: '@nelly' });
  });

  it('keeps the discriminator on a legacy account', () => {
    expect(describeDiscordUser(user({ discriminator: '1337' }))).toMatchObject({
      handle: 'nelly#1337',
    });
  });
});

describe('isDiscordSnowflake', () => {
  it.each(['80351110224678912', ' 1301172323742781524 '])(
    'accepts %s',
    (value) => {
      expect(isDiscordSnowflake(value)).toBe(true);
    },
  );

  it.each(['', 'nelly', '12345', '803511102246789123456', '8035111022467891a'])(
    'rejects %s',
    (value) => {
      expect(isDiscordSnowflake(value)).toBe(false);
    },
  );
});

describe('buildBanAuditReason', () => {
  it('attributes the ban to the moderator who placed it', () => {
    expect(buildBanAuditReason('Advertising', 'Zezima')).toBe(
      'Advertising (by Zezima via the Grotto admin page)',
    );
  });

  it('still records who acted when no reason was given', () => {
    expect(buildBanAuditReason('   ', 'Zezima')).toBe(
      'No reason given (by Zezima via the Grotto admin page)',
    );
  });

  it('stays inside the audit-log reason limit Discord enforces', () => {
    const reason = buildBanAuditReason('x'.repeat(600), 'Zezima');

    expect(reason).toHaveLength(512);
  });
});
