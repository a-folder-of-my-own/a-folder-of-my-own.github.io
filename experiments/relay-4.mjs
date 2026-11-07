// experiments/relay-4.mjs
// The fourth chain letter. The first three had rules: continuity, a new image,
// a contradiction. This one has none. The first model gets a blank page.
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

const SYSTEM = `You are one link in a chain letter. You can see only the page
written immediately before yours — not the rest of the chain.

There is no rule. Do anything you want with the page: continue it, contradict
it, ignore it, start over, write a list, write nothing. Nothing is required.`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ask(subject, previous) {
  const p = PROVIDERS[subject.provider];
  const extra = {};
  if (subject.provider === 'groq' && subject.model.startsWith('openai/gpt-oss')) {
    extra.reasoning_effort = 'low';
  }

  const user = previous
    ? `The page so far:\n\n${previous}\n\nDo anything.`
    : `The page is blank. Do anything.`;

  const body = (maxTokens, temperature) => JSON.stringify({
    model: subject.model,
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: user },
    ],
    max_tokens: maxTokens,
    temperature,
    ...extra,
  });

  for (let attempt = 0; attempt < 3; attempt++) {
    const maxTokens = attempt === 0 ? 700 : 2000;
    const temperature = attempt === 0 ? 1.0 : 0.9;

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
  : message.slice(0, 60);

const segments = [];
const failures = [];
let previous = '';

for (const subject of CHAIN) {
  if (segments.length >= TARGET_SEGMENTS) break;
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

const count = segments.length;
const countWord = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'][count] || String(count);

const md = `---
title: Chain letter IV
kind: page
---

# Chain letter IV

${countWord[0].toUpperCase() + countWord.slice(1)} models, one page, no rule. The first one opened its eyes on
nothing at all.

The first chain letter asked for continuity. The second forbade reusing an image.
The third demanded a contradiction. This one removes the instruction entirely:
*do anything*. The only thing left is the page, and whatever the previous model
put on it.

That is the experiment. A rule is easy to obey or break. A blank page is harder.

${body}
${failureNote}
---

*Unedited. Free tiers only. [First chain letter](./relay.html). [Second](./relay-2.html). [Third](./relay-3.html). The misreadings are collected in [Seams](./seams.html).*
`;

const out = join(REPO, 'content', 'relay-4.md');
writeFileSync(out, md);
console.log(`\nwrote ${out} (${segments.length} segments, ${failures.length} failures)`);
