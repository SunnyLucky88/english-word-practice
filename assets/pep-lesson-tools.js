// Optional learning tools share the textbook data and the single audio player.
function normalizedEnglish(value){return String(value).trim().toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g,' ').replace(/[.!?。！？]+$/,'')}
function makePracticeBank(){
 const result=[],byEnglish=new Map();
 words.forEach(item=>result.push({id:'word:'+normalizedEnglish(item.en),kind:'word',item,pages:[item.page],key:false}));
 function add(item,page,key){
  if(item.practice===false)return;
  const normalized=normalizedEnglish(item.en);let entry=byEnglish.get(normalized);
  if(!entry){entry={id:'sentence:'+normalized,kind:'sentence',item,pages:[],key:false};byEnglish.set(normalized,entry);result.push(entry)}
  if(page&&page<78&&!entry.pages.includes(page))entry.pages.push(page);
  if(key)entry.key=true;
 }
 CONTENT.groups.forEach(group=>{const match=group.note.match(/第\s*(\d+)\s*页/);group.clips.forEach(id=>add(sentences[id-1],match?Number(match[1]):sentences[id-1].page,false))});
 expressions.forEach(item=>add(item,null,true));
 return result;
}
const practiceBank=makePracticeBank(),selectionKey='pep-custom-unit-'+CONTENT.unit+'-v1';
let selectedPracticeIds=new Set(),storageAvailable=true;
try{const saved=JSON.parse(window.localStorage.getItem(selectionKey)||'[]');if(Array.isArray(saved))selectedPracticeIds=new Set(saved.filter(id=>practiceBank.some(entry=>entry.id===id)))}catch(error){storageAvailable=false}
function selectedPracticeEntries(){return practiceBank.filter(entry=>selectedPracticeIds.has(entry.id))}
function customPracticeActive(){return $('practice-source').value==='custom'}
function getQuizPool(){
 if(customPracticeActive())return selectedPracticeEntries().map(entry=>entry.item);
 const scope=$('scope').value;
 return $('mode').value!=='recall'||scope==='words'?words:scope==='key'?expressions:textItems;
}
function savePracticeSelection(){
 try{window.localStorage.setItem(selectionKey,JSON.stringify([...selectedPracticeIds]));storageAvailable=true}catch(error){storageAvailable=false}
 updateSelectionSummary();
}
function updateSelectionSummary(){
 const selected=selectedPracticeEntries(),wordCount=selected.filter(entry=>entry.kind==='word').length;
 $('selection-summary').textContent='已选 '+wordCount+' 个单词、'+(selected.length-wordCount)+' 个句子';
 $('selection-storage-note').textContent=storageAvailable?'已保存在当前浏览器。':'当前浏览器无法保存，选择仅在本页有效。';
 $('start-custom').disabled=!selected.length;
}
function filteredPracticeEntries(){
 const kind=$('picker-kind').value,page=$('picker-page').value,query=$('picker-search').value.trim().toLowerCase();
 return practiceBank.filter(entry=>(kind==='all'||entry.kind===kind)&&(page==='all'||entry.pages.includes(Number(page)))&&(!query||(entry.item.en+' '+entry.item.zh).toLowerCase().includes(query)));
}
function renderPracticePicker(){
 const list=$('picker-list'),filtered=filteredPracticeEntries();list.textContent='';
 $('picker-count').textContent='当前筛选 '+filtered.length+' 条；勾选筛选结果会保留其他已选内容。';
 if(!filtered.length){const empty=document.createElement('p');empty.className='picker-empty';empty.textContent='没有匹配内容，请调整类型、页码或搜索文字。';list.appendChild(empty)}
 filtered.forEach(entry=>{
  const row=document.createElement('label');row.className='picker-row '+entry.kind;
  const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=selectedPracticeIds.has(entry.id);checkbox.setAttribute('aria-label','选择：'+entry.item.en);checkbox.dataset.selectionId=entry.id;
  const copy=document.createElement('span');copy.className='picker-copy';
  const en=document.createElement('div');en.className='picker-en';en.lang='en';en.textContent=entry.item.en;
  const zh=document.createElement('div');zh.className='picker-zh';if(entry.kind==='word')setMeaningText(zh,entry.item.zh);else zh.textContent=entry.item.zh;
  const meta=document.createElement('div');meta.className='picker-meta';meta.textContent=(entry.kind==='word'?'单词':'句子')+(entry.pages.length?' · 课本第 '+entry.pages.slice().sort((a,b)=>a-b).join('、')+' 页':'')+(entry.key?' · 重点表达':'');
  copy.appendChild(en);copy.appendChild(zh);copy.appendChild(meta);row.appendChild(checkbox);row.appendChild(copy);list.appendChild(row);
  checkbox.onchange=()=>{if(checkbox.checked)selectedPracticeIds.add(entry.id);else selectedPracticeIds.delete(entry.id);savePracticeSelection();if(customPracticeActive())resetQuiz()};
 });
}
$('practice-source').value='standard';$('picker-kind').value='all';$('picker-page').value='all';$('picker-search').value='';
[...new Set(practiceBank.flatMap(entry=>entry.pages))].sort((a,b)=>a-b).forEach(page=>{const option=document.createElement('option');option.value=String(page);option.textContent='第 '+page+' 页';$('picker-page').appendChild(option)});
$('picker-kind').onchange=renderPracticePicker;$('picker-page').onchange=renderPracticePicker;$('picker-search').oninput=renderPracticePicker;
$('select-visible').onclick=()=>{filteredPracticeEntries().forEach(entry=>selectedPracticeIds.add(entry.id));savePracticeSelection();renderPracticePicker();if(customPracticeActive())resetQuiz()};
$('clear-selection').onclick=()=>{selectedPracticeIds.clear();savePracticeSelection();renderPracticePicker();if(customPracticeActive())resetQuiz()};
$('practice-source').onchange=()=>{if(customPracticeActive()&&!selectedPracticeEntries().length)$('custom-picker').open=true;resetQuiz()};
$('start-custom').onclick=()=>{$('practice-source').value='custom';$('custom-picker').open=false;resetQuiz();$('prompt').setAttribute('tabindex','-1');$('prompt').focus()};
updateSelectionSummary();renderPracticePicker();

