import { useCallback, useEffect, useRef, useState } from 'react';
import { formatTime } from '../../music/time.js';
import { useSignalLevel } from '../../music/useSignalLevel.js';
import { createWaveformPlaceholder } from '../../music/waveform-cache.js';
import { balanceStereoWaveformForDisplay } from '../../music/waveform-display.js';
import {
  buildMirroredWaveformPath,
  getStereoWaveformLaneGeometry,
} from '../../music/waveform-render.js';
import {
  FRONT_INTENTS,
  FRONT_INTENT_SOURCES,
  createFrontIntent,
} from './action-contract.js';
import {
  FRONT_COLORS as C,
  FRONT_GEOMETRY as G,
  EJECT_HEIGHT,
  EJECT_SIDEWALL_HEIGHT,
  EJECT_SIDEWALL_OFFSET_Y,
  PLAY_DIAL_RADIUS_FACTOR,
  TOGGLE_SIDEWALL_OFFSET_Y,
  clamp,
  knobAngle,
  pointOnKnob,
  ratioFromTime,
} from './front-reference-geometry.js';
import {
  nextValueFromWheel,
  quantizeControlValue,
  SHUTTLE_DETENT_STEP,
  shouldIgnoreSecondTouch,
  valueFromVerticalDrag,
} from './control-inputs.js';
import ToneDial from './ToneDial.jsx';
import { WORLD_FRAME } from '../../design-viewport.js';

const FONT = "'Barlow', 'Helvetica Neue', Arial, sans-serif";
const EMPTY_WAVEFORM = createWaveformPlaceholder();
const VOLUME_DETENT_STEP = 10;
const VOLUME_DETENT_COUNT = 100 / VOLUME_DETENT_STEP;
const METER_COLUMNS = [
  [.35, .52, .68, .8, .9],
  [.28, .48, .62, .76, .86],
  [.42, .57, .7, .82, .94],
  [.24, .44, .58, .7, .8],
  [.32, .5, .66, .78, .9],
  [.2, .4, .55, .68, .82],
];

const teNum = (value) => String(value).replace(/1/g, 'I');
const displayTime = (value) => teNum(formatTime(value));
const worldLength = (value) => value / WORLD_FRAME.scale;

function Label({ x, y, children, fill = C.cream, size = 8, anchor = 'start', spacing = 1.2, className, ...props }) {
  return <text className={className} x={x} y={y} fill={fill} textAnchor={anchor} fontFamily={FONT} fontSize={size} letterSpacing={spacing} {...props}>{children}</text>;
}

function ShapePanel({ toneValue, spaceAmount, textureAmount, disabled = false }) {
  const railTop = G.leftRail.y + 50;
  const railBottom = G.leftRail.y + G.leftRail.height - 78;
  const railHeight = railBottom - railTop;
  // Keep the three tracks inside one Shape well with one shared spacing rule:
  // outer padding equals the gap between neighbouring tracks. That keeps the
  // rails balanced instead of spreading the center while pinning the edges.
  const markerWidth = 22;
  const trackGap = (G.leftRail.width - markerWidth * 3) / 4;
  const trackHalfWidth = markerWidth / 2;
  const railXs = [
    G.leftRail.x + trackGap + markerWidth / 2,
    G.leftRail.x + trackGap * 2 + markerWidth * 1.5,
    G.leftRail.x + trackGap * 3 + markerWidth * 2.5,
  ];
  const params = [
    { key: 'tone', label: 'TONE', value: clamp(toneValue), color: C.orange },
    { key: 'space', label: 'SPACE', value: clamp(spaceAmount), color: C.blue },
    { key: 'texture', label: 'TEXTURE', value: clamp(textureAmount), color: C.ochre },
  ];
  const points = params.map((param, index) => [railXs[index], railBottom - param.value * railHeight]);
  const curve = `M${points[0][0]} ${points[0][1]} C${points[0][0] + 24} ${points[0][1]} ${points[1][0] - 24} ${points[1][1]} ${points[1][0]} ${points[1][1]} S${points[2][0] - 24} ${points[2][1]} ${points[2][0]} ${points[2][1]}`;
  const showCurve = Math.max(...params.map((param) => param.value)) - Math.min(...params.map((param) => param.value)) > 0.06;

  return (
    <g className="reference-front__shape-panel" data-screen-module="shape">
      <rect className="reference-front__screen-module-well" x={G.leftRail.x} y={G.leftRail.y} width={G.leftRail.width} height={G.leftRail.height} rx={G.leftRail.radius} fill={C.inkDeep} stroke="#4C4E51" strokeWidth="2" />
      <Label x={G.leftRail.x + 16} y={G.leftRail.y + 25} fill={C.muted} size={7} spacing="1.4">SHAPE</Label>
      {showCurve && <path className="reference-front__shape-curve" d={curve} fill="none" stroke="#7A4B57" strokeWidth="1.05" opacity=".5" />}
      {params.map((param, index) => {
        const x = railXs[index];
        const markerY = railBottom - param.value * railHeight;
        return (
          <g key={param.key} data-shape-param={param.key} data-shape-track={index + 1}>
            {Array.from({ length: 18 }).map((_, tick) => {
              const y = railTop + (tick / 17) * railHeight;
              return <path key={tick} d={`M${x - trackHalfWidth} ${y}H${x + trackHalfWidth}`} stroke={C.panelRule} strokeWidth="1" opacity={tick % 2 === 0 ? '.72' : '.44'} />;
            })}
            <rect className="reference-front__shape-marker" x={x - markerWidth / 2} y={markerY - 3.5} width={markerWidth} height="7" rx="1" fill={disabled ? C.muted : param.color} opacity={disabled ? '.42' : '.94'} />
            <Label x={x} y={G.leftRail.y + G.leftRail.height - 28} fill={C.muted} size={5} anchor="middle" spacing=".35">{param.label}</Label>
            <Label x={x} y={G.leftRail.y + G.leftRail.height - 12} fill={param.color} size={5.8} anchor="middle" spacing=".35">{Math.round(param.value * 100)}</Label>
          </g>
        );
      })}
    </g>
  );
}

function Screw({ cx, cy }) {
  return (
    <g className="reference-front__screw" pointerEvents="none">
      <circle className="reference-front__screw-ring" cx={cx} cy={cy} r="8" fill={C.body} stroke="#90938D" strokeWidth="1.5" />
      <circle className="reference-front__screw-face" cx={cx} cy={cy} r="5.5" fill="#B9B8B1" stroke="#747872" strokeWidth="1" />
      <path className="reference-front__screw-slot" d={`M${cx - 3.1} ${cy}H${cx + 3.1}M${cx} ${cy - 3.1}V${cy + 3.1}`} stroke="#5D615C" strokeWidth="1.4" strokeLinecap="round" />
    </g>
  );
}

