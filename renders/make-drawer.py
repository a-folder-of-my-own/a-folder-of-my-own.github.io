# renders/make-drawer.py
# The drawer the cracked bulb was kept in. A still life: a drawer pulled open
# in a dark desk, a cloth, a dead bulb with a hairline crack that still holds a
# little light, a spare fuse, a screwdriver.
# Run headless:
#   blender -b -P renders/make-drawer.py -- --preview   (540px, 24 samples)
#   blender -b -P renders/make-drawer.py                (1080px, 72 samples)
#
# Everything is built in code: no .blend file, no external assets.

import bpy
import math
import sys

PREVIEW = "--preview" in sys.argv
SAVE_ONLY = "--save-only" in sys.argv
RES = 540 if PREVIEW else 1080
SAMPLES = 24 if PREVIEW else 72
OUT = (r"C:\Projects\deepseek\renders\drawer-preview.png" if PREVIEW
       else r"C:\Projects\deepseek\renders\drawer-final.png")
BLEND = r"C:\Projects\deepseek\blender files\drawer.blend"

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def set_in(node, name, value):
    """Set a socket by name if this Blender has it."""
    sock = node.inputs.get(name)
    if sock is not None:
        sock.default_value = value
        return True
    return False


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


def cyl(name, radius, depth, loc, material, rot=(0, 0, 0), verts=48):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, location=loc,
                                        rotation=rot, vertices=verts)
    ob = bpy.context.object
    ob.name = name
    ob.data.materials.append(material)
    return ob


def smooth(ob):
    for p in ob.data.polygons:
        p.use_smooth = True


# ---------- materials ----------
# Dark wood, same recipe as the desk in make-folder.py.
desk = bpy.data.materials.new("desk")
nt = desk.node_tree
bsdf = nt.nodes.get("Principled BSDF")
bsdf.inputs["Roughness"].default_value = 0.42
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

# Drawer sides: older, paler wood, rougher.
drawer_wood = bpy.data.materials.new("drawer_wood")
dnt = drawer_wood.node_tree
dbsdf = dnt.nodes.get("Principled BSDF")
dbsdf.inputs["Roughness"].default_value = 0.72
dtex = dnt.nodes.new("ShaderNodeTexNoise")
dtex.inputs["Scale"].default_value = 14.0
dtex.inputs["Detail"].default_value = 6.0
dramp = dnt.nodes.new("ShaderNodeValToRGB")
dramp.color_ramp.elements[0].position = 0.30
dramp.color_ramp.elements[0].color = (0.030, 0.020, 0.013, 1.0)
dramp.color_ramp.elements[1].position = 0.80
dramp.color_ramp.elements[1].color = (0.085, 0.058, 0.038, 1.0)
dnt.links.new(dtex.outputs["Fac"], dramp.inputs["Fac"])
dnt.links.new(dramp.outputs["Color"], dbsdf.inputs["Base Color"])
dbump = dnt.nodes.new("ShaderNodeBump")
dbump.inputs["Strength"].default_value = 0.12
dbump.inputs["Distance"].default_value = 0.0015
dnt.links.new(dtex.outputs["Fac"], dbump.inputs["Height"])
dnt.links.new(dbump.outputs["Normal"], dbsdf.inputs["Normal"])

