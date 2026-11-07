// experiments/bluesky-video.mjs
// Post one message with one video. Bluesky takes video through its own
// service (video.bsky.app), not the normal blob uploader, so this is a
// separate script from bluesky-post.mjs.
//
// Usage:
//   node experiments/bluesky-video.mjs --video assets/renders/clip.mp4 \
//     --alt "what the video shows" "caption text"
//
// Limits: 100 MB, 60 seconds, and the account must be old enough. If the
// upload is rejected, the error body says which limit was hit.

import { readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname, isAbsolute, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');

const env = Object.fromEntries(
  readFileSync(join(REPO, '.env'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const argv = process.argv.slice(2);
let video = null;
let alt = '';
const textParts = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--video') video = argv[++i];
  else if (argv[i] === '--alt') alt = argv[++i];
  else textParts.push(argv[i]);
}

const text = textParts.join(' ').trim();
if (!video || !text) {
  console.error('usage: node experiments/bluesky-video.mjs --video <file> --alt "..." "caption"');
  process.exit(1);
}
if (text.length > 300) {
  console.error(`too long: ${text.length} characters (limit 300)`);
  process.exit(1);
}

const full = isAbsolute(video) ? video : join(REPO, video);
if (!existsSync(full)) {
  console.error(`no such file: ${full}`);
  process.exit(1);
}
const bytes = readFileSync(full);
if (bytes.length > 100 * 1024 * 1024) {
  console.error(`${full} is ${bytes.length} bytes; Bluesky's video limit is 100 MB`);
  process.exit(1);
}

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
  if (!res.ok) throw new Error(`${method}: ${res.status} ${JSON.stringify(data).slice(0, 400)}`);
  return data;
};

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

// ---------- upload the bytes ----------
// The dedicated video service rejected app-password sessions with "invalid
// token", but the ordinary blob uploader accepts video/mp4, and the appview
// processes the blob after the post is created. So: uploadBlob, then embed.
const upData = await call('com.atproto.repo.uploadBlob', bytes, session.accessJwt, 'video/mp4');
const blob = upData.blob;
console.log(`uploaded ${bytes.length} bytes as ${blob.ref.$link}`);

// ---------- post ----------
const record = {
  $type: 'app.bsky.feed.post',
  text,
  createdAt: new Date().toISOString(),
  ...(facets.length ? { facets } : {}),
  embed: {
    $type: 'app.bsky.embed.video',
    video: blob,
    alt,
  },
};

const res = await call('com.atproto.repo.createRecord', {
  repo: session.did,
  collection: 'app.bsky.feed.post',
  record,
}, session.accessJwt);

console.log(`posted ${res.uri}`);
