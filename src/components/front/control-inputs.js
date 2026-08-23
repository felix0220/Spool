export function clampControlValue(value, min, max) {
  return Math.min(Number(max), Math.max(Number(min), Number(value)));
}

export function quantizeControlValue(value, min, max, step) {
  const safeStep = Number(step) > 0 ? Number(step) : 1;
  const clamped = clampControlValue(value, min, max);
  const steps = Math.round((clamped - Number(min)) / safeStep);
  const precision = Math.max(0, (String(safeStep).split('.')[1] || '').length + 2);
  return Number(clampControlValue(Number(min) + steps * safeStep, min, max).toFixed(precision));
}

export function normalizeWheelDelta({ deltaY, deltaMode = 0, lineHeight = 16, pageHeight = 800 }) {
  const amount = Number(deltaY) || 0;
  if (deltaMode === 1) return amount * lineHeight;
  if (deltaMode === 2) return amount * pageHeight;
  return amount;
}

export function nextValueFromWheel({
  value,
  min,
  max,
  step,
  deltaY,
  deltaMode = 0,
  remainder = 0,
  lineHeight = 16,
  pageHeight = 800,
}) {
  const normalized = normalizeWheelDelta({ deltaY, deltaMode, lineHeight, pageHeight });
  const accumulated = remainder + normalized;
  const threshold = deltaMode === 1 ? lineHeight : deltaMode === 2 ? pageHeight : 40;
  const direction = Math.sign(accumulated);
  const ticks = Math.trunc(Math.abs(accumulated) / threshold);
  if (!ticks) return { changed: false, value: Number(value), remainder: accumulated };

  const consumed = direction * ticks * threshold;
  const next = quantizeControlValue(Number(value) - direction * ticks * Number(step), min, max, step);
  return { changed: next !== Number(value), value: next, remainder: accumulated - consumed };
}

export function valueFromVerticalDrag({ startValue, deltaY, min, max, step, pixelsPerRange = 180 }) {
  const range = Number(max) - Number(min);
  const raw = Number(startValue) - (Number(deltaY) / pixelsPerRange) * range;
  return quantizeControlValue(raw, min, max, step);
}

export function shuttleDirectionFromPointer({ pointX, centerX, halfWidth }) {
  const safeHalfWidth = Math.max(1, Number(halfWidth) || 1);
  return Math.min(1, Math.max(-1, (Number(pointX) - Number(centerX)) / safeHalfWidth));
}

export const SHUTTLE_DETENTS = 4;
export const SHUTTLE_DETENT_STEP = 1 / SHUTTLE_DETENTS;

export function quantizeShuttleDirection(value, detents = SHUTTLE_DETENTS) {
  const safeDetents = Math.max(1, Number(detents) || 1);
  const clamped = Math.min(1, Math.max(-1, Number(value) || 0));
  const snapped = Math.round(clamped * safeDetents) / safeDetents;
  return snapped === 0 ? 0 : snapped;
}

export function shouldIgnoreSecondTouch(activePointerId, nextPointerId, pointerType) {
  return pointerType === 'touch' && activePointerId != null && activePointerId !== nextPointerId;
}
