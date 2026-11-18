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
const dspName = "brass";
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
brass.createDSP(audioContext, 1024)
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
    // Acceleration is intentionally not used for this mapping.
}

let neutralRoll = null;
let neutralSamples = [];
let smoothedPressure = 0;

function rotationChange(rotx, roty, rotz) {
    turntimer = millis();
    statusLabels[1].style("color", "pink");
    // p5's rotationY is the side-to-side roll. rotationZ is yaw, so using
    // rotationZ here would make the brass sound stay saturated while turning.
    if (!Number.isFinite(roty)) {
        return;
    }
    if (neutralRoll === null) {
        neutralSamples.push(roty);
        if (neutralSamples.length < 20) {
            playAudio(0);
            return;
        }
        neutralRoll = neutralSamples.reduce((sum, value) => sum + value, 0) /
            neutralSamples.length;
    }

    // Use the shortest angular distance so the -180/180 discontinuity is safe.
    let delta = roty - neutralRoll;
    while (delta > 180) delta -= 360;
    while (delta < -180) delta += 360;

    // Use a nonlinear curve for a more obvious change, while keeping a safe cap.
    const normalized = Math.min(1, Math.abs(delta) / 55);
    const targetPressure = Math.min(0.82, Math.pow(normalized, 1.35) * 0.82);
    smoothedPressure += 0.18 * (targetPressure - smoothedPressure);
    playAudio(smoothedPressure);
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

function playAudio(pressure) {
    if (!dspNode) {
        return;
    }
    if (audioContext.state === 'suspended') {
        return;
    }
    dspNode.setParamValue("/brass/blower/pressure", Math.max(0, Math.min(1, pressure)));
}

//==========================================================================================
// END
//==========================================================================================
