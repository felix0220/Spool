import { useCallback, useEffect, useRef, useState } from 'react';
import {
  nextValueFromWheel,
  quantizeControlValue,
  shouldIgnoreSecondTouch,
  valueFromVerticalDrag,
} from './control-inputs.js';
import {
  TONE_MAX_ANGLE,
  TONE_MIN_ANGLE,
  toneAngle,
  toneArcPath,
  tonePoint,
} from './tone-dial-geometry.js';

const MIN_VALUE = 0;
const MAX_VALUE = 1;
const STEP = 0.01;

function ToneDial({
  cx,
  cy,
  radius,
  value,
  min = MIN_VALUE,
  max = MAX_VALUE,
  step = STEP,
  label = 'Tone',
  controlKind = 'tone-dial',
  accent = 'var(--front-orange)',
  disabled = false,
  onChange,
  onActivate,
}) {
  const inputRef = useRef(null);
  const dragRef = useRef(null);
  const valueRef = useRef(Number(value));
  const wheelRemainderRef = useRef(0);
  const [interactionState, setInteractionState] = useState(disabled ? 'disabled' : 'idle');
  const [hasValueFeedback, setHasValueFeedback] = useState(false);

  const safeValue = quantizeControlValue(value, min, max, step);
  const normalizedValue = Math.min(1, Math.max(0, (safeValue - min) / (max - min || 1)));
  const trackRadius = radius + 4;
  const bodyRadius = radius * 0.74;
  const angle = toneAngle(normalizedValue);
  // Keep the orange marker on the knob face. The outer arc is a progress bar:
  // its orange portion starts at the lower-left and follows the pointer.
  const indicatorRadius = bodyRadius * 0.58;
  const [indicatorX, indicatorY] = tonePoint(cx, cy, indicatorRadius, angle);

  useEffect(() => {
    valueRef.current = safeValue;
  }, [safeValue]);

  useEffect(() => {
    if (disabled) {
      dragRef.current = null;
      wheelRemainderRef.current = 0;
      setHasValueFeedback(false);
      setInteractionState('disabled');
      return;
    }
    setInteractionState((state) => state === 'disabled' ? 'idle' : state);
  }, [disabled]);

  const emitValue = useCallback((nextValue) => {
    if (disabled || !onChange) return;
    const next = quantizeControlValue(nextValue, min, max, step);
    if (next !== valueRef.current) setHasValueFeedback(true);
    valueRef.current = next;
    onChange({ target: { value: String(next) } });
  }, [disabled, max, min, onChange, step]);

  useEffect(() => {
    if (disabled) return undefined;
    const node = inputRef.current;
    if (!node) return undefined;

    const handleWheel = (event) => {
      // Tone is additive for the dial interaction: a positive wheel delta
      // raises Tone, while a negative delta lowers it. Page scrolling is
      // consumed only while the pointer is over this dial.
      event.preventDefault();
      event.stopPropagation();
      setHasValueFeedback(true);
      const result = nextValueFromWheel({
        value: valueRef.current,
        min,
        max,
        step,
        deltaY: -event.deltaY,
        deltaMode: event.deltaMode,
        lineHeight: 16,
        pageHeight: window.innerHeight || 800,
        remainder: wheelRemainderRef.current,
      });
      wheelRemainderRef.current = result.remainder;
      if (result.changed) emitValue(result.value);
    };

    node.addEventListener('wheel', handleWheel, { passive: false });
    return () => node.removeEventListener('wheel', handleWheel);
  }, [disabled, emitValue, max, min, step]);

  useEffect(() => {
    const handleWindowBlur = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      setInteractionState(disabled ? 'disabled' : 'idle');
    };
    const handleWindowPointerEnd = (event) => {
      const drag = dragRef.current;
      if (!drag || (event.pointerId != null && drag.pointerId !== event.pointerId)) return;
      dragRef.current = null;
      setInteractionState(disabled ? 'disabled' : 'idle');
    };
    const handleWindowPointerMove = (event) => {
      const drag = dragRef.current;
      if (!drag || event.buttons !== 0) return;
      dragRef.current = null;
      setInteractionState(disabled ? 'disabled' : 'idle');
    };
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('pointerup', handleWindowPointerEnd);
    window.addEventListener('pointercancel', handleWindowPointerEnd);
    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('mouseup', handleWindowPointerEnd);
    window.addEventListener('touchend', handleWindowPointerEnd);
    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('pointerup', handleWindowPointerEnd);
      window.removeEventListener('pointercancel', handleWindowPointerEnd);
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('mouseup', handleWindowPointerEnd);
      window.removeEventListener('touchend', handleWindowPointerEnd);
    };
  }, [disabled]);

  const handleNativeChange = (event) => emitValue(event.target.value);

  const handleKeyDown = (event) => {
    if (disabled) return;
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
    const next = key === 'Home'
      ? min
      : key === 'End'
        ? max
        : current + (key === 'ArrowUp' || key === 'ArrowRight' ? step : -step);
    setInteractionState('focused');
    emitValue(next);
  };

  const handlePointerDown = (event) => {
    if (disabled) return;
    if (shouldIgnoreSecondTouch(dragRef.current?.pointerId, event.pointerId, event.pointerType)) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startValue: valueRef.current,
      moved: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setInteractionState('pressed');
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.buttons === 0) {
      dragRef.current = null;
      setInteractionState(disabled ? 'disabled' : 'idle');
      return;
    }
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

  const finishPointer = (event) => {
    const drag = dragRef.current;
    if (!drag || (event.pointerId != null && drag.pointerId !== event.pointerId)) return;
    if (event.currentTarget.hasPointerCapture?.(drag.pointerId)) {
      event.currentTarget.releasePointerCapture(drag.pointerId);
    }
    const wasClick = !drag.moved;
    dragRef.current = null;
    setInteractionState(disabled ? 'disabled' : event.currentTarget === document.activeElement ? 'focused' : 'idle');
    if (wasClick) onActivate?.(event);
  };

  const handlePointerEnter = (event) => {
    if (disabled || event.pointerType === 'touch' || dragRef.current) return;
    setInteractionState('hover');
  };

  const handlePointerLeave = (event) => {
    if (disabled || event.pointerType === 'touch' || dragRef.current) return;
    setInteractionState('idle');
  };

  return (
    <>
      <g
        className={`reference-front__tone-dial${disabled ? ' is-disabled' : ''}`}
        data-tone-dial="true"
        data-control-kind={controlKind}
        data-state={disabled ? 'disabled' : interactionState}
        data-value={safeValue.toFixed(2)}
        data-value-feedback={hasValueFeedback ? 'visible' : 'hidden'}
        data-progress-visible={normalizedValue > 0 ? 'visible' : 'hidden'}
        style={{ '--dial-accent': accent }}
        pointerEvents="none"
        aria-hidden="true"
      >
        <path
          className="reference-front__tone-dial-track"
          d={toneArcPath(cx, cy, trackRadius, TONE_MIN_ANGLE, TONE_MAX_ANGLE)}
        />
        <path
          className="reference-front__tone-dial-progress"
          d={toneArcPath(cx, cy, trackRadius, TONE_MIN_ANGLE, angle)}
        />
        <circle className="reference-front__tone-dial-shadow" cx={cx} cy={cy + 2} r={bodyRadius} />
        <circle className="reference-front__tone-dial-body" cx={cx} cy={cy} r={bodyRadius} />
        <circle className="reference-front__tone-dial-indicator" cx={indicatorX} cy={indicatorY} r="3.2" />
      </g>
      <foreignObject
        x={cx - radius - 14}
        y={cy - radius - 14}
        width={(radius + 14) * 2}
        height={(radius + 14) * 2}
        overflow="visible"
      >
        <div xmlns="http://www.w3.org/1999/xhtml" className="reference-front__semantic-host">
          <input
            ref={inputRef}
            className="reference-front__semantic-control reference-front__semantic-range reference-front__tone-dial-input"
            type="range"
            min={min}
            max={max}
            step={step}
            value={safeValue}
            aria-label={label}
            disabled={disabled}
            data-state={disabled ? 'disabled' : interactionState}
            data-value={safeValue.toFixed(2)}
            data-control-kind={controlKind}
            onChange={handleNativeChange}
            onKeyDown={handleKeyDown}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishPointer}
            onPointerCancel={finishPointer}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
            onFocus={() => !disabled && setInteractionState('focused')}
            onBlur={() => !disabled && !dragRef.current && setInteractionState('idle')}
          />
        </div>
      </foreignObject>
    </>
  );
}

export default ToneDial;
