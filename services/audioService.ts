import { SoundType } from '../types';

class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private bgmInterval: number | null = null;
  private beatCount: number = 0;

  constructor() {
    // Initialize on first user interaction to comply with browser policies
  }

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = 0.3; // Default volume
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public playSound(type: SoundType) {
    this.init();
    if (this.isMuted || !this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.masterGain);

    switch (type) {
      case SoundType.LASER:
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.2);
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
        osc.start(t);
        osc.stop(t + 0.2);
        break;

      case SoundType.EXPLOSION:
        // Create noise buffer
        const bufferSize = this.ctx.sampleRate * 0.5; // 0.5 seconds
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        
        // Filter for "crunchy" sound
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, t);
        filter.frequency.linearRampToValueAtTime(100, t + 0.3);
        
        noise.connect(filter);
        filter.connect(gain);
        
        gain.gain.setValueAtTime(0.8, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
        
        noise.start(t);
        break;

      case SoundType.UI_HOVER:
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.linearRampToValueAtTime(600, t + 0.05);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.05);
        osc.start(t);
        osc.stop(t + 0.05);
        break;
        
      case SoundType.UI_CLICK:
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.1);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        osc.start(t);
        osc.stop(t + 0.1);
        break;
    }
  }

  public startBGM() {
    this.init();
    if (this.bgmInterval) return;
    
    // Simple Cyberpunk Beat (120 BPM)
    const bpm = 120;
    const beatDuration = 60 / bpm;
    
    this.bgmInterval = window.setInterval(() => {
      if (this.isMuted || !this.ctx || !this.masterGain) return;
      const t = this.ctx.currentTime;
      
      // Kick (on beat 1 and 3)
      if (this.beatCount % 4 === 0 || this.beatCount % 4 === 2) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.5);
        
        gain.gain.setValueAtTime(1, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
        
        osc.start(t);
        osc.stop(t + 0.5);
      }
      
      // Snare/Clap (on beat 2 and 4)
      if (this.beatCount % 4 === 2) {
         // Simple noise snare
         const osc = this.ctx.createOscillator();
         osc.type = 'triangle';
         const gain = this.ctx.createGain();
         osc.connect(gain);
         gain.connect(this.masterGain);
         
         osc.frequency.setValueAtTime(200, t);
         gain.gain.setValueAtTime(0.3, t);
         gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
         osc.start(t);
         osc.stop(t + 0.2);
      }
      
      // Hi-hat (every beat)
      const hat = this.ctx.createOscillator();
      const hatGain = this.ctx.createGain();
      hat.type = 'square';
      hat.connect(hatGain);
      hatGain.connect(this.masterGain);
      // High pass filter logic omitted for simplicity, using high pitch square
      hat.frequency.setValueAtTime(this.beatCount % 2 === 0 ? 4000 : 8000, t); 
      hatGain.gain.setValueAtTime(0.05, t);
      hatGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      hat.start(t);
      hat.stop(t + 0.05);

      // Bassline (Arpeggio style)
      const bass = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bass.type = 'sawtooth';
      bass.connect(bassGain);
      bassGain.connect(this.masterGain);
      
      const notes = [55, 65, 55, 82]; // Hz frequencies for a low A sequence
      bass.frequency.setValueAtTime(notes[this.beatCount % 4], t);
      bassGain.gain.setValueAtTime(0.15, t);
      bassGain.gain.linearRampToValueAtTime(0, t + beatDuration);
      bass.start(t);
      bass.stop(t + beatDuration);

      this.beatCount++;
    }, beatDuration * 1000);
  }

  public stopBGM() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.isMuted ? 0 : 0.3;
    }
    return this.isMuted;
  }
}

export const audioService = new AudioService();
