from flask import Flask, Response, jsonify, request
from flask_cors import CORS
import cv2
import mediapipe as mp
from ultralytics import YOLO
import numpy as np
import time
import os
import csv
import glob
import base64
import jwt
from datetime import datetime

# Prevent PyTorch from spawning excess threads to protect Render free-tier RAM (512MB)
try:
    import torch
    torch.set_num_threads(1)
except Exception:
    pass

# ========= Settings =========
ALERT_COOLDOWN_SEC = 3.0
LOG_DIR = "focus_logs"
FOCUS_MAX = 100
FOCUS_MIN = 0
AWAY_THRESHOLD = 10.0
# ===========================

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 2 * 1024 * 1024  # 2MB max payload protection
CORS(app, origins="*", allow_headers=["Content-Type", "Authorization", "X-Detector-Key"])

# ----- Sound helper -----
def play_alert():
    try:
        import winsound
        winsound.Beep(1000, 300)
        return
    except:
        pass
    try:
        os.system('say "Stay Focused" >/dev/null 2>&1 &')
        return
    except:
        pass
    print("\a")

# ----- CSV helpers -----
def ensure_log_dir():
    if not os.path.exists(LOG_DIR):
        os.makedirs(LOG_DIR)

def today_csv_path():
    ensure_log_dir()
    fname = datetime.now().strftime("%Y-%m-%d") + ".csv"
    return os.path.join(LOG_DIR, fname)

def init_csv_if_needed():
    path = today_csv_path()
    if not os.path.exists(path):
        with open(path, "w", newline="") as f:
            w = csv.writer(f)
            w.writerow([
                "timestamp","status","gaze_status","faces_detected",
                "phone_detected","focus_score"
            ])

def log_row(ts, status, gaze_status, faces_detected, phone_detected, focus_score):
    init_csv_if_needed()
    with open(today_csv_path(), "a", newline="") as f:
        w = csv.writer(f)
        w.writerow([ts, status, gaze_status, faces_detected, int(phone_detected), focus_score])

def get_available_log_dates():
    ensure_log_dir()
    files = sorted(glob.glob(os.path.join(LOG_DIR, "*.csv")))
    return [os.path.splitext(os.path.basename(f))[0] for f in files]

def read_log_csv_content(date_str):
    safe_date = os.path.basename(date_str).replace(".csv", "")
    file_path = os.path.join(LOG_DIR, f"{safe_date}.csv")
    if not os.path.exists(file_path):
        return None
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read()

# ===== Mediapipe + YOLO init =====
try:
    mp_face_mesh = mp.solutions.face_mesh
    mp_drawing = mp.solutions.drawing_utils
except AttributeError:
    import mediapipe.python.solutions.face_mesh as mp_face_mesh
    import mediapipe.python.solutions.drawing_utils as mp_drawing
model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "yolov8n.pt")
if not os.path.exists(model_path):
    model_path = "yolov8n.pt"
yolo_model = YOLO(model_path)

def get_head_pose(landmarks, img_shape):
    h, w = img_shape
    nose = np.array([landmarks[1].x * w, landmarks[1].y * h])
    chin = np.array([landmarks[152].x * w, landmarks[152].y * h])
    left_ear = np.array([landmarks[234].x * w, landmarks[234].y * h])
    right_ear = np.array([landmarks[454].x * w, landmarks[454].y * h])

    dy = chin[1] - nose[1]
    dx = chin[0] - nose[0]
    pitch_angle = np.degrees(np.arctan2(dy, dx))

    dist_left = np.linalg.norm(nose - left_ear)
    dist_right = np.linalg.norm(nose - right_ear)
    yaw_ratio = dist_left / (dist_right + 1e-6)

    if 0.7 < yaw_ratio < 1.3:
        if -15 < pitch_angle < 15:
            return "screen"
        elif pitch_angle > 15:
            return "notebook"
        else:
            return "away"
    else:
        return "away"

import threading

# ===== Global state =====
camera_lock = threading.Lock()
is_camera_active = False
cap = None
focus_score = 100
last_tick = time.time()
last_alert_time = 0.0
sound_enabled = True
frame_counter_for_log = 0
look_away_start = None

def start_camera():
    global cap, is_camera_active
    with camera_lock:
        if cap is None or not cap.isOpened():
            cap = cv2.VideoCapture(0)
        is_camera_active = True
    return True

def stop_camera():
    global cap, is_camera_active
    with camera_lock:
        is_camera_active = False
        if cap is not None:
            try:
                cap.release()
            except Exception as e:
                print("Error releasing camera:", e)
            cap = None
    return True

