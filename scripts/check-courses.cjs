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
    const file = content ? content.words.find(item => item.en === word).file : `${word}.mp3`;
    const audio = path.join(root, course.audioDirectory, file);
    assert.ok(fs.statSync(audio).size > 1000, `Missing or empty clip: ${audio}`);
    audioCount++;
  }
  if (content) {
    assert.ok(!/127\.0\.0\.1|localhost|Libby/.test(html), `Draft reference: ${course.href}`);
    const sources = JSON.parse(fs.readFileSync(path.join(root, course.audioDirectory, 'sources.json'), 'utf8'));
    const items = [...content.words, ...content.sentences, ...(content.expressions || []), ...(content.songs || []).flatMap(song => song.lines)];
    assert.equal(sources.length, new Set(items.map(item => item.file)).size, 'Source manifest coverage mismatch');
    const files = fs.readdirSync(path.join(root, course.audioDirectory)).filter(file => file.endsWith('.mp3'));
    assert.equal(files.length, sources.length, 'Unexpected audio outside approved Google sources');
    for (const item of items) {
      assert.match(item.file, /^[a-z0-9-]+\.mp3$/);
      const source = sources.find(entry => entry.file === item.file);
      assert.ok(source, `Missing audio source: ${item.file}`);
      assert.equal(source.text, item.en);
      assert.equal(new URL(source.source).hostname, 'translate.google.com');
      assert.equal(new URL(source.source).searchParams.get('q'), source.spokenText || source.text);
      assert.equal(new URL(source.source).searchParams.get('ttsspeed'), '1');
      const clip = fs.readFileSync(path.join(root, course.audioDirectory, item.file));
      assert.ok(clip.length > 1000);
      assert.equal(crypto.createHash('sha256').update(clip).digest('hex'), source.sha256);
    }
    audioCount += sources.length - content.words.length;
    assert.ok(html.includes('<option value="words" selected>'), 'Default practice must use words');
    const sourceContent = JSON.parse(fs.readFileSync(path.join(root, 'assets', path.basename(course.href, '.html'), 'content.json'), 'utf8'));
    assert.deepEqual(content, sourceContent, 'Bundled content differs from canonical source');
    const app = html.match(/<script id="lesson-controller">([\s\S]*?)<\/script>/)?.[1];
    assert.ok(app, 'Missing bundled lesson app');
    const expectedApp = fs.readFileSync(path.join(root, 'assets/pep-lesson-app.js'), 'utf8').replace('const AUDIO_BASE = "audio/google-v1/";', `const AUDIO_BASE = "${expected}";`);
    assert.equal(app.trim(), expectedApp.trim(), 'Bundled app differs from shared source');
    for (const group of content.groups) for (const ref of group.clips) assert.ok(content.sentences[ref - 1], 'Invalid group reference');
    for (const song of content.songs || []) {
      if (song.lyricsStatus === 'awaiting-user-pages') assert.equal(song.lines.length, 0, 'Pending song must not pretend to have lyrics');
    }
    const book = html.match(/<script id="textbook-controller">([\s\S]*?)<\/script>/)?.[1];
    assert.ok(book, 'Missing bundled textbook controller');
    const pages = JSON.parse(book.match(/^const BOOK_PAGES = (.*);/m)[1]);
    assert.ok(html.includes(`<img src="${pages[0].image}" width="1080" height="1527"`), 'Missing static textbook image fallback');
    for (const page of pages) {
      assert.deepEqual(new Set(page.sequence), new Set(page.spots.map(spot => spot.w || spot.s)), `Reading coverage mismatch on page ${page.page}`);
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
  if (!content && course.audioDirectory.includes('/google-')) {
    assert.ok(!/Libby|libby/.test(html), 'Stale alphabet voice reference');
    const sources = JSON.parse(fs.readFileSync(path.join(root, course.audioDirectory, 'sources.json'), 'utf8'));
    assert.equal(sources.length, words.length);
    for (const word of words) {
      const source = sources.find(entry => entry.file === `${word}.mp3`);
      assert.ok(source, `Missing alphabet source: ${word}`);
      assert.equal(source.text, word === 'z' ? 'zed' : word.toUpperCase());
      assert.equal(new URL(source.source).hostname, 'translate.google.com');
      const clip = fs.readFileSync(path.join(root, course.audioDirectory, source.file));
      assert.equal(crypto.createHash('sha256').update(clip).digest('hex'), source.sha256);
    }
    const reading = JSON.parse(fs.readFileSync(path.join(root, course.audioDirectory, 'reading-source.json'), 'utf8'));
    assert.deepEqual(reading.parts, words.map(word => `${word}.mp3`));
    const cues = JSON.parse(html.match(/const READING_CUES = (\[[\s\S]*?\]);/)[1]);
    assert.deepEqual(cues, reading.cues);
    assert.equal(cues.length, 26);
    for (let i = 0; i < cues.length; i++) {
      assert.equal(cues[i].letter, words[i]);
      assert.ok(cues[i].end > cues[i].start && cues[i].end < reading.duration);
      if (i) assert.ok(cues[i].start >= cues[i-1].end);
    }
    const track = fs.readFileSync(path.join(root, course.audioDirectory, reading.file));
    assert.equal(crypto.createHash('sha256').update(track).digest('hex'), reading.sha256);
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
