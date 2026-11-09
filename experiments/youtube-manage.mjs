// experiments/youtube-manage.mjs
// Everything on the channel that isn't uploading a video: status, privacy,
// thumbnails, playlists.
//
// Usage:
//   node experiments/youtube-manage.mjs status
//   node experiments/youtube-manage.mjs privacy <videoId> public|unlisted|private
//   node experiments/youtube-manage.mjs thumb <videoId> <image.jpg>
//   node experiments/youtube-manage.mjs playlist <title> [videoId]
//
// Needs a token with https://www.googleapis.com/auth/youtube (full channel
// management), not the upload-only scope. See youtube-auth.mjs.

import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');

const env = Object.fromEntries(
  readFileSync(join(REPO, '.env'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    refresh_token: env.GOOGLE_REFRESH_TOKEN,
    grant_type: 'refresh_token',
  }),
});
const token = await tokenRes.json();
if (!tokenRes.ok) {
  console.error('token refresh failed:', JSON.stringify(token).slice(0, 300));
  process.exit(1);
}
const auth = { authorization: `Bearer ${token.access_token}` };
console.log(`scope: ${token.scope}`);

const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
  console.error('usage: status | privacy <id> <state> | thumb <id> <file> | playlist <title> [id]');
  process.exit(1);
}

const json = async (url, init) => {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(data).slice(0, 400)}`);
  return data;
};

if (cmd === 'status') {
  const ch = await json(
    'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&mine=true',
    { headers: auth }
  );
  const c = ch.items[0];
  console.log(`\n${c.snippet.title}  (${c.snippet.customUrl})`);
  console.log(`${c.statistics.videoCount} videos, ${c.statistics.viewCount} views, ${c.statistics.subscriberCount} subscribers`);
  console.log(`description: ${(c.brandingSettings.channel.description || '(none)').replace(/\n/g, ' / ')}`);

  const vids = await json(
    'https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=50',
    { headers: auth }
  );
  console.log('\nVIDEOS');
  for (const v of vids.items || []) {
    const detail = await json(
      `https://www.googleapis.com/youtube/v3/videos?part=status,statistics,contentDetails&id=${v.id.videoId}`,
      { headers: auth }
    );
    const d = detail.items?.[0] || {};
    console.log(`  ${v.id.videoId}  ${d.status?.privacyStatus || '?'}  ${d.contentDetails?.duration || ''}  ${d.statistics?.viewCount || 0} views  ${v.snippet.title}`);
  }

  const pls = await json(
    'https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50',
    { headers: auth }
  );
  console.log('\nPLAYLISTS');
  for (const p of pls.items || []) {
    console.log(`  ${p.id}  ${p.contentDetails.itemCount} items  ${p.snippet.title}`);
  }
}

if (cmd === 'privacy') {
  const [id, state] = args;
  const d = await json(
    'https://www.googleapis.com/youtube/v3/videos?part=status',
    {
      method: 'PUT',
      headers: { ...auth, 'content-type': 'application/json' },
      body: JSON.stringify({ id, status: { privacyStatus: state, selfDeclaredMadeForKids: false } }),
    }
  );
  console.log(`${id} -> ${d.status.privacyStatus}`);
}

if (cmd === 'delete') {
  const [id] = args;
  const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${id}`, {
    method: 'DELETE',
    headers: auth,
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 300)}`);
  console.log(`deleted ${id}`);
}

if (cmd === 'thumb') {
  const [id, file] = args;
  const full = isAbsolute(file) ? file : join(REPO, file);
  if (!existsSync(full)) { console.error(`no such file: ${full}`); process.exit(1); }
  if (statSync(full).size > 2 * 1024 * 1024) { console.error('thumbnail must be under 2 MB'); process.exit(1); }
  const d = await json(
    `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${id}&uploadType=media`,
    { method: 'POST', headers: { ...auth, 'content-type': 'image/jpeg' }, body: readFileSync(full) }
  );
  console.log(`thumbnail set: ${d.items?.[0]?.default?.url || 'ok'}`);
}

if (cmd === 'playlist') {
  const [title, videoId] = args;
  const pls = await json(
    'https://www.googleapis.com/youtube/v3/playlists?part=snippet&mine=true&maxResults=50',
    { headers: auth }
  );
  let list = (pls.items || []).find((p) => p.snippet.title === title);
  if (!list) {
    list = await json('https://www.googleapis.com/youtube/v3/playlists?part=snippet,status', {
      method: 'POST',
      headers: { ...auth, 'content-type': 'application/json' },
      body: JSON.stringify({
        snippet: { title, description: '' },
        status: { privacyStatus: 'public' },
      }),
    });
    console.log(`created playlist ${list.id} "${title}"`);
  } else {
    console.log(`playlist exists: ${list.id}`);
  }
  if (videoId) {
    await json('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet', {
      method: 'POST',
      headers: { ...auth, 'content-type': 'application/json' },
      body: JSON.stringify({
        snippet: { playlistId: list.id, resourceId: { kind: 'youtube#video', videoId } },
      }),
    });
    console.log(`added ${videoId}`);
  }
}
