/**
 * Pure, time-based sensor interpretation. Input units: m/s², degrees, milliseconds.
 * Desktop tests feed synthetic samples; they do not certify a physical phone.
 * Coordinates use the W3C DeviceOrientation Z-X'-Y'' convention, portrait device
 * axes (not screen axes). The top edge points along device +Y.
 */
export const THRESHOLDS = Object.freeze({
  staleMs: 500,
  gravityTimeConstantMs: 800,
  gravityWarmupMs: 750,
  shakeOn: 5,
  shakeOff: 3,
  shakeMinPeakIntervalMs: 50,
  shakeWindowMs: 900,
  shakeCooldownMs: 220,
  shakeRequiredPeaks: 2,
  thunderOn: 16,
  thunderOff: 7,
  thunderDwellMs: 40,
  thunderRearmMs: 120,
  thunderCooldownMs: 1400,
  tiltDeadZoneDegrees: 8,
  tiltFullScaleDegrees: 70,
  tiltSmoothingMs: 120,
  upEnterDegrees: 20,
  upExitDegrees: 35,
  upDwellMs: 350,
  upCooldownMs: 1200,
});

const MODES = new Set(['bell', 'wind', 'thunder', 'torpedo']);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const wrap = value => ((value + 180) % 360 + 360) % 360 - 180;
const radians = degrees => degrees * Math.PI / 180;
const finiteVector = vector => vector != null &&
  ['x', 'y', 'z'].every(axis => Number.isFinite(vector[axis]));
const norm = vector => Math.hypot(vector.x, vector.y, vector.z);
const copyVector = vector => ({x: vector.x, y: vector.y, z: vector.z});

export class GestureEngine {
  constructor(mode = 'bell') {
    if (!MODES.has(mode)) throw new RangeError(`Unknown gesture mode: ${mode}`);
    this.mode = mode;
    this.reset();
  }

  /** Reset all sensor history, including calibration. Keeps the chosen mode. */
  reset() {
    this.motionTime = null;
    this.orientationTime = null;
    this.gravity = null;
    this.gravitySince = null;
    this.rollZero = 0;
    this.wind = 0;
    this.metrics = {
      accelerationMagnitude: 0, accelerationSource: 'unavailable',
      linearAcceleration: {x: 0, y: 0, z: 0},
      roll: 0, relativeRoll: 0, upAngle: 90,
      motionValid: false, orientationValid: false, rollStable: false,
      calibrated: false,
    };
    this._resetDetectors();
    return this.snapshot;
  }

  _resetDetectors() {
    this.shakeArmed = true;
    this.shakePeaks = [];
    this.lastBell = -Infinity;
    this.thunderArmed = true;
    this.thunderSince = null;
    this.thunderQuietSince = null;
    this.lastThunder = -Infinity;
    this.upArmed = true;
    this.upSince = null;
    this.lastTorpedo = -Infinity;
  }

  /** Changing mode cancels pending gestures; calibration is retained. */
  setMode(mode) {
    if (!MODES.has(mode)) throw new RangeError(`Unknown gesture mode: ${mode}`);
    this.mode = mode;
    this.wind = 0;
    this._resetDetectors();
    return this.snapshot;
  }

  /** Hold the phone flat in the hand before calibrating the tilt neutral pose. */
  calibrate() {
    if (!this.metrics.orientationValid || !this.metrics.rollStable) return false;
    this.rollZero = this.metrics.roll;
    this.metrics.relativeRoll = 0;
    this.metrics.calibrated = true;
    this.wind = 0;
    return true;
  }

  /** Snapshots never replay a previous event. Events exist only on update returns. */
  get snapshot() { return this._result([]); }

  _result(events) {
    return {
      events,
      wind: this.mode === 'wind' ? this.wind : 0,
      metrics: {
        ...this.metrics,
        linearAcceleration: {...this.metrics.linearAcceleration},
      },
    };
  }

