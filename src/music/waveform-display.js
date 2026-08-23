const DISPLAY_MAX = 0.94;
// Keep a visible body in quiet phrases. The floor is intentionally above the
// waveform baseline: a music display needs to read as a continuous signal,
// not as a long triangular taper caused by one track's mastering envelope.
const DISPLAY_FLOOR = 0.18;
const DISPLAY_CURVE = 0.82;
const STRONG_SLOPE_FLOOR = 0.2;
const STRONG_SLOPE_CURVE = 0.86;

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function toFiniteSample(value) {
  return Number.isFinite(Number(value)) ? clamp(Number(value)) : 0;
}

function resample(samples, count) {
  const source = Array.isArray(samples) || ArrayBuffer.isView(samples) ? Array.from(samples, toFiniteSample) : [];
  if (count === 0) return [];
  if (source.length === 0) return Array.from({ length: count }, () => 0);
  if (source.length === count) return source;
  if (source.length === 1) return Array.from({ length: count }, () => source[0]);

  return Array.from({ length: count }, (_, index) => {
    const position = (index / (count - 1)) * (source.length - 1);
    const lower = Math.floor(position);
    const upper = Math.min(source.length - 1, lower + 1);
    const fraction = position - lower;
    return source[lower] + (source[upper] - source[lower]) * fraction;
  });
}

function percentile(values, ratio) {
  const sorted = [...values].sort((left, right) => left - right);
  if (!sorted.length) return 0;
  const position = clamp(ratio) * (sorted.length - 1);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function smoothSamples(samples, radius) {
  if (samples.length < 3 || radius < 1) return [...samples];
  return samples.map((_, index) => {
    let weightedTotal = 0;
    let weightTotal = 0;
    const start = Math.max(0, index - radius);
    const end = Math.min(samples.length - 1, index + radius);
    for (let cursor = start; cursor <= end; cursor += 1) {
      const weight = radius + 1 - Math.abs(cursor - index);
      weightedTotal += samples[cursor] * weight;
      weightTotal += weight;
    }
    return weightedTotal / Math.max(1, weightTotal);
  });
}

/**
 * Rebalances only the visual envelope used by the waveform.
 *
 * Some mastered tracks have a long fade or loudness ramp. Drawing that raw
 * envelope at full height makes the UI read as a large triangle, hiding the
 * local rhythm. This applies a smooth, coupled stereo gain per time region so
 * a quiet phrase still has a readable body while the original decoded audio
 * remains untouched. Regional references are interpolated, so the display
 * never jumps at an artificial bucket boundary.
 */
export function balanceStereoWaveformForDisplay(leftSamples, rightSamples, { forceLocalNormalization = false } = {}) {
  const count = Math.max(leftSamples?.length ?? 0, rightSamples?.length ?? 0);
  if (count === 0) return [[], []];

  const left = resample(leftSamples, count);
  const right = resample(rightSamples, count);
  const guide = left.map((sample, index) => Math.max(sample, right[index]));
  const guidePeak = Math.max(...guide);
  if (guidePeak <= 0) return [left.map(() => 0), right.map(() => 0)];

  const regionCount = Math.max(6, Math.min(10, Math.round(Math.sqrt(count))));
  const regionReferences = Array.from({ length: regionCount }, (_, regionIndex) => {
    const start = Math.floor((regionIndex / regionCount) * count);
    const end = Math.max(start + 1, Math.floor(((regionIndex + 1) / regionCount) * count));
    return percentile(guide.slice(start, end), 0.72);
  });
  const target = Math.max(...regionReferences) * 0.92;
  const firstReference = regionReferences.slice(0, 2).reduce((sum, value) => sum + value, 0) / 2;
  const lastReference = regionReferences.slice(-2).reduce((sum, value) => sum + value, 0) / 2;
  const broadEnvelopeRatio = Math.min(firstReference, lastReference)
    / Math.max(firstReference, lastReference, 0.035);
  // Only tracks with a genuinely long mastering slope get the stronger
  // compression. A normal track keeps its local contrast; the affected
  // track gets a continuous body instead of two straight diagonal edges.
  const displayFloor = broadEnvelopeRatio < 0.62 ? STRONG_SLOPE_FLOOR : DISPLAY_FLOOR;
  const displayCurve = broadEnvelopeRatio < 0.62 ? STRONG_SLOPE_CURVE : DISPLAY_CURVE;
  const hasLongMasteringSlope = forceLocalNormalization || broadEnvelopeRatio < 0.72;

  // Use one continuous, low-frequency envelope for a broad fade. The old
  // region-by-region min/max remap made every bucket fight its neighbour and
  // produced the same triangular “cut” the display is trying to remove. A
  // rolling envelope changes only the slow trend, so the local waveform keeps
  // its natural peaks, quiet phrases and stereo relationship.
  const trendWindow = Math.max(5, Math.round(count * 0.08));
  const slowEnvelope = smoothSamples(guide, trendWindow);
  const trendTarget = Math.max(percentile(slowEnvelope, 0.7), 0.08);
  const gainAt = (index) => {
    const position = (index / Math.max(1, count - 1)) * (regionCount - 1);
    const lower = Math.floor(position);
    const upper = Math.min(regionCount - 1, lower + 1);
    const fraction = position - lower;
    const lowerGain = target / Math.max(regionReferences[lower], 0.035);
    const upperGain = target / Math.max(regionReferences[upper], 0.035);
    return lowerGain + (upperGain - lowerGain) * fraction;
  };
  const trendGainAt = (index) => {
    if (!hasLongMasteringSlope) return gainAt(index);
    const rawGain = trendTarget / Math.max(slowEnvelope[index], 0.06);
    return clamp(rawGain, 0.72, forceLocalNormalization ? 2.3 : 1.8);
  };
  const detrendedGuide = guide.map((sample, index) => sample * trendGainAt(index));
  const detrendedCeiling = Math.max(percentile(detrendedGuide, 0.985), 0.32);

  const balance = (samples) => samples.map((sample, index) => {
    const adjusted = sample * trendGainAt(index);
    // The floor prevents the rendered body from collapsing to a pointed
    // wedge, while the clamp keeps louder attacks inside the lane.
    const normalized = clamp(adjusted / (hasLongMasteringSlope ? detrendedCeiling : DISPLAY_MAX));
    return displayFloor + (DISPLAY_MAX - displayFloor) * Math.pow(normalized, displayCurve);
  });

  const balancedLeft = balance(left);
  const balancedRight = balance(right);
  const balancedGuide = balancedLeft.map((sample, index) => Math.max(sample, balancedRight[index]));
  const trendBand = Math.max(4, Math.floor(count * 0.12));
  const startLevel = average(balancedGuide.slice(0, trendBand));
  const endLevel = average(balancedGuide.slice(-trendBand));
  const minimumEndLevel = startLevel * 0.78;
  const endLift = Math.max(0, minimumEndLevel - endLevel);

  // A local gain alone can still leave a long mastering fade visible as two
  // diagonal edges. Lift only that slow trend, with a smoothstep so the
  // actual attacks and stereo differences remain intact. This is display-only
  // equalisation; the decoded samples and playback dynamics are untouched.
  if (endLift <= 0) return [balancedLeft, balancedRight];
  const flattenTrend = (samples) => samples.map((sample, index) => {
    const position = index / Math.max(1, count - 1);
    const easedPosition = position * position * (3 - 2 * position);
    return clamp(sample + endLift * easedPosition, 0, DISPLAY_MAX);
  });

  return [flattenTrend(balancedLeft), flattenTrend(balancedRight)];
}