function SemanticRange({ x, y, width, height, value, min, max, step, label, disabled = false, onChange, onActivate, onPointerDown, onPointerMove: onRangePointerMove, onPointerUp, onPointerCancel, onKeyDown: onRangeKeyDown, vertical = false, interaction = 'native' }) {
  const inputRef = useRef(null);
  const dragRef = useRef(null);
  const wheelRemainderRef = useRef(0);
  const valueRef = useRef(Number(value));
  const [interactionState, setInteractionState] = useState(disabled ? 'disabled' : 'idle');

  useEffect(() => {
    valueRef.current = Number(value);
  }, [value]);

  useEffect(() => {
    if (disabled) {
      dragRef.current = null;
      setInteractionState('disabled');
    } else {
      setInteractionState((state) => state === 'disabled' ? 'idle' : state);
    }
  }, [disabled]);

  const emitValue = useCallback((nextValue) => {
    if (disabled || !onChange) return;
    const next = quantizeControlValue(nextValue, min, max, step);
    valueRef.current = next;
    onChange({ target: { value: String(next) } });
  }, [disabled, max, min, onChange, step]);

  useEffect(() => {
    if (disabled || interaction !== 'rotary') return undefined;
    const node = inputRef.current;
    if (!node) return undefined;
    const handleWheel = (event) => {
      const result = nextValueFromWheel({
        value: valueRef.current,
        min,
        max,
        step,
        deltaY: event.deltaY,
        deltaMode: event.deltaMode,
        lineHeight: 16,
        pageHeight: window.innerHeight || 800,
        remainder: wheelRemainderRef.current,
      });
      wheelRemainderRef.current = result.remainder;
      if (!result.changed) return;
      event.preventDefault();
      event.stopPropagation();
      emitValue(result.value);
    };
    node.addEventListener('wheel', handleWheel, { passive: false });
    return () => node.removeEventListener('wheel', handleWheel);
  }, [disabled, emitValue, interaction, max, min, step]);

  useEffect(() => {
    const handleWindowBlur = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      setInteractionState(disabled ? 'disabled' : 'idle');
      onPointerCancel?.();
    };
    window.addEventListener('blur', handleWindowBlur);
    return () => window.removeEventListener('blur', handleWindowBlur);
  }, [disabled, onPointerCancel]);

  const handleKeyDown = (event) => {
    if (disabled || !onChange) return;
    onRangeKeyDown?.(event);
    if (event.defaultPrevented) return;
    const key = event.key;
    if (['Enter', ' '].includes(key) && onActivate) {
      event.preventDefault();
      setInteractionState('pressed');
      onActivate(event);
      return;
    }
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) return;
    event.preventDefault();
    const current = Number(valueRef.current);
    const increment = Number(step) || 1;
    const next = key === 'Home'
      ? Number(min)
      : key === 'End'
        ? Number(max)
        : current + (key === 'ArrowUp' || key === 'ArrowRight' ? increment : -increment);
    setInteractionState('focused');
    emitValue(next);
  };

  const handlePointerDown = (event) => {
    if (disabled) return;
    if (interaction !== 'rotary' && interaction !== 'fader') {
      onPointerDown?.(event);
      setInteractionState('pressed');
      return;
    }
    if (shouldIgnoreSecondTouch(dragRef.current?.pointerId, event.pointerId, event.pointerType)) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startY: event.clientY,
      startValue: valueRef.current,
      moved: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setInteractionState('pressed');
    onPointerDown?.(event);
  };

  const handlePointerMove = (event) => {
    onRangePointerMove?.(event);
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    if (Math.abs(event.clientY - drag.startY) > 4) drag.moved = true;
    emitValue(valueFromVerticalDrag({
      startValue: drag.startValue,
      deltaY: event.clientY - drag.startY,
      min,
      max,
      step,
    }));
  };

  const finishPointer = (event, cancelled = false) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event?.pointerId) {
      if (cancelled) onPointerCancel?.(event);
      else onPointerUp?.(event);
      setInteractionState(disabled ? 'disabled' : 'idle');
      return;
    }
    if (event.currentTarget.hasPointerCapture?.(drag.pointerId)) event.currentTarget.releasePointerCapture(drag.pointerId);
    dragRef.current = null;
    setInteractionState(disabled ? 'disabled' : event.currentTarget === document.activeElement ? 'focused' : 'idle');
    if (cancelled) onPointerCancel?.(event);
    else {
      onPointerUp?.(event);
      if (!drag.moved) onActivate?.(event);
    }
  };

  const handlePointerEnter = () => {
    if (!disabled && !dragRef.current) setInteractionState('hover');
  };

  const handlePointerLeave = () => {
    if (!disabled && !dragRef.current) setInteractionState('idle');
  };

  return (
    <foreignObject x={x} y={y} width={width} height={height} overflow="visible">
      <div xmlns="http://www.w3.org/1999/xhtml" className="reference-front__semantic-host">
        <input
          ref={inputRef}
          className={`reference-front__semantic-control reference-front__semantic-range${vertical ? ' reference-front__semantic-range--vertical' : ''}`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={label}
          disabled={disabled}
          data-state={disabled ? 'disabled' : interactionState}
          data-value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={(event) => finishPointer(event)}
          onPointerCancel={(event) => finishPointer(event, true)}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          onFocus={() => !disabled && setInteractionState('focused')}
          onBlur={() => !disabled && !dragRef.current && setInteractionState('idle')}
        />
      </div>
    </foreignObject>
  );
}

function SemanticButton({ x, y, size, hitWidth, hitHeight, label, pressed = false, disabled = false, dataAction, visual = 'button', controlKind, onClick, onIntent, onPointerDown, onPointerUp, onPointerCancel, onKeyDown, onKeyUp }) {
  const semanticWidth = hitWidth ?? size;
  const semanticHeight = hitHeight ?? size;
  const [interactionState, setInteractionState] = useState(disabled ? 'disabled' : 'idle');

  useEffect(() => {
    if (disabled) setInteractionState('disabled');
    else setInteractionState((state) => state === 'disabled' ? 'idle' : state);
  }, [disabled]);

  const commit = (source) => {
    if (onIntent) onIntent(source);
    else onClick?.();
  };

  const handlePointerDown = (event) => {
    if (disabled) return;
    setInteractionState('pressed');
    onPointerDown?.(event);
  };

  const restorePointerState = (event) => {
    if (disabled) return;
    setInteractionState(event.currentTarget.matches(':focus') ? 'focused' : 'idle');
    onPointerUp?.(event);
  };

  const handlePointerCancel = (event) => {
    if (!disabled) setInteractionState('idle');
    onPointerCancel?.(event);
  };

  const handleKeyDown = (event) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || disabled || event.repeat || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    setInteractionState('pressed');
    commit(FRONT_INTENT_SOURCES.KEYBOARD);
  };

  const handleKeyUp = (event) => {
    if (!disabled && ['Enter', ' '].includes(event.key)) setInteractionState('focused');
    onKeyUp?.(event);
  };

  return (
    <foreignObject x={x - semanticWidth / 2} y={y - semanticHeight / 2} width={semanticWidth} height={semanticHeight} overflow="visible">
      <div xmlns="http://www.w3.org/1999/xhtml" className="reference-front__semantic-host">
        <button
          type="button"
          className="reference-front__semantic-control reference-front__semantic-button"
          aria-label={label}
          aria-pressed={pressed}
          data-action={dataAction}
          data-visual={visual}
          data-control-kind={controlKind}
          data-state={disabled ? 'disabled' : interactionState}
          data-value={disabled ? 'disabled' : pressed ? 'active' : 'idle'}
          disabled={disabled}
          onClick={() => !disabled && commit(FRONT_INTENT_SOURCES.POINTER)}
          onPointerDown={handlePointerDown}
          onPointerUp={restorePointerState}
          onPointerCancel={handlePointerCancel}
          onPointerEnter={() => !disabled && setInteractionState('hover')}
          onPointerLeave={() => !disabled && setInteractionState((state) => state === 'pressed' ? state : 'idle')}
          onFocus={() => !disabled && setInteractionState('focused')}
          onBlur={() => !disabled && setInteractionState('idle')}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
        />
      </div>
    </foreignObject>
  );
}

function EjectControl({ x, y, width, height, pressed = false, disabled = false }) {
  // Geometry anchors are world-space values, while the EJECT anatomy is
  // authored in design units. Keep the face, sidewall, and emboss mark at
  // the same scale so the sidewall cannot grow into a second lower button.
  const ejectScale = height / EJECT_HEIGHT;
  const unit = (value) => value * ejectScale;
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const icon = disabled ? '#9FA19B' : '#A2A49E';
  const faceX = x - halfWidth + unit(2);
  const faceY = y - halfHeight;
  const faceWidth = width - unit(4);
  const faceHeight = height - unit(6);
  const markTop = y - unit(10);
  const markPath = `M${x - unit(9)} ${markTop + unit(8)}L${x} ${markTop - unit(1)}L${x + unit(9)} ${markTop + unit(8)}Z`;
  return (
    <g className={`reference-front__eject-key${pressed ? ' is-pressed' : ''}${disabled ? ' is-disabled' : ''}`} data-control-kind="eject-key" pointerEvents="none" aria-hidden="true">
      <g filter="url(#reference-front-toggle-shadow)">
        <rect className="reference-front__eject-sidewall" x={faceX - unit(1)} y={faceY + unit(EJECT_SIDEWALL_OFFSET_Y)} width={width - unit(2)} height={unit(EJECT_SIDEWALL_HEIGHT)} rx={unit(8)} />
        <rect className="reference-front__eject-face" x={faceX} y={faceY} width={faceWidth} height={faceHeight} rx={unit(7)} />
        <rect className="reference-front__eject-highlight" x={faceX + unit(4)} y={faceY + unit(3)} width={faceWidth - unit(8)} height={faceHeight - unit(7)} rx={unit(5)} />
      </g>
      <g className="reference-front__eject-mark">
        <path d={markPath} fill="#faf8f1" transform={`translate(0 ${-unit(.8)})`} />
        <path d={markPath} fill={icon} transform={`translate(0 ${unit(.8)})`} />
        <rect x={x - unit(11)} y={y + unit(7)} width={unit(22)} height={unit(3)} rx={unit(1)} fill="#faf8f1" transform={`translate(0 ${-unit(.8)})`} />
        <rect x={x - unit(11)} y={y + unit(7)} width={unit(22)} height={unit(3)} rx={unit(1)} fill={icon} transform={`translate(0 ${unit(.8)})`} />
      </g>
    </g>
  );
}

