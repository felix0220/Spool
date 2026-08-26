import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('..', import.meta.url));
const stageSource = readFileSync(`${root}/src/components/GraphicDeckStage.jsx`, 'utf8');
const cassetteSource = readFileSync(`${root}/src/components/night-soul/NightSoulSignalCassette.jsx`, 'utf8');
const reelSource = readFileSync(`${root}/src/components/night-soul/NightSoulReelFace.jsx`, 'utf8');

test('signal cassette lifecycle keeps v4 artwork under the existing parent transform', () => {
  assert.match(stageSource, /if \(isSignal\) \{[\s\S]*?<NightSoulSignalCassette/);
  assert.match(stageSource, /reducedMotion=\{reducedMotion\}/);
  assert.match(stageSource, /reelTurn: lockP \* 90/);
  assert.match(stageSource, /setPhase\(DECK_PHASE\.LOADING\)/);
  assert.match(stageSource, /setPhase\(DECK_PHASE\.ENGAGED\)/);
  assert.match(cassetteSource, /transform=\{`translate\(\$\{tape\.x\} \$\{tape\.y\}\) rotate\(\$\{tape\.rotation\}\) scale/);
});

test('v4 holes are negative space and stickers are not used to repair geometry', () => {
  assert.match(cassetteSource, /circle cx=\{\-NIGHT_SOUL_REF_V4\.reel\.centerX\}[^>]*fill="black"/);
  assert.match(cassetteSource, /circle cx=\{NIGHT_SOUL_REF_V4\.reel\.centerX\}[^>]*fill="black"/);
  assert.match(reelSource, /circle r=\{NIGHT_SOUL_REF_V4\.reel\.holeRadius\} fill="black"/);
  assert.doesNotMatch(cassetteSource, /data-cassette-decal="lord-strip"[^>]*(clipPath|mask)=/);
  assert.doesNotMatch(cassetteSource, /data-cassette-decal="wait-on-you-strip"[^>]*(clipPath|mask)=/);
});

test('v4 reel face motion is real state-driven motion, not CSS-only decoration', () => {
  assert.match(reelSource, /reelTurn \* sign/);
  assert.match(reelSource, /playing \? 'playing' : reelTurn \? 'moving' : 'idle'/);
  assert.match(reelSource, /reducedMotion \? 0/);
  assert.doesNotMatch(reelSource, /onPointerDown/);
  assert.doesNotMatch(reelSource, /setInterval|setTimeout/);
});
