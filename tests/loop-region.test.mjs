import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampCue,
  isValidLoop,
  normalizeLoop,
} from '../src/music/loop-region.js';

test('cue points clamp to the source boundary', () => {
  assert.equal(clampCue(-2, 10), 0);
  assert.equal(clampCue(12, 10), 10);
  assert.equal(clampCue(Number.NaN, 10), 0);
});

test('loop handles are ordered and normalized', () => {
  assert.deepEqual(normalizeLoop(4, 2, 10), { start: 2, end: 4 });
});

test('short loop expands without crossing the duration boundary', () => {
  assert.deepEqual(normalizeLoop(9.98, 10, 10), { start: 9.9, end: 10 });
  assert.deepEqual(normalizeLoop(0, 0, 10), { start: 0, end: 0.1 });
});

test('empty source and impossible minimum return null', () => {
  assert.equal(normalizeLoop(0, 0, 0), null);
  assert.equal(normalizeLoop(0, 0, 0.05, 0.1), null);
});

test('valid loop predicate enforces duration and minimum length', () => {
  assert.equal(isValidLoop({ start: 1, end: 1.1 }, 10), true);
  assert.equal(isValidLoop({ start: 1, end: 1.099 }, 10), false);
  assert.equal(isValidLoop({ start: 0, end: 11 }, 10), false);
});
