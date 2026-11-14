// Real Faust synthesis from the unmodified course DSP models. The course's
// ScriptProcessor bridge is retained for compatibility; no remote runtime/CDN.
const MODES = ['bell', 'wind', 'thunder', 'torpedo'];
const finiteClamp = (v, min = 0, max = 1) => Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : min;
const PATHS = {
  bell: { gate: '/churchBell/gate', volume: '/churchBell/gain' },
  wind: { force: '/wind/wind/force', volume: '/wind/volume' },
  thunder: { gate: '/thunder/rumble', volume: '/thunder/bubble/volume' },
  torpedo: { gate: '/torpedo/trigger', volume: '/torpedo/volume' },
};

export class LabAudio {
  constructor() {
    this.context = null;
    this.nodes = {};
    this.mode = 'bell';
    this.volume = 0.45;
    this.running = false;
    this.ready = false;
    this.startPromise = null;
    this.timers = new Map();
    this.session = 0;
  }

  // Invoke directly inside a click/touch handler: resume happens before any await.
  async start() {
    const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContextClass) throw new Error('Web Audio is unavailable in this browser.');
    if (!this.context) {
      this.context = new AudioContextClass({ latencyHint: 'interactive' });
      this.master = this.context.createGain();
      this.master.gain.value = 0;
      this.compressor = this.context.createDynamicsCompressor();
      this.compressor.threshold.value = -18;
      this.compressor.knee.value = 12;
      this.compressor.ratio.value = 8;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.2;
      // Soft clipping bounds the signal before the master gain (maximum 0.4).
      this.limiter = this.context.createWaveShaper();
      this.limiter.curve = Float32Array.from({ length: 2049 }, (_, i) => Math.tanh(1.2 * (i / 1024 - 1)));
      this.limiter.oversample = '2x';
      this.compressor.connect(this.limiter);
      this.limiter.connect(this.master);
      this.master.connect(this.context.destination);
    }
    const resumed = this.context.resume();
    const session = this.session;
    if (!this.startPromise) this.startPromise = this.loadNodes().finally(() => { this.startPromise = null; });
    await Promise.all([resumed, this.startPromise]);
    if (session !== this.session) return false;
    this.running = true;
    this.setMode(this.mode);
    this.setVolume(this.volume);
    return true;
  }

  async loadNodes() {
    if (this.ready) return;
    if (typeof FaustWasm2ScriptProcessor === 'undefined') throw new Error('The Faust bridge did not load (dsp.js).');
    try {
      for (const mode of MODES) {
        const url = new URL(`../audio/${mode}`, import.meta.url).href;
        const node = await new FaustWasm2ScriptProcessor(url).createDSP(this.context, 1024);
        this.nodes[mode] = node;
        for (const path of Object.values(PATHS[mode])) {
          if (!node.getParams().includes(path)) throw new Error(`Missing Faust parameter: ${path}`);
        }
        this.clearNode(mode);
      }
      this.ready = true;
    } catch (error) {
      for (const node of Object.values(this.nodes)) node.disconnect();
      this.nodes = {};
      throw error;
    }
  }

  clearNode(mode) {
    clearTimeout(this.timers.get(mode));
    this.timers.delete(mode);
    const node = this.nodes[mode];
    if (!node) return;
    if (PATHS[mode].gate) node.setParamValue(PATHS[mode].gate, 0);
    if (mode === 'wind') node.setParamValue(PATHS.wind.force, 0);
    node.instanceClear();
  }

  setMode(mode) {
    if (!MODES.includes(mode)) throw new Error(`Unknown audio mode: ${mode}`);
    this.mode = mode;
    if (!this.ready) return;
    for (const name of MODES) {
      this.nodes[name].disconnect();
      this.clearNode(name);
    }
    if (this.running) this.nodes[mode].connect(this.compressor);
  }

  setVolume(value) {
    this.volume = finiteClamp(value);
    if (this.master) this.master.gain.setTargetAtTime(this.running ? this.volume * 0.4 : 0, this.context.currentTime, 0.025);
  }

  setWind(force) {
    if (!this.ready || !this.running || this.mode !== 'wind') return;
    const f = finiteClamp(force);
    // The supplied physical wind model is very quiet at low force because its
    // noise amplitude is multiplied by force. Use a gentle perceptual lift so
    // 10-50% gestures remain audible while preserving a true zero at rest.
    const audibleForce = f === 0 ? 0 : 0.12 + 0.88 * Math.pow(f, 0.55);
    this.nodes.wind.setParamValue(PATHS.wind.force, audibleForce);
    this.nodes.wind.setParamValue(PATHS.wind.volume, 1);
  }

  trigger(type, intensity = 0.7) {
    if (!this.ready || !this.running || this.mode !== type || !PATHS[type]?.gate) return false;
    const node = this.nodes[type];
    const i = finiteClamp(intensity);
    const gain = type === 'bell' ? 0.8 + 0.2 * i : type === 'thunder' ? 0.3 + 0.4 * i : 0.55;
    node.setParamValue(PATHS[type].volume, gain);
    clearTimeout(this.timers.get(type));
    node.setParamValue(PATHS[type].gate, 1);
    this.timers.set(type, setTimeout(() => {
      node.setParamValue(PATHS[type].gate, 0);
      this.timers.delete(type);
    }, type === 'bell' ? 220 : type === 'torpedo' ? 140 : 100));
    return true;
  }

  async stop() {
    this.session += 1;
    this.running = false;
    for (const name of MODES) {
      this.clearNode(name);
      this.nodes[name]?.disconnect();
    }
    if (this.master) {
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.value = 0;
    }
    if (this.context && this.context.state !== 'closed') await this.context.suspend();
  }
}
