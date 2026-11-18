//==========================================================================================
// AUDIO SETUP
//==========================================================================================
let dspNode = null;
let dspNodeParams = null;
let jsonParams = null;

const dspName = "torpedo";
const instance = new FaustWasm2ScriptProcessor(dspName);

if (typeof module === "undefined") {
    window[dspName] = instance;
} else {
    const exp = {};
    exp[dspName] = instance;
    module.exports = exp;
}

window[dspName].createDSP(audioContext, 1024)
    .then(node => {
        dspNode = node;
        dspNode.connect(audioContext.destination);
        console.log('params: ', dspNode.getParams());
        const jsonString = dspNode.getJSON();
        jsonParams = JSON.parse(jsonString)["ui"][0]["items"];
        dspNodeParams = jsonParams;
    });

//==========================================================================================
// POINT-UP GESTURE
//==========================================================================================
let pointingUpSince = 0;
let torpedoArmed = true;

function accelerationChange(accx, accy, accz) {
    // This interaction uses orientation rather than acceleration.
}

function rotationChange(rotx, roty, rotz) {
    // Use the signed pitch direction: positive pitch is the phone's top edge
    // moving toward the ceiling. Using absolute values would also fire when
    // the phone points down.
    const pointingUp = rotx >= 65;

    if (pointingUp && torpedoArmed) {
        if (!pointingUpSince) {
            pointingUpSince = millis();
        }
        if (millis() - pointingUpSince >= 350) {
            playAudio();
            torpedoArmed = false;
        }
    } else if (rotx < 45) {
        pointingUpSince = 0;
        torpedoArmed = true;
    }
}

function mousePressed() {
    playAudio();
}

function playAudio() {
    if (!dspNode || audioContext.state === 'suspended') {
        return;
    }
    dspNode.setParamValue("/torpedo/trigger", 1);
    setTimeout(() => {
        dspNode.setParamValue("/torpedo/trigger", 0);
    }, 120);
}

