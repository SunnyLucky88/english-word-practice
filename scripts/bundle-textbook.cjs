// Bundle textbook images and the controller into each approved lesson so that
// mobile readers do not depend on separate script/image requests succeeding.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
for (const unit of [1, 2]) {
  const slug = `2026-10-23-pep-unit${unit}`;
  const lesson = path.join(root, 'lessons', `${slug}.html`);
  let html = fs.readFileSync(lesson, 'utf8');
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
  console.log(`Bundled Unit ${unit}: ${pages.length} textbook pages (${Math.round(Buffer.byteLength(html)/1024)} KB HTML).`);
}
