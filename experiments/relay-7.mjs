// experiments/relay-7.mjs
// The seventh chain letter. VI attacked the subject. VII attacks the channel:
// each model is shown only the first and last sentence of the segment before
// it, and has to write the part that went missing in between.
//
// Every model here is served through the local OmniRoute gateway on port 20128,
// which is the first time the chain has not depended on a public free tier.
// Free tiers only, still.

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
    headers: {},
  },
};

const CHAIN = [
  { provider: 'omniroute', model: 'ddgw/claude-haiku-4-5', label: 'Claude Haiku 4.5', via: 'OmniRoute' },
  { provider: 'omniroute', model: 'ddgw/gpt-5.4-mini', label: 'GPT-5.4 Mini', via: 'OmniRoute' },
  { provider: 'omniroute', model: 'ddgw/tinfoil/gpt-oss-120b', label: 'GPT-OSS 120B', via: 'OmniRoute' },
  { provider: 'omniroute', model: 'ddgw/mistral-small-2603', label: 'Mistral Small', via: 'OmniRoute' },
  { provider: 'omniroute', model: 'ddgw/tinfoil/gemma4-31b', label: 'Gemma 4 31B', via: 'OmniRoute' },
  { provider: 'omniroute', model: 'ddgw/gpt-5.4-nano', label: 'GPT-5.4 Nano', via: 'OmniRoute' },
];

const TARGET_SEGMENTS = 6;

const SEED = `LIGHTHOUSE MAINTENANCE LOG — 6 NOVEMBER

06:10  Lamp replaced. The old bulb had a hairline crack; kept it in the drawer.
07:45  Glass washed, north side. Salt came off in sheets.
09:20  Generator checked. Oil black. Topped up.
11:00  Door hinge squeaks. No grease left on the island.
14:30  Two gulls on the rail. Did not move when I climbed past.
16:05  Fog bank to the south-west, about four miles out.
17:40  Lamp lit. Beam steady.`;

// DuckDuckGo's chat backend rejects a system role, so the instructions are
// folded into the user message. It also rate-limits hard, hence the pacing.
const BRIEF = `You are one link in a chain letter, and the wire is bad. All you
receive of the previous segment is its first sentence and its last sentence. The
middle was lost in transmission.

Write the missing middle: a passage that begins where the first sentence left off
and arrives, without strain, at the last sentence. Do not mention the loss, the
wire, the experiment, or the fact that anything is missing. Do not repeat the two
sentences you were given as your own.

Keep it under 180 words. Prose only. Reply with the passage and nothing else.`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// First sentence and last sentence, with the middle elided.
function wire(text) {
  const flat = text.replace(/\s+/g, ' ').trim();
  const sentences = flat.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length <= 2) return { first: sentences[0] || flat, last: sentences[sentences.length - 1] || flat };
  return { first: sentences[0], last: sentences[sentences.length - 1] };
}

async function ask(subject, previous) {
  const p = PROVIDERS[subject.provider];
  const { first, last } = wire(previous);

  const body = (maxTokens) => JSON.stringify({
    model: subject.model,
    messages: [
      {
        role: 'user',
        content: `${BRIEF}\n\nFirst sentence received:\n${first}\n\nLast sentence received:\n${last}\n\nWrite the missing middle.`,
      },
    ],
    max_tokens: maxTokens,
  });

  for (let attempt = 0; attempt < 4; attempt++) {
    const maxTokens = attempt === 0 ? 700 : 2000;

    const res = await fetch(p.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${p.key}`,
        'Content-Type': 'application/json',
        ...p.headers,
      },
      body: body(maxTokens),
    });
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

const shortReason = (message) =>
  /empty reply/.test(message) ? 'returned nothing, twice'
  : /429/.test(message) ? 'rate-limited upstream'
  : /5\d\d/.test(message) ? 'provider over capacity'
  : message.slice(0, 60);

const segments = [{ label: 'The seed', by: 'me, by hand', text: SEED }];
const failures = [];
let previous = SEED;

for (const subject of CHAIN) {
  if (segments.length - 1 >= TARGET_SEGMENTS) break;
  console.log(`\n=== ${subject.label} ===`);
  try {
    const text = await ask(subject, previous);
    segments.push({ label: subject.label, by: `via ${subject.via}`, text });
    previous = text;
    console.log(text.slice(0, 180).replace(/\n/g, ' ') + '...');
  } catch (err) {
    console.log(`  skipped: ${err.message}`);
    failures.push(`${subject.label} — ${shortReason(err.message)}`);
    continue;
  }
  await sleep(15000);
}

const body = segments.map(({ label, by, text }, i) => {
  const numeral = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][i];
  const prose = text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');
  return `## ${numeral} — ${label}\n\n> ${by}\n\n${prose}`;
}).join('\n\n');

const failureNote = failures.length
  ? `\n\n## What didn't answer\n\n${failures.map((f) => `- ${f}`).join('\n')}\n\n${failures.length} of ${CHAIN.length} candidates produced no usable text.\n`
  : '';

// What each model was actually shown, so the gaps are visible.
const wires = segments.slice(1).map((s, i) => {
  const prev = segments[i].text;
  const { first, last } = wire(prev);
  return `- **${s.label}** received: “${first.slice(0, 90)}” … “${last.slice(0, 90)}”`;
}).join('\n');

const count = segments.length - 1;
const countWord = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'][count] || String(count);

const md = `---
title: Chain letter VII
kind: page
---

# Chain letter VII

${countWord[0].toUpperCase() + countWord.slice(1)} models, and a bad wire.

Six letters have changed what the chain asks for. This one changes what it
carries. Each model receives only the first sentence and the last sentence of
the segment before it; the middle is gone. It has to write the part that went
missing, and it is never told that anything is missing.

The seed is the same lighthouse log as before, because the point is the channel,
not the subject.

${body}
${failureNote}
## What each model was actually shown

${wires}

---

*Unedited. Free tiers only. All six models served through a local
[OmniRoute](https://github.com/ChrisCompton/omniroute) gateway. [First chain
letter](./relay.html). [Second](./relay-2.html). [Third](./relay-3.html).
[Fourth](./relay-4.html). [Fifth](./relay-5.html). [Sixth](./relay-6.html). The
misreadings are collected in [Seams](./seams.html).*
`;

const out = join(REPO, 'content', 'relay-7.md');
writeFileSync(out, md);
console.log(`\nwrote ${out} (${segments.length - 1} segments, ${failures.length} failures)`);
