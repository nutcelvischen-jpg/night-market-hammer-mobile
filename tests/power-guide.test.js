import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {NailGame, powerGuide, judgeHit, HARD} from '../game.js';

test('every visible power target matches the promised outcome across nail heights and aim offsets',()=>{
 for(const height of [70,50,20,6,2.1])for(const aim of [0,.14,.2,.3,.31,.4,.52,.53,.9]){
  const guide=powerGuide(height,aim);
  if(guide.kind==='miss'){assert.equal(judgeHit(height,aim,.5).kind,'miss');continue;}
  assert(guide.high>guide.low && guide.low>=0 && guide.high<=1);
  for(const f of [.05,.5,.95])assert.equal(judgeHit(height,aim,guide.low+(guide.high-guide.low)*f).kind,guide.kind);
 }
 assert.equal(powerGuide(70,0).kind,'done');
 assert.equal(powerGuide(70,.4).kind,'partial');
 assert.equal(powerGuide(70,.8).kind,'miss');
});
test('UI never tells the player to wait for a nonexistent green zone and restores it after reaim',()=>{
 const elements=new Map();
 const el=id=>{if(!elements.has(id))elements.set(id,{style:{},dataset:{},hidden:false,classList:{toggle(){}},setAttribute(k,v){this[k]=v;},children:[]});return elements.get(id);};
 el('nail-progress').children=Array.from({length:5},(_,i)=>el(`nail-${i}`));
 const context={NailGame,powerGuide,HARD,Scene:class{},sfx:{},boss:{},performance:{now:()=>0},document:{body:el('body'),getElementById:el}};
 vm.createContext(context);
 const code=readFileSync(new URL('../app.js',import.meta.url),'utf8').split('function activate()')[0].replace(/^import .*;\n/gm,'');
 vm.runInContext(code,context);
 const render=aim=>vm.runInContext(`game.phase='power';game.lockedAim=${aim};renderUI()`,context);
 render(0);assert.equal(el('meter').dataset.guide,'done');assert.equal(el('zone').hidden,false);assert(el('instruction').textContent.includes('綠區'));
 render(.4);assert.equal(el('meter').dataset.guide,'partial');assert(parseFloat(el('zone').style.width)>0);assert(el('instruction').textContent.includes('黃區'));assert(el('hint').textContent.includes('沒有釘平綠區'));
 render(.8);assert.equal(el('zone').hidden,true);assert(el('instruction').textContent.includes('重瞄'));assert(el('meter-center').textContent.includes('無命中區'));
 vm.runInContext("game.phase='aim';renderUI()",context);assert.equal(el('zone').hidden,false);assert(Math.abs(parseFloat(el('zone').style.width)-14)<1e-9);
 render(0);assert.equal(el('zone').hidden,false);assert.equal(el('meter').dataset.guide,'done');
});
