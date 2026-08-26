import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('..', import.meta.url));
const stageSource = readFileSync(`${root}/src/components/GraphicDeckStage.jsx`, 'utf8');
const referenceSource = readFileSync(`${root}/src/components/night-soul/night-soul-reference.js`, 'utf8');
const reelSource = readFileSync(`${root}/src/components/night-soul/NightSoulReelFace.jsx`, 'utf8');
const cassetteSource = readFileSync(`${root}/src/components/night-soul/NightSoulSignalCassette.jsx`, 'utf8');

const assets = [
  'left-reel-print.png',
  'right-reel-print.png',
  'reel-face-grain.png',
  'shell-fog-overlay.png',
  'shell-edge-wear.png',
  'electric-glow-texture.png',
  'surface-grain.png',
];

test('Night Soul v4 reference contract is registered in the active renderer', () => {
  assert.match(stageSource, /NIGHT_SOUL_REF_V4/);
  assert.match(stageSource, /night-soul-reference\.js/);
  assert.match(referenceSource, /version: 'ref-v4'/);
  assert.match(referenceSource, /centerX: 65/);
  assert.match(referenceSource, /faceRadius: 50/);
  assert.match(referenceSource, /holeRadius: 20/);
});

test('Night Soul v4 assets exist under the versioned directory', () => {
  for (const asset of assets) {
    assert.equal(existsSync(`${root}/public/assets/night-soul/ref-v4/${asset}`), true, asset);
  }
  assert.equal(existsSync(`${root}/public/assets/night-soul/ref-v4/manifest.json`), true);
});

test('NightSoulReelFace owns the shared face mask and real rotation state', () => {
  assert.match(reelSource, /data-cassette-functional-layer="functional-reel-hardware"/);
  assert.match(reelSource, /data-reel-pivot="receiver-centre"/);
  assert.match(reelSource, /data-reel-motion="signal"/);
  assert.match(reelSource, /data-reel-state=\{state\}/);
  assert.match(reelSource, /maskId/);
  assert.match(reelSource, /holeRadius/);
  assert.match(reelSource, /reelTurn \* sign/);
  assert.match(reelSource, /reducedMotion/);
  assert.match(reelSource, /reel-print-\$\{side\}/);
});

test('the active signal branch uses the hybrid v4 layer stack', () => {
  assert.match(stageSource, /NightSoulSignalCassette/);
  for (const layer of ['rear-media', 'lower-mechanical-substrate', 'translucent-shell-field', 'electric-glow-texture', 'shell-fog-overlay', 'molded-seams', 'shell-edge-wear', 'lower-guide-hardware', 'top-stickers', 'surface-grain']) {
    assert.match(cassetteSource, new RegExp(`data-cassette-depth-layer="${layer}"`));
  }
  assert.match(cassetteSource, /data-cassette-art="night-soul-blue-reel-ref-v4"/);
  assert.match(cassetteSource, /bodyMaskId/);
  assert.match(cassetteSource, /centerLock\.radius/);
  assert.match(cassetteSource, /waitOnYou\.href/);
});

test('v4 geometry does not move the shared cassette footprint', () => {
  assert.match(referenceSource, /width: 280/);
  assert.match(referenceSource, /height: 156/);
  assert.match(referenceSource, /leftX: -94/);
  assert.match(referenceSource, /rightX: 94/);
  assert.match(referenceSource, /x: 0, y: 50/);
});
