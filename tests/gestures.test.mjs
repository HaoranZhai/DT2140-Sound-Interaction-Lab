import test from 'node:test';
import assert from 'node:assert/strict';
import {GestureEngine, THRESHOLDS as T} from '../js/gestures.js';

const motion = (engine, t, x = 0, y = 0, z = 0) =>
  engine.updateMotion({acceleration: {x, y, z}}, t);
const pose = (engine, t, beta = 0, gamma = 0) =>
  engine.updateOrientation({alpha: 0, beta, gamma}, t);
const hold = (engine, start, end, beta, gamma = 0, step = 20) => {
  const events = [];
  for (let t = start; t <= end; t += step) events.push(...pose(engine, t, beta, gamma).events);
  return events;
};
const shakePeak = (engine, t, x) => {
  motion(engine, t - 20, 0);
  return motion(engine, t, x).events;
};

test('missing/null/non-finite sensors cannot synthesize movement or upward dwell', () => {
  for (const mode of ['bell', 'thunder', 'torpedo', 'wind']) {
    const engine = new GestureEngine(mode);
    for (let t = 0; t < 2000; t += 20) {
      assert.deepEqual(engine.updateMotion({acceleration: {x: null, y: null, z: null}}, t).events, []);
      const result = engine.updateOrientation({alpha: 0, beta: null, gamma: NaN}, t);
      assert.equal(result.wind, 0);
      assert.deepEqual(result.events, []);
      assert.equal(result.metrics.orientationValid, false);
    }
    assert.equal(engine.calibrate(), false);
  }
});

test('bell requires alternating peaks, not a spike or repeated pushes', () => {
  const engine = new GestureEngine('bell');
  for (const t of [100, 250, 400, 550]) assert.deepEqual(shakePeak(engine, t, 12), []);
  engine.reset();
  assert.deepEqual(shakePeak(engine, 100, 12), []);
  const event = shakePeak(engine, 250, -12);
  assert.equal(event[0].type, 'bell');
  assert.ok(event[0].intensity > 0 && event[0].intensity <= 1);
  assert.deepEqual(engine.snapshot.events, []);
  assert.deepEqual(motion(engine, 420, 12).events, []);
});

test('bell rejects slow isolated alternation and subthreshold small motion', () => {
  const engine = new GestureEngine('bell');
  for (let i = 0; i < 5; i++) {
    assert.deepEqual(shakePeak(engine, 100 + i * 900, i % 2 ? 12 : -12), []);
  }
  engine.reset();
  for (let i = 1; i < 20; i++) assert.deepEqual(shakePeak(engine, i * 100, i % 2 ? 2 : -2), []);
});

test('bell can retrigger on a continuous shake after cooldown', () => {
  const engine = new GestureEngine('bell');
  assert.deepEqual(shakePeak(engine, 100, 10), []);
  assert.equal(shakePeak(engine, 220, -10)[0].type, 'bell');
  assert.deepEqual(shakePeak(engine, 400, 10), []); // cooldown still active
  assert.equal(shakePeak(engine, 560, -10)[0].type, 'bell');
});

test('thunder needs large motion dwell and quiet rearm, with cooldown', () => {
  const engine = new GestureEngine('thunder');
  for (let t = 0; t < 300; t += 20) assert.deepEqual(motion(engine, t, 8).events, []);
  assert.deepEqual(motion(engine, 300, 20).events, []);
  assert.deepEqual(motion(engine, 320, 20).events, []);
  assert.equal(motion(engine, 340, 20).events[0].type, 'thunder');
  for (let t = 360; t <= 2000; t += 20) assert.deepEqual(motion(engine, t, 20).events, []);
  for (let t = 2020; t <= 2180; t += 20) motion(engine, t, 0);
  motion(engine, 2200, 20);
  motion(engine, 2220, 20);
  assert.equal(motion(engine, 2240, 20).events[0].type, 'thunder');
});

test('a one-sample acceleration spike cannot trigger thunder', () => {
  const engine = new GestureEngine('thunder');
  motion(engine, 0, 0);
  assert.deepEqual(motion(engine, 20, 50).events, []);
  assert.deepEqual(motion(engine, 40, 0).events, []);
  assert.deepEqual(motion(engine, 60, 0).events, []);
});

test('gravity fallback initializes silently and removes static gravity', () => {
  const engine = new GestureEngine('thunder');
  for (let t = 0; t <= 1000; t += 20) {
    const result = engine.updateMotion({accelerationIncludingGravity: {x: 0, y: 0, z: 9.81}}, t);
    assert.deepEqual(result.events, []);
    assert.equal(result.metrics.accelerationMagnitude, 0);
  }
  assert.equal(engine.snapshot.metrics.accelerationSource, 'estimated-linear');
  assert.equal(engine.snapshot.metrics.motionValid, true);
});

test('gravity fallback can detect an alternating shake after warmup', () => {
  const engine = new GestureEngine('bell');
  const fallback = (t, x) => engine.updateMotion({accelerationIncludingGravity: {x, y: 0, z: 9.81}}, t);
  for (let t = 0; t <= 1000; t += 20) fallback(t, 0);
  fallback(1100, 12); fallback(1140, 0);
  assert.equal(fallback(1250, -12).events[0].type, 'bell');
});

