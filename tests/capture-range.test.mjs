import test from 'node:test';
import assert from 'node:assert/strict';
import { createCaptureRange } from '../src/music/capture-range.js';

test('capture marks are ordered regardless of press direction', () => {
  assert.deepEqual(createCaptureRange(4, 2, 10), { start: 2, end: 4 });
});

test('a same-position second mark creates a positive 100ms region', () => {
  assert.deepEqual(createCaptureRange(3, 3, 10), { start: 3, end: 3.1 });
});

test('minimum capture duration remains inside the track boundary', () => {
  assert.deepEqual(createCaptureRange(9.98, 10, 10), { start: 9.9, end: 10 });
});