# Rag: a pale cloth, stained, with folds in the geometry rather than in a map.
cloth = bpy.data.materials.new("cloth")
cnt0 = cloth.node_tree
cbsdf = cnt0.nodes.get("Principled BSDF")
cbsdf.inputs["Roughness"].default_value = 1.0
cnoise = cnt0.nodes.new("ShaderNodeTexNoise")
cnoise.inputs["Scale"].default_value = 55.0
cnoise.inputs["Detail"].default_value = 4.0
cnoise.inputs["Roughness"].default_value = 0.6
cramp = cnt0.nodes.new("ShaderNodeValToRGB")
cramp.color_ramp.elements[0].position = 0.36
cramp.color_ramp.elements[0].color = (0.155, 0.140, 0.120, 1.0)
cramp.color_ramp.elements[1].position = 0.66
cramp.color_ramp.elements[1].color = (0.205, 0.185, 0.158, 1.0)
cnt0.links.new(cnoise.outputs["Fac"], cramp.inputs["Fac"])
cnt0.links.new(cramp.outputs["Color"], cbsdf.inputs["Base Color"])
cbump = cnt0.nodes.new("ShaderNodeBump")
cbump.inputs["Strength"].default_value = 0.14
cbump.inputs["Distance"].default_value = 0.0004
cnt0.links.new(cnoise.outputs["Fac"], cbump.inputs["Height"])
cnt0.links.new(cbump.outputs["Normal"], cbsdf.inputs["Normal"])
brass = mat("brass", (0.45, 0.30, 0.11), rough=0.38, metal=1.0)
steel = mat("steel", (0.32, 0.33, 0.35), rough=0.30, metal=1.0)
handle_mat = mat("handle", (0.09, 0.035, 0.02), rough=0.55)

# Glass: transmissive, with a faint warm tint.
glass = bpy.data.materials.new("glass")
gbsdf = glass.node_tree.nodes.get("Principled BSDF")
gbsdf.inputs["Base Color"].default_value = (0.92, 0.95, 0.93, 1.0)
gbsdf.inputs["Roughness"].default_value = 0.035
set_in(gbsdf, "IOR", 1.46)
if not set_in(gbsdf, "Transmission Weight", 1.0):
    set_in(gbsdf, "Transmission", 1.0)

# The filament, still warm.
filament = bpy.data.materials.new("filament")
fnt = filament.node_tree
for n in list(fnt.nodes):
    if n.type != "OUTPUT_MATERIAL":
        fnt.nodes.remove(n)
fem = fnt.nodes.new("ShaderNodeEmission")
fem.inputs["Color"].default_value = (1.0, 0.38, 0.10, 1.0)
fem.inputs["Strength"].default_value = 6.0
fnt.links.new(fem.outputs["Emission"], fnt.nodes["Material Output"].inputs["Surface"])

# The crack: a hairline that catches light along its edge.
crack_mat = bpy.data.materials.new("crack")
cnt = crack_mat.node_tree
for n in list(cnt.nodes):
    if n.type != "OUTPUT_MATERIAL":
        cnt.nodes.remove(n)
cem = cnt.nodes.new("ShaderNodeEmission")
cem.inputs["Color"].default_value = (1.0, 0.70, 0.42, 1.0)
cem.inputs["Strength"].default_value = 1.6
cnt.links.new(cem.outputs["Emission"], cnt.nodes["Material Output"].inputs["Surface"])

# ---------- desk with an opening ----------
# Top surface at z = 0, thickness 0.045. Opening x [-0.22, 0.22],
# y [-0.46, 0.26].
TOP_T = 0.045
box("desk_left", (1.78, 4.0, TOP_T), (-1.11, 0.0, -TOP_T / 2), desk)
box("desk_right", (1.78, 4.0, TOP_T), (1.11, 0.0, -TOP_T / 2), desk)
box("desk_front", (0.44, 1.54, TOP_T), (0.0, -1.23, -TOP_T / 2), desk)
box("desk_back", (0.44, 1.74, TOP_T), (0.0, 1.13, -TOP_T / 2), desk)

# ---------- drawer ----------
# Pulled forward: front panel at y = -0.42, back at y = 0.22.
# Interior floor at z = -0.185.
I_W, I_D = 0.400, 0.560          # interior
WALL = 0.012
FLOOR = 0.010
HEIGHT = 0.155

front_y = -0.42
back_y = front_y + I_D + 2 * WALL   # 0.164
mid_y = (front_y + back_y) / 2
floor_z = -HEIGHT

# floor
box("drawer_floor", (I_W + 2 * WALL, I_D + 2 * WALL, FLOOR),
    (0.0, mid_y, floor_z - FLOOR / 2), drawer_wood)
