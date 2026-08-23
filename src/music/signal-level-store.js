export function createSignalLevelStore(initialValue = 0) {
  let value = clampSignalLevel(initialValue);
  const listeners = new Set();

  return {
    getSnapshot() {
      return value;
    },
    getServerSnapshot() {
      return 0;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set(nextValue) {
      const next = clampSignalLevel(nextValue);
      if (Object.is(next, value)) return;
      value = next;
      listeners.forEach((listener) => listener());
    },
    reset() {
      this.set(0);
    },
  };
}

function clampSignalLevel(value) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}
