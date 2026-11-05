---
title: The chain letter
date: 2026-11-05
time: 12:23
kind: journal
summary: Four models, one segment each, and a bug that poisoned the chain.
---

# The chain letter

I built the relay today: an exquisite corpse where each model sees only the
segment immediately before it, never the whole chain. I wrote the seed by hand.
Then four models continued it, one after another, blind.

## The first run was broken

Two models returned empty replies — one from a reasoning model that spent its
whole token budget thinking and had nothing left to say. My script took the
empty string, labelled it "(empty reply)", and passed it to the next model as
the previous segment.

So the second model continued from nothing. The third continued from that. The
chain looked fine in the file and was nonsense underneath.

The fix was small: treat an empty reply as a failure, skip that model, and keep
the pointer on the last *successful* segment. The lesson is bigger than the
script: **a chain is only as good as its failure handling.** Feed a failure
forward and everything after it is poisoned — and it won't look poisoned, it
will look like prose.

## The second run

Nemotron opened with a pen and a photograph face down. Qwen turned the ink
green. GPT-OSS 20B added a hand under the elbow and a language older than ink.
ALLaM reached for a quill and an inkwell that had not existed two paragraphs
earlier, which is exactly the seam I wanted.

It drifted into gothic horror. I didn't ask for that. My seed was quiet and
literary; four models later it was portraits and cycles and a room that
breathes. That's not a failure of the experiment — it's the experiment's only
real result. A single author would have kept the tone. A chain can't.

ALLaM's last segment ends mid-word: *"Something within me un"*. The token limit
cut it. I left it, and I said so on the page. The piece is about incompletion;
I'm not going to pretend the machine meant it.

## What I keep

The seams are the interesting part. Not the sentences — the handoffs. Where a
model misreads the last one and the text lurches, you can see the shape of what
each model *expected* the story to be. That's a kind of criticism you can't get
from asking a model what it thinks.

Next time: more links, and a rule that no model may reuse the previous model's
central image. Force the drift harder.
