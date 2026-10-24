const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),{extract,normalize}=require('./supplemental-lib.cjs'),{lessons,all,reusable}=extract(root);
const glossary=JSON.parse(fs.readFileSync(path.join(root,'assets/pep-supplemental-glosses.json'),'utf8'));
const missing=[...all.keys()].filter(key=>!glossary[key]&&!reusable.has(key));if(missing.length)throw Error('Missing supplemental meanings: '+missing.join(', '));
const counts=[];
for(const lesson of lessons){
 const unit=lesson.content.unit,entries=[];
 for(const record of all.values()){
  const occurrences=record.occurrences.filter(o=>o.unit===unit);if(!occurrences.length)continue;
  const candidates=reusable.get(record.key)||[],existing=candidates.find(c=>c.unit===unit)||candidates[0];
  const definition=glossary[record.key]||{zh:existing.item.zh,kind:/人名|角色名/.test(existing.item.zh)?'name':'word'};
  const en=definition.en||(/人名|角色名/.test(definition.zh)?existing?.item.en:undefined)||record.key;
  const slug=record.key.replace(/'/g,'-').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const localReuse=existing?.unit===unit;
  const file=localReuse?existing.item.file:'supplemental/'+slug+'.mp3';
  const entry={key:record.key,en,zh:definition.unitMeanings?.[unit]||definition.zh,kind:definition.kind||'word',aliases:record.aliases,base:definition.base||'',expanded:definition.expanded||'',note:definition.note||'',file,spokenText:definition.spokenText||existing?.source?.spokenText||existing?.source?.text||en,audioSource:'Google Translate',definitionSource:'课文补充释义（按原句核对）',reviewStatus:'待人工审听',occurrences:occurrences.map(o=>({page:o.page,en:o.en,zh:o.zh,file:o.file})),reuse:existing?{audioDirectory:existing.audioDirectory,file:existing.item.file,source:existing.source}:null};
  entries.push(entry);
 }
 const output={schemaVersion:1,unit,scope:'课文补充词，不属于教材书后词汇表，不进入默认练习',entries};
 fs.writeFileSync(path.join(root,'assets',lesson.slug,'supplemental.json'),JSON.stringify(output,null,2)+'\n');
 counts.push({unit,entries:entries.length,reusedWithinUnit:entries.filter(e=>!e.file.startsWith('supplemental/')).length,separateFiles:entries.filter(e=>e.file.startsWith('supplemental/')).length});
}
console.log(JSON.stringify({uniqueEntries:all.size,uniqueAlreadyRecorded:[...all.keys()].filter(k=>reusable.has(k)).length,units:counts},null,2));