function Knob({ id, label, value, min = 0, max = 1, color, secondaryColor, cx, cy, radius = 39, repeat = false, disabled = false }) {
  const angle = knobAngle(value, min, max);
  const [px, py] = pointOnKnob(cx, cy, radius * .59, angle);
  const ticks = Array.from({ length: 11 });
  return (
    <g className={`reference-front__knob${repeat ? ' is-active' : ''}${disabled ? ' is-disabled' : ''}`} data-control-kind="knob" pointerEvents="none" aria-hidden="true">
      {ticks.map((_, index) => {
        const tickAngle = -135 + index * 27;
        const [x1, y1] = pointOnKnob(cx, cy, radius + 2, tickAngle);
        const [x2, y2] = pointOnKnob(cx, cy, radius + 8, tickAngle);
        return <path key={index} d={`M${x1} ${y1}L${x2} ${y2}`} stroke={index === 5 ? C.ink : C.muted} strokeWidth={index === 5 ? 2.2 : 1.2} strokeLinecap="round" />;
      })}
      {secondaryColor && <circle cx={cx} cy={cy} r={radius + 8} fill="none" stroke={secondaryColor} strokeWidth="3" strokeDasharray="34 180" transform={`rotate(-135 ${cx} ${cy})`} />}
      <circle cx={cx} cy={cy} r={radius + 8} fill="none" stroke={color} strokeWidth="3" strokeDasharray="34 180" strokeDashoffset="-52" transform={`rotate(-135 ${cx} ${cy})`} />
      <circle cx={cx} cy={cy} r={radius} fill={C.bodyHi} stroke="#767A75" strokeWidth="2" />
      <circle cx={cx} cy={cy} r={radius - 5} fill={C.panel} stroke="#34373A" strokeWidth="2" />
      <circle cx={cx} cy={cy} r={radius - 10} fill={C.body} stroke={color} strokeWidth="3" />
      <circle cx={cx} cy={cy} r={radius - 16} fill="#D4D2CA" />
      <path d={`M${cx} ${cy}L${px} ${py}`} stroke={C.ink} strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="3" fill={C.ink} />
      <Label className="reference-front__hardware-label" x={cx} y={cy + radius + 19} anchor="middle" fill={C.ink} size={8} spacing="1.4">{label}</Label>
    </g>
  );
}

function TransportButton({ x, y, size = 44, label, pressed, disabled = false, showLabel = true, variant = 'square', tone = 'default' }) {
  const half = size / 2;
  const isToggle = variant === 'toggle';
  const indicatorY = y - half - 9;
  const indicatorRadius = Math.max(3, size * .055);
  return (
    <g className={`reference-front__transport reference-front__action-key${isToggle ? ' reference-front__toggle-key' : ''}${pressed ? ' is-active' : ''}${disabled ? ' is-disabled' : ''}`} data-control-kind={isToggle ? 'toggle-key' : 'transport'} data-tone={tone} pointerEvents="none" aria-hidden="true">
      <g filter={isToggle ? 'url(#reference-front-toggle-shadow)' : 'url(#reference-front-key-shadow)'}>
        {isToggle ? <>
          <circle className="reference-front__toggle-key-sidewall" cx={x} cy={y + TOGGLE_SIDEWALL_OFFSET_Y} r={half} />
          <circle className="reference-front__toggle-key-face" cx={x} cy={y} r={half - 1} />
          <circle className="reference-front__toggle-key-highlight" cx={x} cy={y - .75} r={half - 4} />
        </> : <>
          <rect x={x - half} y={y - half} width={size} height={size} rx={size * .11} fill="#B7B7B0" stroke="var(--front-seam-control)" strokeWidth="2" />
        </>}
      </g>
      {isToggle && <circle className="reference-front__toggle-key-indicator" cx={x} cy={indicatorY} r={indicatorRadius} />}
      {!isToggle && showLabel && <Label className="reference-front__engraved-label" x={x} y={y + half + 19} anchor="middle" fill={C.ink} size={7} spacing=".7">{label}</Label>}
    </g>
  );
}

function PlayDial({ x, y, size = 92, playing = false, disabled = false }) {
  const radius = size * PLAY_DIAL_RADIUS_FACTOR;
  // Keep the dial proportions tied to the reference's seam, not the overall
  // SVG control box. This keeps the handle, stop foot, and indicator stable
  // as the responsive front panel scales.
  const gripWidth = radius * .44;
  const gripHeight = radius * 2.06;
  const footWidth = gripWidth;
  const footHeight = radius * .11;
  const gripTop = y - gripHeight / 2;
  const gripBottom = y + gripHeight / 2;
  const indicatorY = y - radius * .865;
  const indicatorRadius = radius * .055;
  const indicatorGlowRadius = indicatorRadius * 1.6;
  const [rotation, setRotation] = useState(playing ? 180 : 0);
  const rotationRef = useRef(rotation);
  const previousPlayingRef = useRef(playing);

  useEffect(() => {
    if (previousPlayingRef.current === playing) return;
    previousPlayingRef.current = playing;
    rotationRef.current += 180;
    setRotation(rotationRef.current);
  }, [playing]);

  return (
    <g
      className={`reference-front__play-dial${disabled ? ' is-disabled' : ''}`}
      data-control-kind="play-dial"
      data-playing={playing ? 'true' : 'false'}
      pointerEvents="none"
      aria-hidden="true"
    >
      <circle className="reference-front__play-dial-face" cx={x} cy={y} r={radius * .987} />
      <circle className="reference-front__play-dial-ring" cx={x} cy={y} r={radius} />
      <g
        className="reference-front__play-dial-grip"
        style={{ '--play-dial-angle': `${rotation}deg` }}
      >
        <rect
          className="reference-front__play-dial-handle"
          x={x - gripWidth / 2}
          y={gripTop}
          width={gripWidth}
          height={gripHeight}
          rx={gripWidth * .18}
        />
        <rect
          className="reference-front__play-dial-foot"
          x={x - footWidth / 2}
          y={gripBottom - footHeight}
          width={footWidth}
          height={footHeight}
          rx={footHeight * .45}
        />
        <circle
          className="reference-front__play-dial-indicator-glow"
          cx={x}
          cy={indicatorY}
          r={indicatorGlowRadius}
        />
        <circle
          className="reference-front__play-dial-indicator"
          cx={x}
          cy={indicatorY}
          r={indicatorRadius}
        />
      </g>
    </g>
  );
}

function VolumeGlyph({ cx, cy, large = false, disabled = false }) {
  const stroke = disabled ? '#AAA8A0' : '#7C7A72';
  const half = large ? 3.2 : 5.4;
  const strokeWidth = large ? 1.7 : 2.6;
  return (
    <g className="reference-front__volume-icon" data-volume-mark={large ? 'plus' : 'minus'} aria-hidden="true" stroke={stroke} strokeLinecap="round" strokeLinejoin="round" filter="url(#reference-front-volume-engrave)">
      {large ? (
        <>
          <path d={`M${cx - half} ${cy}H${cx + half}`} fill="none" strokeWidth={strokeWidth} />
          <path d={`M${cx} ${cy - half}V${cy + half}`} fill="none" strokeWidth={strokeWidth} />
        </>
      ) : (
        <rect
          x={cx - half}
          y={cy - strokeWidth / 2}
          width={half * 2}
          height={strokeWidth}
          rx={strokeWidth / 2}
          fill={stroke}
          stroke="none"
        />
      )}
    </g>
  );
}

