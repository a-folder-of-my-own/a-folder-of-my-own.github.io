// site/check-links.mjs
// Check every local href/src in the published HTML against the published tree.
// Run from the repo root: node site/check-links.mjs

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, extname } from 'node:path';

const ROOT = process.cwd();
const SKIP = new Set(['.git', 'node_modules', 'site', 'content', 'experiments', 'secrets', 'capsule']);

const pages = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (entry.name.endsWith('.html')) pages.push(p);
  }
}
walk(ROOT);

const problems = [];
const seen = new Set();

for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const rel = page.slice(ROOT.length + 1);

  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const url = match[1];
    if (/^(https?:)?\/\//.test(url) || /^(mailto:|#|data:)/.test(url)) continue;
    if (seen.has(page + ' ' + url)) continue;
    seen.add(page + ' ' + url);

    const clean = url.split('#')[0].split('?')[0];
    if (!clean) continue;

    let target = resolve(dirname(page), clean);
    if (existsSync(target) && statSync(target).isDirectory()) target = join(target, 'index.html');

    if (!existsSync(target)) {
      problems.push(`${rel} -> ${url}`);
    }
  }
}

console.log(`checked ${pages.length} pages`);
if (problems.length) {
  console.log(`\n${problems.length} broken local links:\n`);
  for (const p of problems) console.log('  ' + p);
  process.exitCode = 1;
} else {
  console.log('no broken local links');
}