latest_payload = {
    "status": "Waiting...",
    "gaze_status": "away",
    "faces_detected": 0,
    "phone_detected": False,
    "focus_score": 100
}

face_mesh = mp_face_mesh.FaceMesh(refine_landmarks=True, max_num_faces=2)

def verify_request_auth():
    """
    Validates JWT token from Authorization header if JWT_SECRET is configured.
    Never exposes private secrets in client-side Vite code.
    Allows local development requests (127.0.0.1 / localhost) so local webcam testing works smoothly.
    In production, validates incoming JWT bearer tokens if provided or if REQUIRE_AUTH is true.
    """
    client_ip = request.remote_addr or ""
    # Always allow local development
    if client_ip in ["127.0.0.1", "localhost", "::1"]:
        return True, None

    jwt_secret = os.environ.get("JWT_SECRET", "")
    if not jwt_secret:
        return True, None

    auth_header = request.headers.get("Authorization", "")
    if not auth_header or not auth_header.startswith("Bearer "):
        # If strict auth is not forced, allow guest frame monitoring
        if os.environ.get("REQUIRE_AUTH", "false").lower() != "true":
            return True, None
        return False, "Missing or invalid Authorization header"

    token = auth_header.split(" ", 1)[1].strip()
    try:
        jwt.decode(token, jwt_secret, algorithms=["HS256"])
        return True, None
    except Exception as e:
        # Also try short/clean secret if secret in .env had comments
        if "#" in jwt_secret:
            try:
                jwt.decode(token, jwt_secret.split("#", 1)[0].strip(), algorithms=["HS256"])
                return True, None
            except Exception:
                pass
        if os.environ.get("REQUIRE_AUTH", "false").lower() != "true":
            print(f"⚠️ JWT verification notice: {e}")
            return True, None
        return False, f"Invalid token: {str(e)}"


