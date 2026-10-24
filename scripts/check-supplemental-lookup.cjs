const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{extract}=require('./supplemental-lib.cjs');
const root=path.resolve(__dirname,'..'),{lessons,all}=extract(root),glossary=JSON.parse(fs.readFileSync(path.join(root,'assets/pep-supplemental-glosses.json'),'utf8'));
let total=0;
for(const lesson of lessons){
 const data=JSON.parse(fs.readFileSync(path.join(root,'assets',lesson.slug,'supplemental.json'),'utf8'));
 const expected=[...all].filter(([,e])=>e.occurrences.some(o=>o.unit===lesson.content.unit)).map(([key])=>key).sort();
 assert.deepEqual(data.entries.map(e=>e.key).sort(),expected,'Every extracted non-vocabulary word must be indexed');
 for(const entry of data.entries){
  assert.ok(entry.zh);assert.equal(entry.zh,glossary[entry.key].unitMeanings?.[data.unit]||glossary[entry.key].zh);
  assert.ok(!/^[b-hj-z]$/i.test(entry.key));assert.notEqual(entry.key,'th');
  assert.ok(entry.occurrences.every(o=>Number.isInteger(o.page)),'Every occurrence needs a real page number');
  for(const occurrence of entry.occurrences)assert.ok(lesson.entries.some(s=>s.en===occurrence.en&&s.zh===occurrence.zh&&s.page===occurrence.page),'Source sentence and page must match');
  if(entry.key==='a')assert.equal(entry.zh,'一个；一（不定冠词）');if(entry.key==='i')assert.equal(entry.zh,'我');
  assert.ok(fs.statSync(path.join(root,lesson.course.audioDirectory,entry.file)).size>1000);
 }
 total+=data.entries.length;
}
console.log(`Supplemental coverage: ${all.size} distinct entries, ${total} unit records; meanings, original sentences, page references and saved audio verified.`);
