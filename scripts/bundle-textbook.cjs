// Bundle textbook images and the controller into each approved lesson so that
// mobile readers do not depend on separate script/image requests succeeding.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const courses = JSON.parse(fs.readFileSync(path.join(root, 'courses.json'), 'utf8'));
const app = fs.readFileSync(path.join(root, 'assets/pep-lesson-app.js'), 'utf8');
const version = require('./lesson-version.cjs')(root, courses);
for (const course of courses.filter(c => /^lessons\/\d{4}-\d{2}-\d{2}-pep-unit\d+\.html$/.test(c.href))) {
  const slug = path.basename(course.href, '.html');
  const lesson = path.join(root, course.href);
  let html = fs.readFileSync(lesson, 'utf8');
  html = html.replace(/href="([^"?]*pep-unit\d+\.html)(?:\?v=[a-f0-9]+)?"/g, (_, href) => `href="${href}?v=${version}"`);
  html = html.replace(/href="\.\.\/(?:\?v=[a-f0-9]+)?"/g, `href="../?v=${version}"`);
  const versionMeta = `<meta name="lesson-version" content="${version}">`;
  html = html.includes('name="lesson-version"') ? html.replace(/<meta name="lesson-version"[^>]*>/,versionMeta) : html.replace('<title>',versionMeta+'\n<title>');
  const content = JSON.parse(fs.readFileSync(path.join(root, 'assets', slug, 'content.json'), 'utf8'));
  html = html.replace(/(<script type="application\/json" id="lesson-content">)[\s\S]*?(<\/script>)/, (_, a, b) => a + JSON.stringify(content).replace(/<\//g, '<\\/') + b);
  const audioBase = path.posix.relative(path.posix.dirname(course.href), course.audioDirectory) + '/';
  const lessonApp = app.replace('const AUDIO_BASE = "audio/google-v1/";', `const AUDIO_BASE = "${audioBase}";`);
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
