// Validate the shipped inline app with controlled DOM, audio and timers.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
async function check(course){
 const unit=Number(course.href.match(/unit(\d+)\.html$/)[1]);
 const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,course.href),'utf8'),CONTENT=JSON.parse(html.match(/id="lesson-content">([\s\S]*?)<\/script>/)[1]),audioBase=html.match(/const AUDIO_BASE = "([^"]+)";/)[1];
 const nodes={},all=[],listeners={},events={},timers=new Map(),played=[];let timerId=0,scrolls=0,rejectNext=false,legacyPlayback=false,noPlayingEvent=false;
 function element(tag='div'){
  const classes=new Set(),attributes={};const e={tagName:tag.toUpperCase(),children:[],style:{setProperty(){}},dataset:{},hidden:false,value:'',disabled:false,parentNode:null,
   classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),toggle(c,on){if(on===undefined)on=!classes.has(c);on?classes.add(c):classes.delete(c)},contains:c=>classes.has(c)},
   set className(v){classes.clear();v.split(/\s+/).forEach(c=>classes.add(c))},get className(){return [...classes].join(' ')},
   set id(v){this._id=v;nodes[v]=this},get id(){return this._id},
   set textContent(v){this.text=String(v);this.children=[]},get textContent(){return (this.text||'')+this.children.map(c=>c.textContent).join('')},
   appendChild(child){this.children.push(child);child.parentNode=this;return child},setAttribute(k,v){attributes[k]=String(v)},getAttribute:k=>attributes[k]??null,removeAttribute(k){delete attributes[k];if(k==='src')this.src=''},focus(){},
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
 const audio=nodes.audio;Object.assign(audio,{paused:true,ended:false,addEventListener:(k,f)=>(events[k]??=[]).push(f),pause(){this.paused=true},load(){},play(){this.paused=false;this.ended=false;played.push(this.src);if(rejectNext){rejectNext=false;return Promise.reject(Error('blocked'))}if(!noPlayingEvent)for(const f of events.playing||[])f();return legacyPlayback?undefined:Promise.resolve()}});
 const $=id=>{assert.ok(nodes[id],id);return nodes[id]};nodes['playback-speed'].value='1';nodes.mode.value='recall';nodes.scope.value='words';
 const document={getElementById:$,createElement:element,createTextNode:t=>{const e=element();e.textContent=t;return e},documentElement:{style:{setProperty(){}},clientHeight:800},
  querySelector:s=>s==='.player-wrap'?player:null,querySelectorAll:s=>s==='.playing'?all.filter(e=>e.classList.contains('playing')):s==='[data-category]'?category:s.includes('[role=tab]')?['book','words','sentences','practice'].map(k=>nodes['tab-'+k]):[]};
 const context={CONTENT,document,window:{innerHeight:800,scrollX:0,scrollY:0,addEventListener:(k,f)=>(listeners[k]??=[]).push(f),matchMedia:()=>({matches:false}),scrollTo(x,y){if(typeof x==='number'&&typeof y==='number'){this.scrollX=x;this.scrollY=y;scrolls++}},scrollBy(value){if(!legacyPlayback||typeof value==='number')scrolls++}},setTimeout:(f,ms)=>{assert.equal(ms,5000);timers.set(++timerId,f);return timerId},clearTimeout:id=>timers.delete(id)};
 vm.createContext(context);const run=s=>vm.runInContext(s,context),flush=async()=>{await Promise.resolve();await Promise.resolve()};
 run(html.match(/id="lesson-controller">([\s\S]*?)<\/script>/)[1]);
 run(html.match(/id="textbook-controller">([\s\S]*?)<\/script>/)[1]);
 const pages=run('BOOK_PAGES');let pagesPlayed=0;
 for(let p=0;p<pages.length;p++){
  nodes['book-page'].onchange({target:{value:String(p)}});played.length=0;nodes['read-page'].onclick();await flush();
  while(run('queue.length')){for(const f of events.ended)f();await flush()}
  for(const f of events.ended)f();await flush();
  const expected=Array.from(pages[p].sequence,ref=>audioBase+(typeof ref==='string'?CONTENT.words.find(w=>w.en===ref):CONTENT.sentences[ref-1]).file);
  assert.deepEqual(played,expected,`Unit${unit} page${pages[p].page}`);assert.equal(run('followEnabled'),false);pagesPlayed++;
 }
 assert.ok(bookViewport.scrollTop>0,'Textbook follows within its own scroll container');
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
 rejectNext=true;nodes['read-words'].onclick();await flush();assert.equal(run('queue.length'),0);assert.equal(run('followEnabled'),false);
 // Some phone browsers return no play Promise and silently ignore scroll options.
 legacyPlayback=true;const legacyBefore=scrolls;nodes['read-words'].onclick();await flush();assert.ok(scrolls>legacyBefore,'Phone playback events must scroll without a play Promise or scroll options');
 listeners.blur[0]();assert.equal(run('followPaused'),false,'Media/window focus changes are not manual scrolling');
 listeners.wheel[0]();const idleTimer=[...timers.keys()][0];listeners.blur[0]();listeners.focus[0]();assert.equal([...timers.keys()][0],idleTimer,'Repeated media focus must not restart the five-second idle wait');
 const idleResume=timers.get(idleTimer);timers.clear();idleResume();assert.equal(run('followPaused'),false);
 nodes['tab-book'].onclick();nodes['book-page'].onchange({target:{value:'1'}});bookViewport.scrollTop=0;nodes['read-page'].onclick();await flush();assert.ok(bookViewport.scrollTop>0,'Phone textbook reading must move the inner viewport without a play Promise');
 nodes.stop.onclick();noPlayingEvent=true;nodes['tab-words'].onclick();const progressBefore=scrolls;nodes['read-words'].onclick();await flush();assert.equal(scrolls,progressBefore);for(const f of events.timeupdate||[])f();assert.ok(scrolls>progressBefore,'Playback progress must recover missing playing notifications');
 const progressAfter=scrolls;for(const f of events.timeupdate||[])f();assert.equal(scrolls,progressAfter,'Progress events must not repeatedly pull the same card');
 nodes.stop.onclick();
 console.log(`Unit ${unit}: ${pagesPlayed} page queues, exercises, manual idle recovery, no-Promise phone playback, inner/root scrolling, focus changes and progress fallback passed.`);
}
(async()=>{const courses=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../courses.json'),'utf8'));for(const course of courses.filter(c=>/pep-unit\d+\.html$/.test(c.href)))await check(course)})().catch(e=>{console.error(e);process.exitCode=1});
