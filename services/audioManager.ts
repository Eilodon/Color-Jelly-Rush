class AudioManager {
  private audioContext: AudioContext | null = null;
  private bgmOscillators: OscillatorNode[] = [];
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;

  constructor() {
    // Lazy init on first user interaction usually, but we'll try to init
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = 0.3; // Default volume
    } catch (e) {
      console.error("Audio API not supported");
    }
  }

  public resume() {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  // Generate a procedural sound
  private playTone(freq: number, type: OscillatorType, duration: number, startTime: number = 0, volume: number = 1) {
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.audioContext.currentTime + startTime);

    gain.gain.setValueAtTime(volume, this.audioContext.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + startTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(this.audioContext.currentTime + startTime);
    osc.stop(this.audioContext.currentTime + startTime + duration);
  }

  public playEject() {
    // "Pew" sound
    if (!this.audioContext) return;
    this.playTone(600, 'sine', 0.1, 0, 0.5);
    this.playTone(300, 'triangle', 0.1, 0.05, 0.3);
  }

  public playEat() {
    // "Chime" sound
    this.playTone(800 + Math.random() * 200, 'sine', 0.1, 0, 0.1);
  }

  public playKill() {
    // Deep Gong/Impact
    this.playTone(100, 'sawtooth', 0.5, 0, 0.8);
    this.playTone(50, 'sine', 1.0, 0, 1.0);
  }

  public playSkill() {
    // Whoosh
    if (!this.audioContext || !this.masterGain) return;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.frequency.setValueAtTime(200, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0.5, this.audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.audioContext.currentTime + 0.3);
  }

  public playWarning() {
    // Siren alert for Round Change
    if (!this.audioContext || !this.masterGain) return;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, this.audioContext.currentTime);
    osc.frequency.linearRampToValueAtTime(880, this.audioContext.currentTime + 0.5);
    osc.frequency.linearRampToValueAtTime(440, this.audioContext.currentTime + 1.0);
    
    gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 1.0);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.audioContext.currentTime + 1.0);
  }

  public startBGM() {
    // Simple drone/ambient background
    if (!this.audioContext || !this.masterGain || this.bgmOscillators.length > 0) return;
    
    const freqs = [110, 164.8, 196, 220]; // A3, E3, G3, A4 (Am7ish)
    
    freqs.forEach(f => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      
      osc.type = 'triangle';
      osc.frequency.value = f;
      
      // LFO for movement
      const lfo = this.audioContext!.createOscillator();
      lfo.frequency.value = 0.1 + Math.random() * 0.1;
      const lfoGain = this.audioContext!.createGain();
      lfoGain.gain.value = 0.02;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.start();

      gain.gain.value = 0.05;
      
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start();
      
      this.bgmOscillators.push(osc);
    });
  }
}

export const audioManager = new AudioManager();