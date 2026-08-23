import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAudioClock } from '../music/useAudioClock.js';
import { useAudioProcessing } from '../music/useAudioProcessing.js';
import { useTrackWaveform } from '../music/useTrackWaveform.js';
import { clampCue, normalizeLoop } from '../music/loop-region.js';
import { formatTime } from '../music/time.js';
import { getTrackByCassetteId, getTrackById } from '../music/tracks.js';
import { snapshotCapture } from '../music/material-capture.js';
import { useSignalLevel } from '../music/useSignalLevel.js';
import { AUDIO_LOAD_STATUS } from '../music/audio-source-lifecycle.js';
import {
  clientToDesignPoint,
  designToWorld,
  DESIGN_VIEWPORT,
  WORLD_TO_DESIGN,
  WORLD_VIEWPORT,
} from '../design-viewport.js';
import ReferenceFrontConsole from './front/ReferenceFrontConsole.jsx';
import { FRONT_GEOMETRY } from './front/front-reference-geometry.js';
import {
  quantizeShuttleDirection,
  SHUTTLE_DETENTS,
  shuttleDirectionFromPointer,
} from './front/control-inputs.js';
import { DECK_PHASE, PHASE_STATUS } from './deck-phases.js';
import {
  EJECT_CLEARANCE,
  buildEjectStandbyFrame,
  getEjectLayer,
  getEjectPose,
  shouldRenderEjectExterior,
} from './eject-render-contract.js';
import {
  FRONT_INTENTS,
  canDispatchFrontIntent,
} from './front/action-contract.js';
import { LidSurfaceDetails, TopSurfaceDetails } from './industrial/TopSurfaceDetails.jsx';

const W = WORLD_VIEWPORT.width;
const H = WORLD_VIEWPORT.height;
const COLORS = {
  canvas: '#F04B31',
  ink: '#17181B',
  inkDeep: '#0D0F12',
  panel: '#232529',
  panelLine: '#3C3E42',
  body: '#D9D7CF',
  bodyHi: '#ECEAE3',
  paper: '#EEECE4',
  muted: '#8D8D87',
  cream: '#D8D5CB',
  blue: '#4B61A8',
  ochre: '#A97849',
  orange: '#F05A2D',
};
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const DEFAULT_LOOP_LENGTH = 4;
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - (1 - clamp(t)) ** 3;
// A softer ease-out for the two secondary cassettes leaving the stage. It
// keeps the required exit behavior, but avoids the aggressive first impulse
// of the shared cubic curve.
const easeOutSoft = (t) => Math.sin((clamp(t) * Math.PI) / 2);
const easeIn = (t) => clamp(t) ** 2;
const easeInOut = (t) => {
  const n = clamp(t);
  return n < 0.5 ? 4 * n * n * n : 1 - ((-2 * n + 2) ** 3) / 2;
};
const pointLerp = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const points = (a, b, t) => a.map((p, i) => pointLerp(p, b[i], t).join(',' )).join(' ');
const pointList = (list) => list.map(([x, y]) => `${x},${y}`).join(' ');
const qBezier = (a, c, b, t) => [
  lerp(lerp(a[0], c[0], t), lerp(c[0], b[0], t), t),
  lerp(lerp(a[1], c[1], t), lerp(c[1], b[1], t), t),
];
const magneticControl = (start, target) => {
  const dx = target[0] - start[0];
  const dy = target[1] - start[1];
  const distance = Math.hypot(dx, dy) || 1;
  const bend = Math.min(26, distance * .08);
  return [
    (start[0] + target[0]) / 2 - (dy / distance) * bend,
    (start[1] + target[1]) / 2 + (dx / distance) * bend,
  ];
};

const TOP_CLOSED = [[258, 148], [1022, 148], [1022, 486], [258, 486]];
const TOP_RECEDING = [[452, 112], [828, 112], [782, 202], [498, 202]];
const TOP_PANEL_CLOSED = [[278, 168], [1002, 168], [1002, 452], [278, 452]];
const TOP_PANEL_RECEDING = [[478, 130], [802, 130], [770, 190], [510, 190]];
const FRONT_EDGE = [[430, 458], [850, 458], [808, 505], [472, 505]];
const FRONT_FULL = [[232, 156], [1048, 156], [1048, 634], [232, 634]];
const SLOT_CLOSED = [[456, 250], [824, 250], [824, 416], [456, 416]];
const SLOT_OPEN = [[500, 236], [780, 236], [758, 390], [522, 390]];

// Cassette Intake Core contract. Every visual and interaction target below
// derives from these anchors; the drag hit area is intentionally separate from
// the visual bay shape, but both describe the same receiving region.
const CASSETTE_SPEC = {
  width: 280,
  height: 156,
  reelCenterX: 65,
  reelHoleRadius: 20,
};
const INTAKE = {
  centerX: 640,
  receiverY: 335,
  snap: { left: 456, right: 824, top: 230, bottom: 420 },
  cavity: { left: 470, right: 810, rearLeft: 474, rearRight: 806, top: 230, bottom: 420 },
  jaw: { leftX: 505, rightX: 775, baseY: 418, armY: 407, pivotY: 412, catchY: 397 },
  lidOpen: 1,
};
const INSERT_TIMING = {
  total: 3200,
  lidSettleEnd: .12,
  magnetStart: .12,
  magnetEnd: .23,
  seatEnd: .27,
  lockEnd: .32,
  closeEnd: .53,
  holdEnd: .64,
  secondaryExitStart: .35,
  secondaryExitEnd: .60,
};
const EJECT_TIMING = {
  // Named segments keep the mechanical beats readable and make the last
  // rendered frame a real landing pose instead of a post-animation reset.
  total: 4800,
  cameraTopEnd: .22,
  lidOpenEnd: .40,
  jawReleaseStart: .40,
  jawReleaseEnd: .50,
  unlockEnd: .52,
  tapeExitEnd: .80,
  sourcesReturnEnd: .90,
  recloseEnd: .97,
};
const SECONDARY_EXIT = { outwardX: 120, downwardY: 250 };
const isInSnapVolume = (x, y) => (
  x >= INTAKE.snap.left && x <= INTAKE.snap.right
  && y >= INTAKE.snap.top && y <= INTAKE.snap.bottom
);

const HOME_Y_OFFSET = 42;
const HOME = [
  { id: 'ember', trackId: 'chill-lofi-inspired-loop', artVariant: 'bloom-signal', x: 352, y: 558 + HOME_Y_OFFSET, rotation: -8, tint: '#C76A4E', frameColor: '#3A3837', labelTint: '#EEECE4', accent: COLORS.orange, variant: 'ribbed', phase: 0.4, scale: 1 },
  { id: 'blue', trackId: 'night-soul', artVariant: 'night-grid', x: 640, y: 579 + HOME_Y_OFFSET, rotation: 0, tint: '#4B61A8', frameColor: '#3F5795', labelTint: '#ECE9DF', accent: COLORS.cream, variant: 'signal', phase: 2.1, scale: 1 },
  { id: 'cream', trackId: 'cathedral-dust', artVariant: 'cathedral-ribs', x: 928, y: 558 + HOME_Y_OFFSET, rotation: 8, tint: '#DFDCD0', frameColor: '#8E8D87', labelTint: '#F3F0E6', accent: COLORS.ochre, variant: 'paper', phase: 4.5, scale: 1 },
];

const EMPTY_TAPES = HOME.map((t) => ({ ...t, visible: true }));

function toStagePoint(event, node) {
  return designToWorld(clientToDesignPoint(event, node));
}

