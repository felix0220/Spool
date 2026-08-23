import { useEffect, useRef, useState } from 'react';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const TAPE_OPTIONS = [
  { id: 'ember', className: 'tape-dragger-ember', label: 'Drag ember cassette into the deck' },
  { id: 'sky', className: 'tape-dragger-sky', label: 'Drag sky cassette into the deck' },
  { id: 'cream', className: 'tape-dragger-cream', label: 'Drag cream cassette into the deck' }
];

export function IntakeStage() {
  const tapeRefs = useRef(new Map());
  const slotRef = useRef(null);
  const activeTapeIdRef = useRef(null);
  const selectedTapeIdRef = useRef(null);
  const dragRef = useRef({ active: false, id: null, dx: 0, dy: 0, tilt: -4 });
  const returnTimerRef = useRef(null);
  const insertTimerRef = useRef(null);
  const ejectTimerRef = useRef(null);
  const [phase, setPhase] = useState('standby');
  const [overSlot, setOverSlot] = useState(false);
  const [selectedTapeId, setSelectedTapeId] = useState(null);

  useEffect(() => () => {
    window.clearTimeout(returnTimerRef.current);
    window.clearTimeout(insertTimerRef.current);
    window.clearTimeout(ejectTimerRef.current);
  }, []);

  const setTapeRef = (id, node) => {
    if (node) tapeRefs.current.set(id, node);
    else tapeRefs.current.delete(id);
  };

  const getTape = (id = activeTapeIdRef.current) => tapeRefs.current.get(id) || null;

  const clearTapeInlineStyles = (tape) => {
    if (!tape) return;
    tape.style.transition = '';
    tape.style.transform = '';
    tape.style.animation = '';
    tape.style.removeProperty('--drag-x');
    tape.style.removeProperty('--drag-y');
    tape.style.removeProperty('--drag-tilt');
  };

  const clearAllTapeInlineStyles = () => {
    TAPE_OPTIONS.forEach(({ id }) => clearTapeInlineStyles(getTape(id)));
  };

  const isTapeOverSlot = (tape = getTape()) => {
    const slot = slotRef.current;
    if (!tape || !slot) return false;
    const tapeRect = tape.getBoundingClientRect();
    const slotRect = slot.getBoundingClientRect();
    const tapeCenterX = tapeRect.left + tapeRect.width / 2;
    const tapeCenterY = tapeRect.top + tapeRect.height / 2;
    return tapeCenterX > slotRect.left + slotRect.width * 0.18
      && tapeCenterX < slotRect.right - slotRect.width * 0.18
      && tapeCenterY > slotRect.top - slotRect.height * 0.55
      && tapeCenterY < slotRect.bottom + slotRect.height * 0.8;
  };

  const isPointOverSlot = (x, y) => {
    const slot = slotRef.current;
    if (!slot || !Number.isFinite(x) || !Number.isFinite(y)) return false;
    const slotRect = slot.getBoundingClientRect();
    return x > slotRect.left + slotRect.width * 0.08
      && x < slotRect.right - slotRect.width * 0.08
      && y > slotRect.top - slotRect.height * 0.25
      && y < slotRect.bottom + slotRect.height * 0.35;
  };

  const resetDrag = () => {
    dragRef.current = { active: false, id: null, dx: 0, dy: 0, tilt: -4 };
    activeTapeIdRef.current = null;
  };

  const beginInsertion = (tapeId = activeTapeIdRef.current) => {
    const tape = getTape(tapeId);
    if (!['standby', 'dragging'].includes(phase) || !tape) return;
    activeTapeIdRef.current = tapeId;
    selectedTapeIdRef.current = tapeId;
    dragRef.current.active = false;
    clearTimeout(insertTimerRef.current);
    tape.style.setProperty('--drag-x', `${dragRef.current.dx}px`);
    tape.style.setProperty('--drag-y', `${dragRef.current.dy}px`);
    tape.style.setProperty('--drag-tilt', `${dragRef.current.tilt}deg`);
    tape.style.transition = 'none';
    setSelectedTapeId(tapeId);
    setOverSlot(false);
    setPhase('inserting');
    insertTimerRef.current = window.setTimeout(() => setPhase('engaged'), 960);
  };

  const beginEject = () => {
    const tape = getTape(selectedTapeIdRef.current);
    if (phase !== 'engaged' || !tape) return;
    clearTimeout(ejectTimerRef.current);
    clearTimeout(insertTimerRef.current);
    activeTapeIdRef.current = selectedTapeIdRef.current;
    tape.style.transition = 'none';
    tape.style.animation = 'tape-eject 1240ms cubic-bezier(0.32, 0.72, 0, 1) forwards';
    setPhase('ejecting');
    ejectTimerRef.current = window.setTimeout(() => {
      clearAllTapeInlineStyles();
      selectedTapeIdRef.current = null;
      setSelectedTapeId(null);
      resetDrag();
      setPhase('standby');
    }, 1320);
  };

  const handlePointerDown = (event, tapeId) => {
    if (phase !== 'standby') return;
    const tape = getTape(tapeId);
    if (!tape) return;
    activeTapeIdRef.current = tapeId;
    try {
      tape.setPointerCapture?.(event.pointerId);
    } catch {
      // Synthetic or partially-supported pointers may not expose a capturable id.
    }
    dragRef.current = { active: true, id: tapeId, startX: event.clientX, startY: event.clientY, dx: 0, dy: 0, tilt: -4 };
    tape.style.animation = 'none';
    tape.style.transition = 'none';
    setOverSlot(false);
    setPhase('dragging');
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    const tape = getTape(drag.id);
    if (!drag.active || !tape) return;
    drag.dx = event.clientX - drag.startX;
    drag.dy = event.clientY - drag.startY;
    drag.tilt = clamp(-4 + drag.dx * 0.075 + (event.clientY - drag.startY) * -0.025, -18, 18);
    tape.style.transform = `translate(calc(-50% + ${drag.dx}px), ${drag.dy}px) rotate(${drag.tilt}deg)`;
    setOverSlot(isTapeOverSlot(tape) || isPointOverSlot(event.clientX, event.clientY));
  };

  const releasePointerCapture = (tape, event) => {
    try {
      tape.releasePointerCapture?.(event.pointerId);
    } catch {
      // Releasing a pointer that was never captured is safe to ignore.
    }
  };

  const returnTape = (tape) => {
    tape.style.transition = 'transform 320ms cubic-bezier(0.23, 1, 0.32, 1)';
    tape.style.transform = 'translate(-50%, 0) rotate(-4deg)';
    setPhase('returning');
    clearTimeout(returnTimerRef.current);
    returnTimerRef.current = window.setTimeout(() => {
      clearTapeInlineStyles(tape);
      resetDrag();
      setPhase('standby');
    }, 330);
  };

  const handlePointerUp = (event) => {
    const drag = dragRef.current;
    const tape = getTape(drag.id);
    const slot = slotRef.current;
    if (!drag.active || !tape || !slot) return;
    drag.active = false;
    releasePointerCapture(tape, event);
    const shouldInsert = isTapeOverSlot(tape) || isPointOverSlot(event.clientX, event.clientY);
    setOverSlot(false);

    if (shouldInsert) {
      beginInsertion(drag.id);
      return;
    }

    returnTape(tape);
  };

  const handlePointerCancel = (event) => {
    const drag = dragRef.current;
    const tape = getTape(drag.id);
    if (!drag.active || !tape) return;
    drag.active = false;
    releasePointerCapture(tape, event);
    setOverSlot(false);
    returnTape(tape);
  };

  const screenStatus = {
    standby: 'READY',
    dragging: 'MANUAL',
    returning: 'RETURN',
    inserting: 'LOADING',
    engaged: 'PLAYING',
    ejecting: 'EJECT'
  }[phase] || 'READY';

  const screenSubstatus = {
    standby: 'SOURCE',
    dragging: 'HOLD',
    returning: 'CANCEL',
    inserting: 'AUDIO',
    engaged: 'LIVE',
    ejecting: 'OPEN'
  }[phase] || 'SOURCE';

  return (
    <section
      className="tape-component-stage"
      data-phase={phase}
      data-over-slot={overSlot ? 'true' : 'false'}
      data-selected-tape={selectedTapeId || ''}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onMouseUp={handlePointerUp}
      onTouchEnd={handlePointerUp}
    >
      <div className="tape-stage" aria-label="Interactive cassette deck">
        <div className="tape-atmosphere tape-atmosphere-one" aria-hidden="true" />
        <div className="tape-atmosphere tape-atmosphere-two" aria-hidden="true" />

        {TAPE_OPTIONS.map((tape) => (
          <div
            key={tape.id}
            ref={(node) => setTapeRef(tape.id, node)}
            className={`tape-dragger ${tape.className}`}
            data-tape-id={tape.id}
            data-selected={selectedTapeId === tape.id ? 'true' : 'false'}
            role="button"
            tabIndex="0"
            aria-label={tape.label}
            onPointerDown={(event) => handlePointerDown(event, tape.id)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                activeTapeIdRef.current = tape.id;
                dragRef.current = { active: false, id: tape.id, dx: 0, dy: 0, tilt: -4 };
                beginInsertion(tape.id);
              }
            }}
          >
            <span className="tape-object" aria-hidden="true">
              <span className="tape-shell-edge" />
              <span className="tape-window tape-window-left"><span className="tape-reel" /></span>
              <span className="tape-window tape-window-right"><span className="tape-reel" /></span>
              <span className="tape-strip" />
              <span className="tape-screw tape-screw-one" />
              <span className="tape-screw tape-screw-two" />
              <span className="tape-screw tape-screw-three" />
              <span className="tape-screw tape-screw-four" />
              <span className="tape-label-block" />
            </span>
          </div>
        ))}

        <div className="deck-component" role="group" aria-label="Cassette deck">
          <div className="deck-casing">
            <div className="deck-top-plane">
              <span className="deck-top-rail deck-top-rail-back" />
              <span className="deck-top-rail deck-top-rail-front" />
              <span className="deck-top-screw deck-top-screw-left" />
              <span className="deck-top-screw deck-top-screw-right" />
              <div className="deck-top-bay">
                <div ref={slotRef} className="deck-slot">
                  <span className="deck-slot-window" />
                  <span className="deck-head" />
                  <span className="deck-reel deck-reel-left" />
                  <span className="deck-reel deck-reel-right" />
                </div>
              </div>
              <span className="deck-top-knob deck-top-knob-left" />
              <span className="deck-top-knob deck-top-knob-right" />
            </div>
            <div className="deck-lid">
              <span className="deck-lid-window" aria-hidden="true" />
              <span className="deck-lid-grip" />
              <span className="deck-lid-hinge deck-lid-hinge-left" />
              <span className="deck-lid-hinge deck-lid-hinge-right" />
            </div>
            <div className="deck-face">
              <div className="deck-front-header">
                <div className="deck-front-screen" aria-live="polite">
                  <span className="deck-screen-status">{screenStatus}</span>
                  <span className="deck-screen-signal" aria-hidden="true">
                    {Array.from({ length: 8 }).map((_, index) => <i key={index} style={{ '--screen-index': index }} />)}
                  </span>
                  <span className="deck-screen-substatus">{screenSubstatus}</span>
                </div>
                <span className="deck-speaker-grille" aria-hidden="true">
                  {Array.from({ length: 24 }).map((_, index) => <i key={index} />)}
                </span>
              </div>
              <div className="deck-front-divider" aria-hidden="true" />
              <div className="deck-control-row">
                <span className="deck-knob deck-knob-blue"><i /></span>
                <span className="deck-button deck-button-back" />
                <span className="deck-button deck-button-play" />
                <span className="deck-button deck-button-stop" />
                <button
                  className="deck-button deck-button-eject"
                  type="button"
                  aria-label="Eject cassette"
                  onClick={beginEject}
                  disabled={phase !== 'engaged'}
                />
                <span className="deck-knob deck-knob-gold"><i /></span>
              </div>
              <div className="deck-front-pad-bank" aria-hidden="true">
                {Array.from({ length: 6 }).map((_, index) => <span key={index} className={`deck-pad deck-pad-${index + 1}`} />)}
              </div>
              <div className="deck-meter">
                {Array.from({ length: 23 }).map((_, index) => <i key={index} style={{ '--meter-index': index }} />)}
              </div>
              <span className="deck-led deck-led-red" />
              <span className="deck-led deck-led-blue" />
            </div>
            <div className="deck-open-door" />
          </div>
        </div>
      </div>
    </section>
  );
}
