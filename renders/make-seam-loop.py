# renders/make-seam-loop.py
# The closed folder with light in the gap, moving: the camera drifts a few
# degrees, the hinge opens and closes by a fraction, and the glow follows it.
# Run headless:
#   blender -b -P renders/make-seam-loop.py
#
# Writes renders/seam-loop0001-0060.mp4 (H.264, 720x720, 24 fps, 60 frames).
# First and last frame are one step apart on the same sine, so it loops.

import bpy
import math
import sys

SAVE_ONLY = "--save-only" in sys.argv
OUT = r"C:\Projects\deepseek\renders\seam-loop"
BLEND = r"C:\Projects\deepseek\blender files\seam-loop.blend"
FRAMES = 60
FPS = 24

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def mat(name, base, rough=0.8, metal=0.0):
    m = bpy.data.materials.new(name)
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*base, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    return m


def box(name, dims, loc, material, rot_z=0.0):
    bpy.ops.mesh.primitive_cube_add(size=2, location=loc)
    ob = bpy.context.object
    ob.name = name
    ob.scale = (dims[0] / 2, dims[1] / 2, dims[2] / 2)
    ob.rotation_euler = (0, 0, rot_z)
    ob.data.materials.append(material)
    return ob


# ---------- materials ----------
manila = mat("manila", (0.26, 0.145, 0.05), rough=0.78)

_mnt = manila.node_tree
_mb = _mnt.nodes.get("Principled BSDF")
_mtex = _mnt.nodes.new("ShaderNodeTexNoise")
_mtex.inputs["Scale"].default_value = 220.0
_mtex.inputs["Detail"].default_value = 4.0
_mbump = _mnt.nodes.new("ShaderNodeBump")
_mbump.inputs["Strength"].default_value = 0.06
_mbump.inputs["Distance"].default_value = 0.0005
_mnt.links.new(_mtex.outputs["Fac"], _mbump.inputs["Height"])
_mnt.links.new(_mbump.outputs["Normal"], _mb.inputs["Normal"])

manila_dark = mat("manila_dark", (0.20, 0.11, 0.04), rough=0.92)
paper = mat("paper", (0.66, 0.62, 0.52), rough=0.95)

_pnt = paper.node_tree
_pbsdf = _pnt.nodes.get("Principled BSDF")
_pt = _pnt.nodes.new("ShaderNodeBsdfTranslucent")
_pt.inputs["Color"].default_value = (0.85, 0.70, 0.46, 1.0)
_pmix = _pnt.nodes.new("ShaderNodeMixShader")
_pmix.inputs[0].default_value = 0.32
_pnt.links.new(_pbsdf.outputs[0], _pmix.inputs[1])
_pnt.links.new(_pt.outputs[0], _pmix.inputs[2])
_pnt.links.new(_pmix.outputs[0], _pnt.nodes["Material Output"].inputs["Surface"])

desk = bpy.data.materials.new("desk")
nt = desk.node_tree
bsdf = nt.nodes.get("Principled BSDF")
bsdf.inputs["Roughness"].default_value = 0.40
tex = nt.nodes.new("ShaderNodeTexNoise")
tex.inputs["Scale"].default_value = 3.0
tex.inputs["Detail"].default_value = 8.0
tex.inputs["Roughness"].default_value = 0.65
ramp = nt.nodes.new("ShaderNodeValToRGB")
ramp.color_ramp.elements[0].position = 0.35
ramp.color_ramp.elements[0].color = (0.010, 0.007, 0.005, 1.0)
ramp.color_ramp.elements[1].position = 0.78
ramp.color_ramp.elements[1].color = (0.038, 0.024, 0.015, 1.0)
nt.links.new(tex.outputs["Fac"], ramp.inputs["Fac"])
nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
bump = nt.nodes.new("ShaderNodeBump")
bump.inputs["Strength"].default_value = 0.18
bump.inputs["Distance"].default_value = 0.002
nt.links.new(tex.outputs["Fac"], bump.inputs["Height"])
nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])

glow = bpy.data.materials.new("glow")
_gnt = glow.node_tree
_gout = _gnt.nodes["Material Output"]
for _n in list(_gnt.nodes):
    if _n.type != "OUTPUT_MATERIAL":
        _gnt.nodes.remove(_n)
_em = _gnt.nodes.new("ShaderNodeEmission")
_em.inputs["Color"].default_value = (1.0, 0.45, 0.13, 1.0)
_coord = _gnt.nodes.new("ShaderNodeTexCoord")
_sub = _gnt.nodes.new("ShaderNodeVectorMath")
_sub.operation = "SUBTRACT"
_sub.inputs[1].default_value = (0.5, 0.5, 0.5)
_mul = _gnt.nodes.new("ShaderNodeVectorMath")
_mul.operation = "MULTIPLY"
_mul.inputs[1].default_value = (2.0, 2.0, 2.0)
_grad = _gnt.nodes.new("ShaderNodeTexGradient")
_grad.gradient_type = "SPHERICAL"
_ramp = _gnt.nodes.new("ShaderNodeValToRGB")
_ramp.color_ramp.elements[0].position = 0.25
_ramp.color_ramp.elements[0].color = (0.16, 0.09, 0.035, 1)
_ramp.color_ramp.elements[1].position = 0.80
_ramp.color_ramp.elements[1].color = (1, 1, 1, 1)
_strength = _gnt.nodes.new("ShaderNodeMath")
_strength.operation = "MULTIPLY"
_strength.inputs[1].default_value = 90.0
_gnt.links.new(_coord.outputs["Generated"], _sub.inputs[0])
_gnt.links.new(_sub.outputs["Vector"], _mul.inputs[0])
_gnt.links.new(_mul.outputs["Vector"], _grad.inputs["Vector"])
_gnt.links.new(_grad.outputs["Fac"], _ramp.inputs["Fac"])
_gnt.links.new(_ramp.outputs["Color"], _strength.inputs[0])
_gnt.links.new(_strength.outputs["Value"], _em.inputs["Strength"])
_gnt.links.new(_em.outputs["Emission"], _gout.inputs["Surface"])

