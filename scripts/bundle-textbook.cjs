// Bundle textbook images and the controller into each approved lesson so that
// mobile readers do not depend on separate script/image requests succeeding.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const courses = JSON.parse(fs.readFileSync(path.join(root, 'courses.json'), 'utf8'));
const app = fs.readFileSync(path.join(root, 'assets/pep-lesson-app.js'), 'utf8');
const playbackCss = fs.readFileSync(path.join(root, 'assets/pep-playback.css'), 'utf8');
const typographyCss = fs.readFileSync(path.join(root, 'assets/pep-lesson-typography.css'), 'utf8');
const toolsCss = fs.readFileSync(path.join(root, 'assets/pep-lesson-tools.css'), 'utf8');
const toolsApp = fs.readFileSync(path.join(root, 'assets/pep-lesson-tools.js'), 'utf8');
const wordFollowApp=fs.readFileSync(path.join(root,'assets/pep-word-follow.js'),'utf8');
const wordFollowCss=fs.readFileSync(path.join(root,'assets/pep-word-follow.css'),'utf8');
const wordFollowHtml=fs.readFileSync(path.join(root,'assets/pep-word-follow.html'),'utf8');
const pickerHtml = fs.readFileSync(path.join(root, 'assets/pep-practice-picker.html'), 'utf8');
const lookupHtml = fs.readFileSync(path.join(root, 'assets/pep-lookup.html'), 'utf8');
const lookupConfig=JSON.parse(fs.readFileSync(path.join(root,'assets/pep-lookup-config.json'),'utf8'));
if(lookupConfig.apiBase&&!/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(lookupConfig.apiBase))throw new Error('Lookup apiBase must be an HTTPS origin without a path');
if(lookupConfig.mode!=='course-library'||lookupConfig.apiBase)throw Error('Lessons use the static course library only');
const {load,letter,normalize}=require('./supplemental-lib.cjs');
const lookupLibrary=load(root).flatMap(({course,slug,content,entries})=>{
 const audio=file=>'../'+course.audioDirectory+'/'+file;
 const contexts=items=>items.map(item=>({unit:content.unit,page:item.page,en:item.en,zh:item.zh,audioUrl:audio(item.file)}));
 const words=content.words.map(item=>({...item,kind:'textbook-word',unit:content.unit,audioUrl:audio(item.file),occurrences:[]}));
 const supplemental=JSON.parse(fs.readFileSync(path.join(root,'assets',slug,'supplemental.json'),'utf8')).entries.map(({reuse,...item})=>({...item,kind:'supplemental',wordKind:item.kind,unit:content.unit,audioUrl:audio(item.file),occurrences:contexts(item.occurrences)}));
 const seen=new Set(),text=[...content.expressions,...content.sentences,...(content.songs||[]).flatMap(song=>song.lines||[])].filter(item=>{const key=normalize(item.en);if(seen.has(key))return false;seen.add(key);return true}).map(item=>({...item,kind:letter(item)?'letter':'course-text',unit:content.unit,audioUrl:audio(item.file),aliases:letter(item)?['letter '+item.en.toLowerCase()]:[],occurrences:contexts(entries.filter(e=>normalize(e.en)===normalize(item.en)))}));
 return [...words,...supplemental,...text];
});
const supplementalCount=new Set(lookupLibrary.filter(i=>i.kind==='supplemental').map(i=>i.key)).size;
const version = require('./lesson-version.cjs')(root, courses);
for (const course of courses.filter(c => /^lessons\/\d{4}-\d{2}-\d{2}-pep-unit\d+\.html$/.test(c.href))) {
  const slug = path.basename(course.href, '.html');
  const lesson = path.join(root, course.href);
  let html = fs.readFileSync(lesson, 'utf8');
  html = html.replace('.hotspot:hover,.hotspot:focus-visible,.hotspot.playing{border-color:#df8d26;background:#f4ba3560}', '');
  const playbackStyle = `<style id="playback-styles">\n${playbackCss}\n</style>`;
  html = html.includes('id="playback-styles"') ? html.replace(/<style id="playback-styles">[\s\S]*?<\/style>/, () => playbackStyle) : html.replace('<main>', playbackStyle + '\n<main>');
  const typographyStyle = `<style id="lesson-typography">\n${typographyCss}\n</style>`;
  html = html.includes('id="lesson-typography"') ? html.replace(/<style id="lesson-typography">[\s\S]*?<\/style>/, () => typographyStyle) : html.replace('<main>', typographyStyle + '\n<main>');
  const toolsStyle=`<style id="lesson-tools-styles">\n${toolsCss}\n</style>`;
  html=html.includes('id="lesson-tools-styles"')?html.replace(/<style id="lesson-tools-styles">[\s\S]*?<\/style>/,()=>toolsStyle):html.replace('<main>',toolsStyle+'\n<main>');
  const followStyle=`<style id="word-follow-styles">\n${wordFollowCss}\n</style>`;
  html=html.includes('id="word-follow-styles"')?html.replace(/<style id="word-follow-styles">[\s\S]*?<\/style>/,()=>followStyle):html.replace('<main>',followStyle+'\n<main>');
  if(html.includes('id="practice-extra"'))html=html.replace(/<div id="practice-extra"[\s\S]*?<\/details>/,()=>pickerHtml.trim());
  else html=html.replace('<div class="exercise">',()=>pickerHtml+'<div class="exercise">');
  html=html.replace('<option value="listen">听音选单词</option>','<option value="listen">听音选英文</option>');
  const lookupBlock=`${lookupHtml.replace('{{SUPPLEMENTAL_COUNT}}',String(supplementalCount))}\n<script type="application/json" id="lookup-library">${JSON.stringify(lookupLibrary).replace(/<\//g,'<\\/')}</script>`;
  if(html.includes('id="lookup-toggle"'))html=html.replace(/<button id="lookup-toggle"[\s\S]*?<script type="application\/json" id="lookup-library">[\s\S]*?<\/script>/,()=>lookupBlock);
  else html=html.replace('<script type="application/json" id="lesson-content">',()=>lookupBlock+'\n<script type="application/json" id="lesson-content">');
  html = html.replace(/href="([^"?]*pep-unit\d+\.html)(?:\?v=[a-f0-9]+)?"/g, (_, href) => `href="${href}?v=${version}"`);
  html = html.replace(/href="\.\.\/(?:\?v=[a-f0-9]+)?"/g, `href="../?v=${version}"`);
  const versionMeta = `<meta name="lesson-version" content="${version}">`;
  html = html.includes('name="lesson-version"') ? html.replace(/<meta name="lesson-version"[^>]*>/,versionMeta) : html.replace('<title>',versionMeta+'\n<title>');
  const lookupMeta=`<meta name="lookup-api-base" content="${lookupConfig.apiBase||''}">`;
  html=html.includes('name="lookup-api-base"')?html.replace(/<meta name="lookup-api-base"[^>]*>/,lookupMeta):html.replace('<title>',lookupMeta+'\n<title>');
  const content = JSON.parse(fs.readFileSync(path.join(root, 'assets', slug, 'content.json'), 'utf8'));
  const followData=JSON.parse(fs.readFileSync(path.join(root,'assets',slug,'word-follow.json'),'utf8'));
  const followBlock=wordFollowHtml.replace('{{WORD_FOLLOW_LIBRARY}}',JSON.stringify(followData).replace(/<\//g,'<\\/'));
  html=html.includes('id="word-follow-toggle"')?html.replace(/<button id="word-follow-toggle"[\s\S]*?<script type="application\/json" id="word-follow-library">[\s\S]*?<\/script>/,()=>followBlock.trim()):html.replace('<script type="application/json" id="lesson-content">',()=>followBlock+'\n<script type="application/json" id="lesson-content">');
  html=html.replace(/完整词表\s*\d+\s*词/g,`完整词表 ${content.words.length} 词`)
    .replace(/共\s*\d+\s*词，按课本顺序排列/g,`共 ${content.words.length} 词，按课本顺序排列`)
    .replace(/单词练习 · \d+ 词/g,`单词练习 · ${content.words.length} 词`)
    .replace(/重点表达 · \d+ 句/g,`重点表达 · ${content.expressions.length} 句`)
    .replace(/本单元 \d+ 条常用表达/g,`本单元 ${content.expressions.length} 条常用表达`);
  if(content.unit===3)html=html.replace(/神奇的动物/g,'我们的动物朋友').replace(/Amazing animals/g,'Our animal friends');
  html=html.replace(/图片选取自公开转载的[^<]*内容按原页核对。/,'课本图片来自用户已确认与实物一致的 PDF，按该版本原页核对。');
  html=html.replace(/href="https:\/\/www\.sohu\.com\/a\/[^"]+"/g,'href="https://book.pep.com.cn/1212001301245/mobile/index.html"');
  if(content.songs.every(song=>song.lines.length))html=html.replace('本单元对应歌曲入口。完整歌词补齐后提供逐句点读、连续朗读和循环跟读；使用谷歌原速朗读，不是演唱音频。','歌词已按本版教材附录完整录入，可逐句点读、连续朗读和循环跟读；使用谷歌原速合成朗读，不是演唱或教材原声。');
  const quizCount=new Set(content.groups.flatMap(group=>group.clips.map(id=>content.sentences[id-1])).filter(item=>item.practice!==false).map(item=>item.en)).size;
  html=html.replace(/<option value="text">课文句子 · \d+ 题<\/option>/,`<option value="text">课文句子 · ${quizCount} 题</option>`);
  html = html.replace(/(<script type="application\/json" id="lesson-content">)[\s\S]*?(<\/script>)/, (_, a, b) => a + JSON.stringify(content).replace(/<\//g, '<\\/') + b);
  const audioBase = path.posix.relative(path.posix.dirname(course.href), course.audioDirectory) + '/';
  const lessonApp = app.replace('const AUDIO_BASE = "audio/google-v1/";', `const AUDIO_BASE = "${audioBase}";`)+'\n'+toolsApp+'\n'+wordFollowApp;
  new vm.Script(lessonApp);
  html = html.replace(/<script id="lesson-controller">[\s\S]*?<\/script>/, () => `<script id="lesson-controller">\n${lessonApp}\n</script>`);
  let controller = fs.readFileSync(path.join(root, 'assets', slug, 'book.js'), 'utf8');
  const pages = JSON.parse(controller.match(/^const BOOK_PAGES = (.*);/m)[1]);
  for (const page of pages) {
    page.sourceImage = page.image;
    const image = fs.readFileSync(path.resolve(path.dirname(lesson), page.image));
    page.image = 'data:image/jpeg;base64,' + image.toString('base64');
  }
  controller = controller.replace(/^const BOOK_PAGES = .*;/m, `const BOOK_PAGES = ${JSON.stringify(pages)};`);
  new vm.Script(controller);
  const first = pages[0];
  const image = `<img src="${first.image}" width="1080" height="1527" alt="人教版 PEP 三年级上册第 ${first.page} 页" draggable="false">`;
  html = html.replace(/(<div id="book-canvas" class="book-canvas show-spots">)[\s\S]*?(<\/div><\/div><p id="page-label")/, '$1' + image + '$2');
  const inline = `<script id="textbook-controller">\n${controller}</script>`;
  if (html.includes('id="textbook-controller"')) {
    html = html.replace(/<script id="textbook-controller">[\s\S]*?<\/script>/, () => inline);
  } else {
    html = html.replace(/<script src="[^\"]+\/book\.js"><\/script>/, () => inline);
  }
  fs.writeFileSync(lesson, html);
  console.log(`Bundled ${slug}: ${pages.length} textbook pages (${Math.round(Buffer.byteLength(html)/1024)} KB HTML).`);
}