function CassetteGraphic({ tape, onPointerDown, onKeyDown, interactive = true, holding = false }) {
  const reelTurn = tape.reelTurn ?? 0;
  const accent = tape.accent ?? COLORS.orange;
  const frameColor = tape.frameColor ?? '#3A3837';
  const labelTint = tape.labelTint ?? COLORS.paper;
  const reelX = CASSETTE_SPEC.reelCenterX;
  const track = tape.trackId ? getTrackById(tape.trackId) : null;
  const titleLines = track?.labelLines ?? ['SIDE', 'A'];
  const titleSize = titleLines[1]?.length > 10 ? 5.4 : 6.4;
  return (
    <g
      className="graphic-tape-entity"
      data-tape-id={tape.id}
      data-tape-x={tape.x}
      data-tape-y={tape.y}
      data-tape-rotation={tape.rotation}
      data-tape-scale={tape.scale ?? 1}
      data-tape-visible={tape.visible ? 'true' : 'false'}
      transform={`translate(${tape.x} ${tape.y}) rotate(${tape.rotation}) scale(${tape.scale ?? 1})`}
      opacity={tape.opacity ?? 1}
    >
      <rect
        className="graphic-tape-shadow"
        x="-141"
        y="-79"
        width="282"
        height="158"
        rx="12"
        fill={COLORS.inkDeep}
        opacity=".28"
        transform="translate(0 11)"
        filter="url(#tape-shadow)"
        pointerEvents="none"
      />
      <g
      className={`graphic-tape${interactive ? ' is-draggable' : ''}`}
      data-variant={tape.variant}
      data-track-id={tape.trackId || undefined}
      data-art-variant={tape.artVariant || undefined}
      data-holding={holding ? 'true' : undefined}
      onPointerDown={interactive ? onPointerDown : undefined}
      onKeyDown={interactive ? onKeyDown : undefined}
      role={interactive ? 'button' : undefined}
      aria-label={interactive ? 'Drag cassette into the deck' : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      <g
        className={interactive ? 'graphic-tape-idle-drift' : undefined}
        style={interactive ? { '--idle-delay': `${-tape.phase / 1.35}s` } : undefined}
      >
        <g mask="url(#cassette-reel-cutouts)">
          <rect x="-140" y="-80" width="280" height="156" rx="11" fill={COLORS.ink} stroke={COLORS.inkDeep} strokeWidth="3" />
          <rect x="-128" y="-68" width="256" height="136" rx="7" fill={tape.tint} stroke={frameColor} strokeWidth="2" />
          <rect x="-128" y="-68" width="256" height="136" rx="7" fill="url(#cassette-rib)" opacity={tape.variant === 'ribbed' ? .3 : .12} />
          <rect x="-119" y="-59" width="238" height="118" rx="5" fill="none" stroke={labelTint} strokeWidth="1.5" opacity=".34" />
          <rect x="-88" y="-44" width="176" height="88" rx="3" fill={labelTint} stroke="#C8C5BB" strokeWidth="1.5" />
          <rect x="-88" y="9" width="176" height="3" rx="2" fill="#AAA9A2" opacity=".82" />
          <path d="M-72 24H72" stroke={accent} strokeWidth="3" opacity=".72" />
          <g className="graphic-tape-title" fill={COLORS.ink} textAnchor="middle" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing=".7" pointerEvents="none">
            <text x="0" y="-18" fontSize={titleSize} fontWeight="700">{titleLines[0]}</text>
            <text x="0" y="-3" fontSize={titleSize} fontWeight="700">{titleLines[1]}</text>
          </g>
          <g className="graphic-tape-motif" fill="none" stroke={accent} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none">
            {tape.artVariant === 'bloom-signal' && (
              <>
                <path d="M-110 34C-92 22-80 44-64 30S-30 41-12 25 20 41 40 28 75 43 108 28" strokeWidth="2.2" opacity=".78" />
                <circle cx="0" cy="30" r="5" strokeWidth="1.6" opacity=".7" />
                <path d="M-105-34H-86M86-34H105" strokeWidth="2" opacity=".76" />
              </>
            )}
            {tape.artVariant === 'night-grid' && (
              <>
                <path d="M-106-38V-26M-88-38V-26M88-38V-26M106-38V-26" strokeWidth="1.7" opacity=".72" />
                <path d="M-106 30H-82M82 30H106M-106 36H-72M72 36H106" strokeWidth="1.8" opacity=".7" />
                <path d="M-43-34V-24M-30-34V-24M30-34V-24M43-34V-24" strokeWidth="1.2" opacity=".66" />
              </>
            )}
            {tape.artVariant === 'cathedral-ribs' && (
              <>
                <path d="M-108 34V24M-96 34V20M-84 34V16M84 34V16M96 34V20M108 34V24" strokeWidth="2" opacity=".72" />
                <path d="M-108-36C-92-21-80-21-64-36M64-36C80-21 92-21 108-36" strokeWidth="1.7" opacity=".72" />
                <path d="M-48 34C-38 24-28 24-18 34M18 34C28 24 38 24 48 34" strokeWidth="1.5" opacity=".62" />
              </>
            )}
          </g>
          {tape.variant === 'signal' && (
            <g fill={accent} opacity=".78">
              <rect x="-76" y="-34" width="14" height="3" rx="1" />
              <rect x="62" y="-34" width="14" height="3" rx="1" />
              <path d="M-68 34H-42M42 34H68" fill="none" stroke={accent} strokeWidth="2" />
            </g>
          )}
          {tape.variant === 'paper' && (
            <g fill={accent} opacity=".68">
              {[-72, -54, 54, 72].map((x) => <circle key={x} cx={x} cy="-34" r="2" />)}
              <path d="M-70 34H-52M52 34H70" stroke={accent} strokeWidth="2" />
            </g>
          )}
          <g fill={COLORS.ink} opacity=".72">
            <rect x="-108" y="-64" width="8" height="5" />
            <rect x="-94" y="-64" width="5" height="5" />
            <rect x="89" y="-64" width="5" height="5" />
            <rect x="100" y="-64" width="8" height="5" />
          </g>
          <path d="M-134-24H-124M124-24H134" stroke={COLORS.paper} strokeWidth="2" opacity=".7" />
          <g fill="#C7C4BB">
            {[-1, 1].flatMap((sx) => [-1, 1].map((sy) => (
              <circle key={`${sx}-${sy}`} cx={sx * 122} cy={sy * 66} r="4" />
            )))}
          </g>
          <rect x="-62" y="54" width="124" height="9" rx="2" fill={tape.tint} stroke={COLORS.inkDeep} strokeWidth="2" opacity=".92" />
          <rect x="-24" y="58" width="48" height="3" rx="1" fill={accent} opacity=".82" />
        </g>
        <g fill="none" stroke={COLORS.inkDeep} strokeWidth="3">
          {[-1, 1].map((side) => (
            <g key={side} transform={`translate(${side * reelX} 0)`}>
              <circle r="23" stroke={COLORS.inkDeep} />
              <circle r="19" stroke={COLORS.paper} opacity=".9" />
              <g transform={`rotate(${reelTurn * side})`} stroke={accent} strokeWidth="4" strokeLinecap="round">
                <path d="M14-4A15 15 0 0 1 10 10" />
                <path d="M-14 4A15 15 0 0 1-10-10" />
          </g>
        </g>
          ))}
        </g>
        {holding && (
          <>
            <defs>
              <clipPath id={`cassette-hold-${tape.id}`}>
                <rect x="-140" y="-80" width="280" height="156" rx="11" />
              </clipPath>
            </defs>
            <g
              className="graphic-tape-hold-indicator"
              pointerEvents="none"
              clipPath={`url(#cassette-hold-${tape.id})`}
            >
              <rect x="-140" y="-80" width="280" height="156" rx="11" fill="none" stroke="#FFFDF6" strokeWidth="3" opacity=".94" />
              <rect x="-140" y="-80" width="280" height="156" rx="11" fill="none" stroke="#6B86FF" strokeWidth="2" opacity=".92" />
            </g>
          </>
        )}
      </g>
    </g>
    </g>
  );
}

function SignalScreen({ active, activeTrack, currentTime = 0, duration = 1, playedUntil = 0, capture, onSeekPointerDown }) {
  const bars = [22, 34, 18, 42, 29, 47, 24, 38, 20, 32, 26, 44, 20, 36];
  const ticks = Array.from({ length: 18 });
  const progress = duration ? clamp(currentTime / duration) : 0;
  const playedProgress = duration ? clamp(playedUntil / duration) : 0;
  const playheadX = 310 + 384 * progress;
  const playedX = 310 + 384 * playedProgress;
  const captureStartX = capture?.start == null ? null : 310 + 384 * clamp(capture.start / duration);
  const captureEndX = capture?.end == null ? null : 310 + 384 * clamp(capture.end / duration);
  return (
    <g className={active ? 'is-screen-active' : ''}>
      <rect x="286" y="226" width="432" height="178" rx="7" fill={COLORS.inkDeep} stroke={COLORS.panelLine} strokeWidth="4" />
      <rect x="300" y="240" width="404" height="128" fill="none" stroke="#2C2F34" strokeWidth="1" />
      <path d="M300 272H704M300 304H704M300 336H704" stroke="#25282D" strokeWidth="1" />
      <path d="M310 352 C332 346 340 300 358 326 S385 364 404 310 S436 345 455 320 S480 286 497 338 S523 365 542 298 S567 352 587 331 S612 298 636 350 S672 332 694 348" fill="none" stroke={COLORS.paper} strokeWidth="3" />
      {bars.map((height, index) => (
        <rect key={index} x={314 + index * 24} y={246 - height / 2} width="8" height={height} rx="1" fill={index % 3 === 0 ? COLORS.orange : index % 2 ? COLORS.blue : COLORS.ochre} opacity={active ? 1 : .45} />
      ))}
      {captureStartX != null && captureEndX != null && (
        <rect x={captureStartX} y="240" width={Math.max(2, captureEndX - captureStartX)} height="128" fill={COLORS.orange} opacity=".12" />
      )}
      {captureStartX != null && <path d={`M${captureStartX} 238V370`} stroke={COLORS.blue} strokeWidth="2" strokeDasharray="3 4" />}
      {captureEndX != null && <path d={`M${captureEndX} 238V370`} stroke={COLORS.orange} strokeWidth="2" strokeDasharray="3 4" />}
      <rect x="310" y="382" width="384" height="4" rx="2" fill="#2B2E33" />
      <rect x="310" y="382" width={Math.max(0, playedX - 310)} height="4" rx="2" fill={COLORS.blue} opacity=".75" />
      <rect x="310" y="382" width={Math.max(0, playheadX - 310)} height="4" rx="2" fill={COLORS.orange} opacity=".9" />
      {ticks.map((_, index) => <rect key={index} x={312 + index * 21} y="378" width={index % 3 === 0 ? 9 : 4} height="12" rx="1" fill={index < (active ? 11 : 4) ? COLORS.orange : COLORS.muted} opacity={index < (active ? 11 : 4) ? 1 : .5} />)}
      <rect
        x="306"
        y="372"
        width="392"
        height="30"
        fill="transparent"
        role="slider"
        tabIndex={0}
        aria-label={`Seek through ${activeTrack?.title || 'active track'}`}
        aria-valuemin="0"
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        onPointerDown={onSeekPointerDown}
      />
      <path d={`M${playheadX} 236V390`} stroke={active ? COLORS.orange : COLORS.muted} strokeWidth="2" />
      <circle cx={playheadX} cy="384" r="4" fill={active ? COLORS.orange : COLORS.muted} />
      <text x="302" y="400" fill={COLORS.muted} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="9" letterSpacing="1.2">{formatTime(currentTime)}</text>
      <text x="694" y="400" fill={COLORS.muted} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="9" textAnchor="end" letterSpacing="1.2">{formatTime(duration)}</text>
      <g fill={COLORS.cream} opacity=".82">
        <rect x="302" y="212" width="42" height="4" rx="2" />
        <rect x="354" y="212" width="74" height="4" rx="2" />
        <rect x="654" y="212" width="44" height="4" rx="2" />
      </g>
      <text x="440" y="218" fill={COLORS.paper} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="10" letterSpacing="1.8">{activeTrack?.title?.toUpperCase() || 'NO CASSETTE'}</text>
    </g>
  );
}

function VolumeFader({ value, onPointerDown, onKeyStep, x = 350, top = 476, bottom = 552 }) {
  const y = bottom - clamp(value) * (bottom - top);
  return (
    <g
      role="slider"
      tabIndex={0}
      aria-label="Volume"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={Math.round(value * 100)}
      onPointerDown={onPointerDown}
      onKeyDown={(event) => {
        if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        onKeyStep?.(event);
      }}
      style={{ cursor: 'ns-resize' }}
    >
      <rect x={x - 12} y={top - 10} width="24" height={bottom - top + 20} rx="4" fill={COLORS.ink} stroke="#5B5D5A" strokeWidth="2" />
      <rect x={x - 2} y={top} width="4" height={bottom - top} rx="2" fill="#51545A" />
      <rect x={x - 2} y={y} width="4" height={Math.max(0, bottom - y)} rx="2" fill={COLORS.blue} />
      <path d={`M${x - 10} ${y}H${x + 10}`} stroke={COLORS.cream} strokeWidth="3" strokeLinecap="round" />
      <circle cx={x} cy={y} r="7" fill={COLORS.blue} stroke={COLORS.paper} strokeWidth="2" />
      {[0, .25, .5, .75, 1].map((ratio) => {
        const tick = bottom - ratio * (bottom - top);
        return <path key={ratio} d={`M${x - 20} ${tick}H${x - 14}`} stroke={COLORS.muted} strokeWidth="2" />;
      })}
      <text x={x} y={bottom + 28} fill={COLORS.cream} textAnchor="middle" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="9" letterSpacing="1.2">{Math.round(value * 100)}%</text>
    </g>
  );
}

function SpeedKnob({ value, onPointerDown, onCycleSpeed, cx = 900, cy = 354 }) {
  const angle = -52 + ((value - 1) / 1) * 104;
  const radians = angle * Math.PI / 180;
  const pointerX = Math.sin(radians) * 24;
  const pointerY = -Math.cos(radians) * 24;
  return (
    <g
      role="slider"
      tabIndex={0}
      aria-label="Playback speed"
      aria-valuemin="1"
      aria-valuemax="2"
      aria-valuenow={value}
      aria-valuetext={`${value.toFixed(1)} times speed`}
      onPointerDown={onPointerDown}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onCycleSpeed?.();
        }
      }}
      style={{ cursor: 'ns-resize' }}
    >
      {[-52, -26, 0, 26, 52].map((tick) => {
        const tickRadians = tick * Math.PI / 180;
        const x1 = Math.sin(tickRadians) * 30;
        const y1 = -Math.cos(tickRadians) * 30;
        const x2 = Math.sin(tickRadians) * 36;
        const y2 = -Math.cos(tickRadians) * 36;
        return <path key={tick} d={`M${cx + x1} ${cy + y1}L${cx + x2} ${cy + y2}`} stroke={COLORS.muted} strokeWidth="2" />;
      })}
      <circle cx={cx} cy={cy} r="27" fill={COLORS.panel} stroke="#62645F" strokeWidth="3" />
      <circle cx={cx} cy={cy} r="19" fill={COLORS.ochre} />
      <path d={`M${cx} ${cy}L${cx + pointerX} ${cy + pointerY}`} stroke={COLORS.cream} strokeWidth="4" strokeLinecap="round" />
      <text x={cx} y={cy + 40} fill={COLORS.cream} textAnchor="middle" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="10" letterSpacing="1.2">{value.toFixed(1)}×</text>
    </g>
  );
}

function TelemetryModule({ active, playbackRate, volume, signalStore }) {
  const meterBars = [18, 31, 24, 42, 29, 38, 20, 34];
  const signalLevel = useSignalLevel(signalStore);
  const level = clamp(signalLevel);
  return (
    <g>
      <rect x="742" y="226" width="246" height="178" rx="7" fill={COLORS.inkDeep} stroke={COLORS.panelLine} strokeWidth="4" />
      <text x="760" y="252" fill={COLORS.paper} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="10" letterSpacing="1.4">LEVEL</text>
      <text x="968" y="252" fill={COLORS.cream} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="10" textAnchor="end" letterSpacing="1.2">VOL {Math.round(volume * 100)}%</text>
      <path d="M760 260H968M760 386H968" stroke="#34363A" strokeWidth="2" />
      <g fill={active ? COLORS.cream : COLORS.muted} opacity={active ? .86 : .45}>
        {meterBars.map((height, index) => {
          const liveHeight = Math.max(4, height * (.32 + volume * .24 + level * .44));
          return <rect key={index} x={764 + index * 20} y={326 - liveHeight} width="8" height={liveHeight} rx="1" />;
        })}
      </g>
      <path d="M760 326H968" stroke="#3C4044" strokeWidth="1" strokeDasharray="3 5" />
      <text x="760" y="344" fill={COLORS.muted} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="8" letterSpacing="1.2">SIGNAL / LIVE</text>
      <g aria-hidden="true">
        <circle cx="900" cy="354" r="27" fill="none" stroke="#4D5157" strokeWidth="2" />
        <circle cx="900" cy="354" r="19" fill="none" stroke={active ? COLORS.ochre : COLORS.muted} strokeWidth="3" />
        <path d={`M900 354L${900 + Math.sin((-52 + ((playbackRate - 1) / 1) * 104) * Math.PI / 180) * 24} ${354 - Math.cos((-52 + ((playbackRate - 1) / 1) * 104) * Math.PI / 180) * 24}`} stroke={active ? COLORS.cream : COLORS.muted} strokeWidth="3" strokeLinecap="round" />
      </g>
      <text x="860" y="394" fill={COLORS.muted} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="8" letterSpacing="1.2">RATE {playbackRate.toFixed(1)}×</text>
    </g>
  );
}

function HardwareButton({ cx, cy, label, ariaLabel, accent = COLORS.cream, active = false, onClick }) {
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={ariaLabel || label}
      aria-pressed={active}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick?.();
        }
      }}
      style={{ cursor: 'pointer' }}
    >
      <rect x={cx - 20} y={cy - 17} width="40" height="34" rx="5" fill="#B8B7B0" stroke="#5A5C59" strokeWidth="2" />
      <rect x={cx - 15} y={cy - 12} width="30" height="24" rx="3" fill={active ? accent : COLORS.paper} stroke="#797B76" strokeWidth="1.5" />
      <rect x={cx - 8} y={cy - 2} width="16" height="4" rx="2" fill={active ? COLORS.ink : accent} opacity=".95" />
      {label && <text x={cx} y={cy + 28} fill={COLORS.cream} textAnchor="middle" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="7" letterSpacing=".7">{label}</text>}
    </g>
  );
}

