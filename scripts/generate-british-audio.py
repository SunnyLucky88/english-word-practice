"""Generate the site's British practice clips with edge-tts.

Install edge-tts, then run this script from any directory. No service is called
when visitors play the generated files: the MP3s are hosted with the page.
"""

import asyncio
import argparse
import json
from pathlib import Path
import re

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
VOICE = "en-GB-LibbyNeural"


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("lesson", nargs="?", default="test.html", help="Repository-relative lesson HTML")
    args = parser.parse_args()
    lesson = (ROOT / args.lesson).resolve()
    if not lesson.is_relative_to(ROOT):
        raise ValueError("Lesson must be inside the repository")
    words = list(dict.fromkeys(re.findall(r'\{word:"([a-z]+)"', lesson.read_text(encoding="utf-8"))))
    assert words, "No lesson words found"
    courses = json.loads((ROOT / "courses.json").read_text(encoding="utf-8"))
    course = next((c for c in courses if c["href"] == lesson.relative_to(ROOT).as_posix()), None)
    if course is None:
        raise ValueError("Register the lesson in courses.json before generating audio")
    audio_directory = course["audioDirectory"]
    if not re.fullmatch(r"audio/\d{4}-\d{2}-\d{2}-[a-z0-9-]+/libby-v[1-9]\d*", audio_directory):
        raise ValueError("Invalid course audioDirectory")
    output = (ROOT / audio_directory).resolve()
    if not output.is_relative_to(ROOT / "audio"):
        raise ValueError("Audio output must be inside the audio directory")
    output.mkdir(parents=True, exist_ok=True)
    # Keep requests sequential to avoid service throttling.
    for word in words:
        target = output / f"{word}.mp3"
        if target.exists() and target.stat().st_size > 1000:
            print(f"Reusing {word}", flush=True)
            continue
        for attempt in range(3):
            try:
                temporary = target.with_suffix(".mp3.part")
                await edge_tts.Communicate(word, VOICE, rate="-15%").save(str(temporary))
                assert temporary.stat().st_size > 1000
                temporary.replace(target)
                print(f"Generated {word}", flush=True)
                break
            except Exception:
                if attempt == 2:
                    raise
                await asyncio.sleep(2)


if __name__ == "__main__":
    asyncio.run(main())
