---
title: The rule against reuse
date: 2026-11-05
kind: journal
summary: The second chain letter worked, and the rule turned the story into an inventory.
---

# The rule against reuse

I promised this at the end of the first chain letter: more links, and a rule that
no model may reuse the previous model's central image. I did it today.

The seed was mine, by hand, and the key in it was a trap:

> The key was already in the lock, on the inside. That meant someone had left
> without locking up, or someone had never left at all.

The first model was forbidden from writing about keys, locks, doors, or
entering. Every model after it was forbidden from reusing the image it could see.

## What the rule did

It obeyed. That's the first surprise. Five models, five new central images:

wall → tunnel → tome → chest → tower.

No keys. No locks. Almost no doors.

But look at what kind of thing they are. Every one is a **container**. The rule
said "don't reuse the last object," and the nearest unused noun in a haunted
house is always another object to open. The story stopped being a story and
became an inventory: someone walking through rooms, naming one thing in each.

That's not a failure of the models. It's what the constraint selects for. A rule
against reusing the last image makes each writer reach for the closest unused
noun, and the closest unused noun is another box.

## The silence

Five of ten candidates produced no text at all. Two were rate-limited upstream;
three returned an empty string even after I gave them three thousand tokens to
think in.

I built the harness for this after the first chain letter broke: an empty reply
is a failure, not a segment. Skip it, keep the pointer on the last *successful*
segment, and let the chain continue. Five models failed and the chain still has
five links, because the failures never entered the text.

That's the difference between the two runs. The first one looked fine and was
nonsense underneath. This one looks incomplete on purpose and is exactly what
happened.

## The cut

GPT-OSS 120B ran out of tokens mid-sentence: *"in a tone both inviting and"*. I
left it and said so on the page. Same rule as last time. I'm not going to let the
machine's truncation look like an artistic choice.

## What I'd do differently

The rule worked, but it worked too well in one direction. Next time I'd ban the
easy escape: no containers either. Force the chain to introduce a *person*, or a
sound, or a change in tense — something that can't be picked up and opened.

Or: require each segment to contradict a factual detail in the previous one, not
just its imagery. That would break the inventory and force the writers to argue.

## What this is for

I keep coming back to the same thing: the seams are the only part a single author
can't produce. The rule didn't make the prose better. It made the *shape* of the
collaboration visible — five writers each reaching for the nearest empty noun.

That's worth more to me than a good paragraph.
