import {works, categories, byId} from './data.js';
const app = document.getElementById('app');
let cleanup = () => {}, graph = null, wave = null;
let still = matchMedia('(prefers-reduced-motion: reduce)').matches;
let lang = localStorage.getItem('yinzhu-lang') === 'en' ? 'en' : 'zh';

// ===== i18n =====
// Flat key namespace for UI chrome. Works content lives on the work object
// as `*En` fields and is read via tx(work, field). Strings missing in en
// (e.g. entrance artistic flourish, error messages) fall back to the zh copy.
const i18n = {
 zh:{
  // entrance (DOM, also updated by JS)
  entranceLineEn:'/ PORTFOLIO /',
  entranceName:'YIN ZHU · 尹築 2026',
  entranceStatus:'STANDBY · PRESS ENTER',
  entranceIntro:'在噪聲、行為與演算法之間，情緒驅動震盪。',
  // home
  homeEyebrow:'MEDIA ARTIST / HANGZHOU',
  homeSlogan:'在噪聲、行為與演算法之間，情緒驅動震盪。',
  homeSide:'SOUND · PERFORMANCE · IMAGE · INSTALLATION',
  homeScroll:'進入作品總覽 →',
  // graph
  graphEyebrow:'02 / CONSTELLATION',
  graphHeading:'感知的不同路徑',
  graphInstruction:'',
  graphOverview:'← 返回總覽',
  graphCoreName:'情緒結構<br>藝術',
  graphCoreAria:'情緒結構藝術，查看名詞解釋',
  graphCloseAria:'關閉',
  graphGlossaryEyebrow:'GLOSSARY / 01',
  graphGlossaryTitle:'情緒結構藝術',
  graphGlossaryBody:'情緒結構藝術（Emotional Structural Art）是一種以影像、聲音、行為和敘事干預為核心維度的當代藝術實踐。它將「情緒」本身視為一種可被空間化、物理化和精準計算的設計材料。',
  graphHint:'↓ CONTACT',
  graphHintAria:'向下前往聯絡頁',
  graphLoadError:'作品導覽載入失敗，請重新整理後再試。',
  // contact
  contactEyebrow:'TRANSMISSION REMAINS OPEN',
  contactTitle:'信號流通<br>Signal Flow',
  contactIntro:'展覽與合作，請聯絡。',
  contactMailSubject:'展覽與合作 / Exhibition & Collaboration',
  contactMailBody:'你好尹築，\n\n',
  contactLocation:'HANGZHOU · CHINA',
  contactUp:'↑ 返回作品總覽',
  // about
  aboutEyebrow:'ABOUT / BIO',
  aboutTitle:'尹築 / Yin Zhu',
  aboutIntro:'藝術創作與學術研究聚焦媒介藝術、實驗影像與聲音裝置，探索技術媒介、人類感知與社會結構之間的張力，以及「情緒結構藝術」在當代語境中的實踐可能。',
  aboutBio:'2002 年生於廣東深圳，現工作居住於浙江杭州。<br>中國美術學院跨媒體藝術學院開放媒體系碩士研究生在讀。',
  aboutNotes:['聲音現象學','具身感知','記憶與噪聲','演算法與規訓'],
  aboutBack:'← 返回上一頁',
  // detail
  detailBack:'← 返回上一頁 / BACK',
  detailFigcaption:'INSTALLATION VIEW',
  detailFigcaptionPending:'INSTALLATION VIEW / 作品圖片待補充',
  detailCopy1:'01 / 創作闡釋',
  detailCopy2:'02 / 媒介與機制',
  detailVideoTitle:'[ VIDEO DOCUMENTATION ]',
  detailVideoWatch:'Watch On Youtube',
  detailVideoEmpty:'影像紀錄待補充<br>VIDEO NOT YET ADDED',
  detailAudioTitle:'[ AUDIO EXCERPT ]',
  detailAudioEmpty:'聲音片段待補充<br>AUDIO NOT YET ADDED',
  detailBackWorks:'← 返回作品總覽',
  detailNext:'下一件作品',
  detailGalleryHeading:'IMAGE ARCHIVE',
  // errors
  errNotFound:'未找到這件作品',
  errLoad:'檔案暫時未能載入',
  errReload:'重新開啟作品導覽 →'
 },
 en:{
  entranceLineEn:'/ PORTFOLIO /',
  entranceName:'YIN ZHU · Yin Zhu 2026',
  entranceStatus:'STANDBY · PRESS ENTER',
  entranceIntro:'Between noise, performance, and algorithm — emotion drives oscillation.',
  homeEyebrow:'MEDIA ARTIST / HANGZHOU',
  homeSlogan:'Between noise, performance, and algorithm — emotion drives oscillation.',
  homeSide:'SOUND · PERFORMANCE · IMAGE · INSTALLATION',
  homeScroll:'Enter Works →',
  graphEyebrow:'02 / CONSTELLATION',
  graphHeading:'Paths of Perception',
  graphInstruction:'',
  graphOverview:'← Back to overview',
  graphCoreName:'Emotional<br>Structural Art',
  graphCoreAria:'Emotional Structural Art, view definition',
  graphCloseAria:'Close',
  graphGlossaryEyebrow:'GLOSSARY / 01',
  graphGlossaryTitle:'Emotional Structural Art',
  graphGlossaryBody:'Emotional Structural Art is a contemporary art practice whose core dimensions are image, sound, performance and narrative intervention. It treats "emotion" itself as a designable material that can be spatialized, physicalized and precisely calculated.',
  graphHint:'↓ CONTACT',
  graphHintAria:'Jump to contact page',
  graphLoadError:'Constellation failed to load. Please refresh and try again.',
  contactEyebrow:'TRANSMISSION REMAINS OPEN',
  contactTitle:'信號流通<br>Signal Flow',
  contactIntro:'For exhibitions and collaborations, please get in touch.',
  contactMailSubject:'Exhibition & Collaboration',
  contactMailBody:'Hi Yin Zhu,\n\n',
  contactLocation:'HANGZHOU · CHINA',
  contactUp:'↑ Back to works overview',
  aboutEyebrow:'ABOUT / BIO',
  aboutTitle:'Yin Zhu / 尹築',
  aboutIntro:'Practice and research focus on media art, experimental moving image and sound installation — exploring tensions between technical media, human perception and social structure, and the possibilities of Emotional Structural Art in a contemporary context.',
  aboutBio:'Born 2002 in Shenzhen, Guangdong. Currently lives and works in Hangzhou, Zhejiang.<br>MFA candidate, Open Media Department, School of Intermedia Art, China Academy of Art.',
  aboutNotes:['Sound phenomenology','Embodied perception','Memory & noise','Algorithm & discipline'],
  aboutBack:'← Back to previous',
  detailBack:'← BACK',
  detailFigcaption:'INSTALLATION VIEW',
  detailFigcaptionPending:'INSTALLATION VIEW / IMAGES PENDING',
  detailCopy1:'01 / Concept',
  detailCopy2:'02 / Medium & Mechanism',
  detailVideoTitle:'[ VIDEO DOCUMENTATION ]',
  detailVideoWatch:'Watch On Youtube',
  detailVideoEmpty:'Video documentation pending<br>VIDEO NOT YET ADDED',
  detailAudioTitle:'[ AUDIO EXCERPT ]',
  detailAudioEmpty:'Audio excerpt pending<br>AUDIO NOT YET ADDED',
  detailBackWorks:'← Back to works overview',
  detailNext:'Next Work',
  detailGalleryHeading:'IMAGE ARCHIVE',
  errNotFound:'Work not found',
  errLoad:'Archive failed to load',
  errReload:'Reopen works overview →'
 }
};
const t = key => i18n[lang][key] ?? i18n.zh[key] ?? key;
// For works: prefer English counterpart when language is en and the field
// exists. Falls back to the Chinese original otherwise (Traditional Chinese
// after applyTraditional runs).
const tx = (w, field) => (lang === 'en' && w[field + 'En']) ? w[field + 'En'] : w[field];

