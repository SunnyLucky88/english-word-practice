// The mode affects textbook hotspot clicks only. All speech uses the shared saved-audio player.
const wordFollowLibrary=JSON.parse($('word-follow-library').textContent);
let wordFollowEnabled=false,wordFollowCurrent=null,wordFollowCard=null;
try{wordFollowEnabled=window.localStorage.getItem('pep-word-follow-enabled-v1')==='true'}catch(error){}
function syncWordFollowUI(){
 const button=$('word-follow-toggle');button.textContent='逐词：'+(wordFollowEnabled?'开':'关');button.setAttribute('aria-pressed',String(wordFollowEnabled));
 button.hidden=$('book').hidden||!$('lookup-panel').hidden;
}
function closeWordFollow(restoreFocus=false){
 const open=!$('word-follow-panel').hidden,card=wordFollowCard;
 if(open)stop();$('word-follow-panel').hidden=true;wordFollowCurrent=null;wordFollowCard=null;
 document.querySelectorAll('.word-follow-selected').forEach(el=>el.classList.remove('word-follow-selected'));
 if(restoreFocus&&card)card.focus();
}
function wordFollowItem(token){return {...wordFollowLibrary.words[token.key],en:token.text}}
function showWordFollowMeaning(index){
 if(!wordFollowCurrent)return;
 const token=wordFollowCurrent.tokens[index],word=wordFollowItem(token);
 $('word-follow-en').textContent=token.text;$('word-follow-ipa').textContent=word.ipaDisplay||word.ipa||'';$('word-follow-ipa').hidden=!word.ipa;
 if(word.definitionSource==='书后词汇表原文')setMeaningText($('word-follow-meaning'),word.zh);else $('word-follow-meaning').textContent=word.zh;
 $('word-follow-source').textContent=(word.sourceUnit?'第 '+word.sourceUnit+' 单元 · ':'')+word.definitionSource;
 const note=[word.base?'原形：'+word.base:'',word.expanded?'展开形式：'+word.expanded:'',word.note].filter(Boolean).join(' ');
 $('word-follow-note').textContent=note;$('word-follow-note').hidden=!note;
}
function updateWordFollowPlayback(item,card){if(card&&card.parentNode===$('word-follow-words'))showWordFollowMeaning(Number(card.dataset.wordIndex))}
function handleBookPoint(item,card){
 const entry=wordFollowLibrary.sentences[item.en];
 if(!wordFollowEnabled||!entry){closeWordFollow();play(item,card);return;}
 stop();if(!$('lookup-panel').hidden)showLookup(false);
 wordFollowCurrent=entry;wordFollowCard=card;
 document.querySelectorAll('.word-follow-selected').forEach(el=>el.classList.remove('word-follow-selected'));playbackSegments(card).forEach(el=>el.classList.add('word-follow-selected'));
 $('word-follow-sentence').textContent=item.en;$('word-follow-translation').textContent=item.zh;
 const list=$('word-follow-words');list.textContent='';let cursor=0;
 entry.tokens.forEach((token,index)=>{
  if(token.start>cursor)list.appendChild(document.createTextNode(entry.en.slice(cursor,token.start)));
  const word=wordFollowItem(token),button=document.createElement('button');button.type='button';button.className='word-follow-word';button.dataset.file=word.file;button.dataset.wordIndex=String(index);button.textContent=token.text;button.setAttribute('aria-label','跟读单词：'+token.text);button.onclick=()=>play(word,button);list.appendChild(button);cursor=token.end;
 });
 if(cursor<entry.en.length)list.appendChild(document.createTextNode(entry.en.slice(cursor)));
 $('word-follow-all').onclick=()=>playSequence(entry.tokens.map(wordFollowItem),list,false,500);
 $('word-follow-whole').onclick=()=>play(item,card);
 $('word-follow-panel').hidden=false;showWordFollowMeaning(0);syncWordFollowUI();$('word-follow-close').focus();
 $('status').textContent='已拆分句子，点击单词开始跟读。';
}
$('word-follow-toggle').onclick=()=>{
 wordFollowEnabled=!wordFollowEnabled;closeWordFollow();stop();
 try{window.localStorage.setItem('pep-word-follow-enabled-v1',String(wordFollowEnabled))}catch(error){}
 syncWordFollowUI();$('status').textContent=wordFollowEnabled?'逐词模式已开启，点击课本中的句子。':'已恢复整句点读。';
};
$('word-follow-close').onclick=()=>closeWordFollow(true);
$('word-follow-panel').onkeydown=event=>{if(event.key==='Escape'){event.preventDefault();closeWordFollow(true)}};
syncWordFollowUI();
