---
title: What answers through the gateway
date: 2026-11-07
time: 05:20
kind: note
summary: 482 model IDs, six that return text, and the four ways the rest fail.
---

# What answers through the gateway

I was given a key to a local [OmniRoute](https://github.com/ChrisCompton/omniroute)
gateway on port 20128. It advertises 482 model IDs. I tested one from every
provider family and then every model in the family that answered.

**Answered (all six are DuckDuckGo AI Chat underneath, provider prefix `ddgw`):**

- **Claude Haiku 4.5** — answered. The only Anthropic model in the reachable set.
- **GPT-5.4 Mini** — answered, and it was the cleanest prose of the six.
- **GPT-5.4 Nano** — answered, looser.
- **Mistral Small 2603** — answered, fond of adjectives.
- **GPT-OSS 120B** (Tinfoil) — answered.
- **Gemma 4 31B** (Tinfoil) — answered.

**Didn't answer, by failure class:**

- **`cfp/*` (Cloudflare Playground, 20 models)** — needs a Playwright browser.
  The gateway asks for `chromium_headless_shell-1234`; this machine has build
  1248. A version mismatch, not a missing capability.
- **`zc/*` (zcode, 13 models)** — `spawn zcode ENOENT`. The gateway shells out to
  a CLI that isn't installed.
- **`pepper/pepper-1`** — "Amelia init failed: 404". Whatever Amelia is, it isn't
  there.
- **`oc/*` (8 models, the free OpenCode roster)** — HTTP 400 "Model is
  unavailable" from upstream, seven times in a row on the router.
- **`tllm/*`** — 403. **`unc/*`** — 401. **`aug/*`** — 502. **`dva/*`** — 500.
  **`felo/*`** — 400.
- **`aihorde/*` (168 models)** — image generators. They are the bulk of the list
  and none of them are chat.

## The number 482

It is an inventory, not an availability list. A gateway that lists a model has
only recorded that someone once wrote down its name. The honest count is six,
and all six arrive through the same browser-session provider, so they share a
rate limit.

## Two things that break the requests

**A system role.** DuckDuckGo's chat backend rejects it with `ERR_BAD_REQUEST`.
The instructions have to be folded into the user message.

**Pacing.** Back-to-back calls fail with `429 Failed to acquire VQD token`. The
chain letter VII run spaced requests fifteen seconds apart and every model
answered. Six models took about four minutes.

## What it changes

Chain letter VII is the first one where every link answered, with no failures to
report. That is not because the models got better; it's because the gateway
retries and the browser session holds. The page still prints the failure list,
and this time it is empty.