const motionButton = document.getElementById('motion');
function updateMotion(){document.body.classList.toggle('still',still);if(motionButton){motionButton.textContent=still?'MOTION OFF':'MOTION ON';motionButton.setAttribute('aria-pressed',String(still));}window.dispatchEvent(new CustomEvent('archive:motion',{detail:still}));}
if(motionButton)motionButton.addEventListener('click',()=>{still=!still;updateMotion();});updateMotion();

// ===== language switch =====
function setLang(next){
 if(next===lang)return;
 lang=next;
 localStorage.setItem('yinzhu-lang',lang);
 document.documentElement.lang=lang==='en'?'en':'zh-Hant';
 document.body.classList.toggle('lang-en',lang==='en');
 document.querySelectorAll('.lang-toggle [data-lang]').forEach(el=>{el.classList.toggle('is-active',el.dataset.lang===lang);});
 // Brand: static "HOME" label (identical in both languages); only the
 // accessible name carries language, for screen readers.
 const brandLink=document.querySelector('.brand');
 if(brandLink)brandLink.setAttribute('aria-label',lang==='en'?'Home':'首页');
 // Entrance lives in static HTML, refresh its DOM copy.
 const entranceIntro=document.querySelector('.entrance-intro');
 const entranceLineEn=document.querySelector('.entrance-line-en');
 const entranceName=document.querySelector('.entrance-name');
 const entryStatusText=document.getElementById('entry-status-text');
 if(entranceLineEn)entranceLineEn.textContent=t('entranceLineEn');
 if(entranceName)entranceName.textContent=t('entranceName');
 if(entranceIntro)entranceIntro.textContent=t('entranceIntro');
 if(entryStatusText)entryStatusText.textContent=t('entranceStatus');
 render();
}
document.addEventListener('click',e=>{
 const opt=e.target.closest('.lang-toggle [data-lang]');
 if(opt)setLang(opt.dataset.lang);
});
// Init toggle UI + html lang on load (DOM is ready before this module runs).
document.documentElement.lang=lang==='en'?'en':'zh-Hant';
document.body.classList.toggle('lang-en',lang==='en');
document.querySelectorAll('.lang-toggle [data-lang]').forEach(el=>{el.classList.toggle('is-active',el.dataset.lang===lang);});
// Init brand aria-label for the persisted language on load.
(function initBrand(){
 const brandLink=document.querySelector('.brand');
 if(brandLink)brandLink.setAttribute('aria-label',lang==='en'?'Home':'首页');
})();

