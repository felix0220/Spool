import { useSyncExternalStore } from 'react';
import { createSignalLevelStore } from './signal-level-store.js';

const EMPTY_SIGNAL_LEVEL_STORE = createSignalLevelStore();

export function useSignalLevel(store) {
  const source = store || EMPTY_SIGNAL_LEVEL_STORE;
  return useSyncExternalStore(
    source.subscribe,
    source.getSnapshot,
    source.getServerSnapshot,
  );
}
