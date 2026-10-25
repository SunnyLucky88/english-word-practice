// Compile a local, exact-token reading library; never alter the textbook vocabulary.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),tokenize=require('../assets/pep-word-follow-tokens.js');
const courses=JSON.parse(fs.readFileSync(path.join(root,'courses.json'),'utf8')).filter(c=>/pep-unit\d+\.html$/.test(c.href));
const lessons=courses.map(course=>{const slug=path.basename(course.href,'.html'),dir=path.join(root,'assets',slug);return {course,slug,dir,content:JSON.parse(fs.readFileSync(path.join(dir,'content.json'),'utf8')),extra:JSON.parse(fs.readFileSync(path.join(dir,'supplemental.json'),'utf8')).entries,pages:JSON.parse(fs.readFileSync(path.join(dir,'book.js'),'utf8').match(/^const BOOK_PAGES = (.*);/m)[1])}});
const key=s=>s.replace(/[’‘]/g,"'").toLowerCase(),numbers=['zero','one','two','three','four','five','six','seven','eight','nine','ten'];
const additions={'p.m.':{en:'p.m.',zh:'下午（用于时间后）',spokenText:'p.m.',expanded:'post meridiem'},'3,000':{en:'3,000',zh:'三千',spokenText:'three thousand'}};
const missing=new Set(),jobs=[];
for(const lesson of lessons){
 const candidates=lessons.flatMap(l=>[...l.content.words.map(w=>({...w,key:key(w.en),definitionSource:'书后词汇表原文',sourceKind:'textbook-word',sourceUnit:l.content.unit,sourcePath:path.join(root,l.course.audioDirectory,w.file)})),...l.extra.map(w=>({...w,sourceKind:'supplemental',sourceUnit:l.content.unit,sourcePath:path.join(root,l.course.audioDirectory,w.file)}))]);
 const dictionary={},sentences={};
 for(const page of lesson.pages)for(const ref of page.sequence){
  const item=typeof ref==='string'?lesson.content.words.find(w=>w.en===ref):lesson.content.sentences[ref-1];
  const tokens=tokenize(item.en);if(tokens.length<2)continue;
  for(const token of tokens){
   if(dictionary[token.key])continue;
   const search=/^\d+$/.test(token.key)&&Number(token.key)<=10?numbers[Number(token.key)]:token.key;
   const meaningUnit=search==='orange'?(lesson.content.unit===5?5:4):lesson.content.unit;
   const matches=candidates.filter(c=>c.key===search).sort((a,b)=>(a.sourceUnit===meaningUnit?0:2)+(a.sourceKind==='textbook-word'?0:1)-((b.sourceUnit===meaningUnit?0:2)+(b.sourceKind==='textbook-word'?0:1)));
   const found=matches[0]||additions[token.key];
   if(!found){missing.add(token.text);continue;}
   const word={key:token.key,en:token.text,spokenText:found.spokenText||found.en,zh:found.zh,ipa:found.ipa||'',ipaDisplay:found.ipaDisplay||'',base:found.base||'',expanded:found.expanded||'',note:found.note||'',definitionSource:found.definitionSource||'课文补充释义（按原句核对）',sourceUnit:found.sourceUnit||lesson.content.unit,audioSource:'Google Translate'};
   if(found.sourceUnit===lesson.content.unit){word.file=path.relative(path.join(root,lesson.course.audioDirectory),found.sourcePath).split(path.sep).join('/');}
   else{
    word.file='word-follow/'+crypto.createHash('sha256').update(token.key).digest('hex').slice(0,16)+'.mp3';
    jobs.push({unit:lesson.content.unit,slug:lesson.slug,destination:path.join(root,lesson.course.audioDirectory,word.file),text:word.en,spokenText:found.spokenText||found.en,sourcePath:found.sourcePath||null});
   }
   dictionary[token.key]=word;
  }
  sentences[item.en]={en:item.en,zh:item.zh,tokens};
 }
 const output={schemaVersion:1,unit:lesson.content.unit,scope:'课本逐词跟读；不修改书后词表或默认练习',words:dictionary,sentences};
 fs.writeFileSync(path.join(lesson.dir,'word-follow.json'),JSON.stringify(output,null,2)+'\n');
 console.log(`Unit ${lesson.content.unit}: ${Object.keys(sentences).length} texts, ${Object.keys(dictionary).length} word forms.`);
}
if(missing.size)throw Error('Missing word definitions: '+[...missing].sort().join(', '));
if(process.argv.includes('--audio-jobs'))fs.writeFileSync(process.argv[process.argv.indexOf('--audio-jobs')+1],JSON.stringify(jobs,null,2));
console.log(`${jobs.length} local audio copies/additions required.`);
