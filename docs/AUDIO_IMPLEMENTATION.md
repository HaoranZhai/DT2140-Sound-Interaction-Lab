# Faust audio implementation

The application synthesizes sound in real time from four **unmodified sound models in the course repository**. It does not substitute recordings or JavaScript oscillator approximations for Faust.

| Mode | Course source | Browser asset | Main control |
| --- | --- | --- | --- |
| bell | `faust-dsp/Bells/churchBell.dsp` | `audio/bell.wasm` | `/churchBell/gate` |
| wind | `faust-dsp/Nature/wind.dsp` | `audio/wind.wasm` | `/wind/wind/force` |
| thunder | `faust-dsp/Nature/thunder.dsp` | `audio/thunder.wasm` | `/thunder/rumble` |
| torpedo | `faust-dsp/Sci-Fi/torpedo.dsp` | `audio/torpedo.wasm` | `/torpedo/trigger` |

Compilation uses the official `@grame/faustwasm@0.20.2` package, whose bundled compiler reports Faust 2.90.19, with `-ftz 2`. `audio/build-manifest.json` records the compiler, source paths, LF-normalized source hashes and generated WASM hashes. Model authorship and library license metadata remain embedded in the generated JSON files. The original course sources and repository license are retained.

## Rebuild

From the repository root with Node.js installed:

```sh
npm install
node tools/build-audio.mjs
node tools/check-audio.mjs
node --test tests/audio.test.mjs
```

An unpacked compiler package can alternatively be selected with the environment variable `FAUST_PACKAGE_PATH`. The compiler is a development dependency only: opening the published app downloads the small precompiled WASM files from the same site, with no runtime compiler or CDN dependency.

## Runtime

`dsp.js` retains the course's `FaustWasm2ScriptProcessor` bridge. Its loader now fails explicitly on a missing asset or invalid DSP. This bridge uses the older ScriptProcessor API; at 48 kHz, its 1024-frame buffer is approximately 21.3 ms, in addition to device and browser latency. Mobile browser performance still needs a physical-device check.

`js/audio.js` creates/resumes the audio context only when `start()` is called directly from a user gesture. A mode connects only its selected processor, and switching modes clears previous triggers, delay state and wind force. Stopping cancels pending pulses, disconnects processors and suspends audio; a stop during loading cannot be undone by a late load completion.

All controls reject non-finite values and clamp to their declared ranges. Output passes through a compressor and soft-clipping stage followed by a master gain capped at 0.4. Default master setting is 45% of that range. Start with low headphone volume and adjust for the physical device.

## Verification scope

`tools/check-audio.mjs` runs each real WASM processor through the actual course bridge using an offline audio-context stub. It computes 3.2 seconds of stereo samples at 48 kHz, rejects NaN/Infinity and verifies non-silent output; the numerical results are stored in `audio/validation.json`. Raw bell output can exceed amplitude 1 before the app's compressor and soft limiter, which is why output conditioning is included.

The Node tests also exercise startup order, missing-asset errors, range clamping, mode switching, stop/resume and stopping while models load. These are software checks, not a claim that a phone, browser loudspeaker or headphones have been physically tested. Browser rendering, motion-permission behavior and subjective sound quality require the final device demonstration.

Official compiler reference: <https://github.com/grame-cncm/faustwasm>.
