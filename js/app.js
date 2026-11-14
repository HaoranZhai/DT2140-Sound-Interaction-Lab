import {GestureEngine} from './gestures.js';
import {LabAudio} from './audio.js';

const $=id=>document.getElementById(id);
const engine=new GestureEngine('bell');
const audio=new LabAudio();
audio.setVolume(.25);
const modes={
  bell:{number:'01',label:'SHAKE → BELLS',title:'A handbell in your hand.',instruction:'Hold the phone securely and shake back and forth. Three alternating acceleration peaks create a bell strike.',rest:'Hold still, reposition slowly, or make one isolated push: no strike.',kind:'ACCELERATION',unit:'m/s²',description:'Movement acceleration with gravity removed. Shake peaks: at least 7 m/s².',model:'Church bell · Faust',type:'Discrete',scenario:'The gesture suggests the sound.',reason:'A virtual handbell uses the same back-and-forth action as its physical counterpart. Discrete bell attacks make the timing of a recognized shake easy to hear.'},
  wind:{number:'02',label:'TILT → WIND',title:'Tilt into a changing breeze.',instruction:'Hold the phone flat, tap Calibrate level, then tilt it gently left and right. Greater tilt produces stronger wind.',rest:'Return to the center to calm the wind. Keep the phone away from a vertical pose.',kind:'SIDEWAYS TILT',unit:'°',description:'Calibrated tilt: a 5° quiet zone, reaching full wind force at 45°.',model:'Filtered wind · Faust',type:'Continuous',scenario:'An expressive weather control.',reason:'Sideways tilt acts as a continuous control for a virtual weather scene. Smooth changes in wind force make the amount of tilt audible. Both directions use the same relationship between tilt magnitude and force.'},
  thunder:{number:'03',label:'LARGE MOTION → THUNDER',title:'Conduct a small storm.',instruction:'Make one firm, controlled movement while keeping a secure grip. Acceleration above 16 m/s² for 40 ms triggers thunder.',rest:'Small movements remain silent. Pause after a large movement before repeating.',kind:'ACCELERATION',unit:'m/s²',description:'Only a high acceleration impulse triggers. This does not measure travel distance.',model:'Thunder · Faust',type:'Discrete',scenario:'Match physical and sonic intensity.',reason:'A performer conducts a storm: a forceful motion creates a dramatic thunder event, while small adjustments remain silent. A high threshold, rearming and a cooldown distinguish intentional attacks from ordinary movement.'},
  torpedo:{number:'04',label:'POINT UP → SCI-FI',title:'Aim upward. Hear the launch.',instruction:'Point the top edge of your phone toward the ceiling and hold for 0.35 seconds. The screen should be approximately vertical.',rest:'Lower the top edge at least 35° from vertical to rearm. Holding upright fires only once.',kind:'ANGLE FROM UP',unit:'°',description:'The top edge must remain within 20° of straight up. Face-up flat is not upright.',model:'Photon torpedo · Faust',type:'Pose entry',scenario:'Turn aiming into an audible event.',reason:'In a science-fiction game, pointing the phone upward launches a virtual torpedo. A short dwell makes the aiming pose intentional; leaving the pose prepares the next shot.'}
};
let mode='bell',source='none',sensorEnabled=false,events=0,demoToken=0;
let motionArrival=-Infinity,orientationArrival=-Infinity,lastRender=0;
let motionHealthy=false,orientationHealthy=false;
const eventLog=[];
const clock=()=>performance.now();
const notice=text=>{$('notice').textContent=text;};
function status(kind,text,on=false){$(kind+'-status').textContent=text;$(kind+'-led').classList.toggle('on',on);}
function draw(result,force=false){
  const now=clock();if(!force && now-lastRender<55)return;lastRender=now;
  const m=result.metrics,definition=modes[mode];
  let valid,value,scale;
  if(mode==='wind'){valid=m.orientationValid&&m.rollStable;value=m.relativeRoll;scale=result.wind;}
  else if(mode==='torpedo'){valid=m.orientationValid;value=m.upAngle;scale=1-value/180;}
  else{valid=m.motionValid;value=m.accelerationMagnitude;scale=value/32;}
  $('signal-value').textContent=valid?value.toFixed(1):'—';
  const percent=valid?Math.round(Math.max(0,Math.min(1,scale))*100):0;
  $('meter-fill').style.width=percent+'%';
  $('meter-fill').parentElement.setAttribute('aria-valuenow',String(percent));
  $('input-source').textContent=source==='synthetic'?'Synthetic rehearsal':source==='phone'?((mode==='bell'||mode==='thunder')?m.accelerationSource:'Device orientation'):'None';
  $('source-tag').textContent=source==='synthetic'?'SYNTHETIC INPUT':source==='phone'?'PHONE SENSORS':'WAITING FOR INPUT';
  $('calibrate').disabled=mode!=='wind'||!m.orientationValid||!m.rollStable;
  $('calibrate-note').textContent=m.calibrated?'Neutral pose calibrated for this session.':'In Tilt mode, hold flat and calibrate after orientation data arrives.';
  if(mode==='wind'){
    $('event-state').textContent=valid?`Wind force ${Math.round(result.wind*100)}%`:'Waiting for a stable tilt';
    const phone=$('instrument').querySelector('.phone');if(phone)phone.style.transform=`rotate(${valid?Math.max(-65,Math.min(65,value)):0}deg)`;
  }
}
function consume(result){
  audio.setWind(result.wind);
  for(const event of result.events){
    events++;$('event-count').textContent=String(events);
    const played=audio.trigger(event.type,event.intensity);
    $('event-state').textContent=played?'Gesture recognized · sound triggered':'Gesture recognized · audio off';
    $('instrument').classList.remove('pulse');void $('instrument').offsetWidth;$('instrument').classList.add('pulse');
    eventLog.unshift(`${new Date().toLocaleTimeString()} · ${source==='synthetic'?'Synthetic':'Phone'} · ${event.type} · intensity ${event.intensity.toFixed(2)}${played?'':' · audio off'}`);
    eventLog.splice(8);$('events').replaceChildren(...eventLog.map(line=>{const li=document.createElement('li');li.textContent=line;return li;}));
  }
  draw(result,result.events.length>0);
}
function chooseMode(next){
  demoToken++;mode=next;events=0;engine.setMode(next);audio.setMode(next);
  $('event-count').textContent='0';$('event-state').textContent='Ready when you are';
  $('demo-run').disabled=false;$('demo-tilt').value='0';$('demo-tilt-value').textContent='0°';
  $('demo-tilt').disabled=next!=='wind';
  for(const button of document.querySelectorAll('[data-mode]')){const active=button.dataset.mode===next;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));}
  const d=modes[next];
  for(const [id,value] of Object.entries({'mapping-label':d.number+' / '+d.label,'gesture-title':d.title,'gesture-instruction':d.instruction,'gesture-rest':d.rest,'signal-kind':d.kind,'signal-unit':d.unit,'signal-description':d.description,'model-name':d.model,'mapping-type':d.type,'scenario-title':d.scenario,'scenario-body':d.reason})) $(id).textContent=value;
  const phone=$('instrument').querySelector('.phone');if(phone)phone.style.transform='';
  draw(engine.snapshot,true);
}
document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>chooseMode(button.dataset.mode)));

