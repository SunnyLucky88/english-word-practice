const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const courses = JSON.parse(fs.readFileSync(path.join(root, 'courses.json'), 'utf8'));
assert.ok(Array.isArray(courses), 'courses.json must be an array');
const urls = new Set();
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
for (const course of courses) {
  assert.ok(course.title && course.description, 'Course text is required');
  assert.match(course.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(new Date(course.date).toISOString().slice(0, 10), course.date);
  assert.match(course.href, /^(?:test|lessons\/[a-z0-9-]+)\.html$/);
  assert.ok(!urls.has(course.href), 'Duplicate course URL');
  urls.add(course.href);
  assert.ok(fs.existsSync(path.join(root, course.href)), `Missing course: ${course.href}`);
  assert.ok(Number.isInteger(course.wordCount) && course.wordCount > 0);
}
courses.sort((a, b) => b.date.localeCompare(a.date));
const cards = courses.map((course, index) => `<a class="course" href="${escape(course.href)}">
  <div class="meta"><time datetime="${escape(course.date)}">${escape(course.date)}</time>${index === 0 ? '<span class="badge">最新课程</span>' : ''}</div>
  <h2>${escape(course.title)}</h2><p>${escape(course.description)}</p>
  <div class="course-bottom"><span>${course.wordCount} 个单词 · 英式发音</span><span class="go">开始学习 ↗</span></div>
</a>`).join('\n');
const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="英语单词点击发音学习课程，Libby 英式女声，手机打开即可学习。">
<title>英语发音小课堂 · 全部课程</title>
<style>
:root{color-scheme:light;--ink:#173b3c;--muted:#607575;--green:#14766b;--line:#d9e6df}
*{box-sizing:border-box}body{margin:0;background:#f6f8f2;color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;line-height:1.7}
main{max-width:980px;margin:auto;padding:52px 24px 60px}.brand{font-size:13px;letter-spacing:.14em;font-weight:700;color:var(--green)}
header{padding:26px 0 30px;border-bottom:1px solid var(--line)}h1{font-size:clamp(30px,6vw,48px);line-height:1.25;margin:10px 0 18px;letter-spacing:-.03em}.intro{max-width:590px;color:var(--muted);margin:0}
.pills{display:flex;gap:8px;flex-wrap:wrap;margin-top:24px}.pill{border:1px solid var(--line);border-radius:100px;padding:4px 12px;font-size:13px;background:#fff9}
.section-head{display:flex;justify-content:space-between;align-items:center;margin:30px 0 16px}.section-head h2{font-size:18px;margin:0}.count{font-size:13px;color:var(--muted)}
.courses{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:18px}.course{display:block;padding:24px;border:1px solid var(--line);border-radius:18px;background:#fff;color:inherit;text-decoration:none;transition:transform .15s,border-color .15s}.course:hover{transform:translateY(-3px);border-color:var(--green)}.course:focus-visible{outline:3px solid var(--green);outline-offset:4px}
.meta{display:flex;align-items:center;gap:12px;font-size:12px;color:var(--muted)}.badge{color:var(--green);background:#eaf5ee;border-radius:5px;padding:2px 8px}.course h2{font-size:23px;margin:16px 0 8px}.course p{color:var(--muted);margin:0 0 26px;font-size:15px}.course-bottom{border-top:1px solid #edf1ed;padding-top:15px;display:flex;gap:12px;justify-content:space-between;flex-wrap:wrap;font-size:13px}.go{font-weight:700;color:var(--green)}
.tip{margin-top:30px;padding:18px 20px;border-radius:12px;background:#eaf1e7;font-size:14px;color:#45634e}.tip strong{color:var(--ink)}footer{margin-top:32px;font-size:12px;color:var(--muted)}
@media(max-width:480px){main{padding:28px 16px 40px}.course{padding:20px}}
@media(prefers-reduced-motion:reduce){.course{transition:none}.course:hover{transform:none}}
</style>
</head>
<body><main>
<div class="brand">ENGLISH · 每次学一点</div>
<header><h1>英语发音小课堂</h1><p class="intro">选择一课，点击单词就能听发音。跟着读、慢慢练，让每一个新单词都变得熟悉。</p>
<div class="pills"><span class="pill">Libby 英式女声</span><span class="pill">点击即听</span><span class="pill">手机轻松学</span></div></header>
<section aria-labelledby="courses-title"><div class="section-head"><h2 id="courses-title">全部课程</h2><span class="count">共 ${courses.length} 课 · 最新在前</span></div><div class="courses">${cards}</div></section>
<aside class="tip"><strong>收藏这个页面</strong><br>新课程会持续加入这里。把同一个链接或二维码留好，下次打开就能找到更多内容。</aside>
<footer>首次播放音频需要联网。听不到声音时，请调高媒体音量，或在手机浏览器中打开。</footer>
</main></body></html>
`;
fs.writeFileSync(path.join(root, 'index.html'), html);
console.log(`Generated index.html with ${courses.length} course(s).`);
