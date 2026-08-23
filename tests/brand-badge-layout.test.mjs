import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const {
  BADGE_U,
  BADGE_U0,
  BADGE_V0,
  BADGE_V1,
  MARK_SIZE,
  MARK_WELL_U,
  SPOOL_MARK_PATH,
  WORD_WELL_U,
  WORDMARK_WIDTH,
  getBrandBadgeLayout,
} = await import('../src/components/industrial/brand-badge-geometry.js');

const renderer = fs.readFileSync(
  new URL('../src/components/industrial/TopSurfaceDetails.jsx', import.meta.url),
  'utf8',
);
const markSvg = fs.readFileSync(new URL('../public/mark.svg', import.meta.url), 'utf8');

test('the two wells share one v-span, so the halves cannot drift vertically', () => {
  const badge = getBrandBadgeLayout();
  assert.equal(badge.markWell.u0 < badge.markWell.u1, true);
  assert.equal(badge.wordWell.u0 < badge.wordWell.u1, true);
  // Both wells are built from the same two v values, not from two offsets that
  // happen to agree. This is the invariant the split into two wells buys.
  assert.equal(badge.v0, BADGE_V0);
  assert.equal(badge.v1, BADGE_V1);
  assert.equal(badge.midV, (BADGE_V0 + BADGE_V1) / 2);
});

test('mark and wordmark sit on one centre line', () => {
  const badge = getBrandBadgeLayout();
  // Both are placed at midV; there is no separate vertical term for either.
  assert.equal(badge.midV, (badge.v0 + badge.v1) / 2);
  assert.match(
    renderer,
    /quadPoint\(quad, badge\.markCenterU, badge\.midV\)/,
    'the mark must be placed on the shared badge mid-line',
  );
  assert.match(
    renderer,
    /quadPoint\(quad, badge\.wordCenterU, badge\.midV\)/,
    'the wordmark must be placed on the shared badge mid-line',
  );
});

test('the badge as a whole is centred on the surface', () => {
  const badge = getBrandBadgeLayout();
  const left = badge.markWell.u0;
  const right = badge.wordWell.u1;
  assert.ok(Math.abs((left + right) / 2 - .5) < 1e-9, 'badge centre must be u = .5');
  assert.ok(Math.abs((right - left) - BADGE_U) < 1e-9);
  assert.equal(left, BADGE_U0);
});

test('each half is centred inside its own well', () => {
  const badge = getBrandBadgeLayout();
  assert.ok(Math.abs(badge.markCenterU - (badge.markWell.u0 + badge.markWell.u1) / 2) < 1e-9);
  assert.ok(Math.abs(badge.wordCenterU - (badge.wordWell.u0 + badge.wordWell.u1) / 2) < 1e-9);
});

test('the wells are wider than what they hold, so each still reads as a frame', () => {
  // 688 world units per 1 u at the badge.
  const perU = 688;
  const markWellWidth = MARK_WELL_U * perU;
  const wordWellWidth = WORD_WELL_U * perU;
  assert.ok(markWellWidth > MARK_SIZE, 'mark must not touch its well');
  assert.ok(markWellWidth - MARK_SIZE > 5, 'mark needs a visible margin on both sides');
  assert.ok(wordWellWidth - WORDMARK_WIDTH > 10, 'wordmark needs a visible margin');
});

test('the pressed mark is the same geometry as the published mark', () => {
  const published = markSvg.match(/ d="([^"]+)"/)[1].replace(/\s+/g, ' ').trim();
  const pressed = SPOOL_MARK_PATH.replace(/\s+/g, ' ').trim();
  assert.equal(pressed, published,
    'public/mark.svg and the badge must stay one mark — re-run scripts/build-identity.py');
});

test('the renderer owns no badge numbers of its own', () => {
  const body = renderer.slice(renderer.indexOf('function BrandPlaque'));
  const plaque = body.slice(0, body.indexOf('export function TopSurfaceDetails'));
  assert.equal(/\.0\d{2,}/.test(plaque), false,
    'u-space constants belong in brand-badge-geometry.js, not in the renderer');
});
