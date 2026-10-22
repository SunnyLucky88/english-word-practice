const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const courses = JSON.parse(fs.readFileSync(path.join(root, 'courses.json'), 'utf8'));
const directories = new Set();
let audioCount = 0;
for (const course of courses) {
  assert.match(course.href, /^(?:test|lessons\/[a-z0-9-]+)\.html$/);
  assert.match(course.audioDirectory, /^audio\/\d{4}-\d{2}-\d{2}-[a-z0-9-]+\/libby-v[1-9]\d*$/);
  const lessonDirectory = path.posix.dirname(course.audioDirectory);
  assert.ok(!directories.has(lessonDirectory), 'Lessons must not share an audio directory');
  directories.add(lessonDirectory);
  const html = fs.readFileSync(path.join(root, course.href), 'utf8');
  const words = [...html.matchAll(/\{word:"([a-z]+)"/g)].map(match => match[1]);
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
  for (const file of course.extraAudio || []) {
    assert.match(file, /^[a-z0-9-]+\.(?:mp3|wav)$/);
    const audio = path.join(root, course.audioDirectory, file);
    assert.ok(fs.statSync(audio).size > 1000, `Missing or empty track: ${audio}`);
    assert.ok(html.includes(file), `Unreferenced track: ${file}`);
    audioCount++;
  }
}
console.log(`Validated ${courses.length} course(s), ${audioCount} audio references, and independent lesson directories.`);
