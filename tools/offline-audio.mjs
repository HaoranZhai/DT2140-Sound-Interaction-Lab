import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);

export async function loadCourseBridge() {
  const sandbox = {
    WebAssembly, Math, Number, Float32Array, Int32Array, Uint8Array,
    console: { log() {}, error() {} },
    fetch: async url => {
      try {
        const bytes = await readFile(fileURLToPath(new URL(url, root)));
        return { ok: true, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
      } catch {
        return { ok: false, status: 404 };
      }
    },
  };
  vm.runInNewContext(await readFile(new URL('dsp.js', root), 'utf8') + '\nglobalThis.Bridge = FaustWasm2ScriptProcessor;', sandbox);
  return sandbox.Bridge;
}

export class FakeAudioContext {
  constructor() { this.sampleRate = 48000; this.state = 'suspended'; this.currentTime = 0; this.destination = {}; this.resumes = 0; }
  node(extra = {}) {
    return Object.assign({ connections: [], connect(target) { this.connections.push(target); }, disconnect() { this.connections = []; } }, extra);
  }
  param() { return { value: 0, setTargetAtTime(value) { this.value = value; }, cancelScheduledValues() {} }; }
  createScriptProcessor() { return this.node(); }
  createGain() { return this.node({ gain: this.param() }); }
  createDynamicsCompressor() { return this.node(Object.fromEntries(['threshold', 'knee', 'ratio', 'attack', 'release'].map(k => [k, this.param()]))); }
  createWaveShaper() { return this.node(); }
  resume() { this.resumes++; this.state = 'running'; return Promise.resolve(); }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
}

export async function renderModel(mode) {
  const Bridge = await loadCourseBridge();
  const context = new FakeAudioContext();
  const node = await new Bridge(new URL(`audio/${mode}`, root).href).createDSP(context, 1024);
  const parameters = node.getParams();
  const gate = parameters.find(p => /\/(gate|rumble|trigger)$/.test(p));
  if (gate) node.setParamValue(gate, 1);
  if (mode === 'wind') node.setParamValue('/wind/wind/force', 0.65);
  const buffers = [new Float32Array(1024), new Float32Array(1024)];
  let peak = 0, energy = 0, samples = 0;
  for (let block = 0; block < 150; block++) {
    if (gate && block === 6) node.setParamValue(gate, 0);
    node.compute({ outputBuffer: { getChannelData: channel => buffers[channel] } });
    for (const buffer of buffers) for (const sample of buffer) {
      if (!Number.isFinite(sample)) throw new Error(`${mode}: non-finite audio`);
      peak = Math.max(peak, Math.abs(sample));
      energy += sample * sample;
      samples++;
    }
  }
  return { mode, sampleRate: 48000, durationSeconds: 3.2, channels: 2, peak, rms: Math.sqrt(energy / samples), finite: true, parameters };
}
