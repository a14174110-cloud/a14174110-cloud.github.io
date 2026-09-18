// ASCII-only strokes are arranged as a loose, drifting calligraphic hand.
const glyphs=" .,'`~/:;|\\^il";
const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
// Same fallback chain as media.js — keep both files in sync if you
// change the order. Backgrounds are served from the same GitHub repo
// (assets/background/bkg_*.png), so the same China-friendly mirror
// sequence applies:
//   jsdmirror.com → cdn.jsdelivr.net → yinzhu.site
const CDN_SOURCES=[
 {test:u=>u.includes('cdn.jsdmirror.com')||u.includes('cdn.jsdelivr.net'),build:u=>u.replace('cdn.jsdelivr.net','cdn.jsdmirror.com')},
 {test:u=>u.includes('cdn.jsdmirror.com')||u.includes('cdn.jsdelivr.net'),build:u=>u.replace('cdn.jsdmirror.com','cdn.jsdelivr.net')},
 {test:u=>/^https?:\/\//.test(u),build:u=>{try{const x=new URL(u);x.host='yinzhu.site';return x.toString();}catch{return '';}}}
];
function altUrl(url){
 for(const step of CDN_SOURCES){if(step.test(url)){const next=step.build(url);if(next&&next!==url)return next;}}
 return '';
}
function loadWithFallback(path,timeout=8000){
 const primary='https://cdn.jsdmirror.com/gh/a14174110-cloud/a14174110-cloud.github.io@main'+path;
 return new Promise((resolve,reject)=>{
  const tryLoad=(src)=>new Promise((ok,fail)=>{
   const img=new Image();
   let done=false;
   const finish=(fn)=>{if(done)return;done=true;fn();};
   img.onload=()=>finish(()=>ok(img));
   img.onerror=()=>finish(()=>fail());
   const timer=setTimeout(()=>finish(()=>fail()),timeout);
   const wOnload=img.onload,wOnerror=img.onerror;
   img.onload=()=>{clearTimeout(timer);wOnload();};
   img.onerror=()=>{clearTimeout(timer);wOnerror();};
   img.src=src;
  });
  let current=primary;
  (async()=>{
   while(true){
    try{
     const img=await tryLoad(current);
     resolve(img);
     return;
    }catch{
     const next=altUrl(current);
     if(!next){reject(new Error('all sources failed for '+path));return;}
     current=next;
    }
   }
  })();
 });
}
export class WaveField {
 constructor(canvas,still){
  this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.still=still;this.scene=0;this.sceneFrom=0;this.sceneTo=0;this.sceneMix=1;this.points=[];this.trail=[];this.last=0;this.elapsed=0;this.lastPointer=null;this.frame=0;this.pullStart=null;this.settleStart=null;this.meanCost=0;this.audioLevel=0;this.analyser=null;this.audioData=null;this.artOpacity=0;
  this.atlas=document.createElement('canvas');this.atlas.width=glyphs.length*16;this.atlas.height=26*5;
  const a=this.atlas.getContext('2d');a.font='italic 17px "Kaiti TC","HanziPen TC",serif';a.textBaseline='middle';
  ['#405348','#728278','#c2c9c0','#afeeee','#ffffff'].forEach((color,row)=>{a.fillStyle=color;for(let i=0;i<glyphs.length;i++){a.save();a.translate(i*16+8,row*26+13);a.rotate((i%5-2)*.055);a.fillText(glyphs[i],-4,0);a.restore();}});
  this.artCanvas=document.createElement('canvas');this.artCanvas.width=180;this.artCanvas.height=240;this.artCtx=this.artCanvas.getContext('2d',{willReadFrequently:true});this.artData=null;this.artImage=null;this.homeImage=null;this.homeCanvas=document.createElement('canvas');this.homeCtx=this.homeCanvas.getContext('2d',{willReadFrequently:true});this.homeData=null;this.contactImage=null;this.contactCanvas=document.createElement('canvas');this.contactCanvas.width=180;this.contactCanvas.height=240;this.contactCtx=this.contactCanvas.getContext('2d',{willReadFrequently:true});this.contactData=null;this.loadArtwork();this.loadHomeArtwork();this.loadContactArtwork();
  this.resize();this.onResize=()=>this.resize();window.addEventListener('resize',this.onResize);window.YinZhuAudioInput={connect:stream=>this.connectAudio(stream),disconnect:()=>this.disconnectAudio()};
  window.addEventListener('pointermove',e=>this.pointer(e),{passive:true});
  window.addEventListener('archive:motion',e=>{this.still=e.detail;this.drawOnce=true;});
  window.addEventListener('archive:release',()=>{if(!this.still)this.startRelease();});
  window.addEventListener('archive:entered',()=>{this.pullStart=null;this.settleStart=null;this.drawOnce=true;});
  this.tick=this.tick.bind(this);this.frame=requestAnimationFrame(this.tick);
 }
 resize(){
  this.w=innerWidth;this.h=innerHeight;
  // Mobile gets a lower DPR cap to keep the ASCII sea rendering at 60fps;
  // the canvas still covers the viewport but each glyph rasterises with
  // fewer pixels, trading sub-pixel crispness for steady frame timing.
  const dprCap=innerWidth<800?1:1.35;
  const dpr=Math.min(devicePixelRatio||1,dprCap);
  this.canvas.width=Math.round(this.w*dpr);this.canvas.height=Math.round(this.h*dpr);this.ctx.setTransform(dpr,0,0,dpr,0,0);
  const cols=Math.min(172,Math.max(64,Math.floor(this.w/8))),rows=this.w<650?54:68;
  this.points=[];
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++)this.points.push({u:col/(cols-1),v:row/(rows-1),seed:hash(row*cols+col),ox:0,oy:0,vx:0,vy:0,homeGlow:0});
  this.drawOnce=true;
 }
 loadArtwork(){
  loadWithFallback('/assets/background/bkg_1.png').then(image=>{
   // Use the source image's natural resolution for the working canvas so the
   // calligraphy doesn't get squished into 180×240 and then upscaled back to
   // viewport size — that's what made it look blurry. artCanvas now mirrors
   // bkg_1.png 1:1 and drawArtworkBase scales it (contain) to the viewport.
   this.artCanvas.width=image.naturalWidth;
   this.artCanvas.height=image.naturalHeight;
   this.artImage=image;
   this.artCtx.fillStyle='#000';
   this.artCtx.fillRect(0,0,this.artCanvas.width,this.artCanvas.height);
   this.artCtx.drawImage(image,0,0,this.artCanvas.width,this.artCanvas.height);
   this.artData=this.artCtx.getImageData(0,0,this.artCanvas.width,this.artCanvas.height).data;
   this.artDisplay=this.artCanvas;
   this.drawOnce=true;
   this._markLoaded();
  }).catch(()=>{console.warn('bkg_1.png 加载失败（作品总览）');this._markLoaded();});
 }
 loadHomeArtwork(){
  loadWithFallback('/assets/background/bkg_1.png').then(image=>{
   this.homeImage=image;
   // Match the source resolution 1:1 (previously 240px wide — caused blur).
   this.homeCanvas.width=image.naturalWidth;
   this.homeCanvas.height=image.naturalHeight;
   // bkg_1.png is supplied black-bg/white-text, so fill the working canvas
   // black to match the source before drawing. Bake an inverted (white-bg/
   // black-text) copy so the existing ink formula (.9 - luma) / .9 still
   // places ink at the original text strokes.
   this.homeCtx.fillStyle='#000';
   this.homeCtx.fillRect(0,0,this.homeCanvas.width,this.homeCanvas.height);
   this.homeCtx.drawImage(image,0,0,this.homeCanvas.width,this.homeCanvas.height);
   this.homeDisplay=this.bakeInverted(this.homeCanvas);
   this.homeData=this.homeDisplay.getContext('2d').getImageData(0,0,this.homeDisplay.width,this.homeDisplay.height).data;
   this.drawOnce=true;
   this._markLoaded();
  }).catch(()=>{console.warn('bkg_1.png 加载失败');this._markLoaded();});
 }
 loadContactArtwork(){
  loadWithFallback('/assets/background/bkg_2.png').then(image=>{
   // Same 1:1 resolution fix — previous 180×240 canvas caused severe blur.
   this.contactCanvas.width=image.naturalWidth;
   this.contactCanvas.height=image.naturalHeight;
   this.contactImage=image;
   // bkg_2.png is supplied black-bg/white-text, same as bkg_1.png — no need
   // to invert, the canvas can be displayed directly as the contact page
   // background. We still capture pixel data for potential downstream use.
   this.contactCtx.fillStyle='#000';
   this.contactCtx.fillRect(0,0,this.contactCanvas.width,this.contactCanvas.height);
   this.contactCtx.drawImage(image,0,0,this.contactCanvas.width,this.contactCanvas.height);
   this.contactData=this.contactCtx.getImageData(0,0,this.contactCanvas.width,this.contactCanvas.height).data;
   this.contactDisplay=this.contactCanvas;
   this.drawOnce=true;
   this._markLoaded();
  }).catch(()=>{console.warn('bkg_2.png 加载失败');this._markLoaded();});
 }
 // Pre-bake a white-on-black inverted version of the source canvas so we
 // don't rely on canvas filter: invert(1) — that property is inconsistent
 // across browsers in deployment environments and was leaving the artwork
 // as the original white-bg/black-text. Manual pixel inversion runs once
 // at load time and is universally supported.
 bakeInverted(src){
  const dst=document.createElement('canvas');
  dst.width=src.width;dst.height=src.height;
  const c=dst.getContext('2d');
  c.drawImage(src,0,0);
  const imgData=c.getImageData(0,0,dst.width,dst.height);
  const d=imgData.data;
  for(let i=0;i<d.length;i+=4){
   d[i]=255-d[i];d[i+1]=255-d[i+1];d[i+2]=255-d[i+2];
  }
  c.putImageData(imgData,0,0);
  return dst;
 }
 _markLoaded(){
  this._loadedCount=(this._loadedCount||0)+1;
  if(this._loadedCount>=3){
   window.dispatchEvent(new CustomEvent('archive:artwork-ready'));
  }
 }
 artworkBounds(W,H){
  // Scene 2 (contact) must respect the fixed top header (~90px) and the
  // bottom contact bar (~100px); cap the calligraphy to the remaining
  // vertical window so the ink never bleeds behind those chrome bars.
  const isContact=this.scene===2;
  const maxW=isContact?W*.7:W*.9;
  const maxH=isContact?Math.max(160,H+80):H*.9;
  const aspect=this.artCanvas.width/this.artCanvas.height;
  let width=maxW,height=width/aspect;
  if(height>maxH){height=maxH;width=height*aspect;}
  // Pages 1 (home) and 2 (works) shift the calligraphy 30px down so the
  // hero copy and constellation cluster sit above it; page 3 (contact)
  // sits 25px lower so the centered copy balances against the displaced
  // ink without crowding the eyebrow line.
  const topOffset=this.scene<=1?30:25;
  return{left:(W-width)*.5,top:(H-height)*.5+topOffset,width,height};
 }
 artworkInk(x,y,W,H){
  if(!this.artData)return 0;const b=this.artworkBounds(W,H),u=(x-b.left)/b.width,v=(y-b.top)/b.height;
  if(u<0||u>=1||v<0||v>=1)return 0;const sx=Math.min(this.artCanvas.width-1,Math.floor(u*this.artCanvas.width)),sy=Math.min(this.artCanvas.height-1,Math.floor(v*this.artCanvas.height)),n=(sy*this.artCanvas.width+sx)*4;
  const luma=(this.artData[n]*.299+this.artData[n+1]*.587+this.artData[n+2]*.114)/255;return Math.max(0,(.9-luma)/.9);
 }
 drawArtworkBase(ctx,W,H,opacity){
  const pickImg=s=>s===2?this.contactDisplay||null:this.artDisplay||null;
  const drawOne=(img,alpha)=>{
   if(!img||alpha<.002)return;let b;
   if(img===this.contactDisplay){const nw=this.contactImage.naturalWidth,nh=this.contactImage.naturalHeight;const scale=Math.min(W/nw,H/nh);const w=nw*scale,h=nh*scale;b={left:(W-w)/2,top:(H-h)/2,width:w,height:h};}else{b=this.artworkBounds(W,H);}
   ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=alpha;ctx.drawImage(img,b.left,b.top,b.width,b.height);ctx.restore();
  };
  const oldImg=pickImg(this.sceneFrom);const newImg=pickImg(this.sceneTo);const mix=this.sceneMix;
  if(mix<1&&oldImg&&newImg&&oldImg!==newImg){drawOne(oldImg,opacity*(1-mix));drawOne(newImg,opacity*mix);}else{drawOne(newImg,opacity);}
 }
 homeArtworkBounds(W,H){
  if(!this.homeImage)return{left:0,top:0,width:W,height:H};const scale=Math.max(W/this.homeImage.naturalWidth,H/this.homeImage.naturalHeight),width=this.homeImage.naturalWidth*scale,height=this.homeImage.naturalHeight*scale;return{left:(W-width)*.5,top:(H-height)*.5,width,height};
 }
 homeArtworkInk(x,y,W,H){
  if(!this.homeData)return 0;const b=this.homeArtworkBounds(W,H),u=(x-b.left)/b.width,v=(y-b.top)/b.height;if(u<0||u>=1||v<0||v>=1)return 0;
  const sx=Math.min(this.homeCanvas.width-1,Math.floor(u*this.homeCanvas.width)),sy=Math.min(this.homeCanvas.height-1,Math.floor(v*this.homeCanvas.height)),n=(sy*this.homeCanvas.width+sx)*4,luma=(this.homeData[n]*.299+this.homeData[n+1]*.587+this.homeData[n+2]*.114)/255;return Math.max(0,(.9-luma)/.9);
 }
 setScene(scene){if(scene!==this.scene){this.sceneFrom=this.scene;this.sceneTo=scene;this.sceneMix=0;}this.scene=scene;this.drawOnce=true;}
 connectAudio(stream){try{this.disconnectAudio();const context=new AudioContext(),source=context.createMediaStreamSource(stream),analyser=context.createAnalyser();analyser.fftSize=256;source.connect(analyser);this.audioContext=context;this.audioSource=source;this.analyser=analyser;this.audioData=new Uint8Array(analyser.fftSize);return true;}catch(error){console.warn('Audio input unavailable',error);return false;}}
 disconnectAudio(){this.audioSource?.disconnect();this.audioContext?.close();this.audioContext=null;this.audioSource=null;this.analyser=null;this.audioData=null;this.audioLevel=0;}
 pointer(e){
  if(this.still)return;
  const now=performance.now(),old=this.lastPointer||{x:e.clientX,y:e.clientY,t:now};
  const dx=e.clientX-old.x,dy=e.clientY-old.y,speed=Math.min(45,Math.hypot(dx,dy));
  if(now-old.t>14&&speed>1){this.trail.push({x:e.clientX,y:e.clientY,dx,dy,life:1,power:Math.min(1,speed/22)});if(this.trail.length>12)this.trail.shift();this.lastPointer={x:e.clientX,y:e.clientY,t:now};}
  else if(!this.lastPointer)this.lastPointer={x:e.clientX,y:e.clientY,t:now};
 }
 sprite(ctx,g,color,x,y,scale=1){ctx.drawImage(this.atlas,g*16,color*26,16,26,x,y,16*scale,26*scale);}
 startRelease(){
  // The camera move from the close-up sea to the global view is now
  // orchestrated in CSS (entrance-immersed → entrance-releasing), so the
  // wave field itself stays at scale 1 — this removes the visible
  // pull-then-settle pump that previously snapped the first page.
  this.drawOnce=true;
 }
 tick(now){
  this.frame=requestAnimationFrame(this.tick);
  if(document.hidden)return;
  if(this.still&&!this.drawOnce)return;
  const start=performance.now(),dt=Math.min(.035,(now-(this.last||now))/1000||.016);this.last=now;this.elapsed+=this.still?0:dt;this.drawOnce=false;
  if(this.analyser){this.analyser.getByteTimeDomainData(this.audioData);let energy=0;for(let i=0;i<this.audioData.length;i+=4)energy+=Math.abs(this.audioData[i]-128)/128;this.audioLevel=this.audioLevel*.78+(energy/(this.audioData.length/4))*.22;}const ctx=this.ctx,t=this.elapsed,W=this.w,H=this.h;
  let cameraScale=1,cameraAlpha=1;
  if(this.pullStart){const p=Math.min(1,(now-this.pullStart)/1250),e=1-Math.pow(1-p,3);cameraScale=1+e*.62;cameraAlpha=1-e*.42;}
  else if(this.settleStart){const p=Math.min(1,(now-this.settleStart)/900),e=1-Math.pow(1-p,3);cameraScale=1.62-(.62*e);cameraAlpha=.58+.42*e;if(p===1)this.settleStart=null;}
  // Crossfade between scene artworks when scene changes (e.g.
  // works→contact). sceneMix eases from 0→1 over ~1.2s with cubic
  // ease-out, matching the .panels slide rhythm so the page-2→page-3
  // transition reads as one motion. The two image layers (oldImg +
  // newImg) are composited in drawArtworkBase using mix as the mix.
  this.sceneMix=Math.min(1,this.sceneMix+dt/1.2);
  // Three-level calligraphy opacity: 0.15 on the home page, 0.20 on
  // the works overview, 0.30 on the contact page — bumped from 0.18
  // because the dark canvas fill (#090a0b) was swallowing the ink
  // texture. 0.30 keeps the foreground "信號流通 / Signal Flow"
  // copy legible while letting the white-on-black calligraphy read
  // clearly behind it. The drawArtworkBase pipeline still inverts
  // the source asset for black-background-white-text appearance.
  // Easing rate dropped from 3 to 1.6 so the depth change settles
  // over ~1.5s and stays in lock-step with the artwork crossfade.
  const artTarget=this.scene===0?.15:this.scene===1?.2:.18;
  this.artOpacity+=(artTarget-this.artOpacity)*(1-Math.exp(-dt*1.6));
  ctx.globalAlpha=1;ctx.fillStyle='#090a0b';ctx.fillRect(0,0,W,H);this.drawArtworkBase(ctx,W,H,this.artOpacity);
  this.trail=this.trail.filter(q=>q.life>.04);for(const q of this.trail){q.life-=dt*.95;q.x+=q.dx*dt*.28+dt*12;q.y+=q.dy*dt*.2;}
  const flow=t*.15,dim=this.scene===0?1:this.scene===1?.42:.12,synthetic=.5+.5*Math.sin(flow*.73),signal=Math.min(1,this.audioLevel*3.5+synthetic*.36),faultPulse=Math.max(0,Math.sin(flow*.11)-.955)/.045,faultX=.5+Math.sin(flow*.071)*.24,faultY=.52+Math.cos(flow*.053)*.2;
  for(let i=0;i<this.points.length;i++){
   const p=this.points[i],u=p.u,v=p.v,phase=u*8-v*4;
   const broad=Math.sin(phase+flow*(.65+signal*.5)),cross=Math.sin(u*15+v*9-flow*(.48+signal*.7)),fine=Math.sin(u*31-v*9+flow*(1.2+signal*1.6)),burst=Math.sin(u*3.2-flow*1.7+v*12)*signal;
   let x=(u*1.2-.1)*W+Math.sin(v*7+flow*.38)*(28+v*48)+cross*signal*24;
   let y=H*.22+Math.pow(v,1.33)*H*.74+(broad*(72+signal*72)+cross*(26+signal*34)+fine*(11+signal*18)+burst*36)*(0.28+v*.95);
   let force=0,fx=0,fy=0;
   for(const q of this.trail){const dx=x-q.x,dy=y-q.y,d2=dx*dx+dy*dy,rad=110+q.power*75;if(d2<rad*rad){const fall=(1-d2/(rad*rad))*q.life;force=Math.max(force,fall);fx+=(-dy*.025+q.dx*.14)*fall;fy+=(dx*.025+q.dy*.12)*fall;}}
   if(!this.still){const step=dt*60;p.vx+=(fx*.1-p.ox*.035)*step;p.vy+=(fy*.1-p.oy*.035)*step;p.vx*=Math.pow(.88,step);p.vy*=Math.pow(.88,step);p.ox+=p.vx*step;p.oy+=p.vy*step;}
   x+=p.ox;y+=p.oy;x=W*.5+(x-W*.5)*cameraScale;y=H*.5+(y-H*.5)*cameraScale;
   const crest=(Math.cos(phase+flow*(.65+signal*.5))+1)*.5,ink=this.artworkInk(x,y,W,H)*(this.artOpacity/.2),homeInk=this.scene===0?this.homeArtworkInk(x,y,W,H):0,wavePass=crest*.7+Math.max(0,cross)*.24+signal*.12,homeTarget=homeInk>.1&&(wavePass>.61||force>.08);
   p.homeGlow=homeTarget?1:Math.max(0,p.homeGlow-dt*.2);const homeGlow=p.homeGlow*homeInk;
   const visibility=.09+crest*.66+cross*.09+signal*.11;
   if((this.scene===0&&homeInk>.1&&homeGlow<.015&&force<.15)||(this.scene!==0&&((ink>.1&&wavePass<.63&&force<.15)||(ink<=.1&&p.seed>visibility&&force<.15)))||(this.scene===0&&homeInk<=.1&&p.seed>visibility&&force<.15))continue;
   const shimmer=(Math.sin(flow*(.6+signal)+p.seed*10)+1)*.5;
   let g=1+Math.floor((crest*.6+p.seed*.3+shimmer*.1)*9),color=crest>.76?2:crest>.35?1:0;
   const disorder=Math.max(force*(.4+p.seed*.6),Math.max(0,signal-.55)*p.seed*.72);
   const localFault=faultPulse*Math.max(0,1-Math.hypot(u-faultX,v-faultY)*9);
   // Distance from this glyph to the moving fault centre. Used to mark a
   // very small "core" (atlas row 4, #ffffff) at the absolute centre of
   // every glitch pulse — the bright white point the glitch emanates from.
   const coreDist=Math.hypot(u-faultX,v-faultY);
   // Multi-octave sine noise. Three frequencies added (with non-integer
   // ratios) so the per-glyph shake never repeats — looks chaotic instead
   // of periodic. Max combined amplitude ≈ 2.15.
   const noisy=(s,fl,sc)=>(Math.sin(s*137.1+fl*9.3)+Math.sin(s*211.7-fl*17.7)*.7+Math.sin(s*53.3+fl*31.1)*.45)*sc;
   // Core: widened from 0.018 to 0.045 in normalized space (~2.5% of the
   // canvas area, ~2-3 glyphs across) so the bright white centre is clearly
   // readable when the glitch fires. Still small enough to read as a
   // defined "spot" rather than a wash. localFault threshold lowered
   // from 0.3 to 0.18 so the core appears more frequently, not only at
   // glitch peaks.
   if(coreDist<0.045&&localFault>.18)color=4;
   // Disorder path: lower threshold so glitches trigger more often, and
   // shake is wider + slightly vertical for an actual "tear" feel rather
   // than a pure horizontal jitter. Amplitude is bounded by `disorder`
   // (max ≈ 0.45) so scope stays within ~30px.
   if(disorder>.14){g=1+((i*7+Math.floor(flow*22))%(glyphs.length-1));if(p.seed>.78)color=3;const dx=noisy(p.seed,flow,30)*disorder;const dy=noisy(p.seed+.31,flow,5)*disorder;x+=dx;y+=dy;}
   // Local-fault path: a hard punch at the fault centre. The per-glyph
   // displacement is hard-capped at ±55px so individual characters cannot
   // tear past the canvas edge and break the surrounding layout. The
   // punch fades with distance from the fault centre via `localFault`.
   if(localFault>.12){color=3;g=1+((i+Math.floor(flow*22))%(glyphs.length-1));const punch=Math.min(55,localFault*72);const dx=(p.seed-.5)*punch*2;const dy=noisy(p.seed+.71,flow,4)*localFault;x+=dx;y+=dy;}
   if(ink>.1&&wavePass>.63){color=3;g=1+Math.min(glyphs.length-2,Math.floor(ink*(glyphs.length-1)+shimmer*2));}
   if(homeGlow>=.015){color=3;g=1+Math.min(glyphs.length-2,Math.floor(homeInk*(glyphs.length-1)+shimmer*2));}
   ctx.globalAlpha=homeGlow>=.015?dim*homeGlow*cameraAlpha:ink>.1&&wavePass>.63?dim*.5*cameraAlpha:dim*(.18+v*.35+crest*.18+force*.25)*cameraAlpha;
   // Match the artwork's per-scene downward shift (30px on scenes 0/1,
   // 25px on scene 2) so the glyphs track the displaced calligraphy ink
   // instead of staying put.
   const glyphY=this.scene<=1?y+30:y+25;
   this.sprite(ctx,g,color,x,glyphY,.82+v*.25);
  }
  ctx.globalAlpha=1;
  const cost=performance.now()-start;this.meanCost=this.meanCost*.97+cost*.03;
  // Diagnostics available to local QA; no telemetry or external reporting.
  if(Math.floor(now/1000)!==this.reportSecond){this.reportSecond=Math.floor(now/1000);this.canvas.dataset.frameMs=String(Math.round(this.meanCost*100)/100);this.canvas.dataset.glyphs=String(this.points.length);}
 }
}
