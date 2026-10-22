// Run: node tests/voice-audio.cjs — production Web Audio code with deterministic I/O.
const fs=require('fs'), vm=require('vm'), assert=require('assert');
const source=fs.readFileSync(require('path').join(__dirname,'../audio.js'),'utf8').replace(/export \{ sfx, boss \};/, '');
let now=0, missing=false, slowResolve=null, slow=false;
const elements=new Map(), timers=new Map();let timerId=0;
const el=id=>{if(!elements.has(id))elements.set(id,{hidden:true,addEventListener(){},setAttribute(){}});return elements.get(id);};
function param(){return {value:0,setTargetAtTime(v){this.value=v;},setValueAtTime(v){this.value=v;}};}
const nodes=[];
class AudioContext {
  constructor(){this.currentTime=0;this.state='running';this.destination={};}
  createGain(){return {gain:param(),connect(target){this.target=target;}};}
  decodeAudioData(){return Promise.resolve({duration:2});}
  createBufferSource(){const node={connect(target){this.target=target;},disconnect(){},start(){this.started=true;},stop(){this.stopped=true;if(this.onended)this.onended();}};nodes.push(node);return node;}
}
const context={console,Math,Promise,performance:{now:()=>now},window:{AudioContext},
 document:{hidden:false,getElementById:el,addEventListener(){}},
 setTimeout(fn){const id=++timerId;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);},
 fetch:()=>slow?new Promise(resolve=>{slowResolve=resolve;}):Promise.resolve({ok:!missing,arrayBuffer:async()=>new ArrayBuffer(16)})};
vm.createContext(context);vm.runInContext(source,context);
const run=s=>vm.runInContext(s,context);
const tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
  await tick();
  assert.equal(run('sfx.ctx'),null,'preload must not initialize or play audio without gesture');
  await run("boss.play('intro')");
  assert(nodes[0].started);assert.equal(el('boss-line').textContent,'叮叮當！敲壞不用賠！');
  assert.equal(run('sfx.effects.gain.value'),.12,'effects duck under speech');
  assert(run('sfx.voice.target === sfx.master && sfx.effects.target === sfx.master && sfx.master.target === sfx.ctx.destination'),'all audio uses shared mute bus');
  now+=100;await run("boss.play('miss')");assert.equal(nodes.length,1,'cooldown rejects immediate chatter');
  await run("boss.play('success')");assert(nodes[0].stopped,'success interrupts intro');assert(nodes[1].started);
  now+=2000;await run("boss.play('miss')");const firstMiss=el('boss-line').textContent;
  now+=2000;await run("boss.play('miss')");assert.notEqual(el('boss-line').textContent,firstMiss,'miss lines do not repeat back-to-back');
  const active=nodes.at(-1);run('boss.stop(); sfx.setMuted(true)');assert(active.stopped);
  assert.equal(run('sfx.master.gain.value'),0);assert(el('boss-caption').hidden);
  const count=nodes.length;now+=2000;await run("boss.play('bent')");assert.equal(nodes.length,count,'muted play creates no source');assert(!el('boss-caption').hidden,'muted players still get subtitles');
  run('sfx.setMuted(false); boss.stop()');assert.equal(run('sfx.master.gain.value'),.85);
  now+=2000;await run("boss.play('intro')");nodes.at(-1).onended();assert.equal(run('sfx.effects.gain.value'),.38,'natural ending restores effect gain');
  run('boss.stop(); boss.bytes.clear(); boss.decoded.clear()');missing=true;now+=2000;
  await run("boss.play('success')");assert.equal(nodes.length,count+1,'missing file is silent');assert(!el('boss-caption').hidden,'missing voice still has subtitles');
  run('boss.stop(); boss.bytes.clear()');missing=false;slow=true;now+=2000;
  let pending=run("boss.play('intro')");await tick();run('boss.stop()');slowResolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(16)});await pending;
  assert.equal(run('boss.source'),null,'reset cancels pending decode');assert(el('boss-caption').hidden,'reset cannot revive an old caption');
  run('boss.bytes.clear()');now+=2000;pending=run("boss.play('intro')");await tick();now+=1600;slowResolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(16)});await pending;
  assert.equal(run('boss.source'),null,'slow load cannot play stale dialogue');
  context.document.hidden=true;await run("boss.play('success')");assert.equal(run('boss.source'),null,'hidden tab stays quiet');
  const cfg=JSON.parse(fs.readFileSync(require('path').join(__dirname,'../voice_lines.json'),'utf8'));
  for(const [id,line] of Object.entries(cfg.lines)){
    assert.equal(run(`BOSS_LINES['${id}'].tailo`),line.tailo);assert.equal(run(`BOSS_LINES['${id}'].subtitle`),line.subtitle);
    assert(fs.statSync(require('path').join(__dirname,`../voice/${id}.mp3`)).size>1000);
  }
  console.log('PASS: gesture gate, shared mute bus, ducking, cooldown, success priority, alternating lines, caption fallback, pending/reset cancellation, stale fetch rejection, hidden-tab silence, six local assets and matching Tai-lo subtitles.');
})().catch(err=>{console.error(err);process.exitCode=1;});
