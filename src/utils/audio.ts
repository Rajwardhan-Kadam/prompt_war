// Web Audio API sound generator for tournament timer & actions
class SoundFX {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playBeep(freq = 600, duration = 0.08, type: OscillatorType = 'sine') {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Audio might be blocked by autoplay policies until user gesture
    }
  }

  playWarningPing() {
    this.playBeep(880, 0.15, 'triangle');
    setTimeout(() => this.playBeep(440, 0.25, 'triangle'), 120);
  }

  playSuccessChime() {
    this.playBeep(523.25, 0.1, 'sine');
    setTimeout(() => this.playBeep(659.25, 0.1, 'sine'), 90);
    setTimeout(() => this.playBeep(783.99, 0.2, 'sine'), 180);
  }
}

export const sound = new SoundFX();
