import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(
  fileURLToPath(new URL('../src/music/useAudioClock.js', import.meta.url)),
  'utf8',
);

test('audio clock keeps a frame loop while media is playing', () => {
  assert.match(source, /requestAnimationFrame\(playbackFrame\)/);
  assert.match(source, /addEventListener\('playing', handlePlaying\)/);
  assert.match(source, /addEventListener\('pause', handlePause\)/);
  assert.match(source, /cancelAnimationFrame\(playbackFrameId\)/);
});