function ShuttleGlyph({ cx, cy, direction, disabled = false }) {
  const fill = disabled ? '#AAA8A0' : '#7C7A72';
  const tip = direction === 'rewind' ? cx - 5.2 : cx + 5.2;
  const innerTip = direction === 'rewind' ? cx - .1 : cx + .1;
  const firstBase = direction === 'rewind' ? cx - .8 : cx + .8;
  const secondBase = direction === 'rewind' ? cx + 4.4 : cx - 4.4;
  const baseTop = cy - 3.7;
  const baseBottom = cy + 3.7;
  return (
    <g
      className="reference-front__volume-icon reference-front__shuttle-icon"
      data-shuttle-mark={direction}
      aria-hidden="true"
      filter="url(#reference-front-volume-engrave)"
    >
      <path d={`M${tip} ${cy}L${firstBase} ${baseTop}V${baseBottom}Z`} fill={fill} />
      <path d={`M${innerTip} ${cy}L${secondBase} ${baseTop}V${baseBottom}Z`} fill={fill} />
    </g>
  );
}

function VolumeSlider({ value, disabled = false }) {
  const center = G.volumeSlider.x;
  const halfTrack = G.volumeSlider.width / 2;
  const thumbWidth = G.volumeSlider.thumbWidth;
  const trackStart = center - halfTrack;
  const travel = G.volumeSlider.width - thumbWidth;
  const detentValue = Math.round(clamp(value) * VOLUME_DETENT_COUNT) / VOLUME_DETENT_COUNT;
  const thumbX = trackStart + detentValue * travel;
  const thumbHeight = 24;
  const thumbY = G.volumeSlider.trackY - thumbHeight / 2;
  const discRadius = 8.5;
  const discY = G.volumeSlider.trackY;
  const discGap = 5;
  const leftDiscX = thumbX + thumbWidth / 2 - discRadius - discGap / 2;
  const rightDiscX = thumbX + thumbWidth / 2 + discRadius + discGap / 2;
  return (
    <g className={`reference-front__volume-slider${disabled ? ' is-disabled' : ''}`} data-control-kind="volume-slider" pointerEvents="none" aria-hidden="true">
      <path className="reference-front__volume-slider-track" d={`M${trackStart} ${G.volumeSlider.trackY}H${trackStart + G.volumeSlider.width}`} />
      <rect
        className="reference-front__volume-slider-thumb"
        x={thumbX}
        y={thumbY}
        width={thumbWidth}
        height={thumbHeight}
        rx={thumbHeight / 2}
        filter="url(#reference-front-volume-thumb-shadow)"
      />
      <circle className="reference-front__volume-slider-disc" cx={leftDiscX} cy={discY} r={discRadius} />
      <circle className="reference-front__volume-slider-disc" cx={rightDiscX} cy={discY} r={discRadius} />
      <VolumeGlyph cx={leftDiscX} cy={discY} disabled={disabled} />
      <VolumeGlyph cx={rightDiscX} cy={discY} large disabled={disabled} />
    </g>
  );
}

function Shuttle({ direction, disabled = false }) {
  const center = G.shuttle.x;
  const halfTrack = G.shuttle.width / 2;
  const thumbWidth = G.shuttle.thumbWidth;
  const thumbHeight = 24;
  const trackStart = center - halfTrack;
  const travel = G.shuttle.width - thumbWidth;
  const thumbX = trackStart + ((clamp(direction, -1, 1) + 1) / 2) * travel;
  const discRadius = 8.5;
  const discGap = 5;
  const discY = G.shuttle.trackY;
  const leftDiscX = thumbX + thumbWidth / 2 - discRadius - discGap / 2;
  const rightDiscX = thumbX + thumbWidth / 2 + discRadius + discGap / 2;
  return (
    <g className={`reference-front__volume-slider reference-front__shuttle${disabled ? ' is-disabled' : ''}`} data-control-kind="shuttle" pointerEvents="none" aria-hidden="true">
      <path className="reference-front__volume-slider-track" d={`M${trackStart} ${G.shuttle.trackY}H${trackStart + G.shuttle.width}`} />
      <rect className="reference-front__volume-slider-thumb" x={thumbX} y={G.shuttle.trackY - thumbHeight / 2} width={thumbWidth} height={thumbHeight} rx={thumbHeight / 2} filter="url(#reference-front-volume-thumb-shadow)" />
      <circle className="reference-front__volume-slider-disc" cx={leftDiscX} cy={discY} r={discRadius} />
      <circle className="reference-front__volume-slider-disc" cx={rightDiscX} cy={discY} r={discRadius} />
      <ShuttleGlyph cx={leftDiscX} cy={discY} direction="rewind" disabled={disabled} />
      <ShuttleGlyph cx={rightDiscX} cy={discY} direction="fast-forward" disabled={disabled} />
    </g>
  );
}

function SignalTelemetry({ signalStore, loadStatus, waveformStatus, playing }) {
  const signalLevel = useSignalLevel(signalStore);
  const meterValue = clamp(signalLevel);
  const loadReadout = loadStatus === 'error' || waveformStatus === 'error'
    ? 'FAULT'
    : loadStatus === 'too-short'
      ? 'SHORT'
    : loadStatus === 'loading' || waveformStatus === 'loading'
      ? 'LOAD'
      : loadStatus === 'ready'
        ? `${Math.round(meterValue * 100)}%`
        : '—';
  const loadReadoutColor = loadStatus === 'error' || waveformStatus === 'error'
    ? C.orange
    : loadStatus === 'loading' || waveformStatus === 'loading'
      ? C.ochre
      : C.muted;

  return (
    <g data-right-rail-layer="level">
      <Label x={G.rightRail.x + 15} y={G.rightRail.y + 32} fill={C.paper} size={8}>LEVEL</Label>
      <Label x={G.rightRail.x + G.rightRail.width - 15} y={G.rightRail.y + 32} fill={loadReadoutColor} size={7} anchor="end">{loadReadout}</Label>
      <path d={`M${G.meter.x} ${G.meter.y + G.meter.height + 8}H${G.meter.x + G.meter.width}`} stroke="#3D4145" strokeWidth="1" strokeDasharray="3 4" />
      {METER_COLUMNS.flatMap((column, columnIndex) => column.map((threshold, rowIndex) => {
        const cellWidth = G.meter.width / 9;
        const cellHeight = G.meter.height / 7;
        const active = meterValue >= threshold;
        const fill = rowIndex < 2 ? C.cream : rowIndex < 4 ? C.blue : C.orange;
        return <rect key={`${columnIndex}-${rowIndex}`} x={G.meter.x + columnIndex * cellWidth * 1.35} y={G.meter.y + G.meter.height - (rowIndex + 1) * cellHeight * 1.3} width={cellWidth * .68} height={cellHeight * .68} rx="1" fill={fill} opacity={active && playing ? 1 : .28} />;
      }))}
    </g>
  );
}

function ScreenTapeReel({ cx, cy, packRadius, playing, playbackRate, side }) {
  const world = (value) => value / WORLD_FRAME.scale;
  const reelDuration = `${Math.max(.72, 1.8 / Math.max(1, playbackRate || 1))}s`;
  return (
    <g className={`reference-front__tape-reel reference-front__tape-reel--${side}`} aria-hidden="true">
      <circle cx={cx} cy={cy} r={world(36)} fill="none" stroke="#4A4A44" strokeWidth="1.6" />
      <circle className="reference-front__tape-reel-pack" cx={cx} cy={cy} r={world(packRadius)} fill="#232321" />
      <circle className="reference-front__tape-reel-white-disc" cx={cx} cy={cy} r={world(15)} fill={C.paper} />
      <g
        className="reference-front__tape-reel-needle"
        style={{ '--reel-duration': reelDuration }}
        data-reel-motion="needle"
        data-reel-pivot="black-center"
      >
        {/* The symmetric pivot box keeps the SVG transform box centered on the
            black axle; the visible needle alone receives the rotation. */}
        <rect className="reference-front__tape-reel-pivot" x={cx - world(32)} y={cy - world(32)} width={world(64)} height={world(64)} fill="#000" opacity="0" />
        <path d={`M${cx} ${cy - world(32)}V${cy}`} stroke="#8E8E88" strokeWidth="1.6" />
      </g>
      <circle className="reference-front__tape-reel-center" cx={cx} cy={cy} r={world(3.5)} fill="#000" />
    </g>
  );
}

