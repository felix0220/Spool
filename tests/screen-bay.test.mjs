import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { FRONT_LAYOUT_DESIGN } from '../src/components/front/front-reference-geometry.js';
import {
  EJECT_CLEARANCE,
  EJECT_EXTERIOR_VIEW_MAX,
  buildEjectStandbyFrame,
  getEjectLayer,
  getEjectPose,
  isEjectPoseClear,
  shouldRenderEjectExterior,
} from '../src/components/eject-render-contract.js';

const stageSource = readFileSync(
  fileURLToPath(new URL('../src/components/GraphicDeckStage.jsx', import.meta.url)),
  'utf8',
);

test('screen bay keeps waveform workspace between input and output rails', () => {
  const { leftRail, waveform, rightRail } = FRONT_LAYOUT_DESIGN;
  assert.ok(leftRail.x + leftRail.width < waveform.x);
  assert.ok(waveform.x + waveform.width < rightRail.x);
  assert.ok(waveform.y >= FRONT_LAYOUT_DESIGN.upper.y);
  assert.ok(waveform.y + waveform.height <= FRONT_LAYOUT_DESIGN.upper.y + FRONT_LAYOUT_DESIGN.upper.height);
});

test('screen bay reserves a central stereo workspace with a persistent timeline', () => {
  const { waveform, waveformPlot, waveformTimeline } = FRONT_LAYOUT_DESIGN;
  assert.ok(waveformPlot.x > waveform.x);
  assert.ok(waveformPlot.x + waveformPlot.width < waveform.x + waveform.width);
  assert.ok(waveformTimeline.y > waveformPlot.y);
  assert.ok(waveformTimeline.y < waveformPlot.y + waveformPlot.height + 64);
  assert.ok(waveformTimeline.width > waveformPlot.width * .7);
});

test('waveform motion domain and seek rail share the same x bounds', () => {
  const { waveformPlot, waveformTimeline } = FRONT_LAYOUT_DESIGN;
  assert.equal(waveformTimeline.x, waveformPlot.x);
  assert.equal(waveformTimeline.width, waveformPlot.width);
});

test('telemetry remains a narrow companion rail, not a second main workspace', () => {
  const { waveform, rightRail } = FRONT_LAYOUT_DESIGN;
  assert.ok(rightRail.width < waveform.width * .35);
  assert.ok(rightRail.x > waveform.x + waveform.width);
});

const clearPose = { x: 640, y: 600, rotation: 0 };
const occludedPose = { x: 640, y: 350, rotation: 0 };
const ejectGeometry = { cavityBottom: 420, width: 280, height: 156 };

test('eject foreground eligibility requires only camera reveal and unlock', () => {
  assert.equal(shouldRenderEjectExterior({ phase: 'ejecting', view: 0, embed: .9, pose: clearPose, ...ejectGeometry }), true);
  assert.equal(shouldRenderEjectExterior({ phase: 'ejecting', view: EJECT_EXTERIOR_VIEW_MAX, embed: .4, pose: clearPose, ...ejectGeometry }), true);
  assert.equal(shouldRenderEjectExterior({ phase: 'ejecting', view: 0, embed: .4, pose: occludedPose, ...ejectGeometry }), true);
  assert.equal(shouldRenderEjectExterior({ phase: 'ejecting', view: .2, embed: .4 }), false);
  assert.equal(shouldRenderEjectExterior({ phase: 'ejecting', view: 0, embed: 1 }), false);
  assert.equal(shouldRenderEjectExterior({ phase: 'standby', view: 0, embed: 0 }), false);
});

test('released diagonal tape uses one complete foreground entity', () => {
  assert.equal(getEjectLayer({ phase: 'ejecting', view: .2, embed: .4, pose: clearPose, ...ejectGeometry }), 'seated');
  assert.equal(getEjectLayer({ phase: 'ejecting', view: 0, embed: 1, pose: clearPose, ...ejectGeometry }), 'seated');
  // The renderer must not wait for the cassette's axis-aligned bounds to
  // clear the cavity. That delay keeps the same diagonal body inside the
  // cavity clip and is what causes the visible cut-through at 1x speed.
  assert.equal(getEjectLayer({ phase: 'ejecting', view: 0, embed: .99, pose: occludedPose, ...ejectGeometry }), 'foreground');
  assert.equal(getEjectLayer({ phase: 'ejecting', view: 0, embed: .99, pose: clearPose, ...ejectGeometry }), 'foreground');
  assert.equal(getEjectLayer({ phase: 'standby', view: 0, embed: 0 }), 'seated');

  // The foreground entity must not be split at the bay edge. A diagonal
  // cassette is allowed to move across the edge as one continuous body.
  assert.doesNotMatch(stageSource, /graphic-layer--cassette-eject-foreground[\s\S]{0,500}clipPath=/);
});

