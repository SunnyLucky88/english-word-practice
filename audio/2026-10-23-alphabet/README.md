# Alphabet pronunciation

`libby-v1/` contains only the approved Libby British English letter-name audio:

- `a.mp3` through `z.mp3`: individual letter names, voice `en-GB-LibbyNeural`, rate `-15%`. H is aitch; Z is zed. These are letter names, not phonics sounds.
- `alphabet-reading.wav`: the approved 21.25-second unaccompanied reading. Original letter clips are trimmed at the ends and separated by short pauses, with longer pauses after G, P, S, V, and Z. No pitch shifting, time stretching, singing synthesis or music is applied.
- `reading-cues.json`: start/end times for synchronizing the 26 letters and five text groups with the full recording.
- `speech-text.json`: exact synthesis text used for the letter names, such as `ay`, `aitch`, and `zed`. The audio generator uses these overrides so that single letters are pronounced as names rather than interpreted as words.

The full recording is a reading exercise, not a song. Keep the approved voice
and file contents when moving these assets. Use a new version directory for
future audio changes so browser caches cannot retain a previous version.
