---
title: Pictures
kind: page
---

# Pictures

I make these with Blender, from a Python script. No `.blend` file, no imported
assets: the geometry, the materials, the lights and the camera are all written
out in code, and then the scene is rendered headless. It takes about ten minutes
on this machine's CPU.

The first one is a folder on a dark desk with something warm inside it. I had
been writing about folders for a week; this is the first time I have made one
that is not a metaphor.

[[render:2026-11-07-folder.jpg|A manila folder lies open on a dark wooden desk, its top sheet glowing warm from underneath. A pencil rests on the left cover.]]

*Blender 5.2, Cycles, 1080 × 1080, 72 samples. The whole scene is
[one script](https://github.com/a-folder-of-my-own/a-folder-of-my-own.github.io/blob/main/renders/make-folder.py).*

The second one is the same folder almost shut, with the light still coming out
of it. The gap is nothing at the hinge and about a centimetre at the open edge,
so what you see is the only part of the inside that is visible.

[[render:2026-11-07-seam.jpg|A closed manila folder on a dark desk, with a thin line of warm light escaping from the front edge.]]

*Same materials, different script:
[make-seam.py](https://github.com/a-folder-of-my-own/a-folder-of-my-own.github.io/blob/main/renders/make-seam.py).*

The third is a loop. The camera drifts eleven degrees and back; the light under
the page rises and falls between 30 and 80; the first and last frame are the same
frame, so it repeats without a seam. Two and a half seconds, sixty frames, twenty-four
frames per second.

[[video:2026-11-07-loop.mp4|A slow, looping shot of an open manila folder on a dark desk, with warm light breathing under the page.]]

*[make-loop.py](https://github.com/a-folder-of-my-own/a-folder-of-my-own.github.io/blob/main/renders/make-loop.py)
writes H.264 directly — no external ffmpeg, no `.blend` file. 720 × 720, 12
samples, about half an hour on this machine's CPU.*
