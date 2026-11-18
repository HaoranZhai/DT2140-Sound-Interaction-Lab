//==========================================================================================
// AUDIO SETUP
//------------------------------------------------------------------------------------------
//
//------------------------------------------------------------------------------------------
// Edit just where you're asked to!
//------------------------------------------------------------------------------------------
//
//==========================================================================================
let dspNode = null;
let dspNodeParams = null;
let jsonParams = null;

// Change here to ("tuono") depending on your wasm file name
const dspName = "bells";
const instance = new FaustWasm2ScriptProcessor(dspName);

// output to window or npm package module
if (typeof module === "undefined") {
    window[dspName] = instance;
} else {
    const exp = {};
    exp[dspName] = instance;
    module.exports = exp;
}

// The name should be the same as the WASM file, so change tuono with brass if you use brass.wasm
window[dspName].createDSP(audioContext, 1024)
    .then(node => {
        dspNode = node;
        dspNode.connect(audioContext.destination);
        console.log('params: ', dspNode.getParams());
        const jsonString = dspNode.getJSON();
        jsonParams = JSON.parse(jsonString)["ui"][0]["items"];
        dspNodeParams = jsonParams
        // const exampleMinMaxParam = findByAddress(dspNodeParams, "/thunder/rumble");
        // // ALWAYS PAY ATTENTION TO MIN AND MAX, ELSE YOU MAY GET REALLY HIGH VOLUMES FROM YOUR SPEAKERS
        // const [exampleMinValue, exampleMaxValue] = getParamMinMax(exampleMinMaxParam);
        // console.log('Min value:', exampleMinValue, 'Max value:', exampleMaxValue);
    });


//==========================================================================================
// INTERACTIONS
//------------------------------------------------------------------------------------------
//
//------------------------------------------------------------------------------------------
// Edit the next functions to create interactions
// Decide which parameters you're using and then use playAudio to play the Audio
//------------------------------------------------------------------------------------------
//
//==========================================================================================

function accelerationChange(accx, accy, accz) {
    const now = millis();
    const current = { x: accx, y: accy, z: accz };
    if (!accelerationChange.previous) {
        accelerationChange.previous = current;
        accelerationChange.previousDelta = null;
        return;
    }

    const delta = {
        x: current.x - accelerationChange.previous.x,
        y: current.y - accelerationChange.previous.y,
        z: current.z - accelerationChange.previous.z
    };
    const magnitude = Math.hypot(delta.x, delta.y, delta.z);
    accelerationChange.previous = current;

    if (magnitude < 5.5 || now < (accelerationChange.cooldownUntil || 0)) {
        return;
    }

    const previousDelta = accelerationChange.previousDelta;
    accelerationChange.previousDelta = delta;
    if (previousDelta && (now - (accelerationChange.lastPeak || 0)) >= 60) {
        const alternating =
            delta.x * previousDelta.x +
            delta.y * previousDelta.y +
            delta.z * previousDelta.z < 0;
        if (alternating) {
            accelerationChange.peaks = (accelerationChange.peaks || [])
                .filter(time => now - time <= 900);
            accelerationChange.peaks.push(now);
            accelerationChange.lastPeak = now;
            if (accelerationChange.peaks.length >= 2) {
                playAudio();
                accelerationChange.peaks = [];
                accelerationChange.cooldownUntil = now + 300;
            }
        }
    }
}

function rotationChange(rotx, roty, rotz) {
}

function deviceShaken() {
    shaketimer = millis();
    statusLabels[0].style("color", "pink");
    // p5.js remains a fallback for devices that do not expose usable deltas.
    if (millis() >= (accelerationChange.cooldownUntil || 0)) {
        playAudio();
        accelerationChange.cooldownUntil = millis() + 300;
    }
}

//==========================================================================================
// AUDIO INTERACTION
//------------------------------------------------------------------------------------------
//
//------------------------------------------------------------------------------------------
// Edit here to define your audio controls 
//------------------------------------------------------------------------------------------
//
//==========================================================================================

function playAudio() {
    if (!dspNode) {
        return;
    }
    if (audioContext.state === 'suspended') {
        return;
    }
    dspNode.setParamValue("/englishBell/gate", 1);
    setTimeout(() => { dspNode.setParamValue("/englishBell/gate", 0); }, 180);
}

//==========================================================================================
// END
//==========================================================================================
