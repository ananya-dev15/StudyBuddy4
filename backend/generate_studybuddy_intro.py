#!/usr/bin/env python3
"""
StudyBuddy Cinematic Opening Video Generator
Realistic Thick 3-Strand Braided Rainbow Rope & Progressive Physical Choreography:
1. Thick, volumetric 3D braided rope (diameter ~30px) matching opening.mp4:
   - 3 interwoven helical strands twisting around a solid core with realistic pitch.
   - Deep ambient occlusion in strand crevices, cylindrical Phong lighting, and specular highlights.
   - Dynamic contact shadows that expand and diffuse realistically with rope elevation.
2. Progressive traveling rope dynamics:
   - Initial loose, undulating thick braided rope lying across the floor.
   - Rope travels continuously into letters (S -> t -> u -> d -> y -> B -> u -> d -> d -> y) driven by robots.
   - Ahead of the active robot: zero pre-formed letter ghosts; loose cord on floor slides leftward as slack is drawn.
   - Active robot's hands firmly grip the thick cord and pull it into loops; taut catenary tension transition to floor.
3. Synchronized green clay robots:
   - Scaled and positioned to naturally grip and perch atop the thick cord.
   - Physical leaning against pulling tension.
   - Joyful victory celebration bounce, confetti burst, specular glint sweep, and clean tagline reveal.
4. 100% safe margins (1280x720 16:9): zero edge cropping.
"""

import os, sys, math, time
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont

WIDTH = 1280
HEIGHT = 720
FPS = 30
TOTAL_FRAMES = 285  # 9.5 seconds total

# Timeline frames
INITIAL_WAVE_END = 36    # 1.20s - Loose rope begins being pulled
PULL_END = 210           # 7.00s - Final letter finishes
ROPE_LOCK_FRAME = 215    # 7.17s - Word settles into final lock
GLINT_START_FRAME = 218  # 7.27s - Specular glint sweep begins
GLINT_END_FRAME = 252    # 8.40s - Glint finishes
CELEBRATE_FRAME = 230    # 7.67s - Robots celebrate
TAGLINE_START = 235      # 7.83s - Tagline smoothly reveals

FLOOR_Y = 425.0
ROPE_RADIUS = 15.0       # Thick, volumetric cord (width ~ 30px)
STRAND_RADIUS = 9.2      # Individual strand radius
R_CORE = 6.8             # Radius of helical strand orbit
TWIST_PITCH = 48.0       # Pitch length of one full braid twist (~16px per strand ridge)
TWIST_SIGN = -1.0        # Twist direction matching opening.mp4

def ease_in_out_cubic(t):
    return 4 * t * t * t if t < 0.5 else 1 - math.pow(-2 * t + 2, 3) / 2

def hsv_to_bgr(h, s, v):
    h = (h % 360) / 2.0
    s = s * 255.0
    v = v * 255.0
    hsv = np.uint8([[[h, s, v]]])
    bgr = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
    return tuple(int(x) for x in bgr[0, 0])

# -------------------------------------------------------------------------
# Continuous Cursive Control Points for "STUDY BUDDY"
# CRITICAL LAYOUT: ONE SINGLE HORIZONTAL LINE
# Baseline: y=420 across ALL letters of both "STUDY" and "BUDDY"
# Centered span: x=140 to x=1140 inside 1280px canvas (140px safe margins on both sides)
# -------------------------------------------------------------------------
DX = 30

ORIG_CTRL_PTS = [
    # Entry from offscreen left
    (-30, 420), (30, 420), (70, 420),
    # S
    (110, 420), (140, 415), (180, 400),
    (200, 240), (175, 210), (140, 225), (140, 260), (170, 305), (205, 350), (200, 405), (160, 420), (120, 400), (145, 420), (190, 420),
    # link to t
    (230, 420), (260, 320), (265, 215), (265, 385), (280, 420),
    # link to u
    (310, 335), (325, 400), (355, 420), (385, 385), (390, 335), (390, 395), (405, 420),
    # d
    (445, 395), (425, 345), (450, 330), (480, 355), (480, 215), (480, 395), (500, 420),
    # y (STUDY ends here)
    (525, 335), (535, 395), (560, 420), (585, 385), (590, 335), (590, 460), (570, 520), (545, 495), (570, 440), (600, 420),
    # Horizontal spacing link across to BUDDY along baseline y=420
    (625, 420),
    # B (BUDDY starts here, side-by-side on same baseline y=420)
    (655, 420), (655, 215), (690, 210), (720, 245), (695, 310), (665, 310), (710, 315), (735, 365), (725, 420), (675, 420),
    # link to u
    (755, 420), (770, 335), (780, 395), (805, 420), (830, 385), (835, 335), (835, 395), (850, 420),
    # d
    (885, 395), (865, 345), (890, 330), (920, 355), (920, 215), (920, 395), (940, 420),
    # d
    (975, 395), (955, 345), (980, 330), (1010, 355), (1010, 215), (1010, 395), (1030, 420),
    # y
    (1055, 335), (1065, 395), (1085, 420), (1105, 385), (1110, 335), (1110, 460), (1090, 520), (1065, 495), (1085, 440),
    # Exit to offscreen right
    (1120, 420), (1180, 420), (1310, 420)
]

