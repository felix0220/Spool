export const FRONT_INTENTS = Object.freeze({
  TRANSPORT_STOP: 'transport.stop',
  TRANSPORT_TOGGLE: 'transport.toggle',
  MARK_A: 'transport.mark-a',
  MARK_B: 'transport.mark-b',
  RETURN_TO_MARK: 'transport.return',
  CAPTURE_COMMIT: 'capture.commit',
  MACHINE_EJECT: 'machine.eject',
});

export const FRONT_INTENT_SOURCES = Object.freeze({
  POINTER: 'pointer',
  KEYBOARD: 'keyboard',
  PROGRAM: 'program',
});

const VALID_INTENTS = new Set(Object.values(FRONT_INTENTS));
const VALID_SOURCES = new Set(Object.values(FRONT_INTENT_SOURCES));

export function createFrontIntent(type, source = FRONT_INTENT_SOURCES.PROGRAM) {
  if (!VALID_INTENTS.has(type)) throw new TypeError(`Unknown front intent: ${type}`);
  if (!VALID_SOURCES.has(source)) throw new TypeError(`Unknown front intent source: ${source}`);
  return Object.freeze({ type, source });
}

export function hasValidCaptureRegion(region) {
  const start = Number(region?.start);
  const end = Number(region?.end);
  return Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end > start;
}

export function hasValidMarkPoint(markTime) {
  return Number.isFinite(Number(markTime)) && Number(markTime) >= 0;
}

/**
 * Pure allowed/blocked contract for the machine-facing intents.
 * UI controls can ask this function for permission, but the parent state
 * owner remains responsible for carrying out the intent.
 */
export function getFrontIntentState(intentOrType, state = {}) {
  const type = typeof intentOrType === 'string' ? intentOrType : intentOrType?.type;
  const controlsReady = Boolean(state.controlsReady);
  const phase = state.phase;

  switch (type) {
    case FRONT_INTENTS.TRANSPORT_STOP:
    case FRONT_INTENTS.TRANSPORT_TOGGLE:
      return controlsReady
        ? { allowed: true, reason: 'active-source-ready' }
        : { allowed: false, reason: 'active-source-not-ready' };
    case FRONT_INTENTS.MARK_A:
    case FRONT_INTENTS.MARK_B:
      return controlsReady
        ? { allowed: true, reason: 'active-source-ready' }
        : { allowed: false, reason: 'active-source-not-ready' };
    case FRONT_INTENTS.RETURN_TO_MARK:
      return controlsReady && hasValidMarkPoint(state.markTime)
        ? { allowed: true, reason: 'mark-point-ready' }
        : { allowed: false, reason: !controlsReady ? 'active-source-not-ready' : 'no-mark-point' };
    case FRONT_INTENTS.CAPTURE_COMMIT:
      return controlsReady && hasValidCaptureRegion(state.capture)
        ? { allowed: true, reason: 'capture-region-ready' }
        : { allowed: false, reason: !controlsReady ? 'active-source-not-ready' : 'no-valid-capture-region' };
    case FRONT_INTENTS.MACHINE_EJECT:
      return phase === 'engaged'
        ? { allowed: true, reason: 'loaded-source-ready' }
        : { allowed: false, reason: 'machine-not-engaged' };
    default:
      return { allowed: false, reason: 'unknown-intent' };
  }
}

export function canDispatchFrontIntent(intentOrType, state = {}) {
  return getFrontIntentState(intentOrType, state).allowed;
}