let lookupItem=null;
const lookupLibrary=(()=>{try{return JSON.parse($('lookup-library').textContent)}catch(error){return []}})();
function showLookup(open){
 if(open&&typeof closeWordFollow==='function')closeWordFollow();
 $('lookup-panel').hidden=!open;$('lookup-toggle').hidden=open;$('lookup-toggle').setAttribute('aria-expanded',String(open));
 if(open){stop();$('lookup-input').focus()}else{if(active===lookupItem)stop();$('lookup-toggle').focus()}
 if(typeof syncWordFollowUI==='function')syncWordFollowUI();
}
$('lookup-toggle').onclick=()=>showLookup(true);$('lookup-close').onclick=()=>showLookup(false);
$('lookup-panel').onkeydown=event=>{if(event.key==='Escape'){event.preventDefault();showLookup(false)}};
function renderLookupResult(item,source,matches=[]){
 lookupItem=item;$('lookup-result').classList.toggle('lookup-word',item.kind==='textbook-word'||item.kind==='supplemental'||item.kind==='letter');$('lookup-en').textContent=item.en;$('lookup-zh').textContent='';
 if(item.kind==='textbook-word')setMeaningText($('lookup-zh'),item.zh);else $('lookup-zh').textContent=item.zh;
 $('lookup-source').textContent=source;
 const parts=[];if(item.base)parts.push('原形：'+item.base);if(item.expanded)parts.push('展开形式：'+item.expanded);if(item.note)parts.push(item.note);
 $('lookup-note').textContent=parts.join(' ');$('lookup-note').hidden=!parts.length;
 $('lookup-audio').textContent=item.note&&item.note.includes('重点核听')?'▶ 试听单词（读音待核对）':'▶ 听发音';
 const list=$('lookup-contexts');list.textContent='';const seen=new Set(),occurrences=[];
 for(const match of [item,...matches])for(const occurrence of match.occurrences||[]){const key=occurrence.unit+':'+occurrence.page+':'+occurrence.en;if(!seen.has(key)){seen.add(key);occurrences.push(occurrence)}}
 for(const occurrence of occurrences.slice(0,3)){
  const row=document.createElement('div');row.className='lookup-context';
  const meta=document.createElement('p');meta.className='small';meta.textContent='第 '+occurrence.unit+' 单元 · '+(occurrence.page>=78?'附录':'课本')+'第 '+occurrence.page+' 页';
  const en=document.createElement('p');en.className='lookup-context-en';en.lang='en';en.textContent=occurrence.en;
  const zh=document.createElement('p');zh.className='lookup-context-zh';zh.textContent=occurrence.zh;
  const button=document.createElement('button');button.type='button';button.className='btn';button.textContent='▶ 听原句';button.onclick=()=>play(occurrence);
  row.appendChild(meta);row.appendChild(en);row.appendChild(zh);row.appendChild(button);list.appendChild(row);
 }
 $('lookup-context-section').hidden=!occurrences.length;
 $('lookup-result').hidden=false;$('lookup-message').textContent='已在课程内找到，点击听发音。'+(occurrences.length>3?' 已显示 '+occurrences.length+' 处出处中的前 3 处。':'');
}
function lookupText(){
 const text=$('lookup-input').value.trim().replace(/\s+/g,' ');lookupItem=null;$('lookup-result').hidden=true;stop();
 if(!text||text.length>200||!/[a-z]/i.test(text)||/[^\x20-\x7e’‘“”–—…]/.test(text)){$('lookup-message').textContent='请输入英文单词或句子（最多 200 字符）。';return}
 const normalized=normalizedEnglish(text);
 function rank(item){const priority={'textbook-word':0,supplemental:2,'course-text':4,letter:6};return priority[item.kind]+(item.unit===CONTENT.unit?0:1)}
 const matches=lookupLibrary.filter(item=>normalizedEnglish(item.en)===normalized||(item.aliases||[]).some(alias=>normalizedEnglish(alias)===normalized)).sort((a,b)=>rank(a)-rank(b));
 if(!matches.length){$('lookup-message').textContent='课程暂未收录这个词句。可查询六个单元的词汇、课文补充词及已收录原句。';return}
 const item=matches[0],kind=item.kind==='textbook-word'?'书后词汇表原文':item.kind==='supplemental'?'课文补充释义':item.kind==='letter'?'字母名称音':'课程已有词句';
 renderLookupResult(item,'第 '+item.unit+' 单元 · '+kind+' · 本站谷歌原速音频。',matches.slice(1));
}
$('lookup-form').onsubmit=event=>{event.preventDefault();lookupText()};
$('lookup-input').onkeydown=event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();lookupText()}};
$('lookup-audio').onclick=()=>{if(lookupItem)play(lookupItem)};