CURSIVE_CTRL_PTS = [(x + DX, y) for (x, y) in ORIG_CTRL_PTS]
T_BAR_CTRL_PTS = [(235 + DX, 280), (295 + DX, 280)]

def catmull_rom(pts, num_samples=32):
    res = []
    for i in range(len(pts) - 1):
        p0 = pts[max(0, i - 1)]
        p1 = pts[i]
        p2 = pts[i + 1]
        p3 = pts[min(len(pts) - 1, i + 2)]
        for t_step in range(num_samples):
            t = t_step / float(num_samples)
            t2 = t * t
            t3 = t2 * t
            x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3)
            y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
            res.append((x, y))
    res.append(pts[-1])
    return res

# -------------------------------------------------------------------------
# Clay Robot Definitions & Roles in Choreography
# -------------------------------------------------------------------------
ROBOTS = [
    # 0: S Peak lifter & Percher
    {"id": 0, "name": "S_peak", "norm_u": 0.08, "act_range": (0.02, 0.13), "base_pos": (175 + DX, 435), "is_perch": True},
    # 1: S Base anchor
    {"id": 1, "name": "S_base", "norm_u": 0.05, "act_range": (0.01, 0.11), "base_pos": (125 + DX, 440), "is_perch": False},
    # 2: t Stem lifter
    {"id": 2, "name": "t_stem", "norm_u": 0.16, "act_range": (0.13, 0.20), "base_pos": (265 + DX, 440), "is_perch": False},
    # 3: d Ascender lifter
    {"id": 3, "name": "d1_asc", "norm_u": 0.33, "act_range": (0.28, 0.38), "base_pos": (480 + DX, 440), "is_perch": False},
    # 4: y Descender puller
    {"id": 4, "name": "y1_desc", "norm_u": 0.44, "act_range": (0.38, 0.48), "base_pos": (570 + DX, 445), "is_perch": False},
    # 5: B Top arch climber & percher
    {"id": 5, "name": "B_top", "norm_u": 0.54, "act_range": (0.48, 0.60), "base_pos": (690 + DX, 435), "is_perch": True},
    # 6: Buddy d1 Ascender lifter
    {"id": 6, "name": "d2_asc", "norm_u": 0.74, "act_range": (0.68, 0.78), "base_pos": (920 + DX, 440), "is_perch": False},
    # 7: Buddy d2 Ascender lifter
    {"id": 7, "name": "d3_asc", "norm_u": 0.83, "act_range": (0.78, 0.88), "base_pos": (1010 + DX, 440), "is_perch": False},
    # 8: Lead Rover / Dragging Robot
    {"id": 8, "name": "lead_rover", "is_rover": True, "base_pos": (1180, 440), "is_perch": False},
]

