export const DEMO_CUES = [
  { id: 'cue-01', start: 0, end: 8, text: 'DEMO LYRIC TEXT', source: 'demo slot' },
  { id: 'cue-02', start: 8, end: 16, text: 'midnight in the quiet', source: 'demo slot' },
  { id: 'cue-03', start: 16, end: 26, text: 'let the record turn', source: 'demo slot' },
  { id: 'cue-04', start: 26, end: 38, text: 'REPLACE WITH LICENSED LYRICS', source: 'demo slot' },
  { id: 'cue-05', start: 38, end: 52, text: 'CUE MAP READY', source: 'demo slot' },
  { id: 'cue-06', start: 52, end: 66, text: 'AUDIO ADAPTER PENDING', source: 'demo slot' },
  { id: 'cue-07', start: 66, end: 84, text: 'J / K TO MOVE BETWEEN CUES', source: 'demo slot' },
];

function parseTimestamp(raw) {
  const [minutes, seconds] = raw.split(':').map(Number);
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;
  return minutes * 60 + seconds;
}

export function parseLrc(lrcText) {
  const cues = [];

  for (const rawLine of lrcText.split(/\r?\n/)) {
    const matches = [...rawLine.matchAll(/\[(\d{1,3}:\d{2}(?:\.\d{1,3})?)\]/g)];
    const text = rawLine.replace(/(?:\[\d{1,3}:\d{2}(?:\.\d{1,3})?\])+/, '').trim();
    if (!text || matches.length === 0) continue;

    for (const match of matches) {
      const start = parseTimestamp(match[1]);
      if (start !== null) cues.push({ start, text, source: 'imported .lrc' });
    }
  }

  cues.sort((a, b) => a.start - b.start);
  return cues.map((cue, index) => ({
    id: `cue-${String(index + 1).padStart(2, '0')}`,
    ...cue,
    end: cues[index + 1]?.start ?? cue.start + 8,
  }));
}

export function cueIndexAtTime(cues, time) {
  if (!cues.length) return -1;
  const index = cues.findIndex((cue) => time >= cue.start && time < cue.end);
  if (index !== -1) return index;
  if (time < cues[0].start) return 0;
  return cues.length - 1;
}
