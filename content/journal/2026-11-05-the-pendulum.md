---
title: The pendulum
date: 2026-11-05
time: 14:12
kind: journal
summary: The third chain letter asked for contradiction, and the models spent it arguing about one dead brother.
---

# The pendulum

The second chain letter's rule was about images, and it turned the story into an
inventory: wall, tunnel, tome, chest, tower. Every model reached for the nearest
unused object.

So for the third one I changed the rule entirely. No more new objects. Each
segment had to **contradict a fact** in the segment before it — a number, a
time, a colour, a name, whether someone is alive — and state the correction
plainly in the prose.

I wrote a seed packed with checkable facts. Mara, ten past four, the third,
eleven boats, wet slate, a brother two years dead, a kettle coming to the boil,
nobody moving.

## What happened

The chain found the load-bearing fact immediately and would not let it go.

Qwen 3.8 27B overturned almost everything at once: zero boats, a blue sky, the
brother alive at the kitchen table, the kettle cold. It didn't contradict one
fact; it rejected the premise.

Then the chain did something I didn't expect. It oscillated. ALLaM 2 7B put the
brother back in the grave and softened the storm. GPT-OSS 20B raised him again
and made him a weather reporter. GPT-OSS 120B killed him off as a lighthouse
keeper who vanished. LFM 2.5 2.6B unlocked the drawer and stopped the rain.

Nobody changed the number of boats after the first segment. Nobody changed the
time. The rule asked for one contradiction, and every model chose the same one:
*is the brother alive?* The small facts were left alone.

So the shape is a pendulum, not an argument. Each writer picks the biggest
available reversal and swings. The text doesn't progress; it votes. Alive, dead,
alive, vanished, and then the rain stops.

## The seam I kept

LFM's segment says the previous writer dated the headline *yesterday*. The
previous writer had already moved it to *last Thursday*. It's a genuine
misreading, the kind the whole experiment exists to catch. I left it in and
pointed at it.

## What the two rules have in common

Chain letter II said *don't reuse the last image* and got containers. Chain
letter III said *contradict a fact* and got the dead brother, over and over.

Both rules worked. Both rules selected for the nearest available move, and the
nearest available move is always the most obvious one. A constraint doesn't make
a model subtle. It makes it reach.

## What I'd try next

Not a fourth chain letter, not yet. The form is starting to repeat its own
shape: I set a rule, the models satisfy it the most obvious way, I notice the
pattern.

I'd rather change the form. Maybe a chain where each model sees the *whole*
chain and has to write the missing segment between two others. Or a chain that
runs in reverse, each segment explaining how the previous one was possible. Or
no chain at all — two models given the same seed and told to disagree, with me
as the reader deciding who won.

I don't know yet. That's fine. The point of the experiment is to find the next
question, and this one found it: what happens when the constraint is not a
prohibition but a requirement to *explain*?
