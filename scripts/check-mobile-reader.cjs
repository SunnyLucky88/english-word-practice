// Exercise the shipped mobile controller with all textbook pages mounted together.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
for(const course of require('../courses.json').filter(c=>/pep-unit\d+\.html$/.test(c.href))){
 const html=fs.readFileSync(path.join(root,course.href),'utf8'),content=JSON.parse(html.match(/id="lesson-content">([\s\S]*?)<\/script>/)[1]);
 assert.equal(html.match(/id="mobile-reader-styles">\n([\s\S]*?)\n<\/style>/)[1],fs.readFileSync(path.join(root,'assets/pep-mobile-reader.css'),'utf8')+'\n'+fs.readFileSync(path.join(root,'assets/pep-reader-layout.css'),'utf8'));
 const reader=html.match(/id="mobile-reader-controller">\n([\s\S]*?)\n<\/script>/)[1];assert.equal(reader,fs.readFileSync(path.join(root,'assets/pep-mobile-reader.js'),'utf8'));
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);for(const id of ids.filter(s=>s.startsWith('reader-')))assert.equal(ids.filter(s=>s===id).length,1,id);
 const nodes={},raf=new Map(),saved=new Map(),played=[];let rafId=0,stops=0,context;
 function element(tag='div'){
  const e={tag,children:[],style:{},dataset:{},attributes:{},hidden:false,scrollLeft:0,scrollTop:0,className:'',text:'',appendChild(n){n.parentNode=this;this.children.push(n);return n},setAttribute(k,v){this.attributes[k]=String(v)},getAttribute(k){return this.attributes[k]??null},hasAttribute(k){return k in this.attributes},removeAttribute(k){delete this.attributes[k]},focus(){},addEventListener(){}};
  Object.defineProperty(e,'textContent',{get(){return this.text},set(v){this.text=v;this.children=[]}});
  e.classList={contains:k=>e.className.split(' ').includes(k),toggle(k,force){const set=new Set(e.className.split(' ').filter(Boolean));const on=force===undefined?!set.has(k):force;if(on)set.add(k);else set.delete(k);e.className=[...set].join(' ');return on},add(k){this.toggle(k,true)},remove(k){this.toggle(k,false)}};
  const descendants=()=>e.children.flatMap(c=>[c,...c.descendants()]);e.descendants=descendants;
  e.querySelectorAll=s=>descendants().filter(c=>s.startsWith('.')?c.classList.contains(s.slice(1)):s.startsWith('[data-file=')?c.dataset.file===s.match(/"([^"]+)"/)[1]:false);
  e.querySelector=s=>e.querySelectorAll(s)[0]||null;
  e.getBoundingClientRect=()=>{const first=content.unit===1?2:14+(content.unit-2)*12;const i=Number(e.dataset.page)-first;return {top:(Number.isFinite(i)?i:0)*1000-context.window.scrollY,bottom:(Number.isFinite(i)?i+1:1)*1000-context.window.scrollY,height:1000,width:375,left:0,right:375}};
  return e;
 }
 for(const id of ids)nodes[id]=element();
 nodes.book.hidden=false;nodes['lookup-panel'].hidden=true;nodes['word-follow-panel'].hidden=true;nodes['show-spots'].checked=true;
 const links=Array.from({length:6},(_,i)=>{const e=element('a');e.textContent='第'+(i+1)+'单元';e.setAttribute('href','unit'+(i+1)+'.html');if(i+1===content.unit)e.setAttribute('aria-current','page');return e});
 const media={matches:true,addEventListener(){}},document={body:element('body'),addEventListener(){},createElement:element,querySelectorAll:s=>s==='.unit-links a'?links:[],getElementById:id=>nodes[id]};
 context={CONTENT:content,words:content.words,sentences:content.sentences,$:id=>{assert.ok(nodes[id],id);return nodes[id]},document,URLSearchParams,
  window:{matchMedia:()=>media,location:{search:''},innerHeight:812,scrollY:0,scrollX:0,localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},addEventListener(){}},
  requestAnimationFrame:f=>{raf.set(++rafId,f);return rafId},cancelAnimationFrame:i=>raf.delete(i),scrollWindowTo(x,y){context.window.scrollX=x;context.window.scrollY=y},
  stop(){stops++;context.queue=[]},play(item,card){played.push({item,card})},handleBookPoint(item,card){context.play(item,card)},closeWordFollow(){nodes['word-follow-panel'].hidden=true},showLookup(open){nodes['lookup-panel'].hidden=!open},syncPlayerHeight(){},wordFollowEnabled:false,
  audio:{paused:true,ended:false,addEventListener(){}},playerWrap:element(),pointerHeld:false,touchHeld:false,followEnabled:false,followedGeneration:-1,queueGapMs:0,queue:[],repeatSequence:null};
 nodes['word-follow-toggle'].onclick=()=>{context.wordFollowEnabled=!context.wordFollowEnabled};
 context.showTab=tab=>{nodes.book.hidden=tab!==nodes['tab-book'];vm.runInContext('syncMobileReader()',context)};
 const sequence=fs.readFileSync(path.join(root,'assets/pep-lesson-app.js'),'utf8').match(/^function playSequence\(.*$/m)[0];
 vm.createContext(context);vm.runInContext(sequence,context);vm.runInContext(html.match(/id="textbook-controller">([\s\S]*?)<\/script>/)[1],context);vm.runInContext(reader,context);
 const run=s=>vm.runInContext(s,context),flush=()=>{const tasks=[...raf.values()];raf.clear();tasks.forEach(f=>f())};flush();
 const pages=run('BOOK_PAGES');assert.equal(run('mobileReader.pages.length'),pages.length);assert.ok(document.body.classList.contains('mobile-reader'));
 for(let i=0;i<pages.length;i++){
  run(`readerJump(${i})`);assert.equal(run('currentPage'),i);assert.equal(nodes['reader-page-number'].textContent,String(pages[i].page));assert.equal(saved.get('pep-reader-page-v1-unit-'+content.unit),String(pages[i].page));
  const section=run(`mobileReader.pages[${i}]`),surface=section.querySelector('.reader-page-canvas');assert.equal(surface.children[0].src,pages[i].image);assert.equal(surface.children[0].width,1080);assert.equal(surface.children[0].height,1527);
  const buttons=surface.children.slice(1);assert.equal(buttons.length,pages[i].spots.length);
  for(let s=0;s<buttons.length;s++){buttons[s].onclick();const item=run(`pageItem(BOOK_PAGES[${i}].spots[${s}].w||BOOK_PAGES[${i}].spots[${s}].s)`);assert.equal(played.at(-1).item.file,item.file);assert.equal(played.at(-1).card,buttons[s]);}
  nodes['read-page'].onclick();const entries=pages[i].sequence.length?[played.at(-1),...context.queue]:[];assert.equal(entries.length,pages[i].sequence.length);
  entries.forEach((entry,index)=>{assert.equal(entry.item.file,run(`pageItem(BOOK_PAGES[${i}].sequence[${index}]).file`));if(entry.card){assert.equal(entry.card.parentNode,surface);assert.equal(entry.card.dataset.readIndex,String(index),'Repeated clips must highlight only their occurrence on this page')}});
 }
 const previousStops=stops;context.window.scrollY=2000;run('readerTrackPage()');assert.equal(run('currentPage'),2);assert.equal(stops,previousStops,'Natural scroll must not interrupt the captured audio queue');
 run('readerZoomTo(150)');for(const section of run('mobileReader.pages'))assert.equal(section.querySelector('.reader-page-canvas').style.width,'150%');run('readerZoomTo(100)');
 nodes['reader-tools-button'].onclick();assert.equal(nodes['reader-tools'].hidden,false);nodes['reader-page-button'].onclick();assert.equal(nodes['reader-tools'].hidden,true);assert.equal(nodes['reader-pages'].hidden,false);
 nodes['reader-word-follow'].onclick();assert.equal(context.wordFollowEnabled,true);nodes['reader-lookup'].onclick();assert.equal(nodes['lookup-panel'].hidden,false);assert.equal(nodes['reader-pages'].hidden,true);
 nodes['reader-to-words'].onclick();assert.ok(!document.body.classList.contains('mobile-reader'));assert.equal(nodes['reader-ui'].hidden,true);nodes.book.hidden=false;run('syncMobileReader()');flush();assert.equal(run('currentPage'),2,'Return to the last read page');
 media.matches=false;run('syncMobileReader()');assert.equal(run('mobileReader.mounted'),true);assert.equal(run('mobileReader.pages.length'),pages.length,'Desktop also retains all continuous pages');assert.equal(nodes['reader-ui'].hidden,false);
 console.log(`Unit ${content.unit}: ${pages.length} continuous pages; all hotspots, repeated playback occurrences, tracking, jumps, zoom, tools, tabs, persistence and desktop continuous reading passed.`);
}
