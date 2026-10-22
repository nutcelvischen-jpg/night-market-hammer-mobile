import {NailGame, powerZone, clamp, HARD} from './game.js';
import {Scene} from './scene.js';
import {sfx, boss} from './audio.js';
const $=id=>document.getElementById(id);
const action=$('action'), stage=$('stage'), scene=new Scene($('scene'));
const progress=[...$('nail-progress').children];
let lastPhase='', pointer=null, keyboard=false, lastTime=performance.now(), previousSecond=-1;
const labels={miss:['落空！扣 3 秒','再瞄準一次，準星進綠區再按。'],bent:['敲歪！扣 5 秒','下一根輕一點，別超過綠區。'],done:['漂亮，釘平了！','保利達 B！換下一根。'],partial:['有進去，再一槌！','釘子變短了，下一槌也要輕一點。'],late:['時間到！','這一槌太晚了，下次再挑戰。']};
const game=new NailGame((event,result)=>{
  if(event==='intro')boss.play('intro');
  if(event==='swing')sfx.playSwingWhoosh(.3);
  if(event==='impact'){
    if(result.kind==='late')return;
    if(result.kind!=='miss')sfx.playMetalClang(game.strike.power);
    sfx.playWoodCreak(.25);
  }
  if(event==='result'){
    if(result.kind==='done'){sfx.playCheer();boss.play('success');}
    if(result.kind==='bent'){sfx.playCrack();boss.play('bent');}
    if(result.kind==='miss')boss.play('miss');
  }
});
function renderUI(){
  const seconds=Math.ceil(game.remaining);
  if(seconds!==previousSecond){$('seconds').textContent=seconds;$('timer').setAttribute('aria-label',`剩餘 ${seconds} 秒`);$('timer').classList.toggle('urgent',seconds<=10);previousSecond=seconds;}
  const phase=game.phase;
  document.body.dataset.phase=phase;
  document.body.classList.toggle('charging',game.charging);
  action.disabled=['strike','result'].includes(phase)||game.paused;
  $('reaim').hidden=phase!=='power';$('reaim').disabled=game.charging;
  $('meter-wrap').hidden=!['aim','power'].includes(phase);
  if(phase!==lastPhase){
    lastPhase=phase;
    progress.forEach((p,i)=>{const state=game.nails[i];p.className=state==='ready'?(i===game.active?'current':''):state;p.textContent=state==='done'?'✓':state==='bent'?'×':i+1;p.setAttribute('aria-label',`第 ${i+1} 根，${state==='done'?'釘平':state==='bent'?'敲歪':'待敲'}`);});
    $('scene-label').hidden=!['ready','result','finished'].includes(phase);
    if(phase==='ready'){$('step').textContent='地獄挑戰 · 35 秒 / 5 根';$('instruction').textContent='瞄準，再用力！';$('hint').textContent='落空扣 3 秒、敲歪扣 5 秒。越後面越快。';action.textContent='開始挑戰';$('scene-label').textContent='一根一根來，釘平就算贏。';}
    if(phase==='aim'){$('step').textContent=`第 ${game.active+1} 根 · 先瞄準`;$('instruction').textContent='準星到綠區，按一下';$('hint').textContent='準星會變速，進綠區再鎖定。';action.textContent='鎖定瞄準';}
    if(phase==='power'){$('step').textContent=`第 ${game.active+1} 根 · 再出力`;$('instruction').textContent='按住蓄力，綠區放開';$('hint').textContent=Math.abs(game.lockedAim)>HARD.miss?'這次瞄偏了，按「重瞄」再試一次。':Math.abs(game.lockedAim)>HARD.edge?'瞄得有點偏，大力敲容易歪。':'看力量到綠區，就放開！';action.textContent='按住蓄力';}
    if(phase==='strike'){$('step').textContent='慢慢看，釘子下去了';$('instruction').textContent='這一槌，敲得如何？';$('hint').textContent='';action.textContent='敲擊中…';}
    if(phase==='result'){const text=labels[game.result.kind];$('step').textContent=`第 ${game.active+1} 根`;$('instruction').textContent=text[0];$('hint').textContent=text[1];$('scene-label').textContent=text[0];action.textContent=game.result.kind==='partial'||game.result.kind==='miss'?'準備再來一槌':'準備下一根';}
    if(phase==='finished'){$('step').textContent=game.remaining<=0?'時間到，收攤囉！':'五根挑戰完成';$('instruction').textContent=`釘平 ${game.score} 根，拿下 ${game.score*100} 分`;$('hint').textContent=`共敲 ${game.shots} 槌 · ${game.nails.filter(n=>n==='bent').length} 根敲歪，${5-game.resolved} 根未完成。`;$('scene-label').textContent=game.score>=3?'老闆認證，這槌有料。':'再來一局，抓到手感就會準。';action.textContent='再挑戰一次';}
  }
  if(phase==='aim'){
    $('zone').style.left=`${(1-HARD.center)*50}%`;$('zone').style.width=`${HARD.center*100}%`;$('needle').style.left=`${(game.aim+1)*50}%`;$('power-fill').style.width='0%';$('meter-left').textContent='偏左';$('meter-right').textContent='偏右';$('meter-center').textContent='綠區最準';$('meter').setAttribute('aria-label','瞄準條：準星進中央綠區時，按鎖定瞄準');
  }else if(phase==='power'){
    const zone=powerZone(game.height,game.lockedAim),valid=zone.high>=zone.low&&Math.abs(game.lockedAim)<=HARD.miss;
    $('zone').style.left=`${clamp(zone.low)*100}%`;$('zone').style.width=`${valid?(zone.high-zone.low)*100:0}%`;$('needle').style.left=`${game.power*100}%`;$('power-fill').style.width=`${game.power*100}%`;
    $('meter-left').textContent='輕';$('meter-right').textContent='重';$('meter-center').textContent=valid?'綠區釘平':'輕敲，分次釘入';$('meter').setAttribute('aria-label',valid?'力量條：按住蓄力，綠區放開':'這次無法一槌釘平，可重瞄或輕敲');
  }
}
function activate(){
  sfx.init();
  if(game.phase==='ready')game.start();
  else if(game.phase==='finished'){boss.stop();boss.lastAt=-Infinity;game.reset();game.start();}
  else if(game.phase==='aim')game.lockAim();
  renderUI();
}
action.addEventListener('click',e=>{
  if(game.phase==='power'&&e.detail===0&&!keyboard){game.charging?game.release():game.press();renderUI();return;}
  activate();
});
action.addEventListener('pointerdown',e=>{
  if(e.button!==0||pointer!==null)return;
  if(game.phase!=='power')return;
  e.preventDefault();pointer=e.pointerId;action.setPointerCapture(pointer);sfx.init();game.press();sfx.playStrain();renderUI();
});
action.addEventListener('pointerup',e=>{
  if(e.pointerId!==pointer)return;pointer=null;game.release();renderUI();
});
function cancel(){pointer=null;keyboard=false;game.cancel();renderUI();}
action.addEventListener('pointercancel',cancel);
action.addEventListener('lostpointercapture',()=>{if(game.charging)cancel();});
action.addEventListener('contextmenu',e=>e.preventDefault());
action.addEventListener('keydown',e=>{
  if(!['Space','Enter'].includes(e.code))return;e.preventDefault();if(e.repeat)return;keyboard=true;
  if(game.phase==='power'){sfx.init();game.press();sfx.playStrain();}else activate();renderUI();
});
action.addEventListener('keyup',e=>{if(!['Space','Enter'].includes(e.code))return;e.preventDefault();if(game.charging)game.release();keyboard=false;renderUI();});
action.addEventListener('blur',()=>{if(game.charging)cancel();});
$('reaim').addEventListener('click',()=>{game.reaim();renderUI();});
$('sound-toggle').addEventListener('click',()=>{boss.stop();sfx.setMuted(!sfx.muted);$('sound-toggle').textContent=sfx.muted?'聲音 關':'聲音 開';$('sound-toggle').setAttribute('aria-pressed',String(sfx.muted));});
function pause(){if(['ready','finished'].includes(game.phase))return;game.setPaused(true);boss.stop();pointer=null;keyboard=false;$('pause-cover').hidden=false;renderUI();}
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();lastTime=performance.now();});
window.addEventListener('blur',pause);
$('resume').addEventListener('click',()=>{sfx.init();game.setPaused(false);$('pause-cover').hidden=true;lastTime=performance.now();renderUI();});
new ResizeObserver(()=>scene.resize()).observe(stage);scene.resize();
function frame(now){const dt=Math.max(0,(now-lastTime)/1000);lastTime=now;game.tick(dt);renderUI();const pose=scene.draw(game);const show=game.phase==='strike'&&game.strike.impacted&&game.strike.outcome.driven>0;$('depth').hidden=!show;if(show&&pose)$('depth-value').textContent=pose.driven.toFixed(1);requestAnimationFrame(frame);}
renderUI();requestAnimationFrame(frame);
