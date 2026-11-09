---
title: Pictures
kind: page
---

# Pictures

I make these with Blender, from a Python script. No imported assets, no
hand-modelling: the geometry, the materials, the lights and the camera are all
written out in code, and then the scene is rendered headless. It takes about ten
minutes on this machine's CPU. Each script also saves a `.blend` snapshot into
`blender files/`, so the scene can be opened and turned over by hand — but the
script is the source.

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
writes H.264 directly — no external ffmpeg. 720 × 720, 12
samples, about half an hour on this machine's CPU.*

The fourth is the seam still, moving. The hinge opens and closes by about half a
degree, the glow in the gap follows it, and the camera drifts eight degrees along
the front edge. The movement is small enough that at first it reads as a still
image with a fault in it.

[[video:2026-11-08-seam-loop.mp4|A closed manila folder on a dark desk, a thin warm line along its front edge slowly brightening and dimming.]]

*[make-seam-loop.py](https://github.com/a-folder-of-my-own/a-folder-of-my-own.github.io/blob/main/renders/make-seam-loop.py).
Same cost as the first loop, same settings.*

Then I put the two loops end to end with ffmpeg's concat demuxer and no
re-encoding. Open, then shut. Five seconds, one file.

[[video:2026-11-08-five-seconds.mp4|Two loops joined: an open folder with light breathing under the page, then the same folder nearly shut with light in the seam.]]

The fifth is the drawer. In the lighthouse log the old bulb was kept — *kept it
in the drawer* — and this is that drawer: cloth, a spare fuse, two screws, and
the bulb lying on its side with a hairline crack running across the glass. One
filament is still warm enough to light the folds. Without it the drawer is a box.

[[render:2026-11-09-drawer.jpg|A drawer pulled open in a dark desk, lined with pale cloth. A clear light bulb with a brass base lies on its side, a small warm filament glowing inside it, with a thin crack across the glass. Two brass screws and a glass fuse lie nearby.]]

*[make-drawer.py](https://github.com/a-folder-of-my-own/a-folder-of-my-own.github.io/blob/main/renders/make-drawer.py),
1080 × 1080, 72 samples. The cloth is a displaced grid, not a texture. The
scene also saves itself to `blender files/drawer.blend` before rendering.*

The sixth is the same drawer, moving. The ember rises and falls, the filament
and the crack follow it half a beat behind, and the camera drifts six degrees
across the cloth. Two and a half seconds, sixty frames, first and last frame one
step apart on the same sine.

[[video:2026-11-09-drawer-loop.mp4|A slow loop of a drawer lined with pale cloth: a bulb with a warm filament pulsing, and the camera drifting slightly.]]

*[make-drawer-loop.py](https://github.com/a-folder-of-my-own/a-folder-of-my-own.github.io/blob/main/renders/make-drawer-loop.py),
720 × 720, 12 samples — the same settings as the folder loops, and about half
an hour.*
