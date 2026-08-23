import test from 'node:test';
import assert from 'node:assert/strict';
import { createSignalLevelStore } from '../src/music/signal-level-store.js';

test('signal level store publishes clamped values without duplicate updates', () => {
  const store = createSignalLevelStore();
  let updates = 0;
  const unsubscribe = store.subscribe(() => { updates += 1; });

  store.set(0.6);
  assert.equal(store.getSnapshot(), 0.6);
  assert.equal(updates, 1);

  store.set(0.6);
  assert.equal(updates, 1);

  store.set(4);
  assert.equal(store.getSnapshot(), 1);
  assert.equal(updates, 2);

  store.reset();
  assert.equal(store.getSnapshot(), 0);
  assert.equal(updates, 3);

  unsubscribe();
  store.set(0.25);
  assert.equal(updates, 3);
});
