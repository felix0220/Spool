import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FRONT_INTENTS,
  FRONT_INTENT_SOURCES,
  canDispatchFrontIntent,
  createFrontIntent,
  getFrontIntentState,
  hasValidCaptureRegion,
} from '../src/components/front/action-contract.js';

const ready = { controlsReady: true, phase: 'engaged', selectedId: 'blue' };

test('front action inventory is stable and intent records are explicit', () => {
  assert.deepEqual(Object.values(FRONT_INTENTS), [
    'transport.stop',
    'transport.toggle',
    'transport.mark-a',
    'transport.mark-b',
    'transport.return',
    'capture.commit',
    'machine.eject',
  ]);
  assert.throws(() => createFrontIntent('machine.load'), TypeError);
  assert.deepEqual(createFrontIntent(FRONT_INTENTS.TRANSPORT_STOP), {
    type: 'transport.stop',
    source: 'program',
  });
});

test('stop is allowed only when the active source is ready', () => {
  assert.deepEqual(getFrontIntentState(FRONT_INTENTS.TRANSPORT_STOP, ready), {
    allowed: true,
    reason: 'active-source-ready',
  });
  assert.equal(canDispatchFrontIntent(FRONT_INTENTS.TRANSPORT_STOP, { ...ready, controlsReady: false }), false);
});

test('play/pause is allowed only when the active source is ready', () => {
  assert.equal(canDispatchFrontIntent(FRONT_INTENTS.TRANSPORT_TOGGLE, ready), true);
  assert.equal(canDispatchFrontIntent(FRONT_INTENTS.TRANSPORT_TOGGLE, { ...ready, controlsReady: false }), false);
});

test('A and B cues store independently and return requires an active cue', () => {
  assert.equal(canDispatchFrontIntent(FRONT_INTENTS.MARK_A, ready), true);
  assert.equal(canDispatchFrontIntent(FRONT_INTENTS.MARK_B, ready), true);
  assert.equal(canDispatchFrontIntent(FRONT_INTENTS.MARK_A, { ...ready, controlsReady: false }), false);
  assert.equal(canDispatchFrontIntent(FRONT_INTENTS.MARK_B, { ...ready, controlsReady: false }), false);
  assert.deepEqual(getFrontIntentState(FRONT_INTENTS.RETURN_TO_MARK, ready), {
    allowed: false,
    reason: 'no-mark-point',
  });
  assert.deepEqual(getFrontIntentState(FRONT_INTENTS.RETURN_TO_MARK, { ...ready, markTime: 12.4 }), {
    allowed: true,
    reason: 'mark-point-ready',
  });
});

test('capture only allows commit for a positive region on a ready source', () => {
  assert.equal(hasValidCaptureRegion({ start: 1, end: 3 }), true);
  assert.equal(hasValidCaptureRegion({ start: 3, end: 3 }), false);
  assert.equal(canDispatchFrontIntent(FRONT_INTENTS.CAPTURE_COMMIT, { ...ready, capture: { start: 1, end: 3 } }), true);
  assert.equal(canDispatchFrontIntent(FRONT_INTENTS.CAPTURE_COMMIT, { ...ready, capture: { start: 1, end: null } }), false);
  assert.equal(canDispatchFrontIntent(FRONT_INTENTS.CAPTURE_COMMIT, { ...ready, controlsReady: false, capture: { start: 1, end: 3 } }), false);
});

test('eject is independent but only allowed from the loaded phase', () => {
  assert.deepEqual(getFrontIntentState(FRONT_INTENTS.MACHINE_EJECT, ready), { allowed: true, reason: 'loaded-source-ready' });
  assert.equal(canDispatchFrontIntent(FRONT_INTENTS.MACHINE_EJECT, { ...ready, phase: 'loading' }), false);
});
