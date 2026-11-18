# Audio implementation

The lab uses the Faust Web Audio bridge supplied by the starter repository.
Each starter page loads `dsp.js`, creates one `FaustWasm2ScriptProcessor`, and
connects it to the browser audio destination after the user presses **Turn On DSP**.

| Page | WASM | Faust control | Gesture callback |
| --- | --- | --- | --- |
| `index.html` | `bells.wasm` | `/englishBell/gate` | `deviceShaken()` |
| `sound2.html` | `tuono.wasm` | `/thunder/rumble` | `deviceMoved()` |
| `sound3.html` | `brass.wasm` | `/brass/blower/pressure` | `rotationChange()` |

The three `interaction-*.js` files are the only student interaction layer. The
gesture recognition itself is provided by the p5.js starter sketch: it supplies
acceleration, rotation, shake and movement callbacks. We only map those callbacks
to Faust parameters and clamp the continuous brass pressure to `[0, 1]`.

The sound models are the Faust examples and compiled WebAssembly files included
with the KTH starter repository. No recordings or external gesture-recognition
library are used.
