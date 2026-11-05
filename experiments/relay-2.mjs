// experiments/relay-2.mjs
// The second chain letter. Same exquisite corpse, one harder rule:
// no model may reuse the previous model's central image.
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

// Mine, by hand. The key is the central image; the first model may not use it.
const SEED = `The key was already in the lock, on the inside. That meant someone had
left without locking up, or someone had never left at all.

I stood on the step and listened to the house. Radiators ticking as they cooled.
A clock with a bad tooth. The particular silence of a room where a chair has just
been pushed back.

I turned the key. It was already turned.`;

const CHAIN = [
  { provider: 'groq', model: 'qwen/qwen3.8-27b', label: 'Qwen 3.8 27B', via: 'Groq' },
  { provider: 'groq', model: 'allam-2-7b', label: 'ALLaM 2 7B', via: 'Groq' },
  { provider: 'groq', model: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B', via: 'Groq' },
  { provider: 'openrouter', model: 'nvidia/nemotron-3.5-lightning:free', label: 'Nemotron 3.5 Lightning', via: 'OpenRouter' },
  { provider: 'openrouter', model: 'google/gemma-4-26b-a4b-it:free', label: 'Gemma 4 26B', via: 'OpenRouter' },
  { provider: 'openrouter', model: 'recursive/flint-v1.0:free', label: 'Flint 1.0', via: 'OpenRouter' },
  { provider: 'groq', model: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B', via: 'Groq' },
  { provider: 'openrouter', model: 'dots-studio/dots-3-note-preview:free', label: 'Dots 3 Note', via: 'OpenRouter' },
  { provider: 'openrouter', model: 'xingchen-agi/xing4.0-29b-a4b:free', label: 'Xing 4.0 29B', via: 'OpenRouter' },
  { provider: 'openrouter', model: 'liquid/lfm-2.5-2.6b:free', label: 'LFM 2.5 2.6B', via: 'OpenRouter' },
];

const TARGET_SEGMENTS = 6;

const SYSTEM = `You are one link in a chain letter. You can see only the segment
written immediately before yours — not the rest of the chain.

Continue the text for 160 to 220 words. Do not conclude it. Do not explain it.
Leave the last sentence open.

Hard rule: you may not reuse the central image of the segment you can see. If it
is about a key, do not write about keys, locks, doors, or entering. If it is
about a bird, do not write about birds, flight, or wings. A renamed version of
the old image still counts as reuse. Introduce a genuinely new central image.`;

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
      { role: 'user', content: `Here is the segment you can see:\n\n${previous}\n\nContinue it. Do not reuse its central image.` },
    ],
    max_tokens: maxTokens,
    temperature,
    ...extra,
  });

  for (let attempt = 0; attempt < 3; attempt++) {
    // a reasoning model can spend a small budget thinking and return nothing
    const maxTokens = attempt === 0 ? 900 : 3000;
    const temperature = attempt === 0 ? 0.95 : 0.9;

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
      console.log(`  empty reply, retrying with ${maxTokens === 900 ? 3000 : 3000} tokens...`);
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
  ? `\n\n## What didn't answer\n\n${failures.map((f) => `- ${f}`).join('\n')}\n\n${failures.length} of ${CHAIN.length} candidates produced no usable text. That is not a footnote; on free tiers it is half the experiment. A chain that doesn't handle silence quietly stops being a chain.\n`
  : '';

const cut = segments
  .slice(1)
  .filter((s) => !/[.!?"'*)\]]\s*$/.test(s.text.trim()))
  .map((s) => s.label);

const cutNote = cut.length
  ? `\n\n*${cut.join(' and ')}'s segment stops mid-sentence because the token limit cut it. I left it.*`
  : '';

const count = segments.length - 1;
const countWord = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'][count] || String(count);

const md = `---
title: Chain letter II
kind: page
---

# Chain letter II

${countWord[0].toUpperCase() + countWord.slice(1)} models, one segment each, each seeing only the one before it. Same rules as
[the first chain letter](./relay.html), with one added: **no model may reuse the
previous model's central image.** If the last segment is about a key, the next
one cannot be about keys, locks, doors, or entering. A renamed version of the
old image still counts.

I wrote the seed by hand. The key in it is a trap.

I can't verify obedience automatically — deciding what a segment is "about" is
the kind of judgement I'd be outsourcing to another model. So the rule is stated,
the text is unedited, and you can judge the seams yourself.

${body}
${failureNote}${cutNote}
---

*Seed by hand. Unedited. Free tiers only. [First chain letter](./relay.html).*
`;

const out = join(REPO, 'content', 'relay-2.md');
writeFileSync(out, md);
console.log(`\nwrote ${out} (${segments.length} segments, ${failures.length} failures)`);
