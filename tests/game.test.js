import test from 'node:test';
import assert from 'node:assert/strict';
import {NailGame,judgeHit,powerZone,HIT_AT,STRIKE_END,HARD} from '../game.js';
import {strikePose} from '../scene.js';
import {readFileSync} from 'node:fs';
const hit=(g,power,aim=0)=>{g.aim=aim;g.lockAim();g.press();g.power=power;g.release();g.tick(STRIKE_END);};
test('requires aim and charge before a strike; cancelled hold does not fire',()=>{
 const g=new NailGame();g.press();g.release();assert.equal(g.shots,0);g.start();g.press();g.release();assert.equal(g.shots,0);g.lockAim();g.press();g.tick(.4);assert(g.power>0);g.cancel();g.release();assert.equal(g.shots,0);assert.equal(g.phase,'power');
});
test('all five nails score; intro once; restart clears the round',()=>{
 const events=[];const g=new NailGame((e,r)=>events.push([e,r]));g.start();
 for(let i=0;i<5;i++){hit(g,.94);if(i<4)g.tick(1.3);}
 assert.equal(g.phase,'finished');assert.equal(g.score,5);assert.equal(g.shots,5);assert.equal(events.filter(e=>e[0]==='intro').length,1);assert.equal(events.filter(e=>e[0]==='result'&&e[1].kind==='done').length,5);g.reset();assert.equal(g.remaining,25);assert.equal(g.score,0);assert.equal(g.active,0);
});
test('miss leaves nail intact; two miss voices can be routed separately from partial hits',()=>{
 assert.equal(judgeHit(70,.9,1).kind,'miss');assert.equal(judgeHit(70,.9,1).height,70);assert.equal(judgeHit(70,0,.4).kind,'partial');
 const g=new NailGame();g.start();hit(g,1,.9);g.tick(1.3);assert.equal(g.active,0);assert.equal(g.height,70);assert.equal(g.phase,'aim');
});
test('bending advances to next nail; partial drives accumulate',()=>{
 const g=new NailGame();g.start();hit(g,1);assert.equal(g.nails[0],'bent');g.tick(1.3);assert.equal(g.active,1);assert.equal(g.height,70);hit(g,.5);const h=g.height;g.tick(1.3);hit(g,.5);assert(g.height<h);assert.equal(g.active,1);
});
test('green power zone actually yields a flush nail, including nearly finished nails',()=>{
 for(const h of [70,40,15,6])for(const a of [0,.3,.55]){const z=powerZone(h,a);if(z.low<=z.high)assert.equal(judgeHit(h,a,(z.low+z.high)/2).kind,'done');}
});
test('real contact before/after deadline determines result even across a long frame',()=>{
 for(const [remaining,kind]of [[HIT_AT+.01,'done'],[HIT_AT-.01,'late'],[HIT_AT,'late']]){const g=new NailGame();g.start();g.remaining=remaining;hit(g,.94);assert.equal(g.phase,'finished');assert.equal(g.result.kind,kind);assert.equal(g.score,kind==='done'?1:0);}
});
test('pause cancels charging, does not fire on resume, freezes countdown',()=>{
 const g=new NailGame();g.start();g.lockAim();g.press();g.tick(.3);const time=g.remaining;g.setPaused(true);g.tick(90);g.release();assert.equal(g.remaining,time);assert.equal(g.shots,0);g.setPaused(false);g.release();assert.equal(g.shots,0);g.press();g.tick(.8);g.release();assert.equal(g.phase,'strike');
});
test('hammer separates after contact while nail continues sinking; drive is monotonic',()=>{
 const g=new NailGame();g.start();g.aim=0;g.lockAim();g.press();g.power=.8;g.release();g.tick(HIT_AT);let p=strikePose(g);assert.equal(p.hammerLift,0);let previous=p.height;
 g.tick(.1);p=strikePose(g);const hammerY=-p.height*1.3-p.hammerLift;g.tick(.05);p=strikePose(g);assert(-p.height*1.3-p.hammerLift<hammerY,'hammer moving upward');
 for(let i=0;i<20;i++){g.tick(.03);p=strikePose(g);assert(p.height<=previous+1e-9);previous=p.height;assert(p.hammerLift>0);}
});
test('local voice files, metadata and no remote runtime dependency',()=>{
 const cfg=JSON.parse(readFileSync(new URL('../voice_lines.json',import.meta.url)));
 for(const name of Object.keys(cfg.lines))assert(readFileSync(new URL(`../voice/${name}.mp3`,import.meta.url)).length>1000);
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');assert(!/src="https?:/.test(html));
});

test('hard mode starts off-center, reaim never grants an instant bullseye, later nails accelerate',()=>{
 const g=new NailGame(()=>{},()=>.25);g.start();assert(Math.abs(g.aim)>.6);g.lockAim();g.reaim();assert(Math.abs(g.aim)>.6);
 const first=g.chargePeakSeconds;g.active=4;assert(g.chargePeakSeconds<first);assert.equal(g.remaining,25);
});
test('miss and bend have explicit time costs, never double charge or go below zero',()=>{
 for(const [aim,power,cost]of [[.9,.94,4],[0,1,7]]){const g=new NailGame();g.start();hit(g,power,aim);assert(Math.abs(g.remaining-(25-STRIKE_END-cost))<1e-9);const before=g.remaining;g.tick(.1);assert(Math.abs(g.remaining-(before-.1))<1e-9);}
 const g=new NailGame();g.start();g.remaining=2;hit(g,1);assert.equal(g.remaining,0);assert.equal(g.phase,'finished');
});
test('hard mode narrows both accuracy and overdrive tolerance; marked power intervals remain honest',()=>{
 assert.equal(judgeHit(70,.65,.9).kind,'miss');assert.equal(judgeHit(70,.4,.6).kind,'bent');assert.equal(judgeHit(70,0,.98).kind,'bent');assert.equal(HARD.center,.14);
 for(const h of [70,50,20,6])for(const aim of [0,.18,.3,.39,.6]){const z=powerZone(h,aim);if(z.low<=z.high)for(const f of [.1,.5,.9])assert.equal(judgeHit(h,aim,z.low+(z.high-z.low)*f).kind,'done');}
});

test('hell difficulty tightens the previous miss, edge and overdrive boundaries',()=>{
 assert.equal(judgeHit(70,.56,.5).kind,'miss');
 assert.equal(judgeHit(70,.34,.44).kind,'bent');
 assert.equal(judgeHit(70,0,Math.sqrt(73.5/80)).kind,'bent');
 assert.equal(judgeHit(70,0,Math.sqrt(67.5/80)).kind,'partial');
 assert(powerZone(6,.56).low>powerZone(6,.56).high,'missed aim never advertises a success window');
});
test('five perfect nails remain reachable within 25 seconds at phone and desktop frame rates',()=>{
 for(const fps of [30,60,120]) {
  const g=new NailGame(()=>{},()=>.25);g.start();
  for(let frame=0;frame<25*fps && g.phase!=='finished';frame++) {
   if(g.phase==='aim' && Math.abs(g.aim)<HARD.center)g.lockAim();
   if(g.phase==='power') {
    if(!g.charging)g.press();
    const zone=powerZone(g.height,g.lockedAim);
    if(g.power>=zone.low && g.power<=zone.high)g.release();
   }
   g.tick(1/fps);
  }
  assert.equal(g.score,5,`${fps} fps must leave a reachable winning interval`);
  assert(g.remaining>0);
 }
});
