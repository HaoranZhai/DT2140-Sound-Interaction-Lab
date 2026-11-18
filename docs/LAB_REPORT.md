# DT2140 Lab 2 — Design report

## Implementation boundary

The implementation deliberately follows the KTH starter frontend. The supplied
p5.js sketch handles sensor sampling and basic gesture callbacks; the student
code only connects those callbacks to the supplied Faust/WebAssembly models.

## Mappings

| # | Phone action | Sound | Motivation |
| --- | --- | --- | --- |
| 1 | Shake the phone | English church bells | Shaking resembles operating a handbell, so a discrete shake should create a discrete bell strike. |
| 2 | Detect a very large movement | Thunder | A forceful movement fits the sudden energy of a storm; the movement threshold rejects small hand motion. |
| 3 | Roll/tilt the phone side to side | Brass instrument | Tilt is a continuous control, analogous to applying more or less air pressure to a wind instrument. |
| 4 | Phone points straight up and holds the pose | Sci-fi photon torpedo | A stable upward pose represents aiming a launcher; one trigger fires, and lowering the phone rearms it. |

The lab requires at least three approved connections; these are the three
implemented pages; the fourth mapping is optional in the assignment.

## Code locations

- `index.html` + `interaction-1.js`: shake → `/englishBell/gate`;
- `sound2.html` + `interaction-2.js`: movement → `/thunder/rumble`;
- `sound3.html` + `interaction-3.js`: roll angle → `/brass/blower/pressure`;
- `sound4.html` + `interaction-4.js`: upward pose → `/torpedo/trigger`;
- `sketch.js`, `helpers.js`, `styles.css`, and `dsp.js`: supplied starter frontend/runtime.

The continuous pressure mapping uses a calibrated and smoothed roll delta. The
parameter range is taken from the Faust metadata and is clamped before sending
values to the DSP node. Trigger controls are pulsed briefly and audio starts only
after the starter's user-gesture button.

## Limitations and verification

Mouse rehearsal is useful for checking that the Faust nodes load, but it is not a
substitute for a physical-phone test. Final acceptance must be demonstrated to a
lab assistant with the phone, headphones, browser permissions, and the design
rationale above. At the time of writing, assistant approval is not claimed.
