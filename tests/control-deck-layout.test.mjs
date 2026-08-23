import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const geometry = await import('../src/components/front/front-reference-geometry.js');
const { WORLD_FRAME } = await import('../src/design-viewport.js');
const source = fs.readFileSync(new URL('../src/components/front/ReferenceFrontConsole.jsx', import.meta.url), 'utf8');
const stageSource = fs.readFileSync(new URL('../src/components/GraphicDeckStage.jsx', import.meta.url), 'utf8');

test('control deck keeps the three parameter knobs aligned on one centerline', () => {
  const { tone, space, texture } = geometry.FRONT_LAYOUT_DESIGN.knobs;
  assert.deepEqual([tone.x, space.x, texture.x], [220, 355, 490]);
  assert.deepEqual([tone.y, space.y, texture.y], [725, 725, 725]);
  assert.deepEqual([tone.radius, space.radius, texture.radius], [50, 50, 50]);
  assert.ok(texture.x + texture.radius < geometry.FRONT_LAYOUT_DESIGN.separators[0]);
});

test('the two sliders share a top row above the physical action keys', () => {
  const { volumeSlider, shuttle, transport } = geometry.FRONT_LAYOUT_DESIGN;
  assert.deepEqual(volumeSlider, { x: 750, trackY: 656, width: 240, thumbWidth: 68, labelY: 630 });
  assert.deepEqual(shuttle, { x: 1000, trackY: 656, width: 240, thumbWidth: 68, labelY: 630 });
  assert.equal(shuttle.width, volumeSlider.width);
  assert.equal(shuttle.thumbWidth, volumeSlider.thumbWidth);
  assert.equal(volumeSlider.trackY, shuttle.trackY);
  assert.ok(volumeSlider.x + volumeSlider.width / 2 < shuttle.x - shuttle.width / 2);
  assert.ok(volumeSlider.trackY < transport.play.y);
  assert.ok(shuttle.trackY < transport.play.y);
});

test('transport group contains play/pause, A, B, Q and eject in order', () => {
  const { transport } = geometry.FRONT_LAYOUT_DESIGN;
  const keys = [transport.play, transport.cueA, transport.cueB, transport.return, transport.eject];
  assert.deepEqual(keys.map(({ x }) => x), [700, 830, 936, 1042, 1216]);
  assert.equal(transport.play.size, 92 * geometry.PLAY_DIAL_SCALE);
  assert.deepEqual([transport.cueA.size, transport.cueB.size, transport.return.size, transport.eject.width], [56, 56, 56, 56]);
  assert.equal(transport.eject.height, 84);
  assert.equal(geometry.FRONT_GEOMETRY.transport.eject.width, 56 / WORLD_FRAME.scale);
  assert.equal(geometry.FRONT_GEOMETRY.transport.eject.height, 84 / WORLD_FRAME.scale);
  assert.equal(transport.play.y, 758);
  assert.equal(transport.cueA.y, transport.cueB.y);
  assert.equal(transport.cueB.y, transport.return.y);
  const playOuterBottom = transport.play.y
    + transport.play.size * geometry.PLAY_DIAL_RADIUS_FACTOR * geometry.PLAY_DIAL_HALO_FACTOR;
  const toggleOuterBottom = transport.cueA.y
    + transport.cueA.size / 2 + geometry.TOGGLE_SIDEWALL_OFFSET_Y;
  const ejectOuterBottom = transport.eject.y
    - transport.eject.height / 2
    + geometry.EJECT_SIDEWALL_OFFSET_Y
    + geometry.EJECT_SIDEWALL_HEIGHT;
  assert.ok(Math.abs(playOuterBottom - toggleOuterBottom) <= .1);
  assert.ok(Math.abs(ejectOuterBottom - toggleOuterBottom) <= .1);
  assert.ok(transport.play.x + transport.play.size / 2 < transport.cueA.x - transport.cueA.size / 2);
  assert.ok(transport.cueA.x + transport.cueA.size / 2 < transport.cueB.x - transport.cueB.size / 2);
  assert.ok(transport.cueB.x + transport.cueB.size / 2 < transport.return.x - transport.return.size / 2);
  assert.ok(transport.return.x + transport.return.size / 2 < transport.eject.x - transport.eject.width / 2);
  assert.ok(transport.eject.x + transport.eject.width / 2 <= geometry.FRONT_LAYOUT_DESIGN.lower.x + geometry.FRONT_LAYOUT_DESIGN.lower.width);
  assert.doesNotMatch(source, /icon="stop"/);
  assert.doesNotMatch(source, /Stop active cassette/);
  assert.doesNotMatch(source, /dataAction=\{FRONT_INTENTS\.TRANSPORT_STOP\}/);
  assert.doesNotMatch(source, /icon="mark"|icon="return"|MarkEmbossedIcon|ReturnEmbossedIcon/);
  assert.match(source, /label=\{playing \? 'Pause active cassette' : 'Play active cassette'\}/);
  assert.match(source, /dataAction=\{FRONT_INTENTS\.MARK_A\}/);
  assert.match(source, /dataAction=\{FRONT_INTENTS\.MARK_B\}/);
  assert.match(source, /dataAction=\{FRONT_INTENTS\.RETURN_TO_MARK\}/);
  assert.match(source, /dataAction=\{FRONT_INTENTS\.MACHINE_EJECT\}/);
  assert.equal((source.match(/showLabel=\{false\}/g) ?? []).length, 3);
  assert.match(source, /tone="orange"/);
  assert.match(source, /tone="paper"/);
  assert.match(source, /tone="black"/);
  assert.match(source, /label=\{cueA == null \? 'Set A cue' : 'Clear A cue'\}/);
  assert.match(source, /label=\{cueB == null \? 'Set B cue' : 'Clear B cue'\}/);
  assert.match(source, /label=\{returnCueKey === 'B' \? 'Return to B cue' : 'Return to A cue'\}/);
  assert.match(source, /data-control-kind="eject-key"/);
  const ejectSource = source.slice(source.indexOf('function EjectControl'), source.indexOf('function Knob'));
  assert.doesNotMatch(ejectSource, /feDropShadow|drop-shadow\(/);
});

test('eject is rendered inside the action group, not the input rail', () => {
  assert.doesNotMatch(source, /<EjectControl[\s\S]*?reference-front__left-rail/);
  assert.match(source, /<g className="reference-front__action-zone"[^>]*>[\s\S]*?<EjectControl/);
});

test('reference front does not mount the legacy hardware surface', () => {
  assert.match(stageSource, /frontMode !== 'reference' && \([\s\S]*?<SideHardware/);
  assert.match(stageSource, /frontMode === 'reference' && \([\s\S]*?<ReferenceFrontConsole/);
});
