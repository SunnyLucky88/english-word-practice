"""Generate the site's British practice clips with edge-tts.

Install edge-tts, then run this script from any directory. No service is called
when visitors play the generated files: the MP3s are hosted with the page.
"""

import asyncio
from pathlib import Path
import re

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
VOICE = "en-GB-SoniaNeural"


async def main():
    words = re.findall(r'\{word:"([a-z]+)"', (ROOT / "test.html").read_text(encoding="utf-8"))
    assert len(words) == len(set(words)) == 19
    output = ROOT / "audio" / "en-GB"
    output.mkdir(parents=True, exist_ok=True)
    # Keep requests sequential to avoid service throttling.
    for word in words:
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
