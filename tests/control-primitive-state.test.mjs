import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/components/front/ReferenceFrontConsole.jsx', import.meta.url), 'utf8');
const styles = fs.readFileSync(new URL('../src/front-reference.css', import.meta.url), 'utf8');

test('control primitives expose distinct visual kinds', () => {
  assert.match(source, /data-control-kind="knob"/);
  assert.match(source, /data-control-kind="volume-slider"/);
  assert.match(source, /data-control-kind="shuttle"/);
  assert.match(source, /data-control-kind="play-dial"/);
  assert.match(source, /data-visual={visual}/);
  assert.match(source, /reference-front__action-key/);
  assert.match(source, /reference-front__eject/);
});

test('A, B and Q share the circular toggle shell contract without icons', () => {
  assert.equal((source.match(/variant="toggle"/g) || []).length, 3);
  assert.match(source, /data-control-kind=\{isToggle \? 'toggle-key' : 'transport'\}/);
  assert.match(source, /reference-front-toggle-shadow/);
  assert.match(source, /reference-front__toggle-key-sidewall/);
  assert.match(source, /reference-front__toggle-key-face/);
  assert.match(source, /reference-front__toggle-key-highlight/);
  assert.match(source, /reference-front__toggle-key-indicator/);
  assert.doesNotMatch(source, /reference-front__toggle-key-icon-slot/);
  assert.match(source, /TOGGLE_SIDEWALL_OFFSET_Y/);
  assert.match(styles, /--front-toggle-sidewall: color-mix/);
  assert.match(styles, /\.reference-front__toggle-key-sidewall\s*\{[\s\S]*fill: var\(--front-toggle-sidewall\)/);
  assert.match(styles, /\.reference-front__toggle-key-face\s*\{[\s\S]*fill: var\(--front-toggle-key-idle\)/);
  assert.match(styles, /\.reference-front__toggle-key\.is-active \.reference-front__toggle-key-indicator/);
  assert.doesNotMatch(source, /icon="mark"|icon="return"|MarkEmbossedIcon|ReturnEmbossedIcon/);
  assert.doesNotMatch(styles, /--front-toggle-engrave/);
});

test('A, B and Q keep real state and semantic keyboard contracts', () => {
  assert.match(source, /label=\{cueA == null \? 'Set A cue' : 'Clear A cue'\}/);
  assert.match(source, /label=\{cueB == null \? 'Set B cue' : 'Clear B cue'\}/);
  assert.match(source, /label=\{returnCueKey === 'B' \? 'Return to B cue' : 'Return to A cue'\}/);
  assert.equal((source.match(/controlKind="cue-[ab]-key"/g) || []).length, 2);
  assert.match(source, /data-control-kind=\{controlKind\}/);
  assert.match(source, /data-value=\{disabled \? 'disabled' : pressed \? 'active' : 'idle'\}/);
  assert.match(source, /event\.repeat/);
  assert.match(source, /aria-pressed=\{pressed\}/);
  assert.match(styles, /\.reference-front__toggle-key\.is-disabled \.reference-front__toggle-key-indicator\s*\{[\s\S]*fill: #b5b5af/);
  assert.match(styles, /--front-toggle-key-active: var\(--front-orange\)/);
  assert.match(styles, /--front-toggle-key-mark: #f15b2a/);
  assert.match(styles, /--front-toggle-key-black: #262727/);
  assert.match(styles, /\.reference-front__toggle-key\.is-active \.reference-front__toggle-key-face/);
  assert.match(styles, /\.reference-front__toggle-key\.is-disabled \.reference-front__toggle-key-face/);
});

test('knob, volume slider, shuttle and transport primitives have disabled visual states', () => {
  assert.match(source, /reference-front__knob\$\{repeat \? ' is-active' : ''\}\$\{disabled \? ' is-disabled' : ''\}/);
  assert.match(source, /VolumeSlider\(\{ value, disabled = false \}/);
  assert.match(source, /Shuttle\(\{ direction, disabled = false \}/);
  assert.match(styles, /\.reference-front__transport\.is-disabled/);
  assert.match(styles, /\.reference-front__knob\.is-disabled/);
  assert.match(styles, /\.reference-front__shuttle\.is-disabled/);
  assert.match(styles, /\.reference-front__volume-slider\.is-disabled/);
});

test('semantic input states remain represented by the real controls', () => {
  assert.match(source, /data-state=\{disabled \? 'disabled' : interactionState\}/);
  assert.match(source, /aria-pressed=\{pressed\}/);
  assert.match(source, /onPointerDown=\{handlePointerDown\}/);
  assert.match(source, /onKeyDown=\{handleKeyDown\}/);
});

test('primitive feedback covers hover, pressed, focus and disabled states', () => {
  assert.match(styles, /@media \(hover: hover\) and \(pointer: fine\)/);
  assert.match(styles, /\.reference-front__semantic-control:hover/);
  assert.match(styles, /data-state='hover'/);
  assert.match(styles, /data-state='pressed'/);
  assert.match(styles, /data-state='focused'/);
  assert.match(styles, /\.reference-front__semantic-control:focus-visible/);
  assert.match(styles, /\.reference-front__semantic-control:disabled/);
  assert.match(styles, /\.reference-front__transport\.is-disabled/);
  assert.match(styles, /\.reference-front__knob\.is-disabled/);
  assert.match(styles, /\.reference-front__shuttle\.is-disabled/);
  assert.match(styles, /\.reference-front__volume-slider\.is-disabled/);
});

test('pressed hardware feedback stays in place and only travels vertically', () => {
  assert.match(styles, /\.reference-front__semantic-button:active\s*\{[^}]*transform: none/);
  assert.match(styles, /\.reference-front__transport:has\([\s\S]*?\{[^}]*transform: translateY\(1px\)/);
  assert.doesNotMatch(styles, /\.reference-front__transport:has\([\s\S]*?\{[^}]*scale\(/);
  assert.match(styles, /\.reference-front__eject-key\.is-pressed \.reference-front__eject-mark\s*\{[^}]*transform: translateY\(-1px\)/);
  assert.doesNotMatch(styles, /\.reference-front__shuttle:has\(\+ foreignObject \.reference-front__semantic-range\[data-state='pressed'\]\)/);
  assert.match(styles, /\.reference-front__play-dial-grip\s*\{[^}]*transform: rotate\(var\(--play-dial-angle/);
  assert.doesNotMatch(styles, /\.reference-front__play-dial[^{}]*data-state='pressed'[^{}]*\{[^}]*transform: translateY/);
  assert.doesNotMatch(source, /reference-front__play-dial-halo/);
  assert.doesNotMatch(source, /filter="url\(#reference-front-key-shadow\)"/);
});

test('mark and return polish stays scoped, stationary and motion-safe', () => {
  assert.match(styles, /\.reference-front__toggle-key\s*\{[\s\S]*transition: filter 140ms/);
  assert.match(styles, /@media \(hover: hover\) and \(pointer: fine\)[\s\S]*\.reference-front__toggle-key:has\([\s\S]*data-state='hover'/);
  assert.match(styles, /\.reference-front__toggle-key:has\([\s\S]*data-state='pressed'[\s\S]*\{[\s\S]*transform: none/);
  assert.doesNotMatch(styles, /\.reference-front__toggle-key:has\([\s\S]*data-state='pressed'[\s\S]*\{[^}]*translateX/);
  assert.doesNotMatch(styles, /\.reference-front__toggle-key:has\([\s\S]*data-state='pressed'[\s\S]*\{[^}]*scale\(/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.reference-front__toggle-key-indicator/);
  assert.match(source, /Math\.max\(76, G\.transport\.cueA\.size \+ 14\)/);
  assert.match(source, /Math\.max\(76, G\.transport\.cueB\.size \+ 14\)/);
  assert.match(source, /Math\.max\(76, G\.transport\.return\.size \+ 14\)/);
});

test('toggle shell uses a restrained shared shadow instead of a black halo', () => {
  assert.match(source, /reference-front-toggle-shadow/);
  assert.match(source, /dy="1\.35" stdDeviation="1\.05" floodColor="#111315" floodOpacity="\.11"/);
  assert.doesNotMatch(source, /dy="2\.4" stdDeviation="2" floodColor="#111315" floodOpacity="\.2"/);
  assert.match(styles, /\.reference-front__toggle-key-sidewall\s*\{[\s\S]*stroke-width: \.8/);
  assert.doesNotMatch(styles, /\.reference-front__toggle-key-icon-slot/);
});

test('eject key follows the reference anatomy and uses internal embossing', () => {
  assert.match(source, /reference-front__eject-key/);
  assert.match(source, /reference-front__eject-sidewall/);
  assert.match(source, /reference-front__eject-face/);
  assert.match(source, /reference-front__eject-mark/);
  assert.match(source, /filter="url\(#reference-front-toggle-shadow\)"/);
  assert.match(source, /const markPath =/);
  assert.doesNotMatch(source, /<circle[^>]+eject/);
  const ejectSource = source.slice(source.indexOf('function EjectControl'), source.indexOf('function Knob'));
  assert.doesNotMatch(ejectSource, /feDropShadow|drop-shadow\(/);
  assert.match(ejectSource, /fill=\{icon\}/);
  assert.doesNotMatch(source, /reference-front__eject-press-surface|reference-front__eject-pop|reference-front__eject-lower-sidewall/);
  assert.match(styles, /\.reference-front__eject-highlight/);
});

test('play dial is integrated with the fascia and keeps only its seam as separation', () => {
  assert.match(styles, /\.reference-front__play-dial\s*\{[\s\S]*transition: filter 140ms/);
  assert.match(styles, /\.reference-front__play-dial:has\([\s\S]*data-state='hover'[\s\S]*\{[\s\S]*filter: brightness\(1\.035\)/);
  assert.doesNotMatch(styles, /\.reference-front__play-dial:has\([^\{]+\)\s*\{[^}]*drop-shadow/);
  assert.match(styles, /\.reference-front__play-dial-ring\s*\{[\s\S]*stroke: var\(--front-seam-strong\)[\s\S]*stroke-width: 1\.4/);
});

test('front seam tokens are semantic and mapped by structural role', () => {
  assert.match(styles, /--front-seam-strong:\s*#2b2b2b/);
  assert.match(styles, /--front-seam-control:\s*#5c605b/);
  assert.match(styles, /--front-seam-soft:\s*#a9aaa4/);
  assert.match(styles, /--front-seam-screen:\s*#4c4e51/);
  assert.match(styles, /--front-seam-divider:\s*rgb\(45 47 44 \/ \.28\)/);
  assert.match(styles, /--front-shell-edge:\s*var\(--front-seam-soft\)/);
  assert.match(styles, /--front-screen-edge:\s*var\(--front-seam-screen\)/);
  assert.match(styles, /--front-divider:\s*var\(--front-seam-divider\)/);
  assert.match(styles, /\.reference-front__body-shell\s*\{\s*stroke: var\(--front-seam-soft\)/);
  assert.match(styles, /\.reference-front__screen-well\s*\{\s*stroke: var\(--front-seam-screen\)/);
  assert.match(styles, /\.reference-front__fascia-surface\s*\{\s*stroke: var\(--front-seam-soft\)/);
  assert.match(styles, /\.reference-front__fascia-divider\s*\{[\s\S]*stroke: var\(--front-divider\)/);
  assert.match(styles, /\.reference-front__toggle-key-face\s*\{[\s\S]*stroke: var\(--front-seam-control\)/);
  assert.match(source, /reference-front__eject[\s\S]*stroke="var\(--front-seam-control\)"/);
  assert.match(source, /reference-front__transport[\s\S]*stroke="var\(--front-seam-control\)"/);
});

test('reduced motion also disables continuous reel animation', () => {
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.reference-front__tape-reel-needle\s*\{[\s\S]*animation:\s*none/);
});

test('reel motion rotates only the needle and keeps the white disc static', () => {
  assert.match(source, /reference-front__tape-reel-white-disc/);
  assert.match(source, /reference-front__tape-reel-needle/);
  assert.match(source, /data-reel-motion="needle"/);
  assert.match(source, /data-reel-pivot="black-center"/);
  assert.match(source, /reference-front__tape-reel-pivot/);
  assert.match(source, /reference-front__tape-reel-center/);
  assert.doesNotMatch(source, /reference-front__tape-reel-hub/);
  assert.match(styles, /\.reference-front__tape-reel-needle\s*\{[\s\S]*animation: reference-front-reel-spin-clockwise/);
  assert.match(styles, /animation-direction: normal/);
  assert.match(styles, /@keyframes reference-front-reel-spin-clockwise\s*\{[\s\S]*from \{ transform: rotate\(0deg\); \}[\s\S]*to \{ transform: rotate\(360deg\); \}/);
});

test('volume slider uses a capsule thumb with paired low and high volume icons', () => {
  assert.match(source, /reference-front__volume-slider-thumb/);
  assert.match(source, /reference-front__volume-slider-disc/);
  assert.match(source, /<VolumeGlyph cx=\{leftDiscX\}/);
  assert.match(source, /<VolumeGlyph cx=\{rightDiscX\} cy=\{discY\} large/);
  assert.match(styles, /\.reference-front__volume-slider-track[\s\S]*stroke: #b7b9b5/);
  assert.match(source, /height=\{thumbHeight\}[\s\S]*rx=\{thumbHeight \/ 2\}/);
  assert.match(source, /const discGap = 5/);
  assert.match(source, /const discRadius = 8\.5/);
  assert.match(source, /const VOLUME_DETENT_STEP = 10/);
  assert.match(source, /step=\{VOLUME_DETENT_STEP\}/);
  assert.match(source, /disabled \? '#AAA8A0' : '#7C7A72'/);
  assert.match(source, /data-volume-mark=\{large \? 'plus' : 'minus'\}/);
  assert.doesNotMatch(source, /pathForRadius|radii = large/);
  assert.match(source, /rightDiscX = thumbX \+ thumbWidth \/ 2 \+ discRadius/);
  assert.doesNotMatch(source, /<Label className="reference-front__hardware-label" x=\{center\} y=\{G\.volumeSlider\.labelY\}/);
  assert.match(source, /reference-front-volume-engrave/);
  assert.doesNotMatch(styles, /\.reference-front__volume-slider:has\(\+ foreignObject \.reference-front__semantic-range\[data-state='pressed'\]\)\s*\{[^}]*transform:/);
});

test('shuttle slider uses the same capsule language with rewind and fast-forward marks', () => {
  assert.match(source, /reference-front__volume-slider reference-front__shuttle/);
  assert.match(source, /reference-front__volume-slider-thumb/);
  assert.match(source, /reference-front__volume-slider-disc/);
  assert.match(source, /direction="rewind"/);
  assert.match(source, /direction="fast-forward"/);
  assert.doesNotMatch(source, /<Label x=\{center\} y=\{G\.shuttle\.labelY\}/);
  assert.doesNotMatch(source, /CENTER|\bREW\b|\bFF\b/);
  assert.match(source, /onPointerMove=\{onShuttlePointerMove\}/);
  assert.match(source, /step=\{SHUTTLE_DETENT_STEP\}/);
});
