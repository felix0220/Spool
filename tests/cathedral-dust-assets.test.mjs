import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const assetRoot = new URL('public/assets/cathedral-dust/ref-v1/', root);
const manifest = JSON.parse(fs.readFileSync(new URL('manifest.json', assetRoot), 'utf8'));
const task = manifest.task02;

test('Cathedral Dust Task02 manifest is complete and runtime-blocked', () => {
  assert.equal(task.status, 'passed');
  assert.equal(task.runtimeIntegration, 'blocked-until-task03');
  assert.equal(task.master.width, 1120);
  assert.equal(task.master.height, 624);
  assert.match(task.sourceHashVerified, /^[a-f0-9]{64}$/);
  assert.deepEqual(task.layerOrder.slice(0, 3), [
    'rear-media.png',
    'lower-mechanism.png',
    'shell-substrate.png',
  ]);
  assert.ok(task.layerOrder.includes('official-SPOOL-mark-vector'));
  assert.equal(task.pivotLocal['reel-left-surface.png'].runtimeCenter.x, -65);
  assert.equal(task.pivotLocal['reel-right-surface.png'].runtimeCenter.x, 65);
});

test('every required Cathedral Dust runtime raster exists with RGBA metadata', () => {
  const required = [
    'shell-substrate.png',
    'rear-media.png',
    'reel-left-surface.png',
    'reel-right-surface.png',
    'lower-mechanism.png',
    'title-engraving.png',
    'surface-wear.png',
    'brass-fastener.png',
  ];
  for (const file of required) {
    const metadata = task.assets[file];
    assert.ok(metadata, `missing manifest entry for ${file}`);
    assert.ok(fs.existsSync(new URL(file, assetRoot)), `missing asset file ${file}`);
    assert.equal(metadata.mode, 'RGBA', `${file} must be transparent RGBA`);
    assert.equal(metadata.alpha, true, `${file} must declare alpha`);
    assert.ok(metadata.width > 0 && metadata.height > 0, `${file} dimensions must be positive`);
  }
  for (const file of ['shell-substrate.png', 'rear-media.png', 'lower-mechanism.png', 'surface-wear.png']) {
    assert.equal(task.assets[file].width, 1120, `${file} must stay full-canvas`);
    assert.equal(task.assets[file].height, 624, `${file} must stay full-canvas`);
  }
  assert.equal(task.assets['reel-left-surface.png'].width, 224);
  assert.equal(task.assets['reel-left-surface.png'].height, 224);
  assert.equal(task.assets['reel-right-surface.png'].width, 224);
  assert.equal(task.assets['reel-right-surface.png'].height, 224);
  assert.ok(task.assets['title-engraving.png'].width < 1120, 'title must use tight transparent bounds');
});

test('Task05 mechanical anchors stay on the frozen pivots and inside the body', () => {
  const task05 = manifest.task05;
  assert.equal(task05.status, 'passed');
  assert.deepEqual(task05.mechanicalLayers.reelLeft.center, [-65, 0]);
  assert.deepEqual(task05.mechanicalLayers.reelRight.center, [65, 0]);
  assert.equal(task05.mechanicalLayers.fastenerRuntimeAnchors.length, 5);
  for (const [x, y] of task05.mechanicalLayers.fastenerRuntimeAnchors) {
    assert.ok(Math.abs(x) <= 132, `fastener x=${x} must stay inside the cassette body`);
    assert.ok(Math.abs(y) <= 70, `fastener y=${y} must stay inside the cassette body`);
    for (const holeX of [-65, 65]) {
      assert.ok(Math.hypot(x - holeX, y) > 28, `fastener ${x},${y} must clear receiver hole ${holeX},0`);
    }
  }
});
