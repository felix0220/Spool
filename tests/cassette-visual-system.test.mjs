import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const stageSource = readFileSync(
  fileURLToPath(new URL('../src/components/GraphicDeckStage.jsx', import.meta.url)),
  'utf8',
);

test('cassette visual refinement preserves the shared mechanical format', () => {
  assert.match(stageSource, /width:\s*280/);
  assert.match(stageSource, /height:\s*156/);
  assert.match(stageSource, /reelCenterX:\s*65/);
  assert.match(stageSource, /reelHoleRadius:\s*20/);
  assert.match(stageSource, /circle cx=\{-CASSETTE_SPEC\.reelCenterX\}/);
  assert.match(stageSource, /circle cx=\{CASSETTE_SPEC\.reelCenterX\}/);
});

test('cassette identity has explicit hierarchy rather than one maximal weight', () => {
  assert.match(stageSource, /titleFontSize:\s*11/);
  assert.match(stageSource, /editionFontSize:\s*10/);
  assert.match(stageSource, /primaryFeatureStroke:\s*3/);
  assert.match(stageSource, /secondarySeamStroke:\s*2/);
  assert.match(stageSource, /emberReference: Object\.freeze\(/);
  assert.match(stageSource, /tapeStroke:\s*2\.2/);
  assert.match(stageSource, /surfaceCompletion: Object\.freeze\(/);
  assert.match(stageSource, /EMBER_STICKER_LAYOUT = Object\.freeze\(/);
  assert.match(stageSource, /href:\s*'\/assets\/ember-stickers\/chill-lofi-moon-star\.png'/);
  assert.match(stageSource, /href:\s*'\/assets\/ember-stickers\/northern-star\.png'/);
  assert.equal(
    existsSync(fileURLToPath(new URL('../public/assets/ember-stickers/chill-lofi-moon-star.png', import.meta.url))),
    true,
  );
});

test('Night Soul uses selective reference decals inside the existing cassette transform', () => {
  assert.match(stageSource, /signalReference: Object\.freeze\(/);
  const decalPaths = {
    'night-title': '/assets/night-soul/ref-v3/night-glow.png',
    'soul-script': '/assets/night-soul/ref-v2/soul-script.png',
    'lord-strip': '/assets/night-soul/ref-v2/lord-strip.png',
    'wait-on-you-strip': '/assets/night-soul/ref-v2/wait-on-you-strip.png',
    'edition-02': '/assets/night-soul/ref-v2/edition-02.png',
    'side-b': '/assets/night-soul/ref-v2/side-b.png',
    stereo: '/assets/night-soul/ref-v2/stereo.png',
  };
  for (const [decal, path] of Object.entries(decalPaths)) {
    assert.match(stageSource, new RegExp(`data-cassette-decal="${decal}"`));
    assert.match(stageSource, new RegExp(path.replaceAll('/', '\\/')));
  }
  for (const layer of ['signal-field', 'signal-mist', 'signal-core-window', 'lower-mechanism', 'reference-wear-textures', 'guide-knobs', 'surface-stickers', 'surface-stickers-top']) {
    assert.match(stageSource, new RegExp(`data-cassette-depth-layer="${layer}"`));
  }
  for (const texture of ['mist-left', 'mist-right', 'edge-wear', 'lower-mechanism-wear']) {
    assert.match(stageSource, new RegExp(`data-cassette-texture="${texture}"`));
  }
  assert.match(stageSource, /data-cassette-texture="soft-focus"/);
  assert.match(stageSource, /data-cassette-texture="soft-focus-core"/);
  assert.match(stageSource, /data-cassette-depth-layer="signal-soft-focus-atmosphere"/);
  assert.match(stageSource, /data-cassette-texture="logo-soft-focus"/);
  assert.match(stageSource, /data-cassette-element="soul-label"/);
  assert.match(stageSource, /night-soul-atmosphere/);
  assert.match(stageSource, /night-soul-logo-atmosphere/);
  assert.match(stageSource, /data-cassette-texture="global-grain"/);
  assert.match(stageSource, /night-soul-print-distress-soft-mask/);
  assert.match(stageSource, /night-soul-print-distress-full-mask/);
  assert.match(stageSource, /night-soul-core-window-cutouts/);
  assert.match(stageSource, /SignalCounterCapsule/);
  assert.match(stageSource, /data-cassette-counter="capsule"/);
  assert.doesNotMatch(stageSource, /signal-reference-png/);
  assert.doesNotMatch(stageSource, /signal-reference-body-clip/);
  assert.doesNotMatch(stageSource, /preserveAspectRatio="none"/);
  assert.doesNotMatch(stageSource, /circle r="18\.5" fill="#071331"/);
  assert.doesNotMatch(stageSource, /M-19 0H-15M19 0H15M0-19V-15M0 19V15/);
  assert.match(stageSource, /waitOnYouStrip:[\s\S]*?y:\s*28/);
  assert.doesNotMatch(stageSource, /data-cassette-depth-layer="surface-stickers"[^>]*(clipPath|mask)=/);
  assert.match(stageSource, /data-cassette-depth-layer="surface-stickers-top"/);
  assert.match(stageSource, /<g opacity="\.84">[\s\S]*data-cassette-decal="lord-strip"[\s\S]*data-cassette-decal="wait-on-you-strip"/);
  assert.match(stageSource, /night-soul-field-soft-focus/);
  assert.match(stageSource, /night-soul-core-soft-focus/);
  assert.match(stageSource, /night-soul-soft-focus-blur/);
  assert.match(stageSource, /M-119 -38\.5H-58M58 -38\.5H119/);
  assert.match(stageSource, /r=\{CASSETTE_VISUAL_TOKENS\.signalReference\.reelOuterRadius\}/);
  assert.match(stageSource, /width="102" height="40" rx="4"/);
  assert.doesNotMatch(stageSource, /M-94 39L-52 57H52L94 39/);
  assert.match(stageSource, /M-124 61H124/);
  assert.match(stageSource, /circle cx="0" cy="50" r="7"/);
  assert.match(stageSource, /data-reel-motion="signal"/);
  assert.match(stageSource, /data-cassette-functional-layer=\{tape\.variant === 'signal' \? 'functional-reel-hardware'/);
  assert.match(stageSource, /data-cassette-element=\{tape\.variant === 'signal' \? 'reel-gear'/);
  assert.match(stageSource, /data-reel-pivot=\{tape\.variant === 'signal' \? 'receiver-centre'/);
  assert.match(stageSource, /data-reel-state=\{playing \? 'playing'/);
  assert.doesNotMatch(stageSource, /data-cassette-depth-layer="reel-hardware"[^>]*display=/);
});

test('Night Soul keeps the reference sticker relationship and existing Soul script', () => {
  assert.match(stageSource, /nightTitle: Object\.freeze\([\s\S]*?x:\s*-61,[\s\S]*?y:\s*-71,[\s\S]*?width:\s*122,[\s\S]*?height:\s*48/);
  assert.match(stageSource, /soulSticker: Object\.freeze\([\s\S]*?x:\s*-54,[\s\S]*?y:\s*-31,[\s\S]*?width:\s*48,[\s\S]*?height:\s*14,[\s\S]*?rotation:\s*-8/);
  assert.match(stageSource, /soulScript: Object\.freeze\([\s\S]*?href:\s*'\/assets\/night-soul\/ref-v2\/soul-script\.png'/);
  assert.match(stageSource, /rotate\(\$\{signalReference\.decals\.soulSticker\.rotation\}/);
  assert.match(stageSource, /signalReference\.decals\.soulSticker\.x \+ 6/);
  assert.doesNotMatch(stageSource, /rect data-cassette-element="soul-label" x="-24" y="-47"/);
});

test('Night Soul ref-v2 assets are present at their runtime paths', () => {
  for (const asset of [
    'night-title',
    'soul-script',
    'lord-strip',
    'wait-on-you-strip',
    'edition-02',
    'side-b',
    'stereo',
    'mist-overlay',
    'mist-right-overlay',
    'edge-wear-overlay',
    'lower-mechanism-wear',
    'print-distress-mask',
    'soft-focus-texture',
    'global-grain',
  ]) {
    assert.equal(
      existsSync(fileURLToPath(new URL(`../public/assets/night-soul/ref-v2/${asset}.png`, import.meta.url))),
      true,
    );
  }
  assert.equal(
    existsSync(fileURLToPath(new URL('../public/assets/night-soul/ref-v3/night-glow.png', import.meta.url))),
    true,
  );
});

test('the three cassettes keep distinct material anatomy', () => {
  for (const material of ['ribbed', 'signal', 'paper']) {
    assert.match(stageSource, new RegExp(`data-cassette-material="${material}"`));
    assert.match(stageSource, new RegExp(`graphic-tape-material--${material}`));
  }

  assert.doesNotMatch(stageSource, /graphic-tape-motif/);
  assert.doesNotMatch(stageSource, /M-110 34C-92 22/);
  assert.doesNotMatch(stageSource, /M-108-36C-92-21/);
});

test('ember is a real reference-led depth stack with a routed tape path', () => {
  for (const layer of ['rear-media', 'tape-route', 'lower-mechanical-panel', 'translucent-shell', 'molded-seams', 'signal-registration', 'surface-completion', 'surface-stickers', 'guide-knobs', 'reel-hardware']) {
    assert.match(stageSource, new RegExp(`data-cassette-depth-layer="${layer}"`));
  }
  assert.match(stageSource, /graphic-tape-material--ember-reference/);
  assert.match(stageSource, /data-cassette-element="tape-route"/);
  assert.match(stageSource, /data-cassette-sticker="chill-lofi"/);
  assert.doesNotMatch(stageSource, /graphic-tape-material--ember-layered/);
  assert.match(stageSource, /\{!isEmber && tape\.variant !== 'signal' && <g className="graphic-tape-identity"/);
});

test('ember reference pass keeps a translucent amber shell and narrow media line', () => {
  assert.match(stageSource, /const cassetteFrameFill = isEmber \? emberReference\.outerFrame/);
  assert.match(stageSource, /const cassetteShellFill = isEmber \? emberReference\.shellFill/);
  assert.match(stageSource, /shellOpacity: \.20/);
  assert.match(stageSource, /innerFieldOpacity: \.18/);
  assert.match(stageSource, /hub: '#F56A2A'/);
  assert.match(stageSource, /tape: '#8C3E1C'/);
  assert.match(stageSource, /data-cassette-surface="shell-grain"/);
  assert.match(stageSource, /fill="url\(#industrial-plastic-grain\)"/);
  assert.match(stageSource, /data-cassette-element="tape-route"[\s\S]*strokeWidth=\{emberReference\.tapeStroke\}/);
  assert.match(stageSource, /data-cassette-element="signal-segment"/);
  assert.match(stageSource, /data-cassette-element="index-plate"/);
  assert.match(stageSource, /data-cassette-element="index-grooves"/);
  assert.match(stageSource, /data-cassette-element="edition-badge"/);
  assert.match(stageSource, /data-cassette-sticker="edition-01-badge"/);
  assert.match(stageSource, /href:\s*'\/assets\/ember-stickers\/edition-01-badge\.png'/);
  assert.match(stageSource, /badge: Object\.freeze\(\{[\s\S]*x:\s*93,[\s\S]*y:\s*-34,[\s\S]*width:\s*18,[\s\S]*height:\s*26/);
  assert.match(stageSource, /data-cassette-element="edition-badge"[\s\S]*preserveAspectRatio="xMidYMid meet"/);
  assert.equal(
    existsSync(fileURLToPath(new URL('../public/assets/ember-stickers/edition-01-badge.png', import.meta.url))),
    true,
  );
  assert.match(stageSource, /data-cassette-depth-layer="surface-stickers"/);
  assert.doesNotMatch(stageSource, /emberVintage/);
  assert.doesNotMatch(stageSource, /data-cassette-depth-layer="printed-field"/);
  assert.match(stageSource, /width="280" height="156" rx="11"/);
});

test('Ember sticker layout is fixed in cassette space and clears hardware zones', () => {
  assert.match(stageSource, /reelRadius:\s*20/);
  assert.match(stageSource, /guideClearanceRadius:\s*18/);
  assert.match(stageSource, /data-cassette-sticker="chill-lofi"[\s\S]*preserveAspectRatio="xMidYMid meet"/);
  assert.match(stageSource, /data-cassette-sticker="northern-star"[\s\S]*preserveAspectRatio="xMidYMid meet"/);

  for (const rejectedLayer of ['top-label-bar', 'top-label-sticker', 'signal-sticker', 'title-mark', 'manufacturing-copy', 'mechanical-index']) {
    assert.doesNotMatch(stageSource, new RegExp(`data-cassette-depth-layer="${rejectedLayer}"`));
  }
  assert.doesNotMatch(stageSource, /LOW SIGNAL/);
  assert.doesNotMatch(stageSource, /WARM TAPE/);

  const reelClearanceRadius = 20;
  const guideClearanceRadius = 18;
  const chillLofi = { left: -70, right: 70, top: 25, bottom: 63.5 };
  const northernStar = { left: -101, right: -81, top: -39, bottom: -18.57 };
  assert.ok(Math.hypot(chillLofi.left + 65, chillLofi.top + 3) > reelClearanceRadius, 'Chill Lo-fi must clear the left reel hole');
  assert.ok(Math.hypot(chillLofi.right - 65, chillLofi.top + 3) > reelClearanceRadius, 'Chill Lo-fi must clear the right reel hole');
  assert.ok(Math.hypot(northernStar.right + 65, northernStar.bottom + 3) > reelClearanceRadius, 'Northern star must clear the left reel hole');
  assert.ok(-94 + guideClearanceRadius < chillLofi.left, 'Chill Lo-fi must clear the left guide knob');
  assert.ok(94 - guideClearanceRadius > chillLofi.right, 'Chill Lo-fi must clear the right guide knob');
});

test('each cassette has a durable edition number and canonical two-line title field', () => {
  assert.match(stageSource, /number:\s*'01'/);
  assert.match(stageSource, /number:\s*'02'/);
  assert.match(stageSource, /number:\s*'03'/);
  assert.match(stageSource, /const titleLines = track\?\.labelLines/);
  assert.match(stageSource, /\{titleLines\[0\]\}/);
  assert.match(stageSource, /\{titleLines\[1\]\}/);
});

test('top shell and inner panel use rounded corners without changing lid or bay geometry', () => {
  assert.match(stageSource, /const roundedQuadPath = \(vertices, radius\)/);
  assert.match(stageSource, /const TOP_SURFACE_RADIUS = 15/);
  assert.match(stageSource, /const TOP_PANEL_RADIUS = 12/);
  assert.match(stageSource, /const topPath = roundedQuadPath\(topPoints, TOP_SURFACE_RADIUS\)/);
  assert.match(stageSource, /const panelPath = roundedQuadPath\(panelPoints, TOP_PANEL_RADIUS\)/);
  assert.match(stageSource, /<path d=\{topPath\} fill=\{COLORS\.bodyHi\}/);
  assert.match(stageSource, /<path d=\{panelPath\} fill=\{COLORS\.body\}/);
  assert.match(stageSource, /<polygon points=\{slot\} fill=\{COLORS\.inkDeep\}/);
  assert.match(stageSource, /<DeckLidOverlay/);
});

test('Cathedral Dust uses a manifest-backed branch inside the shared cassette transform', () => {
  assert.match(stageSource, /const isCathedralDust = tape\.id === 'cream' && tape\.trackId === 'cathedral-dust'/);
  assert.match(stageSource, /cathedralReference: Object\.freeze\(/);
  assert.match(stageSource, /function CathedralDustArtwork\(\{ reelTurn = 0 \}\)/);
  assert.match(stageSource, /data-cassette-art=\{isCathedralDust \? 'cathedral-dust-ref-v1'/);
  for (const layer of [
    'rear-media',
    'lower-mechanism',
    'shell-substrate',
    'reel-left-surface',
    'reel-right-surface',
    'title-engraving',
    'edition-03-engraving',
    'official-SPOOL-mark-vector',
    'brass-fastener',
    'surface-wear',
  ]) {
    assert.match(stageSource, new RegExp(`data-cathedral-layer="${layer}"`));
  }
  assert.match(stageSource, /display=\{isCathedralDust \? 'none' : undefined\}/);
  assert.match(stageSource, /shell: '\/assets\/cathedral-dust\/ref-v1\/shell-substrate\.png'/);
  assert.match(stageSource, /reelLeft: '\/assets\/cathedral-dust\/ref-v1\/reel-left-surface\.png'/);
  assert.match(stageSource, /edition: '\/assets\/cathedral-dust\/ref-v1\/edition-03-engraving\.png'/);
  assert.match(stageSource, /edition: Object\.freeze\(\{ x: 101, y: 22, width: 28, height: 16 \}\)/);
  assert.match(stageSource, /spoolMark: '\/mark\.svg'/);
  assert.match(stageSource, /bodyClip: Object\.freeze\(\{ x: -140, y: -78, width: 280, height: 156, rx: 11 \}\)/);
  assert.match(stageSource, /layerOpacity: Object\.freeze\(\{ rearMedia: 1, shell: 1 \}\)/);
  assert.match(stageSource, /surfaceWear: Object\.freeze\(\{ opacity: \.34, blendMode: 'soft-light' \}\)/);
  assert.match(stageSource, /clipPath="url\(#cathedral-dust-body-clip\)"/);
  assert.match(stageSource, /data-cathedral-layer="rear-media" opacity=\{reference\.layerOpacity\.rearMedia\}/);
  assert.match(stageSource, /data-cathedral-layer="shell-substrate" opacity=\{reference\.layerOpacity\.shell\}/);
  assert.match(stageSource, /id="cathedral-dust-body-clip" clipPathUnits="userSpaceOnUse"/);
  assert.match(stageSource, /function CathedralDustArtwork\(\{ reelTurn = 0 \}\)/);
  assert.match(stageSource, /data-reel-motion="cathedral"/);
  assert.match(stageSource, /rotate\(\$\{reelTurn \* -1\}\)/);
  assert.match(stageSource, /rotate\(\$\{reelTurn\}\)/);
  assert.match(stageSource, /data-cathedral-element="lower-mechanism"/);
  assert.match(stageSource, /data-cathedral-element="brass-fastener"/);
  assert.match(stageSource, /engravingOpacity: Object\.freeze\(\{ title: \.92, mark: \.74 \}\)/);
  assert.match(stageSource, /filter id="cathedral-engraving-emboss"/);
  assert.match(stageSource, /filter="url\(#cathedral-engraving-emboss\)"/);
  assert.match(stageSource, /data-cathedral-element="edition-03-engraving"[\s\S]*filter="url\(#cathedral-engraving-emboss\)"/);
  assert.ok(
    stageSource.indexOf('data-cathedral-layer="title-engraving"')
      < stageSource.indexOf('data-cathedral-layer="edition-03-engraving"')
      && stageSource.indexOf('data-cathedral-layer="edition-03-engraving"')
      < stageSource.indexOf('data-cathedral-layer="official-SPOOL-mark-vector"'),
    'edition engraving must remain in the identity layer order',
  );
  assert.equal(
    existsSync(fileURLToPath(new URL('../public/assets/cathedral-dust/ref-v1/edition-03-engraving.png', import.meta.url))),
    true,
  );
  assert.match(stageSource, /floodColor="#827968"/);
  assert.match(stageSource, /floodColor="#F4F0E6"/);
  assert.match(stageSource, /data-cathedral-layer="surface-wear"\s+opacity=\{reference\.surfaceWear\.opacity\}/);
  assert.match(stageSource, /style=\{\{ mixBlendMode: reference\.surfaceWear\.blendMode \}\}/);
  assert.ok(
    stageSource.indexOf('data-cathedral-layer="surface-wear"')
      < stageSource.indexOf('data-cathedral-layer="reel-left-surface"'),
    'surface wear must sit below reel hardware and engravings'
  );
  assert.match(stageSource, /transform=\{`translate\(\$\{tape\.x\} \$\{tape\.y\}\) rotate\(\$\{tape\.rotation\}\) scale\(\$\{tape\.scale \?\? 1\}\)`\}/);
});

test('interactive cassette art keeps a full-surface pointer hit target', () => {
  assert.match(stageSource, /data-cassette-drag-hit="true"/);
  assert.match(stageSource, /pointerEvents=\{interactive \? 'all' : 'none'\}/);
});
