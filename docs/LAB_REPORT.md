# DT2140 Lab 2: Sound and Gestures in Interaction

**Participant:** Haoran Zhai  
**Partner:** None; working individually.  
**Repository and live demonstration:** See the [project README](../README.md) for the final repository and GitHub Pages URLs. Publication is not asserted by this report.

## Purpose

The project connects smartphone movement to four sound models supplied with the course's Faust starter repository. The first three form the required set of connections; the fourth is an additional mapping. Passing the lab still requires a laboratory assistant to approve at least three connections after a demonstration and explanation.

## Connections

| No. | Action from the assignment | Faust sound | Intended interaction |
| --- | --- | --- | --- |
| 1 | The phone is shaken. | Bells | Alternating acceleration peaks identify a deliberate shake and trigger a bell strike. Continued shaking produces a sequence of strikes. |
| 2 | The phone is placed flat in the hand and tilted from side to side. | Wind | Increasing the sideways tilt increases wind force. Returning toward the central position reduces the wind. |
| 3 | The phone is held and used to detect very large movements, but not small ones. | Thunder | A sufficiently strong acceleration impulse triggers thunder; ordinary small movements remain below the activation threshold. |
| 4 | The phone is used to point straight up. | Sci-Fi photon torpedo | Pointing the phone's top edge upward triggers a torpedo. Moving away from that pose prepares the next activation. |

### 1. Shake to bells

**Scenario:** A visitor plays a virtual handbell in an interactive sound exhibit. Shaking resembles the physical action that moves a handbell's clapper, so the sound has an understandable causal relationship to the action. Repeated discrete attacks support rhythmic play.

**Design:** The detector requires two alternating movement-acceleration peaks within a short window, rather than interpreting gravity or a single push as a shake. Trigger timing prevents a single motion from producing an uncontrolled burst of bell attacks. The supplied bell model is synthesized at runtime through Faust/WebAssembly.

**Demonstration:** Hold the phone still, perform a deliberate back-and-forth shake, then repeat the motion. Compare the silent stationary state with the discrete bell events. Very slow repositioning and a single push should not count as deliberate shaking.

### 2. Sideways tilt to wind

**Scenario:** A participant controls a small virtual weather scene. Sideways tilt acts as a continuous control for wind force, allowing a gradual progression from calm conditions to stronger wind. This mapping represents a control metaphor rather than claiming that a real tilted object creates wind.

**Design:** The amount of tilt relative to a calibrated level position controls the provided wind model's force. Left and right tilt have the same force interpretation; the magnitude of the departure from center matters. Smoothing and a central dead zone make the result easier to control despite hand tremor. Audio feedback makes it possible to adjust the effect while looking away from the screen. Near-vertical poses suppress this mapping because the required flat-hand roll becomes ambiguous.

**Demonstration:** Begin with the phone flat in the hand. Tilt left, return to center, and tilt right. Confirm that stronger tilt produces stronger wind and that returning to center reduces it. Keep the motion gradual so that the continuous relationship is clear.

### 3. Large movement to thunder

**Scenario:** A performer conducts a virtual storm. A forceful movement creates a dramatic thunder event, while smaller positioning movements are ignored. The strong action and powerful sound have a shared expressive intensity.

**Design:** A higher acceleration threshold distinguishes the large-movement condition. The detector interprets "large" operationally as high movement acceleration, not as a measured travel distance. A large but extremely slow displacement can therefore remain silent. Rearming and timing controls avoid repeated activation from the same impulse. The mapping is demonstrated separately from shake-to-bells so their similar acceleration inputs remain unambiguous.

**Demonstration:** First make several small movements and verify that none triggers thunder. Then make one firm, controlled motion while keeping hold of the phone. Pause before repeating. Compare the sensor reading with the configured threshold if the phone is unusually sensitive or insensitive.

### 4. Point upward to torpedo

**Scenario:** A player aims a virtual science-fiction launcher upward. Entering the upward aiming pose launches one photon torpedo, giving immediate feedback about the recognized pose.

**Design:** "Pointing up" means the top edge of the phone points toward the ceiling, with the screen approximately vertical. It does not mean placing the screen flat and face up. Pose tolerances and a short dwell time account for imperfect hand alignment and brief accidental crossings. The trigger is an entry event rather than a continuous stream of shots while the pose is held; leaving the pose allows another activation.

**Demonstration:** Start outside the upward pose, raise the top edge toward the ceiling, and hold it briefly. Lower the phone, then repeat. Holding the phone upright should not continuously retrigger the sound.

## Implementation and verification

The application uses browser motion/orientation input, JavaScript gesture processing, and Faust sound models compiled to WebAssembly. Desktop demonstration controls allow the sound path and gesture logic to be exercised when physical sensors are unavailable. Simulated input is a development aid and is not evidence of a successful phone trial.

The initial settings below are defined in [the gesture engine](../js/gestures.js). They are engineering defaults, not thresholds established through a user study.

| Mapping | Recognition and stability settings |
| --- | --- |
| Bells | Two alternating peaks of at least 6 m/s² in 900 ms; below 3 m/s² rearms each peak; minimum peak spacing 60 ms; cooldown 300 ms. |
| Wind | Calibrated absolute roll magnitude; audible from about 10° and full force at 70°; 120 ms smoothing time constant. |
| Thunder | Acceleration magnitude at least 16 m/s² for 40 ms; below 7 m/s² for 120 ms rearms the detector; cooldown 1,400 ms. |
| Torpedo | Top edge within 20° of vertical for 350 ms; leaving to at least 35° rearms; cooldown 1,200 ms. |

The input path prefers gravity-free acceleration. If only acceleration including gravity is available, it estimates gravity with an 800 ms low-pass time constant and uses a silent 750 ms warm-up. This fallback is an approximation, particularly during prolonged acceleration. Missing values do not trigger sounds, and data gaps longer than 500 ms reset pending detection history.

| Item | Status and evidence |
| --- | --- |
| Four mapping designs and motivations | Documented above. |
| Browser implementation and automated checks | See the [final README](../README.md) and test results. This document does not independently claim that checks have passed. |
| Physical smartphone sensor and audio tests | Not yet recorded. Must be checked on the phone used for the lab. |
| Laboratory assistant approval | Not yet obtained. |
| Individual-work arrangement | Stated transparently; no partner or approval is invented. |

For the physical check, test each positive action and its negative control, then check repeated activation and returning to rest. Record the phone model, operating system, browser, and any threshold changes. These device-specific results should be added only after the trials have actually been performed.

## Sources

- Course handout: *DT2140 Lab Instruction 2026*, supplied PDF, sections 1-6 and Tables 1-3.
- [Course starter repository](https://github.com/smc-kth/DT2140-Sound-Interaction-Lab): setup, Faust sources, and hosting workflow.
- [Faust documentation](https://faustdoc.grame.fr/manual/quick-start/): language and DSP workflow.

The sound models are adaptations or builds of the course-provided sources, not recordings made for this submission. Their original notices and the repository license are retained in the project.
