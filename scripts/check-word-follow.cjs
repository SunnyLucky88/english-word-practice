const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),tokenize=require('../assets/pep-word-follow-tokens.js');
let texts=0,forms=0,occurrences=0;
for(const course of JSON.parse(fs.readFileSync(path.join(root,'courses.json'),'utf8')).filter(c=>/pep-unit\d+\.html$/.test(c.href))){
 const dir=path.join(root,'assets',path.basename(course.href,'.html')),c=JSON.parse(fs.readFileSync(path.join(dir,'content.json'),'utf8')),data=JSON.parse(fs.readFileSync(path.join(dir,'word-follow.json'),'utf8')),html=fs.readFileSync(path.join(root,course.href),'utf8');
 assert.deepEqual(data,JSON.parse(html.match(/id="word-follow-library">([\s\S]*?)<\/script>/)[1]));
 const pages=JSON.parse(fs.readFileSync(path.join(dir,'book.js'),'utf8').match(/^const BOOK_PAGES = (.*);/m)[1]);
 for(const page of pages)for(const ref of page.sequence){
  const item=typeof ref==='string'?c.words.find(w=>w.en===ref):c.sentences[ref-1],tokens=tokenize(item.en);if(tokens.length<2)continue;
  const entry=data.sentences[item.en];assert.ok(entry);assert.equal(entry.zh,item.zh,'Full sentence translation must come from the original sentence');assert.deepEqual(entry.tokens,tokens);occurrences++;
  for(const token of tokens){assert.equal(item.en.slice(token.start,token.end),token.text);assert.ok(data.words[token.key],`Missing spoken word: ${token.text}`)}
 }
 for(const word of Object.values(data.words)){
  assert.match(word.file,/^(?:[a-z0-9-]+\.mp3|(?:supplemental|word-follow)\/[a-z0-9-]+\.mp3)$/);assert.ok(word.zh);
  const file=path.join(root,course.audioDirectory,word.file),sources=JSON.parse(fs.readFileSync(path.join(path.dirname(file),'sources.json'),'utf8')),source=sources.find(s=>s.file===path.basename(file));assert.ok(source);
  assert.equal(new URL(source.source).hostname,'translate.google.com');assert.equal(new URL(source.source).searchParams.get('ttsspeed'),'1');assert.equal(new URL(source.source).searchParams.get('q'),word.spokenText);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),source.sha256);
  if(word.definitionSource==='书后词汇表原文'){
   const original=JSON.parse(fs.readFileSync(path.join(root,'assets',`2026-10-23-pep-unit${word.sourceUnit}`,'content.json'),'utf8')).words.find(w=>w.en.toLowerCase()===word.spokenText.toLowerCase());assert.ok(original);assert.equal(word.zh,original.zh);assert.equal(word.ipa,original.ipa);assert.equal(word.ipaDisplay,original.ipaDisplay||'');
  }else assert.equal(word.ipa,'','Do not invent textbook IPA for supplemental words');
 }
 const audioDir=path.join(root,course.audioDirectory,'word-follow'),sources=JSON.parse(fs.readFileSync(path.join(audioDir,'sources.json'),'utf8'));assert.equal(sources.length,fs.readdirSync(audioDir).filter(f=>f.endsWith('.mp3')).length);assert.deepEqual(sources.map(s=>s.file).sort(),[...new Set(Object.values(data.words).filter(w=>w.file.startsWith('word-follow/')).map(w=>path.basename(w.file)))].sort(),'Only active local word recordings may be shipped');
 assert.equal(html.match(/id="word-follow-styles">\n([\s\S]*?)\n<\/style>/)[1],fs.readFileSync(path.join(root,'assets/pep-word-follow.css'),'utf8'));
 if(c.unit===6)assert.equal(data.words.orange.zh,'橙子；柑橘');if(c.unit===5)assert.equal(data.words.orange.zh,'橙红色；橙红色的');
 for(const id of ['word-follow-toggle','word-follow-panel','word-follow-sentence','word-follow-translation','word-follow-all','word-follow-whole'])assert.equal([...html.matchAll(new RegExp('id="'+id+'"','g'))].length,1);
 texts+=Object.keys(data.sentences).length;forms+=Object.keys(data.words).length;
}
assert.deepEqual(tokenize("I'm with Chen Jie. Don't go!").map(t=>t.text),["I'm",'with','Chen Jie',"Don't",'go']);
assert.deepEqual(tokenize("It's 5 p.m. Jiaguwen is over 3,000 years old!").map(t=>t.text),["It's",'5','p.m.','Jiaguwen','is','over','3,000','years','old']);
console.log(`Word following: ${texts} texts, ${occurrences} textbook occurrences, ${forms} unit word forms; translation, full token coverage, local audio, meanings and IPA passed.`);