test('tilt is symmetric, smoothed, calibrated, and silent in its dead zone', () => {
  const engine = new GestureEngine('wind');
  pose(engine, 0, 0, 0);
  assert.equal(engine.calibrate(), true);
  hold(engine, 20, 500, 0, 5);
  assert.equal(engine.snapshot.wind, 0);
  hold(engine, 520, 1500, 0, 70);
  assert.ok(engine.snapshot.wind > 0.99);
  assert.equal(Math.abs(engine.snapshot.metrics.relativeRoll), 70);
  hold(engine, 1520, 2500, 0, -70);
  assert.ok(engine.snapshot.wind > 0.99);
  hold(engine, 2520, 3500, 0, 0);
  assert.ok(engine.snapshot.wind < 0.001);
});

test('tilt calibration and relative angles handle the -180/180 wrap', () => {
  const engine = new GestureEngine('wind');
  pose(engine, 0, 180, -1); // roll +179 degrees, phone face down
  engine.calibrate();
  pose(engine, 20, 180, 1); // roll -179 degrees
  assert.ok(Math.abs(engine.snapshot.metrics.relativeRoll) <= 2.00001);
  assert.equal(engine.snapshot.wind, 0);
});

test('vertical phone does not produce unstable side-to-side tilt', () => {
  const engine = new GestureEngine('wind');
  hold(engine, 0, 1000, 90, 80);
  assert.equal(engine.snapshot.wind, 0);
  assert.equal(engine.snapshot.metrics.rollStable, false);
  assert.equal(engine.calibrate(), false);
});

test('top edge up requires dwell; flat, upside-down and short passes do not fire', () => {
  const engine = new GestureEngine('torpedo');
  assert.deepEqual(hold(engine, 0, 1000, 0), []);
  assert.deepEqual(hold(engine, 1020, 2020, -90), []);
  assert.deepEqual(hold(engine, 2040, 2240, 90), []);
  pose(engine, 2260, 0);
  const events = hold(engine, 2280, 2800, 90);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'torpedo');
  assert.deepEqual(hold(engine, 2820, 5000, 90), []);
});

test('top-edge alignment permits gamma twist and heading changes', () => {
  const engine = new GestureEngine('torpedo');
  const events = hold(engine, 0, 500, 90, 80);
  assert.equal(events.length, 1);
  assert.ok(engine.snapshot.metrics.upAngle < 0.00001);
  assert.deepEqual(engine.updateOrientation({alpha: 359, beta: 90, gamma: -80}, 520).events, []);
});

test('torpedo hysteresis requires leaving the cone before another shot', () => {
  const engine = new GestureEngine('torpedo');
  assert.equal(hold(engine, 0, 500, 90).length, 1);
  assert.deepEqual(hold(engine, 520, 2000, 65), []); // 25°, inside rearm boundary
  assert.deepEqual(hold(engine, 2020, 2600, 90), []);
  pose(engine, 2620, 50); // 40°, rearm
  assert.equal(hold(engine, 2640, 3100, 90).length, 1);
});

test('missing data or a long gap cannot finish an old upward dwell', () => {
  const engine = new GestureEngine('torpedo');
  hold(engine, 0, 300, 90);
  engine.updateOrientation({beta: null, gamma: null}, 320);
  assert.deepEqual(hold(engine, 340, 600, 90), []);
  assert.deepEqual(pose(engine, 3000, 90).events, []);
  assert.equal(hold(engine, 3020, 3400, 90).length, 1);
});

test('sample-rate-independent upward dwell works at 20 and 100 Hz', () => {
  for (const step of [10, 50]) {
    const engine = new GestureEngine('torpedo');
    assert.equal(hold(engine, 0, 1000, 90, 0, step).length, 1);
  }
});

test('mode switching cancels pending gestures and reset clears calibration', () => {
  const engine = new GestureEngine('torpedo');
  hold(engine, 0, 300, 90);
  engine.setMode('bell');
  assert.deepEqual(hold(engine, 320, 1000, 90), []);
  engine.setMode('wind');
  pose(engine, 1020, 0, 20);
  engine.calibrate();
  engine.reset();
  assert.equal(engine.snapshot.metrics.calibrated, false);
  assert.equal(engine.snapshot.metrics.orientationValid, false);
  assert.equal(engine.snapshot.wind, 0);
  assert.throws(() => engine.setMode('unknown'), RangeError);
});

test('nonmonotonic timestamps and mutated snapshots do not affect internal state', () => {
  const engine = new GestureEngine('wind');
  pose(engine, 100, 0, 0);
  pose(engine, 99, 90, 80);
  assert.equal(engine.snapshot.metrics.roll, 0);
  const snapshot = engine.snapshot;
  snapshot.metrics.linearAcceleration.x = 999;
  assert.equal(engine.snapshot.metrics.linearAcceleration.x, 0);
  assert.ok(Object.isFrozen(T));
});
