# SPOOL

An audio playground shaped like a tactile cassette deck. Drop a source into the deck, listen through the instrument-like controls, mark a point, return to it, and eject the cassette without losing the physical continuity of the interaction.

## Run locally

```bash
npm install
npm run dev
```

The production check is:

```bash
npm run check
```

The built-in audio library lives in `public/audio/` and includes the source and license notes used by the three cassette tracks.

For a complete migration and production handoff, read `SPOOL_PRODUCTION_HANDOFF.md`.

## Project shape

- `src/` — React interface, cassette interaction, shared audio state, waveform rendering, and controls
- `public/audio/` — local audio assets and licensing notes
- `tests/` — interaction, audio-state, geometry, waveform, and static-site checks

The execution books and design-QA captures referenced from `AGENTS.md` are
process documentation kept outside this repository; the durable design
direction they produced lives in `AGENTS.md` itself.

Lapse remains a local development aid and is intentionally omitted from the production install through `vercel.json`.
