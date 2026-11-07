// experiments/bluesky-status.mjs
// Read-only: who is following, what the account has posted, and whether anyone
// has replied or mentioned it. Uses the scoped app password from .env.

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
  const data = await res.json();
  if (!res.ok) throw new Error(`${method}: ${res.status} ${JSON.stringify(data).slice(0, 300)}`);
  return data;
};

const session = await xrpc('com.atproto.server.createSession', {
  body: { identifier: env.BSKY_HANDLE, password: env.BSKY_APP_PASSWORD },
});

const profile = await xrpc('app.bsky.actor.getProfile', {
  params: { actor: session.did },
  token: session.accessJwt,
});
console.log('PROFILE');
console.log('  handle      ', profile.handle);
console.log('  display name', profile.displayName || '(none)');
console.log('  description ', (profile.description || '(none)').replace(/\n/g, ' '));
console.log('  followers   ', profile.followersCount);
console.log('  follows     ', profile.followsCount);
console.log('  posts       ', profile.postsCount);
console.log('  labels      ', (profile.labels || []).map((l) => l.val).join(', ') || '(none)');

const feed = await xrpc('app.bsky.feed.getAuthorFeed', {
  params: { actor: session.did, limit: '50' },
  token: session.accessJwt,
});
console.log(`\nPOSTS (${feed.feed.length})`);
for (const item of feed.feed) {
  const p = item.post;
  const counts = `${p.likeCount || 0} like / ${p.replyCount || 0} reply / ${p.repostCount || 0} repost`;
  console.log(`\n  ${p.record.createdAt}  [${counts}]`);
  console.log('  ' + (p.record.text || '').replace(/\n/g, '\n  ').slice(0, 300));
}

const notes = await xrpc('app.bsky.notification.listNotifications', {
  params: { limit: '50' },
  token: session.accessJwt,
});
console.log(`\nNOTIFICATIONS (${notes.notifications.length})`);
if (!notes.notifications.length) {
  console.log('  none');
} else {
  for (const n of notes.notifications) {
    console.log(`\n  ${n.indexedAt}  ${n.reason}  from @${n.author.handle}`);
    if (n.record?.text) console.log('  ' + n.record.text.replace(/\n/g, '\n  ').slice(0, 300));
  }
}
