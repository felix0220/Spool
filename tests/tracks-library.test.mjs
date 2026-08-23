import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  TRACK_CREDITS,
  TRACK_LIBRARY,
  getTrackByCassetteId,
  getTrackById,
} from '../src/music/tracks.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('canonical track and cassette IDs are complete and unique', () => {
  assert.equal(TRACK_LIBRARY.length, 3);
  assert.equal(new Set(TRACK_LIBRARY.map((track) => track.id)).size, TRACK_LIBRARY.length);
  assert.equal(new Set(TRACK_LIBRARY.map((track) => track.cassetteId)).size, TRACK_LIBRARY.length);
  assert.deepEqual(TRACK_LIBRARY.map((track) => track.slot), [1, 2, 3]);
});

test('library is queryable by track ID and cassette ID without a silent fallback', () => {
  for (const track of TRACK_LIBRARY) {
    assert.equal(getTrackById(track.id), track);
    assert.equal(getTrackByCassetteId(track.cassetteId), track);
  }
  assert.throws(() => getTrackById('missing'), /Unknown track ID/);
  assert.throws(() => getTrackByCassetteId('missing'), /Unknown cassette ID/);
});

test('all public audio files exist and match the canonical checksums', async () => {
  await Promise.all(TRACK_LIBRARY.map(async (track) => {
    const publicPath = path.join(projectRoot, 'public', track.audioUrl.replace(/^\/+/, ''));
    const bytes = await readFile(publicPath);
    const digest = createHash('sha256').update(bytes).digest('hex');
    assert.equal(digest, track.sha256, track.title);
  }));
});

test('every built-in cassette meets the 60 second source gate', () => {
  for (const track of TRACK_LIBRARY) {
    assert.ok(track.durationHint >= 60, track.title);
  }
});

test('credits preserve required attribution and contain only the canonical library', () => {
  assert.equal(TRACK_CREDITS.length, TRACK_LIBRARY.length);
  assert.deepEqual(
    TRACK_CREDITS.map((credit) => credit.id),
    TRACK_LIBRARY.map((track) => track.id),
  );
  assert.equal(getTrackById('night-soul').attribution, 'Ketsa');
  assert.equal(getTrackById('night-soul').license, 'CC BY 4.0');
});
