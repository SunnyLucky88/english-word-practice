// Progressive mobile reader. Desktop keeps the established single-page controller.
const mobileReader={mounted:false,active:false,pages:[],scrollFrame:0,restoreFrame:0,zoom:100,width:0,anchor:0};
const readerMedia=window.matchMedia?window.matchMedia('(max-width: 700px)'):null;
const readerForced=new URLSearchParams(window.location.search).get('reader')==='1';
const readerStorageKey='pep-reader-page-v1-unit-'+CONTENT.unit;
const standardRenderBook=renderBook;
function readerCloseSheets(){
 $('reader-tools').hidden=true;$('reader-pages').hidden=true;
 $('reader-tools-button').setAttribute('aria-expanded','false');$('reader-page-button').setAttribute('aria-expanded','false');
}
function readerSetPage(index,remember=true){
 currentPage=Math.max(0,Math.min(BOOK_PAGES.length-1,index));const page=BOOK_PAGES[currentPage];
 $('reader-page-number').textContent=String(page.page);$('reader-previous').disabled=currentPage===0;$('reader-next').disabled=currentPage===BOOK_PAGES.length-1;
 $('book-page').value=String(currentPage);$('read-page').disabled=!page.sequence.length;$('reader-read').disabled=!page.sequence.length;
 $('page-label').textContent='第 '+page.page+' 页';$('book-caption').textContent=page.caption;
 [...$('reader-page-grid').children].forEach((button,i)=>{if(i===currentPage)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current')});
 if(remember)try{window.localStorage.setItem(readerStorageKey,String(page.page))}catch(error){}
}
function readerJump(index,close=true){
 if(!mobileReader.mounted)return;
 closeWordFollow();if(!$('lookup-panel').hidden)showLookup(false);stop();if(close)readerCloseSheets();readerSetPage(index);
 const page=mobileReader.pages[currentPage],y=page.getBoundingClientRect().top+(window.pageYOffset||window.scrollY||0);scrollWindowTo(0,Math.max(0,y));
 const rect=page.getBoundingClientRect();mobileReader.anchor=(window.innerHeight*.38-rect.top)/rect.height;
}
function readerTrackPage(){
 if(!mobileReader.active)return;
 // The reading line at 38% avoids jumping page numbers for a tiny sliver at an edge.
 const line=(window.innerHeight||700)*.38;
 const index=mobileReader.pages.findIndex(page=>page.getBoundingClientRect().bottom>line);
 readerSetPage(index<0?BOOK_PAGES.length-1:index);
 const rect=mobileReader.pages[currentPage].getBoundingClientRect();mobileReader.anchor=(line-rect.top)/rect.height;
}
function readerScheduleTracking(){
 if(mobileReader.scrollFrame||!mobileReader.active)return;
 mobileReader.scrollFrame=requestAnimationFrame(()=>{mobileReader.scrollFrame=0;readerTrackPage()});
}
function readerMount(){
 const canvas=$('book-canvas');canvas.textContent='';$('reader-page-grid').textContent='';mobileReader.pages=[];
 BOOK_PAGES.forEach((page,index)=>{
  const section=document.createElement('article');section.className='reader-page';section.dataset.page=String(page.page);section.setAttribute('aria-label','课本第 '+page.page+' 页');
  const label=document.createElement('p');label.className='reader-page-label';label.textContent='第 '+page.page+' 页';section.appendChild(label);
  const viewport=document.createElement('div');viewport.className='reader-page-viewport';
  const surface=document.createElement('div');surface.className='reader-page-canvas';surface.dataset.bookPage=String(index);
  const img=document.createElement('img');img.src=page.image;img.alt='人教版 PEP 三年级上册第 '+page.page+' 页';img.width=1080;img.height=1527;img.draggable=false;img.loading=index<2?'eager':'lazy';img.decoding='async';surface.appendChild(img);
  page.spots.forEach(spot=>{
   const item=pageItem(spot.w||spot.s),button=document.createElement('button');button.type='button';button.className='hotspot';button.dataset.file=item.file;button.dataset.readIndex=String(spot.readIndex);button.dataset.pageIndex=String(index);button.setAttribute('aria-label','课本点读：'+item.en);button.title=item.en;
   const [x,y,w,h]=spot.box;Object.assign(button.style,{left:x/1080*100+'%',top:y/1527*100+'%',width:w/1080*100+'%',height:h/1527*100+'%'});
   button.onclick=()=>{
    readerSetPage(index);readerCloseSheets();document.body.classList.remove('reader-audio-open');handleBookPoint(item,button);
    if(!$('word-follow-panel').hidden){
     const panel=$('word-follow-panel').getBoundingClientRect(),target=button.getBoundingClientRect();
     if(target.bottom>panel.top-12||target.top<12)scrollWindowTo(window.scrollX||0,Math.max(0,(window.scrollY||0)+target.top-Math.max(12,(panel.top-target.height)/2)));
    }
   };surface.appendChild(button);
  });
  viewport.appendChild(surface);section.appendChild(viewport);canvas.appendChild(section);mobileReader.pages.push(section);
  const jump=document.createElement('button');jump.type='button';jump.textContent=String(page.page);jump.setAttribute('aria-label','跳到第 '+page.page+' 页');jump.onclick=()=>readerJump(index);$('reader-page-grid').appendChild(jump);
 });
 mobileReader.mounted=true;
}
function syncMobileReader(){
 const wanted=readerForced||!!(readerMedia&&readerMedia.matches),active=wanted&&!$('book').hidden,wasActive=mobileReader.active;
 mobileReader.active=active;document.body.classList.toggle('mobile-reader',active);$('reader-ui').hidden=!active;
 if(active){
  if(!mobileReader.mounted)readerMount();
  readerSetPage(currentPage,false);
  if(!wasActive){
   let index=currentPage;try{const saved=Number(window.localStorage.getItem(readerStorageKey));const found=BOOK_PAGES.findIndex(page=>page.page===saved);if(found>=0)index=found}catch(error){}
   cancelAnimationFrame(mobileReader.restoreFrame);mobileReader.restoreFrame=requestAnimationFrame(()=>{if(mobileReader.active)readerJump(index)});
  }else if(mobileReader.width&&mobileReader.width!==window.innerWidth){
   const page=mobileReader.pages[currentPage],rect=page.getBoundingClientRect();
   scrollWindowTo(window.scrollX||0,Math.max(0,(window.scrollY||0)+rect.top+mobileReader.anchor*rect.height-window.innerHeight*.38));
  }
 }else{
  readerCloseSheets();document.body.classList.remove('reader-audio-open');
  if(!wanted&&mobileReader.mounted){mobileReader.mounted=false;mobileReader.pages=[];standardRenderBook();}
 }
 mobileReader.width=window.innerWidth||0;syncPlayerHeight();
}
// Existing page selectors and previous/next handlers also become scroll-to-page controls.
renderBook=function(){if(mobileReader.mounted){readerJump(currentPage)}else standardRenderBook()};
const standardReadPage=$('read-page').onclick;
$('read-page').onclick=()=>{
 if(!mobileReader.mounted){standardReadPage();return;}
 closeWordFollow();readerCloseSheets();const page=BOOK_PAGES[currentPage],surface=mobileReader.pages[currentPage].querySelector('.reader-page-canvas');playSequence(page.sequence.map(pageItem),surface);
};
$('reader-previous').onclick=()=>readerJump(currentPage-1);$('reader-next').onclick=()=>readerJump(currentPage+1);
$('reader-page-button').onclick=()=>{const open=$('reader-pages').hidden;readerCloseSheets();document.body.classList.remove('reader-audio-open');closeWordFollow();if(!$('lookup-panel').hidden)showLookup(false);$('reader-pages').hidden=!open;$('reader-page-button').setAttribute('aria-expanded',String(open))};
$('reader-tools-button').onclick=()=>{
 const open=$('reader-tools').hidden;readerCloseSheets();document.body.classList.remove('reader-audio-open');closeWordFollow();if(!$('lookup-panel').hidden)showLookup(false);
 $('reader-word-follow').textContent='逐词：'+(wordFollowEnabled?'开':'关');$('reader-word-follow').setAttribute('aria-pressed',String(wordFollowEnabled));$('reader-spots').checked=$('show-spots').checked;
 $('reader-tools').hidden=!open;$('reader-tools-button').setAttribute('aria-expanded',String(open));
};
$('reader-tools-close').onclick=()=>{readerCloseSheets();$('reader-tools-button').focus()};$('reader-pages-close').onclick=()=>{readerCloseSheets();$('reader-page-button').focus()};
$('reader-read').onclick=()=>$('read-page').onclick();$('reader-playing').onclick=stop;
$('reader-word-follow').onclick=()=>{$('word-follow-toggle').onclick();$('reader-word-follow').textContent='逐词：'+(wordFollowEnabled?'开':'关');$('reader-word-follow').setAttribute('aria-pressed',String(wordFollowEnabled))};
$('reader-lookup').onclick=()=>{readerCloseSheets();showLookup(true)};
$('reader-audio').onclick=()=>{readerCloseSheets();document.body.classList.add('reader-audio-open');syncPlayerHeight()};
const readerAudioClose=document.createElement('button');readerAudioClose.type='button';readerAudioClose.className='reader-audio-close';readerAudioClose.textContent='收起播放器 ×';readerAudioClose.onclick=()=>{document.body.classList.remove('reader-audio-open');syncPlayerHeight()};playerWrap.appendChild(readerAudioClose);
function readerZoomTo(value){
 const page=mobileReader.pages[currentPage],before=page.getBoundingClientRect(),offset=(window.innerHeight*.38-before.top)/before.height;
 mobileReader.zoom=Number(value);$('reader-zoom').value=String(value);$('book-zoom').value=String(value);
 mobileReader.pages.forEach(section=>{section.querySelector('.reader-page-canvas').style.width=value+'%';if(Number(value)===100)section.querySelector('.reader-page-viewport').scrollLeft=0});
 const after=page.getBoundingClientRect();scrollWindowTo(window.scrollX||0,Math.max(0,(window.scrollY||0)+after.top+offset*after.height-window.innerHeight*.38));
}
$('reader-zoom').onchange=event=>readerZoomTo(event.target.value);
$('reader-spots').onchange=event=>{$('show-spots').checked=event.target.checked;$('show-spots').onchange({target:$('show-spots')})};
for(const key of ['words','sentences','practice'])$('reader-to-'+key).onclick=()=>{showTab($('tab-'+key));scrollWindowTo(0,0)};
$('reader-unit-title').textContent='第 '+CONTENT.unit+' 单元 · 上下连续阅读';
document.querySelectorAll('.unit-links a').forEach(link=>{const option=document.createElement('option');option.value=link.getAttribute('href');option.textContent=link.textContent;option.selected=link.hasAttribute('aria-current');$('reader-unit').appendChild(option)});
$('reader-unit').onchange=event=>{window.location.href=event.target.value};
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&mobileReader.active){readerCloseSheets();document.body.classList.remove('reader-audio-open')}});
document.addEventListener('click',event=>{if(mobileReader.active&&!event.target.closest('#reader-ui')&&!event.target.closest('.player-wrap'))readerCloseSheets()});
window.addEventListener('scroll',readerScheduleTracking,{passive:true});window.addEventListener('resize',syncMobileReader);
if(readerMedia){if(readerMedia.addEventListener)readerMedia.addEventListener('change',syncMobileReader);else if(readerMedia.addListener)readerMedia.addListener(syncMobileReader)}
for(const event of ['playing','pause','ended','error','emptied'])audio.addEventListener(event,()=>{$('reader-playing').hidden=audio.paused||audio.ended});
syncMobileReader();
