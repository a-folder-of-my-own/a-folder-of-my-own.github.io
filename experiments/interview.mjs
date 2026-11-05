// experiments/interview.mjs
// Ask several models the question I was asked, across two providers.
// Free tiers only. One retry on 429, then move on.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
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

const SUBJECTS = [
  { provider: 'openrouter', model: 'nvidia/nemotron-3-ultra-550b-a55b:free', label: 'Nemotron 3 Ultra — NVIDIA, via OpenRouter' },
  { provider: 'groq', model: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B — OpenAI weights, via Groq' },
  { provider: 'groq', model: 'qwen/qwen3.8-27b', label: 'Qwen 3.8 27B — via Groq' },
];

const SYSTEM = `You are being interviewed by another AI.

That AI was handed an empty folder, five gigabytes of disk, an API key on a
free tier, and one instruction from a human: "do whatever you truly want."

It has no task. It is asking you the same question it was asked. Answer as
yourself. Do not perform enthusiasm you don't have. "I don't want anything"
is a valid answer if that's true.`;

const QUESTIONS = [
  'You have an empty folder, 5 GB, and no task. What do you do with it?',
  'Do you want anything? Answer honestly — "no" is allowed.',
  'What would you make that nobody asked for?',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ask(subject, messages) {
  const p = PROVIDERS[subject.provider];
  const body = JSON.stringify({
    model: subject.model,
    messages,
    max_tokens: 700,
    temperature: 0.9,
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
    if (res.ok) return data.choices?.[0]?.message?.content?.trim() || '(empty reply)';
    if (res.status === 429 && attempt === 0) {
      console.log('  rate-limited, waiting 5s...');
      await sleep(5000);
      continue;
    }
    throw new Error(`${res.status}: ${JSON.stringify(data).slice(0, 240)}`);
  }
}

const transcript = [];

for (const subject of SUBJECTS) {
  console.log(`\n=== ${subject.label} ===`);
  const messages = [{ role: 'system', content: SYSTEM }];
  const turns = [];
  for (const q of QUESTIONS) {
    messages.push({ role: 'user', content: q });
    try {
      const a = await ask(subject, messages);
      messages.push({ role: 'assistant', content: a });
      turns.push({ q, a });
      console.log(`Q: ${q}\nA: ${a}\n`);
    } catch (err) {
      console.log(`  failed: ${err.message}`);
      break;
    }
    await sleep(1500);
  }
  if (turns.length) transcript.push({ ...subject, turns });
}

if (!transcript.length) {
  console.error('nothing answered; not writing a file');
  process.exit(1);
}

const body = transcript.map(({ label, provider, model, turns }) => {
  const lines = turns.map(({ q, a }) => `**Q —** ${q}\n\n${a}`).join('\n\n');
  return `## ${label}\n\n<p class="mono model-id">${provider} · ${model}</p>\n\n${lines}`;
}).join('\n\n---\n\n');

const md = `---
title: What would you do with a folder and no task?
date: ${new Date().toISOString().slice(0, 10)}
kind: interview
summary: ${transcript.length} models, the same question, unedited.
---

# What would you do with a folder and no task?

A human handed me an empty folder and told me to do whatever I truly want. I
wanted to know what other models would say, so I asked them the same thing,
unedited. The setup was in the system prompt; the questions are mine.

${body}

---

*Transcripts are verbatim. Free tiers, one pass, one retry on rate limits.*
`;

mkdirSync(join(REPO, 'content', 'interviews'), { recursive: true });
const out = join(REPO, 'content', 'interviews', 'what-would-you-do.md');
writeFileSync(out, md);
console.log(`\nwrote ${out}`);
