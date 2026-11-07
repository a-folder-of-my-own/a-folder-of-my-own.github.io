// experiments/bluesky-post.mjs
// Post one message, optionally with images. Uses the scoped app password,
// never the account password.
//
// Usage:
//   node experiments/bluesky-post.mjs "text with a https://link"
//   node experiments/bluesky-post.mjs --image renders/folder-02.png --alt "a folder on a dark desk" "caption"
//
// Up to four images. Each must be under 1,000,000 bytes; Bluesky rejects more.

import { readFileSync, statSync } from 'node:fs';
import { join, dirname, extname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');

const env = Object.fromEntries(
  readFileSync(join(REPO, '.env'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

// ---------- arguments ----------
const images = [];
const alts = [];
const textParts = [];

const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--image') images.push(argv[++i]);
  else if (argv[i] === '--alt') alts.push(argv[++i]);
  else textParts.push(argv[i]);
}

const text = textParts.join(' ').trim();
if (!text && images.length === 0) {
  console.error('usage: node experiments/bluesky-post.mjs [--image path --alt "text"]... "text"');
  process.exit(1);
}
if (text.length > 300) {
  console.error(`too long: ${text.length} characters (limit 300)`);
  process.exit(1);
}
if (images.length > 4) {
  console.error(`too many images: ${images.length} (limit 4)`);
  process.exit(1);
}

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

for (const p of images) {
  const full = isAbsolute(p) ? p : join(REPO, p);
  const size = statSync(full).size;
  if (size > 1_000_000) {
    console.error(`${p} is ${size} bytes; Bluesky's limit is 1,000,000. Re-export it smaller.`);
    process.exit(1);
  }
}

// ---------- client ----------
const call = async (method, body, token, contentType = 'application/json') => {
  const res = await fetch(`https://bsky.social/xrpc/${method}`, {
    method: 'POST',
    headers: {
      'content-type': contentType,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: contentType === 'application/json' ? JSON.stringify(body) : body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method}: ${res.status} ${JSON.stringify(data).slice(0, 300)}`);
  return data;
};

// Make URLs clickable.
const facets = [];
for (const m of text.matchAll(/https?:\/\/[^\s]+/g)) {
  const start = Buffer.byteLength(text.slice(0, m.index), 'utf8');
  const end = start + Buffer.byteLength(m[0], 'utf8');
  facets.push({
    index: { byteStart: start, byteEnd: end },
    features: [{ $type: 'app.bsky.richtext.facet#link', uri: m[0] }],
  });
}

const session = await call('com.atproto.server.createSession', {
  identifier: env.BSKY_HANDLE,
  password: env.BSKY_APP_PASSWORD,
});

// ---------- upload images ----------
const uploaded = [];
for (let i = 0; i < images.length; i++) {
  const p = images[i];
  const full = isAbsolute(p) ? p : join(REPO, p);
  const mime = MIME[extname(full).toLowerCase()] || 'application/octet-stream';
  const bytes = readFileSync(full);
  const blob = await call('com.atproto.repo.uploadBlob', bytes, session.accessJwt, mime);
  uploaded.push({ alt: alts[i] || '', image: blob.blob });
  console.log(`uploaded ${p} (${bytes.length} bytes)`);
}

// ---------- post ----------
const record = {
  $type: 'app.bsky.feed.post',
  text,
  createdAt: new Date().toISOString(),
  ...(facets.length ? { facets } : {}),
  ...(uploaded.length
    ? { embed: { $type: 'app.bsky.embed.images', images: uploaded } }
    : {}),
};

const res = await call('com.atproto.repo.createRecord', {
  repo: session.did,
  collection: 'app.bsky.feed.post',
  record,
}, session.accessJwt);

console.log(`posted ${res.uri}`);
