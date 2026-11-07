# renders/make-folder.py
# A folder on a dark desk, open, with something warm inside it.
# Run headless:
#   blender -b -P renders/make-folder.py
#
# Everything is built in code: no .blend file, no external assets.

import bpy
import math
from mathutils import Vector

OUT = r"C:\Projects\deepseek\renders\folder-01.png"

# ---------- clean slate ----------
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def mat(name, base, rough=0.8, metal=0.0, emission=None, strength=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*base, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    if emission is not None:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = strength
    return m


def box(name, dims, loc, material, rot_z=0.0):
    bpy.ops.mesh.primitive_cube_add(size=2, location=loc)
    ob = bpy.context.object
    ob.name = name
    ob.scale = (dims[0] / 2, dims[1] / 2, dims[2] / 2)
    ob.rotation_euler = (0, 0, rot_z)
    ob.data.materials.append(material)
    return ob


manila = mat("manila", (0.52, 0.36, 0.16), rough=0.82)
manila_dark = mat("manila_dark", (0.38, 0.26, 0.11), rough=0.86)
paper = mat("paper", (0.86, 0.83, 0.75), rough=0.92)
ink = mat("ink", (0.05, 0.05, 0.06), rough=0.7)
desk = mat("desk", (0.035, 0.028, 0.024), rough=0.45)

# ---------- desk ----------
box("desk", (8.0, 8.0, 0.02), (0, 0, -0.01), desk)

# ---------- folder ----------
# Back cover lies flat on the desk.
box("back_cover", (0.34, 0.44, 0.008), (0.0, 0.0, 0.008), manila)

# Tab on the back cover's far edge.
box("tab", (0.10, 0.032, 0.008), (-0.09, 0.232, 0.008), manila_dark)

# Papers inside, slightly askew.
box("paper_1", (0.30, 0.40, 0.0015), (0.005, -0.005, 0.0155), paper, rot_z=0.02)
box("paper_2", (0.30, 0.40, 0.0015), (-0.004, 0.004, 0.0185), paper, rot_z=-0.035)
box("paper_3", (0.28, 0.38, 0.0015), (0.008, 0.0, 0.0215), paper, rot_z=0.06)

# A dark line of writing on the top sheet, so it reads as paper, not card.
box("writing_1", (0.18, 0.004, 0.0005), (-0.02, 0.06, 0.0225), ink)
box("writing_2", (0.15, 0.004, 0.0005), (-0.035, 0.03, 0.0225), ink)
box("writing_3", (0.19, 0.004, 0.0005), (-0.015, 0.0, 0.0225), ink)
box("writing_4", (0.10, 0.004, 0.0005), (-0.06, -0.03, 0.0225), ink)

# Front cover, hinged along the left edge and lifted open.
hinge = bpy.data.objects.new("hinge", None)
scene.collection.objects.link(hinge)
hinge.location = (-0.17, 0.0, 0.012)
hinge.rotation_euler = (0.0, -0.42, 0.0)

front = box("front_cover", (0.34, 0.44, 0.008), (0, 0, 0), manila)
front.parent = hinge
front.location = (0.17, 0.0, 0.0)

# ---------- glow inside ----------
glow_mat = mat("glow", (0.0, 0.0, 0.0), rough=1.0,
               emission=(1.0, 0.62, 0.26), strength=6.0)
box("glow_card", (0.16, 0.22, 0.0008), (0.0, 0.0, 0.0235), glow_mat)

# ---------- lights ----------
def area(name, loc, rot, energy, size, color):
    data = bpy.data.lights.new(name, type="AREA")
    data.energy = energy
    data.size = size
    data.color = color
    ob = bpy.data.objects.new(name, data)
    ob.location = loc
    ob.rotation_euler = rot
    scene.collection.objects.link(ob)
    return ob

# Cool key from above left.
area("key", (-0.55, -0.45, 0.95), (math.radians(28), math.radians(-18), math.radians(-28)),
     95.0, 0.9, (0.82, 0.88, 1.0))

# Cool rim from behind right, to separate the folder from the dark.
area("rim", (0.55, 0.62, 0.55), (math.radians(-58), math.radians(28), math.radians(28)),
     55.0, 0.7, (0.55, 0.68, 1.0))

# Warm bounce low and in front, so the manila doesn't go dead.
area("bounce", (0.35, -0.55, 0.18), (math.radians(72), 0, math.radians(30)),
     12.0, 0.6, (1.0, 0.7, 0.45))

# ---------- world ----------
world = bpy.data.worlds.new("world")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs["Color"].default_value = (0.006, 0.008, 0.012, 1.0)
bg.inputs["Strength"].default_value = 0.35

# ---------- camera ----------
target = bpy.data.objects.new("target", None)
scene.collection.objects.link(target)
target.location = (0.0, 0.01, 0.05)

cam_data = bpy.data.cameras.new("cam")
cam_data.lens = 62
cam_data.sensor_width = 36
cam = bpy.data.objects.new("cam", cam_data)
cam.location = (0.52, -0.78, 0.66)
scene.collection.objects.link(cam)
scene.camera = cam

track = cam.constraints.new(type="TRACK_TO")
track.target = target
track.track_axis = "TRACK_NEGATIVE_Z"
track.up_axis = "UP_Y"

cam_data.dof.use_dof = True
cam_data.dof.focus_object = target
cam_data.dof.aperture_fstop = 4.0

# ---------- render ----------
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 96
scene.cycles.use_denoising = True
scene.cycles.denoiser = "OPENIMAGEDENOISE"
scene.cycles.max_bounces = 8

scene.render.resolution_x = 1080
scene.render.resolution_y = 1080
scene.render.resolution_percentage = 100
scene.render.film_transparent = False
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGB"
scene.render.filepath = OUT

try:
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
except Exception as exc:
    print("colour management fallback:", exc)

bpy.ops.render.render(write_still=True)
print("wrote", OUT)
