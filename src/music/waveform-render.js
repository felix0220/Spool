const DEFAULT_LANE_HEIGHT_RATIO = 0.45;
const DEFAULT_TOP_INSET = 1;
const DEFAULT_BOTTOM_OFFSET_RATIO = 0.04;

function safeSamples(samples) {
  if (Array.isArray(samples) || ArrayBuffer.isView(samples)) {
    const values = Array.from(samples, (sample) => Number.isFinite(Number(sample))
      ? Math.max(0, Math.min(1, Number(sample)))
      : 0);
    if (values.length > 1) return values;
  }
  return [0, 0];
}

function fadeWaveformEdges(values) {
  const faded = values.slice();
  const lastIndex = faded.length - 1;
  const fadeLength = Math.max(2, Math.round(lastIndex * 0.015));
  for (let index = 0; index < fadeLength; index += 1) {
    const ratio = index / fadeLength;
    faded[index] *= ratio;
    faded[lastIndex - index] *= ratio;
  }
  return faded;
}

/**
 * One source of truth for the visible L/R rectangles and their baselines.
 * The waveform body must be centered inside these rectangles, not inside a
 * second set of percentage coordinates invented by the path renderer.
 */
export function getStereoWaveformLaneGeometry({
  x,
  y,
  width,
  height,
  laneHeightRatio = DEFAULT_LANE_HEIGHT_RATIO,
  topInset = DEFAULT_TOP_INSET,
  bottomOffsetRatio = DEFAULT_BOTTOM_OFFSET_RATIO,
} = {}) {
  const laneHeight = height * laneHeightRatio;
  const dividerY = y + height * 0.5;
  const top = {
    x: x + topInset,
    y: y + topInset,
    width: width - topInset * 2,
    height: laneHeight,
  };
  const bottom = {
    x: x + topInset,
    y: dividerY + height * bottomOffsetRatio,
    width: width - topInset * 2,
    height: laneHeight,
  };

  return {
    dividerY,
    top: { ...top, top: top.y, baseline: top.y + top.height / 2, bottom: top.y + top.height },
    bottom: { ...bottom, top: bottom.y, baseline: bottom.y + bottom.height / 2, bottom: bottom.y + bottom.height },
  };
}

/**
 * Build a closed stereo-envelope path. Straight segments are intentional:
 * they preserve the sampled peaks and avoid the long control-point curves
 * that can turn a quiet tail into a diagonal triangular mask.
 */
export function buildMirroredWaveformPath(samples, {
  x = 0,
  baseline = 0,
  width = 0,
  amplitude = 0,
} = {}) {
  const values = fadeWaveformEdges(safeSamples(samples));
  const lastIndex = values.length - 1;
  const upper = values.map((sample, index) => {
    const px = x + (index / lastIndex) * width;
    return `${px.toFixed(2)} ${(baseline - sample * amplitude).toFixed(2)}`;
  });
  const lower = values.slice().reverse().map((sample, reverseIndex) => {
    const index = lastIndex - reverseIndex;
    const px = x + (index / lastIndex) * width;
    return `${px.toFixed(2)} ${(baseline + sample * amplitude).toFixed(2)}`;
  });

  return `M${upper.join(' L')} L${lower.join(' L')} Z`;
}
