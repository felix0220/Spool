import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FRONT_BODY_CONTRACT,
  FRONT_LAYOUT_DESIGN,
  FRONT_VIEWBOX,
} from '../src/components/front/front-reference-geometry.js';

test('front body uses the shared 1420 × 1108 design canvas', () => {
  assert.deepEqual(FRONT_VIEWBOX, { width: 1420, height: 1108 });
  assert.deepEqual(FRONT_BODY_CONTRACT.viewport, FRONT_VIEWBOX);
});

test('front body zones stay inside one chassis and keep screen above controls', () => {
  const { chassis, screenZone, controlZone, shellInner } = FRONT_BODY_CONTRACT;
  assert.ok(screenZone.y < controlZone.y, 'screen zone must sit above control zone');
  assert.ok(screenZone.y + screenZone.height <= shellInner.y + shellInner.height);
  assert.ok(controlZone.y + controlZone.height <= shellInner.y + shellInner.height);
  assert.ok(chassis.x < screenZone.x);
  assert.ok(screenZone.x + screenZone.width <= chassis.x + chassis.width);
  assert.ok(chassis.x < controlZone.x);
  assert.ok(controlZone.x + controlZone.width <= chassis.x + chassis.width);
});

test('mounting screws stay inside the outer product body', () => {
  const { chassis, screws } = FRONT_BODY_CONTRACT;
  for (const [x, y] of screws) {
    assert.ok(x >= chassis.x && x <= chassis.x + chassis.width);
    assert.ok(y >= chassis.y && y <= chassis.y + chassis.height);
  }
});

test('layout contract matches the rendered geometry source', () => {
  assert.equal(FRONT_LAYOUT_DESIGN.chassis.width, 1200);
  assert.equal(FRONT_LAYOUT_DESIGN.chassis.height, 812);
  assert.equal(FRONT_LAYOUT_DESIGN.upper.y, 132);
  assert.equal(FRONT_LAYOUT_DESIGN.lower.y, 612);
  assert.deepEqual(FRONT_LAYOUT_DESIGN.separators, [610, 1130]);
});
