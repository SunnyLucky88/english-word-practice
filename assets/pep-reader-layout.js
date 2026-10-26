// Approved continuous-reader layout shared by all textbook units.
// Pan the continuous book inside its own viewport; never widen or pan the webpage.
const layoutBookViewport=document.querySelector('.book-viewport');
function layoutCenterBook(){
 const canvas=$('book-canvas'),visible=layoutBookViewport.clientWidth;
 if(!visible||!mobileReader.mounted)return;
 // Center the paper consistently; textbook content must not shift pages separately.
 canvas.style.paddingLeft=canvas.style.paddingRight='0px';
 mobileReader.pages.forEach(section=>{section.querySelector('.reader-page-canvas').style.transform='none'});
 layoutBookViewport.scrollLeft=Math.max(0,(canvas.getBoundingClientRect().width-visible)/2);
}
const layoutStandardZoom=readerZoomTo;
readerZoomTo=function(value){
 if(!mobileReader.active||!mobileReader.mounted){layoutStandardZoom(value);return;}
 const page=mobileReader.pages[currentPage],before=page.getBoundingClientRect(),line=window.innerHeight*.38;
 const offset=(line-before.top)/before.height,canvas=$('book-canvas');
 mobileReader.zoom=Number(value);$('reader-zoom').value=String(value);$('book-zoom').value=String(value);
 canvas.style.setProperty('--layout-book-width',value+'%');
 mobileReader.pages.forEach(section=>{section.querySelector('.reader-page-canvas').style.width='100%';section.querySelector('.reader-page-viewport').scrollLeft=0});
 layoutCenterBook();const after=page.getBoundingClientRect();
 scrollWindowTo(0,Math.max(0,(window.scrollY||0)+after.top+offset*after.height-line));
};
window.addEventListener('resize',layoutCenterBook);
// Group the reading content; on phones the heading scrolls with the whole panel.
const layoutPanel=$('word-follow-panel'),layoutPanelHeading=layoutPanel.querySelector('.word-follow-heading'),layoutPanelContent=document.createElement('div');
layoutPanelContent.className='layout-follow-content';layoutPanelContent.tabIndex=0;layoutPanelContent.setAttribute('aria-label','逐词跟读内容');
[...layoutPanel.children].filter(node=>node!==layoutPanelHeading).forEach(node=>layoutPanelContent.appendChild(node));layoutPanel.appendChild(layoutPanelContent);
// The original sentence is now the ordered clickable word row, including punctuation.
layoutPanelContent.insertBefore($('word-follow-words'),layoutPanelContent.firstChild);
layoutPanelHeading.insertBefore(layoutPanel.querySelector('.word-follow-actions'),$('word-follow-close'));
$('word-follow-all').textContent='▶ 依次听单词';$('word-follow-all').setAttribute('aria-label','依次听单词');
$('word-follow-whole').textContent='▶ 听整句';$('word-follow-whole').setAttribute('aria-label','听整句');
// Word buttons keep their own audio; the surrounding sentence space plays the sentence.
function layoutSentenceSpaceClick(event){
 if(event.target.closest('button')||!wordFollowCurrent)return;
 const whole=$('word-follow-whole');if(typeof whole.onclick==='function')whole.onclick();
}
$('word-follow-words').addEventListener('click',layoutSentenceSpaceClick);
$('word-follow-words').title='点击单词听单词，点击空白处听整句';
const layoutOriginalPoint=handleBookPoint;
let layoutPanelWordFallback={};
handleBookPoint=function(item,card){layoutPanelWordFallback={};layoutOriginalPoint(item,card);layoutReservePanelSpace();layoutPanelContent.scrollTop=0};
const layoutOriginalWordItem=wordFollowItem;
wordFollowItem=function(token){return layoutPanelWordFallback[token.key]?{...layoutPanelWordFallback[token.key],en:token.text}:layoutOriginalWordItem(token)};
const layoutOriginalFollow=followPlayingCard;
followPlayingCard=function(card){
 let scroller=card&&card.closest('.layout-follow-content');
 if(scroller&&mobileReader.active)scroller=layoutPanel;
 if(!scroller){
  if(!card||!card.closest('.reader-page-canvas'))return layoutOriginalFollow(card);
  if(!followEnabled||followPaused||!card.getClientRects().length||document.visibilityState==='hidden')return false;
  // Textbook following moves only vertically. Preserve centered or manually panned X.
  const target=card.getBoundingClientRect(),height=window.innerHeight||document.documentElement.clientHeight;
  const player=document.querySelector('.player-wrap'),playerBox=player&&player.getBoundingClientRect();
  const panelTop=layoutPanel.hidden?height:layoutPanel.getBoundingClientRect().top;
  const top=16,bottom=Math.min(playerBox&&playerBox.height>0?Math.min(height,playerBox.top):height-64,panelTop)-16,available=bottom-top;
  if(available<=0)return false;
  if(target.top<top||target.bottom>bottom){
   const delta=target.height>available?target.top-top:target.top-(top+(available-target.height)/2);
   scrollWindowTo(window.scrollX||0,Math.max(0,(window.scrollY||0)+delta));
  }
  return true;
 }
 if(!followEnabled||followPaused||!card.getClientRects().length||document.visibilityState==='hidden')return false;
 const box=scroller.getBoundingClientRect(),target=card.getBoundingClientRect(),top=box.top+8,bottom=box.bottom-8;
 if(target.top<top||target.bottom>bottom)scroller.scrollTop+=target.top-top-Math.max(0,(bottom-top-target.height)/2);
 return true;
};
function layoutReservePanelSpace(){
 // The final page needs the same room to scroll above the panel as earlier pages.
 const covered=(!mobileReader.active||layoutPanel.hidden)?0:Math.max(0,window.innerHeight-layoutPanel.getBoundingClientRect().top+16);
 layoutBookViewport.style.marginBottom=covered+'px';
}
function layoutSyncPanelPosition(){const dock=$('reader-dock').getBoundingClientRect();if(dock.height)layoutPanel.style.setProperty('--layout-follow-bottom',(window.innerHeight-dock.top+6)+'px');layoutReservePanelSpace()}
new MutationObserver(layoutReservePanelSpace).observe(layoutPanel,{attributes:true,attributeFilter:['hidden']});
if(typeof ResizeObserver!=='undefined')new ResizeObserver(layoutReservePanelSpace).observe(layoutPanel);
window.addEventListener('resize',layoutSyncPanelPosition);
if(typeof ResizeObserver!=='undefined')new ResizeObserver(layoutSyncPanelPosition).observe($('reader-dock'));
layoutSyncPanelPosition();
const layoutZoomLevels=[...new Set([...Array.from({length:21},(_,i)=>100+i*5),118])].sort((a,b)=>a-b);
const layoutZoomSelect=$('reader-zoom');layoutZoomSelect.textContent='';
for(const value of layoutZoomLevels){const option=document.createElement('option');option.value=String(value);option.textContent=value===100?'100% · 适合宽度':value+'%';layoutZoomSelect.appendChild(option)}
const layoutZoomLabel=layoutZoomSelect.parentNode,layoutStepper=document.createElement('div');layoutStepper.className='layout-zoom-stepper';layoutZoomLabel.parentNode.insertBefore(layoutStepper,layoutZoomLabel);
function layoutZoomStep(delta){
 const value=Math.max(100,Math.min(200,mobileReader.zoom+delta));
 if(![...layoutZoomSelect.options].some(option=>Number(option.value)===value)){
  const option=document.createElement('option');option.value=String(value);option.textContent=value+'%';
  layoutZoomSelect.insertBefore(option,[...layoutZoomSelect.options].find(existing=>Number(existing.value)>value)||null);
 }
 readerZoomTo(value);layoutZoomButtons();
}
const layoutZoomDown=document.createElement('button');layoutZoomDown.type='button';layoutZoomDown.textContent='−';layoutZoomDown.setAttribute('aria-label','缩小 5%');layoutZoomDown.onclick=()=>layoutZoomStep(-5);
const layoutZoomUp=document.createElement('button');layoutZoomUp.type='button';layoutZoomUp.textContent='+';layoutZoomUp.setAttribute('aria-label','放大 5%');layoutZoomUp.onclick=()=>layoutZoomStep(5);
layoutStepper.appendChild(layoutZoomDown);layoutStepper.appendChild(layoutZoomLabel);layoutStepper.appendChild(layoutZoomUp);
function layoutZoomButtons(){layoutZoomDown.disabled=mobileReader.zoom<=100;layoutZoomUp.disabled=mobileReader.zoom>=200}
layoutZoomSelect.onchange=event=>{readerZoomTo(event.target.value);layoutZoomButtons()};layoutZoomButtons();
// Keep page reading available even while the word panel is open.
const layoutPageReadButton=document.createElement('button');layoutPageReadButton.id='layout-read-page';layoutPageReadButton.type='button';layoutPageReadButton.className='layout-read-page';
$('reader-dock').insertBefore(layoutPageReadButton,$('reader-playing'));
function layoutPageIsReading(){return !!(active&&followEnabled&&followCard&&followCard.closest('.reader-page-canvas'))}
function layoutSyncPageReadButton(){
 const reading=layoutPageIsReading();layoutPageReadButton.textContent=reading?'■ 停止':'▶ 朗读本页';layoutPageReadButton.setAttribute('aria-label',reading?'停止本页朗读':'朗读本页');layoutPageReadButton.setAttribute('aria-pressed',String(reading));layoutPageReadButton.disabled=!reading&&!BOOK_PAGES[currentPage].sequence.length;
}
const layoutStandardReadPage=$('read-page').onclick;
const layoutOriginalStop=stop;
stop=function(){layoutOriginalStop();layoutSyncPageReadButton()};$('stop').onclick=stop;
function layoutStartPageReading(){
 if(!mobileReader.mounted){layoutStandardReadPage();return;}
 readerCloseSheets();document.body.classList.remove('reader-audio-open');
 const page=BOOK_PAGES[currentPage],surface=mobileReader.pages[currentPage].querySelector('.reader-page-canvas');
 // Do not close the word panel: playback will update it without restarting audio.
 playSequence(page.sequence.map(pageItem),surface);layoutSyncPageReadButton();
}
$('read-page').onclick=layoutStartPageReading;
layoutPageReadButton.onclick=()=>{if(layoutPageIsReading())stop();else layoutStartPageReading()};
function layoutShowPlayingSentence(item,card){
 layoutPanelWordFallback={};let entry=wordFollowLibrary.sentences[item.en];
 if(!entry){
  const formal=words.find(word=>word.en===item.en),value=formal||item,key='__page_item__';
  layoutPanelWordFallback[key]={...value,en:item.en,ipa:value.ipa||'',ipaDisplay:value.ipaDisplay||'',sourceUnit:CONTENT.unit,definitionSource:formal?'书后词汇表原文':'课文原句释义'};
  entry={en:item.en,zh:item.zh,tokens:[{key,text:item.en,start:0,end:item.en.length}]};
 }
 const changed=!wordFollowCurrent||wordFollowCurrent.en!==entry.en;wordFollowCurrent=entry;wordFollowCard=card;
 document.querySelectorAll('.word-follow-selected').forEach(node=>node.classList.remove('word-follow-selected'));playbackSegments(card).forEach(node=>node.classList.add('word-follow-selected'));
 $('word-follow-sentence').textContent=item.en;$('word-follow-translation').textContent=item.zh;
 const list=$('word-follow-words');list.textContent='';let cursor=0;
 entry.tokens.forEach((token,index)=>{
  if(token.start>cursor)list.appendChild(document.createTextNode(entry.en.slice(cursor,token.start)));
  const word=wordFollowItem(token),button=document.createElement('button');button.type='button';button.className='word-follow-word';button.dataset.file=word.file;button.dataset.wordIndex=String(index);button.textContent=token.text;button.setAttribute('aria-label','跟读单词：'+token.text);button.onclick=()=>play(word,button);list.appendChild(button);cursor=token.end;
 });
 if(cursor<entry.en.length)list.appendChild(document.createTextNode(entry.en.slice(cursor)));
 $('word-follow-all').onclick=()=>playSequence(entry.tokens.map(wordFollowItem),list,false,500);$('word-follow-whole').onclick=()=>play(item,card);
 showWordFollowMeaning(0);if(changed)layoutPanelContent.scrollTop=0;
}
const layoutOriginalUpdateWordPlayback=updateWordFollowPlayback;
updateWordFollowPlayback=function(item,card){
 layoutOriginalUpdateWordPlayback(item,card);
 if(followEnabled&&card&&card.closest('.reader-page-canvas')&&!layoutPanel.hidden)layoutShowPlayingSentence(item,card);
 layoutSyncPageReadButton();
};
const layoutOriginalSetPage=readerSetPage;
readerSetPage=function(index,remember=true){layoutOriginalSetPage(index,remember);layoutSyncPageReadButton()};
for(const event of ['play','playing','pause','ended','error','emptied','timeupdate'])audio.addEventListener(event,layoutSyncPageReadButton);
layoutSyncPageReadButton();
// Show thin rounded frames around the printed text; hit target geometry stays unchanged.
$('show-spots').checked=true;$('show-spots').onchange({target:$('show-spots')});$('reader-spots').checked=true;

let layoutMountedSurface=null;
function layoutActivate(){
 const surface=mobileReader.mounted?mobileReader.pages[0]:null;
 if(mobileReader.active&&surface&&surface!==layoutMountedSurface){layoutMountedSurface=surface;readerZoomTo(118);layoutZoomButtons();}
 layoutReservePanelSpace();layoutSyncPanelPosition();
}
const layoutStandardSync=syncMobileReader;
syncMobileReader=function(){layoutStandardSync();layoutActivate()};
window.addEventListener('resize',layoutActivate);
layoutActivate();
