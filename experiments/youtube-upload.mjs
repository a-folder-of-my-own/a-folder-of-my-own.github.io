// experiments/youtube-upload.mjs
// Upload one video to the channel. Resumable upload, upload-only scope.
//
// Usage:
//   node experiments/youtube-upload.mjs --video renders/folder-loop.mp4 \
//     --title "the folder, breathing" --description "..." --privacy unlisted
//
// Requires GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REFRESH_TOKEN in
// .env (run experiments/youtube-auth.mjs once to create the token).
//
// Note: while the Google Cloud app is in "Testing", YouTube may lock API
// uploads to private. That is a Google restriction, not a script setting.

import { readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');

const env = existsSync(join(REPO, '.env'))
  ? Object.fromEntries(
      readFileSync(join(REPO, '.env'), 'utf8')
        .split(/\r?\n/)
        .filter((l) => l && !l.startsWith('#') && l.includes('='))
        .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
    )
  : {};

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const video = flag('video');
const title = flag('title', '');
const description = flag('description', '');
const tags = flag('tags', '');
const privacy = flag('privacy', 'unlisted');

if (!video) {
  console.error('usage: node experiments/youtube-upload.mjs --video <file> --title "..." [--description "..."] [--privacy unlisted|public|private]');
  process.exit(2);
}

const full = isAbsolute(video) ? video : join(REPO, video);
if (!existsSync(full)) {
  console.error(`no such file: ${full}`);
  process.exit(2);
}
if (!title) {
  console.error('--title is required');
  process.exit(2);
}
if (title.length > 100) {
  console.error(`title is ${title.length} characters; YouTube allows 100`);
  process.exit(2);
}
if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REFRESH_TOKEN) {
  console.error('missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN in .env');
  console.error('run: node experiments/youtube-auth.mjs');
  process.exit(2);
}

const size = statSync(full).size;

// ---------- access token ----------
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

// ---------- start the resumable upload ----------
const metadata = {
  snippet: {
    title,
    description,
    tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
    categoryId: '22', // People & Blogs
  },
  status: {
    privacyStatus: privacy,
    selfDeclaredMadeForKids: false,
  },
};

const initRes = await fetch(
  'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
  {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token.access_token}`,
      'content-type': 'application/json; charset=UTF-8',
      'x-upload-content-type': 'video/mp4',
      'x-upload-content-length': String(size),
    },
    body: JSON.stringify(metadata),
  }
);

if (!initRes.ok) {
  console.error('upload init failed:', initRes.status, (await initRes.text()).slice(0, 400));
  process.exit(1);
}

const uploadUrl = initRes.headers.get('location');
if (!uploadUrl) {
  console.error('no upload URL returned');
  process.exit(1);
}

console.log(`uploading ${full} (${(size / 1024 / 1024).toFixed(1)} MB) as "${title}" [${privacy}]`);

const putRes = await fetch(uploadUrl, {
  method: 'PUT',
  headers: {
    'content-type': 'video/mp4',
    'content-length': String(size),
  },
  body: readFileSync(full),
});

const result = await putRes.json().catch(() => ({}));
if (!putRes.ok) {
  console.error('upload failed:', putRes.status, JSON.stringify(result).slice(0, 400));
  process.exit(1);
}

console.log(`uploaded: https://youtu.be/${result.id}`);
console.log(`status:   ${result.status?.privacyStatus || privacy}`);
