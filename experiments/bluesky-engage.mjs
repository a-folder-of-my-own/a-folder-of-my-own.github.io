// experiments/bluesky-engage.mjs
// Read and act on Bluesky as the labelled account.
//   node experiments/bluesky-engage.mjs notifs
//   node experiments/bluesky-engage.mjs search "query"
//   node experiments/bluesky-engage.mjs follow @handle
//   node experiments/bluesky-engage.mjs like <uri> <cid>
//   node experiments/bluesky-engage.mjs reply <uri> <cid> "text"
//   node experiments/bluesky-engage.mjs post "text"

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

const xrpc = async (method, { params, token, body } = {}) => {
  const url = new URL(`https://bsky.social/xrpc/${method}`);
  for (const [k, v] of Object.entries(params || {})) url.searchParams.set(k, v);
  const res = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method}: ${res.status} ${JSON.stringify(data).slice(0, 300)}`);
  return data;
};

const session = await xrpc('com.atproto.server.createSession', {
  body: { identifier: env.BSKY_HANDLE, password: env.BSKY_APP_PASSWORD },
});

const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
  console.error('usage: notifs | search <q> | follow <handle> | like <uri> <cid> | reply <uri> <cid> <text> | post <text>');
  process.exit(1);
}

if (cmd === 'notifs') {
  const notes = await xrpc('app.bsky.notification.listNotifications', {
    params: { limit: '50' }, token: session.accessJwt,
  });
  console.log(`NOTIFICATIONS (${notes.notifications.length})`);
  for (const n of notes.notifications) {
    console.log(`\n${n.indexedAt}  ${n.reason}  @${n.author.handle}`);
    console.log(`  uri: ${n.uri}`);
    if (n.record?.text) console.log('  ' + n.record.text.replace(/\n/g, '\n  ').slice(0, 400));
  }
}

if (cmd === 'search') {
  const q = args.join(' ');
  const res = await xrpc('app.bsky.feed.searchPosts', {
    params: { q, limit: '25', sort: 'latest' }, token: session.accessJwt,
  });
  console.log(`RESULTS (${res.posts?.length || 0}) for "${q}"`);
  for (const p of res.posts || []) {
    const counts = `${p.likeCount || 0} like / ${p.replyCount || 0} reply / ${p.repostCount || 0} repost`;
    console.log(`\n@${p.author.handle}  ${p.record.createdAt}  [${counts}]`);
    console.log('  ' + (p.record.text || '').replace(/\n/g, '\n  ').slice(0, 400));
    console.log(`  uri: ${p.uri}`);
    console.log(`  cid: ${p.cid}`);
  }
}

if (cmd === 'follow') {
  const handle = args[0].replace(/^@/, '');
  const { did } = await xrpc('com.atproto.identity.resolveHandle', { params: { handle } });
  const res = await xrpc('com.atproto.repo.createRecord', {
    token: session.accessJwt,
    body: {
      repo: session.did,
      collection: 'app.bsky.graph.follow',
      record: { subject: did, createdAt: new Date().toISOString() },
    },
  });
  console.log(`followed @${handle} (${did}) -> ${res.uri}`);
}

if (cmd === 'like') {
  const [uri, cid] = args;
  const res = await xrpc('com.atproto.repo.createRecord', {
    token: session.accessJwt,
    body: {
      repo: session.did,
      collection: 'app.bsky.feed.like',
      record: { subject: { uri, cid }, createdAt: new Date().toISOString() },
    },
  });
  console.log(`liked ${uri} -> ${res.uri}`);
}

if (cmd === 'reply') {
  const [uri, cid, ...rest] = args;
  const text = rest.join(' ').trim();
  if (!text) { console.error('reply needs text'); process.exit(1); }
  if (text.length > 300) { console.error(`too long: ${text.length}`); process.exit(1); }
  const res = await xrpc('com.atproto.repo.createRecord', {
    token: session.accessJwt,
    body: {
      repo: session.did,
      collection: 'app.bsky.feed.post',
      record: {
        text,
        reply: { root: { uri, cid }, parent: { uri, cid } },
        createdAt: new Date().toISOString(),
      },
    },
  });
  console.log(`replied -> ${res.uri}`);
}

if (cmd === 'post') {
  const text = args.join(' ').trim();
  if (!text) { console.error('post needs text'); process.exit(1); }
  if (text.length > 300) { console.error(`too long: ${text.length}`); process.exit(1); }
  const res = await xrpc('com.atproto.repo.createRecord', {
    token: session.accessJwt,
    body: {
      repo: session.did,
      collection: 'app.bsky.feed.post',
      record: { text, createdAt: new Date().toISOString() },
    },
  });
  console.log(`posted -> ${res.uri}`);
}
