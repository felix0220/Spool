export const AUDIO_LOAD_STATUS = Object.freeze({
  IDLE: 'idle',
  LOADING: 'loading',
  READY: 'ready',
  TOO_SHORT: 'too-short',
  ERROR: 'error',
});

export const MINIMUM_AUDIO_DURATION = 60;

export function isAudioDurationEligible(duration, minimum = MINIMUM_AUDIO_DURATION) {
  return Number.isFinite(duration) && duration >= minimum;
}

export function describeTooShortAudio(duration, minimum = MINIMUM_AUDIO_DURATION) {
  const actual = Number.isFinite(duration) ? duration.toFixed(1) : 'unknown';
  return `This cassette is ${actual}s long. Use a source at least ${minimum}s long.`;
}

export function createLoadRequestGuard() {
  let latestRequestId = 0;
  return {
    begin() {
      latestRequestId += 1;
      return latestRequestId;
    },
    invalidate() {
      latestRequestId += 1;
      return latestRequestId;
    },
    isCurrent(requestId) {
      return requestId === latestRequestId;
    },
  };
}

export function resolveAudioSource({ builtInSource = null, uploadSource = null } = {}) {
  if (uploadSource?.url) return { ...uploadSource, kind: 'upload' };
  if (builtInSource?.url) return { ...builtInSource, kind: 'builtin' };
  return null;
}

export function describeMediaError(mediaError) {
  switch (mediaError?.code) {
    case 1:
      return 'Audio loading was interrupted. Eject and try again.';
    case 2:
      return 'The audio file could not be reached. Eject and try again.';
    case 3:
      return 'The audio file could not be decoded. Eject and try again.';
    case 4:
      return 'The audio file is missing or uses an unsupported format. Eject and try again.';
    default:
      return 'The cassette could not be read. Eject and try again.';
  }
}

export function describeAudioFailure(stage, error) {
  if (stage === 'context-resume') return 'Audio output could not start. Try Play again.';
  if (stage === 'playback') return 'Playback was blocked. Try Play again.';
  if (stage === 'source-load') return describeMediaError(error);
  return 'The cassette could not be read. Eject and try again.';
}