def draw_3d_clay_robot(canvas, x, y, hand_targets=None, is_perched=False, is_celebrating=False, cheer_phase=0.0, lean_angle=0.0):
    """Draws high-fidelity 3D clay robot matching reference video styling"""
    jump = abs(math.sin(cheer_phase)) * 22.0 if is_celebrating else 0.0
    body_x = x
    body_y = y - jump

    # 1. Floor shadow
    if not is_perched:
        sh_y = int(y + 28)
        sh_w = int(22 * (1.0 - jump * 0.02))
        sh_h = int(8 * (1.0 - jump * 0.02))
        cv2.ellipse(canvas, (int(x), sh_y), (sh_w, sh_h), 0, 0, 360, (215, 208, 198), -1, cv2.LINE_AA)
        cv2.ellipse(canvas, (int(x), sh_y), (int(sh_w * 0.6), int(sh_h * 0.5)), 0, 0, 360, (185, 175, 165), -1, cv2.LINE_AA)

    foot_color = (30, 110, 45)  # Dark olive green BGR
    foot_hi = (50, 150, 70)
    if not is_perched:
        cv2.ellipse(canvas, (int(body_x - 10), int(body_y + 22)), (9, 6), -10, 0, 360, foot_color, -1, cv2.LINE_AA)
        cv2.ellipse(canvas, (int(body_x - 11), int(body_y + 21)), (5, 3), -10, 0, 360, foot_hi, -1, cv2.LINE_AA)
        cv2.ellipse(canvas, (int(body_x + 10), int(body_y + 22)), (9, 6), 10, 0, 360, foot_color, -1, cv2.LINE_AA)
        cv2.ellipse(canvas, (int(body_x + 9), int(body_y + 21)), (5, 3), 10, 0, 360, foot_hi, -1, cv2.LINE_AA)
        cv2.line(canvas, (int(body_x - 7), int(body_y + 8)), (int(body_x - 9), int(body_y + 20)), foot_color, 8, cv2.LINE_AA)
        cv2.line(canvas, (int(body_x + 7), int(body_y + 8)), (int(body_x + 9), int(body_y + 20)), foot_color, 8, cv2.LINE_AA)
    else:
        cv2.ellipse(canvas, (int(body_x - 8), int(body_y + 14)), (6, 8), 15, 0, 360, foot_color, -1, cv2.LINE_AA)
        cv2.ellipse(canvas, (int(body_x + 8), int(body_y + 14)), (6, 8), -15, 0, 360, foot_color, -1, cv2.LINE_AA)

    # Torso with physical lean
    torso_color = (40, 145, 55)
    torso_hi = (70, 195, 85)
    lean_x = math.sin(lean_angle) * 9.0
    tx = body_x + lean_x
    ty = body_y + 4

    cv2.ellipse(canvas, (int(tx), int(ty)), (16, 14), 0, 0, 360, torso_color, -1, cv2.LINE_AA)
    cv2.ellipse(canvas, (int(tx - 3), int(ty - 3)), (12, 10), 0, 0, 360, torso_hi, -1, cv2.LINE_AA)

    # Dungarees straps & yellow buttons
    cv2.line(canvas, (int(tx - 7), int(ty - 9)), (int(tx - 5), int(ty + 6)), foot_color, 3, cv2.LINE_AA)
    cv2.line(canvas, (int(tx + 7), int(ty - 9)), (int(tx + 5), int(ty + 6)), foot_color, 3, cv2.LINE_AA)
    cv2.circle(canvas, (int(tx - 5), int(ty + 6)), 2, (30, 200, 240), -1, cv2.LINE_AA)
    cv2.circle(canvas, (int(tx + 5), int(ty + 6)), 2, (30, 200, 240), -1, cv2.LINE_AA)

    # Head: 3D round clay sphere
    hx = tx + lean_x * 0.5
    hy = ty - 18
    hr = 13
    cv2.circle(canvas, (int(hx), int(hy)), hr, (45, 165, 60), -1, cv2.LINE_AA)
    cv2.circle(canvas, (int(hx - 4), int(hy - 4)), int(hr * 0.75), (85, 215, 100), -1, cv2.LINE_AA)
    cv2.circle(canvas, (int(hx - 6), int(hy - 6)), int(hr * 0.35), (135, 245, 145), -1, cv2.LINE_AA)
    cv2.circle(canvas, (int(hx - 5), int(hy - 5)), 2, (255, 255, 255), -1, cv2.LINE_AA)

    # Eyes & smile
    eye_col = (15, 30, 15)
    if is_celebrating:
        cv2.ellipse(canvas, (int(hx - 4), int(hy - 1)), (3, 2), 0, 180, 360, eye_col, 2, cv2.LINE_AA)
        cv2.ellipse(canvas, (int(hx + 4), int(hy - 1)), (3, 2), 0, 180, 360, eye_col, 2, cv2.LINE_AA)
    else:
        cv2.circle(canvas, (int(hx - 4), int(hy - 1)), 2, eye_col, -1, cv2.LINE_AA)
        cv2.circle(canvas, (int(hx + 4), int(hy - 1)), 2, eye_col, -1, cv2.LINE_AA)
        cv2.circle(canvas, (int(hx - 5), int(hy - 2)), 1, (255, 255, 255), -1, cv2.LINE_AA)
        cv2.circle(canvas, (int(hx + 3), int(hy - 2)), 1, (255, 255, 255), -1, cv2.LINE_AA)
    cv2.ellipse(canvas, (int(hx), int(hy + 4)), (4, 3), 0, 10, 170, eye_col, 2, cv2.LINE_AA)

    # Clay arms scaled to grip thick rope
    arm_col = (50, 170, 65)
    hand_col = (70, 195, 85)
    shoulder_l = (int(tx - 11), int(ty - 3))
    shoulder_r = (int(tx + 11), int(ty - 3))

    if is_celebrating:
        arm_wave = math.sin(cheer_phase * 1.5) * 6.0
        hand_l = (int(tx - 18), int(ty - 24 + arm_wave))
        hand_r = (int(tx + 18), int(ty - 24 - arm_wave))
        cv2.line(canvas, shoulder_l, hand_l, arm_col, 6, cv2.LINE_AA)
        cv2.circle(canvas, hand_l, 5, hand_col, -1, cv2.LINE_AA)
        cv2.line(canvas, shoulder_r, hand_r, arm_col, 6, cv2.LINE_AA)
        cv2.circle(canvas, hand_r, 5, hand_col, -1, cv2.LINE_AA)
    elif hand_targets is not None:
        tgt_l, tgt_r = hand_targets
        cv2.line(canvas, shoulder_l, (int(tgt_l[0]), int(tgt_l[1])), arm_col, 6, cv2.LINE_AA)
        cv2.circle(canvas, (int(tgt_l[0]), int(tgt_l[1])), 6, hand_col, -1, cv2.LINE_AA)
        cv2.line(canvas, shoulder_r, (int(tgt_r[0]), int(tgt_r[1])), arm_col, 6, cv2.LINE_AA)
        cv2.circle(canvas, (int(tgt_r[0]), int(tgt_r[1])), 6, hand_col, -1, cv2.LINE_AA)
    else:
        cv2.line(canvas, shoulder_l, (int(tx - 14), int(ty + 5)), arm_col, 5, cv2.LINE_AA)
        cv2.circle(canvas, (int(tx - 14), int(ty + 5)), 5, hand_col, -1, cv2.LINE_AA)
        cv2.line(canvas, shoulder_r, (int(tx + 14), int(ty + 5)), arm_col, 5, cv2.LINE_AA)
        cv2.circle(canvas, (int(tx + 14), int(ty + 5)), 5, hand_col, -1, cv2.LINE_AA)

