# DT2140 Lab 2: Sound and Gestures in Interaction

**Participant:** Haoran Zhai  
**Partner:** None; working individually.

A smartphone instrument with four gesture-to-sound connections. It uses real device sensors and four course-provided Faust models compiled to WebAssembly. The sounds are synthesized in the browser.

- [Own GitHub repository](https://github.com/HaoranZhai/DT2140-Sound-Interaction-Lab) - fork created.
- [GitHub Pages demonstration](https://haoranzhai.github.io/DT2140-Sound-Interaction-Lab/) - deployment verification pending.
- [English lab report](docs/LAB_REPORT.md) · [中文演示指南](docs/DEMO_GUIDE_ZH.md) · [Canvas submission text](docs/CANVAS_SUBMISSION.txt)

## Use on a phone

Open the HTTPS demonstration link after publication. No installation, runtime compiler, account, or external CDN is needed; the app serves its scripts and compiled audio assets from the same site.

1. Connect headphones and begin with low system volume.
2. Tap **Enable sensors** and grant motion/orientation access when prompted. Check **Motion** and **Orientation** separately; each should report incoming data for its relevant modes.
3. Tap **Start audio**, then choose a mapping. Use **Stop audio** to stop playback.
4. For **Tilt**, hold the phone flat in your hand and tap **Calibrate level** before tilting it.

| Mode | Action | Sound and interaction |
| --- | --- | --- |
| Shake | Deliberately shake the phone back and forth. | Alternating acceleration peaks trigger bell strikes, like a virtual handbell. |
| Tilt | Hold the phone flat and tilt it from side to side. | Tilt magnitude continuously controls wind force; returning to center reduces it. |
| Large motion | Make one strong, controlled movement while holding the phone. | High acceleration triggers thunder; small movements are ignored. |
| Point up | Point the phone's top edge toward the ceiling and hold briefly. | A stable upward pose triggers one photon torpedo; lowering the phone rearms it. |

The **Run gesture demo (synthetic)** control exercises each mapping on a desktop. Synthetic input is labelled and does not replace a real phone trial. The large-movement detector measures acceleration, not travel distance; a slow movement over a large distance can remain silent.

Motion APIs require a suitable secure context and browser permission. Use HTTPS on the phone. A plain HTTP address on the laptop's local network may display the page without delivering sensor events. If access is denied, restore the site's motion permission in the browser and reopen it. Keep the page visible during the demonstration.

## Run locally

With Node.js installed, run from this repository:

```sh
npm run serve
```

Or, without invoking npm:

```sh
node tools/serve.mjs
```

Open the address printed by the server. The checked-in application and WASM assets require no package installation for local playback. Serve the directory over HTTP rather than opening `index.html` through `file://`, so the browser can load WASM correctly.

## Verify and rebuild

The automated software tests use Node's built-in test runner:

```sh
npm test
node tools/check-audio.mjs
```

Current software checks cover **17 gesture tests and 7 audio tests**. The gesture checks cover positive/negative inputs, thresholds, cooldowns, calibration, missing data, and angle handling. The audio checks cover loading, playback lifecycle, parameter clamping, switching modes, stopping, and missing-asset failure.

The offline audio check executes all four actual Faust WASM models through the course DSP bridge. Each produces finite, nonzero stereo samples. Numerical results are saved in [audio/validation.json](audio/validation.json). These checks do not establish physical sensor behavior or subjective listening quality.

To regenerate the audio assets from the course DSP sources:

```sh
npm ci
npm run build:audio
node tools/check-audio.mjs
npm test
```

The development compiler is pinned to **`@grame/faustwasm@0.20.2`**. [audio/build-manifest.json](audio/build-manifest.json) records compiler details, source hashes, and generated asset hashes. Rebuilding needs the development dependency; using the published app does not. See [audio implementation notes](docs/AUDIO_IMPLEMENTATION.md) for model controls and verification details.

## Files and provenance

| Location | Purpose |
| --- | --- |
| `index.html`, `styles.css`, `js/` | Interface, sensor handling, gesture processing, and audio control. |
| `faust-dsp/` | Original course sound-model sources and their notices. |
| `audio/` | Compiled WASM, parameter metadata, build manifest, and numerical validation. |
| `tests/`, `tools/` | Automated checks, offline rendering, build script, and local server. |
| `docs/` | Mapping rationales, Chinese demonstration guide, and submission text. |

This project is based on the [DT2140 course starter](https://github.com/smc-kth/DT2140-Sound-Interaction-Lab). The original repository [license](LICENSE) and sound-source authorship notices are retained. The four sound models are ChurchBell, Wind, Thunder, and Sci-Fi Torpedo; they are course-provided synthesis models rather than recordings created for this submission.

## Remaining examination steps

The implementation and software checks are documented, but physical-phone verification and laboratory-assistant approval have not yet been recorded. Test all four mappings and their negative controls on the phone used for the lab, record the device/browser details, and demonstrate the work to an assistant. At least three connections must be approved to pass. No separate partner or individual-work approval is claimed.
