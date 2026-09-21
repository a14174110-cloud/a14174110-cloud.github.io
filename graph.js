import {mountMedia} from './media.js';
const ns='http://www.w3.org/2000/svg';
const mix=(a,b,t)=>a+(b-a)*t;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class Constellation {
 constructor(panel,categories,works,still,lang){
  this.panel=panel;this.viewport=panel.querySelector('.graph-viewport');this.scene=panel.querySelector('.graph-scene');this.svg=panel.querySelector('.connections');this.core=panel.querySelector('.core-wrap');
  this.groups=[];this.camera={x:0,y:0,scale:.6};this.selected=null;this.still=still;this.visible=false;this.drag=null;this.last=0;this.frame=0;this.needsDraw=true;this.abort=new AbortController();const signal=this.abort.signal;
  this.lang=lang||'zh';
  const loc=(zh,en)=>this.lang==='en'?en:zh;
  this.look={x:0,y:0,tx:0,ty:0};
  this.viewport.addEventListener('pointermove',e=>{const r=this.viewport.getBoundingClientRect();this.look.tx=(e.clientX-r.left)/r.width*2-1;this.look.ty=(e.clientY-r.top)/r.height*2-1;},{signal,passive:true});
  this.viewport.addEventListener('pointerleave',()=>{this.look.tx=0;this.look.ty=0;},{signal});
  categories.forEach((cat,ci)=>{
   const el=document.createElement('div');el.className='graph-group';el.dataset.group=cat.id;
   // In each language the dominant label is the language's native script;
   // the other script slips into the meta line as a small bilingual hint.
   const nameLoc=loc(cat.name,cat.en),subLoc=loc(cat.en,cat.name);
   const ariaLoc=loc(`${cat.name}，${cat.works.length}件作品，点击聚焦或拖拽移动`,`${cat.en}, ${cat.works.length} works, click to focus or drag to move`);
   // Each category title is rendered as two stacked lines so the
   // style nodes look like concise labels instead of inline strings.
   // Chinese names split on " / ", English names split on " & ".
   const nameLines=nameLoc.split(/\s*[/\&]\s*/).join('<br>');
   el.innerHTML=`<button type="button" class="category" data-category="${cat.id}" aria-label="${ariaLoc}" aria-pressed="false"><span class="glyph">${cat.glyph}</span><h2>${nameLines}</h2><span class="category-meta">${subLoc} / ${String(cat.works.length).padStart(2,'0')}</span></button>`;
   this.scene.appendChild(el);
   const group={...cat,el,button:el.querySelector('button'),base:{x:cat.x,y:cat.y},pos:{x:cat.x,y:cat.y},depth:[-70,45,115,5][ci],velocity:{x:0,y:0},children:[],phase:ci*1.7,line:this.line(false),dragged:false,suppressClick:false};
   cat.works.forEach((id,i)=>{
    const work={...works.find(w=>w.id===id),index:works.findIndex(w=>w.id===id)};
    // Work nodes: prefer the *En counterpart for h3/year/summary in English mode,
    // fall back to the Chinese fields if the field is missing for this work.
    const nodeTitle=loc(work.title,work.titleEn||work.title);
    const nodeYear=loc(work.year,work.yearEn||work.year);
    const nodeShort=loc(work.short,work.shortEn||work.short);
    const nodeAria=loc(`${work.title}，打开作品详情`,`${nodeTitle}, open work details`);
    const node=document.createElement('a');node.className='work-node';node.href=`#/works/${work.id}`;node.dataset.work=work.id;node.setAttribute('aria-label',nodeAria);
    node.innerHTML=`<div class="media"></div><h3>${nodeTitle}</h3><div class="work-year">${nodeYear}</div><p class="work-summary">${nodeShort}</p>`;
    el.appendChild(node);mountMedia(node.querySelector('.media'),work);
    // A controlled orbit leaves each title and image its own space.
    const side=cat.x<0?-1:1;
    const overview=cat.works.length===1?{x:side*195,y:18}:[{x:side*210,y:-145},{x:-side*95,y:-170},{x:side*210,y:90}][i];
    const child={el:node,work,overview,offset:{...overview},line:this.line(true)};
    group.children.push(child);
    node.addEventListener('click',e=>{
     if(this.selected!==group){e.preventDefault();this.focus(group);return;}
     if(matchMedia('(hover:none)').matches&&!node.classList.contains('revealed')){e.preventDefault();node.classList.add('revealed');}
    },{signal});
    node.addEventListener('dragstart',e=>e.preventDefault(),{signal});
   });
   group.button.addEventListener('pointerdown',e=>this.down(e,group),{signal});
   group.button.addEventListener('pointermove',e=>this.move(e),{signal});
   group.button.addEventListener('pointerup',e=>this.up(e),{signal});
   group.button.addEventListener('pointercancel',()=>this.cancelDrag(),{signal});
   group.button.addEventListener('lostpointercapture',()=>this.cancelDrag(),{signal});
   group.button.addEventListener('click',e=>{if(group.suppressClick){e.preventDefault();return;}this.focus(group);},{signal});
   group.button.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)||!e.shiftKey)return;
    e.preventDefault();group.base.x+=e.key==='ArrowRight'?20:e.key==='ArrowLeft'?-20:0;group.base.y+=e.key==='ArrowDown'?20:e.key==='ArrowUp'?-20:0;this.needsDraw=true;
   },{signal});
   this.groups.push(group);
  });
  // Quiet content affinities between individual works, rendered behind the
  // signal map. Tier = relation strength: 1 same-category siblings, 2 explicit
  // cross-category bridges already declared by the practice, 3 implied
  // affinities that only emerge when the whole field is read together.
  this.workById=new Map(this.groups.flatMap(group=>group.children.map(child=>[child.work.id,child])));
  this.relations=[
   // Tier 1 — same category, intrinsic siblings
   ['test-001','rule-writing',1],['test-001','two-string',1],
   ['rule-writing','two-string',1],['mourning-theater','demand-interface',1],
   ['mount-burnout','bak',1],
   // Tier 2 — explicit cross-category bridges
   ['rule-writing','mount-burnout',2],['rule-writing','bak',2],
   ['mourning-theater','bak',2],['demand-interface','bak',2],
   ['light-record','bak',2],
   // Tier 3 — implied cross-category affinities (ambient / background)
   ['test-001','mourning-theater',3],['two-string','demand-interface',3],
   ['mount-burnout','demand-interface',3],['light-record','mourning-theater',3],
   ['light-record','rule-writing',3],['light-record','mount-burnout',3]
  ].map(([a,b,tier])=>{const from=this.workById.get(a),to=this.workById.get(b);const path=this.relationLine();path.dataset.strength=String(tier);return {from,to,path,tier};});
  panel.querySelector('#overview').addEventListener('click',()=>this.overview(),{signal});
  this.definition=panel.querySelector('.core-definition');this.core.querySelector('button').addEventListener('click',()=>{this.definition.hidden=false;requestAnimationFrame(()=>this.definition.classList.add('visible'));},{signal});
  this.definition.querySelector('button').addEventListener('click',()=>this.closeDefinition(),{signal});
  this.viewport.addEventListener('pointerup',e=>{if(!this.definition.hidden){this.closeDefinition();return;}if(this.selected&&!e.target.closest?.('.category,.work-node,.core'))this.overview();},{signal});
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&this.visible)this.overview();},{signal});
  window.addEventListener('archive:motion',e=>{this.still=e.detail;this.needsDraw=true;},{signal});
  this.resizeObserver=new ResizeObserver(()=>{this.resize();});this.resizeObserver.observe(this.viewport);this.resize();
  const field=new URLSearchParams(location.hash.split('?')[1]||'').get('field');if(field){const group=this.groups.find(g=>g.id===field);if(group)this.focus(group);}
  this.tick=this.tick.bind(this);this.frame=requestAnimationFrame(this.tick);
 }
 get focused(){return !!this.selected;}
 line(child){const path=document.createElementNS(ns,'path'),text=document.createElementNS(ns,'text'),textPath=document.createElementNS(ns,'textPath');const id=`signal-${Math.random().toString(36).slice(2)}`;path.id=id;if(child){path.classList.add('child-link');text.classList.add('child-link');}else{path.classList.add('group-signal');}textPath.setAttribute('href',`#${id}`);textPath.textContent=child?' · 0 1 > · 0 1 > · 0 1 > ':' · : > > + · : > > + · : > > + ';text.appendChild(textPath);this.svg.append(path,text);return {path,text,textPath,phase:Math.random()*100};}
 relationLine(){const path=document.createElementNS(ns,'path');path.classList.add('relation-link');this.svg.prepend(path);return path;}
 resize(){
  this.w=this.viewport.clientWidth;this.h=this.viewport.clientHeight;
  const layout='desktop';
  this.fit=Math.min(this.w/1510,this.h/810,1.2);
  // The focused view zooms in past `fit` (see tick: targetScale uses
  // this.w/990 instead of this.fit). Reserve enough scene-space for a
  // child at its orbit radius (~305) plus half a work-node (~90px after
  // translate(-50%,-50%)), so the whole cluster always stays inside the
  // viewport on narrow phones. Caps clamp to the desktop envelope so the
  // initial asymmetric layout (x:±455, y:±285) is still reachable on
  // larger screens.
  const focusedScale=Math.min(this.w/990,this.h/790,1.18);
  const useScale=Math.max(this.fit,focusedScale);
  this.bounds={
   x:clamp((this.w/2)/useScale-395,260,740),
   y:clamp((this.h/2)/useScale-180,220,470)
  };
  if(layout!==this.layout){
   this.layout=layout;
   this.panel.dataset.layout=layout;
   this.groups.forEach((g,gi)=>{
    const side=g.x<0?-1:1,top=gi<2;
    const asymmetric=[{x:-430,y:-175},{x:245,y:-270},{x:215,y:300},{x:-300,y:285}][gi];
    g.base={...asymmetric};
    g.children.forEach((c,i)=>{
     c.overview=g.children.length===1?{x:side*195,y:18}:[{x:side*210,y:-145},{x:-side*95,y:-170},{x:side*210,y:90}][i];
    });
   });
  }
  this.needsDraw=true;
 }
 setVisible(value){this.visible=value;this.needsDraw=true;}
 closeDefinition(){this.definition.classList.remove('visible');setTimeout(()=>{this.definition.hidden=true;},220);}
 focus(group){
  this.selected=group;this.needsDraw=true;this.panel.classList.add('focused');
  this.panel.querySelector('#graph-heading').textContent=this.lang==='en'?group.en:group.name;
  this.panel.querySelector('#overview').hidden=false;
  this.panel.querySelector('#graph-instruction').innerHTML=this.lang==='en'?'Hover image to reveal; click to enter work.<br>Drag category to move the group.':'悬停图片，显露原图；点击进入作品。<br>拖动分类，移动整组作品。';
  this.core.classList.add('faded');this.core.inert=true;
  for(const g of this.groups){const active=g===group;g.el.classList.toggle('faded',!active);g.el.inert=!active;g.button.classList.toggle('selected',active);g.button.setAttribute('aria-pressed',String(active));this.selectLine(g.line,active);for(const c of g.children){c.el.classList.toggle('active',active);this.selectLine(c.line,active);}}
 }
 overview(){
  this.selected=null;this.needsDraw=true;this.panel.classList.remove('focused');this.panel.querySelector('#graph-heading').textContent=this.lang==='en'?'Paths of Perception':'感知的不同路徑';this.panel.querySelector('#overview').hidden=true;
  this.panel.querySelector('#graph-instruction').innerHTML=this.lang==='en'?'Drag category to move the group.<br>Select category to enter its field.':'拖动分类，移动整组作品。<br>选择分类，进入其感知范围。';this.core.classList.remove('faded');this.core.inert=false;
  for(const g of this.groups){g.el.classList.remove('faded');g.el.inert=false;g.button.classList.remove('selected');g.button.setAttribute('aria-pressed','false');this.selectLine(g.line,false);for(const c of g.children){c.el.classList.remove('active','revealed');this.selectLine(c.line,false);}}
 }
 down(e,group){if(e.button!==0)return;e.preventDefault();this.drag={id:e.pointerId,g:group,startX:e.clientX,startY:e.clientY,baseX:group.base.x,baseY:group.base.y,lastX:e.clientX,lastY:e.clientY,lastTime:performance.now(),moved:false};group.velocity.x=0;group.velocity.y=0;group.button.setPointerCapture(e.pointerId);this.needsDraw=true;}
 move(e){
  const d=this.drag;if(!d||d.id!==e.pointerId)return;
  const dx=e.clientX-d.startX,dy=e.clientY-d.startY;
  if(Math.hypot(dx,dy)>6)d.moved=true;
  if(!d.moved)return;
  // Convert pointer displacement to scene coordinates, including camera zoom.
  const dragScale=this.camera.scale*(d.g.projectionScale||1);
  d.g.base.x=clamp(d.baseX+dx/dragScale,-this.bounds.x,this.bounds.x);d.g.base.y=clamp(d.baseY+dy/dragScale,-this.bounds.y,this.bounds.y);
  const now=performance.now(),elapsed=Math.max(8,now-d.lastTime);d.g.velocity.x=((e.clientX-d.lastX)/elapsed*16)/this.camera.scale;d.g.velocity.y=((e.clientY-d.lastY)/elapsed*16)/this.camera.scale;d.lastX=e.clientX;d.lastY=e.clientY;d.lastTime=now;
  this.needsDraw=true;
 }
 up(e){const d=this.drag;if(!d||d.id!==e.pointerId)return;this.drag=null;d.g.suppressClick=d.moved;d.g.button.releasePointerCapture(e.pointerId);if(!d.moved)this.focus(d.g);else setTimeout(()=>{d.g.suppressClick=false;},0);this.needsDraw=true;}
 cancelDrag(){this.drag=null;this.needsDraw=true;}
 orbit(group,i){
  if(this.selected!==group)return group.children[i].overview;
  const n=group.children.length;
  // Focused orbit radius. Desktop (w≥700) keeps the full radius. On
  // narrow phones, the camera already scales the whole scene down to
  // ~w/990, so the orbit in *screen* pixels shrinks naturally — but
  // shrinking it further with s<0.85 makes the work-nodes overlap the
  // category button (which on a 390px screen projects to ~110px wide).
  // Floor of 0.85 keeps children ≥100px clear of the category edge.
  const s=clamp(this.w/700,0.85,1);
  return n===1?{x:290*s,y:0}:n===2?[{x:-305*s,y:80},{x:305*s,y:80}][i]:[{x:-310*s,y:40},{x:240*s,y:-200},{x:240*s,y:185}][i];
 }
 tick(now){
  this.frame=requestAnimationFrame(this.tick);
  if(document.hidden||(!this.visible&&!this.needsDraw))return;
  const dt=Math.min(.045,(now-(this.last||now))/1000||.016);this.last=now;
  const lerp=this.still?1:1-Math.exp(-8*dt);
  const targetScale=this.selected?Math.min(this.w/990,this.h/790,1.18):this.fit;
  const selectedPos=this.selected?.base;
  // Freeze camera translation while dragging so the node follows the pointer.
  const tx=this.drag&&this.selected?this.camera.x:(selectedPos?-selectedPos.x*targetScale:0);
  const ty=this.drag&&this.selected?this.camera.y:(selectedPos?-selectedPos.y*targetScale:0);
  this.camera.x=mix(this.camera.x,tx,lerp);this.camera.y=mix(this.camera.y,ty,lerp);this.camera.scale=mix(this.camera.scale,targetScale,lerp);
  this.scene.style.transform=`translate3d(${this.camera.x}px,${this.camera.y}px,0) scale(${this.camera.scale})`;
  this.scene.style.setProperty('--graph-scale',String(this.camera.scale));
  if(!this.drag){this.look.x=mix(this.look.x,this.still||this.selected?0:this.look.tx,lerp);this.look.y=mix(this.look.y,this.still||this.selected?0:this.look.ty,lerp);}
  const center=this.project(0,0,-300);
  this.core.style.transform=`translate(${center.x}px,${center.y}px) scale(${center.scale})`;
  for(const g of this.groups){
   if(!this.still&&!this.drag&&(Math.abs(g.velocity.x)+Math.abs(g.velocity.y)>.02)){const step=dt*60;g.base.x=clamp(g.base.x+g.velocity.x*step,-this.bounds.x,this.bounds.x);g.base.y=clamp(g.base.y+g.velocity.y*step,-this.bounds.y,this.bounds.y);g.velocity.x*=Math.pow(.9,step);g.velocity.y*=Math.pow(.9,step);}
   const floating=!this.still&&(!this.drag||this.drag.g!==g);
   const fx=floating?Math.sin(now*.00031+g.phase)*6.5+Math.sin(now*.00079+g.phase)*1.5:0,fy=floating?Math.cos(now*.00025+g.phase)*7.5+Math.sin(now*.00057+g.phase)*2:0;
   const fz=floating?Math.sin(now*.00043+g.phase)*33:0;
   const z=this.selected?0:g.depth+fz;
   const projected=this.project(g.base.x+fx,g.base.y+fy,z);
   g.pos.x=projected.x;g.pos.y=projected.y;g.projectionScale=projected.scale;
   g.el.style.transform=`translate(${g.pos.x}px,${g.pos.y}px)`;
   g.el.style.zIndex=String(100+Math.round(z));
   g.button.style.setProperty('--depth-scale',String(projected.scale));
   this.setLine(g.line,g.pos.x,g.pos.y,center.x,center.y,now);
   for(let i=0;i<g.children.length;i++){
    const child=g.children[i],target=this.orbit(g,i);child.offset.x=mix(child.offset.x,target.x,lerp);child.offset.y=mix(child.offset.y,target.y,lerp);
    // Overview mode lets work-nodes drift visibly so the signal lines
    // between group center and each child feel alive; focused mode
    // keeps them still so the user can read text and hit small targets.
    const focused=this.selected===g;
    const ampMul=focused?1:2.4;
    const drift=this.still?{x:0,y:0,z:0}:{x:Math.sin(now*.00052+g.phase+i*2.1)*3*ampMul,y:Math.cos(now*.00044+g.phase+i*1.7)*3.5*ampMul,z:Math.sin(now*.00038+g.phase+i*1.3)*24*ampMul};
    // In overview, push children deeper (more negative z) so they read
    // smaller; in focused view they sit at z=0 which yields scale≈1.
    const overviewZ=g.depth-220+drift.z+(i-1)*30;
    const cp=this.project(g.base.x+fx+child.offset.x+drift.x,g.base.y+fy+child.offset.y+drift.y,focused?0:overviewZ);
    child.pos=cp;
    // Apply a flat scale reduction in overview regardless of how the
    // projection itself behaved. The 0.68 multiplier keeps the nodes
    // clearly secondary to the category button while still legible.
    const sizeMul=focused?1:0.68;
    child.el.style.transform=`translate(${cp.x-g.pos.x}px,${cp.y-g.pos.y}px) translate(-50%,-50%) scale(${cp.scale*sizeMul})`;
    this.setLine(child.line,g.pos.x,g.pos.y,cp.x,cp.y,now);
   }
  }
  // The relation paths only follow their work-node endpoints; their appearance itself is intentionally still.
  for(const relation of this.relations){this.setStaticLine(relation.path,relation.from.pos.x,relation.from.pos.y,relation.to.pos.x,relation.to.pos.y);}
  this.needsDraw=!this.still;
 }
 selectLine(link,value){link.path.classList.toggle('selected',value);link.text.classList.toggle('selected',value);}
 // Project a shallow 3D field onto ordinary DOM coordinates so visual and hit-test positions agree.
 project(x,y,z){const scale=900/(900-z);return {x:(x-this.look.x*z*.5)*scale,y:(y-this.look.y*z*.34)*scale,scale};}
 setLine(link,x1,y1,x2,y2,now){link.path.setAttribute('d',`M ${800+x1} ${500+y1} L ${800+x2} ${500+y2}`);link.textPath.setAttribute('startOffset',`${(link.phase+(this.still?0:now*.014))%100}%`);}
 setStaticLine(path,x1,y1,x2,y2){path.setAttribute('d',`M ${800+x1} ${500+y1} L ${800+x2} ${500+y2}`);}
 destroy(){this.abort.abort();this.resizeObserver.disconnect();cancelAnimationFrame(this.frame);}
}
