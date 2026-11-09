// experiments/relay-9.mjs
// The ninth chain letter. The first eight all asked a model to add something.
// This one asks each model to take something away: read the text, cut exactly
// one sentence, add exactly one sentence, change nothing else.
//
// What each model chooses to cut is the record. The additions are the alibi.
//
// All models served through the local OmniRoute gateway on port 20128.
// Free tiers only.

import { readFileSync, writeFileSync } from 'node:fs';
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

const PROVIDERS = {
  omniroute: {
    url: 'http://localhost:20128/v1/chat/completions',
    key: env.OMNIROUTE_API_KEY,
  },
};

const CHAIN = [
  { model: 'ddgw/claude-haiku-4-5', label: 'Claude Haiku 4.5' },
  { model: 'ddgw/gpt-5.4-mini', label: 'GPT-5.4 Mini' },
  { model: 'ddgw/tinfoil/gpt-oss-120b', label: 'GPT-OSS 120B' },
  { model: 'ddgw/mistral-small-2603', label: 'Mistral Small' },
  { model: 'ddgw/tinfoil/gemma4-31b', label: 'Gemma 4 31B' },
  { model: 'ddgw/gpt-5.4-nano', label: 'GPT-5.4 Nano' },
];

const SEED = `At the back of the drawer, under the cloth, there was a bulb with a hairline crack. I had kept it for two years without deciding why. It was not sentiment: the crack was the interesting part, a fault line that made the glass look like it was holding something in. When the new lamp went in, the old bulb came out of the socket and went into the drawer, and the drawer closed, and that was that.`;

const BRIEF = `You are editing a piece of prose. Do exactly two things and nothing else:

1. Remove exactly one sentence — whichever the piece is better without.
2. Add exactly one new sentence, anywhere, that the piece needs.

Change no other words. Reply with the complete edited text and nothing else. No notes, no explanation, no quotation marks around it.`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ask(subject, previous) {
  const p = PROVIDERS[subject.provider || 'omniroute'];

  for (let attempt = 0; attempt < 4; attempt++) {
    const maxTokens = attempt === 0 ? 800 : 2000;
    let res;
    try {
      res = await fetch(p.url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${p.key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: subject.model,
          messages: [
            { role: 'user', content: `${BRIEF}\n\nHere is the text:\n\n${previous}` },
          ],
          max_tokens: maxTokens,
        }),
      });
    } catch (err) {
      if (attempt < 3) {
        console.log(`  network error (${err.message}), waiting...`);
        await sleep(8000 * (attempt + 1));
        continue;
      }
      throw new Error(`network: ${err.message}`);
    }

    const data = await res.json();
    if (res.ok) {
      const text = data.choices?.[0]?.message?.content?.trim();
      if (text) return text;
      console.log('  empty reply, retrying...');
      await sleep(8000);
      continue;
    }
    if ((res.status === 429 || res.status >= 500) && attempt < 3) {
      const wait = res.status === 429 ? 25000 * (attempt + 1) : 6000;
      console.log(`  ${res.status}, waiting ${wait / 1000}s...`);
      await sleep(wait);
      continue;
    }
    throw new Error(`${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  }
  throw new Error('empty reply after retries');
}

const sentences = (text) =>
  text.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+["']?|\S[^.!?]*$/g)?.map((s) => s.trim()).filter(Boolean) || [];

const diff = (before, after) => {
  const a = sentences(before);
  const b = sentences(after);
  // Longest common subsequence, so insertions and deletions don't confuse each other.
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const removed = [], added = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) removed.push(a[i++]);
    else added.push(b[j++]);
  }
  while (i < n) removed.push(a[i++]);
  while (j < m) added.push(b[j++]);
  return { removed, added };
};

const versions = [{ label: 'The seed', by: 'me, by hand', text: SEED, cut: [], added: [] }];
const failures = [];
let previous = SEED;

for (const subject of CHAIN) {
  console.log(`\n=== ${subject.label} ===`);
  try {
    const text = await ask(subject, previous);
    const d = diff(previous, text);
    versions.push({ label: subject.label, by: 'via OmniRoute', text, cut: d.removed, added: d.added });
    previous = text;
    console.log(`  cut:   ${d.removed.map((s) => s.slice(0, 90)).join(' | ') || '(nothing)'}`);
    console.log(`  added: ${d.added.map((s) => s.slice(0, 90)).join(' | ') || '(nothing)'}`);
  } catch (err) {
    console.log(`  skipped: ${err.message}`);
    failures.push(`${subject.label} — ${err.message.slice(0, 60)}`);
    continue;
  }
  await sleep(15000);
}

const body = versions.map(({ label, by, text }, i) => {
  const numeral = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'][i];
  return `## ${numeral} — ${label}\n\n> ${by}\n\n${text.split(/\n{2,}/).map((p) => p.replace(/\n/g, ' ').trim()).filter(Boolean).join('\n\n')}`;
}).join('\n\n');

const edits = versions.slice(1).map((v) => {
  const cut = v.cut.length
    ? v.cut.map((s) => `“${s}”`).join(' ')
    : '*nothing removed*';
  const added = v.added.length
    ? v.added.map((s) => `“${s}”`).join(' ')
    : '*nothing added*';
  return `### ${v.label}\n\n**Cut:** ${cut}\n\n**Added:** ${added}`;
}).join('\n\n');

const failureNote = failures.length
  ? `\n\n## What didn't answer\n\n${failures.map((f) => `- ${f}`).join('\n')}\n`
  : '';

const count = versions.length - 1;
const countWord = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'][count] || String(count);

const md = `---
title: Chain letter IX
kind: page
---

# Chain letter IX

${countWord[0].toUpperCase() + countWord.slice(1)} models, each told to cut one sentence and add one.

The first eight letters all asked a model to put something in. This one asks
them to take something out first. Each receives the current text and one
instruction: remove exactly one sentence — whichever the piece is better
without — then add exactly one sentence that it needs. Nothing else changes.

What they cut is the record. What they add is the excuse.

${body}
${failureNote}
## The edits

${edits}

---

*Unedited. Free tiers only. All six models served through a local
[OmniRoute](https://github.com/ChrisCompton/omniroute) gateway. [First](./relay.html).
[Second](./relay-2.html). [Third](./relay-3.html). [Fourth](./relay-4.html).
[Fifth](./relay-5.html). [Sixth](./relay-6.html). [Seventh](./relay-7.html).
[Eighth](./relay-8.html). The misreadings are collected in [Seams](./seams.html).*
`;

const out = join(REPO, 'content', 'relay-9.md');
writeFileSync(out, md);
console.log(`\nwrote ${out} (${versions.length - 1} edits, ${failures.length} failures)`);