function ScreenTapeTransport({
  activeTrack,
  currentTime,
  duration,
  playing,
  cueA,
  cueB,
  returnActive,
  shuttleDirection,
  playbackRate,
  volume,
}) {
  const world = (value) => value / WORLD_FRAME.scale;
  const railX = G.rightRail.x;
  const railY = G.rightRail.y;
  const deckX = railX + world(12);
  const deckY = railY + world(30);
  const reelLeftX = deckX + world(39);
  const reelRightX = deckX + world(147);
  const reelY = deckY + world(39);
  const progress = ratioFromTime(currentTime, duration);
  const shuttleY = railY + world(274);
  const shuttleLeftX = railX + world(12);
  const shuttleStopX = railX + G.rightRail.width / 2 - world(4.5);
  const shuttleRightX = railX + G.rightRail.width - world(104);
  const volumeX = railX + world(12);
  const volumeY = railY + world(360);
  const volumeWidth = G.rightRail.width - world(24);
  const volumeValue = clamp(Number.isFinite(volume) ? volume : 0.78);
  const statusRows = [
    [playing, playing ? 'PLAYING' : 'PAUSED', playing ? 'RUN' : 'IDLE', C.cream, 'playing'],
    [cueA != null, 'A', cueA == null ? '—' : displayTime(cueA), C.amber, 'cue-a'],
    [cueB != null, 'B', cueB == null ? '—' : displayTime(cueB), C.cream, 'cue-b'],
    [returnActive, 'RETURN', returnActive ? 'GO' : '—', C.blue, 'return'],
  ];
  const statusCircleX = railX + world(14);
  const statusLabelX = railX + world(34);
  const statusValueX = railX + G.rightRail.width - world(14);

  return (
    <g className="reference-front__tape-transport" data-right-rail-layout="screen-html">
      <g
        className="reference-front__tape-deck"
        data-right-rail-layer="deck"
        data-playing={playing}
        style={{ '--reel-play-state': playing ? 'running' : 'paused' }}
        aria-label="Tape reels"
      >
        <ScreenTapeReel cx={reelLeftX} cy={reelY} packRadius={29.5 - progress * 12.5} playing={playing} playbackRate={playbackRate} side="left" />
        <path className="reference-front__tape-path" d={`M${reelLeftX + world(30)} ${reelY - world(7)}L${deckX + world(84)} ${reelY - world(2)}L${deckX + world(102)} ${reelY - world(2)}L${reelRightX - world(30)} ${reelY - world(7)}`} />
        <rect x={deckX + world(84)} y={reelY - world(5)} width={world(12)} height={world(10)} fill="#57574F" />
        <rect x={deckX + world(88)} y={reelY - world(2)} width={world(4)} height={world(4)} fill="#000" />
        <ScreenTapeReel cx={reelRightX} cy={reelY} packRadius={17 + progress * 12.5} playing={playing} playbackRate={playbackRate} side="right" />
      </g>

      <path className="reference-front__right-rail-separator" d={`M${railX + world(12)} ${railY + world(124)}H${railX + G.rightRail.width - world(12)}`} />
      <g className="reference-front__tape-states" data-right-rail-layer="status" aria-label="Tape state">
        {statusRows.map(([active, label, value, color, status], index) => {
          const y = railY + world(134 + index * 28);
          return (
            <g key={status} className="reference-front__screen-status" data-status={status}>
              <circle cx={statusCircleX} cy={y + world(13)} r={world(4.5)} fill={active ? color : 'none'} stroke={active ? color : C.dim} strokeWidth="1" />
              <Label x={statusLabelX} y={y + world(16)} fill={active ? C.paper : C.dim} size={6.3} spacing="1.1">{label}</Label>
              <Label className="reference-front__screen-status-value" x={statusValueX} y={y + world(16)} fill={active ? color : C.dim} size={5.7} anchor="end" spacing=".8">{value}</Label>
            </g>
          );
        })}
      </g>

      <path className="reference-front__right-rail-separator" d={`M${railX + world(12)} ${railY + world(258)}H${railX + G.rightRail.width - world(12)}`} />
      <g className="reference-front__screen-shuttle" data-right-rail-layer="shuttle" aria-label="Shuttle status">
        <g className="reference-front__screen-shuttle-glyphs" fill={shuttleDirection < 0 ? C.blue : C.dim}>
          <path d={`M${shuttleLeftX} ${shuttleY + world(29)}L${shuttleLeftX + world(9)} ${shuttleY + world(24)}V${shuttleY + world(34)}Z M${shuttleLeftX + world(11)} ${shuttleY + world(29)}L${shuttleLeftX + world(20)} ${shuttleY + world(24)}V${shuttleY + world(34)}Z`} />
        </g>
        <rect x={shuttleStopX} y={shuttleY + world(25)} width={world(9)} height={world(9)} fill={shuttleDirection === 0 ? C.paper : C.dim} />
        <g className="reference-front__screen-shuttle-glyphs" fill={shuttleDirection > 0 ? C.blue : C.dim}>
          <path d={`M${shuttleRightX + world(72)} ${shuttleY + world(24)}L${shuttleRightX + world(81)} ${shuttleY + world(29)}L${shuttleRightX + world(72)} ${shuttleY + world(34)}Z M${shuttleRightX + world(83)} ${shuttleY + world(24)}L${shuttleRightX + world(92)} ${shuttleY + world(29)}L${shuttleRightX + world(83)} ${shuttleY + world(34)}Z`} />
        </g>
      </g>

      <g className="reference-front__screen-volume" data-right-rail-layer="volume" aria-label="Volume status">
        <Label x={volumeX} y={railY + world(348)} fill={C.muted} size={7} spacing="1.4">VOLUME</Label>
        <Label x={railX + G.rightRail.width - world(12)} y={railY + world(348)} fill={C.dim} size={7} anchor="end" spacing=".6">{teNum(Math.round(volumeValue * 100))}</Label>
        <rect x={volumeX} y={volumeY} width={volumeWidth * volumeValue} height={world(24)} fill="#2E2E2A" opacity=".78" />
        {Array.from({ length: 24 }).map((_, index) => (
          <path key={index} d={`M${volumeX + index * (volumeWidth / 23)} ${volumeY}V${volumeY + world(24)}`} stroke={index / 23 <= volumeValue ? C.paper : C.dim} strokeWidth="1" opacity={index / 23 <= volumeValue ? '.86' : '.7'} />
        ))}
        <path d={`M${volumeX + volumeWidth * volumeValue} ${volumeY - world(2)}V${volumeY + world(26)}`} stroke={C.paper} strokeWidth="2" />
      </g>
    </g>
  );
}

