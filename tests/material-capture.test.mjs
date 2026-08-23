import test from 'node:test';
import assert from 'node:assert/strict';
import { snapshotCapture } from '../src/music/material-capture.js';

test('capture snapshots copy the region and processing values', () => {
  const region = { start: 2, end: 5 };
  const processing = { volume: 0.7, tone: 12000, space: 0.55, texture: 0.4, rate: 2, shuttle: 0 };
  const material = snapshotCapture('night-soul', region, processing);

  assert.equal(material.sourceTrackId, 'night-soul');
  assert.equal(material.duration, 3);
  assert.deepEqual(material.region, { start: 2, end: 5 });
  assert.deepEqual(material.processing, { volume: 0.7, tone: 12000, space: 0.55, texture: 0.4, rate: 2, shuttle: 0 });
  assert.notEqual(material.region, region);
  assert.notEqual(material.processing, processing);
});

test('capture snapshots remain immutable after source objects change', () => {
  const region = { start: 1, end: 3 };
  const processing = { volume: 0.5, tone: 400, space: 0.2, texture: 0.2, rate: 1, shuttle: 0 };
  const material = snapshotCapture('cathedral-dust', region, processing);

  region.start = 0;
  processing.volume = 0;
  assert.equal(material.region.start, 1);
  assert.equal(material.processing.volume, 0.5);
  assert.throws(() => { material.region.start = 0; }, TypeError);
  assert.throws(() => { material.processing.volume = 0; }, TypeError);
});

test('capture snapshots reject empty identity or non-positive regions', () => {
  assert.throws(() => snapshotCapture('', { start: 0, end: 1 }), TypeError);
  assert.throws(() => snapshotCapture('track', { start: 1, end: 1 }), RangeError);
});