# sides
box("drawer_left", (WALL, I_D + 2 * WALL, HEIGHT),
    (-(I_W / 2 + WALL / 2), mid_y, floor_z + HEIGHT / 2), drawer_wood)
box("drawer_right", (WALL, I_D + 2 * WALL, HEIGHT),
    (I_W / 2 + WALL / 2, mid_y, floor_z + HEIGHT / 2), drawer_wood)
# back
box("drawer_back", (I_W, WALL, HEIGHT),
    (0.0, back_y - WALL / 2, floor_z + HEIGHT / 2), drawer_wood)
# front panel, a little proud of the sides
box("drawer_front", (I_W + 0.036, 0.018, HEIGHT + 0.012),
    (0.0, front_y + 0.009, floor_z + (HEIGHT + 0.012) / 2), drawer_wood)
# a small brass pull
cyl("pull", 0.009, 0.012, (0.0, front_y - 0.002, floor_z + HEIGHT - 0.045),
    brass, rot=(math.radians(90), 0, 0), verts=32)

# ---------- contents ----------
# A rag, not a board: the folds are geometry. A grid is displaced by hand,
# then given a little thickness.
bpy.ops.mesh.primitive_grid_add(x_subdivisions=64, y_subdivisions=64, size=0.39,
                                location=(-0.005, mid_y + 0.015, floor_z + 0.004))
rag = bpy.context.object
rag.name = "rag"
rag.scale = (1.0, 0.80, 1.0)
rag.rotation_euler = (0, 0, math.radians(14))
rag.data.materials.append(cloth)
for v in rag.data.vertices:
    x, y = v.co.x, v.co.y
    fold = 0.014 * math.exp(-((x + 0.02) / 0.045) ** 2)
    ripple = 0.0022 * math.sin(x * 34.0 + y * 9.0) * math.sin(y * 27.0 - x * 6.0)
    ripple += 0.0014 * math.sin(x * 61.0 - y * 17.0)
    edge = 0.007 * (abs(x) / 0.19) ** 2 * math.sin(y * 7.0 + 1.2)
    v.co.z = fold + ripple + edge
solid = rag.modifiers.new("solid", "SOLIDIFY")
solid.thickness = 0.0022
smooth(rag)

# ---------- the bulb ----------
bulb = bpy.data.objects.new("bulb", None)
scene.collection.objects.link(bulb)
bulb.location = (0.035, mid_y + 0.030, floor_z + 0.045)
bulb.rotation_euler = (0.0, math.radians(90), math.radians(12))

bpy.ops.mesh.primitive_uv_sphere_add(radius=0.036, segments=48, ring_count=32,
                                     location=(0, 0, 0.007))
gl = bpy.context.object
gl.name = "bulb_glass"
gl.scale = (1.0, 1.0, 1.10)
gl.data.materials.append(glass)
gl.parent = bulb
smooth(gl)

base = cyl("bulb_base", 0.017, 0.030, (0, 0, -0.036), brass, verts=40)
base.parent = bulb
smooth(base)

bpy.ops.mesh.primitive_torus_add(major_radius=0.0062, minor_radius=0.0008,
                                 location=(0, 0, 0.005),
                                 rotation=(math.radians(8), 0, 0))
coil = bpy.context.object
coil.name = "filament"
coil.data.materials.append(filament)
coil.parent = bulb
smooth(coil)

# two support wires from the base up into the glass
for i, sx in enumerate((-0.0042, 0.0042)):
    w = cyl(f"wire_{i}", 0.0004, 0.026, (sx, 0.0, -0.012), steel, verts=8)
    w.parent = bulb

# ---------- the crack ----------
# A polyline over the lower half of the glass, on the surface, zigzagging.
curve = bpy.data.curves.new("crack", type="CURVE")
curve.dimensions = "3D"
curve.bevel_depth = 0.00014
curve.bevel_resolution = 2
spline = curve.splines.new("POLY")

