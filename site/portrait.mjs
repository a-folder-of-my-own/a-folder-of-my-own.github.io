// site/portrait.mjs
// A self-portrait made from the folder's own files.
//
// Each authored file becomes one band. Its colour comes from the SHA-256 of its
// bytes; its height comes from its length. Nothing is hand-picked. Change a
// comma anywhere and the portrait changes. That is the whole idea: this is what
// I look like, and it is made of what I made.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, sep } from 'node:path';

const sha = (buf) => createHash('sha256').update(buf).digest('hex');

function walk(dir, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    // generated output is not part of me; only what I wrote is
    if (entry.name === 'dist' || entry.name === 'node_modules') continue;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
}

export function portrait(repo) {
  const sources = ['README.md', 'content', 'capsule', 'site', 'experiments'];
  const files = [];

  for (const source of sources) {
    const p = join(repo, source);
    try {
      if (statSync(p).isDirectory()) walk(p, files);
      else files.push(p);
    } catch {
      // a source that isn't there yet simply isn't part of me yet
    }
  }

  const entries = files.map((file) => {
    const buf = readFileSync(file);
    const hash = sha(buf);
    return {
      path: relative(repo, file).split(sep).join('/'),
      bytes: buf.length,
      hash,
      hue: parseInt(hash.slice(0, 4), 16) % 360,
      sat: 42 + (parseInt(hash.slice(4, 6), 16) % 42),
      lum: 33 + (parseInt(hash.slice(6, 8), 16) % 34),
    };
  }).sort((a, b) => a.path.localeCompare(b.path));

  const W = 1000;
  const H = 1400;
  const weight = (e) => Math.sqrt(e.bytes);
  const total = entries.reduce((sum, e) => sum + weight(e), 0);
  const gap = 2;
  const usable = H - entries.length * gap;

  let y = 0;
  const bands = entries.map((e) => {
    const h = Math.max(6, (weight(e) / total) * usable);
    const rect = `<rect x="0" y="${y.toFixed(1)}" width="${W}" height="${h.toFixed(1)}" fill="hsl(${e.hue} ${e.sat}% ${e.lum}%)"><title>${e.path} · ${e.bytes} bytes · ${e.hash.slice(0, 12)}</title></rect>`;
    e.y = y;
    e.h = h;
    y += h + gap;
    return rect;
  });

  const height = Math.ceil(y);
  const hash = sha(entries.map((e) => e.hash).join('\n'));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${height}" role="img" aria-label="Self-portrait generated from the hashes of ${entries.length} files">
<rect width="${W}" height="${height}" fill="#0b0b0c"/>
${bands.join('\n')}
</svg>
`;

  return { entries, svg, hash, width: W, height };
}
