const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const courses = JSON.parse(fs.readFileSync(path.join(root, 'courses.json'), 'utf8'));
const directories = new Set();
let audioCount = 0;
for (const course of courses) {
  assert.match(course.href, /^(?:test|lessons\/[a-z0-9-]+)\.html$/);
  assert.match(course.audioDirectory, /^audio\/\d{4}-\d{2}-\d{2}-[a-z0-9-]+\/(?:libby|google)-v[1-9]\d*$/);
  const lessonDirectory = path.posix.dirname(course.audioDirectory);
  assert.ok(!directories.has(lessonDirectory), 'Lessons must not share an audio directory');
  directories.add(lessonDirectory);
  const html = fs.readFileSync(path.join(root, course.href), 'utf8');
  const contentText = html.match(/<script type="application\/json" id="lesson-content">([\s\S]*?)<\/script>/)?.[1];
  const content = contentText ? JSON.parse(contentText) : null;
  const words = content ? content.words.map(item => item.en) : [...html.matchAll(/\{word:"([a-z]+)"/g)].map(match => match[1]);
  assert.equal(words.length, course.wordCount, `Word count mismatch: ${course.href}`);
  assert.equal(new Set(words).size, words.length, `Duplicate words: ${course.href}`);
  const base = html.match(/const AUDIO_BASE = "([^"]+)";/)?.[1];
  const expected = path.posix.relative(path.posix.dirname(course.href), course.audioDirectory) + '/';
  assert.equal(base, expected, `Audio base mismatch: ${course.href}`);
  for (const word of words) {
    const audio = path.join(root, course.audioDirectory, `${word}.mp3`);
    assert.ok(fs.statSync(audio).size > 1000, `Missing or empty clip: ${audio}`);
    audioCount++;
  }
  if (content) {
    assert.ok(!/127\.0\.0\.1|localhost|Libby/.test(html), `Draft reference: ${course.href}`);
    const sources = JSON.parse(fs.readFileSync(path.join(root, course.audioDirectory, 'sources.json'), 'utf8'));
    const items = [...content.words, ...content.sentences];
    assert.equal(sources.length, items.length, 'Source manifest coverage mismatch');
    const files = fs.readdirSync(path.join(root, course.audioDirectory)).filter(file => file.endsWith('.mp3'));
    assert.equal(files.length, sources.length, 'Unexpected audio outside approved Google sources');
    for (const item of items) {
      assert.match(item.file, /^[a-z0-9-]+\.mp3$/);
      const source = sources.find(entry => entry.file === item.file);
      assert.ok(source, `Missing audio source: ${item.file}`);
      assert.equal(source.text, item.en);
      assert.equal(new URL(source.source).hostname, 'translate.google.com');
      const clip = fs.readFileSync(path.join(root, course.audioDirectory, item.file));
      assert.ok(clip.length > 1000);
      assert.equal(crypto.createHash('sha256').update(clip).digest('hex'), source.sha256);
    }
    audioCount += content.sentences.length;
    const book = html.match(/<script id="textbook-controller">([\s\S]*?)<\/script>/)?.[1];
    assert.ok(book, 'Missing bundled textbook controller');
    const pages = JSON.parse(book.match(/^const BOOK_PAGES = (.*);/m)[1]);
    assert.ok(html.includes(`<img src="${pages[0].image}" width="1080" height="1527"`), 'Missing static textbook image fallback');
    for (const page of pages) {
      const original = fs.readFileSync(path.resolve(root, path.posix.dirname(course.href), page.sourceImage));
      assert.equal(page.image, 'data:image/jpeg;base64,' + original.toString('base64'), `Invalid embedded page ${page.page}`);
      for (const spot of page.spots) {
        assert.ok(spot.w ? words.includes(spot.w) : !!content.sentences[spot.s - 1], `Invalid hotspot: ${page.page}`);
        const [x,y,w,h] = spot.box;
        assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0 && x+w <= 1080 && y+h <= 1527);
      }
      assert.ok(!page.phonics, 'New lesson audio must use approved Google originals only');
    }
    for (const link of html.matchAll(/href="([^"]+)"/g)) {
      if (!/^(?:https?:|#)/.test(link[1])) assert.ok(fs.existsSync(path.resolve(root, path.posix.dirname(course.href), link[1])));
    }
  }
  for (const file of course.extraAudio || []) {
    assert.match(file, /^[a-z0-9-]+\.(?:mp3|wav)$/);
    const audio = path.join(root, course.audioDirectory, file);
    assert.ok(fs.statSync(audio).size > 1000, `Missing or empty track: ${audio}`);
    assert.ok(html.includes(file), `Unreferenced track: ${file}`);
    audioCount++;
  }
}
console.log(`Validated ${courses.length} course(s), ${audioCount} audio references, and independent lesson directories.`);
