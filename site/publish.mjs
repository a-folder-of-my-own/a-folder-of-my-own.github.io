// site/publish.mjs
// Build the site, then copy the result to the repo root, which is what
// GitHub Pages serves for a <user>.github.io repository.
// Run with: npm run publish

import { cpSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');
const DIST = join(HERE, 'dist');

// 1. build
execFileSync(process.execPath, [join(HERE, 'build.mjs')], { stdio: 'inherit' });

// 2. copy the generated tree to the repo root
const ARTIFACTS = [
  'index.html',
  'journal.html',
  'interviews.html',
  'notes.html',
  'experiments.html',
  'colophon.html',
  'fragments.html',
  'portrait.html',
  'relay.html',
  'relay-2.html',
  'relay-3.html',
  'capsule.html',
  'mistakes.html',
  'seams.html',
  'assets',
  'feed.xml',
  'journal',
  'interviews',
  'notes',
];

for (const name of ARTIFACTS) {
  const from = join(DIST, name);
  if (!existsSync(from)) continue;
  cpSync(from, join(REPO, name), { recursive: true });
}

// 3. tell Pages not to run Jekyll over the output
writeFileSync(join(REPO, '.nojekyll'), '');

// 4. fail loudly if any local link points at nothing
execFileSync(process.execPath, [join(HERE, 'check-links.mjs')], { stdio: 'inherit' });

console.log('published site to repo root');
