import {clamp, HIT_AT, STRIKE_END} from './game.js';
const ease = t => 1 - Math.pow(1-clamp(t),3);
const mix = (a,b,t) => a + (b-a)*clamp(t);
export function strikePose(game) {
  const a=game.strike;
  if (game.phase!=='strike' || !a) return {height:game.height, hammerLift:64 + game.power*62, angle:-.18-game.power*.55, offset:game.phase==='power'?game.lockedAim:0, zoom:1, bend:game.nails[game.active]==='bent'?1:0, driven:0, impact:0};
  const t=a.time, drive=ease((t-HIT_AT-.045)/.65);
  const height=mix(a.startHeight,a.outcome.height,a.impacted?drive:0);
  const missed=['miss','late'].includes(a.outcome.kind);
  const contactHeight=missed ? 0 : a.startHeight;
  let hammerLift,angle;
  if(t<HIT_AT){const fall=Math.pow(t/HIT_AT,2.8);hammerLift=mix(64+a.power*62,0,fall);angle=mix(-.18-a.power*.55,0,fall);}
  else {const rebound=ease((t-HIT_AT-.04)/.26);hammerLift=45*rebound;angle=-.25*rebound;}
  const zoomIn=ease(t/.26),zoomOut=ease((t-1.18)/(STRIKE_END-1.18));
  return {height, hammerLift:hammerLift+(contactHeight-height)*1.3, angle, offset:missed?Math.sign(a.aim||1)*1.2:a.aim, zoom:1+.2*zoomIn*(1-zoomOut),bend:a.outcome.kind==='bent'?drive:0,driven:a.startHeight-height,impact:clamp((t-HIT_AT)/.6),missed};
}
export class Scene {
  constructor(canvas) { this.canvas=canvas; this.ctx=canvas.getContext('2d'); this.reduced=matchMedia('(prefers-reduced-motion: reduce)'); }
  resize() {
    const r=this.canvas.getBoundingClientRect();this.w=r.width;this.h=r.height;
    const dpr=Math.min(devicePixelRatio||1,2);
    if(this.canvas.width!==Math.round(r.width*dpr)||this.canvas.height!==Math.round(r.height*dpr)){this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);}
    this.dpr=dpr;
  }
  ellipse(x,y,rx,ry,fill,stroke){const c=this.ctx;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}}
  draw(game) {
    const c=this.ctx;if(!c||!this.w||!this.h)return;
    c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,this.w,this.h);
    const pose=strikePose(game),scale=Math.min(this.w/400,this.h/350),ground=Math.min(this.h*.72,this.h-128*scale);
    c.save();c.translate(this.w/2,ground);c.scale(scale,scale);
    if(!this.reduced.matches){c.translate(0,-50);c.scale(pose.zoom,pose.zoom);c.translate(0,50);}
    // The stage is drawn from geometry; no network, textures, 3D models or font downloads.
    this.ellipse(0,95,154,22,'#49301813');
    const bark=c.createLinearGradient(-140,0,140,0);bark.addColorStop(0,'#805135');bark.addColorStop(.24,'#b77d50');bark.addColorStop(.7,'#9b653d');bark.addColorStop(1,'#6d452e');
    c.fillStyle=bark;c.beginPath();c.moveTo(-140,0);c.lineTo(-133,84);c.bezierCurveTo(-95,124,100,126,135,82);c.lineTo(140,0);c.closePath();c.fill();
    c.lineWidth=3;
    for(let i=0;i<16;i++){const x=-128+i*17;c.strokeStyle=i%2?'#643e2c60':'#edbe7c40';c.beginPath();c.moveTo(x,9);c.bezierCurveTo(x+6,35,x-5,58,x+2,92-Math.abs(x)*.15);c.stroke();}
    this.ellipse(0,0,140,48,'#d6b17c','#8f653f');
    c.lineWidth=1.1;
    for(let i=0;i<6;i++)this.ellipse(-8+i,1,22+i*18,8+i*5.5,null,'#ae845245');
    c.strokeStyle='#91643c66';c.beginPath();c.moveTo(91,35);c.lineTo(72,20);c.lineTo(62,18);c.moveTo(-116,-20);c.lineTo(-87,-8);c.stroke();
    this.ellipse(0,2,18,5,'#77502d30');
    const y=-pose.height*1.3, bend=pose.bend*26;
    // A bent nail keeps its base embedded and bends only above the wood surface.
    const steel=c.createLinearGradient(-7,0,9,0);steel.addColorStop(0,'#656b6a');steel.addColorStop(.35,'#f1f1e8');steel.addColorStop(.7,'#b2b7b1');steel.addColorStop(1,'#626c6b');
    c.fillStyle=steel;c.strokeStyle='#515e5c';c.lineWidth=.8;
    c.beginPath();c.moveTo(-5,1);c.bezierCurveTo(-5,y*.45,bend-6,y*.8,bend-5,y);c.lineTo(bend+5,y);c.bezierCurveTo(bend+5,y*.8,5,y*.45,5,1);c.closePath();c.fill();c.stroke();
    this.ellipse(bend,y,17,5,game.nails[game.active]==='done'?'#729e7e':'#b7bfb8','#65716a');
    this.ellipse(bend-2,y-1,12,2,'#e3e9de');
    if(game.phase==='aim'){
      const aimX=game.aim*44;
      c.strokeStyle=Math.abs(game.aim)<.32?'#267556':'#b84916';c.lineWidth=2;
      c.beginPath();c.moveTo(aimX,y-29);c.lineTo(aimX,y-13);c.moveTo(aimX-8,y-21);c.lineTo(aimX+8,y-21);c.stroke();
      c.setLineDash([3,4]);c.lineWidth=1;c.beginPath();c.moveTo(aimX,y-10);c.lineTo(aimX,y+6);c.stroke();c.setLineDash([]);
    }
    const hx=pose.offset*44,hy=y-pose.hammerLift;
    if(game.phase!=='finished' || game.resolved===0){
      c.save();c.translate(hx,hy);c.rotate(pose.angle);
      const handle=c.createLinearGradient(22,-28,22,-13);handle.addColorStop(0,'#dcb981');handle.addColorStop(.5,'#ae7743');handle.addColorStop(1,'#80542e');
      c.fillStyle=handle;c.fillRect(10,-28,114,15);
      c.fillStyle='#373c39';c.beginPath();c.roundRect(93,-30,56,19,5);c.fill();
      c.strokeStyle='#545c55';c.lineWidth=1.2;for(let i=0;i<5;i++){c.beginPath();c.moveTo(102+i*8,-28);c.lineTo(97+i*8,-13);c.stroke();}
      const head=c.createLinearGradient(-16,-42,17,0);head.addColorStop(0,'#3a4442');head.addColorStop(.3,'#76817c');head.addColorStop(.52,'#b2bbb4');head.addColorStop(.72,'#5f6b65');head.addColorStop(1,'#39473f');
      c.fillStyle=head;c.strokeStyle='#34443a';c.lineWidth=1.2;c.beginPath();c.roundRect(-16,-45,32,44,4);c.fill();c.stroke();
      c.fillStyle='#aeb8ac';c.fillRect(-16,-6,32,5);c.fillStyle='#46514a';c.fillRect(-14,-46,28,6);c.restore();
    }
    if(game.phase==='strike'&&game.strike.impacted&&pose.impact>0&&pose.impact<1&&!this.reduced.matches){
      const t=pose.impact;c.globalAlpha=1-t;c.strokeStyle=pose.missed?'#a66a32':'#bd631f';c.lineWidth=2;
      for(let i=0;i<10;i++){const angle=i*.57+3.3,r=12+t*(24+i%3*10);const px=hx+Math.cos(angle)*r,py=(pose.missed?0:-game.strike.startHeight*1.3)+Math.sin(angle)*r+t*t*28;c.beginPath();c.moveTo(px,py);c.lineTo(px+Math.cos(angle)*5,py+Math.sin(angle)*5);c.stroke();}c.globalAlpha=1;
    }
    c.restore();
    return pose;
  }
}