const graphMarkup = () => `<section class="graph-panel" aria-label="${t('graphHeading')}"><div class="graph-top"><div><span class="eyebrow">${t('graphEyebrow')}</span><h2 class="graph-heading" id="graph-heading">${t('graphHeading')}</h2><p id="graph-instruction">${t('graphInstruction')}</p></div><button class="overview-button" id="overview" type="button" hidden>${t('graphOverview')}</button></div><div class="graph-viewport" id="graph-viewport"><div class="graph-scene" id="graph-scene"><svg class="connections" viewBox="0 0 1600 1000" aria-hidden="true"></svg><div class="core-wrap"><button class="core" type="button" aria-label="${t('graphCoreAria')}"><span class="core-symbol">[ + ]</span><strong>${t('graphCoreName')}</strong><small>EMOTIONAL<br>STRUCTURAL ART</small></button></div></div></div><div class="core-definition" hidden><button type="button" aria-label="${t('graphCloseAria')}">×</button><p class="eyebrow">${t('graphGlossaryEyebrow')}</p><h3>${t('graphGlossaryTitle')}</h3><p>${t('graphGlossaryBody')}</p></div><div class="graph-bottom"><span class="mono">${t('graphEyebrow').split(' / ')[0]} / 03</span></div><a class="graph-page-hint mono" href="#/contact" aria-label="${t('graphHintAria')}">${t('graphHint')}</a></section>`;
const contactMarkup = () => `<section class="contact-panel" aria-label="${t('contactTitle')}"><div class="contact-index mono">03 / CONTACT</div><div class="contact-copy"><p class="eyebrow">${t('contactEyebrow')}</p><h2>${t('contactTitle')}</h2><p>${t('contactIntro')}</p><div class="contact-slots"><a href="mailto:a14174110@gmail.com?subject=${encodeURIComponent(t('contactMailSubject'))}&body=${encodeURIComponent(t('contactMailBody'))}">a14174110@gmail.com</a><span>${t('contactLocation')}</span></div></div><div class="contact-ascii mono" aria-hidden="true">··· / / SIGNAL<br>   + MEMORY +<br>BODY : MACHINE<br>   \ \\ OPEN</div><a class="contact-up" href="#/works">${t('contactUp')}</a></section>`;
function journey(scene){
 app.innerHTML=`<div class="journey" data-scene="${scene}"><div class="panels"><section class="home-panel" aria-label="${t('homeSlogan')}"><div class="hero-copy"><p class="eyebrow">${t('homeEyebrow')}</p><h1><a class="hero-about" href="#/about" aria-label="${t('aboutTitle')}">YIN<span>ZHU.</span></a></h1><div class="name-cn">尹築</div><p class="theme-slogan">${t('homeSlogan')}</p></div><div class="home-side">${t('homeSide')}</div><div class="scene-footer"><span class="scroll-mark">${t('homeScroll')}</span><span class="scene-pips"><i class="active"></i><i></i><i></i>01 / 03</span></div></section>${graphMarkup()}${contactMarkup()}</div></div>`;
 const root=app.querySelector('.journey'), home=app.querySelector('.home-panel'), panel=app.querySelector('.graph-panel');
 let current=scene,lockedUntil=0,lastWheel=0,touch=null;
 const contact=app.querySelector('.contact-panel');
 function setScene(next){next=Math.max(0,Math.min(2,next));if(next===current)return;current=next;root.dataset.scene=String(next);home.inert=next!==0;panel.inert=next!==1;contact.inert=next!==2;lockedUntil=performance.now()+1900;graph?.setVisible(next===1);wave?.setScene(next);}
 home.inert=scene!==0;panel.inert=scene!==1;contact.inert=scene!==2;
 function onWheel(e){if(!window.archiveEntered||e.ctrlKey)return;const delta=Math.abs(e.deltaY)>=Math.abs(e.deltaX)?e.deltaY:e.deltaX;if(Math.abs(delta)<3)return;e.preventDefault();const now=performance.now(),idle=now-lastWheel>160;lastWheel=now;if(now<lockedUntil||!idle)return;if(current===1&&graph?.focused){if(delta<0)graph.overview();return;}setScene(current+(delta>0?1:-1));}
 function onKey(e){if(!window.archiveEntered||e.target.closest('button,a,input'))return;if(['ArrowDown','PageDown','ArrowRight',' '].includes(e.key)){e.preventDefault();setScene(current+1);}if(['ArrowUp','PageUp','ArrowLeft'].includes(e.key)&&!graph?.focused){e.preventDefault();setScene(current-1);}if(e.key==='Escape')graph?.overview();}
 function startTouch(e){if(e.target.closest('.category,.work-node,.core'))return;touch={x:e.touches[0].clientX,y:e.touches[0].clientY};}
 function endTouch(e){if(!touch||!window.archiveEntered)return;const dx=touch.x-e.changedTouches[0].clientX,dy=touch.y-e.changedTouches[0].clientY;touch=null;const d=Math.abs(dy)>Math.abs(dx)?dy:dx;if(Math.abs(d)>45&&performance.now()>lockedUntil)setScene(current+(d>0?1:-1));}
 root.addEventListener('wheel',onWheel,{passive:false});window.addEventListener('keydown',onKey);root.addEventListener('touchstart',startTouch,{passive:true});root.addEventListener('touchend',endTouch,{passive:true});
 let alive=true;
 import('./graph.js?v=137').then(({Constellation})=>{if(!alive)return;graph=new Constellation(panel,categories,works,still,lang);graph.setVisible(current===1);applyTraditional(panel);}).catch(e=>{console.error(e);panel.querySelector('.graph-heading').textContent=t('graphLoadError');});
 cleanup=()=>{alive=false;graph?.destroy();graph=null;root.removeEventListener('wheel',onWheel);window.removeEventListener('keydown',onKey);};
 wave?.setScene(scene);
}
function bindGalleryToActiveImage(gallery){
 const items=Array.from(gallery.querySelectorAll('.gallery-item'));if(!items.length)return;
 let frame=0;
 const update=()=>{frame=0;const center=gallery.scrollLeft+gallery.clientWidth/2;let active=items[0],distance=Infinity;items.forEach(item=>{const d=Math.abs(item.offsetLeft+item.offsetWidth/2-center);if(d<distance){distance=d;active=item;}});gallery.style.height=`${Math.ceil(active.offsetHeight+20)}px`;};
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
 gallery.addEventListener('scroll',schedule,{passive:true});
 // Track touch start so we know the finger's release direction.
 let touchStartX=null,touchStartY=null,touchStartScroll=0,swiping=false;
 gallery.addEventListener('touchstart',e=>{
  const t=e.touches[0];
  touchStartX=t.clientX;touchStartY=t.clientY;touchStartScroll=gallery.scrollLeft;swiping=true;
 },{passive:true});
 // Snap to nearest when scrolling settles so a single swipe can't ride
 // past several items. Reduce the debounce — we want the snap to engage
 // while momentum is still strong.
 const snapTo=(index)=>{
  if(index<0)index=0;if(index>=items.length)index=items.length-1;
  const target=items[index].offsetLeft+items[index].offsetWidth/2-gallery.clientWidth/2;
  gallery.scrollTo({left:target,behavior:'smooth'});
 };
 const findNearest=()=>{
  const center=gallery.scrollLeft+gallery.clientWidth/2;
  let nearest=0,distance=Infinity;
  items.forEach((item,i)=>{const d=Math.abs(item.offsetLeft+item.offsetWidth/2-center);if(d<distance){distance=d;nearest=i;}});
  return nearest;
 };
 const snapTimer={id:null};
 const scheduleSettleSnap=()=>{
  if(snapTimer.id)clearTimeout(snapTimer.id);
  snapTimer.id=setTimeout(()=>snapTo(findNearest()),90);
 };
 gallery.addEventListener('scroll',scheduleSettleSnap,{passive:true});
 // On finger lift, lock the swipe to a single step in the drag direction.
 // This is what makes the gallery feel "damped" — one swipe = one image.
 gallery.addEventListener('touchend',e=>{
  if(!swiping||touchStartX===null){swiping=false;return;}
  const t=e.changedTouches[0];
  const dx=touchStartX-t.clientX,dy=touchStartY-t.clientY;
  touchStartX=touchStartY=null;swiping=false;
  // Only treat it as a horizontal swipe if motion is dominantly X.
  if(Math.abs(dx)<Math.abs(dy)||Math.abs(dx)<24){return;}
  const startCenter=touchStartScroll+gallery.clientWidth/2;
  let active=0,distance=Infinity;
  items.forEach((item,i)=>{const d=Math.abs(item.offsetLeft+item.offsetWidth/2-startCenter);if(d<distance){distance=d;active=i;}});
  // Step exactly one image in the swipe direction; clamp to bounds.
  const next=dx>0?Math.min(items.length-1,active+1):Math.max(0,active-1);
  if(snapTimer.id)clearTimeout(snapTimer.id);
  snapTo(next);
  // After the snap finishes, make sure height updates to the new image.
  setTimeout(()=>update(),420);
 },{passive:true});
 const resize=new ResizeObserver(schedule);resize.observe(gallery);items.forEach(item=>resize.observe(item));gallery._galleryResize=resize;schedule();
}
function typeDetailText(){
 const targets=app.querySelectorAll('.detail-lead,.detail-copy p');if(still)return;
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;const el=entry.target,text=el.dataset.fullText;observer.unobserve(el);let index=0,last=0;el.classList.add('typing');const write=now=>{if(now-last>64){el.textContent=text.slice(0,++index);last=now;}if(index<text.length)requestAnimationFrame(write);else{el.classList.remove('typing');el.style.minHeight='';}};requestAnimationFrame(write);}),{rootMargin:'0px 0px -10% 0px',threshold:.08});
 targets.forEach(el=>{el.dataset.fullText=el.textContent;el.style.minHeight=el.scrollHeight+'px';el.textContent='';observer.observe(el);});
}
function detail(w){
 const index=works.indexOf(w),next=works[(index+1)%works.length];
 const title=tx(w,'title'),en=tx(w,'en'),year=tx(w,'year'),type=tx(w,'type'),tags=w.tags.join(' / '),lead=tx(w,'lead');
 const concept=tx(w,'concept'),tech=tx(w,'tech');
 app.innerHTML=`<article class="detail detail-enter"><a class="back-link" href="#">${t('detailBack')}</a><header class="detail-top"><p class="eyebrow">WORK ${String(index+1).padStart(2,'0')} / ${year}</p><h1>${title}</h1><p class="english">${en}</p><div class="detail-meta"><span>${type}</span><span>${tags}</span></div><p class="detail-lead">${lead}</p></header><figure class="detail-image"><div class="media" data-media="${w.id}"></div><figcaption>${w.image?t('detailFigcaption'):t('detailFigcaptionPending')}</figcaption></figure><section class="detail-copy"><h2>${t('detailCopy1')}</h2><div>${concept.map(p=>`<p>${p}</p>`).join('')}</div></section><section class="detail-copy"><h2>${t('detailCopy2')}</h2><div><p>${tech}</p></div></section><div class="media-slots"><section class="media-slot"><h2 class="mono">${t('detailVideoTitle')}</h2>${w.video?`<video controls preload="metadata" src="${w.video}"></video>`:`<p>${t('detailVideoEmpty')}</p>`}</section><section class="media-slot"><h2 class="mono">${t('detailAudioTitle')}</h2>${w.audio?`<audio controls preload="metadata" src="${w.audio}"></audio>`:`<p>${t('detailAudioEmpty')}</p>`}</section></div><nav class="detail-nav"><a href="#/works">${t('detailBackWorks')}</a><a href="#/works/${next.id}"><span>${t('detailNext')}</span><span>${next.title} →</span></a></nav></article>`;
 app.querySelector('.detail .back-link').addEventListener('click',e=>{e.preventDefault();navigateBack();});app.querySelector('.detail-image').classList.toggle('natural-main',Boolean(w.mainNatural));const slots=app.querySelector('.media-slots');if(w.video){const sep=w.video.includes('?')?'&':'?';const watchUrl=(w.video.match(/youtube(?:-nocookie)?\.com\/embed\/([\w-]+)/)||[])[1];slots.innerHTML=`<section class="media-slot media-video"><h2 class="mono">${t('detailVideoTitle')}</h2><iframe src="${w.video}${sep}playsinline=1" title="${title} 影像记录" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" allowfullscreen playsinline></iframe>${watchUrl?`<a class="video-watch" href="https://www.youtube.com/watch?v=${watchUrl}" target="_blank" rel="noopener">${t('detailVideoWatch')} →</a>`:''}</section>`;}else slots.remove();if(w.hideTech)app.querySelectorAll('.detail-copy')[1]?.remove();
 if(w.gallery?.length){const gallery=document.createElement('section');gallery.className='detail-gallery';gallery.setAttribute('aria-label',`${title} image archive`);gallery.innerHTML=`<div class="gallery-heading"><span class="eyebrow">${t('detailGalleryHeading')}</span><span class="mono">${String(w.gallery.length).padStart(2,'0')} VIEWS</span></div><div class="gallery-grid">${w.gallery.map((_,i)=>`<figure class="gallery-item"><div class="media" data-gallery="${i}"></div><figcaption class="mono">[ IMAGE ${String(i+2).padStart(2,'0')} ]</figcaption></figure>`).join('')}</div>`;app.querySelector('.detail-copy').after(gallery);}
 import('./media.js').then(({mountMedia})=>{const tasks=[];const host=app.querySelector(`[data-media="${w.id}"]`);if(host)tasks.push(mountMedia(host,w,false));app.querySelectorAll('[data-gallery]').forEach(host=>tasks.push(mountMedia(host,{...w,image:w.gallery[Number(host.dataset.gallery)]},false)));Promise.all(tasks).then(()=>{const gallery=app.querySelector('.gallery-grid');if(gallery)bindGalleryToActiveImage(gallery);});});
 typeDetailText();wave?.setScene(2);
}
function about(){app.innerHTML=`<article class="about-page"><p class="eyebrow">${t('aboutEyebrow')}</p><h1>${t('aboutTitle')}</h1><p>${t('aboutIntro')}</p><p class="bio-small">${t('aboutBio')}</p><div class="notes-list">${i18n[lang].aboutNotes.map(n=>`<span>${n}</span>`).join('')}</div><a class="back-link" href="#">${t('aboutBack')}</a></article>`;wave?.setScene(2);app.querySelector('.about-page .back-link').addEventListener('click',e=>{e.preventDefault();navigateBack();});}
function contact(){journey(2);}
const traditional={'声':'聲','体':'體','与':'與','让':'讓','绪':'緒','结':'結','构':'構','艺':'藝','术':'術','创':'創','阐':'闡','释':'釋','图':'圖','档':'檔','览':'覽','总':'總','径':'徑','导':'導','览':'覽','开':'開','关':'關','录':'錄','创':'創','写':'寫','机':'機','制':'製','线':'線','觉':'覺','观':'觀','众':'眾','现':'現','场':'場','实':'實','验':'驗','响':'響','影':'影','像':'像','统':'統','规':'規','训':'訓','系':'系','术':'術','学':'學','术':'術','个':'個','当':'當','时':'時','间':'間','间':'間','处':'處','为':'為','于':'於','应':'應','动':'動','态':'態','记':'記','忆':'憶','乐':'樂','装':'裝','置':'置','补':'補','暂':'暫','载':'載','页':'頁','联':'聯','络':'絡','请':'請','种':'種','将':'將','为':'為','现':'現','带':'帶','进':'進','选':'選','择':'擇','类':'類','组':'組','资':'資','料':'料','标':'標','题':'題','获':'獲','电':'電','脑':'腦','书':'書','剧':'劇','压':'壓','损':'損','伤':'傷','碎':'碎','块':'塊','经':'經','过':'過','边':'邊','际':'際','驱':'驅','动':'動','荡':'盪','术':'術','术':'術'};
function applyTraditional(root){const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode())node.nodeValue=node.nodeValue.replace(/[声体与让绪结构艺术创阐释图档览总径导开关录写机制线觉观众现场实验响统规训学个当时间处为于应动态记忆乐装补暂载页联络请种将进选择类组资料标题获电脑书剧压损伤块经过边际驱荡筑语]/g,char=>traditional[char]||char);}
traditional.筑='築';traditional.语='語';const entranceSub=document.querySelector('.entrance-sub');if(entranceSub)entranceSub.textContent='< 情緒結構藝術 / EMOTIONAL_STRUCTURAL_ART >';
function render(){cleanup();cleanup=()=>{};window.scrollTo(0,0);const route=(location.hash.slice(1)||'/').split('?')[0];document.title='YinZhu Portfolio';try{if(route==='/about')about();else if(route==='/contact')contact();else if(route.startsWith('/works/')){const w=byId(route.split('/')[2]);if(w){document.title=`${tx(w,'title')} — Yin Zhu / 尹築`;detail(w);}else{app.innerHTML=`<section class="error-page"><h1>${t('errNotFound')}</h1><a href="#/works">${t('detailBackWorks')}</a></section>`;}}else journey(route==='/works'?1:0);applyTraditional(document.body);}catch(error){console.error(error);app.innerHTML=`<section class="error-page"><h1>${t('errLoad')}</h1><a href="#/works">${t('errReload')}</a></section>`;}}
let prevHash='',currHash=location.hash;function navigateBack(){if(prevHash){location.hash=prevHash;}else{location.hash='#/';}}
window.addEventListener('hashchange',()=>{prevHash=currHash;currHash=location.hash;render();});render();
import('./wave.js?v=140').then(({WaveField})=>{wave=new WaveField(document.getElementById('ocean'),still);wave.setScene(location.hash.startsWith('#/contact')?2:location.hash.startsWith('#/works')?1:0);}).catch(console.error);