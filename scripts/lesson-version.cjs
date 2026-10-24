const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
module.exports=function lessonVersion(root,courses){
 const hash=crypto.createHash('sha256');
 hash.update(fs.readFileSync(path.join(root,'assets/pep-lesson-app.js')));
 hash.update(fs.readFileSync(path.join(root,'assets/pep-playback.css')));
 hash.update(fs.readFileSync(path.join(root,'assets/pep-lesson-typography.css')));
 for(const name of ['pep-lesson-tools.js','pep-lesson-tools.css','pep-practice-picker.html','pep-lookup.html','pep-lookup-config.json'])hash.update(fs.readFileSync(path.join(root,'assets',name)));
 for(const course of courses.filter(c=>/pep-unit\d+\.html$/.test(c.href)).sort((a,b)=>a.href.localeCompare(b.href))){
  hash.update(course.href+'\n'+course.audioDirectory+'\n');
  const assets=path.join(root,'assets',path.basename(course.href,'.html'));
  hash.update(fs.readFileSync(path.join(assets,'content.json')));
  hash.update(fs.readFileSync(path.join(assets,'supplemental.json')));
  hash.update(fs.readFileSync(path.join(assets,'book.js')));
 }
 return hash.digest('hex').slice(0,12);
};
