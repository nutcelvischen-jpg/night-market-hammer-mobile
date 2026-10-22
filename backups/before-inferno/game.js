// Deterministic game rules, independent of the screen and audio.
export const ROUND_SECONDS = 35;
export const HARD = Object.freeze({center:.14, miss:.52, edge:.30, edgePower:.40, flush:2, overdrive:3, missPenalty:3, bendPenalty:5});
export const NAIL_COUNT = 5;
export const HIT_AT = 0.3;
export const STRIKE_END = 1.55;
export const START_HEIGHT = 70;
export const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
export function judgeHit(height, aim, power) {
  const distance = Math.abs(aim);
  if (distance > HARD.miss) return { kind:'miss', height, driven:0 };
  const efficiency = 1 - Math.max(0, distance - HARD.center) * .75;
  const drive = 80 * power * power * efficiency;
  if ((distance > HARD.edge && power > HARD.edgePower) || drive > height + HARD.overdrive) {
    const next = Math.max(5, height * .65);
    return {kind:'bent', height:next, driven:height - next};
  }
  const next = Math.max(0, height - drive);
  return {kind:next <= HARD.flush ? 'done' : 'partial', height:next <= HARD.flush ? 0 : next, driven:height - (next <= HARD.flush ? 0 : next)};
}
export function powerZone(height, aim) {
  if (Math.abs(aim) > HARD.miss) return {low:1, high:0};
  const efficiency = 1 - Math.max(0, Math.abs(aim) - HARD.center) * .75;
  return {low:Math.sqrt(Math.max(0, height - HARD.flush) / (80 * efficiency)), high:Math.min(1, Math.abs(aim) > HARD.edge ? HARD.edgePower : 1, Math.sqrt((height + HARD.overdrive) / (80 * efficiency)))};
}
// A green zone promises a finish; amber only promises a safe partial hit.
export function powerGuide(height, aim) {
  if (Math.abs(aim) > HARD.miss) return {kind:'miss', low:0, high:0};
  const zone=powerZone(height, aim);
  if (zone.high-zone.low > 1e-6) return {kind:'done', ...zone};
  return {kind:'partial', low:zone.high*.45, high:zone.high*.85};
}
export class NailGame {
  constructor(onEvent = () => {}, random = Math.random) { this.onEvent = onEvent; this.random = random; this.reset(); }
  reset() {
    this.phase='ready'; this.remaining=ROUND_SECONDS; this.nails=Array(NAIL_COUNT).fill('ready');
    this.active=0; this.height=START_HEIGHT; this.aim=0; this.lockedAim=0; this.aimTime=0;
    this.chargeTime=0; this.power=0; this.charging=false; this.shots=0;
    this.strike=null; this.result=null; this.resultTime=0; this.paused=false; this.resetAim();
  }
  resetAim() { this.aimTime=0; this.aimPhase=.8+this.random()*.6+(this.random()>.5?Math.PI:0); this.aim=.97*Math.sin(this.aimPhase); }
  get chargePeakSeconds() { return .76 - this.active * .03; }
  get score() { return this.nails.filter(n => n === 'done').length; }
  get resolved() { return this.nails.filter(n => n !== 'ready').length; }
  start() { if (this.phase !== 'ready') return; this.phase='aim'; this.onEvent('intro'); }
  lockAim() { if (this.phase !== 'aim' || this.paused) return; this.lockedAim=this.aim; this.phase='power'; }
  reaim() { if (this.phase !== 'power' || this.charging) return; this.phase='aim'; this.resetAim(); }
  press() { if (this.phase !== 'power' || this.paused || this.charging) return; this.charging=true; this.chargeTime=0; this.power=0; }
  cancel() { this.charging=false; this.chargeTime=0; this.power=0; }
  release() {
    if (!this.charging || this.phase !== 'power' || this.paused) return;
    this.charging=false; this.shots++;
    this.strike={time:0, startHeight:this.height, aim:this.lockedAim, power:this.power, impacted:false, outcome:judgeHit(this.height,this.lockedAim,this.power)};
    this.phase='strike'; this.onEvent('swing');
  }
  setPaused(value) { this.paused=value; if (value) this.cancel(); }
  finish() { if (this.phase === 'finished') return; this.cancel(); this.phase='finished'; this.onEvent('finish'); }
  tick(dt) {
    if (this.paused || !Number.isFinite(dt) || dt <= 0 || ['ready','finished'].includes(this.phase)) return;
    const before=this.remaining;
    this.remaining=Math.max(0, this.remaining - dt);
    if (this.phase==='aim') {
      this.aimTime+=dt; this.aim=Math.sin(this.aimTime * (4.4+this.active*.4) + this.aimPhase + .24*Math.sin(this.aimTime*1.7)) * .97;
    } else if (this.phase==='power' && this.charging) {
      this.chargeTime+=dt; this.power=(1 - Math.cos(this.chargeTime * Math.PI / this.chargePeakSeconds)) / 2;
    } else if (this.phase==='strike') {
      const a=this.strike, previous=a.time; a.time+=dt;
      if (!a.impacted && a.time >= HIT_AT) {
        a.impacted=true;
        // Judge the actual contact deadline, even if a frame spans it.
        if (before <= Math.max(0, HIT_AT-previous)) a.outcome={kind:'late',height:this.height,driven:0};
        this.onEvent('impact', a.outcome);
      }
      if (a.time >= STRIKE_END) {
        const result=a.outcome;
        this.height=result.height; this.result=result;
        this.remaining=Math.max(0,this.remaining-(result.kind==='miss'?HARD.missPenalty:result.kind==='bent'?HARD.bendPenalty:0));
        if (result.kind==='done' || result.kind==='bent') this.nails[this.active]=result.kind;
        this.phase='result'; this.resultTime=0;
        this.onEvent('result',result);
        if (this.remaining<=0 || this.resolved===NAIL_COUNT) this.finish();
      }
    } else if (this.phase==='result') {
      this.resultTime+=dt;
      if (this.resultTime >= 1.25) {
        if (this.nails[this.active] !== 'ready') { this.active++; this.height=START_HEIGHT; }
        this.phase='aim'; this.resetAim(); this.power=0; this.strike=null; this.result=null;
      }
    }
    if (this.remaining<=0 && this.phase!=='strike') this.finish();
  }
}
