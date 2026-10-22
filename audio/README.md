# Pronunciation audio

- Each lesson owns `audio/YYYY-MM-DD-topic/libby-vN/*.mp3`. Its current directory is declared in `courses.json` as `audioDirectory`.
- First lesson: `2026-10-22-family/libby-v1/*.mp3`.
- British English only: Microsoft `en-GB-LibbyNeural`, rate -15%, generated with `edge-tts`.
- Register the lesson in `courses.json`, then generate missing clips with `scripts/generate-british-audio.py <lesson.html>` after installing `edge-tts`. Existing clips are reused only within the same lesson and version.
- Do not share clips across lessons. Use a new version directory when changing a lesson's voice; remove unused versions during cleanup, after checking all course references.

These are synthesized practice clips, not recordings from the school textbook.
Clips are served as static files from this repository. Visitors do not
need a system text-to-speech voice or a connection to a speech generation API.