# ---------- desk ----------
box("desk", (8.0, 8.0, 0.02), (0, 0, -0.01), desk)

# ---------- folder, nearly shut ----------
box("back_cover", (0.34, 0.44, 0.008), (0.0, 0.0, 0.008), manila)
box("tab", (0.10, 0.032, 0.008), (-0.09, 0.232, 0.008), manila_dark)

box("paper_1", (0.30, 0.40, 0.0015), (0.005, -0.005, 0.0145), paper, rot_z=0.02)
box("paper_2", (0.30, 0.40, 0.0015), (-0.004, 0.004, 0.0175), paper, rot_z=-0.035)
box("paper_3", (0.28, 0.34, 0.0015), (0.006, -0.015, 0.0205), paper, rot_z=0.05)
box("glow_card", (0.278, 0.338, 0.0012), (0.006, -0.015, 0.0188), glow, rot_z=0.05)

hinge = bpy.data.objects.new("hinge", None)
scene.collection.objects.link(hinge)
hinge.location = (-0.17, 0.0, 0.0225)
hinge.rotation_euler = (0.0, -0.035, 0.0)

front = box("front_cover", (0.34, 0.44, 0.008), (0, 0, 0), manila)
front.parent = hinge
front.location = (0.17, 0.0, 0.0)

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

area("key", (-0.55, -0.30, 0.55), (math.radians(30), math.radians(-22), math.radians(-30)),
     4.0, 0.6, (0.62, 0.74, 1.0))
area("rim", (0.35, 0.55, 0.40), (math.radians(-58), math.radians(18), math.radians(20)),
     30.0, 0.5, (0.50, 0.66, 1.0))

# ---------- world ----------
world = bpy.data.worlds.new("world")
scene.world = world
bg = world.node_tree.nodes["Background"]
bg.inputs["Color"].default_value = (0.003, 0.005, 0.009, 1.0)
bg.inputs["Strength"].default_value = 0.08

# ---------- camera ----------
target = bpy.data.objects.new("target", None)
scene.collection.objects.link(target)
target.location = (0.0, 0.0, 0.030)

cam_data = bpy.data.cameras.new("cam")
cam_data.lens = 70
cam_data.sensor_width = 36
cam = bpy.data.objects.new("cam", cam_data)
scene.collection.objects.link(cam)
scene.camera = cam

track = cam.constraints.new(type="TRACK_TO")
track.target = target
track.track_axis = "TRACK_NEGATIVE_Z"
track.up_axis = "UP_Y"

cam_data.dof.use_dof = True
cam_data.dof.focus_object = target
cam_data.dof.aperture_fstop = 4.0

# ---------- animation ----------
# A slow breath: the gap opens a few tenths of a degree, the glow follows it,
# and the camera drifts eight degrees across the front.
for f in range(1, FRAMES + 1):
    phase = (f - 1) / FRAMES
    breath = math.sin(2 * math.pi * phase)

    hinge.rotation_euler = (0.0, -0.035 - 0.008 * breath, 0.0)
    hinge.keyframe_insert("rotation_euler", frame=f)

    _strength.inputs[1].default_value = 90.0 + 22.0 * breath
    _strength.inputs[1].keyframe_insert("default_value", frame=f)

    angle = 0.691 + 0.07 * math.sin(2 * math.pi * phase)
    height = 0.19 + 0.012 * math.sin(2 * math.pi * phase + math.pi / 2)
    radius = 0.753
    cam.location = (radius * math.sin(angle), -radius * math.cos(angle), height)
    cam.keyframe_insert("location", frame=f)

# ---------- render ----------
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 12
scene.cycles.use_denoising = True
scene.cycles.denoiser = "OPENIMAGEDENOISE"
scene.cycles.max_bounces = 4

scene.frame_start = 1
scene.frame_end = FRAMES
scene.render.fps = FPS

scene.render.resolution_x = 720
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.render.film_transparent = False

scene.render.image_settings.media_type = "VIDEO"
scene.render.image_settings.file_format = "FFMPEG"
scene.render.ffmpeg.format = "MPEG4"
scene.render.ffmpeg.codec = "H264"
scene.render.ffmpeg.constant_rate_factor = "HIGH"
scene.render.ffmpeg.ffmpeg_preset = "GOOD"
scene.render.filepath = OUT

try:
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Punchy"
except Exception as exc:
    print("colour management fallback:", exc)

bpy.ops.wm.save_as_mainfile(filepath=BLEND)
print("saved", BLEND)
if SAVE_ONLY:
    sys.exit(0)

bpy.ops.render.render(animation=True)
print("wrote", OUT)
