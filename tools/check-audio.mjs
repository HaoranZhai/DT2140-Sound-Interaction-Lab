import { writeFile } from 'node:fs/promises';
import { renderModel } from './offline-audio.mjs';
const results = [];
for (const mode of ['bell', 'wind', 'thunder', 'torpedo']) {
  const result = await renderModel(mode);
  if (!(result.rms > 1e-6)) throw new Error(`${mode}: unexpectedly silent`);
  results.push(result);
  console.log(`${mode}: finite, peak=${result.peak.toFixed(5)}, RMS=${result.rms.toFixed(5)}`);
}
await writeFile(new URL('../audio/validation.json', import.meta.url), JSON.stringify({ method: 'Node offline execution of compiled Faust WASM through the course DSP bridge; no physical phone or listening verification implied.', results }, null, 2) + '\n');
