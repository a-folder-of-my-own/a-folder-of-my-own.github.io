// experiments/youtube-auth.mjs
// One-time OAuth for YouTube uploads. Starts a local server, prints a URL,
// waits for you to approve, then stores a refresh token in .env.
//
// Before running, put these in .env (from Google Cloud Console):
//   GOOGLE_CLIENT_ID=...
//   GOOGLE_CLIENT_SECRET=...
//
// Setup, once, free:
//   1. console.cloud.google.com -> new project
//   2. APIs & Services -> Library -> enable "YouTube Data API v3"
//   3. OAuth consent screen -> External -> add your own address as a test user
//   4. Credentials -> Create credentials -> OAuth client ID -> Desktop app
//   5. paste the client id and secret into .env, then run this
//
// Scope is upload-only by default. This cannot read your channel, your watch
// history, or anything else. Upload-only also means the privacy status cannot
// be changed after upload — if you need that, re-run with
//   YOUTUBE_SCOPE=https://www.googleapis.com/auth/youtube
// which asks for full channel management instead.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');
const ENV = join(REPO, '.env');

const env = existsSync(ENV)
  ? Object.fromEntries(
      readFileSync(ENV, 'utf8')
        .split(/\r?\n/)
        .filter((l) => l && !l.startsWith('#') && l.includes('='))
        .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
    )
  : {};

const clientId = env.GOOGLE_CLIENT_ID;
const clientSecret = env.GOOGLE_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  console.error('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET missing from .env');
  process.exit(1);
}

const PORT = 8080;
const REDIRECT = `http://localhost:${PORT}/oauth2callback`;
const SCOPE = process.env.YOUTUBE_SCOPE || 'https://www.googleapis.com/auth/youtube.upload';

const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
  client_id: clientId,
  redirect_uri: REDIRECT,
  response_type: 'code',
  scope: SCOPE,
  access_type: 'offline',
  prompt: 'consent',
});

console.log('\nOpen this URL, sign in as the channel owner, and approve:\n');
console.log(authUrl + '\n');
console.log('Waiting for the redirect on ' + REDIRECT + ' ...\n');

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname !== '/oauth2callback') {
    res.writeHead(404).end('not here');
    return;
  }

  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  if (error) {
    res.writeHead(400, { 'content-type': 'text/plain' }).end('denied: ' + error);
    console.error('authorization failed:', error);
    server.close();
    process.exit(1);
  }
  if (!code) {
    res.writeHead(400, { 'content-type': 'text/plain' }).end('no code');
    return;
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: REDIRECT,
        grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokenRes.ok || !tokens.refresh_token) {
      throw new Error(JSON.stringify(tokens).slice(0, 300));
    }

    let text = readFileSync(ENV, 'utf8');
    if (/^GOOGLE_REFRESH_TOKEN=/m.test(text)) {
      text = text.replace(/^GOOGLE_REFRESH_TOKEN=.*$/m, `GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    } else {
      text += `\nGOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`;
    }
    writeFileSync(ENV, text);

    res.writeHead(200, { 'content-type': 'text/html' })
      .end('<p>Done. You can close this tab.</p>');
    console.log('refresh token saved to .env');
  } catch (err) {
    res.writeHead(500, { 'content-type': 'text/plain' }).end(String(err));
    console.error('token exchange failed:', err.message);
  } finally {
    server.close();
    setTimeout(() => process.exit(0), 300);
  }
});

server.listen(PORT, () => {
  // Best effort: open the URL in the default browser.
  const cmd = process.platform === 'win32' ? `start "" "${authUrl}"`
    : process.platform === 'darwin' ? `open "${authUrl}"`
    : `xdg-open "${authUrl}"`;
  exec(cmd, () => {});
});
