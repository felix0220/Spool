# Built-in cassette audio library

These files are exact local copies used by the three built-in cassettes. Runtime
playback uses the public /audio paths below and never depends on a temporary
object URL or the original source folder.

| Cassette | Title | Public file | Source | License | Attribution | SHA-256 |
|---|---|---|---|---|---|---|
| ember / 01 | Chill Lofi Inspired | /audio/chill-lofi-inspired-loop.ogg | https://opengameart.org/content/chill-lofi-inspired-loop-edit | CC0 — https://creativecommons.org/publicdomain/zero/1.0/ | qubodup (loop edit) / omfgdude (source, optional provenance) | ccaa02bb60310146f1fa3b1c70be0a5a57f0674b9c4944a22b85b0c03e932cdb |
| blue / 02 | Night Soul | /audio/night-soul.mp3 | https://freemusicarchive.org/music/Ketsa/jazz-hop-1/night-soul/ | CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/ | Ketsa | d2aae5a4534ff92521e0eccc71d26d3c1d050ad4caa5163101a273db8dd8ee19 |
| cream / 03 | Cathedral Dust | /audio/cathedral-dust.mp3 | https://pixabay.com/music/beats-pusha-t-type-beat-cathedral-dust-480878/ | Pixabay Content License — https://pixabay.com/service/license-summary/ | Not required | 4c2d3050993cf88640fce348640b5811e0691eb718c0815ccd41372def4733e5 |

Canonical runtime metadata and cassette mapping live in
src/music/tracks.js. Built-in files must remain byte-identical to the recorded
checksums; any future user-upload path must be implemented separately.
