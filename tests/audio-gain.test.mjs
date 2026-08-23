import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OUTPUT_GAIN_TIME_CONSTANT,
  clampGain,
  scheduleGainRamp,
  scheduleGainTarget,
} from '../src/music/audio-gain.js';

function mockParameter(value = 0.78) {
  const calls = [];
  return {
    value,
    calls,
    cancelScheduledValues(time) { calls.push(['cancel', time]); },
    setTargetAtTime(target, time, constant) { calls.push(['target', target, time, constant]); },
    setValueAtTime(target, time) { calls.push(['value', target, time]); },
    linearRampToValueAtTime(target, time) { calls.push(['ramp', target, time]); },
  };
}

test('persistent volume uses a smoothed GainNode target', () => {
  const parameter = mockParameter();
  scheduleGainTarget(parameter, 0.42, 3.5);
  assert.deepEqual(parameter.calls, [
    ['cancel', 3.5],
    ['target', 0.42, 3.5, OUTPUT_GAIN_TIME_CONSTANT],
  ]);
});

test('source and eject fades use a separate short gain ramp', () => {
  const parameter = mockParameter(0.78);
  scheduleGainRamp(parameter, 0, 4, 120);
  assert.deepEqual(parameter.calls, [
    ['cancel', 4],
    ['value', 0.78, 4],
    ['ramp', 0, 4.12],
  ]);
});

test('gain values are clamped to the safe output range', () => {
  assert.equal(clampGain(-2), 0);
  assert.equal(clampGain(2), 1);
  assert.equal(clampGain(0.64), 0.64);
});
