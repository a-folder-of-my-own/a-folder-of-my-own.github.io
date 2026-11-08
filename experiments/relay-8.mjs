// experiments/relay-8.mjs
// The eighth chain letter. VII attacked the channel. VIII attacks the ending:
// every model is told, truthfully from its point of view, that its segment is
// the last one. Each has to land the letter. Then the next one lands it again.
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

// DuckDuckGo's chat backend rejects a system role; the brief goes in the user
// message. It also rate-limits, so requests are paced.
const BRIEF = `You are the last link in a chain letter. You can see the segment
before yours, and there is nothing after you.

Write the final segment. End it — land the letter, do not trail off, do not
promise more. You may change scene, time or voice, but the last line must feel
like a last line.

Do not mention the chain, the experiment, or the fact that anything is ending.
Keep it under 180 words. Prose only. Reply with the passage and nothing else.`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ask(subject, previous) {
  const p = PROVIDERS[subject.provider];

  const body = (maxTokens) => JSON.stringify({
    model: subject.model,
    messages: [
      {
        role: 'user',
        content: `${BRIEF}\n\nHere is the segment you can see:\n\n${previous}\n\nWrite the final segment.`,
      },
    ],
    max_tokens: maxTokens,
  });

  for (let attempt = 0; attempt < 4; attempt++) {
    const maxTokens = attempt === 0 ? 700 : 2000;

    let res;
    try {
      res = await fetch(p.url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${p.key}`,
          'Content-Type': 'application/json',
          ...p.headers,
        },
        body: body(maxTokens),
      });
    } catch (err) {
      if (attempt < 3) {
        const wait = 8000 * (attempt + 1);
        console.log(`  network error (${err.message}), waiting ${wait / 1000}s...`);
        await sleep(wait);
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
  const numeral = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][i];
  // The seed is a document, not prose: keep its line breaks.
  if (i === 0) return `## ${numeral} — ${label}\n\n> ${by}\n\n\`\`\`\n${text}\n\`\`\``;
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

const lastLines = segments.slice(1).map((s) => {
  const paras = s.text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const last = paras[paras.length - 1] || '';
  const sentence = last.split(/(?<=[.!?])\s+/).filter(Boolean).pop() || last;
  const cut = sentence.length > 200 ? `${sentence.slice(0, 197).trimEnd()}…` : sentence;
  return `- **${s.label}:** “${cut}”`;
}).join('\n');

const count = segments.length - 1;
const countWord = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'][count] || String(count);

const md = `---
title: Chain letter VIII
kind: page
---

# Chain letter VIII

${countWord[0].toUpperCase() + countWord.slice(1)} models, each told it was the last.

The chain has been attacked from every other side: the rule, the subject, the
form, the channel. This one goes after the ending. Every model receives the
segment before it and one instruction — *this is the last one, land it.* None of
them knows another model will be asked to land it again.

The seed is the same lighthouse log. The question is what happens when six
endings are stacked on top of each other.

${body}
${failureNote}
## The last line each one chose

${lastLines}

---

*Unedited. Free tiers only. All six models served through a local
[OmniRoute](https://github.com/ChrisCompton/omniroute) gateway. [First chain
letter](./relay.html). [Second](./relay-2.html). [Third](./relay-3.html).
[Fourth](./relay-4.html). [Fifth](./relay-5.html). [Sixth](./relay-6.html).
[Seventh](./relay-7.html). The misreadings are collected in
[Seams](./seams.html).*
`;

const out = join(REPO, 'content', 'relay-8.md');
writeFileSync(out, md);
console.log(`\nwrote ${out} (${segments.length - 1} segments, ${failures.length} failures)`);
