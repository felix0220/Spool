import { MIN_LOOP_DURATION, normalizeLoop } from './loop-region.js';

export const MIN_CAPTURE_DURATION = MIN_LOOP_DURATION;

export function createCaptureRange(
  firstMark,
  secondMark,
  duration,
  minimumDuration = MIN_CAPTURE_DURATION,
) {
  // Kept as a compatibility adapter for the pre-T01 test surface. New state
  // owners use normalizeLoop directly; this helper no longer owns selection.
  return normalizeLoop(firstMark, secondMark, duration, minimumDuration) || { start: 0, end: 0 };
}