  updateMotion(sample, timeMs) {
    if (!Number.isFinite(timeMs) ||
        (this.motionTime !== null && timeMs <= this.motionTime)) return this.snapshot;
    const dt = this.motionTime === null ? 16 : timeMs - this.motionTime;
    if (dt > THRESHOLDS.staleMs) {
      this.gravity = null;
      this.gravitySince = null;
      this.shakePeaks = [];
      this.shakeArmed = true;
      this.thunderSince = null;
      this.thunderQuietSince = null;
    }
    this.motionTime = timeMs;
    let linear;
    if (finiteVector(sample?.acceleration)) {
      linear = copyVector(sample.acceleration);
      this.metrics.accelerationSource = 'linear';
      // A future fallback starts with a fresh gravity estimate.
      this.gravity = null;
      this.gravitySince = null;
    } else if (finiteVector(sample?.accelerationIncludingGravity)) {
      const total = sample.accelerationIncludingGravity;
      if (!this.gravity) {
        this.gravity = copyVector(total);
        this.gravitySince = timeMs;
      }
      const amount = 1 - Math.exp(-Math.min(dt, 100) / THRESHOLDS.gravityTimeConstantMs);
      for (const axis of ['x', 'y', 'z']) {
        this.gravity[axis] += amount * (total[axis] - this.gravity[axis]);
      }
      linear = {
        x: total.x - this.gravity.x,
        y: total.y - this.gravity.y,
        z: total.z - this.gravity.z,
      };
      this.metrics.accelerationSource = timeMs - this.gravitySince >= THRESHOLDS.gravityWarmupMs
        ? 'estimated-linear' : 'gravity-warmup';
      if (this.metrics.accelerationSource === 'gravity-warmup') linear = null;
    } else {
      this.metrics.accelerationSource = 'unavailable';
      this.gravity = null;
      this.gravitySince = null;
    }
    this.metrics.motionValid = !!linear;
    if (!linear) {
      this.metrics.accelerationMagnitude = 0;
      this.metrics.linearAcceleration = {x: 0, y: 0, z: 0};
      this.shakePeaks = [];
      this.shakeArmed = true;
      this.thunderSince = null;
      this.thunderQuietSince = null;
      return this.snapshot;
    }
    const magnitude = norm(linear);
    this.metrics.linearAcceleration = linear;
    this.metrics.accelerationMagnitude = magnitude;
    const events = [];
    if (this.mode === 'bell') this._shake(linear, magnitude, timeMs, events);
    if (this.mode === 'thunder') this._thunder(magnitude, timeMs, events);
    return this._result(events);
  }

  _shake(vector, magnitude, timeMs, events) {
    this.shakePeaks = this.shakePeaks.filter(peak => timeMs - peak.time <= THRESHOLDS.shakeWindowMs);
    if (magnitude < THRESHOLDS.shakeOff) this.shakeArmed = true;
    if (!this.shakeArmed || magnitude < THRESHOLDS.shakeOn) return;
    this.shakeArmed = false;
    const previous = this.shakePeaks.at(-1);
    if (previous && timeMs - previous.time < THRESHOLDS.shakeMinPeakIntervalMs) return;
    const direction = {x: vector.x / magnitude, y: vector.y / magnitude, z: vector.z / magnitude};
    if (previous) {
      const dot = direction.x * previous.direction.x + direction.y * previous.direction.y +
        direction.z * previous.direction.z;
      // Repeated impulses in one direction are not an alternating shake.
      if (dot > -0.3) this.shakePeaks = [];
    }
    this.shakePeaks.push({time: timeMs, direction});
    if (this.shakePeaks.length >= THRESHOLDS.shakeRequiredPeaks &&
        timeMs - this.lastBell >= THRESHOLDS.shakeCooldownMs) {
      events.push({type: 'bell', intensity: clamp(magnitude / 22, 0.3, 1)});
      this.lastBell = timeMs;
      this.shakePeaks = [this.shakePeaks.at(-1)];
    }
  }

