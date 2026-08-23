// The product is authored in the existing 1280 × 720 world space, while the
// reference and the responsive stage use a measured 1420 × 1108 design space.
// Keeping this conversion explicit prevents CSS viewport fitting from silently
// changing the physical proportions or breaking pointer coordinates.
export const DESIGN_VIEWPORT = Object.freeze({ width: 1420, height: 1108 });
export const WORLD_VIEWPORT = Object.freeze({ width: 1280, height: 720 });

export const WORLD_FRAME = Object.freeze({
  scale: 1.55,
  worldCenterX: WORLD_VIEWPORT.width / 2,
  worldCenterY: WORLD_VIEWPORT.height / 2,
  designCenterX: DESIGN_VIEWPORT.width / 2,
  designCenterY: 402,
});

export const WORLD_TO_DESIGN = [
  `translate(${WORLD_FRAME.designCenterX} ${WORLD_FRAME.designCenterY})`,
  `scale(${WORLD_FRAME.scale})`,
  `translate(${-WORLD_FRAME.worldCenterX} ${-WORLD_FRAME.worldCenterY})`,
].join(' ');

export function designToWorld(point) {
  return {
    x: (point.x - WORLD_FRAME.designCenterX) / WORLD_FRAME.scale + WORLD_FRAME.worldCenterX,
    y: (point.y - WORLD_FRAME.designCenterY) / WORLD_FRAME.scale + WORLD_FRAME.worldCenterY,
  };
}

export function clientToDesignPoint(event, node) {
  const rect = node.getBoundingClientRect();
  const scale = Math.min(
    rect.width / DESIGN_VIEWPORT.width,
    rect.height / DESIGN_VIEWPORT.height,
  );
  const offsetX = (rect.width - DESIGN_VIEWPORT.width * scale) / 2;
  const offsetY = (rect.height - DESIGN_VIEWPORT.height * scale) / 2;

  return {
    x: (event.clientX - rect.left - offsetX) / scale,
    y: (event.clientY - rect.top - offsetY) / scale,
  };
}
