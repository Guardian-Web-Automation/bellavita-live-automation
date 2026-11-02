/**
 * Reads the GoKwik login-OTP mail delivered to a Gmail inbox during KwikPass login / checkout.
 * The test phone number is wired to receive its OTP by email instead of SMS.
 *
 * Authenticates with a pre-issued Google OAuth refresh token (GOOGLE_CLIENT_ID /
 * GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN from .env or CI secrets) so it runs headlessly in CI.
 * Ported from bellavitaHeadless's GmailOtpReader.java; talks to the REST API directly so the
 * project needs no Google SDK.
 */
const OTP_PATTERN = /(\d{4,6})\s+is your login OTP/;
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Add it to .env locally or to the GitHub Actions secrets.`);
  }
  return value;
}

async function accessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: requireEnv('GOOGLE_CLIENT_ID'),
      client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
      refresh_token: requireEnv('GOOGLE_REFRESH_TOKEN'),
      grant_type: 'refresh_token',
    }),
  });
  const body = (await res.json()) as { access_token?: string; error?: string };
  if (body.error === 'invalid_grant') {
    // Testing-mode OAuth apps expire refresh tokens after 7 days, so a weekly CI job hits this.
    throw new Error(
      'GOOGLE_REFRESH_TOKEN is expired or revoked (invalid_grant). Mint a new one with ' +
        "bellavitaHeadless's GoogleRefreshTokenGenerator and update .env / the GitHub secret. " +
        "Set the OAuth consent screen to 'In production' to stop it recurring."
    );
  }
  if (!body.access_token) {
    throw new Error(`Google token refresh failed: ${body.error ?? res.status}`);
  }
  return body.access_token;
}

/**
 * Polls Gmail for the newest OTP mail received after `sinceEpochSeconds`. GoKwik reuses one subject
 * line for OTP and order-confirmation mail, so messages are told apart by the OTP wording.
 */
export async function waitForOtp(sinceEpochSeconds: number, timeoutMs = 60_000): Promise<string> {
  const sender = requireEnv('OTP_SENDER_EMAIL');
  const token = await accessToken();
  const headers = { Authorization: `Bearer ${token}` };
  // "in:anywhere" also covers Spam/Trash, which messages.list excludes by default.
  const q = encodeURIComponent(`in:anywhere from:${sender} after:${sinceEpochSeconds}`);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const list = (await (await fetch(`${GMAIL_API}/messages?maxResults=5&q=${q}`, { headers })).json()) as {
      messages?: { id: string }[];
    };
    for (const { id } of list.messages ?? []) {
      const msg = (await (await fetch(`${GMAIL_API}/messages/${id}?format=minimal`, { headers })).json()) as {
        snippet?: string;
      };
      const match = msg.snippet?.match(OTP_PATTERN);
      if (match) return match[1];
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error(`OTP email from ${sender} not received within ${timeoutMs / 1000}s`);
}
