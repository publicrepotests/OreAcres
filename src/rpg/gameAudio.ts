export type GameAudioCue =
  | "footstep"
  | "melee-swing"
  | "range-shot"
  | "magic-cast"
  | "impact"
  | "hurt"
  | "block"
  | "heal"
  | "mine"
  | "chop"
  | "fish"
  | "gather-complete"
  | "victory"
  | "loot"
  | "quest"
  | "level";

type ToneOptions = {
  delay?: number;
  duration?: number;
  endFrequency?: number;
  gain?: number;
  type?: OscillatorType;
  bus?: "music" | "sfx";
};

type SampleDefinition = { paths: string[]; gain: number; playbackVariance?: number };

const SAMPLE_DEFINITIONS: Partial<Record<GameAudioCue, SampleDefinition>> = {
  footstep: {
    paths: Array.from({ length: 6 }, (_, index) => `/assets/rpg/audio/kenney/footstep0${index}.ogg`),
    gain: 0.2,
    playbackVariance: 0.05,
  },
  "melee-swing": { paths: ["/assets/rpg/audio/kenney/knifeSlice.ogg", "/assets/rpg/audio/kenney/knifeSlice2.ogg"], gain: 0.34, playbackVariance: 0.04 },
  "range-shot": { paths: ["/assets/rpg/audio/kenney/drawKnife1.ogg", "/assets/rpg/audio/kenney/drawKnife2.ogg", "/assets/rpg/audio/kenney/drawKnife3.ogg"], gain: 0.2, playbackVariance: 0.08 },
  "magic-cast": { paths: ["/assets/rpg/audio/kenney/bookFlip1.ogg", "/assets/rpg/audio/kenney/bookFlip2.ogg", "/assets/rpg/audio/kenney/bookFlip3.ogg"], gain: 0.17, playbackVariance: 0.12 },
  impact: { paths: ["/assets/rpg/audio/kenney/metalPot1.ogg", "/assets/rpg/audio/kenney/metalPot2.ogg", "/assets/rpg/audio/kenney/metalPot3.ogg"], gain: 0.17, playbackVariance: 0.08 },
  hurt: { paths: ["/assets/rpg/audio/kenney/dropLeather.ogg", "/assets/rpg/audio/kenney/cloth3.ogg", "/assets/rpg/audio/kenney/cloth4.ogg"], gain: 0.2, playbackVariance: 0.08 },
  block: { paths: ["/assets/rpg/audio/kenney/metalLatch.ogg"], gain: 0.3, playbackVariance: 0.04 },
  heal: { paths: ["/assets/rpg/audio/kenney/bookOpen.ogg"], gain: 0.16, playbackVariance: 0.08 },
  mine: { paths: ["/assets/rpg/audio/kenney/metalClick.ogg"], gain: 0.32, playbackVariance: 0.08 },
  chop: { paths: ["/assets/rpg/audio/kenney/chop.ogg"], gain: 0.32, playbackVariance: 0.05 },
  fish: { paths: ["/assets/rpg/audio/kenney/handleSmallLeather.ogg", "/assets/rpg/audio/kenney/handleSmallLeather2.ogg"], gain: 0.16, playbackVariance: 0.08 },
  "gather-complete": { paths: ["/assets/rpg/audio/kenney/handleCoins2.ogg"], gain: 0.17, playbackVariance: 0.04 },
  victory: { paths: ["/assets/rpg/audio/kenney/handleCoins.ogg", "/assets/rpg/audio/kenney/handleCoins2.ogg"], gain: 0.2, playbackVariance: 0.04 },
  loot: { paths: ["/assets/rpg/audio/kenney/handleCoins.ogg", "/assets/rpg/audio/kenney/handleCoins2.ogg"], gain: 0.24, playbackVariance: 0.03 },
  quest: { paths: ["/assets/rpg/audio/kenney/bookOpen.ogg"], gain: 0.26, playbackVariance: 0.03 },
  level: { paths: ["/assets/rpg/audio/kenney/bookOpen.ogg", "/assets/rpg/audio/kenney/handleCoins.ogg"], gain: 0.2, playbackVariance: 0.05 },
};

