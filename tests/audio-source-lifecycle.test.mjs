import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AUDIO_LOAD_STATUS,
  MINIMUM_AUDIO_DURATION,
  createLoadRequestGuard,
  describeAudioFailure,
  describeMediaError,
  describeTooShortAudio,
  isAudioDurationEligible,
  resolveAudioSource,
} from '../src/music/audio-source-lifecycle.js';

test('load request guard invalidates every older source attempt', () => {
  const guard = createLoadRequestGuard();
  const first = guard.begin();
  const second = guard.begin();

  assert.equal(guard.isCurrent(first), false);
  assert.equal(guard.isCurrent(second), true);
  guard.invalidate();
  assert.equal(guard.isCurrent(second), false);
});

test('built-in tracks remain direct public URLs and uploads stay isolated', () => {
  const builtIn = resolveAudioSource({
    builtInSource: { id: 'night-soul', url: '/audio/night-soul.mp3', name: 'Night Soul' },
  });
  assert.deepEqual(builtIn, {
    id: 'night-soul',
    url: '/audio/night-soul.mp3',
    name: 'Night Soul',
    kind: 'builtin',
  });
  assert.equal(builtIn.url.startsWith('blob:'), false);

  const upload = resolveAudioSource({
    builtInSource: builtIn,
    uploadSource: { id: 'upload:1', url: 'blob:test-upload', name: 'voice.wav' },
  });
  assert.equal(upload.kind, 'upload');
  assert.equal(upload.id, 'upload:1');
  assert.equal(upload.url, 'blob:test-upload');
});

test('missing, decode and playback failures have distinct recoverable messages', () => {
  assert.match(describeMediaError({ code: 2 }), /could not be reached/i);
  assert.match(describeMediaError({ code: 3 }), /could not be decoded/i);
  assert.match(describeMediaError({ code: 4 }), /missing or uses an unsupported format/i);
  assert.match(describeAudioFailure('playback', new Error('blocked')), /try play again/i);
  assert.match(describeAudioFailure('context-resume', new Error('suspended')), /try play again/i);
});

test('audio load states are explicit and exhaustive for the session contract', () => {
  assert.deepEqual(Object.values(AUDIO_LOAD_STATUS), ['idle', 'loading', 'ready', 'too-short', 'error']);
});

test('short audio cannot pass the duration gate or pretend to be ready', () => {
  assert.equal(MINIMUM_AUDIO_DURATION, 60);
  assert.equal(isAudioDurationEligible(59.999), false);
  assert.equal(isAudioDurationEligible(60), true);
  assert.match(describeTooShortAudio(9.056621), /9\.1s long.*60s long/);
});
