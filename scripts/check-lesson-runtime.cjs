// Validate the shipped inline app with controlled DOM, audio and timers.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
async function check(course){
 const unit=Number(course.href.match(/unit(\d+)\.html$/)[1]);
 const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,course.href),'utf8'),CONTENT=JSON.parse(html.match(/id="lesson-content">([\s\S]*?)<\/script>/)[1]),audioBase=html.match(/const AUDIO_BASE = "([^"]+)";/)[1];
 const nodes={},all=[],listeners={},events={},timers=new Map(),played=[];let timerId=0,scrolls=0,rejectNext=false,legacyPlayback=false,noPlayingEvent=false;
 const playbackCss=fs.readFileSync(path.join(root,'assets/pep-playback.css'),'utf8');
 assert.equal(html.match(/<style id="playback-styles">\n([\s\S]*?)\n<\/style>/)?.[1],playbackCss,'Shipped playback styles must match their shared source');
 assert.match(playbackCss,/(?:^|\n)\.hotspot\.playing\s*\{[^}]*border: 3px solid #[0-9a-f]+;[^}]*background: rgba\(/,'The active frame must have its own legacy-compatible selector and colors');
 assert.doesNotMatch(html,/\.hotspot:hover,\.hotspot:focus-visible,\.hotspot.playing/,'Unknown focus selectors must not invalidate playback highlighting');
 function element(tag='div'){
  const classes=new Set(),attributes={};const e={tagName:tag.toUpperCase(),children:[],style:{setProperty(){}},dataset:{},hidden:false,value:'',disabled:false,parentNode:null,
   classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),toggle(c,on){if(on===undefined)on=!classes.has(c);on?classes.add(c):classes.delete(c)},contains:c=>classes.has(c)},
   set className(v){classes.clear();v.split(/\s+/).forEach(c=>classes.add(c))},get className(){return [...classes].join(' ')},
   set id(v){this._id=v;nodes[v]=this},get id(){return this._id},
   set textContent(v){this.text=String(v);this.children=[]},get textContent(){return (this.text||'')+this.children.map(c=>c.textContent).join('')},
   appendChild(child){this.children.push(child);child.parentNode=this;return child},setAttribute(k,v){attributes[k]=String(v)},getAttribute(k){return k==='src'?this.src||null:attributes[k]??null},removeAttribute(k){delete attributes[k];if(k==='src')this.src=''},focus(){},
   getClientRects:()=>[1],getBoundingClientRect:()=>({top:900,bottom:1000,height:100,left:100,right:200,width:100}),
   closest(selector){for(let p=this;p;p=p.parentNode)if(matches(p,selector))return p;return null},
   querySelectorAll(selector){const children=this.children.flatMap(c=>[c,...c.descendants()]);return children.filter(c=>matches(c,selector))},querySelector(selector){return this.querySelectorAll(selector)[0]||null},descendants(){return this.children.flatMap(c=>[c,...c.descendants()])}
  };all.push(e);return e;
 }
 function matches(el,s){if(s[0]==='.')return el.classList.contains(s.slice(1));const m=s.match(/^\[data-file="(.*)"\]$/);return !!m&&el.dataset.file===m[1]}
 for(const m of html.matchAll(/<([a-z0-9-]+)\b([^>]*\bid="([^"]+)"[^>]*)>/g)){const e=element(m[1]);e.id=m[3];e.hidden=/\bhidden\b/.test(m[2]);}
 for(const id of ['book','words','sentences','practice'])nodes['tab-'+id].setAttribute('aria-controls',id);
 const category=['key','text','songs'].map(k=>{const e=element('button');e.dataset.category=k;e.setAttribute('aria-controls','panel-'+k);return e});
 const player=element();player.getBoundingClientRect=()=>({top:680,height:120});
 const bookViewport=element();bookViewport.className='book-viewport';bookViewport.scrollTop=0;bookViewport.scrollLeft=0;bookViewport.getBoundingClientRect=()=>({top:100,bottom:600,height:500,left:0,right:300,width:300});nodes['book-canvas'].parentNode=bookViewport;
 nodes['word-follow-panel'].className='word-follow-panel';nodes['word-follow-panel'].scrollTop=0;nodes['word-follow-panel'].getBoundingClientRect=()=>({top:100,bottom:600,height:500});nodes['word-follow-words'].parentNode=nodes['word-follow-panel'];
 const audio=nodes.audio;Object.assign(audio,{paused:true,ended:false,addEventListener:(k,f)=>(events[k]??=[]).push(f),pause(){this.paused=true},load(){},play(){this.paused=false;this.ended=false;played.push(this.src);if(rejectNext){rejectNext=false;return Promise.reject(Error('blocked'))}if(!noPlayingEvent)for(const f of events.playing||[])f();return legacyPlayback?undefined:Promise.resolve()}});
 const $=id=>{assert.ok(nodes[id],id);return nodes[id]};nodes['playback-speed'].value='1';nodes.mode.value='recall';nodes.scope.value='words';
 const document={getElementById:$,createElement:element,createTextNode:t=>{const e=element();e.textContent=t;return e},documentElement:{style:{setProperty(){}},clientHeight:800},
  querySelector:s=>s==='.player-wrap'?player:null,querySelectorAll:s=>s==='.playing'||s==='.word-follow-selected'?all.filter(e=>e.classList.contains(s.slice(1))):s==='[data-category]'?category:s.includes('[role=tab]')?['book','words','sentences','practice'].map(k=>nodes['tab-'+k]):[]};
 const saved=new Map();nodes['lookup-library'].textContent=html.match(/id="lookup-library">([\s\S]*?)<\/script>/)[1];
 nodes['word-follow-library'].textContent=html.match(/id="word-follow-library">([\s\S]*?)<\/script>/)[1];
 const context={CONTENT,document,window:{localStorage:{getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)},innerHeight:800,scrollX:0,scrollY:0,addEventListener:(k,f)=>(listeners[k]??=[]).push(f),matchMedia:()=>({matches:false}),scrollTo(x,y){if(typeof x==='number'&&typeof y==='number'){this.scrollX=x;this.scrollY=y;scrolls++}},scrollBy(value){if(!legacyPlayback||typeof value==='number')scrolls++}},setTimeout:(f,ms)=>{assert.ok([500,5000,45000].includes(ms));timers.set(++timerId,f);return timerId},clearTimeout:id=>timers.delete(id)};
 vm.createContext(context);const run=s=>vm.runInContext(s,context),flush=async()=>{await Promise.resolve();await Promise.resolve()};
 run(html.match(/id="lesson-controller">([\s\S]*?)<\/script>/)[1]);
 run(html.match(/id="textbook-controller">([\s\S]*?)<\/script>/)[1]);
 const pages=run('BOOK_PAGES');let pagesPlayed=0;
 for(let p=0;p<pages.length;p++){
  nodes['book-page'].onchange({target:{value:String(p)}});played.length=0;nodes['read-page'].onclick();await flush();
  function assertHighlight(index){const current=run('followCard');if(!current)return;assert.equal(current.classList.contains('playing'),true,'Current spoken item must be highlighted');assert.equal(current.dataset.file,run('active.file'));if(index!==undefined)assert.equal(current.dataset.readIndex,String(index),'Repeated utterances must select their actual occurrence');const expected=nodes['book-canvas'].children.filter(e=>e.dataset.readIndex===current.dataset.readIndex&&e.dataset.file===current.dataset.file);assert.equal(document.querySelectorAll('.playing').length,expected.length,'Highlight every wrapped segment of only the current occurrence');for(const e of expected)assert.ok(e.classList.contains('playing'));}
  let readingIndex=0;assertHighlight(readingIndex);
  while(run('queue.length')){const previous=run('followCard');for(const f of events.ended)f();await flush();assertHighlight(++readingIndex);if(previous&&previous!==run('followCard'))assert.equal(previous.classList.contains('playing'),false,'Previous frame must be cleared on the next item')}
  for(const f of events.ended)f();await flush();
  const expected=Array.from(pages[p].sequence,ref=>audioBase+(typeof ref==='string'?CONTENT.words.find(w=>w.en===ref):CONTENT.sentences[ref-1]).file);
  assert.deepEqual(played,expected,`Unit${unit} page${pages[p].page}`);assert.equal(run('followEnabled'),false);assert.equal(document.querySelectorAll('.playing').length,0,'Playback completion clears the frame');pagesPlayed++;
  // Every clickable segment must play its own PDF text, including wrapped and repeated lines.
  const spots=nodes['book-canvas'].children.filter(e=>e.classList.contains('hotspot'));
  for(let i=0;i<spots.length;i++){const spot=pages[p].spots[i],ref=spot.w||spot.s,item=typeof ref==='string'?CONTENT.words.find(w=>w.en===ref):CONTENT.sentences[ref-1];spots[i].onclick();await flush();assert.equal(audio.src,audioBase+item.file);assert.equal(run('active.en'),item.en);assertHighlight(spot.readIndex);}
  nodes.stop.onclick();
 }
 assert.ok(bookViewport.scrollTop>0,'Textbook follows within its own scroll container');
 // All cards must display canonical spelling, complete meaning and the textbook IPA scope.
 CONTENT.words.forEach((word,i)=>{const card=nodes['word-cards'].children[i];assert.equal(card.children.find(e=>e.classList.contains('en')).textContent,word.en);assert.equal(card.children.find(e=>e.classList.contains('ipa')).textContent,word.ipaDisplay||word.ipa);assert.equal(card.children.find(e=>e.classList.contains('zh')).textContent,word.zh)});
 for(const speed of ['0.75','0.85','1','1.15']){nodes['playback-speed'].value=speed;nodes['playback-speed'].onchange();assert.equal(audio.playbackRate,Number(speed));assert.equal(audio.preservesPitch,true)}
 // Every song retains repeated lines; looping restarts from line one and Stop clears the loop.
 for(let i=0;i<CONTENT.songs.length;i++){
  const song=CONTENT.songs[i],grid=nodes['song-lines-'+i],controls=grid.parentNode.children[2],button=controls.children[0],loop=controls.children[1].children[0];
  loop.checked=false;played.length=0;button.onclick();await flush();while(run('queue.length')){for(const f of events.ended)f();await flush()}for(const f of events.ended)f();
  assert.deepEqual(played,song.lines.map(line=>audioBase+line.file));assert.equal(run('repeatSequence'),null);
  loop.checked=true;played.length=0;button.onclick();await flush();for(let j=0;j<song.lines.length+1;j++){for(const f of events.ended)f();await flush()}
  assert.deepEqual(played,song.lines.concat(song.lines.slice(0,2)).map(line=>audioBase+line.file));nodes.stop.onclick();assert.equal(run('repeatSequence'),null);assert.equal(run('queue.length'),0);assert.equal(timers.size,0);
 }
 // Whole-text playback keeps repeated lines, while quizzes retain distinct questions.
 category[1].onclick();played.length=0;nodes['read-sentences'].onclick();await flush();while(run('queue.length')){for(const f of events.ended)f();await flush()}
 assert.deepEqual(played,CONTENT.groups.flatMap(g=>g.clips.map(n=>audioBase+CONTENT.sentences[n-1].file)));run('stop()');
 for(const scope of ['words','key','text']){nodes.scope.value=scope;nodes['tab-practice'].onclick();const n=run('deck.length');assert.ok(n>0);for(let i=0;i<n;i++){assert.equal(nodes.answer.hidden,true);nodes.reveal.onclick();assert.equal(nodes.answer.hidden,false);assert.ok(nodes['answer-text'].textContent);nodes.next.onclick()}}
 for(const mode of ['listen','translate']){nodes.mode.value=mode;nodes.mode.onchange();assert.equal(nodes.choices.children.length,4);assert.equal(nodes['scope-label'].hidden,true);const correct=run('deck[quizIndex]');const choices=nodes.choices.children;const right=choices.find(e=>e.textContent===(mode==='listen'?correct.en:correct.zh));assert.ok(right);right.onclick();assert.equal(run('answered'),true)}
 // Manual gestures do not stop audio; holding a gesture and inertia postpone resumption.
 nodes['tab-words'].onclick();nodes['read-words'].onclick();await flush();const count=scrolls;listeners.wheel[0]();assert.equal(run('followPaused'),true);assert.equal(audio.paused,false);
 listeners.pointerdown[0]();assert.equal(timers.size,0);listeners.pointerup[0]();assert.equal(timers.size,1);listeners.scroll[0]();assert.equal(timers.size,1);const resume=[...timers.values()][0];timers.clear();resume();assert.equal(run('followPaused'),false);assert.ok(scrolls>count);
 listeners.wheel[0]();nodes.stop.onclick();assert.equal(timers.size,0);assert.equal(run('queue.length'),0);assert.equal(audio.paused,true);
 // Rapid clicks keep the last request; blocked playback clears follow/queue.
 const cards=nodes['word-cards'].children;cards[0].onclick();cards[1].onclick();await flush();assert.equal(run('active.en'),CONTENT.words[1].en);
 rejectNext=true;nodes['read-words'].onclick();await flush();assert.equal(run('queue.length'),0);assert.equal(run('followEnabled'),false);assert.equal(document.querySelectorAll('.playing').length,0,'Rejected playback clears all frames');
 nodes['read-words'].onclick();await flush();for(const f of events.error)f();assert.equal(run('queue.length'),0);assert.equal(run('followEnabled'),false);assert.equal(timers.size,0);assert.equal(document.querySelectorAll('.playing').length,0,'Loading errors clear wrapped frames');
 // Some phone browsers return no play Promise and silently ignore scroll options.
 legacyPlayback=true;const legacyBefore=scrolls;nodes['read-words'].onclick();await flush();assert.ok(scrolls>legacyBefore,'Phone playback events must scroll without a play Promise or scroll options');
 listeners.blur[0]();assert.equal(run('followPaused'),false,'Media/window focus changes are not manual scrolling');
 listeners.wheel[0]();const idleTimer=[...timers.keys()][0];listeners.blur[0]();listeners.focus[0]();assert.equal([...timers.keys()][0],idleTimer,'Repeated media focus must not restart the five-second idle wait');
 const idleResume=timers.get(idleTimer);timers.clear();idleResume();assert.equal(run('followPaused'),false);
 nodes['tab-book'].onclick();nodes['book-page'].onchange({target:{value:'1'}});bookViewport.scrollTop=0;nodes['read-page'].onclick();await flush();assert.ok(bookViewport.scrollTop>0,'Phone textbook reading must move the inner viewport without a play Promise');
 nodes.stop.onclick();noPlayingEvent=true;nodes['tab-words'].onclick();const progressBefore=scrolls;nodes['read-words'].onclick();await flush();assert.equal(scrolls,progressBefore);for(const f of events.timeupdate||[])f();assert.ok(scrolls>progressBefore,'Playback progress must recover missing playing notifications');
 const progressAfter=scrolls;for(const f of events.timeupdate||[])f();assert.equal(scrolls,progressAfter,'Progress events must not repeatedly pull the same card');
 nodes.stop.onclick();
 // Custom questions and distractors must both remain inside the chosen pool.
 const sourceBefore=JSON.stringify(CONTENT.words);
 run("selectedPracticeIds=new Set([practiceBank.find(e=>e.kind==='word').id,practiceBank.find(e=>e.kind==='sentence').id]);savePracticeSelection()");
 assert.equal(JSON.parse(saved.get('pep-custom-unit-'+unit+'-v1')).length,2);
 nodes['practice-source'].value='custom';nodes['practice-source'].onchange();
 for(const mode of ['recall','listen','translate']){
  nodes.mode.value=mode;nodes.mode.onchange();assert.equal(run('deck.length'),2);
  assert.equal(nodes['scope-label'].hidden,true);
  if(mode!=='recall'){
   assert.equal(nodes.choices.children.length,2,'No unselected distractors');
   const allowed=run(mode==='listen'?'getQuizPool().map(i=>i.en)':'getQuizPool().map(i=>i.zh)');
   nodes.choices.children.forEach(choice=>assert.ok(allowed.includes(choice.textContent)));
  }
 }
 nodes['picker-kind'].value='sentence';nodes['picker-kind'].onchange();
 assert.ok(run("filteredPracticeEntries().every(e=>e.kind==='sentence')"));
 nodes['picker-page'].value=String(CONTENT.words[0].page);nodes['picker-page'].onchange();
 assert.ok(run('filteredPracticeEntries().every(e=>e.pages.includes(Number($("picker-page").value)))'));
 nodes['picker-search'].value='NO_MATCH_784';nodes['picker-search'].oninput();assert.equal(run('filteredPracticeEntries().length'),0);
 nodes['clear-selection'].onclick();assert.equal(run('deck.length'),0);assert.equal(nodes.next.disabled,true);assert.equal(nodes.reveal.hidden,true);
 nodes['practice-source'].value='standard';nodes.mode.value='recall';nodes.scope.value='words';nodes['practice-source'].onchange();assert.equal(run('deck.length'),CONTENT.words.length);
 assert.equal(JSON.stringify(CONTENT.words),sourceBefore,'Picker must not mutate the textbook word list');
 // Static lookup must work without any online API, including missing words.
 let networkRequests=0;context.fetch=()=>{networkRequests++;throw Error('online lookup forbidden')};
 nodes['lookup-input'].value=CONTENT.words[0].en;await run('lookupText()');assert.equal(nodes['lookup-zh'].textContent,CONTENT.words[0].zh);nodes['lookup-audio'].onclick();assert.equal(audio.src,audioBase+CONTENT.words[0].file);
 const extras=JSON.parse(fs.readFileSync(path.join(root,'assets',path.basename(course.href,'.html'),'supplemental.json'),'utf8')).entries;
 for(const item of extras){
  nodes['lookup-input'].value=item.en;await run('lookupText()');assert.equal(nodes['lookup-zh'].textContent,item.zh,item.en);nodes['lookup-audio'].onclick();assert.equal(audio.src,audioBase+item.file,item.en+' must use saved original audio');
  assert.ok(nodes['lookup-source'].textContent.includes('课文补充释义'));assert.equal(nodes['lookup-context-section'].hidden,false);assert.ok(nodes['lookup-contexts'].children.length);
  const row=nodes['lookup-contexts'].children[0];row.children[row.children.length-1].onclick();assert.ok(audio.src.endsWith(item.occurrences[0].file),'Original sentence remains playable');
 }
 for(const [query,expected]of [['I','我'],['a','一个；一（不定冠词）'],['Chen Jie','陈杰'],['chen','陈杰'],['6th','第六（序数词 sixth）']]){nodes['lookup-input'].value=query;await run('lookupText()');assert.equal(nodes['lookup-zh'].textContent,expected,query)}
 nodes['lookup-input'].value='letter A';await run('lookupText()');assert.match(nodes['lookup-zh'].textContent,/字母 A/,'Explicit letter query stays available');
 nodes['lookup-input'].value='your';await run('lookupText()');assert.equal(nodes['lookup-en'].textContent,'your');
 nodes['lookup-input'].value='unlisted-query-795';await run('lookupText()');assert.equal(nodes['lookup-result'].hidden,true);assert.match(nodes['lookup-message'].textContent,/暂未收录/);assert.equal(nodes['lookup-submit'].disabled,false);
 nodes['lookup-input'].value='<script>中文</script>';await run('lookupText()');assert.equal(nodes['lookup-result'].hidden,true);
 assert.equal(networkRequests,0,'Known words, missing words and invalid input must not call an online service');assert.equal(JSON.stringify(CONTENT.words),sourceBefore,'Supplemental lookup must not mutate the textbook word list');
 // Floating word mode: every textbook sentence retains its full Chinese translation.
 nodes['tab-book'].onclick();assert.equal(run('wordFollowEnabled'),false);nodes['word-follow-toggle'].onclick();assert.equal(saved.get('pep-word-follow-enabled-v1'),'true');
 let splitChecks=0;
 for(let p=0;p<pages.length;p++){
  nodes['book-page'].onchange({target:{value:String(p)}});assert.equal(nodes['word-follow-panel'].hidden,true);
  const spots=nodes['book-canvas'].children.filter(e=>e.classList.contains('hotspot'));
  for(let i=0;i<pages[p].spots.length;i++){
   const ref=pages[p].spots[i].w||pages[p].spots[i].s,item=typeof ref==='string'?CONTENT.words.find(w=>w.en===ref):CONTENT.sentences[ref-1];
   const entry=run('wordFollowLibrary').sentences[item.en];if(!entry)continue;
   const count=played.length;nodes['word-follow-panel'].scrollTop=150;spots[i].onclick();await flush();assert.equal(nodes['word-follow-panel'].scrollTop,0,'A new sentence must show its full translation from the top');assert.equal(played.length,count,'Opening a sentence must not autoplay');assert.equal(nodes['word-follow-translation'].textContent,item.zh);assert.equal(nodes['word-follow-sentence'].textContent,item.en);
   const buttons=nodes['word-follow-words'].children.filter(e=>e.classList.contains('word-follow-word'));assert.equal(buttons.length,entry.tokens.length);assert.equal(nodes['word-follow-words'].textContent,item.en,'Punctuation and repeated words must remain in the original order');
   buttons.forEach((button,n)=>{button.onclick();const token=entry.tokens[n],word=run('wordFollowLibrary').words[token.key];assert.equal(audio.src,audioBase+word.file);assert.equal(nodes['word-follow-en'].textContent,token.text);assert.equal(nodes['word-follow-meaning'].textContent,word.zh);assert.equal(nodes['word-follow-ipa'].textContent,word.ipaDisplay||word.ipa||'')});
   nodes.stop.onclick();splitChecks++;
  }
 }
 assert.ok(splitChecks>0);
 // A gap separates words; a new click, Stop, closing, lookup or navigation cancels it.
 const entry=run('wordFollowCurrent'),buttons=nodes['word-follow-words'].children.filter(e=>e.classList.contains('word-follow-word'));
 noPlayingEvent=false;const backgroundBefore=scrolls;played.length=0;nodes['word-follow-all'].onclick();await flush();assert.ok(nodes['word-follow-panel'].scrollTop>0,'Long sentences follow inside their panel');assert.equal(scrolls,backgroundBefore,'Word following must not move the background page');assert.equal(played.length,1);for(const f of events.ended)f();await flush();assert.equal(played.length,1);assert.equal(timers.size,1);
 let gap=[...timers.values()][0];timers.clear();gap();await flush();assert.equal(played.length,2);assert.equal(nodes['word-follow-en'].textContent,entry.tokens[1].text);
 for(const f of events.ended)f();const staleGap=[...timers.values()][0];buttons[0].onclick();await flush();const afterClick=played.length;if(staleGap)staleGap();assert.equal(played.length,afterClick,'A stale timer must not interrupt a manual word click');assert.equal(timers.size,0);
 nodes['word-follow-whole'].onclick();assert.equal(run('active.en'),entry.en);nodes['word-follow-close'].onclick();assert.equal(nodes['word-follow-panel'].hidden,true);assert.equal(run('wordFollowEnabled'),true);assert.equal(audio.paused,true);
 nodes['book-page'].onchange({target:{value:'0'}});nodes['book-canvas'].children.find(e=>e.classList.contains('hotspot')).onclick();nodes['word-follow-all'].onclick();for(const f of events.ended)f();assert.ok(timers.size);nodes['book-page'].onchange({target:{value:'1'}});assert.equal(timers.size,0,'Page navigation cancels the next word');assert.equal(nodes['word-follow-panel'].hidden,true);nodes['book-page'].onchange({target:{value:'0'}});nodes['book-canvas'].children.find(e=>e.classList.contains('hotspot')).onclick();nodes['lookup-toggle'].onclick();assert.equal(nodes['word-follow-panel'].hidden,true);assert.equal(nodes['word-follow-toggle'].hidden,true);nodes['lookup-close'].onclick();assert.equal(nodes['word-follow-toggle'].hidden,false);
 nodes['tab-words'].onclick();assert.equal(nodes['word-follow-toggle'].hidden,true);nodes['tab-book'].onclick();assert.equal(nodes['word-follow-toggle'].hidden,false);nodes['word-follow-toggle'].onclick();assert.equal(run('wordFollowEnabled'),false);assert.equal(saved.get('pep-word-follow-enabled-v1'),'false');
 console.log(`Unit ${unit}: ${pagesPlayed} page queues, exercises, manual idle recovery, no-Promise phone playback, inner/root scrolling, focus changes, progress fallback, custom selection, static lookup and floating word-follow mode with full Chinese translations passed.`);
}
(async()=>{const courses=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../courses.json'),'utf8'));for(const course of courses.filter(c=>/pep-unit\d+\.html$/.test(c.href)))await check(course)})().catch(e=>{console.error(e);process.exitCode=1});