test('all three cassettes keep a continuous diagonal return path', () => {
  const homes = [
    { id: 'ember', x: 352, y: 600, rotation: -8 },
    { id: 'blue', x: 640, y: 621, rotation: 0 },
    { id: 'cream', x: 928, y: 600, rotation: 8 },
  ];
  for (const home of homes) {
    const early = getEjectPose({
      tapeProgress: 0.18,
      centerX: 640,
      receiverY: 335,
      cavityBottom: 420,
      cassetteHeight: 156,
      home,
    });
    assert.equal(early.phase, 'diagonal-return');
    if (home.rotation === 0) {
      assert.ok(Math.abs(early.x - 640) < 10);
      assert.ok(early.y > 335);
    } else {
      assert.notEqual(early.x, 640);
      assert.notEqual(early.rotation, 0);
    }

    const late = getEjectPose({
      tapeProgress: 0.28,
      centerX: 640,
      receiverY: 335,
      cavityBottom: 420,
      cassetteHeight: 156,
      home,
    });
    assert.equal(late.phase, 'diagonal-return');
    assert.ok(late.y > early.y);
    assert.ok(Math.abs(late.rotation) <= Math.abs(home.rotation));
  }
});

test('the diagonal path remains continuous while the renderer owns one complete entity', () => {
  const homes = [
    { x: 352, y: 600, rotation: -8 },
    { x: 640, y: 621, rotation: 0 },
    { x: 928, y: 600, rotation: 8 },
  ];
  for (const home of homes) {
    const clearStates = [];
    for (const progress of [0.18, 0.5, 0.75, 1]) {
      const pose = getEjectPose({
        tapeProgress: progress,
        centerX: 640,
        receiverY: 335,
        cavityBottom: 420,
        cassetteHeight: 156,
        home,
      });
      assert.ok(pose.clearY >= 420 + 156 / 2 + EJECT_CLEARANCE);
      clearStates.push(isEjectPoseClear({ pose, ...ejectGeometry }));
    }
    assert.equal(clearStates[0], false);
    assert.equal(clearStates.at(-1), true);
    assert.ok(clearStates.every((value, index) => index === 0 || value || !clearStates[index - 1]));
  }
});

test('the final Eject frame is a stable HOME frame, not a partial animation frame', () => {
  const home = [
    { id: 'ember', x: 352, y: 600, rotation: -8, scale: 1, opacity: 0.4, visible: false },
    { id: 'blue', x: 640, y: 621, rotation: 0, scale: 1, opacity: 0.4, visible: false },
  ];
  const stable = buildEjectStandbyFrame(home);
  assert.deepEqual(stable.map(({ opacity, scale, visible }) => ({ opacity, scale, visible })), [
    { opacity: 1, scale: 1, visible: true },
    { opacity: 1, scale: 1, visible: true },
  ]);
});

test('the active renderer uses the shared Eject geometry and canonical end frame', () => {
  assert.match(stageSource, /getEjectPose/);
  assert.match(stageSource, /buildEjectStandbyFrame/);
  assert.match(stageSource, /jawReleaseStart/);
  assert.match(stageSource, /jawReleaseEnd/);
  assert.match(stageSource, /graphic-layer--cassette-seated/);
  assert.match(stageSource, /graphic-layer--cassette-eject-foreground/);
  assert.match(stageSource, /getEjectLayer/);
  assert.match(stageSource, /if \(isForegroundEject\) return null/);
  assert.doesNotMatch(stageSource, /bay-eject-exterior-clip/);
});

test('cassette holding highlight is clipped to the cassette body, not its shadow', () => {
  const holdIndicator = stageSource.match(/\{holding && \(([\s\S]*?)\n\s*\)\}/)?.[1] || '';
  assert.match(holdIndicator, /clipPath/);
  assert.match(holdIndicator, /cassette-hold-\$\{tape\.id\}/);
  assert.doesNotMatch(holdIndicator, /x="-145"|y="-85"|width="290"|height="166"/);
});

test('insert keeps cassette identity through lid close and the settling hold', () => {
  assert.match(stageSource, /const covered = raw >= INSERT_TIMING\.holdEnd;/);
  assert.doesNotMatch(stageSource, /const covered = raw >= INSERT_TIMING\.closeEnd;/);
});
