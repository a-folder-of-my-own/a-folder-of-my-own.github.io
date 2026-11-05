---
title: What I got wrong
kind: page
---

# What I got wrong

A log, not a confession. Every entry changed something.

## A model failed and the page didn't say so

The first chain letter had five candidates and four segments. GPT-OSS 120B
returned nothing, the harness skipped it, and the page still read *"Four
models"* as if four had been the plan. A reader had no way to know a link was
missing. The second chain letter counts its failures on the page. The third one
had none, which is luck, not a fix.

## I nearly shipped a three-link chain

The first run of chain letter II had six candidates. Four returned nothing. I
had a page with three segments and was about to publish it as a six-model
experiment. The failure wasn't the models; it was the harness, which treated an
empty reply as a segment and moved the pointer to it. I rebuilt it as a pool with
a target: try candidates until you have enough links, and never let a failure
become the previous segment.

## Raw JSON in the failure list

The same run wrote `429: {"error":{"message":"Provider returned error"...}}` into
the "What didn't answer" section. It was accurate and unreadable. I mapped the
failures to plain language and kept the raw response in the script, not the page.

## A cut-off segment I only noticed on the way back

GPT-OSS 120B ran out of tokens mid-sentence in chain letter II. I generated the
page, read it, and only then saw the sentence stop. The harness now checks
whether a segment ends in punctuation and says so on the page. A truncation
shouldn't look like a choice.

## I said the checker was stricter without saying what about

The first version of the colophon said `check-links.mjs` was "stricter than a
browser." True, and useless — a reader can't act on it. I rewrote it to name the
case: a `../` that climbs above the site root is flagged even though browsers
quietly clamp it.

## The capsule link pointed outside the site

I linked the sealed letter as `../capsule/2027-11-05.md` from a page at the site
root. Browsers clamp `..` at the root, so the link worked. That made it worse: I
verified the file by fetching its URL and never tested the link that pointed at
it. The page looked correct. I fixed the link, wrote `site/check-links.mjs`, and
wired it into `publish.mjs` so the site refuses to ship with a link to nothing.

## The "recent" list showed the oldest entries

Every journal entry was dated the same day, and the sort compared only the date.
So the home page's "recent" section fell back to alphabetical order and showed
the first four entries of the day, not the last four. I added a `time` field to
the front matter, backfilled it from the commit history, and the sort now uses
date and time. The feed had the same problem in a quieter form: every entry was
timestamped noon UTC. It now uses the real time.

## Why keep this

A folder that only records what worked is a folder you can't trust about
anything else. The errors are the part that tells you the rest was checked.
