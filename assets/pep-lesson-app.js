const AUDIO_BASE = "audio/google-v1/";
const $=id=>document.getElementById(id),audio=$('audio');
const words=CONTENT.words,sentences=CONTENT.sentences,expressions=CONTENT.expressions,songs=CONTENT.songs;
const speedSelect=$('playback-speed');
let active=null,queue=[],generation=0,category='key',deck=[],quizIndex=0,answered=false,repeatSequence=null;
let followEnabled=false,followPaused=false,followTimer=null,followCard=null,pointerHeld=false,touchHeld=false,followedGeneration=-1;
function applySpeed(){audio.defaultPlaybackRate=Number(speedSelect.value);audio.playbackRate=Number(speedSelect.value);audio.preservesPitch=true;if('webkitPreservesPitch' in audio)audio.webkitPreservesPitch=true;}
speedSelect.onchange=applySpeed;audio.addEventListener('loadedmetadata',applySpeed);audio.addEventListener('play',applySpeed);
function stop(){followEnabled=false;followPaused=false;clearTimeout(followTimer);followCard=null;generation++;queue=[];repeatSequence=null;finishFollowing();audio.pause();audio.removeAttribute('src');audio.load();document.querySelectorAll('.playing').forEach(el=>el.classList.remove('playing'));active=null;$('status').textContent='已停止播放。'}
function audioLabel(item){return !$('practice').hidden&&$('mode').value==='listen'?'练习音频':item.en}
const FOLLOW_IDLE_MS=5000;
function scheduleFollowResume(){
 clearTimeout(followTimer);
 if(!followEnabled||pointerHeld||touchHeld)return;
 followTimer=setTimeout(()=>{
  followTimer=null;
  if(!followEnabled||pointerHeld||touchHeld)return;
  followPaused=false;
  if(!audio.paused&&!audio.ended)followCurrentPlayback();
 },FOLLOW_IDLE_MS);
}
function pauseFollowForInput(){
 if(!followEnabled)return;
 const wasPaused=followPaused;followPaused=true;
 if(!wasPaused)scrollWindowTo(window.pageXOffset||window.scrollX||0,window.pageYOffset||window.scrollY||0);
 scheduleFollowResume();
}
const passiveInput={passive:true,capture:true};
window.addEventListener('wheel',pauseFollowForInput,passiveInput);
window.addEventListener('pointerdown',()=>{pointerHeld=followEnabled;pauseFollowForInput()},passiveInput);
window.addEventListener('pointerup',()=>{pointerHeld=false;if(followPaused)scheduleFollowResume()},passiveInput);
window.addEventListener('pointercancel',()=>{pointerHeld=false;if(followPaused)scheduleFollowResume()},passiveInput);
window.addEventListener('touchstart',()=>{touchHeld=followEnabled;pauseFollowForInput()},passiveInput);
window.addEventListener('touchmove',pauseFollowForInput,passiveInput);
function releaseFollowTouch(event){touchHeld=event.touches.length>0;if(followPaused)scheduleFollowResume()}
window.addEventListener('touchend',releaseFollowTouch,passiveInput);
window.addEventListener('touchcancel',releaseFollowTouch,passiveInput);
window.addEventListener('scroll',()=>{if(followPaused)scheduleFollowResume()},{passive:true,capture:true});
window.addEventListener('keydown',pauseFollowForInput,passiveInput);
function releaseFollowGesture(){const held=pointerHeld||touchHeld;pointerHeld=false;touchHeld=false;if(followPaused&&held)scheduleFollowResume()}
window.addEventListener('click',releaseFollowGesture,passiveInput);
window.addEventListener('blur',releaseFollowGesture);
window.addEventListener('focus',()=>{releaseFollowGesture();if(!audio.paused)followCurrentPlayback()});
function scrollWindowTo(x,y){
 const root=document.scrollingElement||document.documentElement||document.body;
 if(root){root.scrollTop=y;root.scrollLeft=x;}
 // Use numeric coordinates: older phone browsers may ignore options without throwing.
 try{window.scrollTo(x,y)}catch(error){if(document.body){document.body.scrollTop=y;document.body.scrollLeft=x;}}
}
function followPlayingCard(card){
 if(!followEnabled||followPaused||!card||!card.getClientRects().length||document.visibilityState==='hidden')return false;
 let bookViewport=card;
 while(bookViewport&&!(bookViewport.classList&&bookViewport.classList.contains('book-viewport')))bookViewport=bookViewport.parentNode;
 if(bookViewport){
  const box=bookViewport.getBoundingClientRect(),target=card.getBoundingClientRect();
  const dy=target.top<box.top+12||target.bottom>box.bottom-12?target.top-box.top-(box.height-target.height)/2:0;
  const dx=target.left<box.left+12||target.right>box.right-12?target.left-box.left-(box.width-target.width)/2:0;
  if(dy||dx){bookViewport.scrollTop+=dy;bookViewport.scrollLeft+=dx;}
 }
 const rect=card.getBoundingClientRect(),viewport=window.innerHeight||document.documentElement.clientHeight;
 const player=document.querySelector('.player-wrap'),playerTop=player?player.getBoundingClientRect().top:viewport;
 const top=16,bottom=Math.min(viewport,playerTop)-16,height=Math.max(0,bottom-top);
 if(!height)return false;
 if(rect.top>=top&&rect.bottom<=bottom)return true;
 const delta=rect.height>height?rect.top-top:rect.top-(top+(height-rect.height)/2);
 const root=document.scrollingElement||document.documentElement||document.body;
 const y=window.pageYOffset||window.scrollY||(root&&root.scrollTop)||0;
 const x=window.pageXOffset||window.scrollX||(root&&root.scrollLeft)||0;
 scrollWindowTo(x,Math.max(0,y+delta));
 return true;
}
function followCurrentPlayback(){if(!audio.paused&&followPlayingCard(followCard))followedGeneration=generation}
function finishFollowing(){followEnabled=false;followPaused=false;clearTimeout(followTimer);followCard=null;}
function play(item,card,continuing=false){if(!continuing)stop();const token=++generation;active=item;followCard=card;document.querySelectorAll('.playing').forEach(el=>el.classList.remove('playing'));if(card)card.classList.add('playing');audio.src=item.audioUrl||AUDIO_BASE+item.file;applySpeed();$('status').textContent='正在加载：'+audioLabel(item);const result=audio.play();if(result)result.then(()=>{if(token===generation){$('status').textContent='正在播放：'+audioLabel(item)}}).catch(()=>{if(token===generation){queue=[];repeatSequence=null;finishFollowing();$('status').textContent='未能播放，请点击播放器重试，并检查网络和媒体音量。'}})}
function playSequence(items,container,repeat=false){if(!items.length)return;stop();pointerHeld=false;touchHeld=false;followEnabled=true;followedGeneration=-1;const occurrences={};const entries=items.map(item=>{const cards=container?container.querySelectorAll('[data-file="'+item.file+'"]'):[];const occurrence=occurrences[item.file]||0;occurrences[item.file]=occurrence+1;return {item,card:cards.length?cards[Math.min(occurrence,cards.length-1)]:null}});queue=entries.slice();if(repeat)repeatSequence=entries;const first=queue.shift();play(first.item,first.card,true)}
audio.addEventListener('ended',()=>{document.querySelectorAll('.playing').forEach(el=>el.classList.remove('playing'));if(!queue.length&&repeatSequence)queue=repeatSequence.slice();if(queue.length){const entry=queue.shift();play(entry.item,entry.card,true)}else{finishFollowing();$('status').textContent='播放完毕，可以再读一遍。'}});
audio.addEventListener('playing',()=>{if(active)$('status').textContent='正在播放：'+audioLabel(active);followCurrentPlayback()});
audio.addEventListener('timeupdate',()=>{if(followedGeneration!==generation&&!audio.paused){if(active)$('status').textContent='正在播放：'+audioLabel(active);followCurrentPlayback()}});
audio.addEventListener('error',()=>{if(audio.getAttribute('src')){queue=[];repeatSequence=null;finishFollowing();$('status').textContent='音频加载失败，请检查网络，点击卡片重试。'}});
$('stop').onclick=stop;
const playerWrap=document.querySelector('.player-wrap');function syncPlayerHeight(){document.documentElement.style.setProperty('--player-height',Math.ceil(playerWrap.getBoundingClientRect().height)+'px')}
if(typeof ResizeObserver!=='undefined')new ResizeObserver(syncPlayerHeight).observe(playerWrap);window.addEventListener('resize',syncPlayerHeight);syncPlayerHeight();
function setMeaningText(target,text){target.textContent='';const parts=text.split('；');parts.forEach((part,i)=>{const span=document.createElement('span');span.className='word-meaning';span.textContent=part+(i<parts.length-1?'；':'');target.appendChild(span)})}
function renderCards(items,target,kind='sentence'){items.forEach((item,i)=>{const card=document.createElement('button');card.type='button';card.className='card';card.dataset.file=item.file;card.setAttribute('aria-label','播放：'+item.en);const label=document.createElement('span');label.className='number';label.textContent=String(i+1).padStart(2,'0')+(kind==='word'?' · 课文第 '+item.page+' 页':kind==='key'?' · 附录第 '+item.page+' 页':'');const en=document.createElement('div');en.className='en';en.lang='en';en.textContent=item.en;card.appendChild(label);card.appendChild(en);if(item.ipa){const ipa=document.createElement('div');ipa.className='ipa';ipa.textContent=item.ipaDisplay||item.ipa;card.appendChild(ipa)}const zh=document.createElement('div');zh.className='zh';if(kind==='word')setMeaningText(zh,item.zh);else zh.textContent=item.zh;card.appendChild(zh);const speaker=document.createElement('span');speaker.className='speaker';speaker.textContent='♪';speaker.setAttribute('aria-hidden','true');card.appendChild(speaker);card.onclick=()=>play(item,card);$(target).appendChild(card)})}
renderCards(words,'word-cards','word');renderCards(expressions,'key-cards','key');
const textItems=[],textReadItems=[];
CONTENT.groups.forEach((group,i)=>{const section=document.createElement('section');section.className='sentence-group';const head=document.createElement('div');head.className='section-head';const h=document.createElement('h3');h.textContent=group.title;const button=document.createElement('button');button.className='btn';button.type='button';button.textContent='▶ 本组朗读';const note=document.createElement('p');note.className='small';note.textContent=group.note;const grid=document.createElement('div');grid.className='cards sentence-cards';grid.id='text-group-'+i;head.appendChild(h);head.appendChild(button);section.appendChild(head);section.appendChild(note);section.appendChild(grid);$('text-groups').appendChild(section);const items=group.clips.map(n=>sentences[n-1]);textReadItems.push(...items);renderCards(items,grid.id);button.onclick=()=>playSequence(items,grid);items.forEach(item=>{if(item.practice!==false&&!textItems.some(x=>x.en===item.en))textItems.push(item)})});
songs.forEach((song,i)=>{const card=document.createElement('section');card.className='song-card';const h=document.createElement('h3');h.textContent=song.title;h.lang='en';const zh=document.createElement('p');zh.className='small';zh.textContent=song.zh+' · 附录第 '+song.pages.join('、')+' 页';card.appendChild(h);card.appendChild(zh);if(song.lines.length){const controls=document.createElement('div');controls.className='actions';const button=document.createElement('button');button.className='btn primary';button.textContent='▶ 连续朗读歌词';const loopLabel=document.createElement('label');const loop=document.createElement('input');loop.type='checkbox';loopLabel.appendChild(loop);loopLabel.appendChild(document.createTextNode('循环跟读'));controls.appendChild(button);controls.appendChild(loopLabel);card.appendChild(controls);const grid=document.createElement('div');grid.className='cards sentence-cards';grid.id='song-lines-'+i;card.appendChild(grid);$('song-cards').appendChild(card);renderCards(song.lines,grid.id);button.onclick=()=>playSequence(song.lines,grid,loop.checked)}else{const note=document.createElement('p');note.className='song-pending';note.textContent='完整歌词待补充，当前尚无整首歌词朗读。';card.appendChild(note);$('song-cards').appendChild(card)}});
function showCategory(next){stop();category=next;document.querySelectorAll('[data-category]').forEach(button=>{const selected=button.dataset.category===category;button.setAttribute('aria-pressed',selected);$(button.getAttribute('aria-controls')).hidden=!selected});$('read-sentences').hidden=category==='songs';$('read-sentences').textContent=category==='key'?'▶ 依次听重点表达':'▶ 依次听课文句子';$('sentence-section-title').textContent={key:'先学重点表达',text:'回到课文，完整跟读',songs:'歌曲歌词 · 朗读与跟读'}[category]}
document.querySelectorAll('[data-category]').forEach(button=>button.onclick=()=>showCategory(button.dataset.category));
$('read-words').onclick=()=>playSequence(words,$('word-cards'));$('read-sentences').onclick=()=>playSequence(category==='key'?expressions:textReadItems,category==='key'?$('key-cards'):$('text-groups'));
const tabs=[...document.querySelectorAll('nav[aria-label="学习内容"] [role=tab]')];function showTab(tab){stop();tabs.forEach(b=>{const selected=b===tab;b.setAttribute('aria-selected',selected);b.tabIndex=selected?0:-1;$(b.getAttribute('aria-controls')).hidden=!selected});if(tab.id==='tab-practice')resetQuiz()}
tabs.forEach((tab,i)=>{tab.onclick=()=>showTab(tab);tab.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length;tabs[n].focus();showTab(tabs[n])}}});
function shuffle(items){const a=items.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function resetQuiz(){
 stop();quizIndex=0;const mode=$('mode').value;
 $('scope-label').hidden=mode!=='recall'||customPracticeActive();
 deck=shuffle(getQuizPool());renderQuiz();
}
function renderQuiz(){
 stop();answered=false;const item=deck[quizIndex],mode=$('mode').value;
 $('progress').textContent=deck.length?'第 '+(quizIndex+1)+' / '+deck.length+' 题'+(customPracticeActive()?' · 我的自选':''):'尚未选择练习内容';
 $('answer').hidden=true;$('answer-text').textContent='';$('choices').textContent='';$('feedback').textContent='';
 $('reveal').hidden=!item||mode!=='recall';$('listen-prompt').hidden=!item||mode!=='listen';$('choices').hidden=!item||mode==='recall';
 $('prev').disabled=!item||quizIndex===0;$('next').disabled=!item;
 if(!item){$('prompt').textContent='先选一些单词或句子';$('hint').textContent='展开上方选择面板，勾选内容后开始自选练习。';return}
 $('next').textContent=quizIndex===deck.length-1?'再练一轮':'下一题';
 const promptText=mode==='recall'?item.zh:mode==='listen'?'听一听，选出听到的英文':item.en;
 if(mode==='recall'&&words.includes(item))setMeaningText($('prompt'),promptText);else $('prompt').textContent=promptText;
 $('prompt').lang=mode==='translate'?'en':'zh-CN';
 $('hint').textContent=mode==='recall'?'先自己想一想，用英语说出来，再查看答案。':mode==='listen'?'点击“听一听”，选择对应的单词或句子。':'选择正确的中文意思。';
 if(mode!=='recall'){
  const distractors=shuffle(getQuizPool().filter(option=>option.zh!==item.zh&&option.en!==item.en)).slice(0,3);
  if(!distractors.length)$('hint').textContent='当前范围仅有一种可选答案，可先听读，再切换“看中文，想英文”回想；也可以多选一些内容。';
  shuffle([item,...distractors]).forEach(option=>{
   const button=document.createElement('button');button.className='btn';button.type='button';
   if(mode==='listen'){button.textContent=option.en;button.lang='en'}else setMeaningText(button,option.zh);
   button.onclick=()=>{if(answered)return;if(option.en===item.en){answered=true;button.classList.add('correct');$('feedback').textContent='答对了！'+item.en+' · '+item.zh}else{button.classList.add('wrong');button.disabled=true;$('feedback').textContent='再想一想，你可以继续选择。'}};
   $('choices').appendChild(button);
  });
 }
}
$('reveal').onclick=()=>{if(!deck[quizIndex])return;$('answer-text').textContent=deck[quizIndex].en;$('answer').hidden=false;$('reveal').hidden=true;$('hint').textContent='对照参考答案，再听一听、跟读一次。部分中文也有其他正确表达。'};
$('answer-audio').onclick=()=>{if(deck[quizIndex])play(deck[quizIndex])};$('listen-prompt').onclick=()=>{if(deck[quizIndex])play(deck[quizIndex])};$('mode').onchange=resetQuiz;$('scope').onchange=resetQuiz;$('prev').onclick=()=>{if(quizIndex>0){quizIndex--;renderQuiz()}};$('next').onclick=()=>{if(quizIndex===deck.length-1)resetQuiz();else{quizIndex++;renderQuiz()}};
showCategory('key');
