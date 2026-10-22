# english-word-practice
手机点击单词即可听发音。统一使用 Libby 英式女声。

- [全部课程](https://sunnylucky88.github.io/english-word-practice/)
- [第一课：家庭成员与基础词汇](https://sunnylucky88.github.io/english-word-practice/test.html)
- 创建或发布课程前，遵循 [PUBLISHING.md](PUBLISHING.md)。
- 编辑 `courses.json` 后，运行 `node scripts/build-index.cjs` 更新首页。
- 每课音频独立存放于 `audio/日期-主题/libby-vN/`，发布前运行 `node scripts/check-courses.cjs` 校验目录、词数和音频引用。
