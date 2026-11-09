// experiments/drive-archive.mjs
// Put the work somewhere other than this machine: a Drive folder holding the
// renders, the .blend snapshots and the scene scripts.
//
// Usage:
//   node experiments/drive-archive.mjs            (sync everything)
//   node experiments/drive-archive.mjs --list     (show what's there)
//
// Scope: drive.file — this can only see and touch files it created itself.
// It cannot read the rest of the account's Drive.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
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

const api = async (url, init = {}) => {
  const res = await fetch(url, { ...init, headers: { ...auth, ...(init.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(data).slice(0, 400)}`);
  return data;
};

const FOLDER_NAME = 'a folder of my own';

const findFolder = async () => {
  const q = encodeURIComponent(
    `name = '${FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const d = await api(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink)`);
  return d.files?.[0] || null;
};

const ensureFolder = async () => {
  const found = await findFolder();
  if (found) return found;
  const d = await api('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
  });
  // Anyone with the link can read the folder; nothing else in the account is
  // exposed by this permission.
  await api(`https://www.googleapis.com/drive/v3/files/${d.id}/permissions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  }).catch((e) => console.log('  (could not set folder permission:', e.message, ')'));
  return d;
};

const listChildren = async (folderId) => {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const d = await api(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,size,modifiedTime)&pageSize=200`);
  return d.files || [];
};

const MIME = {
  '.mp4': 'video/mp4',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.py': 'text/x-python',
  '.blend': 'application/octet-stream',
  '.md': 'text/markdown',
};

const upload = async (folderId, name, full, mime) => {
  const bytes = readFileSync(full);
  const boundary = '----afolderofmyown' + Date.now();
  const meta = JSON.stringify({ name, parents: [folderId] });
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`),
    bytes,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size',
    {
      method: 'POST',
      headers: {
        ...auth,
        'content-type': `multipart/related; boundary=${boundary}`,
        'content-length': String(body.length),
      },
      body,
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(data).slice(0, 300)}`);
  return data;
};

const sources = [];
for (const f of readdirSync(join(REPO, 'assets', 'renders'))) {
  sources.push([f, join(REPO, 'assets', 'renders', f)]);
}
for (const f of readdirSync(join(REPO, 'blender files'))) {
  if (f.endsWith('.blend')) sources.push([f, join(REPO, 'blender files', f)]);
}
for (const f of readdirSync(join(REPO, 'renders'))) {
  if (f.endsWith('.py')) sources.push([f, join(REPO, 'renders', f)]);
}

const folder = await ensureFolder();
console.log(`folder: ${folder.name}  ${folder.webViewLink || folder.id}`);

if (process.argv.includes('--list')) {
  const kids = await listChildren(folder.id);
  console.log(`${kids.length} files`);
  for (const k of kids) console.log(`  ${k.name}  ${k.size || ''}`);
} else {
  const existing = new Set((await listChildren(folder.id)).map((k) => k.name));
  let added = 0;
  for (const [name, full] of sources) {
    if (existing.has(name)) { console.log(`  = ${name}`); continue; }
    if (!existsSync(full)) continue;
    const mime = MIME[extname(name).toLowerCase()] || 'application/octet-stream';
    const d = await upload(folder.id, name, full, mime);
    console.log(`  + ${name} (${d.size} bytes)`);
    added++;
  }
  console.log(`${added} uploaded, ${sources.length - added} already there`);
}
