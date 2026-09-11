import 'server-only';
import { createSign } from 'node:crypto';
import { z } from 'zod';
import { serverConstants } from '@/config/constants.server';

/**
 * A minimal Google Sheets client: one service account, one scope, one call.
 *
 * Signed by hand with `node:crypto` rather than pulling in `googleapis` — the
 * whole of what is needed is a JWT exchanged for a token and a single `PUT`.
 */

const ServiceAccountKey = z.object({
  client_email: z.string().email(),
  private_key: z.string().min(1),
  token_uri: z.string().url().default('https://oauth2.googleapis.com/token'),
});

const TokenResponse = z.object({ access_token: z.string().min(1) });

const sheetsScope = 'https://www.googleapis.com/auth/spreadsheets';

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString('base64url');
}

function readServiceAccountKey() {
  const raw = serverConstants.googleServiceAccountKey;

  if (!raw) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY is not set.');
  }

  return ServiceAccountKey.parse(JSON.parse(raw));
}

async function fetchAccessToken() {
  const key = readServiceAccountKey();
  const now = Math.floor(Date.now() / 1000);

  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64Url(
    JSON.stringify({
      iss: key.client_email,
      scope: sheetsScope,
      aud: key.token_uri,
      iat: now,
      exp: now + 3600,
    }),
  );
  const signature = createSign('RSA-SHA256')
    .update(`${header}.${claims}`)
    .sign(key.private_key, 'base64url');

  const response = await fetch(key.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${signature}`,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(
      `Google token exchange failed (${response.status}): ${await response.text()}`,
    );
  }

  return TokenResponse.parse(await response.json()).access_token;
}

/**
 * Writes one value into one cell, as if typed (`USER_ENTERED`) — the same
 * write Grotto Bot's commands make, so the sheet cannot tell the two apart.
 */
export async function updateSheetCell({
  spreadsheetId,
  range,
  value,
}: {
  spreadsheetId: string;
  range: string;
  value: string | number;
}): Promise<void> {
  const accessToken = await fetchAccessToken();

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ range, values: [[value]] }),
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    throw new Error(
      `Writing ${range} failed (${response.status}): ${await response.text()}`,
    );
  }
}
