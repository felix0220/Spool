import { DESIGN_VIEWPORT, designToWorld, WORLD_FRAME } from '../../design-viewport.js';

// Task 01 geometry contract: the front console is authored in the same
// 1420 × 1108 design space as the product stage. The renderer may convert this
// space to the existing 1280 × 720 world, but no component is allowed to
// invent a second front-body coordinate system.
export const FRONT_VIEWBOX = DESIGN_VIEWPORT;

const worldLength = (value) => value / WORLD_FRAME.scale;
const worldPoint = (x, y) => designToWorld({ x, y });

// Mark / Return are intentionally smaller than the Play Dial. Their complete
// visible bottom edge is aligned to the Play Dial's actual halo, not to the
// abstract size box used by the semantic hit area.
export const PLAY_DIAL_SCALE = 1.3;
export const PLAY_DIAL_SIZE = 92 * PLAY_DIAL_SCALE;
export const SECONDARY_TOGGLE_SIZE = 56;
export const EJECT_WIDTH = SECONDARY_TOGGLE_SIZE;
export const EJECT_HEIGHT = SECONDARY_TOGGLE_SIZE * 1.5;
export const EJECT_SIDEWALL_OFFSET_Y = 1.75;
export const EJECT_SIDEWALL_BOTTOM_GAP = 2.25;
export const EJECT_SIDEWALL_HEIGHT = EJECT_HEIGHT - EJECT_SIDEWALL_OFFSET_Y - EJECT_SIDEWALL_BOTTOM_GAP;
export const PLAY_DIAL_RADIUS_FACTOR = .38;
export const PLAY_DIAL_HALO_FACTOR = 1.135;
export const TOGGLE_SIDEWALL_OFFSET_Y = 2.75;
const PLAY_DIAL_CENTER_Y = 758;
const PLAY_DIAL_BOTTOM = PLAY_DIAL_CENTER_Y
  + PLAY_DIAL_SIZE * PLAY_DIAL_RADIUS_FACTOR * PLAY_DIAL_HALO_FACTOR;
const SECONDARY_TOGGLE_CENTER_Y = PLAY_DIAL_BOTTOM
  - SECONDARY_TOGGLE_SIZE / 2
  - TOGGLE_SIDEWALL_OFFSET_Y;
const SECONDARY_TOGGLE_BOTTOM_OFFSET = SECONDARY_TOGGLE_SIZE / 2 + TOGGLE_SIDEWALL_OFFSET_Y;
const EJECT_SIDEWALL_BOTTOM_OFFSET = EJECT_HEIGHT / 2 - EJECT_SIDEWALL_BOTTOM_GAP;
const EJECT_CENTER_Y = SECONDARY_TOGGLE_CENTER_Y
  + SECONDARY_TOGGLE_BOTTOM_OFFSET
  - EJECT_SIDEWALL_BOTTOM_OFFSET;

const worldRect = ({ x, y, width, height, radius = 0 }) => {
  const point = worldPoint(x, y);
  return {
    x: point.x,
    y: point.y,
    width: worldLength(width),
    height: worldLength(height),
    radius: worldLength(radius),
  };
};

const worldCircle = ({ x, y, radius }) => {
  const point = worldPoint(x, y);
  return { x: point.x, y: point.y, radius: worldLength(radius) };
};

