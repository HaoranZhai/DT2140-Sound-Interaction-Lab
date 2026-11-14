import test from 'node:test';
import assert from 'node:assert/strict';
import { renderModel, loadCourseBridge, FakeAudioContext } from '../tools/offline-audio.mjs';
import { LabAudio } from '../js/audio.js';

for (const mode of ['bell', 'wind', 'thunder', 'torpedo']) {
  test(`real Faust ${mode} produces finite, non-silent stereo audio`, async () => {
    const result = await renderModel(mode);
    assert.ok(result.peak > 1e-5);
    assert.ok(result.rms > 1e-6);
    assert.equal(result.channels, 2);
  });
}

test('missing WASM fails explicitly', async () => {
  const Bridge = await loadCourseBridge();
  await assert.rejects(new Bridge('audio/does-not-exist').createDSP(new FakeAudioContext(), 1024), /HTTP 404/);
});

test('adapter starts only on request, bounds gain, switches and stops without retained gates', async () => {
  globalThis.AudioContext = FakeAudioContext;
  globalThis.FaustWasm2ScriptProcessor = await loadCourseBridge();
  const audio = new LabAudio();
  assert.equal(audio.context, null);
  assert.equal(audio.trigger('bell', 1), false);
  const started = audio.start();
  assert.equal(audio.context.resumes, 1, 'resume occurs before asynchronous WASM loading');
  assert.equal(await started, true);
  assert.equal(audio.ready, true);
  assert.equal(audio.trigger('bell', 100), true);
  assert.equal(audio.nodes.bell.getParamValue('/churchBell/gain'), 1);
  audio.setMode('wind');
  assert.equal(audio.nodes.bell.getParamValue('/churchBell/gate'), 0);
  assert.equal(audio.nodes.bell.connections.length, 0);
  assert.equal(audio.nodes.wind.connections.length, 1);
  assert.equal(audio.timers.size, 0);
  audio.setWind(100);
  assert.ok(audio.nodes.wind.getParamValue('/wind/wind/force') < 0.8);
  audio.setWind(25);
  assert.ok(audio.nodes.wind.getParamValue('/wind/wind/force') > 0.5);
  audio.setVolume(Infinity);
  assert.equal(audio.master.gain.value, 0);
  audio.setVolume(100);
  assert.equal(audio.master.gain.value, 0.4);
  assert.ok([...audio.limiter.curve].every(value => Math.abs(value) <= 1));
  audio.setMode('torpedo');
  assert.equal(audio.nodes.wind.getParamValue('/wind/wind/force'), 0);
  assert.equal(audio.trigger('bell'), false);
  assert.equal(audio.trigger('torpedo'), true);
  await audio.stop();
  assert.equal(audio.nodes.torpedo.getParamValue('/torpedo/trigger'), 0);
  assert.equal(audio.context.state, 'suspended');
  assert.equal(audio.master.gain.value, 0);
  assert.equal(audio.timers.size, 0);
  assert.equal(audio.trigger('torpedo'), false);
  assert.equal(await audio.start(), true);
  assert.equal(audio.mode, 'torpedo');
  await audio.stop();
});

test('Stop during loading prevents a late start from enabling audio', async () => {
  globalThis.AudioContext = FakeAudioContext;
  globalThis.FaustWasm2ScriptProcessor = await loadCourseBridge();
  const audio = new LabAudio();
  const start = audio.start();
  await audio.stop();
  assert.equal(await start, false);
  assert.equal(audio.running, false);
  assert.equal(audio.master.gain.value, 0);
  assert.ok(Object.values(audio.nodes).every(node => node.connections.length === 0));
});
