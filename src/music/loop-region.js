export const MIN_LOOP_DURATION = 0.1;

function finiteOr(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function safeDuration(duration) {
  return Math.max(0, finiteOr(duration));
}

/**
 * Clamp a cue point to the currently loaded source. Cue is a position, not a
 * region, so it remains valid even when the user has not enabled Loop.
 */
export function clampCue(time, duration) {
  const safeEnd = safeDuration(duration);
  return Math.min(safeEnd, Math.max(0, finiteOr(time)));
}

/**
 * Normalize a pair of timeline handles into one legal loop region.
 *
 * Invalid/empty sources return null. Short regions are expanded at the
 * nearest boundary so the result stays inside the source and never crosses
 * the minimum audible duration.
 */
export function normalizeLoop(
  start,
  end,
  duration,
  minimum = MIN_LOOP_DURATION,
) {
  const safeEnd = safeDuration(duration);
  if (safeEnd <= 0) return null;

  const first = clampCue(start, safeEnd);
  const second = clampCue(end, safeEnd);
  let regionStart = Math.min(first, second);
  let regionEnd = Math.max(first, second);
  const required = Math.max(0, finiteOr(minimum, MIN_LOOP_DURATION));
  if (safeEnd < required) return null;

  if (regionEnd - regionStart < required) {
    if (regionStart + required <= safeEnd) regionEnd = regionStart + required;
    else regionStart = Math.max(0, regionEnd - required);
  }

  if (regionStart >= regionEnd || regionEnd - regionStart + 1e-9 < required) return null;
  return { start: regionStart, end: regionEnd };
}

export function isValidLoop(region, duration, minimum = MIN_LOOP_DURATION) {
  if (!region || typeof region !== 'object') return false;
  const safeEnd = safeDuration(duration);
  const required = Math.max(0, finiteOr(minimum, MIN_LOOP_DURATION));
  return safeEnd > 0
    && Number.isFinite(region.start)
    && Number.isFinite(region.end)
    && region.start >= 0
    && region.start < region.end
    && region.end <= safeEnd
    && region.end - region.start + 1e-9 >= required;
}
