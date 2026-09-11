import { createVerify, generateKeyPairSync } from 'node:crypto';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { serverConstants } from '@/config/constants.server';
import { updateSheetCell } from './google-sheets';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

const tokenUri = 'https://oauth2.googleapis.com/token';
const spreadsheetId = 'sheet-id';

function decode(segment: string) {
  return JSON.parse(Buffer.from(segment, 'base64url').toString()) as Record<
    string,
    unknown
  >;
}

describe('updateSheetCell', () => {
  const originalKey = serverConstants.googleServiceAccountKey;

  beforeEach(() => {
    serverConstants.googleServiceAccountKey = JSON.stringify({
      client_email: 'grotto@example.iam.gserviceaccount.com',
      private_key: privateKey,
      token_uri: tokenUri,
    });
  });

  afterEach(() => {
    serverConstants.googleServiceAccountKey = originalKey;
  });

  it('signs a token request Google can verify, then writes the one cell as typed', async () => {
    const seen: {
      assertion?: string;
      url?: string;
      body?: unknown;
      auth?: string;
    } = {};

    server.use(
      http.post(tokenUri, async ({ request }) => {
        seen.assertion =
          new URLSearchParams(await request.text()).get('assertion') ??
          undefined;

        return HttpResponse.json({ access_token: 'token-123' });
      }),
      http.put(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/:range`,
        async ({ request }) => {
          seen.url = request.url;
          seen.auth = request.headers.get('authorization') ?? undefined;
          seen.body = await request.json();

          return HttpResponse.json({ updatedCells: 1 });
        },
      ),
    );

    await updateSheetCell({ spreadsheetId, range: 'Links!B9', value: 39036 });

    const [header, claims, signature] = seen.assertion!.split('.');

    expect(decode(header)).toEqual({ alg: 'RS256', typ: 'JWT' });
    expect(decode(claims)).toMatchObject({
      iss: 'grotto@example.iam.gserviceaccount.com',
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: tokenUri,
    });
    expect(
      createVerify('RSA-SHA256')
        .update(`${header}.${claims}`)
        .verify(publicKey, signature, 'base64url'),
    ).toBe(true);

    expect(seen.auth).toBe('Bearer token-123');
    expect(seen.url).toContain(
      '/values/Links!B9?valueInputOption=USER_ENTERED',
    );
    expect(seen.body).toEqual({ range: 'Links!B9', values: [[39036]] });
  });

  it('fails loudly when Google refuses the write', async () => {
    server.use(
      http.post(tokenUri, () => HttpResponse.json({ access_token: 't' })),
      http.put(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/:range`,
        () =>
          HttpResponse.json({ error: 'PERMISSION_DENIED' }, { status: 403 }),
      ),
    );

    await expect(
      updateSheetCell({ spreadsheetId, range: 'Links!B10', value: 1 }),
    ).rejects.toThrow('Writing Links!B10 failed (403)');
  });

  it('fails loudly, without calling Google, when no key is configured', async () => {
    serverConstants.googleServiceAccountKey = undefined;

    await expect(
      updateSheetCell({ spreadsheetId, range: 'Links!B9', value: 1 }),
    ).rejects.toThrow('GOOGLE_SERVICE_ACCOUNT_KEY is not set.');
  });
});
