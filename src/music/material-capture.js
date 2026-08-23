const DEFAULT_PROCESSING = Object.freeze({
  volume: 0.78,
  tone: 0,
  space: 0,
  texture: 0,
  rate: 1,
  shuttle: 0,
});

function finiteOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function copyProcessing(processing = {}) {
  const source = processing && typeof processing === 'object' ? processing : {};
  const snapshot = {
    volume: finiteOr(source.volume, DEFAULT_PROCESSING.volume),
    tone: finiteOr(source.tone, DEFAULT_PROCESSING.tone),
    space: finiteOr(source.space, DEFAULT_PROCESSING.space),
    texture: finiteOr(source.texture, DEFAULT_PROCESSING.texture),
    rate: Number(source.rate) === 2 ? 2 : 1,
    // Shuttle is a transient transport gesture, not a committed processing
    // parameter. Captured material always stores its settled value.
    shuttle: 0,
  };
  return Object.freeze(snapshot);
}

/**
 * Create an immutable material record from the active Loop and processing
 * values. The function deliberately copies both nested objects so later
 * edits cannot mutate a material that has already been captured.
 */
export function snapshotCapture(trackId, region, processing = {}) {
  const sourceTrackId = String(trackId || '');
  const start = finiteOr(region?.start, NaN);
  const end = finiteOr(region?.end, NaN);
  if (!sourceTrackId) throw new TypeError('snapshotCapture requires a trackId');
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
    throw new RangeError('snapshotCapture requires a positive region');
  }

  const copiedRegion = Object.freeze({ start, end });
  const copiedProcessing = copyProcessing(processing);
  return Object.freeze({
    id: `material:${sourceTrackId}:${start}:${end}`,
    sourceTrackId,
    region: copiedRegion,
    processing: copiedProcessing,
    duration: end - start,
  });
}

export { DEFAULT_PROCESSING };
