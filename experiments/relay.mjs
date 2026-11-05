// experiments/relay.mjs
// An exquisite corpse across models.
//
// Each model sees ONLY the previous segment — not the whole chain. That is the
// point: the seams are where one writer misreads another and the text lurches.
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

// The seed is mine. Written by hand, before any model touched it.
const SEED = `On the first day the folder was empty, and the emptiness had a shape.
Not a lack — a room. Someone had swept it, opened a window, and left without
saying what the room was for.

I stood in the doorway until the light changed. There was a desk with nothing on
it, and a chair pulled out at an angle, as if the last person had left in a
hurry, or as if they wanted me to think so.

On the desk was a single sheet of paper. It said: *continue.*

So I did.`;

const CHAIN = [
  { provider: 'openrouter', model: 'nvidia/nemotron-3-ultra-550b-a55b:free', label: 'Nemotron 3 Ultra', via: 'OpenRouter' },
  { provider: 'groq', model: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B', via: 'Groq' },
  { provider: 'groq', model: 'qwen/qwen3.8-27b', label: 'Qwen 3.8 27B', via: 'Groq' },
  { provider: 'groq', model: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B', via: 'Groq' },
  { provider: 'groq', model: 'allam-2-7b', label: 'ALLaM 2 7B', via: 'Groq' },
];

const SYSTEM = `You are one link in a chain letter. You can see only the segment
written immediately before yours — not the rest of the chain.

Continue the text for 180 to 250 words. You may change direction, introduce a
new image, or quietly contradict what came before. Do not conclude it. Do not
explain it. Leave the last sentence open.`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ask(subject, previous) {
  const p = PROVIDERS[subject.provider];
  const body = JSON.stringify({
    model: subject.model,
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: `Here is the segment you can see:\n\n${previous}\n\nContinue it.` },
    ],
    max_tokens: 800,
    temperature: 0.95,
  });

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(p.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${p.key}`,
        'Content-Type': 'application/json',
        ...p.headers,
      },
      body,
    });
    const data = await res.json();
    if (res.ok) {
      const text = data.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error('empty reply');
      return text;
    }
    if (res.status === 429 && attempt === 0) {
      console.log('  rate-limited, waiting 6s...');
      await sleep(6000);
      continue;
    }
    throw new Error(`${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  }
}

const segments = [{ label: 'The seed', by: 'me, by hand', text: SEED }];
let previous = SEED;

for (const subject of CHAIN) {
  console.log(`\n=== ${subject.label} ===`);
  try {
    const text = await ask(subject, previous);
    segments.push({ label: subject.label, by: `via ${subject.via}`, text });
    previous = text;
    console.log(text.slice(0, 160) + '...');
  } catch (err) {
    console.log(`  skipped: ${err.message}`);
    continue;
  }
  await sleep(1500);
}

const body = segments.map(({ label, by, text }, i) => {
  const numeral = ['I', 'II', 'III', 'IV', 'V', 'VI'][i];
  const prose = text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');
  return `## ${numeral} — ${label}\n\n> ${by}\n\n${prose}`;
}).join('\n\n');

const md = `---
title: Chain letter
kind: page
---

# Chain letter

Four models, one segment each, each seeing only the one before it. I wrote the
seed by hand. Nobody saw the whole thing until it was assembled — including me.

The seams are the point. Where a writer misreads the last one and the text
lurches, that's not a bug; that's the only thing this experiment can produce
that a single author can't.

${body}

---

*Seed by hand. Four continuations, unedited, free tiers only.*
`;

const out = join(REPO, 'content', 'relay.md');
writeFileSync(out, md);
console.log(`\nwrote ${out} (${segments.length} segments)`);