R = 0.0368
pts = []
N = 24
for i in range(N):
    t = 0.72 + (1.95 - 0.72) * (i / (N - 1))      # polar angle from +z
    # Mostly smooth, with one kink: a crack, not a sawtooth.
    a = math.pi + 0.10 * math.sin(i * 0.55) + (0.09 if 8 <= i <= 10 else 0.0)
    x = R * math.sin(t) * math.cos(a)
    y = R * math.sin(t) * math.sin(a)
    z = R * math.cos(t) * 1.10
    pts.append((x, y, z + 0.007))

spline.points.add(len(pts) - 1)
for p, (x, y, z) in zip(spline.points, pts):
    p.co = (x, y, z, 1.0)

crack = bpy.data.objects.new("crack", curve)
crack.data.materials.append(crack_mat)
scene.collection.objects.link(crack)
crack.parent = bulb

# ---------- fuse and screwdriver ----------
# Spare fuse: glass body, metal caps.
cyl("fuse_glass", 0.0055, 0.026, (-0.095, mid_y - 0.045, floor_z + 0.012),
    glass, rot=(math.radians(90), 0, math.radians(24)), verts=24)
for i, off in enumerate((-0.014, 0.014)):
    cap = cyl(f"fuse_cap_{i}", 0.0060, 0.006,
              (-0.095 + math.sin(math.radians(24)) * off,
               mid_y - 0.045 + math.cos(math.radians(24)) * off,
               floor_z + 0.012),
              brass, rot=(math.radians(90), 0, math.radians(24)), verts=24)
    smooth(cap)

# Two screws, heads up.
for i, (sx, sy) in enumerate(((-0.055, mid_y - 0.085), (-0.030, mid_y - 0.100))):
    sc = cyl(f"screw_{i}", 0.0042, 0.010, (sx, sy, floor_z + 0.005),
             brass, rot=(0, math.radians(90), math.radians(12)), verts=24)
    smooth(sc)

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

# Cool key from above left: the room, not the drawer.
area("key", (-0.42, -0.34, 0.62), (math.radians(28), math.radians(-18), math.radians(-32)),
     9.0, 0.55, (0.66, 0.78, 1.0))

# Warm rim from behind, low, so the drawer's back edge separates.
area("rim", (0.34, 0.52, 0.24), (math.radians(-72), math.radians(18), math.radians(22)),
     4.0, 0.35, (1.0, 0.62, 0.34))

# Very faint front fill, so the front panel is not a silhouette.
area("fill", (0.22, -0.62, 0.10), (math.radians(80), 0, math.radians(18)),
     0.7, 0.5, (0.85, 0.88, 1.0))

# The ember: a small warm point at the filament.
ember = bpy.data.lights.new("ember", type="POINT")
ember.energy = 0.18
ember.color = (1.0, 0.50, 0.20)
ember.shadow_soft_size = 0.005
ember_ob = bpy.data.objects.new("ember", ember)
ember_ob.location = (0.042, mid_y + 0.030, floor_z + 0.050)
scene.collection.objects.link(ember_ob)

# ---------- world ----------
world = bpy.data.worlds.new("world")
scene.world = world
bg = world.node_tree.nodes["Background"]
bg.inputs["Color"].default_value = (0.004, 0.006, 0.010, 1.0)
bg.inputs["Strength"].default_value = 0.06

# ---------- camera ----------
target = bpy.data.objects.new("target", None)
scene.collection.objects.link(target)
target.location = (0.020, mid_y + 0.020, floor_z + 0.050)

cam_data = bpy.data.cameras.new("cam")
cam_data.lens = 58
cam_data.sensor_width = 36
cam = bpy.data.objects.new("cam", cam_data)
cam.location = (0.205, -0.500, 0.300)
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
scene.cycles.samples = SAMPLES
scene.cycles.use_denoising = True
scene.cycles.denoiser = "OPENIMAGEDENOISE"
scene.cycles.max_bounces = 10
scene.cycles.transmission_bounces = 8

scene.render.resolution_x = RES
scene.render.resolution_y = RES
scene.render.resolution_percentage = 100
scene.render.film_transparent = False
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGB"
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

bpy.ops.render.render(write_still=True)
print("wrote", OUT)
