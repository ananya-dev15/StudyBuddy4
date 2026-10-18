// BrowserDetector: 100% On-Device Client-Side AI Computer Vision Engine
// Stack: MediaPipe FaceMesh (WASM) + TensorFlow.js COCO-SSD (WebGL)
// Privacy Guarantee: 100% local processing. 0 frames or logs sent to server/MongoDB.

import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import { FaceMesh } from "@mediapipe/face_mesh";
import { saveMonitoringRecord, formatTimestamp } from "./monitoringDB";

export class BrowserDetector {
  constructor(options = {}) {
    this.videoElement = null;
    this.overlayCanvas = null;
    this.onStatsUpdate = options.onStatsUpdate || (() => {});
    this.onError = options.onError || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});

    // AI Models
    this.cocoModel = null;
    this.faceMesh = null;
    this.isModelsReady = false;
    this.isModelLoading = false;

    // Tracking State
    this.isRunning = false;
    this.animationFrameId = null;
    this.phoneDetectionIntervalId = null;
    this.logIntervalId = null;

    // Metrics State
    this.focusScore = 100;
    this.lastTickTime = Date.now();
    this.lookAwayStartTime = null;
    this.awayThresholdMs = 10000; // 10.0s
    this.lastAlertTime = 0;
    this.alertCooldownMs = 3000; // 3.0s
    this.soundEnabled = true;

    // Detection Results
    this.currentFacesCount = 0;
    this.currentGazeStatus = "screen";
    this.currentLandmarks = null;
    this.currentPhoneDetected = false;
    this.currentPhoneBox = null;
    this.phonePersistenceTimer = 0;
    this.latestStatus = "Ready";
  }

  /**
   * Pre-warm / load models into browser memory (Parallel loading)
   */
  async loadModels() {
    if (this.isModelsReady) return;
    if (this.isModelLoading) return;
    this.isModelLoading = true;
    this.onStatusChange("Loading AI Models (Browser-based)...");

    try {
      // Set tfjs backend to webgl if available
      try {
        await tf.setBackend("webgl");
        await tf.ready();
      } catch (e) {
        console.warn("WebGL not supported, falling back to CPU backend:", e);
        await tf.setBackend("cpu");
        await tf.ready();
      }

      // Parallel Model Initialization
      const cocoPromise = cocoSsd.load({
        base: "lite_mobilenet_v2", // Fast & lightweight for real-time mobile/webcam
      });

      const faceMeshPromise = new Promise((resolve, reject) => {
        try {
          const fm = new FaceMesh({
            locateFile: (file) =>
              `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`,
          });

          fm.setOptions({
            maxNumFaces: 2,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });

          fm.onResults((results) => {
            this.handleFaceMeshResults(results);
          });

          // Test initialization
          resolve(fm);
        } catch (err) {
          reject(err);
        }
      });

      const [loadedCoco, loadedFaceMesh] = await Promise.all([
        cocoPromise,
        faceMeshPromise,
      ]);

      this.cocoModel = loadedCoco;
      this.faceMesh = loadedFaceMesh;
      this.isModelsReady = true;
      this.isModelLoading = false;
      this.onStatusChange("AI Models Ready");
    } catch (err) {
      this.isModelLoading = false;
      console.error("Failed to load on-device browser AI models:", err);
      this.onError("Could not load AI models into browser. Please check internet connection.");
      throw err;
    }
  }

  /**
   * Start on-device real-time monitoring loop
   */
  async start(videoElement, overlayCanvas) {
    if (this.isRunning) return;
    this.videoElement = videoElement;
    this.overlayCanvas = overlayCanvas;

    if (!this.isModelsReady) {
      await this.loadModels();
    }

    this.isRunning = true;
    this.focusScore = 100;
    this.lastTickTime = Date.now();
    this.lookAwayStartTime = null;
    this.lastAlertTime = 0;
    this.latestStatus = "Focused (screen)";

    // Start Phone Detection Loop (~150ms throttled)
    this.phoneDetectionIntervalId = setInterval(() => {
      this.detectPhoneFrame();
    }, 150);

    // Start 1-second Periodic IndexedDB Logging
    this.logIntervalId = setInterval(() => {
      this.logCurrentState();
    }, 1000);

    // Start Main Inference & Render Loop (requestAnimationFrame)
    this.inferenceLoop();
  }

  /**
   * Main Real-time Animation Loop (FaceMesh + Overlay Render + Score Tick)
   */
  async inferenceLoop() {
    if (!this.isRunning) return;

    const video = this.videoElement;
    if (video && video.readyState >= 2 && !video.paused && this.faceMesh) {
      try {
        await this.faceMesh.send({ image: video });
      } catch (e) {
        // Suppress frame drop errors
      }
    }

    this.updateFocusScoreAndStatus();
    this.renderCanvasOverlay();

    if (this.isRunning) {
      this.animationFrameId = requestAnimationFrame(() => this.inferenceLoop());
    }
  }

  /**
   * Handle results from MediaPipe FaceMesh
   */
  handleFaceMeshResults(results) {
    if (!this.isRunning) return;

    if (!results || !results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      this.currentFacesCount = 0;
      this.currentGazeStatus = "away";
      this.currentLandmarks = null;
      return;
    }

    this.currentFacesCount = results.multiFaceLandmarks.length;

    if (this.currentFacesCount === 1) {
      const landmarks = results.multiFaceLandmarks[0];
      this.currentLandmarks = landmarks;
      this.currentGazeStatus = this.calculateHeadPose(landmarks);
    } else {
      this.currentLandmarks = results.multiFaceLandmarks[0];
      this.currentGazeStatus = "away";
    }
  }

  /**
   * Head pose / gaze classification matching Python study_monitor.py:
   * landmark 1 = nose
   * landmark 152 = chin
   * landmark 234 = left ear
   * landmark 454 = right ear
   */
  calculateHeadPose(landmarks) {
    const nose = landmarks[1];
    const chin = landmarks[152];
    const leftEar = landmarks[234];
    const rightEar = landmarks[454];

    if (!nose || !chin || !leftEar || !rightEar) {
      return "away";
    }

    // Yaw ratio: dist(nose, left_ear) / (dist(nose, right_ear) + 1e-6)
    const distLeft = Math.hypot(nose.x - leftEar.x, nose.y - leftEar.y);
    const distRight = Math.hypot(nose.x - rightEar.x, nose.y - rightEar.y);
    const yawRatio = distLeft / (distRight + 1e-6);

    // Pitch: angle of chin relative to nose
    // When upright & looking at screen, nose is higher than chin (chin.y > nose.y)
    // Looking down at notebook increases vertical angle or chin pitch
    const dy = chin.y - nose.y;
    const dx = chin.x - nose.x;
    // 2D pitch relative to vertical (degrees)
    const pitchAngle2D = Math.atan2(dy, dx) * (180 / Math.PI) - 90;
    // 3D pitch utilizing depth (chin.z vs nose.z)
    const dz = (chin.z || 0) - (nose.z || 0);
    const pitchAngle3D = Math.atan2(dz, dy) * (180 / Math.PI);
    const pitchAngle = Math.abs(pitchAngle3D) > 5 ? pitchAngle3D : pitchAngle2D;

    // Exact Python rule:
    // 0.7 < yaw_ratio < 1.3:
    //   -15 < pitch < 15 => screen
    //   pitch > 15 => notebook
    //   else => away
    // else => away
    if (yawRatio > 0.65 && yawRatio < 1.35) {
      if (pitchAngle >= -18 && pitchAngle <= 18) {
        return "screen";
      } else if (pitchAngle > 18) {
        return "notebook";
      } else {
        return "away";
      }
    } else {
      return "away";
    }
  }

  /**
   * Fast Phone Detection with COCO-SSD
   * Matches 'cell phone', 'phone', or 'remote' with sensitive threshold (0.18)
   */
  async detectPhoneFrame() {
    if (!this.isRunning || !this.cocoModel || !this.videoElement) return;
    const video = this.videoElement;
    if (video.readyState < 2 || video.paused) return;

    try {
      const predictions = await this.cocoModel.detect(video, 10, 0.18);
      const phonePred = predictions.find((p) => {
        const cls = (p.class || "").toLowerCase();
        return (cls === "cell phone" || cls === "phone" || cls === "remote") && p.score >= 0.20;
      });

      if (phonePred) {
        this.currentPhoneDetected = true;
        this.currentPhoneBox = {
          bbox: phonePred.bbox,
          score: phonePred.score,
        };
        this.phonePersistenceTimer = Date.now() + 800; // 800ms persistence to prevent flicker
      } else {
        if (Date.now() > this.phonePersistenceTimer) {
          this.currentPhoneDetected = false;
          this.currentPhoneBox = null;
        }
      }
    } catch (e) {
      // Suppress temporary frame inference errors
    }
  }

  /**
   * Update Focus Score & Status (Continuous Time Delta dt)
   */
  updateFocusScoreAndStatus() {
    const now = Date.now();
    const dt = Math.min((now - this.lastTickTime) / 1000, 1.0); // clamped to 1.0s
    this.lastTickTime = now;

    // Look away timer logic
    if (this.currentGazeStatus === "away" && this.currentFacesCount === 1) {
      if (this.lookAwayStartTime === null) {
        this.lookAwayStartTime = now;
      }
    } else {
      this.lookAwayStartTime = null;
    }

    const awayLongEnough =
      this.lookAwayStartTime !== null &&
      now - this.lookAwayStartTime >= this.awayThresholdMs;

    // Status classification matching Python study_monitor.py
    let status = "Focused (screen)";
    if (this.currentFacesCount !== 1) {
      status = "Not Focused (Multiple/No Face)";
    } else if (this.currentPhoneDetected) {
      status = "Not Focused (Phone Detected)";
    } else if (this.currentGazeStatus === "screen" || this.currentGazeStatus === "notebook") {
      status = `Focused (${this.currentGazeStatus})`;
    } else if (awayLongEnough) {
      status = "Not Focused (Looking Away >10s)";
    } else {
      status = "Focused (temporary glance away)";
    }

    this.latestStatus = status;

    // Continuous Focus Score update rules (scaled by dt)
    if (status.startsWith("Focused (screen)") || status.startsWith("Focused (notebook)")) {
      this.focusScore += 20 * dt;
    } else if (status.includes("temporary glance")) {
      this.focusScore += 5 * dt;
    } else if (status.includes("Phone Detected")) {
      this.focusScore -= 25 * dt;
    } else {
      // Other not-focused states
      this.focusScore -= 15 * dt;
    }

    this.focusScore = Math.max(0, Math.min(100, this.focusScore));

    // Trigger local speech alert if Not Focused or Phone Detected (with 3s cooldown)
    if (
      (status.startsWith("Not Focused") || this.currentPhoneDetected) &&
      this.soundEnabled &&
      now - this.lastAlertTime >= this.alertCooldownMs
    ) {
      this.playLocalAlert();
      this.lastAlertTime = now;
    }

    // Emit live stats for React UI
    this.onStatsUpdate({
      status,
      gaze_status: this.currentGazeStatus,
      faces_detected: this.currentFacesCount,
      phone_detected: this.currentPhoneDetected ? 1 : 0,
      focus_score: Math.round(this.focusScore),
      phone_box: this.currentPhoneBox,
    });
  }

  /**
   * Local Voice Alert ("Stay Focused")
   */
  playLocalAlert() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance("Stay Focused");
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn("Speech synthesis alert failed:", e);
      }
    }
  }

  /**
   * Log monitoring row into IndexedDB (approx 1 row/sec)
   */
  async logCurrentState() {
    if (!this.isRunning) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    const tsStr = formatTimestamp(new Date());

    await saveMonitoringRecord({
      date: todayStr,
      timestamp: tsStr,
      status: this.latestStatus,
      gaze_status: this.currentGazeStatus,
      faces_detected: this.currentFacesCount,
      phone_detected: this.currentPhoneDetected ? 1 : 0,
      focus_score: Math.round(this.focusScore),
    });
  }

  /**
   * Draw On-Canvas Overlay (Bounding box, landmarks, status bar)
   */
  renderCanvasOverlay() {
    const canvas = this.overlayCanvas;
    const video = this.videoElement;
    if (!canvas || !video || video.readyState < 2) return;

    const ctx = canvas.getContext("2d");
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.clearRect(0, 0, width, height);

    // 1. Draw Face Mesh Points if 1 face detected
    if (this.currentLandmarks && this.currentFacesCount === 1) {
      ctx.fillStyle = "rgba(0, 245, 212, 0.65)";
      const keyPoints = [1, 33, 263, 61, 291, 199, 152, 234, 454];
      for (const idx of keyPoints) {
        const pt = this.currentLandmarks[idx];
        if (pt) {
          ctx.beginPath();
          ctx.arc(pt.x * width, pt.y * height, 2.5, 0, 2 * Math.PI);
          ctx.fill();
        }
      }

      // Draw subtle nose-to-chin line
      const nose = this.currentLandmarks[1];
      const chin = this.currentLandmarks[152];
      if (nose && chin) {
        ctx.strokeStyle = "rgba(0, 255, 163, 0.5)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(nose.x * width, nose.y * height);
        ctx.lineTo(chin.x * width, chin.y * height);
        ctx.stroke();
      }
    }

    // 2. Draw Phone Bounding Box
    if (this.currentPhoneBox) {
      const [x, y, w, h] = this.currentPhoneBox.bbox;
      const conf = Math.round((this.currentPhoneBox.score || 0.8) * 100);

      // Red Bounding Box
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, h);

      // Label background
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(x, Math.max(0, y - 26), Math.max(120, w * 0.5), 26);

      // Label text
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText(`📱 Phone (${conf}%)`, x + 6, Math.max(18, y - 8));
    }

    // 3. Top Status Pill
    const isFocused = this.latestStatus.startsWith("Focused");
    const pillColor = isFocused ? "#10b981" : "#ef4444";
    const pillBg = isFocused ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)";

    ctx.save();
    ctx.fillStyle = pillBg;
    ctx.strokeStyle = pillColor;
    ctx.lineWidth = 1.5;

    // Draw pill
    const pillText = `${this.latestStatus} • Score: ${Math.round(this.focusScore)}/100`;
    ctx.font = "bold 13px sans-serif";
    const textWidth = ctx.measureText(pillText).width;
    const pillW = textWidth + 24;
    const pillH = 28;
    const pillX = 14;
    const pillY = 14;

    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.fillText(pillText, pillX + 12, pillY + 19);
    ctx.restore();
  }

  /**
   * Sound on/off toggle ('S' key)
   */
  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    return this.soundEnabled;
  }

  /**
   * Reset focus score ('R' key)
   */
  resetScore() {
    this.focusScore = 100;
  }

  /**
   * Stop monitoring loop & release camera
   */
  stop() {
    this.isRunning = false;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.phoneDetectionIntervalId) {
      clearInterval(this.phoneDetectionIntervalId);
      this.phoneDetectionIntervalId = null;
    }

    if (this.logIntervalId) {
      clearInterval(this.logIntervalId);
      this.logIntervalId = null;
    }

    if (this.overlayCanvas) {
      const ctx = this.overlayCanvas.getContext("2d");
      ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    }

    this.currentPhoneDetected = false;
    this.currentPhoneBox = null;
    this.latestStatus = "Ready";
  }
}
