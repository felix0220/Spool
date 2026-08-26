import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  TONE_MAX_ANGLE,
  TONE_MIN_ANGLE,
  toneAngle,
  toneArcPath,
  tonePoint,
} from '../src/components/front/tone-dial-geometry.js';

test('Tone maps the shared value to the two open-arc endpoints', () => {
  assert.equal(toneAngle(0), 135);
  assert.equal(toneAngle(1), 405);
  assert.equal(toneAngle(.5), 270);
  assert.equal(TONE_MIN_ANGLE, 135);
  assert.equal(TONE_MAX_ANGLE, 405);
});

test('Tone progress arc ends at the value marker angle', () => {
  const angle = toneAngle(.73);
  const [x, y] = tonePoint(100, 100, 40, angle);
  const path = toneArcPath(100, 100, 40, TONE_MIN_ANGLE, angle);
  assert.match(path, new RegExp(`${x.toFixed(2)} ${y.toFixed(2)}$`));
});

test('Tone marker travels from the lower-left to the lower-right', () => {
  const [startX, startY] = tonePoint(100, 100, 40, toneAngle(0));
  const [endX, endY] = tonePoint(100, 100, 40, toneAngle(1));
  assert.ok(startX < endX);
  assert.equal(startY.toFixed(2), endY.toFixed(2));
  assert.ok(startY > 100);
});

test('Tone keeps a persistent gray track and reveals its orange progress after input', () => {
  const source = fs.readFileSync(new URL('../src/components/front/ToneDial.jsx', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('../src/front-reference.css', import.meta.url), 'utf8');
  assert.match(source, /data-control-kind=\{controlKind\}/);
  assert.match(source, /nextValueFromWheel/);
  assert.match(source, /label = 'Tone'/);
  assert.match(source, /aria-label=\{label\}/);
  assert.match(source, /data-value-feedback=\{hasValueFeedback \? 'visible' : 'hidden'\}/);
  assert.match(source, /tone-dial-progress/);
  assert.match(source, /data-progress-visible=\{normalizedValue > 0 \? 'visible' : 'hidden'\}/);
  assert.doesNotMatch(source, /data-progress-visible=\{controlKind === 'tone-dial'/);
  assert.match(css, /\.reference-front__tone-dial-track\s*\{[\s\S]*stroke:\s*#b7b7b0/);
  assert.match(css, /\.reference-front__tone-dial-progress\s*\{[\s\S]*stroke:\s*var\(--dial-accent, var\(--front-orange\)\)/);
  assert.match(css, /\.reference-front__tone-dial\[data-progress-visible='visible'\] \.reference-front__tone-dial-progress/);
  assert.match(css, /\.reference-front__tone-dial-indicator\s*\{[\s\S]*opacity:\s*1/);
  assert.doesNotMatch(source, /tone-dial-active/);
  assert.doesNotMatch(css, /tone-dial-active/);
  assert.doesNotMatch(css, /\.reference-front__tone-dial[^\n{]*\{[^}]*transform:/s);
});

test('Tone starts neutral before the first cassette insertion', () => {
  const source = fs.readFileSync(new URL('../src/components/GraphicDeckStage.jsx', import.meta.url), 'utf8');
  assert.match(source, /const \[toneCutoff, setToneCutoff\] = useState\(400\)/);
  assert.match(source, /const \[spaceAmount, setSpaceAmount\] = useState\(0\)/);
  assert.match(source, /const \[textureAmount, setTextureAmount\] = useState\(0\)/);
  assert.match(source, /setToneCutoff\(tapeVariation\.toneCutoff\)/);
});

test('Tone marker is positioned on the knob face, not on the outer track', () => {
  const source = fs.readFileSync(new URL('../src/components/front/ToneDial.jsx', import.meta.url), 'utf8');
  assert.match(source, /const indicatorRadius = bodyRadius \* 0\.58/);
  assert.match(source, /tonePoint\(cx, cy, indicatorRadius, angle\)/);
});

test('Tone wheel input is additive and does not change the shared wheel helper', () => {
  const source = fs.readFileSync(new URL('../src/components/front/ToneDial.jsx', import.meta.url), 'utf8');
  assert.match(source, /deltaY:\s*-event\.deltaY/);
  assert.match(source, /positive wheel delta[\s\S]*raises Tone/);
});

test('Tone audio starts neutral and adds a high-shelf lift as the value rises', () => {
  const source = fs.readFileSync(new URL('../src/music/useAudioProcessing.js', import.meta.url), 'utf8');
  assert.match(source, /toneCutoff = 400/);
  assert.match(source, /filter\.type = 'highshelf'/);
  assert.match(source, /filter\.gain\.setTargetAtTime\(toneValue \* 16/);
  assert.doesNotMatch(source, /filter\.type = 'lowpass'/);
});

test('Space and Texture use the same continuous arc dial with different accent colors', () => {
  const source = fs.readFileSync(new URL('../src/components/front/ReferenceFrontConsole.jsx', import.meta.url), 'utf8');
  assert.match(source, /controlKind="space-dial"[\s\S]*accent=\{C\.blue\}/);
  assert.match(source, /accent=\{C\.ochre\}[\s\S]*controlKind="texture-dial"/);
  assert.doesNotMatch(source, /loopLength|WET \{|SEC ·/);
});
