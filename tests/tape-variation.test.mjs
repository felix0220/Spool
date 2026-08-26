import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  TAPE_VARIATION_MAX,
  TAPE_VARIATION_MIN,
  createRandomTapeVariation,
  toneCutoffFromPercent,
} from '../src/music/tape-variation.js';

const stageSource = readFileSync(new URL('../src/components/GraphicDeckStage.jsx', import.meta.url), 'utf8');

test('random tape variation produces three distinct values in the safe control range', () => {
  const variation = createRandomTapeVariation(() => Math.random());
  const percentages = [
    variation.tonePercent,
    variation.spacePercent,
    variation.texturePercent,
  ];

  assert.equal(new Set(percentages).size, 3);
  assert.ok(percentages.every((value) => Number.isInteger(value)));
  assert.ok(percentages.every((value) => value >= TAPE_VARIATION_MIN && value <= TAPE_VARIATION_MAX));
  assert.equal(variation.toneCutoff, toneCutoffFromPercent(variation.tonePercent));
  assert.equal(variation.space, variation.spacePercent / 100);
  assert.equal(variation.texture, variation.texturePercent / 100);
});

test('random tape variation retries a duplicate draw without changing the other values', () => {
  const samples = [0, 0, .02, .04];
  const variation = createRandomTapeVariation(() => samples.shift() ?? .06);

  assert.deepEqual(
    [variation.tonePercent, variation.spacePercent, variation.texturePercent],
    [TAPE_VARIATION_MIN, TAPE_VARIATION_MIN + 1, TAPE_VARIATION_MIN + 3],
  );
});

test('tone percentage maps to the existing neutral-to-maximum cutoff range', () => {
  assert.equal(toneCutoffFromPercent(0), 400);
  assert.equal(toneCutoffFromPercent(100), 20000);
  assert.equal(toneCutoffFromPercent(15), 3340);
});

test('insertion applies one generated variation at the physical lock boundary', () => {
  assert.match(stageSource, /import \{ createRandomTapeVariation \} from '..\/music\/tape-variation\.js';/);
  assert.match(stageSource, /const tapeVariation = createRandomTapeVariation\(\);/);
  assert.match(
    stageSource,
    /if \(!trackCommitted && raw >= INSERT_TIMING\.lockEnd\) \{[\s\S]*?setToneCutoff\(tapeVariation\.toneCutoff\);[\s\S]*?setSpaceAmount\(tapeVariation\.space\);[\s\S]*?setTextureAmount\(tapeVariation\.texture\);/,
  );
  assert.doesNotMatch(stageSource, /setToneCutoff\(400\);\s*setSpaceAmount\(0\);\s*setTextureAmount\(0\);/);
});
