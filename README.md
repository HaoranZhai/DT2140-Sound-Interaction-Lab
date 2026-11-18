# DT2140 Lab 2: Sound and Gestures in Interaction

Participant: **Haoran Zhai**  
Partner: **None; working individually**

This repository keeps the KTH starter frontend: `index.html`, `sound2.html`,
`sound3.html`, `sketch.js`, `helpers.js`, `styles.css`, and `dsp.js`. A fourth
page, `sound4.html`, uses the same template for the optional point-up mapping.

## Connections

1. Shake the phone → English church bells (`bells.wasm`). The starter sketch's
   shake callback opens the Faust bell gate, matching the familiar action of a handbell.
2. Make a large movement → Thunder (`tuono.wasm`). The p5 movement threshold is
   used to ignore small movements and trigger a short thunder rumble for a strong gesture.
3. Tilt/roll the phone → Brass (`brass.wasm`). The roll angle is continuously mapped
   to `/brass/blower/pressure` in the range 0–1, so more tilt produces more air pressure.
4. Point the phone straight up → Sci-fi torpedo (`torpedo.wasm`). Holding the upward
   pose for 350 ms fires once; lowering the phone rearms the trigger.

The first three connections satisfy the lab requirement of at least three approved
connections; the fourth is optional. No external gesture-recognition library is used.

## Run

Serve the repository over HTTP/HTTPS so the browser can load WebAssembly:

```sh
npx serve .
```

Open `index.html`, `sound2.html`, `sound3.html`, or `sound4.html`. Press **Turn On DSP** first.
On iOS, press **Request Permission** and allow motion access. The starter UI also
provides desktop mouse rehearsal through `mousePressed()`.

Use headphones and start at a low volume. Physical-phone verification and
laboratory-assistant approval still need to be demonstrated during the lab.

## Source and submission

- GitHub: https://github.com/HaoranZhai/DT2140-Sound-Interaction-Lab
- GitHub Pages: https://haoranzhai.github.io/DT2140-Sound-Interaction-Lab/
- Canvas text: `docs/CANVAS_SUBMISSION.txt`
- Design report: `docs/LAB_REPORT.md`

The repository is based on the course starter by Maurizio Berta and Laura McHugh.
Sound models are Faust examples associated with *Designing Sound* and are used
through the provided `dsp.js` Web Audio bridge.
