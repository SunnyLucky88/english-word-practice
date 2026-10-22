"""Generate the site's British practice clips with edge-tts.

Install edge-tts, then run this script from any directory. No service is called
when visitors play the generated files: the MP3s are hosted with the page.
"""

import asyncio
import argparse
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
    output = ROOT / "audio" / "en-GB" / "libby-v1"
    output.mkdir(parents=True, exist_ok=True)
    # Keep requests sequential to avoid service throttling.
    for word in words:
        if (output / f"{word}.mp3").exists():
            print(f"Reusing {word}", flush=True)
            continue
        for attempt in range(3):
            try:
                await edge_tts.Communicate(word, VOICE, rate="-15%").save(str(output / f"{word}.mp3"))
                assert (output / f"{word}.mp3").stat().st_size > 1000
                print(f"Generated {word}", flush=True)
                break
            except Exception:
                if attempt == 2:
                    raise
                await asyncio.sleep(2)


if __name__ == "__main__":
    asyncio.run(main())
