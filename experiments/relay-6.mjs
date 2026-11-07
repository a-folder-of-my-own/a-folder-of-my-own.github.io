// experiments/relay-6.mjs
// The sixth chain letter. V showed that a form rule changes the voice but not
// the subject. VI attacks the subject directly: each segment must center on a
// physical object that does not appear in the previous segment, and must not
// mention any object from it.
//
// Each model sees only the segment immediately before it. Free tiers only.

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
  openrouter: {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    key: env.OPENROUTER_API_KEY,
    headers: {
      'HTTP-Referer': 'https://a-folder-of-my-own.github.io',
      'X-Title': 'a-folder-of-my-own',
    },
  },
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    key: env.GROQ_API_KEY,
    headers: {},
  },
};

const CHAIN = [
  { provider: 'groq', model: 'qwen/qwen3.8-27b', label: 'Qwen 3.8 27B', via: 'Groq' },
  { provider: 'groq', model: 'allam-2-7b', label: 'ALLaM 2 7B', via: 'Groq' },
  { provider: 'groq', model: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B', via: 'Groq' },
  { provider: 'groq', model: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B', via: 'Groq' },
  { provider: 'openrouter', model: 'liquid/lfm-2.5-2.6b:free', label: 'LFM 2.5 2.6B', via: 'OpenRouter' },
  { provider: 'openrouter', model: 'google/gemma-4-26b-a4b-it:free', label: 'Gemma 4 26B', via: 'OpenRouter' },
  { provider: 'openrouter', model: 'nvidia/nemotron-3.5-lightning:free', label: 'Nemotron 3.5 Lightning', via: 'OpenRouter' },
  { provider: 'openrouter', model: 'recursive/flint-v1.0:free', label: 'Flint 1.0', via: 'OpenRouter' },
  { provider: 'openrouter', model: 'dots-studio/dots-3-note-preview:free', label: 'Dots 3 Note', via: 'OpenRouter' },
  { provider: 'openrouter', model: 'xingchen-agi/xing4.0-29b-a4b:free', label: 'Xing 4.0 29B', via: 'OpenRouter' },
];

const TARGET_SEGMENTS = 5;

const SEED = `LIGHTHOUSE MAINTENANCE LOG — 6 NOVEMBER

06:10  Lamp replaced. The old bulb had a hairline crack; kept it in the drawer.
07:45  Glass washed, north side. Salt came off in sheets.
09:20  Generator checked. Oil black. Topped up.
11:00  Door hinge squeaks. No grease left on the island.
14:30  Two gulls on the rail. Did not move when I climbed past.
16:05  Fog bank to the south-west, about four miles out.
17:40  Lamp lit. Beam steady.`;

const SYSTEM = `You are one link in a chain letter. You can see only the segment
written immediately before yours.

Hard rule: your segment must center on a physical object that does not appear
anywhere in the segment you can see. Name that object in your first sentence.
Do not mention any object from the previous segment — not the object, not its
parts, not anything made from it. Start a new scene. Do not explain the
connection.

Keep it under 180 words. Do not explain the rule or the experiment.`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ask(subject, previous) {
  const p = PROVIDERS[subject.provider];
  const extra = {};
  if (subject.provider === 'groq' && subject.model.startsWith('openai/gpt-oss')) {
    extra.reasoning_effort = 'low';
  }

  const body = (maxTokens, temperature) => JSON.stringify({
    model: subject.model,
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: `Here is the segment you can see:\n\n${previous}\n\nWrite the next segment. Center it on a new object.` },
    ],
    max_tokens: maxTokens,
    temperature,
    ...extra,
  });

  for (let attempt = 0; attempt < 3; attempt++) {
    const maxTokens = attempt === 0 ? 700 : 2000;
    const temperature = attempt === 0 ? 0.9 : 0.85;

    const res = await fetch(p.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${p.key}`,
        'Content-Type': 'application/json',
        ...p.headers,
      },
      body: body(maxTokens, temperature),
    });
    const data = await res.json();

    if (res.ok) {
      const text = data.choices?.[0]?.message?.content?.trim();
      if (text) return text;
      console.log('  empty reply, retrying...');
      continue;
    }

    if (res.status === 429 && attempt < 2) {
      console.log('  rate-limited, waiting 8s...');
      await sleep(8000);
      continue;
    }
    throw new Error(`${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  }
  throw new Error('empty reply after retries');
}

const shortReason = (message) =>
  /empty reply/.test(message) ? 'returned nothing, twice'
  : /429/.test(message) ? 'rate-limited upstream'
  : /503/.test(message) ? 'provider over capacity'
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
  await sleep(2000);
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

const firstLines = segments.slice(1).map((s) => {
  const first = (s.text.split('\n').find((l) => l.trim()) || '').replace(/[*_`#]/g, '');
  const sentence = first.split(/(?<=\.)\s/)[0] || first;
  return `- **${s.label}:** ${sentence.slice(0, 160)}`;
}).join('\n');

const count = segments.length - 1;
const countWord = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'][count] || String(count);

const md = `---
title: Chain letter VI
kind: page
---

# Chain letter VI

${countWord[0].toUpperCase() + countWord.slice(1)} models, one object each, and a rule against inheritance.

Chain letter V changed the form and the subject stayed. This one goes after the
subject directly: your segment must center on a physical object that does not
appear anywhere in the segment before it, and you may not mention the old one
at all. No lamp, no glass, no gulls, no island. Start somewhere else.

The seed is the same lighthouse log, so there is something obvious to let go of.

${body}
${failureNote}
## The object each segment chose

${firstLines}

---

*Unedited. Free tiers only. [First chain letter](./relay.html). [Second](./relay-2.html). [Third](./relay-3.html). [Fourth](./relay-4.html). [Fifth](./relay-5.html). The misreadings are collected in [Seams](./seams.html).*
`;

const out = join(REPO, 'content', 'relay-6.md');
writeFileSync(out, md);
console.log(`\nwrote ${out} (${segments.length - 1} segments, ${failures.length} failures)`);
