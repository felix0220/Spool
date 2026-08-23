import test from 'node:test';
import assert from 'node:assert/strict';
import {
  nextValueFromWheel,
  normalizeWheelDelta,
  quantizeShuttleDirection,
  quantizeControlValue,
  shouldIgnoreSecondTouch,
  shuttleDirectionFromPointer,
  valueFromVerticalDrag,
} from '../src/components/front/control-inputs.js';

test('wheel delta normalization respects pixel, line, and page modes', () => {
  assert.equal(normalizeWheelDelta({ deltaY: 12, deltaMode: 0 }), 12);
  assert.equal(normalizeWheelDelta({ deltaY: 2, deltaMode: 1, lineHeight: 18 }), 36);
  assert.equal(normalizeWheelDelta({ deltaY: -1, deltaMode: 2, pageHeight: 720 }), -720);
});

test('wheel changes a rotary value only after a normalized notch', () => {
  const partial = nextValueFromWheel({ value: .5, min: 0, max: 1, step: .01, deltaY: 12 });
  assert.equal(partial.changed, false);
  assert.equal(partial.remainder, 12);

  const up = nextValueFromWheel({ value: .5, min: 0, max: 1, step: .01, deltaY: -60, remainder: 12 });
  assert.equal(up.changed, true);
  assert.equal(up.value, .51);
  assert.equal(up.remainder, -8);
});

test('line-mode wheel supports discrete detents and clamps at bounds', () => {
  const rateUp = nextValueFromWheel({ value: 1, min: 1, max: 2, step: 1, deltaY: -1, deltaMode: 1 });
  assert.deepEqual(rateUp, { changed: true, value: 2, remainder: 0 });

  const rateDown = nextValueFromWheel({ value: 1, min: 1, max: 2, step: 1, deltaY: 4, deltaMode: 1 });
  assert.deepEqual(rateDown, { changed: false, value: 1, remainder: 0 });
});

test('vertical drag maps to a quantized rotary value', () => {
  assert.equal(valueFromVerticalDrag({ startValue: .5, deltaY: -90, min: 0, max: 1, step: .01 }), 1);
  assert.equal(valueFromVerticalDrag({ startValue: .5, deltaY: 90, min: 0, max: 1, step: .01 }), 0);
  assert.equal(valueFromVerticalDrag({ startValue: 4, deltaY: -20, min: 1, max: 16, step: 1 }), 6);
  assert.equal(quantizeControlValue(1.234, 0, 2, .1), 1.2);
});

test('shuttle pointer mapping keeps the physical center neutral', () => {
  assert.equal(shuttleDirectionFromPointer({ pointX: 808, centerX: 808, halfWidth: 85 }), 0);
  assert.equal(shuttleDirectionFromPointer({ pointX: 893, centerX: 808, halfWidth: 85 }), 1);
  assert.equal(shuttleDirectionFromPointer({ pointX: 723, centerX: 808, halfWidth: 85 }), -1);
  assert.equal(shuttleDirectionFromPointer({ pointX: 1200, centerX: 808, halfWidth: 85 }), 1);
});

test('shuttle direction snaps to four persistent detents per side', () => {
  assert.equal(quantizeShuttleDirection(-.88), -1);
  assert.equal(quantizeShuttleDirection(-.62), -.5);
  assert.equal(quantizeShuttleDirection(-.1), 0);
  assert.equal(quantizeShuttleDirection(.24), .25);
  assert.equal(quantizeShuttleDirection(.76), .75);
  assert.equal(quantizeShuttleDirection(1.2), 1);
});

test('a second touch pointer cannot take over an active control drag', () => {
  assert.equal(shouldIgnoreSecondTouch(4, 5, 'touch'), true);
  assert.equal(shouldIgnoreSecondTouch(4, 5, 'mouse'), false);
  assert.equal(shouldIgnoreSecondTouch(null, 5, 'touch'), false);
});