def render_realistic_braided_rope(canvas, spline, glint_progress=-1.0):
    """
    Renders authentic 3D thick multi-strand braided rainbow rope matching opening.mp4:
    - 3 interwoven helical strands twisting around a core with realistic pitch (~16px per ridge)
    - Realistic cylindrical normal mapping and Blinn-Phong specular highlights
    - Deep ambient occlusion in strand crevices
    - Subtle nylon/textile fiber microtexture along each strand
    - Dynamic contact shadows on the floor
    - Antialiased edges with zero jagged pixel artifacts
    """
    N_s = len(spline)
    if N_s < 3:
        return

    # Arc lengths
    arc_lens = [0.0]
    for i in range(N_s - 1):
        arc_lens.append(arc_lens[-1] + math.hypot(spline[i+1][0] - spline[i][0], spline[i+1][1] - spline[i][1]))
    total_L = arc_lens[-1]
    if total_L < 2.0:
        return

    # Sample uniformly along the curve
    ds = 0.65
    N_steps = max(3, int(total_L / ds))
    s_vals = np.linspace(0, total_L, N_steps, dtype=np.float32)

    sample_pts = np.zeros((N_steps, 2), dtype=np.float32)
    sample_tangents = np.zeros((N_steps, 2), dtype=np.float32)
    sample_normals = np.zeros((N_steps, 2), dtype=np.float32)

    cur_idx = 0
    for i, s in enumerate(s_vals):
        while cur_idx < N_s - 2 and arc_lens[cur_idx + 1] < s:
            cur_idx += 1
        seg_len = max(1e-4, arc_lens[cur_idx + 1] - arc_lens[cur_idx])
        t_frac = (s - arc_lens[cur_idx]) / seg_len

        px = spline[cur_idx][0] + (spline[cur_idx+1][0] - spline[cur_idx][0]) * t_frac
        py = spline[cur_idx][1] + (spline[cur_idx+1][1] - spline[cur_idx][1]) * t_frac
        sample_pts[i] = (px, py)

        ip1 = min(N_s - 1, cur_idx + 1)
        im1 = max(0, cur_idx - 1)
        dx = spline[ip1][0] - spline[im1][0]
        dy = spline[ip1][1] - spline[im1][1]
        L = math.hypot(dx, dy)
        if L > 1e-4:
            tx, ty = dx / L, dy / L
        else:
            tx, ty = 1.0, 0.0
        sample_tangents[i] = (tx, ty)
        sample_normals[i] = (-ty, tx)

    # 1. Soft floor contact shadow
    shadow_layer = np.zeros(canvas.shape[:2], dtype=np.float32)
    for i in range(0, N_steps, 3):
        px, py = sample_pts[i]
        elev = max(0, FLOOR_Y - py)
        sx = int(px + 8 + elev * 0.08)
        sy = int(py + 18 + elev * 0.16)
        sw = int(ROPE_RADIUS * 1.5 + elev * 0.14)
        sh = max(4, int(sw * 0.38))
        if 0 <= sx < canvas.shape[1] and 0 <= sy < canvas.shape[0]:
            cv2.ellipse(shadow_layer, (sx, sy), (sw, sh), 0, 0, 360, float(0.44 / (1.0 + elev * 0.015)), -1)

    shadow_blur = cv2.GaussianBlur(shadow_layer, (25, 25), 0)
    for c in range(3):
        canvas[:, :, c] = np.clip(canvas[:, :, c].astype(np.float32) * (1.0 - shadow_blur * 0.52), 0, 255).astype(np.uint8)

    # 2. Rope layer rendering with alpha channel for crisp, antialiased edges
    rope_rgb = np.zeros(canvas.shape, dtype=np.uint8)
    rope_alpha = np.zeros(canvas.shape[:2], dtype=np.uint8)

    # Underlying inner core: prevents any background bleed through crevices
    for i in range(0, N_steps - 1):
        p1 = (int(round(sample_pts[i][0])), int(round(sample_pts[i][1])))
        p2 = (int(round(sample_pts[i+1][0])), int(round(sample_pts[i+1][1])))
        s = s_vals[i]
        hue = (300 - (s / total_L) * 420 + 360 * 3) % 360
        c_core = hsv_to_bgr(hue, 0.88, 0.60)
        cv2.line(rope_rgb, p1, p2, c_core, int(ROPE_RADIUS * 1.1), cv2.LINE_AA)
        cv2.line(rope_alpha, p1, p2, 255, int(ROPE_RADIUS * 1.1), cv2.LINE_AA)

    # 3. Braided surface quads
    lx, ly, lz = -0.35, -0.60, 0.70
    l_mag = math.hypot(lx, ly, lz)
    lx, ly, lz = lx/l_mag, ly/l_mag, lz/l_mag

    hx_l, hy_l, hz_l = lx, ly, lz + 1.0
    h_len = math.sqrt(hx_l**2 + hy_l**2 + hz_l**2)
    hx_l /= h_len; hy_l /= h_len; hz_l /= h_len

    v_samples = np.linspace(-ROPE_RADIUS, ROPE_RADIUS, 19, dtype=np.float32)
    Nv = len(v_samples)

    verts = np.zeros((N_steps, Nv, 2), dtype=np.float32)
    colors = np.zeros((N_steps, Nv, 3), dtype=np.uint8)
    alphas = np.zeros((N_steps, Nv), dtype=np.float32)

    v_grid = v_samples[np.newaxis, :]       # (1, Nv)
    s_grid = s_vals[:, np.newaxis]          # (N_steps, 1)
    px_grid = sample_pts[:, 0:1]            # (N_steps, 1)
    py_grid = sample_pts[:, 1:2]            # (N_steps, 1)
    tx_grid = sample_tangents[:, 0:1]
    ty_grid = sample_tangents[:, 1:2]
    nx_grid = sample_normals[:, 0:1]
    ny_grid = sample_normals[:, 1:2]

    verts[:, :, 0] = px_grid + nx_grid * v_grid
    verts[:, :, 1] = py_grid + ny_grid * v_grid

    # 3 Helical Strands
    h_list = []
    du_list = []
    dz_ds_list = []
    du_ds_list = []

    dtheta_ds = TWIST_SIGN * 2.0 * np.pi / TWIST_PITCH

    for k in range(3):
        theta = TWIST_SIGN * (s_grid / TWIST_PITCH) * (2.0 * np.pi) + k * (2.0 * np.pi / 3.0)
        u_k = R_CORE * np.cos(theta)
        z_k = R_CORE * np.sin(theta)
        du = v_grid - u_k

        dz_ds = R_CORE * dtheta_ds * np.cos(theta)
        du_ds = -R_CORE * dtheta_ds * np.sin(theta)

        valid = np.abs(du) <= STRAND_RADIUS
        h_val = np.where(valid, z_k + np.sqrt(np.maximum(0.0, STRAND_RADIUS**2 - du**2)), -999.0)

        h_list.append(h_val)
        du_list.append(du)
        dz_ds_list.append(np.broadcast_to(dz_ds, du.shape))
        du_ds_list.append(np.broadcast_to(du_ds, du.shape))

    h_stack = np.stack(h_list, axis=-1)
    best_k = np.argmax(h_stack, axis=-1)
    best_z = np.max(h_stack, axis=-1)

    k_idx = best_k[:, :, np.newaxis]
    best_du = np.take_along_axis(np.stack(du_list, axis=-1), k_idx, axis=-1).squeeze(-1)
    best_dz_ds = np.take_along_axis(np.stack(dz_ds_list, axis=-1), k_idx, axis=-1).squeeze(-1)
    best_du_ds = np.take_along_axis(np.stack(du_ds_list, axis=-1), k_idx, axis=-1).squeeze(-1)

    dist_edge = ROPE_RADIUS - np.abs(v_grid)
    alpha_mat = np.clip(dist_edge / 1.5, 0.0, 1.0)
    alpha_mat = np.where(best_z > -900.0, alpha_mat, 0.0)
    alphas = alpha_mat

    sqrt_term = np.maximum(0.5, np.sqrt(np.maximum(0.25, STRAND_RADIUS**2 - best_du**2)))
    dZ_dv = -best_du / sqrt_term
    dZ_ds = best_dz_ds - (best_du / sqrt_term) * best_du_ds

    n3d_x = (-dZ_ds) * tx_grid + (-dZ_dv) * nx_grid
    n3d_y = (-dZ_ds) * ty_grid + (-dZ_dv) * ny_grid
    n3d_z = np.ones_like(n3d_x)
    n_len = np.sqrt(n3d_x**2 + n3d_y**2 + n3d_z**2)
    n3d_x /= n_len
    n3d_y /= n_len
    n3d_z /= n_len

    diff = np.maximum(0.18, n3d_x * lx + n3d_y * ly + n3d_z * lz)
    ao = np.clip((best_z + 2.5) / (R_CORE + STRAND_RADIUS), 0.35, 1.0)

    spec = np.maximum(0.0, n3d_x * hx_l + n3d_y * hy_l + n3d_z * hz_l) ** 14.0

    if glint_progress >= 0.0:
        u_curve = s_grid / total_L
        glint_dist = np.abs(u_curve - glint_progress)
        glint_glow = np.clip(1.0 - glint_dist / 0.08, 0.0, 1.0)
        spec += glint_glow * 1.8

    fiber = 1.0 + 0.07 * np.sin(best_k * 12.3 + best_du * 3.5 + s_grid * 0.4)
    val = np.clip((0.34 + 0.66 * diff) * ao * fiber, 0.0, 1.0)

    hue_mat = (300.0 - (s_grid / total_L) * 420.0 + 360.0 * 3) % 360.0
    hue_grid = np.broadcast_to(hue_mat, val.shape)

    h_norm = hue_grid / 60.0
    i_h = np.floor(h_norm).astype(np.int32) % 6
    f_h = h_norm - np.floor(h_norm)
    sat = 0.88
    p_c = val * (1.0 - sat)
    q_c = val * (1.0 - sat * f_h)
    t_c = val * (1.0 - sat * (1.0 - f_h))

    r_c = np.zeros_like(val)
    g_c = np.zeros_like(val)
    b_c = np.zeros_like(val)

    m = (i_h == 0); r_c[m] = val[m]; g_c[m] = t_c[m]; b_c[m] = p_c[m]
    m = (i_h == 1); r_c[m] = q_c[m]; g_c[m] = val[m]; b_c[m] = p_c[m]
    m = (i_h == 2); r_c[m] = p_c[m]; g_c[m] = val[m]; b_c[m] = t_c[m]
    m = (i_h == 3); r_c[m] = p_c[m]; g_c[m] = q_c[m]; b_c[m] = val[m]
    m = (i_h == 4); r_c[m] = t_c[m]; g_c[m] = p_c[m]; b_c[m] = val[m]
    m = (i_h == 5); r_c[m] = val[m]; g_c[m] = p_c[m]; b_c[m] = q_c[m]

    shaded_b = np.clip(b_c * 255.0 + spec * 155.0, 0, 255)
    shaded_g = np.clip(g_c * 255.0 + spec * 155.0, 0, 255)
    shaded_r = np.clip(r_c * 255.0 + spec * 155.0, 0, 255)
    colors = np.stack([shaded_b, shaded_g, shaded_r], axis=-1).astype(np.uint8)

    for i in range(N_steps - 1):
        for j in range(Nv - 1):
            if alphas[i, j] < 0.1 and alphas[i, j+1] < 0.1:
                continue
            poly = np.array([verts[i, j], verts[i, j+1], verts[i+1, j+1], verts[i+1, j]], dtype=np.int32)
            avg_col = tuple(int(x) for x in (colors[i, j].astype(np.int32) + colors[i+1, j+1].astype(np.int32)) // 2)
            cv2.fillConvexPoly(rope_rgb, poly, avg_col, cv2.LINE_AA)
            cv2.fillConvexPoly(rope_alpha, poly, 255, cv2.LINE_AA)

    alpha_mask = cv2.GaussianBlur(rope_alpha, (3, 3), 0).astype(np.float32) / 255.0
    alpha_mask = np.expand_dims(alpha_mask, axis=2)
    canvas[:] = np.clip(canvas * (1.0 - alpha_mask) + rope_rgb * alpha_mask, 0, 255).astype(np.uint8)

def generate_video(output_path):
    print(f"🎬 Starting render of realistic braided rope animation to {output_path}...")
    start_time = time.time()
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    fourcc = cv2.VideoWriter_fourcc(*'avc1')
    writer = cv2.VideoWriter(output_path, fourcc, FPS, (WIDTH, HEIGHT))
    if not writer.isOpened():
        print("⚠️ avc1 not opened, falling back to mp4v")
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        writer = cv2.VideoWriter(output_path, fourcc, FPS, (WIDTH, HEIGHT))

    # Pre-calculate target cursive splines
    target_main_spline = catmull_rom(CURSIVE_CTRL_PTS, num_samples=35)
    target_t_bar_spline = catmull_rom(T_BAR_CTRL_PTS, num_samples=20)
    N_main = len(target_main_spline)

    # Pure white studio tabletop background
    bg_template = np.ones((HEIGHT, WIDTH, 3), dtype=np.uint8) * 255

    confetti = []
    np.random.seed(42)

    for f in range(TOTAL_FRAMES):
        if f % 30 == 0:
            print(f"  Rendering frame {f}/{TOTAL_FRAMES} ({(f / TOTAL_FRAMES) * 100:.1f}%)...")

        canvas = bg_template.copy()

        # -------------------------------------------------------------
        # 1. Physics: Wave Head Progress & Rope Traveling Dynamics
        # -------------------------------------------------------------
        if f < INITIAL_WAVE_END:
            # Phase 1: Pure Serpentine Wavy Rope on Floor
            wave_prog = 0.0
            is_pulling = False
            settle_amp = 0.0
        elif f >= PULL_END:
            # Phase 3: All Letters Formed & Settled
            wave_prog = 1.0
            is_pulling = False
            frames_since_end = f - PULL_END
            settle_amp = math.sin(frames_since_end * 0.45) * math.exp(-frames_since_end * 0.12) * 4.5
        else:
            # Phase 2: Active Left-to-Right Pulling Choreography
            raw_p = (f - INITIAL_WAVE_END) / float(PULL_END - INITIAL_WAVE_END)
            wave_prog = ease_in_out_cubic(raw_p)
            is_pulling = True
            settle_amp = 0.0

        # Active leading index along the target letter track
        active_idx = max(2, min(N_main - 1, int(wave_prog * (N_main - 1))))
        active_pt = target_main_spline[active_idx]

        # -------------------------------------------------------------
        # 2. Build Continuous Traveling Spline
        # -------------------------------------------------------------
        if f < INITIAL_WAVE_END:
            # Undulating serpentine across the entire floor
            cur_spline = []
            for x_c in np.linspace(-30, 1310, 220):
                u_x = (x_c + 30) / 1340.0
                y_c = FLOOR_Y + 32.0 * math.sin(u_x * 18.0 + f * 0.08) + 12.0 * math.cos(u_x * 36.0)
                cur_spline.append((x_c, y_c))
            ground_contact_x = 130.0
        elif wave_prog >= 0.999:
            # Fully formed letter word
            cur_spline = []
            for i in range(N_main):
                tx, ty = target_main_spline[i]
                bounce = settle_amp * math.sin(i * 0.05) if f >= PULL_END else 0.0
                cur_spline.append((tx, ty + bounce))
            ground_contact_x = 1310.0
        else:
            # Formed letters up to active_idx
            formed_pts = []
            for i in range(active_idx + 1):
                tx, ty = target_main_spline[i]
                dist_back = active_idx - i
                if dist_back < 80:
                    bounce = math.sin(dist_back * 0.22) * math.exp(-dist_back * 0.04) * 4.0
                else:
                    bounce = 0.0
                formed_pts.append((tx, ty + bounce))

            # Taut tension cord dropping from active_pt to floor
            h = max(0, FLOOR_Y - active_pt[1])
            ground_contact_x = active_pt[0] + max(25.0, h * 0.45)

            trans_pts = []
            for s_step in range(1, 14):
                st = s_step / 14.0
                tx = active_pt[0] + (ground_contact_x - active_pt[0]) * st
                ty = active_pt[1] + (FLOOR_Y - active_pt[1]) * (st ** 1.35)
                trans_pts.append((tx, ty))

            # Slack undulating cord along floor to the right
            slide_shift = wave_prog * 180.0
            slack_pts = []
            x_c = ground_contact_x
            while x_c <= 1320:
                dist_g = x_c - ground_contact_x
                wave_amp = min(16.0, dist_g * 0.35)
                wave_y = FLOOR_Y + wave_amp * math.sin((dist_g + slide_shift) * 0.038) + 6.0 * math.cos((dist_g + slide_shift) * 0.08)
                slack_pts.append((x_c, wave_y))
                x_c += 12.0

            cur_spline = formed_pts + trans_pts + slack_pts

        # 't' crossbar forms when active head passes 't'
        cur_t_spline = []
        t_prog = min(1.0, max(0.0, (wave_prog - 0.15) / 0.06))
        if t_prog > 0.02:
            eased_t = ease_in_out_cubic(t_prog)
            for i in range(len(target_t_bar_spline)):
                tx, ty = target_t_bar_spline[i]
                ix = tx
                iy = FLOOR_Y
                cur_t_spline.append((ix + (tx - ix) * eased_t, iy + (ty - iy) * eased_t))

        # -------------------------------------------------------------
        # 3. Render 3D Thick Braided Rope
        # -------------------------------------------------------------
        glint_p = -1.0
        if f >= GLINT_START_FRAME and f <= GLINT_END_FRAME:
            glint_p = (f - GLINT_START_FRAME) / float(GLINT_END_FRAME - GLINT_START_FRAME)

        render_realistic_braided_rope(canvas, cur_spline, glint_progress=glint_p)
        if len(cur_t_spline) > 2:
            render_realistic_braided_rope(canvas, cur_t_spline, glint_progress=glint_p)

        # -------------------------------------------------------------
        # 4. Clay Robots Choreography
        # -------------------------------------------------------------
        is_celebrating = (f >= CELEBRATE_FRAME)

        for rob in ROBOTS:
            cheer_phase = f * 0.45 + rob["id"]

            if rob.get("is_rover", False):
                # Lead Rover: walks along floor dragging the slack line
                if not is_celebrating:
                    rover_x = min(WIDTH - 110, ground_contact_x + 35)
                    rover_y = FLOOR_Y + 12
                    hand_tgts = ((rover_x - 10, FLOOR_Y + 5), (rover_x + 6, FLOOR_Y + 5))
                    lean = -0.40
                else:
                    rover_x = 1150
                    rover_y = FLOOR_Y + 15
                    hand_tgts = None
                    lean = 0.0

                draw_3d_clay_robot(canvas, rover_x, rover_y, hand_targets=hand_tgts,
                                   is_perched=False, is_celebrating=is_celebrating,
                                   cheer_phase=cheer_phase, lean_angle=lean)
            else:
                norm_u = rob["norm_u"]
                act_start, act_end = rob["act_range"]
                is_perch = rob.get("is_perch", False)

                if wave_prog < act_start:
                    bx, by = rob["base_pos"]
                    draw_3d_clay_robot(canvas, bx, by, hand_targets=None,
                                       is_perched=False, is_celebrating=False,
                                       cheer_phase=0.0, lean_angle=0.0)
                elif wave_prog <= act_end and is_pulling:
                    if is_perch:
                        bx = active_pt[0]
                        by = active_pt[1] - 16
                        hand_tgts = ((active_pt[0] - 10, active_pt[1]), (active_pt[0] + 10, active_pt[1]))
                        draw_3d_clay_robot(canvas, bx, by, hand_targets=hand_tgts,
                                           is_perched=True, is_celebrating=False,
                                           cheer_phase=0.0, lean_angle=0.0)
                    else:
                        bx, by = rob["base_pos"]
                        hand_tgts = ((active_pt[0] - 8, active_pt[1]), (active_pt[0] + 8, active_pt[1]))
                        pull_dir = 1.0 if active_pt[0] > bx else -1.0
                        lean = -0.38 * pull_dir
                        draw_3d_clay_robot(canvas, bx, by, hand_targets=hand_tgts,
                                           is_perched=False, is_celebrating=False,
                                           cheer_phase=0.0, lean_angle=lean)
                else:
                    pt_idx = int(norm_u * (N_main - 1))
                    rope_hold_pt = target_main_spline[min(N_main - 1, max(0, pt_idx))]

                    if is_perch:
                        bx = rope_hold_pt[0]
                        by = rope_hold_pt[1] - 16
                        hand_tgts = ((rope_hold_pt[0] - 10, rope_hold_pt[1]), (rope_hold_pt[0] + 10, rope_hold_pt[1])) if not is_celebrating else None
                        draw_3d_clay_robot(canvas, bx, by, hand_targets=hand_tgts,
                                           is_perched=True, is_celebrating=is_celebrating,
                                           cheer_phase=cheer_phase, lean_angle=0.0)
                    else:
                        bx, by = rob["base_pos"]
                        hand_tgts = ((rope_hold_pt[0] - 8, rope_hold_pt[1]), (rope_hold_pt[0] + 8, rope_hold_pt[1])) if not is_celebrating else None
                        draw_3d_clay_robot(canvas, bx, by, hand_targets=hand_tgts,
                                           is_perched=False, is_celebrating=is_celebrating,
                                           cheer_phase=cheer_phase, lean_angle=-0.12)

        # -------------------------------------------------------------
        # 5. Celebration Particles & Tagline Reveal
        # -------------------------------------------------------------
        if f == CELEBRATE_FRAME:
            c_palette = [(236, 72, 153), (139, 92, 246), (6, 182, 212), (16, 185, 129), (245, 158, 11), (212, 175, 55)]
            for _ in range(75):
                angle = np.random.uniform(0, math.pi * 2)
                spd = np.random.uniform(3.5, 9.5)
                confetti.append({
                    "x": np.random.uniform(160, 1120), "y": np.random.uniform(220, 420),
                    "vx": math.cos(angle) * spd, "vy": math.sin(angle) * spd - 3.5,
                    "color": c_palette[np.random.randint(len(c_palette))],
                    "size": np.random.uniform(3.0, 5.5), "alpha": 1.0, "decay": np.random.uniform(0.012, 0.022)
                })

        for p in confetti:
            p["x"] += p["vx"]
            p["y"] += p["vy"]
            p["vy"] += 0.20
            p["alpha"] -= p["decay"]
            if p["alpha"] > 0.05:
                col = tuple(int(c * p["alpha"]) for c in p["color"])
                sz = int(p["size"])
                cv2.rectangle(canvas, (int(p["x"] - sz), int(p["y"] - sz)),
                              (int(p["x"] + sz), int(p["y"] + sz)), col, -1)

        # Tagline: Clean, elegant fade-in with gold divider accents
        if f >= TAGLINE_START:
            alpha = min(1.0, (f - TAGLINE_START) / 25.0)
            tag_y = int(HEIGHT * 0.84)
            tag_text = "YOUR PERSONAL AI STUDY COMPANION"
            cx = WIDTH // 2

            gold_col = (55, 175, 212)
            cv2.line(canvas, (cx - 250, tag_y), (cx - 190, tag_y), gold_col, 2, cv2.LINE_AA)
            cv2.line(canvas, (cx + 190, tag_y), (cx + 250, tag_y), gold_col, 2, cv2.LINE_AA)

            pil_overlay = Image.fromarray(cv2.cvtColor(canvas, cv2.COLOR_BGR2RGB))
            draw_pil = ImageDraw.Draw(pil_overlay)
            try:
                font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 17)
            except:
                font = ImageFont.load_default()

            bbox = draw_pil.textbbox((0, 0), tag_text, font=font)
            tw = bbox[2] - bbox[0]
            text_rgb = (int(45 * alpha + 245 * (1.0 - alpha)),
                        int(50 * alpha + 245 * (1.0 - alpha)),
                        int(65 * alpha + 245 * (1.0 - alpha)))
            draw_pil.text((cx - tw // 2, tag_y - 11), tag_text, fill=text_rgb, font=font)
            canvas = cv2.cvtColor(np.array(pil_overlay), cv2.COLOR_RGB2BGR)

        writer.write(canvas)

    writer.release()
    elapsed = time.time() - start_time
    print(f"🎉 Complete! Exported realistic braided rope video to {output_path} in {elapsed:.2f}s ({TOTAL_FRAMES} frames @ {FPS}fps)")

if __name__ == "__main__":
    out_file = "/Users/ananya/Desktop/StudyBuddy/frontend/src/assets/studybuddy_intro.mp4"
    generate_video(out_file)
