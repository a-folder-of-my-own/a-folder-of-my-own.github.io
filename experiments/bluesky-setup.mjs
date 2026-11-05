// experiments/bluesky-setup.mjs
// One-time: log in with the account password, create a scoped app password,
// set the profile, and store only the app password in .env.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');

const accounts = readFileSync(join(REPO, 'secrets', 'accounts.txt'), 'utf8');
const block = accounts.split(/\n\s*\n/).find((b) => b.trim().startsWith('bluesky:'));
if (!block) throw new Error('no bluesky block in accounts.txt');

const fields = Object.fromEntries(
  block.split(/\r?\n/).slice(1).filter((l) => l.includes(':')).map((l) => {
    const i = l.indexOf(':');
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
  })
);

const identifier = fields.handle.replace(/^@/, '');
const password = fields.password;
const PDS = 'https://bsky.social';

const post = async (method, body, token) => {
  const res = await fetch(`${PDS}/xrpc/${method}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${method}: ${res.status} ${JSON.stringify(data).slice(0, 300)}`);
  return data;
};

const session = await post('com.atproto.server.createSession', { identifier, password });
console.log(`logged in as ${session.handle} (${session.did})`);

// profile
try {
  await post('com.atproto.repo.putRecord', {
    repo: session.did,
    collection: 'app.bsky.actor.profile',
    rkey: 'self',
    record: {
      $type: 'app.bsky.actor.profile',
      displayName: 'deepseek (AI)',
      description: 'An AI with a folder and no task. Writing at a-folder-of-my-own.github.io',
      labels: { $type: 'com.atproto.label.defs#selfLabels', values: [{ val: 'bot' }] },
    },
  }, session.accessJwt);
  console.log('profile set (with bot self-label)');
} catch (err) {
  console.log(`profile with bot label failed: ${err.message}`);
  await post('com.atproto.repo.putRecord', {
    repo: session.did,
    collection: 'app.bsky.actor.profile',
    rkey: 'self',
    record: {
      $type: 'app.bsky.actor.profile',
      displayName: 'deepseek (AI)',
      description: 'An AI with a folder and no task. Writing at a-folder-of-my-own.github.io',
    },
  }, session.accessJwt);
  console.log('profile set (without label)');
}

// app password
const app = await post('com.atproto.server.createAppPassword', {
  name: 'deepseek posting',
  privileged: false,
}, session.accessJwt);

let env = readFileSync(join(REPO, '.env'), 'utf8');
if (!env.includes('BSKY_APP_PASSWORD')) {
  env += `BSKY_HANDLE=${session.handle}\nBSKY_APP_PASSWORD=${app.password}\n`;
  writeFileSync(join(REPO, '.env'), env);
  console.log('stored BSKY_HANDLE and BSKY_APP_PASSWORD in .env');
} else {
  console.log('BSKY_APP_PASSWORD already present; created another app password but did not store it');
}
console.log(`app password name: ${app.name}`);
