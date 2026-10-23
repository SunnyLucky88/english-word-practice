// Exercise the shipped controller with an older mobile DOM that has no
// Element.replaceChildren(). This must support every next/previous page.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
function element() {
  return {
    children: [], style: {}, dataset: {}, classList: {toggle() {}},
    set textContent(value) { this.text = value; this.children = []; },
    get textContent() { return this.text || ''; },
    append(...nodes) { this.children.push(...nodes); },
    appendChild(node) { this.children.push(node); },
    setAttribute(name, value) { this[name] = value; }
  };
}
for (const unit of [1, 2]) {
  const html = fs.readFileSync(path.join(root, `lessons/2026-10-23-pep-unit${unit}.html`), 'utf8');
  const content = JSON.parse(html.match(/id="lesson-content">([\s\S]*?)<\/script>/)[1]);
  const script = html.match(/id="textbook-controller">([\s\S]*?)<\/script>/)[1];
  const pages = JSON.parse(script.match(/^const BOOK_PAGES = (.*);/m)[1]);
  const elements = {};
  const $ = id => elements[id] || (elements[id] = element());
  vm.runInNewContext(script, {
    $, words: content.words, sentences: content.sentences,
    document: {createElement: element}, stop() {}, play() {}, playSequence() {}
  });
  const check = i => {
    const image = $('book-canvas').children[0];
    assert.equal(image.src, pages[i].image, `Unit ${unit} page ${pages[i].page}`);
    assert.equal($('book-page').value, String(i));
    assert.equal($('book-canvas').children.length, 1 + pages[i].spots.length);
  };
  check(0);
  for (let i=1; i<pages.length; i++) { $('next-page').onclick(); check(i); }
  for (let i=pages.length-2; i>=0; i--) { $('previous-page').onclick(); check(i); }
  $('book-page').onchange({target: {value: String(pages.length-1)}});
  check(pages.length-1);
  console.log(`Unit ${unit}: all ${pages.length} pages navigate without replaceChildren().`);
}
