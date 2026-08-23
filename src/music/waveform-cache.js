// The center screen is narrow enough that 96 buckets turn dense music into
// chunky blocks. Keep more temporal detail in the cached envelope and let the
// renderer choose the final display width.
const DEFAULT_SAMPLE_COUNT = 192;
const waveformCache = new Map();
const pendingWaveforms = new Map();
let decoderContext = null;

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

function cacheKey(track, sampleCount) {
  return `${track.id}:${track.audioUrl}:${sampleCount}`;
}

function getDecoderContext() {
  if (decoderContext?.decodeAudioData) return decoderContext;
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  decoderContext = new AudioContextClass();
  return decoderContext;
}

export function registerWaveformDecodeContext(context) {
  if (context?.decodeAudioData) decoderContext = context;
}

function channelPeaks(channel, sampleCount) {
  const peaks = new Array(sampleCount).fill(0);
  if (!channel?.length) return peaks;
  for (let index = 0; index < sampleCount; index += 1) {
    const start = Math.floor((index / sampleCount) * channel.length);
    const end = Math.max(start + 1, Math.floor(((index + 1) / sampleCount) * channel.length));
    const stride = Math.max(1, Math.floor((end - start) / 160));
    let peak = 0;
    let energy = 0;
    let count = 0;
    for (let offset = start; offset < end; offset += stride) {
      const magnitude = Math.abs(channel[offset] || 0);
      peak = Math.max(peak, magnitude);
      energy += magnitude * magnitude;
      count += 1;
    }
    const lastMagnitude = Math.abs(channel[Math.min(end - 1, channel.length - 1)] || 0);
    peak = Math.max(peak, lastMagnitude);
    energy += lastMagnitude * lastMagnitude;
    count += 1;

    // A max-only bucket turns dense music into a solid rectangle. Blend the
    // local RMS envelope with a restrained transient peak instead, so the
    // display still preserves attacks without exaggerating every bucket.
    const rms = Math.sqrt(energy / Math.max(1, count));
    peaks[index] = rms * .78 + peak * .22;
  }
  return peaks;
}

export function buildWaveformPeaks(audioBuffer, sampleCount = DEFAULT_SAMPLE_COUNT) {
  const safeCount = Math.max(8, Math.floor(sampleCount));
  const left = channelPeaks(audioBuffer?.getChannelData?.(0), safeCount);
  const right = channelPeaks(
    audioBuffer?.getChannelData?.(Math.min(1, Math.max(0, (audioBuffer?.numberOfChannels || 1) - 1))),
    safeCount,
  );
  const combined = [...left, ...right].filter((value) => value > 0).sort((a, b) => a - b);
  const peak = combined.at(-1) || 0;
  if (!peak) {
    return {
      left,
      right,
      duration: Number.isFinite(audioBuffer?.duration) ? audioBuffer.duration : 0,
      sampleCount: safeCount,
    };
  }

  // A mastered track often has a high noise floor. Mapping only against the
  // absolute peak makes every bucket look equally loud. Use a restrained
  // percentile window so quieter phrases can breathe without changing the
  // source audio or its playback dynamics.
  const percentile = (ratio) => combined[Math.min(combined.length - 1, Math.floor((combined.length - 1) * ratio))] || 0;
  const floor = percentile(.08);
  const ceiling = Math.max(percentile(.985), floor + Number.EPSILON);
  const scale = 0.94 / (ceiling - floor);
  const toDisplayEnvelope = (value) => {
    const normalized = clamp((value - floor) * scale);
    return clamp(0.94 * Math.pow(normalized, 1.08), 0, 0.94);
  };
  return {
    left: left.map(toDisplayEnvelope),
    right: right.map(toDisplayEnvelope),
    duration: Number.isFinite(audioBuffer?.duration) ? audioBuffer.duration : 0,
    sampleCount: safeCount,
  };
}

export function createWaveformPlaceholder(sampleCount = DEFAULT_SAMPLE_COUNT) {
  const safeCount = Math.max(8, Math.floor(sampleCount));
  return {
    left: new Array(safeCount).fill(0),
    right: new Array(safeCount).fill(0),
    duration: 0,
    sampleCount: safeCount,
  };
}

export function getCachedWaveform(track, sampleCount = DEFAULT_SAMPLE_COUNT) {
  if (!track) return null;
  return waveformCache.get(cacheKey(track, sampleCount)) || null;
}

export async function loadTrackWaveform(track, { sampleCount = DEFAULT_SAMPLE_COUNT } = {}) {
  if (!track?.audioUrl) throw new Error('This cassette has no waveform source.');
  const key = cacheKey(track, sampleCount);
  const cached = waveformCache.get(key);
  if (cached) return cached;
  const pending = pendingWaveforms.get(key);
  if (pending) return pending;

  const request = (async () => {
    const response = await fetch(track.audioUrl, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`Waveform source returned ${response.status}.`);
    const bytes = await response.arrayBuffer();
    const context = getDecoderContext();
    if (!context) throw new Error('This browser cannot decode waveform audio.');
    const decoded = await context.decodeAudioData(bytes.slice(0));
    const waveform = buildWaveformPeaks(decoded, sampleCount);
    waveformCache.set(key, waveform);
    return waveform;
  })();

  pendingWaveforms.set(key, request);
  try {
    return await request;
  } finally {
    if (pendingWaveforms.get(key) === request) pendingWaveforms.delete(key);
  }
}

export function clearWaveformCache() {
  waveformCache.clear();
  pendingWaveforms.clear();
}

export { DEFAULT_SAMPLE_COUNT };
