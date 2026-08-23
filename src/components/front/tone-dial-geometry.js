import { clamp } from './front-reference-geometry.js';

// The open track starts at the lower-left and travels clockwise around the
// dial to the lower-right, leaving the bottom edge open like the reference.
export const TONE_MIN_ANGLE = 135;
export const TONE_MAX_ANGLE = 405;

export function toneAngle(value, min = 0, max = 1) {
  const range = Number(max) - Number(min) || 1;
  return TONE_MIN_ANGLE + clamp((Number(value) - Number(min)) / range) * (TONE_MAX_ANGLE - TONE_MIN_ANGLE);
}

export function tonePoint(cx, cy, radius, angle) {
  const radians = (Number(angle) * Math.PI) / 180;
  return [
    Number(cx) + Math.cos(radians) * Number(radius),
    Number(cy) + Math.sin(radians) * Number(radius),
  ];
}

export function toneArcPath(cx, cy, radius, startAngle, endAngle) {
  const start = tonePoint(cx, cy, radius, startAngle);
  const end = tonePoint(cx, cy, radius, endAngle);
  const delta = Number(endAngle) - Number(startAngle);
  if (Math.abs(delta) < 0.001) return `M${start[0].toFixed(2)} ${start[1].toFixed(2)}`;
  const largeArc = Math.abs(delta) > 180 ? 1 : 0;
  const sweep = delta > 0 ? 1 : 0;
  return `M${start[0].toFixed(2)} ${start[1].toFixed(2)} A${Number(radius).toFixed(2)} ${Number(radius).toFixed(2)} 0 ${largeArc} ${sweep} ${end[0].toFixed(2)} ${end[1].toFixed(2)}`;
}
