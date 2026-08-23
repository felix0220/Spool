// Eject rendering is a depth transition, not a second cassette. Keep the
// contract small and explicit so the JSX cannot silently reintroduce a fixed
// split or render two full cassette entities at the same time.
export const EJECT_EXTERIOR_VIEW_MAX = 0.08;
export const EJECT_CLEARANCE = 20;

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const lerp = (a, b, t) => a + (b - a) * t;
const quadraticBezier = (start, control, end, t) => [
  lerp(lerp(start[0], control[0], t), lerp(control[0], end[0], t), t),
  lerp(lerp(start[1], control[1], t), lerp(control[1], end[1], t), t),
];
const magneticControl = (start, target) => {
  const dx = target[0] - start[0];
  const dy = target[1] - start[1];
  const distance = Math.hypot(dx, dy) || 1;
  const bend = Math.min(26, distance * 0.08);
  return [
    (start[0] + target[0]) / 2 - (dy / distance) * bend,
    (start[1] + target[1]) / 2 + (dx / distance) * bend,
  ];
};

export function getEjectPose({
  tapeProgress,
  centerX,
  receiverY,
  cavityBottom,
  cassetteHeight,
  home,
  clearance = EJECT_CLEARANCE,
}) {
  const progress = clamp01(tapeProgress);
  const clearY = cavityBottom + cassetteHeight / 2 + clearance;
  // The cassette keeps the original diagonal trajectory from the receiver
  // to its home position. Occlusion is handled by a single depth handoff in
  // the renderer, never by inserting a straight vertical travel phase into
  // the motion itself.
  const returnProgress = progress;
  const start = [centerX, receiverY];
  const target = [home.x, home.y];
  const path = quadraticBezier(start, magneticControl(start, target), target, returnProgress);
  return {
    phase: 'diagonal-return',
    x: path[0],
    y: path[1],
    rotation: lerp(0, home.rotation, returnProgress),
    clearY,
    returnProgress,
  };
}

export function getRotatedTopEdge({ y, rotation = 0, width, height }) {
  const radians = Math.abs(rotation) * Math.PI / 180;
  const halfHeight = (height / 2) * Math.cos(radians) + (width / 2) * Math.sin(radians);
  return y - halfHeight;
}

export function isEjectPoseClear({ pose, cavityBottom, width, height, clearance = EJECT_CLEARANCE }) {
  return getRotatedTopEdge({
    y: pose.y,
    rotation: pose.rotation,
    width,
    height,
  }) >= cavityBottom + clearance;
}

export function buildEjectStandbyFrame(home) {
  return home.map((tape) => ({
    ...tape,
    opacity: 1,
    scale: tape.scale ?? 1,
    visible: true,
  }));
}

export function shouldRenderEjectExterior({ phase, view, embed, pose, cavityBottom, width, height, clearance = EJECT_CLEARANCE }) {
  return getEjectLayer({ phase, view, embed, pose, cavityBottom, width, height, clearance }) === 'foreground';
}

export function getEjectLayer({ phase, view, embed, pose, cavityBottom, width, height, clearance = EJECT_CLEARANCE }) {
  if (phase !== 'ejecting') return 'seated';
  // Keep the cassette in the cavity during the camera/lid reveal. Once the
  // tape is actually released, render the same pose as one complete entity;
  // never cut its body with a fixed horizontal split while it is diagonal.
  if (!Number.isFinite(view) || view > EJECT_EXTERIOR_VIEW_MAX) return 'seated';
  if (!Number.isFinite(embed) || embed >= 1) return 'seated';
  // Do not gate this handoff on geometric clearance. The seated layer is
  // clipped by the bay cavity, so waiting for the rotated bounds to clear the
  // cavity makes the same diagonal cassette visibly collide with the lid or
  // guide. The foreground layer is intentionally rendered as one complete
  // entity; its depth order is the visual collision boundary.
  if (!pose || !Number.isFinite(cavityBottom) || !Number.isFinite(width) || !Number.isFinite(height)) return 'seated';
  return 'foreground';
}