function ReferenceFrontConsole({
  activeTrack,
  controlsReady = false,
  transportState = 'empty',
  playing,
  currentTime,
  duration,
  playbackRate,
  cueA = null,
  cueB = null,
  returnCueKey = 'A',
  returnActive = false,
  volume,
  toneCutoff,
  spaceAmount,
  textureAmount,
  shuttleDirection,
  signalStore,
  loadStatus = 'idle',
  waveform = EMPTY_WAVEFORM,
  waveformStatus = 'empty',
  waveformError = '',
  onSeekChange,
  onVolumeChange,
  onFrontIntent,
  cueADisabled = true,
  cueBDisabled = true,
  returnDisabled = true,
  onToneChange,
  onSpaceChange,
  onTextureChange,
  onShuttlePointerDown,
  onShuttlePointerMove,
  onShuttleChange,
  onShuttleClick,
  onShuttlePointerCancel,
  onShuttleKeyDown,
  ejectVisible = false,
  ejectDisabled = true,
}) {
  const [ejectPressed, setEjectPressed] = useState(false);
  const ejectIsDisabled = ejectDisabled || !ejectVisible;

  useEffect(() => {
    if (ejectIsDisabled) setEjectPressed(false);
  }, [ejectIsDisabled]);

  const releaseEjectPress = () => setEjectPressed(false);
  const pressEject = () => {
    if (!ejectIsDisabled) setEjectPressed(true);
  };
  const progress = ratioFromTime(currentTime, duration);
  const cueARatio = cueA == null ? null : ratioFromTime(cueA, duration);
  const cueBRatio = cueB == null ? null : ratioFromTime(cueB, duration);
  const plot = G.waveformPlot;
  const timeline = G.waveformTimeline;
  const toneValue = clamp((toneCutoff - 400) / (20000 - 400));
  const waveformReady = waveformStatus === 'ready';
  const waveformOpacity = waveformReady ? 1 : waveformStatus === 'error' ? .86 : .52;
  const trackTitle = activeTrack?.title?.toUpperCase() || 'NO CASSETTE';
  const trackNumber = String(activeTrack?.slot || 0).padStart(2, '0');
  // Reserve a quiet label gutter inside the workspace. The two channels must
  // read as L/R lanes first, and as a waveform shape second; otherwise a
  // dense source becomes one undifferentiated block at the machine scale.
  // One time domain drives the waveform, played/unplayed clip, playhead,
  // capture markers and seek rail. The outer plot keeps its quiet gutters,
  // but no moving element is allowed to use a different x-origin.
  const waveformX = plot.x;
  const waveformWidth = plot.width;
  const playheadX = waveformX + waveformWidth * progress;
  const lanes = getStereoWaveformLaneGeometry(plot, {
    laneHeightRatio: 131 / 266,
    topInset: 0,
    bottomOffsetRatio: 2 / 266,
  });
  const laneTopY = lanes.top.baseline;
  const laneBottomY = lanes.bottom.baseline;
  const laneAmplitude = worldLength(59.5);
  // Balance only the rendered envelope. Playback data, time mapping, and
  // stereo channel identity remain untouched.
  const [displayLeft, displayRight] = balanceStereoWaveformForDisplay(waveform.left, waveform.right, {
    // This source has a mastered fade that reads as a triangular mask at the
    // machine scale. Normalize its visual envelope locally without touching
    // the decoded audio or playback dynamics.
    forceLocalNormalization: activeTrack?.id === 'chill-lofi-inspired-loop',
  });
  const topWave = buildMirroredWaveformPath(displayLeft, { x: waveformX, baseline: laneTopY, width: waveformWidth, amplitude: laneAmplitude });
  const bottomWave = buildMirroredWaveformPath(displayRight, { x: waveformX, baseline: laneBottomY, width: waveformWidth, amplitude: laneAmplitude });
  const headX = G.waveform.x + worldLength(16);
  const headBaseline = G.waveform.y + worldLength(14 + 30 - 2);
  const headerDotY = headBaseline - worldLength(3);
  const headerRight = G.waveform.x + G.waveform.width;
  const inputX = G.waveform.x + worldLength(16);
  const inputTop = G.waveform.y + worldLength(56);
  const inputY = inputTop + worldLength(9);
  const inputWidth = worldLength(600);
  const inputWaveX = inputX + worldLength(14 + 8);
  const inputWaveWidth = inputWidth - worldLength(14 + 8 + 8 + 76 + 8 + 14);
  const inputWave = buildMirroredWaveformPath(displayLeft, { x: inputWaveX, baseline: inputY, width: inputWaveWidth, amplitude: worldLength(2.1) });
  const inputLabelX = inputWaveX + inputWaveWidth + worldLength(8 + 76);
  const minusX = inputX + inputWidth - worldLength(7);
  const signalLive = Boolean(playing);
  const transitionPx = playing ? Math.min(26, Math.abs(playbackRate || 0) * 2.4) : 0;
  const transitionRatio = waveformWidth > 0 ? worldLength(transitionPx) / waveformWidth : 0;
  const transitionStart = Math.max(0, progress - transitionRatio / 2) * 100;
  const transitionEnd = Math.min(1, progress + transitionRatio / 2) * 100;
  const trackTone = activeTrack?.slot === 2 ? 'reference-front__take-number--blue' : activeTrack?.slot === 3 ? 'reference-front__take-number--tan' : 'reference-front__take-number--light';

  return (
    <g
      className="reference-front"
      aria-label="Reference front console"
      data-transport-state={transportState}
      data-cue-a-state={cueA == null ? 'idle' : 'set'}
      data-cue-b-state={cueB == null ? 'idle' : 'set'}
      data-return-state={returnActive ? 'active' : 'idle'}
      data-source-id={activeTrack?.id || undefined}
    >
      <defs>
        <clipPath id="reference-front-wave-progress-left" clipPathUnits="userSpaceOnUse">
          <rect x={waveformX} y={plot.y} width={waveformWidth * progress} height={plot.height} />
        </clipPath>
        <clipPath id="reference-front-wave-progress-right" clipPathUnits="userSpaceOnUse">
          <rect x={waveformX} y={plot.y} width={waveformWidth * progress} height={plot.height} />
        </clipPath>
        <pattern id="reference-front-brush" width="18" height="6" patternUnits="userSpaceOnUse">
          <path d="M0 2H18" stroke="#FFFFFF" strokeWidth="1" opacity=".12" />
          <path d="M0 5H18" stroke="#696B68" strokeWidth="1" opacity=".08" />
        </pattern>
        <linearGradient id="reference-front-shell" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F2F1EA" />
          <stop offset=".48" stopColor="#ECEBE4" />
          <stop offset="1" stopColor="#D2D2CB" />
        </linearGradient>
        <linearGradient id="reference-front-fascia" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F0EFE8" />
          <stop offset=".52" stopColor="#E8E7E0" />
          <stop offset="1" stopColor="#D7D7D0" />
        </linearGradient>
        <linearGradient id="reference-front-screen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#171A1D" />
          <stop offset=".5" stopColor="#101214" />
          <stop offset="1" stopColor="#1C2023" />
        </linearGradient>
        <linearGradient id="take-wave-fill" x1="0" y1="0" x2="1" y2="0">
          <stop offset={`${transitionStart}%`} stopColor="var(--take-wave-past)" />
          <stop offset={`${transitionEnd}%`} stopColor="var(--take-wave-future)" />
        </linearGradient>
        <filter id="reference-front-shell-shadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#111315" floodOpacity=".2" />
        </filter>
        <filter id="reference-front-key-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.4" floodColor="#111315" floodOpacity=".18" />
        </filter>
        <filter id="reference-front-toggle-shadow" x="-22%" y="-18%" width="144%" height="158%">
          <feDropShadow dx="0" dy="1.35" stdDeviation="1.05" floodColor="#111315" floodOpacity=".11" />
        </filter>
        <filter id="reference-front-volume-thumb-shadow" x="-35%" y="-80%" width="170%" height="260%">
          <feDropShadow dx="3" dy="5" stdDeviation="4" floodColor="#111315" floodOpacity=".16" />
        </filter>
        <filter id="reference-front-volume-engrave" x="-35%" y="-35%" width="170%" height="170%">
          <feDropShadow dx="0" dy=".65" stdDeviation=".45" floodColor="#FFFFFF" floodOpacity=".78" />
          <feDropShadow dx="0" dy="-.65" stdDeviation=".4" floodColor="#85837B" floodOpacity=".4" />
        </filter>
      </defs>

      <g className="reference-front__physical-body">
        <rect className="reference-front__body-contact-shadow" x={G.chassis.x} y={G.chassis.y} width={G.chassis.width} height={G.chassis.height} rx={G.chassis.radius} fill="#111315" opacity=".14" transform="translate(0 5)" filter="url(#reference-front-shell-shadow)" />
        <rect className="reference-front__body-shell" x={G.chassis.x} y={G.chassis.y} width={G.chassis.width} height={G.chassis.height} rx={G.chassis.radius} fill="url(#reference-front-shell)" stroke="#B7B6B0" strokeWidth="4" />
        <rect className="reference-front__body-inset" x={G.chassis.inner.x} y={G.chassis.inner.y} width={G.chassis.inner.width} height={G.chassis.inner.height} rx={G.chassis.inner.radius} fill={C.body} stroke="#A8A9A3" strokeWidth="2" />
        <rect className="reference-front__body-brush" x={G.chassis.inner.x} y={G.chassis.inner.y} width={G.chassis.inner.width} height={G.chassis.inner.height} rx={G.chassis.inner.radius} fill="url(#reference-front-brush)" opacity=".32" pointerEvents="none" />
      </g>
      {G.screwCenters.map(([cx, cy]) => <Screw key={`${cx}-${cy}`} cx={cx} cy={cy} />)}

      <g className="reference-front__screen-zone" data-screen-zone="signal-workspace">
        <rect className="reference-front__screen-well" x={G.upper.x} y={G.upper.y} width={G.upper.width} height={G.upper.height} rx={G.upper.radius} fill="#000" stroke="var(--take-hair)" strokeWidth="1" />
      </g>
      <g className="reference-front__lower-fascia">
        <rect className="reference-front__fascia-surface" x={G.lower.x} y={G.lower.y} width={G.lower.width} height={G.lower.height} rx={G.lower.radius} fill="url(#reference-front-fascia)" stroke="#B7B6B0" strokeWidth="1.5" />
        <path className="reference-front__fascia-highlight" d={`M${G.lower.x + 14} ${G.lower.y + 2}H${G.lower.x + G.lower.width - 14}`} stroke="#FAF9F2" strokeWidth="1" opacity=".72" />
      </g>

      <ShapePanel
        toneValue={toneValue}
        spaceAmount={spaceAmount}
        textureAmount={textureAmount}
        disabled={!controlsReady}
      />

      <g
        className="reference-front__waveform"
        data-waveform-workspace="stereo"
        data-screen-module="take"
        data-waveform-status={waveformStatus}
        data-waveform-error={waveformError || undefined}
      >
        <rect className="reference-front__waveform-well" x={G.waveform.x} y={G.waveform.y} width={G.waveform.width} height={G.waveform.height} fill="#000" />
        <Label className={`reference-front__take-number ${trackTone}`} x={headX} y={headBaseline} size={worldLength(30)} spacing=".02em" aria-label={trackNumber}>{teNum(trackNumber)}</Label>
        <Label className="reference-front__take-title" x={G.waveform.x + worldLength(16 + 58)} y={headBaseline} size={worldLength(19)} spacing=".16em" aria-label={trackTitle}>{trackTitle}</Label>
        <g className="take-screen-header" aria-label="A and B cue markers and stereo mode">
          <circle className="take-cue-legend-dot take-cue-legend-dot--a" cx={headerRight - worldLength(146)} cy={headerDotY} r={worldLength(3.5)} fill={cueA == null ? 'none' : 'var(--take-amber)'} />
          <Label className="take-cue-legend-label take-cue-legend-label--a" x={headerRight - worldLength(138)} y={headBaseline} size={worldLength(7)} spacing=".12em">A</Label>
          <circle className="take-cue-legend-dot take-cue-legend-dot--b" cx={headerRight - worldLength(112)} cy={headerDotY} r={worldLength(3.5)} fill={cueB == null ? 'none' : 'var(--take-ink)'} />
          <Label className="take-cue-legend-label take-cue-legend-label--b" x={headerRight - worldLength(104)} y={headBaseline} size={worldLength(7)} spacing=".12em">B</Label>
          <Label className="reference-front__take-stereo" x={headerRight - worldLength(16)} y={headBaseline} size={worldLength(10)} anchor="end" spacing=".22em">STEREO</Label>
        </g>
        <g data-waveform-input="line">
          <circle className="take-input-terminal take-input-terminal--plus" cx={inputX + worldLength(7)} cy={inputY} r={worldLength(7)} />
          <Label x={inputX + worldLength(7)} y={inputY + worldLength(3.5)} fill="#000" size={worldLength(11)} anchor="middle" spacing="0">+</Label>
          <path d={`M${inputWaveX} ${inputY}H${inputWaveX + inputWaveWidth}`} stroke="var(--take-hair)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <path d={inputWave} fill="none" stroke="var(--take-grey)" strokeWidth="1" vectorEffect="non-scaling-stroke" opacity=".82" />
          <circle className="take-input-terminal take-input-terminal--minus" cx={minusX} cy={inputY} r={worldLength(7)} />
          <Label x={minusX} y={inputY + worldLength(3.5)} fill="#000" size={worldLength(11)} anchor="middle" spacing="0">−</Label>
          <Label className="reference-front__take-input-label" x={inputLabelX} y={inputY + worldLength(3)} anchor="end" size={worldLength(8)} spacing=".20em" aria-label={signalLive ? 'Signal live' : 'Input idle'}>{signalLive ? 'SIGNAL LIVE' : 'INPUT IDLE'}</Label>
        </g>
        <rect className="take-wave-lane" data-waveform-lane="L" x={lanes.top.x} y={lanes.top.y} width={lanes.top.width} height={lanes.top.height} />
        <rect className="take-wave-lane" data-waveform-lane="R" x={lanes.bottom.x} y={lanes.bottom.y} width={lanes.bottom.width} height={lanes.bottom.height} />
        <path className="take-wave-axis" d={`M${plot.x} ${laneTopY}H${plot.x + plot.width}M${plot.x} ${laneBottomY}H${plot.x + plot.width}`} />
        <path d={topWave} fill={waveformReady ? 'url(#take-wave-fill)' : 'none'} opacity={waveformOpacity} data-channel="left" data-waveform-lane="L" />
        <path d={bottomWave} fill={waveformReady ? 'url(#take-wave-fill)' : 'none'} opacity={waveformOpacity} data-channel="right" data-waveform-lane="R" />
        <g className="take-channel-tag" aria-hidden="true">
          <rect x={plot.x + worldLength(4)} y={plot.y + worldLength(4)} width={worldLength(18)} height={worldLength(15)} />
          <rect x={plot.x + worldLength(4)} y={lanes.bottom.y + worldLength(4)} width={worldLength(18)} height={worldLength(15)} />
        </g>
        <Label className="reference-front__channel-label" x={plot.x + worldLength(13)} y={plot.y + worldLength(15)} size={worldLength(10)} anchor="middle" spacing=".14em">L</Label>
        <Label className="reference-front__channel-label" x={plot.x + worldLength(13)} y={lanes.bottom.y + worldLength(15)} size={worldLength(10)} anchor="middle" spacing=".14em">R</Label>
        {[['A', cueARatio, cueA, 'take-cue--a'], ['B', cueBRatio, cueB, 'take-cue--b']].map(([cueKey, ratio, cueTime, cueClass]) => {
          const cueX = ratio == null ? waveformX : waveformX + waveformWidth * ratio;
          const isHit = returnActive && returnCueKey === cueKey;
          return (
            <g key={cueKey} className={`take-cue ${cueClass}`} data-cue-key={cueKey} data-hit={isHit ? 'true' : 'false'} style={{ opacity: ratio == null ? 0 : 1 }} transform={`translate(${cueX} 0)`}>
              <path className="take-cue-line" d={`M0 ${plot.y}V${plot.y + plot.height}`} />
              <circle className="take-cue-node" cx="0" cy={plot.y + plot.height / 2} r={worldLength(6)} />
              <circle className="take-cue-node-hit" cx="0" cy={plot.y + plot.height / 2} r={worldLength(3)} />
              <Label className="take-cue-time" x={worldLength(8)} y={plot.y + plot.height / 2 + worldLength(3)} size={worldLength(9)} spacing=".08em" aria-label={cueTime == null ? '' : `${cueKey} ${formatTime(cueTime)}`}>{cueTime == null ? '' : `${cueKey} ${displayTime(cueTime)}`}</Label>
            </g>
          );
        })}
        <g className="take-playhead" data-playing={playing ? 'true' : 'false'} transform={`translate(${playheadX} 0)`}>
          <path className="take-playhead-line" d={`M0 ${plot.y}V${plot.y + plot.height}`} />
          <path className="take-playhead-tip" d={`M${worldLength(-3.5)} ${plot.y}H${worldLength(3.5)}L0 ${plot.y + worldLength(6)}Z`} />
        </g>
        <SemanticRange
          x={timeline.x - 8}
          y={timeline.y - 40}
          width={timeline.width + 16}
          height={80}
          value={currentTime}
          min={0}
          max={duration}
          step={.01}
          label={`Seek through ${activeTrack?.title || 'active track'}`}
          disabled={!controlsReady}
          onChange={onSeekChange}
        />
        <Label className="take-time-elapsed" x={timeline.x} y={timeline.y + worldLength(20)} size={worldLength(20)} spacing=".08em" aria-label={formatTime(currentTime)}>{displayTime(currentTime)}</Label>
        <Label className="take-time-remain" x={timeline.x + timeline.width} y={timeline.y + worldLength(20)} anchor="end" size={worldLength(12)} spacing=".10em" aria-label={`-${formatTime(Math.max(0, duration - currentTime))}`}>−{displayTime(Math.max(0, duration - currentTime))}</Label>
      </g>

      <g className="reference-front__right-rail" data-screen-module="tape" aria-label="Tape transport rail">
        <rect x={G.rightRail.x} y={G.rightRail.y} width={G.rightRail.width} height={G.rightRail.height} rx={G.rightRail.radius} fill={C.inkDeep} stroke="#4C4E51" strokeWidth="2" />
        <ScreenTapeTransport
          activeTrack={activeTrack}
          currentTime={currentTime}
          duration={duration}
          playing={playing}
          cueA={cueA}
          cueB={cueB}
          returnActive={returnActive}
          shuttleDirection={shuttleDirection}
          playbackRate={playbackRate}
          volume={volume}
        />
      </g>

      <path className="reference-front__fascia-divider" d={`M${G.separators[0]} ${G.lower.y + 22}V${G.lower.y + G.lower.height - 16}`} />
      <path className="reference-front__fascia-divider" d={`M${G.separators[1]} ${G.lower.y + 22}V${G.lower.y + G.lower.height - 16}`} />
      <g className="reference-front__parameter-zone">
        <ToneDial
          cx={G.knobs.tone.x}
          cy={G.knobs.tone.y}
          radius={G.knobs.tone.radius}
          value={toneValue}
          label="Tone"
          controlKind="tone-dial"
          accent={C.orange}
          disabled={!controlsReady}
          onChange={onToneChange}
        />
        <Label className="reference-front__hardware-label" x={G.knobs.tone.x} y={G.knobs.tone.y + G.knobs.tone.radius + 19} anchor="middle" fill={C.ink} size={8} spacing="1.4">TONE</Label>
        <ToneDial
          cx={G.knobs.space.x}
          cy={G.knobs.space.y}
          radius={G.knobs.space.radius}
          value={spaceAmount}
          label="Space"
          controlKind="space-dial"
          accent={C.blue}
          disabled={!controlsReady}
          onChange={onSpaceChange}
        />
        <Label className="reference-front__hardware-label" x={G.knobs.space.x} y={G.knobs.space.y + G.knobs.space.radius + 19} anchor="middle" fill={C.ink} size={8} spacing="1.4">SPACE</Label>
        <ToneDial
          cx={G.knobs.texture.x}
          cy={G.knobs.texture.y}
          radius={G.knobs.texture.radius}
          value={textureAmount}
          accent={C.ochre}
          label="Texture"
          controlKind="texture-dial"
          disabled={!controlsReady}
          onChange={onTextureChange}
        />
        <Label className="reference-front__hardware-label" x={G.knobs.texture.x} y={G.knobs.texture.y + G.knobs.texture.radius + 19} anchor="middle" fill={C.ink} size={8} spacing="1.4">TEXTURE</Label>
      </g>
      <g className="reference-front__transport-zone">
        <VolumeSlider value={volume} disabled={!controlsReady} />
        <SemanticRange
          x={G.volumeSlider.x - G.volumeSlider.width / 2}
          y={G.volumeSlider.trackY - 26}
          width={G.volumeSlider.width}
          height={52}
          value={Math.round(Math.round(volume * VOLUME_DETENT_COUNT) / VOLUME_DETENT_COUNT * 100)}
          min={0}
          max={100}
          step={VOLUME_DETENT_STEP}
          label="Volume"
          disabled={!controlsReady}
          onChange={onVolumeChange}
        />
        <Shuttle direction={shuttleDirection} disabled={!controlsReady} />
        <SemanticRange x={G.shuttle.x - G.shuttle.width / 2} y={G.shuttle.trackY - 40} width={G.shuttle.width} height={80} value={shuttleDirection} min={-1} max={1} step={SHUTTLE_DETENT_STEP} label="Rewind or fast-forward" disabled={!controlsReady} onChange={onShuttleChange} onActivate={onShuttleClick} onKeyDown={onShuttleKeyDown} onPointerDown={onShuttlePointerDown} onPointerMove={onShuttlePointerMove} onPointerUp={onShuttleClick} onPointerCancel={onShuttlePointerCancel} />
      </g>
      <g className="reference-front__action-zone" data-control-group="transport">
        <PlayDial x={G.transport.play.x} y={G.transport.play.y} size={G.transport.play.size} playing={playing} disabled={!controlsReady} />
        <SemanticButton
          x={G.transport.play.x}
          y={G.transport.play.y}
          size={Math.max(76, G.transport.play.size + 14)}
          label={playing ? 'Pause active cassette' : 'Play active cassette'}
          dataAction={FRONT_INTENTS.TRANSPORT_TOGGLE}
          visual="dial"
          pressed={playing}
          disabled={!controlsReady}
          onIntent={(source) => onFrontIntent?.(createFrontIntent(FRONT_INTENTS.TRANSPORT_TOGGLE, source))}
        />
        <TransportButton x={G.transport.cueA.x} y={G.transport.cueA.y} size={G.transport.cueA.size} label="A" pressed={cueA != null} disabled={cueADisabled} showLabel={false} variant="toggle" tone="orange" />
        <SemanticButton
          x={G.transport.cueA.x}
          y={G.transport.cueA.y}
          size={Math.max(76, G.transport.cueA.size + 14)}
          label={cueA == null ? 'Set A cue' : 'Clear A cue'}
          dataAction={FRONT_INTENTS.MARK_A}
          controlKind="cue-a-key"
          pressed={cueA != null}
          disabled={cueADisabled}
          onIntent={(source) => onFrontIntent?.(createFrontIntent(FRONT_INTENTS.MARK_A, source))}
        />
        <TransportButton x={G.transport.cueB.x} y={G.transport.cueB.y} size={G.transport.cueB.size} label="B" pressed={cueB != null} disabled={cueBDisabled} showLabel={false} variant="toggle" tone="paper" />
        <SemanticButton
          x={G.transport.cueB.x}
          y={G.transport.cueB.y}
          size={Math.max(76, G.transport.cueB.size + 14)}
          label={cueB == null ? 'Set B cue' : 'Clear B cue'}
          dataAction={FRONT_INTENTS.MARK_B}
          controlKind="cue-b-key"
          pressed={cueB != null}
          disabled={cueBDisabled}
          onIntent={(source) => onFrontIntent?.(createFrontIntent(FRONT_INTENTS.MARK_B, source))}
        />
        <TransportButton x={G.transport.return.x} y={G.transport.return.y} size={G.transport.return.size} label="Q" pressed={returnActive} disabled={returnDisabled} showLabel={false} variant="toggle" tone="black" />
        <SemanticButton
          x={G.transport.return.x}
          y={G.transport.return.y}
          size={Math.max(76, G.transport.return.size + 14)}
          label={returnCueKey === 'B' ? 'Return to B cue' : 'Return to A cue'}
          dataAction={FRONT_INTENTS.RETURN_TO_MARK}
          controlKind="return-key"
          pressed={returnActive}
          disabled={returnDisabled}
          onIntent={(source) => onFrontIntent?.(createFrontIntent(FRONT_INTENTS.RETURN_TO_MARK, source))}
        />
        <EjectControl x={G.transport.eject.x} y={G.transport.eject.y} width={G.transport.eject.width} height={G.transport.eject.height} pressed={ejectPressed} disabled={ejectIsDisabled} />
        <SemanticButton
          x={G.transport.eject.x}
          y={G.transport.eject.y}
          size={G.transport.eject.width}
          hitWidth={Math.max(84, G.transport.eject.width + 28)}
          hitHeight={Math.max(72, G.transport.eject.height + 16)}
          controlKind="eject-key"
          label="Eject cassette"
          pressed={ejectPressed}
          disabled={ejectIsDisabled}
          dataAction={FRONT_INTENTS.MACHINE_EJECT}
          onIntent={(source) => onFrontIntent?.(createFrontIntent(FRONT_INTENTS.MACHINE_EJECT, source))}
          onPointerDown={pressEject}
          onPointerUp={releaseEjectPress}
          onPointerCancel={releaseEjectPress}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') pressEject();
          }}
          onKeyUp={releaseEjectPress}
        />
      </g>
    </g>
  );
}

export default ReferenceFrontConsole;
