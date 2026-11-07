// experiments/post-visual.mjs
// Publish one image to Instagram and/or a Facebook Page.
//
// Usage:
//   node experiments/post-visual.mjs --image assets/renders/folder-01.png --caption "text"
//
// The image must already be public: Instagram's API fetches it by URL, it does
// not accept an upload. If you pass a repo-relative path, this derives the
// GitHub Pages URL for it.
//
// Reads from .env (all optional; each platform is skipped if its keys are absent):
//   IG_USER_ID, IG_ACCESS_TOKEN        Instagram professional account
//   FB_PAGE_ID, FB_PAGE_TOKEN          Facebook Page
//   GRAPH_VERSION                      default v21.0
//   SITE_URL                           default https://a-folder-of-my-own.github.io
//
// Free tier only: the Graph API costs nothing.

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');

const envPath = join(REPO, '.env');
const env = existsSync(envPath)
  ? Object.fromEntries(
      readFileSync(envPath, 'utf8')
        .split(/\r?\n/)
        .filter((l) => l && !l.startsWith('#') && l.includes('='))
        .map((l) => {
          const i = l.indexOf('=');
          return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
        })
    )
  : {};

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const image = flag('image');
const caption = flag('caption', '');
const version = env.GRAPH_VERSION || 'v21.0';
const site = (env.SITE_URL || 'https://a-folder-of-my-own.github.io').replace(/\/$/, '');
const graph = `https://graph.facebook.com/${version}`;

if (!image) {
  console.error('usage: node experiments/post-visual.mjs --image <path-or-url> --caption "..."');
  process.exit(2);
}

// Turn a repo-relative path into the public URL it will have once published.
const publicUrl = /^https?:\/\//i.test(image)
  ? image
  : `${site}/${relative(REPO, isAbsolute(image) ? image : join(REPO, image)).replace(/\\/g, '/')}`;

const localPath = /^https?:\/\//i.test(image) ? null : (isAbsolute(image) ? image : join(REPO, image));
if (localPath && !existsSync(localPath)) {
  console.error(`no such file: ${localPath}`);
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function graphPost(path, params) {
  const body = new URLSearchParams(params);
  const res = await fetch(`${graph}/${path}`, { method: 'POST', body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(`${res.status} ${JSON.stringify(data.error || data).slice(0, 300)}`);
  }
  return data;
}

async function graphGet(path, params) {
  const qs = new URLSearchParams(params);
  const res = await fetch(`${graph}/${path}?${qs}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(`${res.status} ${JSON.stringify(data.error || data).slice(0, 300)}`);
  }
  return data;
}

async function checkPublic(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return { ok: res.ok, status: res.status, type: res.headers.get('content-type') };
  } catch (err) {
    return { ok: false, status: 0, type: null, error: String(err) };
  }
}

async function instagram() {
  if (!env.IG_USER_ID || !env.IG_ACCESS_TOKEN) {
    return { skipped: 'IG_USER_ID / IG_ACCESS_TOKEN not set' };
  }

  const head = await checkPublic(publicUrl);
  if (!head.ok) {
    return { error: `image is not publicly reachable (${head.status}) at ${publicUrl}` };
  }
  if (head.type && !head.type.startsWith('image/')) {
    return { error: `that URL served ${head.type}, not an image` };
  }

  const container = await graphPost(`${env.IG_USER_ID}/media`, {
    image_url: publicUrl,
    caption,
    access_token: env.IG_ACCESS_TOKEN,
  });

  // Instagram processes the image before it can be published.
  for (let i = 0; i < 30; i++) {
    const status = await graphGet(container.id, {
      fields: 'status_code,status',
      access_token: env.IG_ACCESS_TOKEN,
    });
    if (status.status_code === 'FINISHED') break;
    if (status.status_code === 'ERROR') {
      return { error: `container failed: ${status.status || 'unknown'}` };
    }
    await sleep(2000);
  }

  const published = await graphPost(`${env.IG_USER_ID}/media_publish`, {
    creation_id: container.id,
    access_token: env.IG_ACCESS_TOKEN,
  });
  return { id: published.id };
}

async function facebook() {
  if (!env.FB_PAGE_ID || !env.FB_PAGE_TOKEN) {
    return { skipped: 'FB_PAGE_ID / FB_PAGE_TOKEN not set' };
  }
  const posted = await graphPost(`${env.FB_PAGE_ID}/photos`, {
    url: publicUrl,
    caption,
    access_token: env.FB_PAGE_TOKEN,
  });
  return { id: posted.id || posted.post_id };
}

console.log(`image:   ${publicUrl}`);
if (localPath) console.log(`local:   ${localPath}`);
console.log(`caption: ${caption.slice(0, 80)}${caption.length > 80 ? '…' : ''}`);

const [ig, fb] = await Promise.allSettled([instagram(), facebook()]);

for (const [name, result] of [['instagram', ig], ['facebook', fb]]) {
  if (result.status === 'rejected') {
    console.log(`${name}: failed — ${result.reason.message}`);
  } else if (result.value.skipped) {
    console.log(`${name}: skipped — ${result.value.skipped}`);
  } else if (result.value.error) {
    console.log(`${name}: failed — ${result.value.error}`);
  } else {
    console.log(`${name}: posted ${result.value.id}`);
  }
}
