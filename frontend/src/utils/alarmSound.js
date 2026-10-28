// Web Audio API digital alarm sound generator
class AlarmSoundManager {
  constructor() {
    this.audioCtx = null;
    this.intervalId = null;
    this.isPlaying = false;
    this.backupAudio = null;
  }

  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        if (!this.audioCtx || this.audioCtx.state === "closed") {
          this.audioCtx = new AudioContextClass();
        }
        if (this.audioCtx.state === "suspended") {
          this.audioCtx.resume().catch(() => {});
        }

        const beep = () => {
          if (!this.audioCtx || this.audioCtx.state === "closed" || !this.isPlaying) return;
          try {
            const now = this.audioCtx.currentTime;

            // Dual tone alarm: 880Hz (A5) then 1046.5Hz (C6)
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();

            osc.type = "sine";
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.setValueAtTime(1046.5, now + 0.1);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            osc.start(now);
            osc.stop(now + 0.22);
          } catch (e) {
            console.warn("Alarm beep error:", e);
          }
        };

        // Double beep pattern every 850ms
        beep();
        setTimeout(() => { if (this.isPlaying) beep(); }, 140);

        this.intervalId = setInterval(() => {
          if (!this.isPlaying) return;
          beep();
          setTimeout(() => { if (this.isPlaying) beep(); }, 140);
        }, 850);
      }
    } catch (err) {
      console.warn("Alarm sound manager start error:", err);
    }

    // Secondary backup audio
    try {
      if (!this.backupAudio) {
        this.backupAudio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
      }
      this.backupAudio.currentTime = 0;
      this.backupAudio.play().catch(() => {});
    } catch (e) {}
  }

  stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close().catch(() => {});
      } catch (e) {}
      this.audioCtx = null;
    }
    if (this.backupAudio) {
      try {
        this.backupAudio.pause();
        this.backupAudio.currentTime = 0;
      } catch (e) {}
    }
  }
}

export const alarmSound = new AlarmSoundManager();