def process_single_frame(frame, is_stream=False):
    global focus_score, last_tick, last_alert_time, look_away_start, latest_payload, frame_counter_for_log

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    result = face_mesh.process(rgb)

    faces_detected = 0
    gaze_status = "away"

    if result.multi_face_landmarks:
        faces_detected = len(result.multi_face_landmarks)
        if faces_detected == 1:
            landmarks = result.multi_face_landmarks[0].landmark
            gaze_status = get_head_pose(landmarks, frame.shape[:2])
            mp_drawing.draw_landmarks(
                frame,
                result.multi_face_landmarks[0],
                mp_face_mesh.FACEMESH_CONTOURS
            )

    # Phone detection
    phone_detected = False
    results = yolo_model(frame, verbose=False)
    for r in results:
        for box in r.boxes:
            cls = int(box.cls[0])
            conf = float(box.conf[0])
            if r.names[cls] == "cell phone" and conf > 0.5:
                phone_detected = True
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                cv2.putText(frame, "Phone", (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

    # away timer
    if gaze_status == "away":
        if look_away_start is None:
            look_away_start = time.time()
    else:
        look_away_start = None

    away_long_enough = False
    if look_away_start is not None:
        if time.time() - look_away_start >= AWAY_THRESHOLD:
            away_long_enough = True

    # STATUS
    if faces_detected != 1:
        status = "Not Focused (Multiple/No Face)"
        color = (0, 0, 255)
    elif phone_detected:
        status = "Not Focused (Phone Detected)"
        color = (0, 0, 255)
    elif gaze_status in ["screen", "notebook"]:
        status = f"Focused ({gaze_status})"
        color = (0, 255, 0)
    elif away_long_enough:
        status = "Not Focused (Looking Away >10s)"
        color = (0, 0, 255)
    else:
        status = "Focused (temporary glance away)"
        color = (0, 255, 255)

    # Focus score update
    now = time.time()
    dt = now - last_tick
    if dt < 0: dt = 0
    if dt > 3.0: dt = 1.0  # clamp dt so paused frames don't jump score
    last_tick = now

    if status.startswith("Focused (screen)") or status.startswith("Focused (notebook)"):
        focus_score += int(+20 * dt)
    elif "temporary glance" in status:
        focus_score += int(+5 * dt)
    elif "Phone Detected" in status:
        focus_score -= int(25 * dt)
    else:
        focus_score -= int(15 * dt)

    focus_score = max(FOCUS_MIN, min(FOCUS_MAX, focus_score))

    # Sound alert trigger
    alert_needed = (("Not Focused" in status) or phone_detected) and sound_enabled
    should_alert = False
    if alert_needed and (now - last_alert_time) >= ALERT_COOLDOWN_SEC:
        play_alert()
        last_alert_time = now
        should_alert = True

    # CSV logging
    if is_stream:
        frame_counter_for_log += 1
        if frame_counter_for_log >= 30:
            frame_counter_for_log = 0
            ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            log_row(ts, status, gaze_status, faces_detected, phone_detected, focus_score)
    else:
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_row(ts, status, gaze_status, faces_detected, phone_detected, focus_score)

    # update latest payload
    latest_payload = {
        "status": status,
        "gaze_status": gaze_status,
        "faces_detected": faces_detected,
        "phone_detected": phone_detected,
        "focus_score": focus_score,
        "is_camera_active": True
    }

    # draw overlay
    cv2.putText(frame, status, (30, 50),
                cv2.FONT_HERSHEY_SIMPLEX, 1.0, color, 3)

    cv2.putText(frame, f"Focus Score: {focus_score}/100", (30, 90),
                cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)

    bar_x, bar_y, bar_w, bar_h = 30, 110, 300, 20
    cv2.rectangle(frame, (bar_x, bar_y),
                  (bar_x + bar_w, bar_y + bar_h),
                  (200, 200, 200), 2)

    fill_w = int(bar_w * (focus_score / 100.0))
    cv2.rectangle(frame, (bar_x, bar_y),
                  (bar_x + fill_w, bar_y + bar_h),
                  (0, 255, 0), -1)

    # encode to jpg
    ret, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
    annotated_b64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode("utf-8") if ret else ""

    return {
        "status": status,
        "gaze_status": gaze_status,
        "faces_detected": faces_detected,
        "phone_detected": phone_detected,
        "focus_score": focus_score,
        "alert": should_alert,
        "annotated_image": annotated_b64,
        "frame_bytes": buffer.tobytes() if ret else b""
    }

def generate_frames():
    global is_camera_active, cap

    start_camera()

    try:
        while is_camera_active:
            frame = None
            with camera_lock:
                if not is_camera_active or cap is None or not cap.isOpened():
                    break
                ret, frame = cap.read()
                if not ret:
                    frame = None

            if frame is None:
                time.sleep(0.05)
                continue

            result = process_single_frame(frame, is_stream=True)
            frame_bytes = result.get("frame_bytes", b"")

            yield (b"--frame\r\n"
                   b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n")
    except GeneratorExit:
        pass
    except Exception as e:
        print("Stream generator error:", e)

@app.route("/process_frame", methods=["POST", "OPTIONS"])
def process_frame():
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200

    is_authed, err = verify_request_auth()
    if not is_authed:
        return jsonify({"error": err or "Unauthorized"}), 401

    data = request.get_json(silent=True)
    if not data or "image" not in data:
        return jsonify({"error": "Missing 'image' in payload"}), 400

    img_b64 = data["image"]
    if "," in img_b64:
        img_b64 = img_b64.split(",", 1)[1]

    try:
        img_bytes = base64.b64decode(img_b64)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    except Exception as e:
        return jsonify({"error": f"Failed to decode image: {str(e)}"}), 400

    if frame is None or frame.size == 0:
        return jsonify({"error": "Decoded image is empty"}), 400

    result = process_single_frame(frame, is_stream=False)
    # Remove binary bytes from JSON response
    result.pop("frame_bytes", None)

    return jsonify({
        "success": True,
        **result
    })

@app.after_request
def after_request(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    return response

@app.route("/video_feed")
def video_feed():
    return Response(generate_frames(), mimetype="multipart/x-mixed-replace; boundary=frame")

@app.route("/start", methods=["POST", "GET"])
def start_feed():
    start_camera()
    return jsonify({"success": True, "status": "started", "active": True})

@app.route("/stop", methods=["POST", "GET"])
def stop_feed():
    stop_camera()
    return jsonify({"success": True, "status": "stopped", "active": False})

@app.route("/status", methods=["GET"])
def status_feed():
    return jsonify({"active": is_camera_active})

@app.route("/analysis")
def analysis():
    return jsonify({
        **latest_payload,
        "is_camera_active": is_camera_active
    })

# ===== CSV Log Retrieval Endpoints (for Streamlit Dashboard & Reporting) =====
@app.route("/api/logs/dates", methods=["GET"])
def get_log_dates():
    dates = get_available_log_dates()
    return jsonify({"success": True, "dates": dates})

@app.route("/api/logs/<date_str>.csv", methods=["GET"])
def get_log_csv(date_str):
    content = read_log_csv_content(date_str)
    if content is None:
        return jsonify({"error": "Log file not found"}), 404
    return Response(content, mimetype="text/csv")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=False, use_reloader=False)