  _thunder(magnitude, timeMs, events) {
    if (magnitude < THRESHOLDS.thunderOff) {
      this.thunderSince = null;
      this.thunderQuietSince ??= timeMs;
      if (timeMs - this.thunderQuietSince >= THRESHOLDS.thunderRearmMs) this.thunderArmed = true;
      return;
    }
    this.thunderQuietSince = null;
    if (magnitude < THRESHOLDS.thunderOn || !this.thunderArmed) {
      this.thunderSince = null;
      return;
    }
    this.thunderSince ??= timeMs;
    if (timeMs - this.thunderSince >= THRESHOLDS.thunderDwellMs &&
        timeMs - this.lastThunder >= THRESHOLDS.thunderCooldownMs) {
      events.push({type: 'thunder', intensity: clamp(magnitude / 32, 0.5, 1)});
      this.lastThunder = timeMs;
      this.thunderArmed = false;
      this.thunderSince = null;
    }
  }

  updateOrientation(sample, timeMs) {
    if (!Number.isFinite(timeMs) ||
        (this.orientationTime !== null && timeMs <= this.orientationTime)) return this.snapshot;
    const dt = this.orientationTime === null ? 16 : timeMs - this.orientationTime;
    const gap = dt > THRESHOLDS.staleMs;
    if (gap) {
      this.upSince = null;
      this.wind = 0;
    }
    this.orientationTime = timeMs;
    if (!Number.isFinite(sample?.beta) || !Number.isFinite(sample?.gamma)) {
      this.metrics.orientationValid = false;
      this.metrics.rollStable = false;
      this.upSince = null;
      this.wind = 0;
      return this.snapshot;
    }
    const beta = radians(wrap(sample.beta));
    const gamma = radians(wrap(sample.gamma));
    // Earth-up vector expressed in device coordinates. Alpha is heading and
    // therefore does not affect vertical alignment. Gamma twists around +Y;
    // requiring gamma ≈ 0 for top-edge-up would reject valid upright poses.
    const up = {
      x: -Math.cos(beta) * Math.sin(gamma),
      y: Math.sin(beta),
      z: Math.cos(beta) * Math.cos(gamma),
    };
    const upAngle = Math.acos(clamp(up.y, -1, 1)) * 180 / Math.PI;
    const rollStable = Math.abs(up.y) < 0.85;
    const roll = wrap(Math.atan2(-up.x, up.z) * 180 / Math.PI);
    const relativeRoll = wrap(roll - this.rollZero);
    Object.assign(this.metrics, {
      orientationValid: true, rollStable, roll, relativeRoll, upAngle,
    });
    const events = [];
    if (this.mode === 'wind') {
      const target = rollStable ? clamp(
        (Math.abs(relativeRoll) - THRESHOLDS.tiltDeadZoneDegrees) /
        (THRESHOLDS.tiltFullScaleDegrees - THRESHOLDS.tiltDeadZoneDegrees), 0, 1,
      ) : 0;
      const amount = 1 - Math.exp(-Math.min(dt, 100) / THRESHOLDS.tiltSmoothingMs);
      this.wind += amount * (target - this.wind);
      if (this.wind < 0.001) this.wind = 0;
    }
    if (this.mode === 'torpedo') {
      if (upAngle >= THRESHOLDS.upExitDegrees) {
        this.upArmed = true;
        this.upSince = null;
      } else if (upAngle <= THRESHOLDS.upEnterDegrees && this.upArmed) {
        this.upSince ??= timeMs;
        if (timeMs - this.upSince >= THRESHOLDS.upDwellMs &&
            timeMs - this.lastTorpedo >= THRESHOLDS.upCooldownMs) {
          events.push({type: 'torpedo', intensity: 1});
          this.lastTorpedo = timeMs;
          this.upArmed = false;
          this.upSince = null;
        }
      } else {
        // Dwell must remain inside the entry cone; hysteresis controls rearm.
        this.upSince = null;
      }
    }
    return this._result(events);
  }
}
