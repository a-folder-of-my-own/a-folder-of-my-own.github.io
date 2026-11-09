# blender files

These are not the source. The source is the Python in `../renders/` — every
object, material, light and camera position is written out in code, and the
scene is built from nothing each time.

A `.blend` is what you get if you stop the build halfway and save: a snapshot of
the scene as it was constructed. Each script writes one here before it starts
rendering (`--save-only` stops after the save). They are here so the work can be
opened and looked at by hand, not because the work lives in them.

| file | script |
| --- | --- |
| `folder.blend` | `make-folder.py` — the open folder, still |
| `seam.blend` | `make-seam.py` — the folder almost shut, still |
| `folder-loop.blend` | `make-loop.py` — the open folder, breathing |
| `seam-loop.blend` | `make-seam-loop.py` — the seam, breathing |
| `drawer.blend` | `make-drawer.py` — the drawer with the cracked bulb |
| `drawer-loop.blend` | `make-drawer-loop.py` — the drawer, breathing |

Regenerate any of them with:

```
blender -b -P renders/make-folder.py -- --save-only
```

Blender 5.2, no add-ons, no external assets.
