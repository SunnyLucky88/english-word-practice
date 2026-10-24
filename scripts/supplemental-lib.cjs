const fs=require('node:fs'),path=require('node:path');
const normalize=s=>String(s).trim().replace(/[’‘]/g,"'").replace(/\s+/g,' ').toLowerCase().replace(/[.!?。！？]+$/,'');
const names=['John Baker','Wu Binbin','Chen Jie','Sarah Miller','Mike Black','Miss White'];
const aliases={'wu binbin':['wu'],'chen jie':['chen','jie'],'john baker':['baker'],'sarah miller':['miller']};
function letter(item){return /^字母\s*[a-z]/i.test(item.zh||'')&&/^[a-z\s]+$/i.test(item.en)&&item.en.replace(/\s/g,'').length<=2}
function tokenize(text){return [...text.matchAll(new RegExp(names.join('|')+"|\\d+(?:st|nd|rd|th)|[A-Za-z]+(?:['’‘-][A-Za-z]+)*",'gi'))].map(m=>m[0]).filter(s=>s.length>1||/^[ai]$/i.test(s)).filter(s=>!/^([A-Z])\1$/.test(s));}
function load(root){return JSON.parse(fs.readFileSync(path.join(root,'courses.json'),'utf8')).filter(c=>/pep-unit\d+\.html$/.test(c.href)).sort((a,b)=>a.href.localeCompare(b.href)).map(course=>{
 const slug=path.basename(course.href,'.html'),content=JSON.parse(fs.readFileSync(path.join(root,'assets',slug,'content.json'),'utf8'));
 const book=fs.readFileSync(path.join(root,'assets',slug,'book.js'),'utf8');const pages=JSON.parse(book.match(/^const BOOK_PAGES = (.*);/m)[1]);
 const manifest=JSON.parse(fs.readFileSync(path.join(root,course.audioDirectory,'sources.json'),'utf8'));
 const entries=[];content.sentences.forEach((item,i)=>{
  if(letter(item))return;
  const onPages=pages.filter(p=>p.sequence.includes(i+1)||p.spots.some(s=>s.s===i+1)).map(p=>p.page);
  const fallback=content.groups.filter(g=>g.clips.includes(i+1)).map(g=>Number(g.note.match(/第\s*(\d+)\s*页/)?.[1])).filter(Boolean);
  [...new Set(onPages.length?onPages:fallback.length?fallback:[item.page])].forEach(page=>entries.push({...item,page,id:'sentence-'+(i+1)}));
 });
 for(const item of content.expressions||[])if(!entries.some(e=>normalize(e.en)===normalize(item.en)))entries.push({...item,id:'expression-'+item.id});
 for(const song of content.songs||[])for(const [i,item]of(song.lines||[]).entries())entries.push({...item,page:item.page||song.pages[0],id:'song-'+song.id+'-'+i});
 return {course,slug,content,entries,manifest};
});}
function extract(root){
 const lessons=load(root),vocabulary=new Set(lessons.flatMap(l=>l.content.words.map(w=>normalize(w.en)))),all=new Map(),reusable=new Map();
 for(const lesson of lessons){
  for(const item of [...lesson.content.words,...lesson.content.sentences,...lesson.content.expressions]){
   if(letter(item))continue;
   if(tokenize(item.en).length!==1)continue;
   const key=normalize(item.en);if(!reusable.has(key))reusable.set(key,[]);reusable.get(key).push({unit:lesson.content.unit,slug:lesson.slug,audioDirectory:lesson.course.audioDirectory,item,source:lesson.manifest.find(s=>s.file===item.file)});
  }
  for(const item of lesson.entries)for(const token of tokenize(item.en)){
   const key=normalize(token);if(vocabulary.has(key))continue;
   if(!all.has(key))all.set(key,{key,en:token,aliases:aliases[key]||[],occurrences:[]});
   const occurrence={unit:lesson.content.unit,page:item.page,en:item.en,zh:item.zh,file:item.file,audioDirectory:lesson.course.audioDirectory,id:item.id};
   const record=all.get(key);if(!record.occurrences.some(o=>o.unit===occurrence.unit&&o.page===occurrence.page&&o.en===occurrence.en))record.occurrences.push(occurrence);
  }
 }
 return {lessons,vocabulary,all,reusable};
}
module.exports={normalize,tokenize,letter,load,extract};
