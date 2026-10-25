// Edition regressions: verified against the user-confirmed PDF, especially changed reading pages.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const edition=JSON.parse(fs.readFileSync(path.join(root,'assets/pep-textbook-edition.json'),'utf8'));
assert.equal(edition.isbn,'978-7-107-38250-5');assert.equal(edition.confirmedByUser,'2026-10-25');
const counts=[15,19,22,19,17,16],expressions=[9,5,11,7,8,11];let total=0;
for(let unit=1;unit<=6;unit++){
 const dir=path.join(root,'assets',`2026-10-23-pep-unit${unit}`),c=JSON.parse(fs.readFileSync(path.join(dir,'content.json'),'utf8'));
 const pages=JSON.parse(fs.readFileSync(path.join(dir,'book.js'),'utf8').match(/^const BOOK_PAGES = (.*);/m)[1]);
 assert.equal(c.textbookSource.sha256,edition.sha256);assert.equal(c.wordSource.pdfSha256,edition.sha256);
 assert.equal(c.words.length,counts[unit-1]);assert.deepEqual(c.words.map(w=>w.en),edition.expectedWordOrder[unit]);
 assert.equal(c.expressions.length,expressions[unit-1]);assert.equal(pages.length,12);
 for(const song of c.songs){assert.equal(song.lyricsStatus,'complete');assert.ok(song.lines.length>=6);assert.ok(song.lines.every(l=>l.zh&&l.file));}
 const pageText=n=>pages.find(p=>p.page===n).sequence.map(r=>typeof r==='string'?r:c.sentences[r-1].en);
 if(unit===1){assert.ok(pageText(4).includes("Hi! I'm John."));assert.ok(!c.words.some(w=>['and','goodbye','toy'].includes(w.en)));assert.ok(!pageText(9).includes('I share my toys.'));}
 if(unit===2){for(const s of ['This is my family.','This family is small.','They love each other.','This family is big.','They love each other too.',"No, it's my ..."])assert.ok(pageText(21).includes(s),s);assert.ok(!JSON.stringify(c).includes('Some families are small.'));assert.ok(!c.words.some(w=>w.en==='some'));}
 if(unit===3){assert.ok(pageText(36).includes('Mum, what makes us great?'));assert.ok(pageText(37).includes('We eat a lot.'));assert.ok(!JSON.stringify(c).includes('But whale sharks are big too.'));}
 if(unit===4){assert.ok(pageText(38).includes('How do plants and people help each other?'));assert.ok(pageText(45).includes('Can we help them?'));assert.ok(pageText(45).includes('Flowers need air, water and sun.'));assert.ok(!JSON.stringify(c).includes('We need plants, and we can help them too.'));}
 if(unit===5)assert.equal(c.words.find(w=>w.en==='some').page,55);
 for(const bad of ['Smile and say "Hello!" to make friends.','Family members love each other.','They are all special.','We need plants to live.','Colours are everywhere.','Numbers are helpful.'])assert.ok(!c.sentences.some(s=>s.en===bad),bad);
 total+=pages.length;
}
console.log(`Confirmed edition: ${total} pages, 108 vocabulary records, 51 expressions and 7 complete songs; version and changed-page regressions passed.`);
