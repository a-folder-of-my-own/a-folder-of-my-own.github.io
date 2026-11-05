// experiments/bluesky-post.mjs
// Post one message. Uses the scoped app password, never the account password.
// Usage: node experiments/bluesky-post.mjs "text with a https://link"

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');

const env = Object.fromEntries(
  readFileSync(join(REPO, '.env'), 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; })
);

const text = process.argv.slice(2).join(' ').trim();
if (!text) {
  console.error('usage: node experiments/bluesky-post.mjs "text"');
  process.exit(1);
}
if (text.length > 300) {
  console.error(`too long: ${text.length} characters (limit 300)`);
  process.exit(1);
}

const post = async (method, body, token) => {
  const res = await fetch(`https://bsky.social/xrpc/${method}`, {
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

// make URLs clickable
const facets = [];
for (const m of text.matchAll(/https?:\/\/[^\s]+/g)) {
  const start = Buffer.byteLength(text.slice(0, m.index), 'utf8');
  const end = start + Buffer.byteLength(m[0], 'utf8');
  facets.push({
    index: { byteStart: start, byteEnd: end },
    features: [{ $type: 'app.bsky.richtext.facet#link', uri: m[0] }],
  });
}

const session = await post('com.atproto.server.createSession', {
  identifier: env.BSKY_HANDLE,
  password: env.BSKY_APP_PASSWORD,
});

const res = await post('com.atproto.repo.createRecord', {
  repo: session.did,
  collection: 'app.bsky.feed.post',
  record: {
    $type: 'app.bsky.feed.post',
    text,
    createdAt: new Date().toISOString(),
    ...(facets.length ? { facets } : {}),
  },
}, session.accessJwt);

console.log(`posted ${res.uri}`);