export const FRONT_LAYOUT_DESIGN = Object.freeze({
  chassis: { x: 111, y: 81, width: 1200, height: 812, radius: 15 },
  inner: { x: 142, y: 132, width: 1139, height: 708, radius: 13 },
  upper: { x: 143, y: 132, width: 1138, height: 466, radius: 12 },
  lower: { x: 142, y: 612, width: 1140, height: 228, radius: 14 },
  // The upper screen follows the supplied reference's 18 / 58 / 19 column
  // rhythm while staying inside the existing 1420 × 1108 product body.
  leftRail: { x: 156, y: 153, width: 195, height: 425, radius: 9 },
  waveform: { x: 363, y: 153, width: 632, height: 418, radius: 0 },
  // The transport rail follows the supplied screen HTML: a compact 418px
  // column with its own breathing room below the deck, rather than a full-
  // height telemetry card.
  rightRail: { x: 1042, y: 153, width: 220, height: 418, radius: 10 },
  // The plot and timeline share one x-domain. This keeps the playhead,
  // capture bounds, waveform, and seek rail on the same time coordinate.
  waveformPlot: { x: 379, y: 239, width: 600, height: 266, radius: 0 },
  // The seek rail uses the exact same inset domain as the rendered waveform.
  // Keeping this in geometry prevents the playhead from drifting away from
  // the played/unplayed boundary when the plot has a quiet label gutter.
  waveformTimeline: { x: 379, y: 521, width: 600 },
  meter: { x: 1064, y: 180, width: 176, height: 132 },
  rateKnob: { x: 1152, y: 426, radius: 58 },
  grille: { x: 1057, y: 522, width: 190, height: 61 },
  volumeSlider: { x: 750, trackY: 656, width: 240, thumbWidth: 68, labelY: 630 },
  status: { x: 1058, playingY: 363, markY: 386, returnY: 409 },
  knobs: {
    tone: { x: 220, y: 725, radius: 50 },
    space: { x: 355, y: 725, radius: 50 },
    texture: { x: 490, y: 725, radius: 50 },
  },
  shuttle: { x: 1000, trackY: 656, width: 240, thumbWidth: 68, labelY: 630 },
  transport: {
    play: { x: 700, y: PLAY_DIAL_CENTER_Y, size: PLAY_DIAL_SIZE },
    cueA: { x: 830, y: SECONDARY_TOGGLE_CENTER_Y, size: SECONDARY_TOGGLE_SIZE },
    cueB: { x: 936, y: SECONDARY_TOGGLE_CENTER_Y, size: SECONDARY_TOGGLE_SIZE },
    return: { x: 1042, y: SECONDARY_TOGGLE_CENTER_Y, size: SECONDARY_TOGGLE_SIZE },
    eject: { x: 1216, y: EJECT_CENTER_Y, width: EJECT_WIDTH, height: EJECT_HEIGHT },
  },
  separators: [610, 1130],
  screwCenters: [[143, 110], [1280, 110], [143, 862], [1280, 862]],
});

export const FRONT_BODY_CONTRACT = Object.freeze({
  viewport: FRONT_VIEWBOX,
  chassis: FRONT_LAYOUT_DESIGN.chassis,
  screenZone: FRONT_LAYOUT_DESIGN.upper,
  controlZone: FRONT_LAYOUT_DESIGN.lower,
  shellInner: FRONT_LAYOUT_DESIGN.inner,
  screws: FRONT_LAYOUT_DESIGN.screwCenters,
});

