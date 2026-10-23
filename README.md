# english-word-practice
手机点读课本、单词和句子，并通过小练习复习。

- [全部课程](https://sunnylucky88.github.io/english-word-practice/)
- [第一单元：交朋友](https://sunnylucky88.github.io/english-word-practice/lessons/2026-10-23-pep-unit1.html)（课本第 2—5 页与完整词表）
- [第二单元：不同的家庭](https://sunnylucky88.github.io/english-word-practice/lessons/2026-10-23-pep-unit2.html)（完整单元第 14—25 页）
- 第一、第二单元和英文字母课均使用谷歌原速音频，支持播放倍速选择。
- 家庭成员与基础词汇为历史测试页，已从首页隐藏，原地址保留。
- 发布遵循 [PUBLISHING.md](PUBLISHING.md)。旧课程和二维码地址保持有效。
- 编辑 `courses.json` 后运行 `node scripts/build-index.cjs`，发布前运行 `node scripts/check-courses.cjs`。

## 维护文档

- [项目交接与操作说明](docs/项目交接与操作说明.md)：课程范围、目录、音频、日常更新、发布命令与二维码文件。
- [数据分类与目录划分](docs/数据分类与目录划分.md)：栏目、词句与歌曲、练习题池、音频复用、数据字段和目录职责。
- [问题处理记录](docs/问题处理记录.md)：图片、翻页、重复句漏播、点读位置和自动滚动的处理与验证。
- [固定发布规则](PUBLISHING.md)：后续制作与发布的统一约定。
- [发布记录](docs/发布记录.md)：每次批准发布的范围、验证与保留事项。

## 当前六单元版本

2026-10-23 用户批准当前六单元版本发布到[原学习入口](https://sunnylucky88.github.io/english-word-practice/)。原有课程地址和入口二维码保持不变，第三至第六单元加入课程目录。

六单元包含 111 个词汇、54 条常用表达、64 页课本点读和 601 个谷歌原速音频文件。第一单元点读仍只有第 2—5 页；七个歌曲入口尚无完整歌词，后续再补。小练习默认“看中文，想英文 / 单词练习”；连续播放支持手动操作优先、空闲 5 秒后恢复跟随。

正式维护从 `assets/日期-主题/content.json`、`book.js` 和 `assets/pep-lesson-app.js` 修改，再打包并检查。外层 `drafts/2026-10-23-pep-classified/` 留作制作依据，不是正式课程的唯一源文件。完整歌词和第一单元后续课本页不在本次发布范围内。
