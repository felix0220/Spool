import assert from 'node:assert/strict';
import test from 'node:test';
import { buildWaveformPeaks, createWaveformPlaceholder } from '../src/music/waveform-cache.js';
import { balanceStereoWaveformForDisplay } from '../src/music/waveform-display.js';
import { getStereoWaveformLaneGeometry } from '../src/music/waveform-render.js';

function fakeAudioBuffer({ left, right = left, duration = 4 }) {
  const channels = [Float32Array.from(left), Float32Array.from(right)];
  return {
    duration,
    numberOfChannels: channels.length,
    getChannelData(index) {
      return channels[index];
    },
  };
}

test('waveform extraction preserves distinct stereo envelopes and duration', () => {
  const waveform = buildWaveformPeaks(fakeAudioBuffer({
    left: [0, .2, -.8, .1, .3, -.15, .55, 0],
    right: [0, .05, -.1, .7, .15, -.45, .2, 0],
  }), 8);
  assert.equal(waveform.left.length, 8);
  assert.equal(waveform.right.length, 8);
  assert.equal(waveform.duration, 4);
  assert.notDeepEqual(waveform.left, waveform.right);
  assert.ok(Math.max(...waveform.left, ...waveform.right) <= .94);
  assert.ok(Math.max(...waveform.left) > Math.max(...waveform.right));
});

test('placeholder has stable geometry without pretending to be a decoded signal', () => {
  const placeholder = createWaveformPlaceholder(96);
  assert.equal(placeholder.left.length, 96);
  assert.equal(placeholder.right.length, 96);
  assert.equal(placeholder.duration, 0);
  assert.equal(Math.max(...placeholder.left), 0);
  assert.equal(Math.max(...placeholder.right), 0);
});

test('stereo waveform centers are the centers of their visible lanes', () => {
  const geometry = getStereoWaveformLaneGeometry({ x: 379, y: 235, width: 630, height: 278 });

  assert.equal(geometry.top.y, 236);
  assert.equal(geometry.top.height, 278 * .45);
  assert.equal(geometry.bottom.y, 235 + 278 * .5 + 278 * .04);
  assert.equal(geometry.bottom.height, 278 * .45);
  assert.equal(geometry.top.baseline, geometry.top.y + geometry.top.height / 2);
  assert.equal(geometry.bottom.baseline, geometry.bottom.y + geometry.bottom.height / 2);
  assert.ok(geometry.top.bottom < geometry.bottom.top, 'L/R lanes need a breathing gap');
});

test('display balancing removes a mastering slope without flattening stereo detail', () => {
  const left = Array.from({ length: 32 }, (_, index) => {
    const macroSlope = .92 - (index / 31) * .62;
    return Math.min(.94, macroSlope + (index % 4 === 0 ? .08 : 0));
  });
  const right = left.map((value, index) => Math.max(0, value * .88 + (index % 5 === 0 ? .06 : 0)));
  const [balancedLeft, balancedRight] = balanceStereoWaveformForDisplay(left, right);
  const firstBand = balancedLeft.slice(0, 8).reduce((sum, value) => sum + value, 0) / 8;
  const lastBand = balancedLeft.slice(-8).reduce((sum, value) => sum + value, 0) / 8;

  assert.ok(lastBand / firstBand > .76, 'the display should not collapse into a long triangular fade');
  assert.notDeepEqual(balancedLeft, balancedRight, 'stereo channels must remain visually distinct');
  assert.ok(Math.max(...balancedLeft, ...balancedRight) <= .94);
  assert.ok(Math.max(...balancedLeft) - Math.min(...balancedLeft) > .12, 'local peaks must remain legible');
});

test('display balancing keeps a very quiet tail from collapsing into a pointed wedge', () => {
  const left = Array.from({ length: 48 }, (_, index) => {
    if (index < 24) return .78 + (index % 5) * .03;
    return .035 + (index % 5) * .012;
  });
  const right = left.map((value, index) => value * .9 + (index % 3 === 0 ? .01 : 0));
  const [balancedLeft] = balanceStereoWaveformForDisplay(left, right);
  const firstBand = balancedLeft.slice(0, 12).reduce((sum, value) => sum + value, 0) / 12;
  const lastBand = balancedLeft.slice(-12).reduce((sum, value) => sum + value, 0) / 12;

  assert.ok(lastBand / firstBand > .72, 'quiet tails must keep a continuous waveform body');
});