$('audio-toggle').addEventListener('click',async()=>{
  const button=$('audio-toggle');button.disabled=true;
  try{
    if(audio.running){await audio.stop();status('audio','off');button.textContent='Start audio';notice('Audio stopped. You can still inspect sensor readings.');}
    else{
      status('audio','loading');button.textContent='Loading Faust…';
      if(await audio.start()){status('audio','ready',true);button.textContent='Stop audio';notice('Audio ready. Select a mapping, then enable your phone sensors or use the synthetic rehearsal.');}
      else{status('audio','off');button.textContent='Start audio';}
    }
  }catch(error){await audio.stop();status('audio','error');button.textContent='Start audio';notice(`Audio could not start: ${error.message} Serve this project over HTTP/HTTPS, not file://.`);}
  finally{button.disabled=false;}
});
$('volume').addEventListener('input',event=>{const value=Number(event.target.value);audio.setVolume(value/100);$('volume-value').textContent=value+'%';});

// Both permission requests are initiated synchronously within the button gesture
// (before awaiting either one), as required by mobile browsers with gesture gating.
$('sensor-enable').addEventListener('click',async()=>{
  demoToken++;source='phone';engine.reset();audio.setWind(0);motionArrival=orientationArrival=-Infinity;
  motionHealthy=orientationHealthy=false;$('demo-run').disabled=false;
  if(!globalThis.isSecureContext){notice('Motion sensors need HTTPS. Open the published GitHub Pages link on your phone.');source='none';draw(engine.snapshot,true);return;}
  const permissions=['DeviceMotionEvent','DeviceOrientationEvent'].map(name=>{
    const Constructor=globalThis[name];
    if(!Constructor)return Promise.resolve('unsupported');
    try{return typeof Constructor.requestPermission==='function'?Promise.resolve(Constructor.requestPermission()):Promise.resolve('granted');}
    catch(error){return Promise.reject(error);}
  });
  $('sensor-enable').disabled=true;status('motion','requesting');status('orientation','requesting');
  const results=await Promise.allSettled(permissions);
  const states=results.map(result=>result.status==='fulfilled'?result.value:'denied');
  sensorEnabled=states.includes('granted');
  status('motion',states[0]==='granted'?'waiting':states[0]);status('orientation',states[1]==='granted'?'waiting':states[1]);
  $('sensor-enable').disabled=false;
  notice(sensorEnabled?'Sensor access requested. Move your phone gently; live data, not permission alone, makes a status indicator turn green. If no data arrives, try mobile Safari or Chrome over HTTPS.':'Sensors are denied or unavailable. You can retry permission in your browser or use Desktop rehearsal.');
  draw(engine.snapshot,true);
});
window.addEventListener('devicemotion',event=>{
  if(!sensorEnabled||source!=='phone'||document.hidden)return;
  motionArrival=clock();const result=engine.updateMotion(event,motionArrival);
  motionHealthy=result.metrics.motionValid;
  status('motion',motionHealthy?'live':result.metrics.accelerationSource==='gravity-warmup'?'calibrating':'no data',motionHealthy);
  consume(result);
});
window.addEventListener('deviceorientation',event=>{
  if(!sensorEnabled||source!=='phone'||document.hidden)return;
  orientationArrival=clock();const result=engine.updateOrientation(event,orientationArrival);
  orientationHealthy=result.metrics.orientationValid;status('orientation',orientationHealthy?'live':'no data',orientationHealthy);
  consume(result);
});
$('calibrate').addEventListener('click',()=>{
  if(engine.calibrate()){audio.setWind(0);draw(engine.snapshot,true);notice('Level calibrated. Tilt gently left or right, then return to this neutral pose.');}
  else notice('Hold the phone approximately flat and wait for valid orientation data before calibrating.');
});
setInterval(()=>{
  if(source!=='phone'||document.hidden)return;
  const now=clock();let stale=false;
  if(motionHealthy&&now-motionArrival>1000){motionHealthy=false;status('motion','stale');engine.updateMotion({},now);stale=true;}
  if(orientationHealthy&&now-orientationArrival>1000){orientationHealthy=false;status('orientation','stale');engine.updateOrientation({},now);audio.setWind(0);stale=true;}
  if(stale){draw(engine.snapshot,true);notice('Sensor updates paused. Keep the page visible and move the phone; stale data cannot sustain wind.');}
},250);
document.addEventListener('visibilitychange',()=>{
  if(!document.hidden)return;
  demoToken++;engine.reset();audio.stop();status('audio','paused');$('audio-toggle').textContent='Start audio';$('demo-run').disabled=false;
  motionHealthy=orientationHealthy=false;status('motion','paused');status('orientation','paused');draw(engine.snapshot,true);
  notice('Audio paused because the page was hidden. Tap Start audio after returning.');
});

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function beginSynthetic(){
  source='synthetic';engine.reset();audio.setWind(0);motionHealthy=orientationHealthy=false;
  status('motion','simulation');status('orientation','simulation');
}
$('demo-run').addEventListener('click',async()=>{
  beginSynthetic();const token=++demoToken;const selected=mode;$('demo-run').disabled=true;
  notice('Synthetic rehearsal is running through the gesture detector. It does not test physical phone sensors.');
  const start=clock();
  try{
    while(token===demoToken&&clock()-start<1800){
      const now=clock(),t=now-start;
      if(selected==='bell'){
        const phase=Math.floor(t/120)%2;
        const pulse=t%120<55;
        consume(engine.updateMotion({acceleration:{x:pulse?(phase?-12:12):0,y:0,z:0}},now));
      }else if(selected==='thunder'){
        consume(engine.updateMotion({acceleration:{x:t>=500&&t<650?22:0,y:0,z:0}},now));
      }else if(selected==='torpedo'){
        consume(engine.updateOrientation({alpha:0,beta:t>=350&&t<1350?85:0,gamma:0},now));
      }else{
        const angle=t<200?0:t<1000?45:0;
        consume(engine.updateOrientation({alpha:0,beta:0,gamma:angle},now));
      }
      await sleep(20);
    }
  }finally{
    if(token===demoToken){
      audio.setWind(0);engine.reset();draw(engine.snapshot,true);$('demo-run').disabled=false;
      notice('Synthetic rehearsal complete. Enable sensors to return to your phone’s physical input.');
    }
  }
});
$('demo-tilt').addEventListener('input',async event=>{
  if(mode!=='wind')return;
  beginSynthetic();const angle=Number(event.target.value),token=++demoToken;
  $('demo-run').disabled=false;$('demo-tilt-value').textContent=angle+'°';
  notice('Synthetic tilt is active. Returning the slider to zero calms the wind; Enable sensors restores physical input.');
  for(let i=0;i<35&&token===demoToken;i++){
    consume(engine.updateOrientation({alpha:0,beta:0,gamma:angle},clock()));await sleep(20);
  }
});
chooseMode('bell');