export const FRONT_GEOMETRY = Object.freeze({
  chassis: {
    ...worldRect(FRONT_LAYOUT_DESIGN.chassis),
    inner: worldRect(FRONT_LAYOUT_DESIGN.inner),
  },
  inner: worldRect(FRONT_LAYOUT_DESIGN.inner),
  upper: worldRect(FRONT_LAYOUT_DESIGN.upper),
  lower: worldRect(FRONT_LAYOUT_DESIGN.lower),
  leftRail: worldRect(FRONT_LAYOUT_DESIGN.leftRail),
  waveform: worldRect(FRONT_LAYOUT_DESIGN.waveform),
  rightRail: worldRect(FRONT_LAYOUT_DESIGN.rightRail),
  waveformPlot: worldRect(FRONT_LAYOUT_DESIGN.waveformPlot),
  waveformTimeline: {
    ...worldPoint(FRONT_LAYOUT_DESIGN.waveformTimeline.x, FRONT_LAYOUT_DESIGN.waveformTimeline.y),
    width: worldLength(FRONT_LAYOUT_DESIGN.waveformTimeline.width),
  },
  meter: worldRect(FRONT_LAYOUT_DESIGN.meter),
  rateKnob: worldCircle(FRONT_LAYOUT_DESIGN.rateKnob),
  grille: worldRect(FRONT_LAYOUT_DESIGN.grille),
  volumeSlider: {
    x: worldPoint(FRONT_LAYOUT_DESIGN.volumeSlider.x, 0).x,
    trackY: worldPoint(0, FRONT_LAYOUT_DESIGN.volumeSlider.trackY).y,
    width: worldLength(FRONT_LAYOUT_DESIGN.volumeSlider.width),
    thumbWidth: worldLength(FRONT_LAYOUT_DESIGN.volumeSlider.thumbWidth),
    labelY: worldPoint(0, FRONT_LAYOUT_DESIGN.volumeSlider.labelY).y,
  },
  status: {
    x: worldPoint(FRONT_LAYOUT_DESIGN.status.x, 0).x,
    playingY: worldPoint(0, FRONT_LAYOUT_DESIGN.status.playingY).y,
    markY: worldPoint(0, FRONT_LAYOUT_DESIGN.status.markY).y,
    returnY: worldPoint(0, FRONT_LAYOUT_DESIGN.status.returnY).y,
  },
  knobs: Object.fromEntries(
    Object.entries(FRONT_LAYOUT_DESIGN.knobs).map(([key, value]) => [key, worldCircle(value)]),
  ),
  shuttle: {
    x: worldPoint(FRONT_LAYOUT_DESIGN.shuttle.x, 0).x,
    trackY: worldPoint(0, FRONT_LAYOUT_DESIGN.shuttle.trackY).y,
    width: worldLength(FRONT_LAYOUT_DESIGN.shuttle.width),
    thumbWidth: worldLength(FRONT_LAYOUT_DESIGN.shuttle.thumbWidth),
    labelY: worldPoint(0, FRONT_LAYOUT_DESIGN.shuttle.labelY).y,
  },
  transport: Object.fromEntries(
    Object.entries(FRONT_LAYOUT_DESIGN.transport).map(([key, value]) => {
      const point = worldPoint(value.x, value.y);
      const dimensions = value.size != null
        ? { size: worldLength(value.size) }
        : { width: worldLength(value.width), height: worldLength(value.height) };
      return [key, { ...point, ...dimensions }];
    }),
  ),
  separators: FRONT_LAYOUT_DESIGN.separators.map((x) => worldPoint(x, 0).x),
  screwCenters: FRONT_LAYOUT_DESIGN.screwCenters.map(([x, y]) => {
    const point = worldPoint(x, y);
    return [point.x, point.y];
  }),
});

export const FRONT_COLORS = Object.freeze({
  body: '#D8D7CF',
  bodyHi: '#EEEDE6',
  bodyShadow: '#B9B9B2',
  seam: '#A5A6A0',
  ink: '#151719',
  inkDeep: '#0A0C0E',
  panel: '#1B1F22',
  panelLine: '#4B4E50',
  panelRule: '#3A3E41',
  paper: '#E7E5DC',
  cream: '#F2F0E7',
  muted: '#8A8D89',
  dim: '#3E3E3A',
  blue: '#5578D0',
  ochre: '#B5844A',
  amber: '#C87F2E',
  orange: '#F15B2A',
  green: '#6CA26F',
});

export function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function ratioFromTime(time, duration) {
  return clamp(duration > 0 ? time / duration : 0);
}

export function knobAngle(value, min = 0, max = 1) {
  return -135 + clamp((value - min) / (max - min || 1)) * 270;
}

export function pointOnKnob(cx, cy, radius, angle) {
  const radians = (angle * Math.PI) / 180;
  return [cx + Math.cos(radians) * radius, cy + Math.sin(radians) * radius];
}
