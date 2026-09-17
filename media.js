const cache = new Map();
function xml(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));}
export function placeholder(work){
 const label=xml(work.id.toUpperCase());
 // An explicitly labelled calibration plate, never represented as a work photograph.
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="720" height="460" viewBox="0 0 720 460"><rect width="720" height="460" fill="#121713"/><g stroke="#6b7869" stroke-width="1"><path d="M28 45h28M42 31v28M664 45h28M678 31v28M28 415h28M42 401v28M664 415h28M678 401v28"/><path d="M44 330H678" stroke="#354333"/></g><text x="44" y="102" fill="#61725d" font-family="monospace" font-size="18">[ IMAGE SLOT / ${label} ]</text><text x="38" y="271" fill="#99ab92" font-family="monospace" font-size="126" letter-spacing="-5">${String(work.index+1).padStart(2,'0')}</text><text x="47" y="375" fill="#aebaaa" font-family="sans-serif" font-size="22">作品图片待补充</text><text x="676" y="421" text-anchor="end" fill="#6b7869" font-family="monospace" font-size="14">NO ORIGINAL IMAGE SUPPLIED</text></svg>`;
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
async function prepare(work){
 const source=work.image||placeholder(work);
 const image=new Image();image.crossOrigin='anonymous';image.src=source;await image.decode();
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
 try{
  const key=work.id+work.image;
  if(!cache.has(key))cache.set(key,prepare(work));
  const data=await cache.get(key);
  if(!host.isConnected)return;
  const img=data.image.cloneNode();img.alt=work.image?work.title:'作品图片待补充';img.draggable=false;host.appendChild(img);
  if(withAscii){const canvas=document.createElement('canvas');canvas.width=768;canvas.height=480;canvas.className='ascii-cover';canvas.setAttribute('aria-hidden','true');canvas.getContext('2d').drawImage(data.ascii,0,0);host.appendChild(canvas);}
  host.dataset.ready='true';
 }catch(error){
  // Failed remote images use the same clearly labelled local plate.
  if(work.image)return mountMedia(host,{...work,image:''},withAscii);
  host.textContent='作品图片待补充';host.dataset.ready='fallback';console.warn('Image preview unavailable',error);
 }
}
