import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const stageSource = fs.readFileSync(new URL('../src/components/GraphicDeckStage.jsx', import.meta.url), 'utf8');
const consoleSource = fs.readFileSync(new URL('../src/components/front/ReferenceFrontConsole.jsx', import.meta.url), 'utf8');

test('front console receives one shared transport and A/B cue state', () => {
  for (const prop of ['playing={isPlaying}', 'currentTime={currentTime}', 'duration={duration}', 'repeat={loopEnabled}', 'capture={capture}', 'spaceAmount={spaceAmount}', 'signalStore={signalStore}']) {
    assert.match(stageSource, new RegExp(prop.replace(/[{}]/g, '\\$&')));
  }
  assert.match(stageSource, /data-transport-state=\{transportState\}/);
  assert.match(stageSource, /data-loop-state=\{loopEnabled \? 'armed' : 'idle'\}/);
  assert.match(stageSource, /data-capture-state=\{captureState\}/);
  assert.match(consoleSource, /data-transport-state=\{transportState\}/);
  assert.match(consoleSource, /data-cue-a-state=\{cueA == null \? 'idle' : 'set'\}/);
  assert.match(consoleSource, /data-cue-b-state=\{cueB == null \? 'idle' : 'set'\}/);
  assert.match(consoleSource, /data-return-state=\{returnActive \? 'active' : 'idle'\}/);
});

test('play/pause, A/B cues and return controls are connected to real state owners', () => {
  assert.match(stageSource, /case FRONT_INTENTS\.TRANSPORT_STOP:[\s\S]*?handleStopPlayback\(\)/);
  assert.match(stageSource, /stopAndSilence\(\{ rampMs: 120, resetTime: true \}\)/);
  assert.doesNotMatch(consoleSource, /dataAction=\{FRONT_INTENTS\.TRANSPORT_STOP\}/);
  assert.match(consoleSource, /dataAction=\{FRONT_INTENTS\.TRANSPORT_TOGGLE\}/);
  assert.match(consoleSource, /dataAction=\{FRONT_INTENTS\.MARK_A\}/);
  assert.match(consoleSource, /dataAction=\{FRONT_INTENTS\.MARK_B\}/);
  assert.match(consoleSource, /dataAction=\{FRONT_INTENTS\.RETURN_TO_MARK\}/);
  assert.match(consoleSource, /label=\{returnCueKey === 'B' \? 'Return to B cue' : 'Return to A cue'\}/);
});