function OutputDial({ value }) {
  const angle = -52 + clamp(value) * 104;
  const radians = angle * Math.PI / 180;
  return (
    <g aria-hidden="true">
      {[-52, -26, 0, 26, 52].map((tick) => {
        const t = tick * Math.PI / 180;
        return <path key={tick} d={`M${1096 + Math.sin(t) * 29} ${260 - Math.cos(t) * 29}L${1096 + Math.sin(t) * 35} ${260 - Math.cos(t) * 35}`} stroke={COLORS.muted} strokeWidth="2" />;
      })}
      <circle cx="1096" cy="260" r="26" fill={COLORS.panel} stroke="#62645F" strokeWidth="3" />
      <circle cx="1096" cy="260" r="18" fill={COLORS.cream} />
      <path d={`M1096 260L${1096 + Math.sin(radians) * 22} ${260 - Math.cos(radians) * 22}`} stroke={COLORS.ink} strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

function InteractionFrames({ active, activeTrack, currentTime, playedUntil, duration, capture }) {
  const recordProgress = duration ? clamp(playedUntil / duration) : 0;
  const currentProgress = duration ? clamp(currentTime / duration) : 0;
  const recordX = 412 + 582 * recordProgress;
  const playX = 412 + 582 * currentProgress;
  const captureStartX = capture?.start == null ? null : 412 + 582 * clamp(capture.start / duration);
  const captureEndX = capture?.end == null ? null : 412 + 582 * clamp(capture.end / duration);
  return (
    <g>
      <g>
        <rect x="286" y="446" width="218" height="116" rx="6" fill={COLORS.inkDeep} stroke={COLORS.panelLine} strokeWidth="2" />
        <text x="302" y="466" fill={COLORS.paper} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="9" letterSpacing="1.2">TRANSPORT</text>
        <path d="M302 474H488" stroke="#34363A" strokeWidth="1" />
        <text x="302" y="495" fill={COLORS.muted} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="8">POSITION</text>
        <text x="488" y="495" fill={COLORS.cream} textAnchor="end" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="9">{formatTime(currentTime)}</text>
        <text x="302" y="516" fill={COLORS.muted} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="8">LENGTH</text>
        <text x="488" y="516" fill={COLORS.cream} textAnchor="end" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="9">{formatTime(duration)}</text>
        <text x="302" y="537" fill={COLORS.muted} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="8">STATE</text>
        <text x="488" y="537" fill={active ? COLORS.orange : COLORS.cream} textAnchor="end" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="9">{active ? 'PLAY' : 'READY'}</text>
      </g>
      <g>
        <rect x="520" y="446" width="218" height="116" rx="6" fill={COLORS.inkDeep} stroke={COLORS.panelLine} strokeWidth="2" />
        <text x="536" y="466" fill={COLORS.paper} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="9" letterSpacing="1.2">TRACK</text>
        <path d="M536 474H722" stroke="#34363A" strokeWidth="1" />
        <text x="536" y="496" fill={COLORS.muted} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="8">SIDE</text>
        <text x="722" y="496" fill={COLORS.cream} textAnchor="end" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="9">A / {activeTrack?.title?.toUpperCase() || 'NO CASSETTE'}</text>
        <text x="536" y="518" fill={COLORS.muted} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="8">RATE</text>
        <text x="722" y="518" fill={COLORS.blue} textAnchor="end" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="9">{active ? 'LIVE' : 'HOLD'}</text>
        <path d="M536 540C558 528 576 548 596 536S636 530 654 542S694 526 722 538" fill="none" stroke={COLORS.orange} strokeWidth="2" />
      </g>
      <g>
        <rect x="754" y="446" width="236" height="116" rx="6" fill={COLORS.inkDeep} stroke={COLORS.panelLine} strokeWidth="2" />
        <text x="770" y="466" fill={COLORS.paper} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="9" letterSpacing="1.2">CAPTURE / SIGNAL</text>
        <path d="M770 474H974" stroke="#34363A" strokeWidth="1" />
        <text x="770" y="496" fill={COLORS.muted} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="8">MARKS</text>
        <text x="974" y="496" fill={capture?.start != null ? COLORS.orange : COLORS.cream} textAnchor="end" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="9">{capture?.start == null ? '—' : `${formatTime(capture.start)} → ${capture.end == null ? '…' : formatTime(capture.end)}`}</text>
        <text x="770" y="518" fill={COLORS.muted} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="8">CAPTURED</text>
        <text x="974" y="518" fill={COLORS.blue} textAnchor="end" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="9">{Math.round(playedUntil)} SEC</text>
        <rect x="770" y="538" width="204" height="5" rx="2" fill="#303339" />
        <rect x="770" y="538" width={Math.max(0, 204 * recordProgress)} height="5" rx="2" fill={COLORS.blue} opacity=".8" />
      </g>
      <rect x="412" y="584" width="582" height="5" rx="2.5" fill="#303339" />
      <rect x="412" y="584" width={Math.max(0, recordX - 412)} height="5" rx="2.5" fill={COLORS.blue} opacity=".82" />
      {captureStartX != null && captureEndX != null && <rect x={captureStartX} y="579" width={Math.max(2, captureEndX - captureStartX)} height="15" rx="2" fill={COLORS.orange} opacity=".42" />}
      <path d={`M${playX} 578V596`} stroke={active ? COLORS.orange : COLORS.muted} strokeWidth="2" />
      <text x="994" y="580" fill={COLORS.muted} textAnchor="end" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="8" letterSpacing="1.1">{Math.round(playedUntil)}s CAP</text>
    </g>
  );
}

function SideHardware({ isPlaying, repeat, volume, playbackRate, capture, onVolumePointerDown, onVolumeKeyStep, onSpeedPointerDown, onCycleSpeed, onTogglePlay, onToggleLoop, onMarkCapture, onFastForward }) {
  return (
    <g className="side-hardware">
      <g transform="translate(186 0) scale(.69 1)">
      <rect x="122" y="180" width="116" height="428" rx="5" fill={COLORS.body} stroke="#A8A9A3" strokeWidth="2" />
      <rect x="130" y="188" width="100" height="412" rx="4" fill="none" stroke="#C5C4BD" strokeWidth="1.5" />
      <text x="180" y="224" fill={COLORS.ink} textAnchor="middle" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="9" letterSpacing="1.4">INPUT</text>
      <text x="180" y="244" fill={COLORS.muted} textAnchor="middle" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="7" letterSpacing="1.1">LEVEL</text>
      <VolumeFader value={volume} x={180} top={266} bottom={354} onPointerDown={onVolumePointerDown} onKeyStep={onVolumeKeyStep} />
      <text x="180" y="396" fill={COLORS.muted} textAnchor="middle" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="7" letterSpacing="1.1">SPEED</text>
      <SpeedKnob value={playbackRate} cx={180} cy={444} onPointerDown={onSpeedPointerDown} onCycleSpeed={onCycleSpeed} />
      <HardwareButton cx={180} cy={548} label={isPlaying ? 'PAUSE' : 'PLAY'} ariaLabel={isPlaying ? 'Pause audio' : 'Play audio'} accent={COLORS.orange} active={isPlaying} onClick={onTogglePlay} />
      </g>

      <g transform="translate(210 0) scale(.69 1)">
      <rect x="1042" y="180" width="116" height="428" rx="5" fill={COLORS.body} stroke="#A8A9A3" strokeWidth="2" />
      <rect x="1050" y="188" width="100" height="412" rx="4" fill="none" stroke="#C5C4BD" strokeWidth="1.5" />
      <text x="1100" y="224" fill={COLORS.ink} textAnchor="middle" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="9" letterSpacing="1.4">OUTPUT</text>
      <OutputDial value={volume} />
      <g aria-hidden="true">
        {[['SIG', '#5B9E4A'], ['OVR', COLORS.orange], ['PWR', COLORS.blue]].map(([label, color], index) => (
          <g key={label}>
            <text x={1064 + index * 28} y="312" fill={COLORS.muted} textAnchor="middle" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="6">{label}</text>
            <circle cx={1064 + index * 28} cy="326" r="5" fill={color} opacity={index === 0 && !isPlaying ? .32 : .95} stroke="#4A4C49" strokeWidth="1.5" />
          </g>
        ))}
      </g>
      <text x="1100" y="362" fill={COLORS.muted} textAnchor="middle" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="7" letterSpacing="1.1">LOOP</text>
      <HardwareButton cx={1100} cy={394} label={repeat ? 'ON' : 'OFF'} ariaLabel={repeat ? 'Disable loop' : 'Enable loop'} accent={COLORS.blue} active={repeat} onClick={onToggleLoop} />
      <HardwareButton cx={1068} cy={470} label="FF" ariaLabel="Fast forward six seconds" accent={COLORS.orange} onClick={onFastForward} />
      <HardwareButton cx={1132} cy={470} label="CUE" ariaLabel={capture?.end == null ? 'Mark capture point' : 'Reset capture points'} accent={COLORS.orange} active={capture?.start != null} onClick={onMarkCapture} />
      <text x="1100" y="534" fill={COLORS.muted} textAnchor="middle" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="7" letterSpacing="1.1">CAPTURE</text>
      <circle cx="1100" cy="550" r="6" fill={capture?.start != null ? COLORS.orange : COLORS.paper} stroke="#676A65" strokeWidth="2" />
      </g>
    </g>
  );
}

function DeckGraphic({
  frontMode = 'legacy',
  activeTrack,
  controlsReady,
  transportState,
  captureState,
  view,
  bayOpen,
  lidPulse = 0,
  playing,
  currentTime,
  playedUntil,
  duration,
  playbackRate,
  repeat,
  capture,
  cueA,
  cueB,
  returnCueKey,
  returnActive,
  volume,
  onSeekPointerDown,
  onSeekChange,
  onVolumePointerDown,
  onVolumeKeyStep,
  onVolumeChange,
  onSpeedPointerDown,
  onSpeedChange,
  onCycleSpeed,
  onTogglePlay,
  onFrontIntent,
  captureDisabled,
  capturePressed,
  cueADisabled,
  cueBDisabled,
  returnDisabled,
  onToggleLoop,
  onMarkCapture,
  onFastForward,
  onToneChange,
  onSpaceChange,
  onTextureChange,
  onShuttlePointerDown,
  onShuttlePointerMove,
  onShuttleChange,
  onShuttleClick,
  onShuttlePointerCancel,
  onShuttleKeyDown,
  toneCutoff,
  spaceAmount,
  textureAmount,
  shuttleDirection,
  signalStore,
  loadStatus,
  waveform,
  waveformStatus,
  waveformError,
  ejectVisible,
  ejectDisabled,
  onEject,
}) {
  /**
   * One graphic object, one shared hinge.
   * view=0 is the top projection; view=1 is the front projection.
   * The top face uses cos(theta), the front face uses sin(theta), so
   * neither surface is swapped in or out as a second screen.
   */
  const theta = clamp(view) * Math.PI / 2;
  const sin = Math.sin(theta);
  const cos = Math.cos(theta);
  // The front view is a camera change, not a second-sized product. Keep the
  // chassis footprint invariant so the top/front shared element stays aligned.
  const scale = 1;
  const anchorY = lerp(450, 165, view);
  const outerHalf = 382;
  // 透视收缩要在中段就读得出来：后缘先变窄，不能等到最后一帧才突然像梯形。
  // view=0 is a true orthographic top view: the rear and front edges are
  // exactly equal. Perspective convergence begins only as the camera leaves
  // the top view.
  const backHalf = lerp(outerHalf, 270, view);
  const depth = 318 * cos * scale;
  const topPoints = [
    [640 - outerHalf, anchorY],
    [640 + outerHalf, anchorY],
    [640 + backHalf, anchorY - depth],
    [640 - backHalf, anchorY - depth],
  ];
  const top = pointList(topPoints);
  const frontBottomY = anchorY + 478 * sin * scale;
  // 正面从窄底边长成真正的矩形，而不是两张等宽卡片交叉替换。
  const frontBottomHalf = outerHalf;
  const front = `${640 - outerHalf},${anchorY} ${640 + outerHalf},${anchorY} ${640 + frontBottomHalf},${frontBottomY} ${640 - frontBottomHalf},${frontBottomY}`;
  const panelFrontHalf = outerHalf - 20;
  const panelBackHalf = backHalf - 20;
  const panelFrontY = anchorY - 18 * cos * scale;
  const panelBackY = anchorY - 286 * cos * scale;
  const panelPoints = [
    [640 - panelFrontHalf, panelFrontY],
    [640 + panelFrontHalf, panelFrontY],
    [640 + panelBackHalf, panelBackY],
    [640 - panelBackHalf, panelBackY],
  ];
  const panel = pointList(panelPoints);
  // The reading bay is centered on the receiver axis, not above it.
  // This makes the seated cassette fit the cavity without a hidden scale or
  // an unexplained lower protrusion.
  const slotFrontY = anchorY - 30 * cos * scale;
  const slotBackY = anchorY - 220 * cos * scale;
  const slotFrontHalf = lerp(170, 166, view);
  const slotBackHalf = lerp(170, 162, view);
  const slot = `${640 - slotFrontHalf},${slotFrontY} ${640 + slotFrontHalf},${slotFrontY} ${640 + slotBackHalf},${slotBackY} ${640 - slotBackHalf},${slotBackY}`;
  const topOpacity = clamp(1 - view * 1.18);
  const frontFactor = sin;
  // Hover preview is a shallow slide, not a binary pop. The lid keeps its
  // identity and travels toward the rear edge of the same top plane.
  // Separate the two mechanical beats: first lift clear of the bay, then
  // travel toward the rear. Keeping these curves independent prevents the
  // lid from reading as a flat card that simply translates away.
  const lidTravel = 180 * easeInOut((bayOpen - .22) / .78) * cos * scale;
  const lidLift = 34 * easeOut(bayOpen / .25) * cos * scale;
  const lidFrontY = slotFrontY - lidTravel - lidLift;
  return (
    <g className="graphic-deck" transform={`translate(640 360) scale(${scale}) translate(-640 -360)`}>
      {/* The rear transition face is a single structural layer. Its former
          offset white duplicate created a false bottom plate under the shell. */}
      <g opacity={clamp(frontFactor * 1.08)} transform={`translate(0 ${anchorY}) scale(1 ${Math.max(frontFactor, .001)}) translate(0 -165)`}>
        {/* Furniture support belongs beneath the complete product shell. The
            shell and its lower edge are intentionally drawn over its upper
            mounting rail, leaving only the real legs exposed below. */}
        <g className="front-stand" display={frontMode === 'reference' ? 'none' : undefined} filter="url(#stand-shadow)" pointerEvents="none">
          <rect x="286" y="646" width="708" height="22" rx="4" fill="url(#wood-grain)" stroke="#6A3A22" strokeWidth="2" />
          <path d="M318 658H402L380 760H318Z" fill="url(#wood-grain)" stroke="#6A3A22" strokeWidth="2" />
          <path d="M878 658H962V760H900Z" fill="url(#wood-grain)" stroke="#6A3A22" strokeWidth="2" />
          <path d="M318 690H396M318 722H388M884 690H962M890 722H962" stroke="#D48A4B" strokeWidth="2" opacity=".7" />
          <path d="M318 752H380M900 752H962" stroke="#5A2E1C" strokeWidth="3" opacity=".8" />
          <ellipse cx="349" cy="765" rx="34" ry="6" fill="#9C9D99" stroke="#5A5C59" strokeWidth="2" />
          <ellipse cx="931" cy="765" rx="34" ry="6" fill="#9C9D99" stroke="#5A5C59" strokeWidth="2" />
          <ellipse cx="349" cy="762" rx="24" ry="4" fill="#D9D7CF" />
          <ellipse cx="931" cy="762" rx="24" ry="4" fill="#D9D7CF" />
        </g>
        <g className="front-stand--reference" display={frontMode === 'reference' ? undefined : 'none'} filter="url(#stand-shadow)" pointerEvents="none">
          <rect x="294" y="678" width="692" height="12" rx="4" fill="#25282A" stroke="#111315" strokeWidth="2" />
          <rect x="320" y="710" width="640" height="24" rx="5" fill="#25282A" stroke="#111315" strokeWidth="3" />
          <path d="M320 721H960" stroke="#464A4B" strokeWidth="7" strokeLinecap="round" />
          <path d="M320 721H960" stroke="#111315" strokeWidth="2.5" strokeLinecap="round" opacity=".9" />
          <path d="M306 680H370L344 768H290Z" fill="#303336" stroke="#111315" strokeWidth="3" />
          <path d="M910 680H974L990 768H936Z" fill="#303336" stroke="#111315" strokeWidth="3" />
          <path d="M298 714H344M936 714H982" stroke="#111315" strokeWidth="5" strokeLinecap="round" />
          <rect x="286" y="766" width="60" height="7" rx="3" fill="#111315" />
          <rect x="934" y="766" width="60" height="7" rx="3" fill="#111315" />
        </g>
      </g>
      <polygon points={front} fill={COLORS.bodyHi} stroke="#B7B6B0" strokeWidth="4" />

      <g opacity={topOpacity}>
        <polygon points={top} fill={COLORS.inkDeep} opacity=".25" transform="translate(0 12)" />
        <polygon points={top} fill={COLORS.bodyHi} stroke={COLORS.inkDeep} strokeWidth="5" />
        <polygon points={panel} fill={COLORS.body} stroke="#666A68" strokeWidth="2.4" />
        <TopSurfaceDetails panel={panelPoints} top={topPoints} />

        <polygon points={slot} fill={COLORS.inkDeep} stroke="#4B4D4A" strokeWidth="5" />
        <polygon points={slot} fill="none" stroke={bayOpen > .3 ? COLORS.orange : '#70716D'} strokeWidth="2" opacity=".88" transform="translate(0 -3)" />
        <g opacity={bayOpen > .08 ? clamp((bayOpen - .08) / .35) : 0} transform={`translate(0 ${anchorY - INTAKE.receiverY}) scale(1 ${Math.max(cos, .02)}) translate(0 ${INTAKE.receiverY - anchorY})`}>
          {[-1, 1].map((side) => (
            <g key={side} transform={`translate(${INTAKE.centerX + side * CASSETTE_SPEC.reelCenterX} ${INTAKE.receiverY})`}>
              <circle r="27" fill="#555855" stroke="#B7B6B0" strokeWidth="3" />
              <circle r="21" fill={COLORS.inkDeep} stroke="#26282A" strokeWidth="2" />
              <circle r="8" fill={COLORS.orange} stroke="#F5E6D7" strokeWidth="2" />
              <path d="M0-15V-10M0 10V15" stroke={COLORS.cream} strokeWidth="2" opacity=".8" />
            </g>
          ))}
        </g>
        <g opacity={bayOpen > .08 ? clamp((bayOpen - .08) / .28) : 0}>
          <path d={`M${640 - slotFrontHalf + 12} ${slotFrontY - 5}L${640 - slotFrontHalf + 8} ${lidFrontY + 6}`} stroke="#4B4D4A" strokeWidth="8" strokeLinecap="round" />
          <path d={`M${640 + slotFrontHalf - 12} ${slotFrontY - 5}L${640 + slotFrontHalf - 8} ${lidFrontY + 6}`} stroke="#4B4D4A" strokeWidth="8" strokeLinecap="round" />
          <path d={`M${640 - slotFrontHalf + 12} ${slotFrontY - 5}L${640 - slotFrontHalf + 8} ${lidFrontY + 6}`} stroke="#D8D5CB" strokeWidth="2" strokeLinecap="round" opacity=".72" />
          <path d={`M${640 + slotFrontHalf - 12} ${slotFrontY - 5}L${640 + slotFrontHalf - 8} ${lidFrontY + 6}`} stroke="#D8D5CB" strokeWidth="2" strokeLinecap="round" opacity=".72" />
          <circle cx={640 - slotFrontHalf + 12} cy={slotFrontY - 5} r="6" fill="#A8A9A3" stroke={COLORS.ink} strokeWidth="3" />
          <circle cx={640 + slotFrontHalf - 12} cy={slotFrontY - 5} r="6" fill="#A8A9A3" stroke={COLORS.ink} strokeWidth="3" />
        </g>
      </g>

      {frontMode !== 'reference' && (
        <g opacity={clamp(frontFactor * 1.08)} transform={`translate(0 ${anchorY}) scale(1 ${Math.max(frontFactor, .001)}) translate(0 -165)`}>
        {/* The front is a product shell first, interface second. */}
        {/* Oversized front shell intentionally occludes the rear transition face.
            The old offset white duplicate was removed: it was a false plate
            that sat over the wooden support and created a ghosted bottom edge. */}
        <rect x="258" y="145" width="764" height="540" rx="13" fill={COLORS.bodyHi} stroke="#B7B6B0" strokeWidth="4" />
        <rect x="270" y="157" width="740" height="516" rx="10" fill={COLORS.body} stroke="#B7B6B0" strokeWidth="2" />
        <g fill={COLORS.body} stroke="#A8A9A3" strokeWidth="2">
          {[ [282, 150], [998, 150], [282, 680], [998, 680] ].map(([cx, cy]) => (
            <g key={`${cx}-${cy}`}>
              <circle cx={cx} cy={cy} r="7" />
              <path d={`M${cx - 3} ${cy}H${cx + 3}M${cx} ${cy - 3}V${cy + 3}`} stroke="#5F625E" strokeWidth="1.5" strokeLinecap="round" />
            </g>
          ))}
        </g>
        <g fill="none" stroke="#7C807B" strokeWidth="1" opacity=".75">
          {[ [282, 150], [998, 150], [282, 680], [998, 680] ].map(([cx, cy]) => (
            <circle key={`recess-${cx}-${cy}`} cx={cx} cy={cy} r="2" />
          ))}
        </g>
        <rect x="350" y="180" width="580" height="428" rx="5" fill={COLORS.panel} stroke="#4C4E51" strokeWidth="3" />
        <rect x="358" y="188" width="564" height="412" rx="3" fill="url(#front-grid)" opacity=".48" />
        <rect x="350" y="194" width="580" height="8" rx="4" fill={COLORS.orange} opacity=".78" />
        <rect x="366" y="211" width="38" height="8" rx="2" fill={COLORS.orange} />
        <rect x="878" y="211" width="38" height="8" rx="2" fill={COLORS.blue} />
        <text x="418" y="218" fill={COLORS.paper} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="10" letterSpacing="1.6">SIDE A</text>
        <text x="866" y="218" fill={COLORS.orange} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="10" textAnchor="end" letterSpacing="1.4">STEREO</text>
        <path d="M366 430H914" stroke="#484A4D" strokeWidth="2" />
        {/* Keep the front projection inside the same body width as the top
            projection. The central readout is allowed to breathe, but it
            must not become a second, wider chassis. */}
        <g transform="translate(116 0) scale(.82 1)">
          <SignalScreen
            active={playing}
            activeTrack={activeTrack}
            currentTime={currentTime}
            playedUntil={playedUntil}
            duration={duration}
            capture={capture}
            onSeekPointerDown={onSeekPointerDown}
          />
          <TelemetryModule
            active={playing}
            playbackRate={playbackRate}
            volume={volume}
            signalStore={signalStore}
          />
          <InteractionFrames
            active={playing}
            activeTrack={activeTrack}
            currentTime={currentTime}
            playedUntil={playedUntil}
            duration={duration}
            capture={capture}
          />
        </g>
        {/* The side hardware is a real control rail, not an extension of the
            screen. Each rail is positioned inside the remaining chassis
            margins so it stays aligned with the top-view footprint. */}
        <SideHardware
          isPlaying={playing}
          repeat={repeat}
          volume={volume}
          playbackRate={playbackRate}
          capture={capture}
          onVolumePointerDown={onVolumePointerDown}
          onVolumeKeyStep={onVolumeKeyStep}
          onSpeedPointerDown={onSpeedPointerDown}
          onCycleSpeed={onCycleSpeed}
          onTogglePlay={onTogglePlay}
          onToggleLoop={onToggleLoop}
          onMarkCapture={onMarkCapture}
          onFastForward={onFastForward}
        />
        </g>
      )}
      {frontMode === 'reference' && (
        <g opacity={clamp(frontFactor * 1.08)} transform={`translate(0 ${anchorY}) scale(1 ${Math.max(frontFactor, .001)}) translate(0 -165)`}>
        <ReferenceFrontConsole
          activeTrack={activeTrack}
          controlsReady={controlsReady}
          transportState={transportState}
          playing={playing}
          currentTime={currentTime}
          duration={duration}
          playbackRate={playbackRate}
          cueA={cueA}
          cueB={cueB}
          returnCueKey={returnCueKey}
          returnActive={returnActive}
          volume={volume}
          toneCutoff={toneCutoff}
          spaceAmount={spaceAmount}
          textureAmount={textureAmount}
          shuttleDirection={shuttleDirection}
          signalStore={signalStore}
          loadStatus={loadStatus}
          waveform={waveform}
          waveformStatus={waveformStatus}
          waveformError={waveformError}
          onSeekChange={onSeekChange}
          onVolumeChange={onVolumeChange}
          onFrontIntent={onFrontIntent}
          cueADisabled={cueADisabled}
          cueBDisabled={cueBDisabled}
          returnDisabled={returnDisabled}
          onToneChange={onToneChange}
          onSpaceChange={onSpaceChange}
          onTextureChange={onTextureChange}
          onShuttlePointerDown={onShuttlePointerDown}
          onShuttlePointerMove={onShuttlePointerMove}
          onShuttleChange={onShuttleChange}
          onShuttleClick={onShuttleClick}
          onShuttlePointerCancel={onShuttlePointerCancel}
          onShuttleKeyDown={onShuttleKeyDown}
          ejectVisible={ejectVisible}
          ejectDisabled={ejectDisabled}
        />
        </g>
      )}
    </g>
  );
}

function DeckLidOverlay({ view, bayOpen, lidPulse = 0 }) {
  const theta = clamp(view) * Math.PI / 2;
  const cos = Math.cos(theta);
  // Match the deck body: the lid is part of the same product footprint and
  // must not grow on a separate scale during the view transition.
  const scale = 1;
  const anchorY = lerp(450, 165, view);
  const slotFrontY = anchorY - 30 * cos * scale;
  const slotBackY = anchorY - 220 * cos * scale;
  const slotFrontHalf = lerp(170, 166, view);
  const slotBackHalf = lerp(170, 162, view);
  const lidTravel = 180 * easeInOut((bayOpen - .22) / .78) * cos * scale;
  const lidLift = 34 * easeOut(bayOpen / .25) * cos * scale;
  const lidPoints = [
    [640 - slotFrontHalf, slotFrontY],
    [640 + slotFrontHalf, slotFrontY],
    [640 + slotBackHalf, slotBackY],
    [640 - slotBackHalf, slotBackY],
  ];
  const lid = pointList(lidPoints);
  const lidScale = 1 + .1 * Math.sin(Math.PI * clamp(lidPulse));
  const lidBaseCenterY = (slotFrontY + slotBackY) / 2;
  const topOpacity = clamp(1 - view * 1.18);
  return (
    <g
      className="graphic-deck-lid-overlay"
      pointerEvents="none"
      opacity={topOpacity}
      transform={`translate(640 360) scale(${scale}) translate(-640 -360)`}
    >
      <g transform={`translate(0 ${-lidTravel - lidLift})`}>
        <g transform={`translate(640 ${lidBaseCenterY}) scale(${lidScale}) translate(-640 ${-lidBaseCenterY})`}>
          {/* The body-coloured underlay is a physical occluder, not a second
              visible outline. It prevents the closed lid from exposing the
              bay rim, then the lid owns one precise seam above it. */}
          <polygon points={lid} fill={COLORS.bodyHi} stroke={COLORS.bodyHi} strokeWidth="10" />
          <polygon points={lid} fill={COLORS.bodyHi} stroke={COLORS.ink} strokeWidth="3.2" />
          <LidSurfaceDetails lid={lidPoints} />
        </g>
      </g>
    </g>
  );
}

function BayPocketOverlay({ view, lock }) {
  const safeView = Number.isFinite(view) ? view : 0;
  const safeLock = Number.isFinite(lock) ? lock : 0;
  const topVisibility = clamp(1 - safeView * 1.18);
  // The retaining cradle is a real second stage: it appears only after the
  // cassette has reached the receiver axis, never while the user is aiming.
  // Its release is continuous so slow playback exposes a mechanical descent,
  // not a group that pops in and out of the SVG tree.
  const jawVisibility = clamp(safeLock / .12) * topVisibility;
  if (jawVisibility <= .005) return null;
  return (
      <g className="bay-pocket-overlay" pointerEvents="none" clipPath="url(#bay-cavity-clip)">
      <g opacity={jawVisibility} transform={`translate(0 ${24 * (1 - safeLock)})`}>
        {/* Two small, legible jaws: they rise from below and catch the
            cassette's lower corners after the reel holes have locked. */}
        <g fill="none" stroke={COLORS.ink} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
          <path d={`M${INTAKE.jaw.leftX - 11} ${INTAKE.jaw.baseY}V${INTAKE.jaw.armY}L${INTAKE.jaw.leftX} ${INTAKE.jaw.catchY}L${INTAKE.jaw.leftX + 11} ${INTAKE.jaw.armY}V${INTAKE.jaw.baseY}Z`} />
          <path d={`M${INTAKE.jaw.rightX - 11} ${INTAKE.jaw.baseY}V${INTAKE.jaw.armY}L${INTAKE.jaw.rightX} ${INTAKE.jaw.catchY}L${INTAKE.jaw.rightX + 11} ${INTAKE.jaw.armY}V${INTAKE.jaw.baseY}Z`} />
        </g>
        <g fill="none" stroke="#A8A9A3" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <path d={`M${INTAKE.jaw.leftX - 11} ${INTAKE.jaw.baseY}V${INTAKE.jaw.armY}L${INTAKE.jaw.leftX} ${INTAKE.jaw.catchY}L${INTAKE.jaw.leftX + 11} ${INTAKE.jaw.armY}V${INTAKE.jaw.baseY}Z`} />
          <path d={`M${INTAKE.jaw.rightX - 11} ${INTAKE.jaw.baseY}V${INTAKE.jaw.armY}L${INTAKE.jaw.rightX} ${INTAKE.jaw.catchY}L${INTAKE.jaw.rightX + 11} ${INTAKE.jaw.armY}V${INTAKE.jaw.baseY}Z`} />
        </g>
        <circle cx={INTAKE.jaw.leftX} cy={INTAKE.jaw.pivotY} r="3" fill={COLORS.orange} />
        <circle cx={INTAKE.jaw.rightX} cy={INTAKE.jaw.pivotY} r="3" fill={COLORS.orange} />
      </g>
    </g>
  );
}

export default function GraphicDeckStage({ frontMode = 'legacy' }) {
  const svgRef = useRef(null);
  const audioRef = useRef(null);
  const rafRef = useRef(null);
  const frameRef = useRef({ view: 0, bayOpen: 0, lidPulse: 0, embed: 0, lock: 0, tapes: EMPTY_TAPES });
  const dragRef = useRef(null);
  const timelineDragRef = useRef(false);
  const volumeDragRef = useRef(false);
  const speedDragRef = useRef(false);
  const shuttleRef = useRef(null);
  const shuttleRafRef = useRef(null);
  const returnAnimationRef = useRef(null);
  const currentTimeRef = useRef(0);
  const bayMotionRef = useRef({ value: 0, velocity: 0, target: 0, last: 0 });
  const bayMotionRafRef = useRef(null);
  const [phase, setPhase] = useState(DECK_PHASE.STANDBY);
  const [frame, setFrame] = useState(frameRef.current);
  const [selectedId, setSelectedId] = useState(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [pendingTrackId, setPendingTrackId] = useState(null);
  const [activeTrackId, setActiveTrackId] = useState(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(.78);
  const [playedUntil, setPlayedUntil] = useState(0);
  const [cuePointA, setCuePointA] = useState(null);
  const [cuePointB, setCuePointB] = useState(null);
  const [lastCueKey, setLastCueKey] = useState('A');
  const [returnPulse, setReturnPulse] = useState(false);
  const [loopRange, setLoopRange] = useState(null);
  const [capturedMaterial, setCapturedMaterial] = useState(null);
  const [captureStatus, setCaptureStatus] = useState('idle');
  const [renderStatus, setRenderStatus] = useState('idle');
  const [toneCutoff, setToneCutoff] = useState(400);
  const [spaceAmount, setSpaceAmount] = useState(0);
  const [textureAmount, setTextureAmount] = useState(0);
  const [shuttleDirection, setShuttleDirection] = useState(0);
  const sourceTrackId = pendingTrackId || activeTrackId;
  const sourceTrack = useMemo(
    () => sourceTrackId ? getTrackById(sourceTrackId) : null,
    [sourceTrackId],
  );
  const {
    graphReady,
    signalStore,
    resumeAudio,
    rampOutput,
    restoreOutput,
  } = useAudioProcessing({
    audioRef,
    toneCutoff,
    spaceAmount,
    textureAmount,
    volume,
    isPlaying,
  });
  const {
    waveform,
    status: waveformStatus,
    error: waveformError,
  } = useTrackWaveform(sourceTrack);
  const {
    audioReady,
    currentTime,
    duration,
    loadStatus,
    loadError,
    reportFailure,
    seek,
    stopAndSilence,
  } = useAudioClock({
    audioRef,
    fallbackDuration: sourceTrack?.durationHint || 120,
    isPlaying,
    repeat: loopEnabled,
    loopRange,
    playbackRate,
    sourceId: sourceTrack?.id || '',
    sourceUrl: sourceTrack?.audioUrl || '',
    sourceName: sourceTrack ? sourceTrack.title + ' / ' + sourceTrack.license : '',
    setIsPlaying,
    onNext: () => setIsPlaying(false),
    volume,
    rampOutput,
    restoreOutput,
  });
  const returnCueKey = lastCueKey === 'B' && cuePointB != null
    ? 'B'
    : cuePointA != null
      ? 'A'
      : cuePointB != null
        ? 'B'
        : lastCueKey;
  const cuePoint = returnCueKey === 'B' ? cuePointB : cuePointA;
  // Compatibility view model for the existing loop/capture renderer. The
  // active cue is the most recently set cue, with the other cue as fallback.
  const capture = useMemo(() => {
    if (loopRange) return { start: loopRange.start, end: loopRange.end };
    if (cuePoint == null) return { start: null, end: null };
    return { start: cuePoint, end: null };
  }, [cuePoint, loopRange]);
  const controlsReady = phase === DECK_PHASE.ENGAGED
    && Boolean(activeTrackId)
    && audioReady
    && loadStatus === 'ready';

  const cancelReturnMotion = useCallback(() => {
    if (returnAnimationRef.current) cancelAnimationFrame(returnAnimationRef.current);
    returnAnimationRef.current = null;
    setReturnPulse(false);
  }, []);

  const clearCuePoints = useCallback(() => {
    setCuePointA(null);
    setCuePointB(null);
    setLastCueKey('A');
  }, []);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  useEffect(() => () => {
    if (returnAnimationRef.current) cancelAnimationFrame(returnAnimationRef.current);
  }, []);

  useEffect(() => {
    if (phase !== DECK_PHASE.ENGAGED && phase !== DECK_PHASE.EJECTING) setIsPlaying(false);
  }, [phase]);

  useEffect(() => {
    if (phase === DECK_PHASE.ENGAGED) setPlayedUntil((previous) => Math.max(previous, currentTime));
    else if (phase === DECK_PHASE.STANDBY) setPlayedUntil(0);
  }, [currentTime, phase]);

  const commit = useCallback((next) => {
    frameRef.current = next;
    setFrame(next);
  }, []);

  const stopAnimation = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const stopBayMotion = useCallback(() => {
    if (bayMotionRafRef.current) cancelAnimationFrame(bayMotionRafRef.current);
    bayMotionRafRef.current = null;
  }, []);

  useEffect(() => () => {
    stopAnimation();
    stopBayMotion();
  }, [stopAnimation, stopBayMotion]);

  const setBayTarget = useCallback((target) => {
    const motion = bayMotionRef.current;
    motion.target = target;
    if (bayMotionRafRef.current) return;
    motion.last = performance.now();
    const tick = (now) => {
      const dt = Math.min((now - motion.last) / 1000, .033);
      motion.last = now;
      const acceleration = (motion.target - motion.value) * 25 - motion.velocity * 10;
      motion.velocity += acceleration * dt;
      motion.value += motion.velocity * dt;
      const value = clamp(motion.value, 0, 1);
      const settled = Math.abs(motion.target - motion.value) < .002 && Math.abs(motion.velocity) < .002;
      const lidPulse = motion.target > .01 ? clamp(value) : settled ? 0 : 1;
      commit({
        ...frameRef.current,
        bayOpen: value,
        lidPulse,
      });
      if (settled) {
        motion.value = motion.target;
        motion.velocity = 0;
        bayMotionRafRef.current = null;
        return;
      }
      bayMotionRafRef.current = requestAnimationFrame(tick);
    };
    bayMotionRafRef.current = requestAnimationFrame(tick);
  }, [commit]);

  const animateReturn = useCallback((id) => {
    stopAnimation();
    // A cancelled mechanical load cannot leave an audio identity behind.
    // Invalid drops never set pendingTrackId, so this is also safe for the
    // ordinary drag-return path.
    setPendingTrackId(null);
    setActiveTrackId(null);
    const start = performance.now();
    const current = frameRef.current.tapes.find((t) => t.id === id) || HOME.find((t) => t.id === id);
    const home = HOME.find((t) => t.id === id);
    const initialBay = frameRef.current.bayOpen;
    const run = (now) => {
      const p = reducedMotion ? 1 : clamp((now - start) / 240);
      const e = easeOut(p);
      const returning = {
        ...current,
        x: lerp(current.x, home.x, e),
        y: lerp(current.y, home.y, e),
        rotation: lerp(current.rotation, home.rotation, e),
        scale: home.scale ?? 1,
        opacity: 1,
        visible: true,
      };
      commit({
        ...frameRef.current,
        bayOpen: lerp(initialBay, 0, e),
        lidPulse: p < 1 ? 1 : 0,
        embed: 0,
        lock: 0,
        tapes: frameRef.current.tapes.map((t) => t.id === id ? returning : t),
      });
      if (p < 1) rafRef.current = requestAnimationFrame(run);
      else { rafRef.current = null; setPhase(DECK_PHASE.STANDBY); }
    };
    bayMotionRef.current.value = 0;
    bayMotionRef.current.velocity = 0;
    bayMotionRef.current.target = 0;
    rafRef.current = requestAnimationFrame(run);
  }, [commit, reducedMotion, stopAnimation]);

  const animateInsert = useCallback((id, { immediate = false } = {}) => {
    stopAnimation();
    const track = getTrackByCassetteId(id);
    setPendingTrackId(track.id);
    setActiveTrackId(null);
    setIsPlaying(false);
    setCapturedMaterial(null);
    setCaptureStatus('idle');
    setRenderStatus('idle');
    setLoopEnabled(false);
    setLoopRange(null);
    clearCuePoints();
    setPlayedUntil(0);
    setPlaybackRate(1);
    setToneCutoff(400);
    setSpaceAmount(0);
    setTextureAmount(0);
    setShuttleDirection(0);
    const start = performance.now();
    let trackCommitted = false;
    const from = frameRef.current.tapes.find((t) => t.id === id) || HOME.find((t) => t.id === id);
    // Sibling exits must always interpolate from their positions at the
    // moment of selection. Using frameRef.current inside the RAF loop as the
    // interpolation origin compounds the delta on every frame and creates an
    // unintended acceleration.
    const siblingOrigins = new Map(
      frameRef.current.tapes
        .filter((t) => t.id !== id)
        .map((t) => [t.id, { ...t }]),
    );
    const initialBay = frameRef.current.bayOpen;
    const initialPulse = frameRef.current.lidPulse ?? clamp(initialBay);
    const run = (now) => {
      const raw = immediate || reducedMotion ? 1 : clamp((now - start) / INSERT_TIMING.total);
      const lidSettle = easeOut(raw / INSERT_TIMING.lidSettleEnd);
      const tapeP = easeOut((raw - INSERT_TIMING.magnetStart) / (INSERT_TIMING.magnetEnd - INSERT_TIMING.magnetStart));
      const seated = easeOut((raw - INSERT_TIMING.magnetEnd) / (INSERT_TIMING.seatEnd - INSERT_TIMING.magnetEnd));
      const lockP = easeOut((raw - INSERT_TIMING.seatEnd) / (INSERT_TIMING.lockEnd - INSERT_TIMING.seatEnd));
      const close = easeInOut((raw - INSERT_TIMING.lockEnd) / (INSERT_TIMING.closeEnd - INSERT_TIMING.lockEnd));
      const view = easeInOut((raw - INSERT_TIMING.holdEnd) / (1 - INSERT_TIMING.holdEnd));
      const control = magneticControl([from.x, from.y], [INTAKE.centerX, INTAKE.receiverY]);
      const lift = qBezier([from.x, from.y], control, [INTAKE.centerX, INTAKE.receiverY], tapeP);
      const objectScale = from.scale ?? 1;
      const lidPulse = raw < INSERT_TIMING.lidSettleEnd ? lerp(initialPulse, 1, lidSettle) : 1;
      // Keep the cassette's identity in the scene while the lid is closing
      // and settling. The lid provides the physical occlusion; hiding the
      // tape at closeEnd makes it disappear before the camera handoff.
      const covered = raw >= INSERT_TIMING.holdEnd;
      const tape = {
        ...from,
        x: lerp(lift[0], INTAKE.centerX, seated),
        y: lerp(lift[1], INTAKE.receiverY, seated),
        rotation: lerp(from.rotation, 0, Math.max(tapeP, seated)),
        scale: objectScale,
        reelTurn: lockP * 90,
        opacity: 1,
        visible: !covered,
      };
      const tapes = frameRef.current.tapes.map((t) => {
        if (t.id === id) return tape;
        const origin = siblingOrigins.get(t.id) || t;
        const exitP = easeOutSoft(
          (raw - INSERT_TIMING.secondaryExitStart)
          / (INSERT_TIMING.secondaryExitEnd - INSERT_TIMING.secondaryExitStart),
        );
        const direction = origin.x < 640 ? -1 : 1;
        return {
          ...t,
          x: lerp(origin.x, origin.x + direction * SECONDARY_EXIT.outwardX, exitP),
          y: lerp(origin.y, origin.y + SECONDARY_EXIT.downwardY, exitP),
          rotation: lerp(origin.rotation, origin.rotation * .35, exitP),
          scale: origin.scale ?? 1,
          visible: exitP < 1,
        };
      });
      const bayOpen = raw < INSERT_TIMING.lockEnd
        ? lerp(initialBay, INTAKE.lidOpen, lidSettle)
        : 1 - close;
      const embed = clamp((raw - INSERT_TIMING.magnetEnd) / (INSERT_TIMING.seatEnd - INSERT_TIMING.magnetEnd));
      const lock = raw < INSERT_TIMING.lockEnd
        ? lockP
        : 1 - easeOut((raw - INSERT_TIMING.lockEnd) / .08);
      if (!trackCommitted && raw >= INSERT_TIMING.lockEnd) {
        trackCommitted = true;
        setActiveTrackId(track.id);
        setPendingTrackId(null);
      }
      commit({ view, bayOpen, lidPulse, embed, lock, tapes });
      if (raw < 1) rafRef.current = requestAnimationFrame(run);
      else {
        rafRef.current = null;
        commit({ view: 1, bayOpen: 0, lidPulse: 1, embed: 1, lock: 0, tapes: tapes.map((t) => t.id === id ? { ...t, visible: false, opacity: 1, scale: objectScale } : t) });
        setPhase(DECK_PHASE.ENGAGED);
      }
    };
    setPhase(DECK_PHASE.LOADING);
    rafRef.current = requestAnimationFrame(run);
  }, [clearCuePoints, commit, reducedMotion, stopAnimation]);

  const animateEject = useCallback(() => {
    if (phase !== DECK_PHASE.ENGAGED) return;
    stopAnimation();
    if (shuttleRafRef.current) cancelAnimationFrame(shuttleRafRef.current);
    shuttleRafRef.current = null;
    shuttleRef.current = null;
    setShuttleDirection(0);
    // Audio begins its short safety ramp immediately, while cassette identity
    // remains mounted until the physical EJECTED boundary below.
    stopAndSilence({ rampMs: 120 });
    const start = performance.now();
    const id = selectedId;
    const home = HOME.find((t) => t.id === id);
    const selectedOrigin = frameRef.current.tapes.find((t) => t.id === id) || home;
    const siblingOrigins = new Map(
      frameRef.current.tapes
        .filter((t) => t.id !== id)
        .map((t) => [t.id, { ...t }]),
    );
    const run = (now) => {
      const raw = reducedMotion ? 1 : clamp((now - start) / EJECT_TIMING.total);
      const view = 1 - easeInOut(raw / EJECT_TIMING.cameraTopEnd);
      const open = easeOut((raw - EJECT_TIMING.cameraTopEnd) / (EJECT_TIMING.lidOpenEnd - EJECT_TIMING.cameraTopEnd));
      // Preserve the original diagonal, slow mechanical travel. The paired
      // SVG clips below handle occlusion; the path itself stays continuous.
      const tapeP = easeInOut((raw - EJECT_TIMING.unlockEnd) / (EJECT_TIMING.tapeExitEnd - EJECT_TIMING.unlockEnd));
      const reclose = easeInOut((raw - EJECT_TIMING.sourcesReturnEnd) / (EJECT_TIMING.recloseEnd - EJECT_TIMING.sourcesReturnEnd));
      const ejectPose = getEjectPose({
        tapeProgress: tapeP,
        centerX: INTAKE.centerX,
        receiverY: INTAKE.receiverY,
        cavityBottom: INTAKE.cavity.bottom,
        cassetteHeight: CASSETTE_SPEC.height,
        home,
        clearance: EJECT_CLEARANCE,
      });
      const tapes = frameRef.current.tapes.map((t) => {
        if (t.id === id) return {
          ...selectedOrigin,
          // Pre-position the cassette at the receiver axis for the entire
          // eject. It becomes visually available exactly when the top view
          // hands off to the opening lid, so the bay never opens onto a blank
          // black stage. The lid itself provides the physical occlusion while
          // it is still closed; the jaws keep the cassette seated until the
          // unlock beat.
          x: ejectPose.x,
          y: ejectPose.y,
          rotation: ejectPose.rotation,
          scale: home.scale ?? 1,
          reelTurn: lerp(90, 0, tapeP),
          opacity: 1,
          visible: raw >= EJECT_TIMING.cameraTopEnd,
        };
        const returnP = easeInOut((raw - EJECT_TIMING.tapeExitEnd) / (EJECT_TIMING.sourcesReturnEnd - EJECT_TIMING.tapeExitEnd));
        const h = HOME.find((item) => item.id === t.id);
        const origin = siblingOrigins.get(t.id) || t;
        return {
          ...origin,
          x: lerp(origin.x, h.x, returnP),
          y: lerp(origin.y, h.y, returnP),
          rotation: lerp(origin.rotation, h.rotation, returnP),
          scale: h.scale ?? 1,
          // Mount the sources below the visible stage before they travel into
          // it. This prevents a visibility pop at the first visible pixel.
          visible: raw >= EJECT_TIMING.tapeExitEnd,
        };
      });
      const bayOpen = raw < EJECT_TIMING.cameraTopEnd
        ? 0
        : raw < EJECT_TIMING.lidOpenEnd
          ? open
          : raw < EJECT_TIMING.sourcesReturnEnd
            ? INTAKE.lidOpen
            : raw < EJECT_TIMING.recloseEnd
              ? 1 - reclose
              : 0;
      const embed = raw < EJECT_TIMING.unlockEnd ? 1 : 1 - tapeP;
      // Reverse the physical order: release the two pins first, then let the
      // cassette travel out. The separate interval is intentionally visible
      // at slow playback speeds.
      const jawRelease = easeInOut(
        (raw - EJECT_TIMING.jawReleaseStart)
        / (EJECT_TIMING.jawReleaseEnd - EJECT_TIMING.jawReleaseStart),
      );
      const lock = raw < EJECT_TIMING.jawReleaseStart ? 1 : 1 - jawRelease;
      commit({ view, bayOpen, lidPulse: 1, embed, lock, tapes });
      if (raw < 1) rafRef.current = requestAnimationFrame(run);
      else {
        rafRef.current = null;
        const stableTapes = buildEjectStandbyFrame(HOME);
        commit({ view: 0, bayOpen: 0, lidPulse: 0, embed: 0, lock: 0, tapes: stableTapes });
        setPendingTrackId(null);
        setActiveTrackId(null);
        clearCuePoints();
        setLoopRange(null);
        setLoopEnabled(false);
        setCapturedMaterial(null);
        setCaptureStatus('idle');
        setRenderStatus('idle');
        setPlayedUntil(0);
        setSelectedId(null);
        setPhase(DECK_PHASE.STANDBY);
      }
    };
    setPhase(DECK_PHASE.EJECTING);
    rafRef.current = requestAnimationFrame(run);
  }, [clearCuePoints, commit, phase, reducedMotion, selectedId, stopAndSilence, stopAnimation]);

  const updateTimelineFromPointer = useCallback((event) => {
    if (!controlsReady || !duration) return;
    const point = toStagePoint(event, svgRef.current);
    const ratio = clamp((point.x - 306) / 392);
    seek(ratio * duration);
  }, [controlsReady, duration, seek]);

  const handleTimelinePointerDown = useCallback((event) => {
    if (!controlsReady) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    timelineDragRef.current = true;
    updateTimelineFromPointer(event);
  }, [controlsReady, updateTimelineFromPointer]);

  const handleCycleSpeed = useCallback(() => {
    if (!controlsReady) return;
    setPlaybackRate((rate) => rate < 1.5 ? 2 : 1);
  }, [controlsReady]);

  const handleFastForward = useCallback(() => {
    if (!controlsReady) return;
    seek(clamp(currentTimeRef.current + 6, 0, duration));
  }, [controlsReady, duration, seek]);

  const updateVolumeFromPointer = useCallback((event) => {
    if (!controlsReady) return;
    const point = toStagePoint(event, svgRef.current);
    setVolume(clamp((354 - point.y) / 88));
  }, [controlsReady]);

  const handleVolumePointerDown = useCallback((event) => {
    if (!controlsReady) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    volumeDragRef.current = true;
    updateVolumeFromPointer(event);
  }, [controlsReady, updateVolumeFromPointer]);

  const handleVolumeKeyStep = useCallback((event) => {
    if (!controlsReady) return;
    setVolume((value) => {
      if (event.key === 'Home') return 0;
      if (event.key === 'End') return 1;
      return clamp(value + (event.key === 'ArrowUp' ? .05 : -.05));
    });
  }, [controlsReady]);

  const updateSpeedFromPointer = useCallback((event) => {
    if (!controlsReady) return;
    const point = toStagePoint(event, svgRef.current);
    const nextRate = clamp(1 + (444 - point.y) / 56, 1, 2);
    setPlaybackRate(nextRate < 1.5 ? 1 : 2);
  }, [controlsReady]);

  const handleSpeedPointerDown = useCallback((event) => {
    if (!controlsReady) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    speedDragRef.current = true;
    updateSpeedFromPointer(event);
  }, [controlsReady, updateSpeedFromPointer]);

  const stopShuttleMotion = useCallback(() => {
    if (shuttleRafRef.current) cancelAnimationFrame(shuttleRafRef.current);
    shuttleRafRef.current = null;
    shuttleRef.current = null;
    setShuttleDirection(0);
  }, []);

  const cancelShuttleMotion = useCallback(() => {
    if (shuttleRafRef.current) cancelAnimationFrame(shuttleRafRef.current);
    shuttleRafRef.current = null;
  }, []);

  useEffect(() => () => stopShuttleMotion(), [stopShuttleMotion]);

  const runShuttleMotion = useCallback(() => {
    if (shuttleRafRef.current || !shuttleRef.current) return;
    let previous = performance.now();
    const tick = (now) => {
      const shuttle = shuttleRef.current;
      if (!shuttle) {
        shuttleRafRef.current = null;
        return;
      }
      const detent = Math.round(Math.abs(shuttle.direction) * SHUTTLE_DETENTS);
      if (!detent || !duration) {
        shuttleRafRef.current = null;
        return;
      }
      const dt = Math.min((now - previous) / 1000, .05);
      previous = now;
      const scrubRate = Math.sign(shuttle.direction) * detent;
      const nextTime = clamp(currentTimeRef.current + scrubRate * dt, 0, duration);
      currentTimeRef.current = nextTime;
      seek(nextTime);
      if ((scrubRate < 0 && nextTime <= 0) || (scrubRate > 0 && nextTime >= duration)) {
        shuttleRafRef.current = null;
        return;
      }
      shuttleRafRef.current = requestAnimationFrame(tick);
    };
    shuttleRafRef.current = requestAnimationFrame(tick);
  }, [duration, seek]);

  const handleSeekChange = useCallback((event) => {
    if (!controlsReady) return;
    cancelReturnMotion();
    seek(Number(event.target.value));
  }, [cancelReturnMotion, controlsReady, seek]);

  const handleVolumeChange = useCallback((event) => {
    if (!controlsReady) return;
    setVolume(clamp(Number(event.target.value) / 100));
  }, [controlsReady]);

  const handleSpeedChange = useCallback((event) => {
    if (!controlsReady) return;
    setPlaybackRate(Number(event.target.value) < 1.5 ? 1 : 2);
  }, [controlsReady]);

  const handleToneChange = useCallback((event) => {
    if (!controlsReady) return;
    setToneCutoff(400 + clamp(Number(event.target.value)) * 19600);
  }, [controlsReady]);

  const handleSpaceChange = useCallback((event) => {
    if (!controlsReady) return;
    setSpaceAmount(clamp(Number(event.target.value)));
  }, [controlsReady]);

  const handleTextureChange = useCallback((event) => {
    if (!controlsReady) return;
    setTextureAmount(clamp(Number(event.target.value)));
  }, [controlsReady]);

  const handleShuttleChange = useCallback((event) => {
    if (!controlsReady) return;
    const direction = quantizeShuttleDirection(Number(event.target.value));
    if (!shuttleRef.current) shuttleRef.current = { direction, pointerId: null, moved: true };
    shuttleRef.current.direction = direction;
    if (shuttleRef.current.pointerId == null) shuttleRef.current.moved = true;
    setShuttleDirection(direction);
    if (direction === 0) cancelShuttleMotion();
    else runShuttleMotion();
  }, [cancelShuttleMotion, controlsReady, runShuttleMotion]);

  const updateShuttleFromPointer = useCallback((event) => {
    if (!controlsReady || !shuttleRef.current) return;
    const point = toStagePoint(event, svgRef.current);
    const direction = quantizeShuttleDirection(shuttleDirectionFromPointer({
      pointX: point.x,
      centerX: FRONT_GEOMETRY.shuttle.x,
      halfWidth: FRONT_GEOMETRY.shuttle.width / 2,
    }));
    shuttleRef.current.direction = direction;
    setShuttleDirection(direction);
    if (direction === 0) cancelShuttleMotion();
    else runShuttleMotion();
  }, [cancelShuttleMotion, controlsReady, runShuttleMotion]);

  const handleShuttlePointerDown = useCallback((event) => {
    if (!controlsReady) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const point = toStagePoint(event, svgRef.current);
    shuttleRef.current = { direction: 0, pointerId: event.pointerId, startX: point.x, moved: false };
    updateShuttleFromPointer(event);
  }, [controlsReady, updateShuttleFromPointer]);

  const handleShuttlePointerMove = useCallback((event) => {
    const shuttle = shuttleRef.current;
    if (!controlsReady || !shuttle || shuttle.pointerId !== event.pointerId) return;
    const point = toStagePoint(event, svgRef.current);
    if (Math.abs(point.x - shuttle.startX) > 4) shuttle.moved = true;
    updateShuttleFromPointer(event);
  }, [controlsReady, updateShuttleFromPointer]);

  const handleShuttlePointerUp = useCallback((event) => {
    if (!controlsReady) return;
    const shuttle = shuttleRef.current;
    if (!shuttle) return;
    if (event?.pointerId != null && shuttle.pointerId != null && shuttle.pointerId !== event.pointerId) return;
    if (shuttle.moved && shuttle.pointerId != null) {
      shuttle.pointerId = null;
      return;
    }
    stopShuttleMotion();
  }, [controlsReady, stopShuttleMotion]);

  const handleShuttlePointerCancel = useCallback(() => {
    if (!controlsReady) return;
    stopShuttleMotion();
  }, [controlsReady, stopShuttleMotion]);

  const handleShuttleKeyDown = useCallback((event) => {
    if (!controlsReady || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const current = shuttleRef.current?.direction ?? 0;
    const next = event.key === 'Home'
      ? -1
      : event.key === 'End'
        ? 1
        : current + (event.key === 'ArrowRight' ? 1 / SHUTTLE_DETENTS : -1 / SHUTTLE_DETENTS);
    handleShuttleChange({ target: { value: String(next) } });
  }, [controlsReady, handleShuttleChange]);

  const handleTogglePlay = useCallback(() => {
    if (!controlsReady) return;
    resumeAudio()
      .then(() => setIsPlaying((playing) => !playing))
      .catch((error) => reportFailure('context-resume', error, { keepReady: true }));
  }, [controlsReady, reportFailure, resumeAudio]);

  const handleStopPlayback = useCallback(() => {
    if (!controlsReady) return;
    // Stop is a transport command, not a visual reset. The audio clock owns
    // the reset and the output ramp so the waveform, playhead and meter settle
    // from the same source of truth.
    stopAndSilence({ rampMs: 120, resetTime: true });
  }, [controlsReady, stopAndSilence]);

  const handleToggleLoop = useCallback(() => {
    if (!controlsReady) return;
    if (loopEnabled) {
      setLoopEnabled(false);
      return;
    }
    const nextRange = loopRange
      || (cuePoint != null
        ? normalizeLoop(cuePoint, currentTime, duration)
        : normalizeLoop(currentTime, currentTime + DEFAULT_LOOP_LENGTH, duration));
    if (!nextRange) return;
    setLoopRange(nextRange);
    setLoopEnabled(true);
  }, [controlsReady, cuePoint, currentTime, duration, loopEnabled, loopRange]);

  const handleMarkCapture = useCallback(() => {
    if (!controlsReady) return;
    if (cuePoint == null) {
      setLoopEnabled(false);
      setLoopRange(null);
      setCuePointA(clampCue(currentTime, duration));
      setLastCueKey('A');
      return;
    }
    if (loopRange == null) {
      const next = normalizeLoop(cuePoint, currentTime, duration);
      if (!next) return;
      setLoopRange(next);
      return;
    }
    setLoopEnabled(false);
    setLoopRange(null);
    clearCuePoints();
  }, [clearCuePoints, controlsReady, cuePoint, currentTime, duration, loopRange]);

  const handleCuePoint = useCallback((cueKey) => {
    if (!controlsReady) return;
    cancelReturnMotion();
    const currentCue = cueKey === 'B' ? cuePointB : cuePointA;
    if (currentCue != null) {
      if (cueKey === 'B') setCuePointB(null);
      else setCuePointA(null);
      setLoopEnabled(false);
      setLoopRange(null);
      setCapturedMaterial(null);
      setCaptureStatus('idle');
      return;
    }
    if (cueKey === 'B') setCuePointB(clampCue(currentTime, duration));
    else setCuePointA(clampCue(currentTime, duration));
    setLastCueKey(cueKey);
    // A/B cues are points, not loop intervals. Clear the existing loop and
    // material state so the front surface cannot show stale editing evidence.
    setLoopEnabled(false);
    setLoopRange(null);
    setCapturedMaterial(null);
    setCaptureStatus('idle');
  }, [cancelReturnMotion, controlsReady, cuePointA, cuePointB, currentTime, duration]);

  const handleReturnToMark = useCallback(() => {
    if (!controlsReady || cuePoint == null) return false;
    if (returnAnimationRef.current) cancelAnimationFrame(returnAnimationRef.current);
    const from = clamp(currentTimeRef.current, 0, duration);
    const target = clampCue(cuePoint, duration);
    const distance = Math.abs(target - from);
    if (distance < .01) {
      seek(target);
      currentTimeRef.current = target;
      setReturnPulse(false);
      return true;
    }
    const start = performance.now();
    const returnDuration = reducedMotion ? 0 : 180;
    setReturnPulse(true);
    const run = (now) => {
      const progress = returnDuration === 0 ? 1 : clamp((now - start) / returnDuration);
      const eased = 1 - (1 - progress) ** 3;
      const nextTime = from + (target - from) * eased;
      currentTimeRef.current = nextTime;
      seek(nextTime);
      if (progress < 1) {
        returnAnimationRef.current = requestAnimationFrame(run);
        return;
      }
      currentTimeRef.current = target;
      seek(target);
      returnAnimationRef.current = null;
      setReturnPulse(false);
    };
    returnAnimationRef.current = requestAnimationFrame(run);
    return true;
  }, [controlsReady, cuePoint, duration, reducedMotion, seek]);

  const handleCaptureCommit = useCallback(() => {
    if (!canDispatchFrontIntent(FRONT_INTENTS.CAPTURE_COMMIT, {
      controlsReady,
      capture: loopRange,
    })) return false;
    try {
      const material = snapshotCapture(activeTrackId, loopRange, {
        volume,
        tone: toneCutoff,
        space: spaceAmount,
        texture: textureAmount,
        rate: playbackRate,
      });
      setCapturedMaterial(material);
      setCaptureStatus('committed');
      return true;
    } catch (error) {
      setCaptureStatus('invalid');
      reportFailure('capture-commit', error, { keepReady: true });
      return false;
    }
  }, [activeTrackId, controlsReady, loopRange, playbackRate, reportFailure, spaceAmount, textureAmount, toneCutoff, volume]);

  const dispatchFrontIntent = useCallback((intent) => {
    const state = {
      controlsReady,
      phase,
      selectedId,
      markTime: cuePoint,
      capture: loopRange,
    };
    if (!canDispatchFrontIntent(intent, state)) return false;
    switch (intent.type) {
      case FRONT_INTENTS.TRANSPORT_STOP:
        handleStopPlayback();
        return true;
      case FRONT_INTENTS.TRANSPORT_TOGGLE:
        handleTogglePlay();
        return true;
      case FRONT_INTENTS.MARK_A:
        handleCuePoint('A');
        return true;
      case FRONT_INTENTS.MARK_B:
        handleCuePoint('B');
        return true;
      case FRONT_INTENTS.RETURN_TO_MARK:
        return handleReturnToMark();
      case FRONT_INTENTS.CAPTURE_COMMIT:
        return handleCaptureCommit();
      case FRONT_INTENTS.MACHINE_EJECT:
        animateEject();
        return true;
      default:
        return false;
    }
  }, [animateEject, controlsReady, cuePoint, handleCaptureCommit, handleCuePoint, handleReturnToMark, handleStopPlayback, handleTogglePlay, loopRange, phase, selectedId]);

  const handlePointerDown = useCallback((event, id) => {
    if (phase !== DECK_PHASE.STANDBY || dragRef.current || event.isPrimary === false) return;
    const point = toStagePoint(event, svgRef.current);
    const tape = frameRef.current.tapes.find((t) => t.id === id);
    if (!tape?.visible) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = { id, offsetX: tape.x - point.x, offsetY: tape.y - point.y, startX: point.x, startY: point.y };
    setHasInteracted(true);
    setSelectedId(id);
    setPhase(DECK_PHASE.DRAGGING);
  }, [phase]);

  const handlePointerMove = useCallback((event) => {
    if (volumeDragRef.current) {
      updateVolumeFromPointer(event);
      return;
    }
    if (speedDragRef.current) {
      updateSpeedFromPointer(event);
      return;
    }
    if (timelineDragRef.current) {
      updateTimelineFromPointer(event);
      return;
    }
    if (shuttleRef.current?.pointerId != null) {
      handleShuttlePointerMove(event);
      return;
    }
    const drag = dragRef.current;
    if (!drag || phase !== DECK_PHASE.DRAGGING) return;
    const point = toStagePoint(event, svgRef.current);
    const nextTape = frameRef.current.tapes.find((t) => t.id === drag.id);
    if (!nextTape) return;
    const x = point.x + drag.offsetX;
    const y = point.y + drag.offsetY;
    const overSlot = isInSnapVolume(x, y);
    setBayTarget(overSlot ? INTAKE.lidOpen : 0);
    commit({
      ...frameRef.current,
      embed: 0,
      lock: 0,
      tapes: frameRef.current.tapes.map((t) => t.id === drag.id ? {
        // The deck is a keyed physical object, not a loose card: once picked
        // up it self-levels so the two reel holes can meet the two receivers.
        ...t, x, y, rotation: 0,
      } : t),
    });
  }, [commit, handleShuttlePointerMove, phase, setBayTarget, updateSpeedFromPointer, updateTimelineFromPointer, updateVolumeFromPointer]);

  const handlePointerUp = useCallback((event) => {
    if (volumeDragRef.current) {
      volumeDragRef.current = false;
      return;
    }
    if (speedDragRef.current) {
      speedDragRef.current = false;
      return;
    }
    if (timelineDragRef.current) {
      timelineDragRef.current = false;
      return;
    }
    if (shuttleRef.current?.pointerId != null) {
      handleShuttlePointerUp(event);
      return;
    }
    const drag = dragRef.current;
    if (!drag || phase !== DECK_PHASE.DRAGGING) return;
    dragRef.current = null;
    stopBayMotion();
    const tape = frameRef.current.tapes.find((t) => t.id === drag.id);
    if (tape && isInSnapVolume(tape.x, tape.y)) animateInsert(drag.id);
    else animateReturn(drag.id);
  }, [animateInsert, animateReturn, handleShuttlePointerUp, phase, stopBayMotion]);

  const handlePointerCancel = useCallback((event) => {
    if (volumeDragRef.current) {
      volumeDragRef.current = false;
      return;
    }
    if (speedDragRef.current) {
      speedDragRef.current = false;
      return;
    }
    if (timelineDragRef.current) {
      timelineDragRef.current = false;
      return;
    }
    if (shuttleRef.current?.pointerId != null) {
      handleShuttlePointerCancel(event);
      return;
    }
    const drag = dragRef.current;
    if (!drag || phase !== DECK_PHASE.DRAGGING) return;
    dragRef.current = null;
    stopBayMotion();
    animateReturn(drag.id);
  }, [animateReturn, handleShuttlePointerCancel, phase, stopBayMotion]);

  const handleTapeKeyDown = useCallback((event, id) => {
    if (phase !== DECK_PHASE.STANDBY || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    setHasInteracted(true);
    setSelectedId(id);
    // Keyboard activation is a direct command, not a pointer gesture. Keep
    // the physical loading choreography for drag, but make the accessible
    // command immediate and confirm the resulting ready state.
    animateInsert(id, { immediate: true });
  }, [animateInsert, phase]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;
      if (phase === DECK_PHASE.DRAGGING) {
        event.preventDefault();
        handlePointerCancel();
      } else if (phase === DECK_PHASE.LOADING && selectedId) {
        event.preventDefault();
        stopAnimation();
        animateReturn(selectedId);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [animateReturn, handlePointerCancel, phase, selectedId, stopAnimation]);

  const tapeNodes = useMemo(() => frame.tapes.filter((t) => t.visible), [frame.tapes]);
  const statusAnnouncement = loadStatus === 'error'
    ? loadError
    : loadStatus === AUDIO_LOAD_STATUS.TOO_SHORT && sourceTrack
      ? `${sourceTrack.title} is too short. ${loadError}`
    : loadStatus === 'loading' && sourceTrack
      ? `Loading ${sourceTrack.title}.`
      : loadStatus === 'ready' && sourceTrack
        ? `${sourceTrack.title} ready.`
        : PHASE_STATUS[phase];
  const frontActionState = { controlsReady, phase, selectedId, markTime: cuePoint, capture: loopRange };
  const cueADisabled = !canDispatchFrontIntent(FRONT_INTENTS.MARK_A, frontActionState);
  const cueBDisabled = !canDispatchFrontIntent(FRONT_INTENTS.MARK_B, frontActionState);
  const returnDisabled = !canDispatchFrontIntent(FRONT_INTENTS.RETURN_TO_MARK, frontActionState);
  const captureDisabled = !canDispatchFrontIntent(FRONT_INTENTS.CAPTURE_COMMIT, frontActionState);
  const capturePressed = captureStatus === 'committed';
  const transportState = phase === DECK_PHASE.EJECTING
    ? 'ejecting'
    : phase === DECK_PHASE.DRAGGING || phase === DECK_PHASE.LOADING || loadStatus === AUDIO_LOAD_STATUS.LOADING
      ? 'loading'
      : loadStatus === AUDIO_LOAD_STATUS.ERROR || loadStatus === AUDIO_LOAD_STATUS.TOO_SHORT
        ? 'error'
        : isPlaying
          ? 'playing'
          : controlsReady
            ? 'ready-paused'
            : 'empty';
  const captureState = captureStatus === 'committed'
    ? 'captured'
    : loopRange?.end != null
      ? 'marked'
      : cuePoint != null
        ? 'mark-in'
        : 'idle';

  return (
    <main
      className="graphic-stage"
      data-phase={phase}
      data-view={frame.view}
      data-bay-open={frame.bayOpen}
      data-embed={frame.embed}
      data-lock={frame.lock}
      data-load-status={loadStatus}
      data-waveform-status={waveformStatus}
      data-waveform-duration={waveform?.duration || undefined}
      data-audio-graph={graphReady ? 'ready' : 'idle'}
      data-controls-ready={controlsReady ? 'true' : 'false'}
      data-transport-state={transportState}
      data-loop-state={loopEnabled ? 'armed' : 'idle'}
      data-capture-state={captureState}
      data-pending-track={pendingTrackId || undefined}
      data-active-track={activeTrackId || undefined}
      data-cue-a={cuePointA == null ? undefined : cuePointA}
      data-cue-b={cuePointB == null ? undefined : cuePointB}
      data-cue-active={returnCueKey}
      data-return-state={returnPulse ? 'active' : 'idle'}
      data-loop-enabled={loopEnabled ? 'true' : 'false'}
      data-capture-status={captureStatus}
      data-render-status={renderStatus}
      data-captured-material={capturedMaterial?.id || undefined}
    >
      <span className="graphic-sr-only" aria-live="polite" aria-atomic="true">
        {statusAnnouncement}
      </span>
      <div className="graphic-stage__frame">
        <svg
          ref={svgRef}
          className="graphic-stage__svg"
          viewBox={`0 0 ${DESIGN_VIEWPORT.width} ${DESIGN_VIEWPORT.height}`}
          preserveAspectRatio="xMidYMid meet"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          aria-label="Interactive cassette deck"
        >
        <defs>
          <filter id="deck-shadow" x="-20%" y="-20%" width="140%" height="160%">
            <feDropShadow dx="0" dy="18" stdDeviation="16" floodColor="#251416" floodOpacity=".32" />
          </filter>
          <filter id="tape-shadow" x="-20%" y="-20%" width="140%" height="160%">
            <feDropShadow dx="0" dy="12" stdDeviation="9" floodColor="#251416" floodOpacity=".34" />
          </filter>
          <filter id="stand-shadow" x="-20%" y="-20%" width="140%" height="160%">
            <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#2A1711" floodOpacity=".28" />
          </filter>
          <mask id="cassette-reel-cutouts" maskUnits="userSpaceOnUse" x="-160" y="-100" width="320" height="220">
            <rect x="-160" y="-100" width="320" height="220" fill="white" />
            <circle cx={-CASSETTE_SPEC.reelCenterX} cy="0" r={CASSETTE_SPEC.reelHoleRadius} fill="black" />
            <circle cx={CASSETTE_SPEC.reelCenterX} cy="0" r={CASSETTE_SPEC.reelHoleRadius} fill="black" />
          </mask>
          <clipPath id="bay-cavity-clip">
            <path d={`M${INTAKE.cavity.left} ${INTAKE.cavity.bottom}H${INTAKE.cavity.right}L${INTAKE.cavity.rearRight} ${INTAKE.cavity.top}H${INTAKE.cavity.rearLeft}Z`} />
          </clipPath>
          <pattern id="cassette-rib" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(90)">
            <path d="M1 0V8M5 0V8" stroke="#FFF4E6" strokeWidth="1" opacity=".6" />
          </pattern>
          <pattern id="wood-grain" width="30" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(6)">
            <rect width="30" height="18" fill="#A96332" />
            <path d="M-4 4C6 0 16 8 34 3M-6 13C8 8 18 18 36 12" fill="none" stroke="#7B4226" strokeWidth="2" opacity=".62" />
            <path d="M0 8C10 4 20 13 32 8" fill="none" stroke="#D48A4B" strokeWidth="1" opacity=".55" />
          </pattern>
          <pattern id="front-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M32 0H0V32" fill="none" stroke="#343539" strokeWidth="1" opacity=".55" />
          </pattern>
          <pattern id="industrial-plastic-grain" width="9" height="9" patternUnits="userSpaceOnUse">
            <circle cx="1.7" cy="2.2" r=".46" fill="#FFF9EE" opacity=".34" />
            <circle cx="6.4" cy="5.7" r=".38" fill="#777871" opacity=".2" />
            <circle cx="3.3" cy="8.1" r=".28" fill="#6B6C66" opacity=".15" />
          </pattern>
        </defs>
        <g className="graphic-stage__world" transform={WORLD_TO_DESIGN}>
          <g className="graphic-layer graphic-layer--deck-shadow" filter="url(#deck-shadow)">
            <DeckGraphic
              frontMode={frontMode}
              activeTrack={sourceTrack}
              controlsReady={controlsReady}
              transportState={transportState}
              captureState={captureState}
              view={frame.view}
              bayOpen={frame.bayOpen}
              lidPulse={frame.lidPulse}
              playing={isPlaying}
              currentTime={currentTime}
              playedUntil={playedUntil}
              duration={duration}
              playbackRate={playbackRate}
              repeat={loopEnabled}
              capture={capture}
              cueA={cuePointA}
              cueB={cuePointB}
              returnCueKey={returnCueKey}
              returnActive={returnPulse}
              volume={volume}
              onSeekPointerDown={handleTimelinePointerDown}
              onSeekChange={handleSeekChange}
              onVolumePointerDown={handleVolumePointerDown}
              onVolumeKeyStep={handleVolumeKeyStep}
              onVolumeChange={handleVolumeChange}
              onSpeedPointerDown={handleSpeedPointerDown}
              onSpeedChange={handleSpeedChange}
              onCycleSpeed={handleCycleSpeed}
              onTogglePlay={handleTogglePlay}
              onFrontIntent={dispatchFrontIntent}
              captureDisabled={captureDisabled}
              capturePressed={capturePressed}
              cueADisabled={cueADisabled}
              cueBDisabled={cueBDisabled}
              returnDisabled={returnDisabled}
              onToggleLoop={handleToggleLoop}
              onMarkCapture={handleMarkCapture}
              onFastForward={handleFastForward}
              onToneChange={handleToneChange}
              onSpaceChange={handleSpaceChange}
              onTextureChange={handleTextureChange}
              onShuttlePointerDown={handleShuttlePointerDown}
              onShuttlePointerMove={handleShuttlePointerMove}
              onShuttleChange={handleShuttleChange}
              onShuttleClick={handleShuttlePointerUp}
              onShuttlePointerCancel={handleShuttlePointerCancel}
              onShuttleKeyDown={handleShuttleKeyDown}
              toneCutoff={toneCutoff}
              spaceAmount={spaceAmount}
              textureAmount={textureAmount}
              shuttleDirection={shuttleDirection}
              signalStore={signalStore}
              loadStatus={loadStatus}
              waveform={waveform}
              waveformStatus={waveformStatus}
              waveformError={waveformError}
              ejectVisible={phase === DECK_PHASE.ENGAGED || (phase === DECK_PHASE.EJECTING && frame.view > .08)}
              ejectDisabled={phase !== DECK_PHASE.ENGAGED}
              onEject={animateEject}
            />
          </g>
          {phase === DECK_PHASE.STANDBY && !hasInteracted && (
            <g
              className="graphic-layer graphic-layer--intake-hint"
              aria-hidden="true"
              pointerEvents="none"
            >
              <g className="graphic-intake-hint">
                <path className="graphic-intake-hint__arrow graphic-intake-hint__arrow--one" d="M624 528L640 512L656 528" />
                <path className="graphic-intake-hint__arrow graphic-intake-hint__arrow--two" d="M624 514L640 498L656 514" />
                <path className="graphic-intake-hint__arrow graphic-intake-hint__arrow--three" d="M624 500L640 484L656 500" />
              </g>
            </g>
          )}
          {/* Depth order: shell -> seated cassette -> bay hardware -> lid. */}
          {tapeNodes.map((tape) => {
            const ejectLayer = tape.id === selectedId
              ? getEjectLayer({
                phase,
                view: frame.view,
                embed: frame.embed,
                pose: tape,
                cavityBottom: INTAKE.cavity.bottom,
                width: CASSETTE_SPEC.width,
                height: CASSETTE_SPEC.height,
                clearance: EJECT_CLEARANCE,
              })
              : 'seated';
            const isForegroundEject = tape.id === selectedId && ejectLayer === 'foreground';
            if (isForegroundEject) return null;
            const inBay = tape.id === selectedId && (
              (phase === DECK_PHASE.LOADING && frame.embed > .02)
              // During eject the cassette stays in the cavity until the
              // physical unlock beat. After that beat the same pose is drawn
              // once as a complete foreground entity, never split by a fixed
              // horizontal clip while it travels diagonally.
              || (phase === DECK_PHASE.EJECTING && ejectLayer === 'seated')
            );
            return (
              <g
                key={tape.id}
                className="graphic-layer graphic-layer--cassette-seated"
                clipPath={inBay ? 'url(#bay-cavity-clip)' : undefined}
              >
                <CassetteGraphic
                  tape={tape}
                  holding={phase === DECK_PHASE.DRAGGING && selectedId === tape.id}
                  onPointerDown={(event) => handlePointerDown(event, tape.id)}
                  onKeyDown={(event) => handleTapeKeyDown(event, tape.id)}
                />
              </g>
            );
          })}
          <g className="graphic-layer graphic-layer--bay-hardware">
            <BayPocketOverlay view={frame.view} lock={frame.lock} />
          </g>
          <g className="graphic-layer graphic-layer--lid-and-guide">
            <DeckLidOverlay view={frame.view} bayOpen={frame.bayOpen} lidPulse={frame.lidPulse} />
          </g>
          {/* Once the jaws release, the same pose continues as one complete
              foreground entity. The handoff is a depth change at a physical
              beat, not a new trajectory or a partial cassette clipped at the
              bay edge. */}
          {tapeNodes.filter((tape) => (
            tape.id === selectedId
            && shouldRenderEjectExterior({
              phase,
              view: frame.view,
              embed: frame.embed,
              pose: tape,
              cavityBottom: INTAKE.cavity.bottom,
              width: CASSETTE_SPEC.width,
              height: CASSETTE_SPEC.height,
              clearance: EJECT_CLEARANCE,
            })
          )).map((tape) => (
            <g
              key={`eject-exterior-${tape.id}`}
              className="graphic-layer graphic-layer--cassette-eject-foreground"
            >
              <CassetteGraphic tape={tape} interactive={false} />
            </g>
          ))}
        </g>
        </svg>
      </div>
      <audio
        ref={audioRef}
        className="graphic-audio-source"
        preload="auto"
        aria-label={sourceTrack ? sourceTrack.title + ' audio source' : 'Cassette deck audio source'}
      />
    </main>
  );
}