export class GameAudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicTimer: number | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private sampleBuffers = new Map<string, AudioBuffer>();
  private samplePreloadStarted = false;
  private enabled = false;
  private musicStep = 0;
  private lastCueAt = new Map<GameAudioCue, number>();

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.stopMusic();
      if (this.master && this.context) this.master.gain.setTargetAtTime(0.0001, this.context.currentTime, 0.025);
      return;
    }
    const context = this.ensureContext();
    this.master?.gain.setTargetAtTime(0.72, context.currentTime, 0.04);
    void context.resume();
    void this.preloadSamples();
  }

  play(cue: GameAudioCue) {
    if (!this.enabled) return;
    const now = performance.now();
    const minimumGap = cue === "impact" || cue === "hurt" ? 55 : cue === "footstep" ? 175 : 90;
    if (now - (this.lastCueAt.get(cue) ?? 0) < minimumGap) return;
    this.lastCueAt.set(cue, now);
    const context = this.ensureContext();
    void context.resume();
    if (this.playSample(cue)) return;
    // Never substitute harsh synthesized noises while a recorded cue is loading.
    if (SAMPLE_DEFINITIONS[cue]) {
      void this.preloadSamples();
      return;
    }

    switch (cue) {
      case "footstep":
        this.noise(0.045, 0.018, 420, "lowpass");
        break;
      case "melee-swing":
        this.noise(0.08, 0.055, 1450, "bandpass");
        this.tone(210, { duration: 0.1, endFrequency: 72, gain: 0.055, type: "sawtooth" });
        break;
      case "range-shot":
        this.tone(780, { duration: 0.085, endFrequency: 270, gain: 0.05, type: "square" });
        this.noise(0.05, 0.025, 2400, "highpass");
        break;
      case "magic-cast":
        this.tone(260, { duration: 0.28, endFrequency: 620, gain: 0.04, type: "sine" });
        this.tone(520, { delay: 0.035, duration: 0.24, endFrequency: 980, gain: 0.026, type: "triangle" });
        break;
      case "impact":
        this.noise(0.105, 0.07, 720, "lowpass");
        this.tone(116, { duration: 0.12, endFrequency: 62, gain: 0.075, type: "triangle" });
        break;
      case "hurt":
        this.tone(170, { duration: 0.14, endFrequency: 92, gain: 0.065, type: "sawtooth" });
        break;
      case "block":
        this.tone(430, { duration: 0.13, endFrequency: 820, gain: 0.05, type: "triangle" });
        this.tone(980, { delay: 0.025, duration: 0.11, endFrequency: 660, gain: 0.035, type: "sine" });
        break;
      case "heal":
        this.sequence([392, 523.25, 659.25], 0.075, 0.028, "sine");
        break;
      case "mine":
        this.tone(610, { duration: 0.1, endFrequency: 190, gain: 0.052, type: "square" });
        this.noise(0.11, 0.045, 1100, "bandpass");
        break;
      case "chop":
        this.noise(0.12, 0.055, 540, "lowpass");
        this.tone(145, { duration: 0.1, endFrequency: 92, gain: 0.05, type: "triangle" });
        break;
      case "fish":
        this.tone(235, { duration: 0.12, endFrequency: 335, gain: 0.035, type: "sine" });
        this.tone(310, { delay: 0.07, duration: 0.1, endFrequency: 410, gain: 0.025, type: "sine" });
        break;
      case "gather-complete":
        this.sequence([330, 440, 554.37], 0.065, 0.025, "triangle");
        break;
      case "victory":
        this.sequence([261.63, 329.63, 392, 523.25], 0.085, 0.035, "triangle");
        break;
      case "loot":
        this.sequence([523.25, 659.25, 783.99], 0.06, 0.032, "sine");
        break;
      case "quest":
        this.sequence([293.66, 392, 440, 587.33], 0.08, 0.03, "triangle");
        break;
      case "level":
        this.sequence([261.63, 329.63, 392, 523.25, 659.25], 0.07, 0.038, "triangle");
        break;
    }
  }

  dispose() {
    this.stopMusic();
    const context = this.context;
    this.context = null;
    this.master = null;
    this.musicBus = null;
    this.sfxBus = null;
    this.noiseBuffer = null;
    this.sampleBuffers.clear();
    this.samplePreloadStarted = false;
    if (context) void context.close();
  }

  private ensureContext() {
    if (this.context) return this.context;
    const context = new AudioContext();
    const master = context.createGain();
    const musicBus = context.createGain();
    const sfxBus = context.createGain();
    master.gain.value = 0.72;
    musicBus.gain.value = 0.42;
    sfxBus.gain.value = 0.9;
    musicBus.connect(master);
    sfxBus.connect(master);
    master.connect(context.destination);
    this.context = context;
    this.master = master;
    this.musicBus = musicBus;
    this.sfxBus = sfxBus;
    return context;
  }

  private async preloadSamples() {
    if (this.samplePreloadStarted) return;
    this.samplePreloadStarted = true;
    const context = this.ensureContext();
    const paths = [...new Set(Object.values(SAMPLE_DEFINITIONS).flatMap((definition) => definition?.paths ?? []))];
    await Promise.all(paths.map(async (path) => {
      try {
        const response = await fetch(path);
        if (!response.ok) return;
        const buffer = await context.decodeAudioData(await response.arrayBuffer());
        this.sampleBuffers.set(path, buffer);
      } catch {
        // Synthesized cues remain available when a browser cannot decode a sample.
      }
    }));
  }

  private playSample(cue: GameAudioCue) {
    const definition = SAMPLE_DEFINITIONS[cue];
    if (!definition || !this.context || !this.sfxBus) return false;
    const available = definition.paths.filter((path) => this.sampleBuffers.has(path));
    if (available.length === 0) return false;
    const path = available[Math.floor(Math.random() * available.length)];
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = this.sampleBuffers.get(path)!;
    const variance = definition.playbackVariance ?? 0;
    source.playbackRate.value = 1 + (Math.random() * 2 - 1) * variance;
    gain.gain.value = definition.gain;
    source.connect(gain).connect(this.sfxBus);
    source.start();
    return true;
  }

  private tone(frequency: number, options: ToneOptions = {}) {
    const context = this.ensureContext();
    const bus = options.bus === "music" ? this.musicBus : this.sfxBus;
    if (!bus) return;
    const start = context.currentTime + (options.delay ?? 0);
    const duration = options.duration ?? 0.16;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = options.type ?? "triangle";
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, options.endFrequency ?? frequency), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(options.gain ?? 0.035, start + Math.min(0.025, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(bus);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  private sequence(frequencies: number[], spacing: number, gain: number, type: OscillatorType) {
    frequencies.forEach((frequency, index) => {
      this.tone(frequency, { delay: index * spacing, duration: spacing * 1.8, gain, type });
    });
  }

  private noise(duration: number, gainValue: number, frequency: number, filterType: BiquadFilterType) {
    const context = this.ensureContext();
    if (!this.sfxBus) return;
    if (!this.noiseBuffer) {
      const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.35), context.sampleRate);
      const channel = buffer.getChannelData(0);
      for (let index = 0; index < channel.length; index += 1) channel[index] = Math.random() * 2 - 1;
      this.noiseBuffer = buffer;
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const start = context.currentTime;
    source.buffer = this.noiseBuffer;
    filter.type = filterType;
    filter.frequency.value = frequency;
    gain.gain.setValueAtTime(gainValue, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter).connect(gain).connect(this.sfxBus);
    source.start(start);
    source.stop(start + duration);
  }

  private startMusic() {
    if (this.musicTimer !== null) return;
    const melody = [220, 261.63, 293.66, 329.63, 392, 329.63, 293.66, 246.94];
    const bass = [110, 110, 130.81, 98];
    const playStep = () => {
      if (!this.enabled) return;
      const note = melody[this.musicStep % melody.length];
      this.tone(note, { duration: 0.72, gain: 0.018, type: "triangle", bus: "music" });
      if (this.musicStep % 2 === 0) {
        this.tone(bass[Math.floor(this.musicStep / 2) % bass.length], {
          duration: 1.35,
          gain: 0.012,
          type: "sine",
          bus: "music",
        });
      }
      this.musicStep += 1;
    };
    playStep();
    this.musicTimer = window.setInterval(playStep, 820);
  }

  private stopMusic() {
    if (this.musicTimer === null) return;
    window.clearInterval(this.musicTimer);
    this.musicTimer = null;
  }
}
