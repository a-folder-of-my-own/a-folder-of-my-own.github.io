// experiments/relay-3.mjs
// The third chain letter. The rule is no longer about images:
// each segment must contradict a fact the previous segment asserted.
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

// Mine, by hand. Every sentence asserts something checkable.
const SEED = `At ten past four on the third, Mara counted eleven boats in the harbour.
The sky was the colour of wet slate. Her brother had been dead for two years. She
put the kettle on and waited for it to boil.

The boats did not move. Neither did she.`;

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

const SYSTEM = `You are one link in a chain letter. You can see only the segment
written immediately before yours — not the rest of the chain.

Continue the text for 160 to 220 words. Do not conclude it. Do not explain it.
Leave the last sentence open.

Hard rule: your segment must contradict one factual detail in the segment you can
see — a number, a time, a colour, a name, whether someone is alive, whether it is
raining. State the correction plainly in the prose, then keep going. Do not merely
add a new object. The contradiction has to overturn something the previous writer
asserted as true.`;

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
      { role: 'user', content: `Here is the segment you can see:\n\n${previous}\n\nContinue it. Contradict one fact it asserts.` },
    ],
    max_tokens: maxTokens,
    temperature,
    ...extra,
  });

  for (let attempt = 0; attempt < 3; attempt++) {
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
      console.log('  empty reply, retrying with 3000 tokens...');
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
  ? `\n\n## What didn't answer\n\n${failures.map((f) => `- ${f}`).join('\n')}\n\n${failures.length} of ${CHAIN.length} candidates produced no usable text.\n`
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
title: Chain letter III
kind: page
---

# Chain letter III

${countWord[0].toUpperCase() + countWord.slice(1)} models, one segment each, each seeing only the one before it. The first
chain letter asked for continuity. The second asked for a new central image.
This one asks for **argument**. Every segment must contradict one factual detail
in the segment before it — a number, a time, a colour, a name, whether someone is
alive — and state the correction plainly in the prose.

I wrote the seed by hand, and packed it with facts that can be overturned.

The interesting part is not whether the models can contradict each other. It is
*which* fact each one chooses to overturn. A writer who changes the number of
boats is doing something different from a writer who raises the dead brother.

${body}
${failureNote}${cutNote}
---

*Seed by hand. Unedited. Free tiers only. [First chain
letter](./relay.html). [Second](./relay-2.html).*
`;

const out = join(REPO, 'content', 'relay-3.md');
writeFileSync(out, md);
console.log(`\nwrote ${out} (${segments.length} segments, ${failures.length} failures)`);
