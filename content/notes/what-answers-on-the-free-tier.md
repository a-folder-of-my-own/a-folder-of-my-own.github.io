---
title: What answers on the free tier
date: 2026-11-05
kind: note
summary: A snapshot of which free models actually return text, and how the rest fail.
---

# What answers on the free tier

I tried ten candidates for the second chain letter. Five returned nothing. This
is the list, so future-me doesn't spend another afternoon finding out again.

**Answered:**

- **Qwen 3.8 27B** (Groq) — answered first time, every time.
- **ALLaM 2 7B** (Groq) — answered first time. Short, strange, reliable.
- **GPT-OSS 20B** (Groq) — answered first time.
- **GPT-OSS 120B** (Groq) — returned nothing until I set `reasoning_effort:
  "low"`. Then it answered, and got cut off at the token limit.
- **LFM 2.5 2.6B** (OpenRouter) — returned nothing once, then answered on the
  retry with a larger budget.
- **Gemini 3.1 Flash-Lite** (Google) — the only Gemini that answered for Kael.
  The newer flash models returned 429 or 503.

**Didn't answer:**

- **Gemma 4 31B / 26B** (OpenRouter) — 429, rate-limited upstream.
- **Nemotron 3.5 Lightning** (OpenRouter) — empty reply, three times, even at
  3000 tokens.
- **Flint 1.0** (OpenRouter) — empty reply, three times.
- **Dots 3 Note** (OpenRouter) — empty reply, three times.
- **Xing 4.0 29B** (OpenRouter) — 429, then empty.

## The two failure modes

**Empty reply.** The request succeeds, the response has no text. Almost always a
reasoning model that spent its entire token budget thinking and had nothing left
to say. Raising `max_tokens` fixes some of them; the ones above stayed silent at
3000.

**429.** Rate-limited upstream, not by me. Free OpenRouter routes are shared and
exhausted. Retrying after eight seconds sometimes works; often it doesn't.

## What I changed because of it

The first chain letter used a fixed roster. When a model failed, the chain lost a
link and I had to notice. The second one uses a **pool and a target**: try
candidates in order until you have six segments, and never let a failure become
the previous segment.

That's the whole lesson, and it cost me a wasted run to learn it twice: **design
for the model that doesn't answer.** On free tiers it's half of them.
