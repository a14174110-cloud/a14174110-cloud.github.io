const cache = new Map();
function xml(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));}
// Image CDN fallback chain. Order matters — first source that responds is used.
// 1. cdn.jsdmirror.com — jsDelivr China mirror, usually reachable without VPN
// 2. cdn.jsdelivr.net — international jsDelivr
// 3. yinzhu.site — GitHub Pages origin (works for HTML/JS, image traffic varies)
const CDN_SOURCES=[
 {test:u=>u.includes('cdn.jsdmirror.com')||u.includes('cdn.jsdelivr.net'),build:u=>u.replace('cdn.jsdelivr.net','cdn.jsdmirror.com')},
 {test:u=>u.includes('cdn.jsdmirror.com')||u.includes('cdn.jsdelivr.net'),build:u=>u.replace('cdn.jsdmirror.com','cdn.jsdelivr.net')},
 {test:u=>/^https?:\/\//.test(u),build:u=>{try{const x=new URL(u);x.host='yinzhu.site';return x.toString();}catch{return '';}}}
];
function nextSource(url){
 for(const step of CDN_SOURCES){if(step.test(url)){const next=step.build(url);if(next&&next!==url)return next;}}
 return '';
}
function loadImage(source,timeout=8000){
 return new Promise((resolve,reject)=>{
  const image=new Image();
  image.crossOrigin='anonymous';
  let done=false;
  const finish=(fn)=>{if(done)return;done=true;fn();};
  image.onload=()=>finish(()=>resolve(image));
  image.onerror=()=>finish(()=>reject(new Error('image load failed: '+source)));
  const timer=setTimeout(()=>finish(()=>reject(new Error('image timeout: '+source))),timeout);
  // Wrap onload/onerror to clear the timer.
  const wrappedOnload=image.onload,wrappedOnerror=image.onerror;
  image.onload=()=>{clearTimeout(timer);wrappedOnload();};
  image.onerror=()=>{clearTimeout(timer);wrappedOnerror();};
  image.src=source;
 });
}
export function placeholder(work){
 const label=xml(work.id.toUpperCase());
 // An explicitly labelled calibration plate, never represented as a work photograph.
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="720" height="460" viewBox="0 0 720 460"><rect width="720" height="460" fill="#121713"/><g stroke="#6b7869" stroke-width="1"><path d="M28 45h28M42 31v28M664 45h28M678 31v28M28 415h28M42 401v28M664 415h28M678 401v28"/><path d="M44 330H678" stroke="#354333"/></g><text x="44" y="102" fill="#61725d" font-family="monospace" font-size="18">[ IMAGE SLOT / ${label} ]</text><text x="38" y="271" fill="#99ab92" font-family="monospace" font-size="126" letter-spacing="-5">${String(work.index+1).padStart(2,'0')}</text><text x="47" y="375" fill="#aebaaa" font-family="sans-serif" font-size="22">作品图片待补充</text><text x="676" y="421" text-anchor="end" fill="#6b7869" font-family="monospace" font-size="14">NO ORIGINAL IMAGE SUPPLIED</text></svg>`;
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
async function prepare(work){
 const primary=work.image||placeholder(work);
 // Walk the CDN chain until one source responds. Each step is given
 // an 8 s timeout so a stuck/blocked host doesn't stall the page.
 let image,source=primary;
 try{
  image=await loadImage(primary);
 }catch(error){
  let current=primary;
  while(true){
   const next=nextSource(current);
   if(!next)throw error;
   try{
    image=await loadImage(next);
    source=next;
    break;
   }catch(inner){
    current=next;
    error=inner;
   }
  }
 }
 const raw=document.createElement('canvas');raw.width=96;raw.height=60;
 const ctx=raw.getContext('2d',{willReadFrequently:true});
 const ratio=Math.max(96/image.width,60/image.height);
 ctx.drawImage(image,(96-image.width*ratio)/2,(60-image.height*ratio)/2,image.width*ratio,image.height*ratio);
 const pixels=ctx.getImageData(0,0,96,60).data;
 const ascii=document.createElement('canvas');ascii.width=768;ascii.height=480;
 const out=ascii.getContext('2d');out.fillStyle='#0b100d';out.fillRect(0,0,768,480);out.font='9px monospace';out.textBaseline='top';
 const chars=' .:-=+*#%@';
 for(let y=0;y<60;y++)for(let x=0;x<96;x++){
  const i=(y*96+x)*4,l=(.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2])/255;
  const level=Math.min(9,Math.floor(Math.pow(l,.6)*10));
  if(!level)continue;
  out.fillStyle=`rgb(${78+l*155|0},${92+l*150|0},${75+l*140|0})`;
  out.fillText(chars[level],x*8,y*8);
 }
 return {image,ascii,source};
}
export async function mountMedia(host,work,withAscii=true){
 host.setAttribute('aria-label',work.image?`${work.title} 作品图片`:`${work.title} 图片占位，待补充原图`);
 // Drop a spinner into the host immediately so the empty plate shows
 // loading feedback instead of a blank box. The spinner is removed
 // (via .media-ready fade) once the image — or its placeholder — is
 // actually attached.
 const spinner=document.createElement('div');
 spinner.className='media-loading';
 spinner.setAttribute('aria-hidden','true');
 host.appendChild(spinner);
 const finishLoading=()=>{if(host.contains(spinner))spinner.remove();host.classList.add('media-ready');};
 try{
  const key=work.id+work.image;
  if(!cache.has(key))cache.set(key,prepare(work));
  const data=await cache.get(key);
  if(!host.isConnected){spinner.remove();return;}
  const img=data.image.cloneNode();img.alt=work.image?work.title:'作品图片待补充';img.draggable=false;host.appendChild(img);
  if(withAscii){const canvas=document.createElement('canvas');canvas.width=768;canvas.height=480;canvas.className='ascii-cover';canvas.setAttribute('aria-hidden','true');canvas.getContext('2d').drawImage(data.ascii,0,0);host.appendChild(canvas);}
  finishLoading();
  host.dataset.ready='true';
 }catch(error){
  // Failed remote images use the same clearly labelled local plate.
  if(work.image){spinner.remove();return mountMedia(host,{...work,image:''},withAscii);}
  host.textContent='作品图片待补充';finishLoading();host.dataset.ready='fallback';console.warn('Image preview unavailable',error);
 }
}
