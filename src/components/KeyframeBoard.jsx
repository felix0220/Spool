import { useState } from 'react';

const tapes = [
  { id: 'ember', className: 'keyframe-tape--ember' },
  { id: 'sky', className: 'keyframe-tape--sky' },
  { id: 'cream', className: 'keyframe-tape--cream' },
];

function Cassette({ className }) {
  return (
    <div className={`keyframe-tape ${className}`} aria-hidden="true">
      <span className="keyframe-tape-edge" />
      <span className="keyframe-tape-window"><i /></span>
      <span className="keyframe-tape-window"><i /></span>
      <span className="keyframe-tape-strip" />
      <span className="keyframe-tape-label" />
      <span className="keyframe-tape-screw keyframe-tape-screw--one" />
      <span className="keyframe-tape-screw keyframe-tape-screw--two" />
      <span className="keyframe-tape-screw keyframe-tape-screw--three" />
      <span className="keyframe-tape-screw keyframe-tape-screw--four" />
    </div>
  );
}

function ProductDeck({ pose }) {
  return (
    <div className={`keyframe-camera keyframe-camera--${pose}`} aria-hidden="true">
      <div className="keyframe-machine">
        <div className="keyframe-machine-depth" />
        <div className="keyframe-top-surface">
          <span className="keyframe-screw keyframe-screw--left" />
          <span className="keyframe-screw keyframe-screw--right" />
          <span className="keyframe-top-rail keyframe-top-rail--back" />
          <span className="keyframe-top-rail keyframe-top-rail--front" />
          <div className="keyframe-bay">
            <span className="keyframe-bay-window" />
            <span className="keyframe-bay-reel keyframe-bay-reel--left" />
            <span className="keyframe-bay-reel keyframe-bay-reel--right" />
            <span className="keyframe-bay-head" />
          </div>
          <div className="keyframe-lid">
            <span className="keyframe-lid-window" />
            <span className="keyframe-lid-grip" />
          </div>
        </div>
        <div className="keyframe-front-face">
          <div className="keyframe-front-header">
            <div className="keyframe-display">
              <span className="keyframe-display-bars"><i /><i /><i /><i /><i /><i /></span>
              <strong>PLAY</strong>
              <small>00:00:00</small>
            </div>
            <span className="keyframe-grille">{Array.from({ length: 24 }).map((_, index) => <i key={index} />)}</span>
          </div>
          <div className="keyframe-front-rule" />
          <div className="keyframe-controls">
            <span className="keyframe-knob keyframe-knob--blue" />
            <span className="keyframe-control keyframe-control--back" />
            <span className="keyframe-control keyframe-control--play" />
            <span className="keyframe-control keyframe-control--stop" />
            <span className="keyframe-knob keyframe-knob--gold" />
          </div>
          <div className="keyframe-pads">
            <span /><span className="is-blue" /><span className="is-gold" /><span className="is-orange" /><span className="is-blue" /><span />
          </div>
          <div className="keyframe-meter">{Array.from({ length: 18 }).map((_, index) => <i key={index} />)}</div>
        </div>
      </div>
    </div>
  );
}

function Keyframe({ number, title, detail, pose }) {
  return (
    <article className={`keyframe-card keyframe-card--${pose}`}>
      <div className="keyframe-card-head">
        <span className="keyframe-number">{number}</span>
        <span className="keyframe-title">{title}</span>
        <span className="keyframe-detail">{detail}</span>
      </div>
      <div className="keyframe-canvas">
        <div className="keyframe-tape-row">
          {tapes.map((tape) => <Cassette key={tape.id} className={tape.className} />)}
        </div>
        <ProductDeck pose={pose} />
      </div>
    </article>
  );
}

export function KeyframeBoard() {
  const [activePose, setActivePose] = useState('top-closed');

  return (
    <section className="keyframe-board" aria-label="Cassette player product keyframes">
      <header className="keyframe-board-head">
        <span className="keyframe-board-kicker">SIDE A / PRODUCT STUDY</span>
        <span className="keyframe-board-rule" />
        <span className="keyframe-board-note">STATIC GEOMETRY / 3 VIEWS</span>
      </header>
      <section className="keyframe-playground" aria-label="Shared camera transition playground">
        <div className="keyframe-playground-tape-row">
          {tapes.map((tape) => <Cassette key={tape.id} className={tape.className} />)}
        </div>
        <ProductDeck pose={activePose} />
        <div className="keyframe-playground-controls" role="tablist" aria-label="Camera poses">
          {[
            ['top-closed', '01 / TOP CLOSED'],
            ['front', '02 / FRONT 3⁄4'],
            ['top-open', '03 / TOP OPEN'],
          ].map(([pose, label]) => (
            <button
              key={pose}
              className={activePose === pose ? 'is-active' : ''}
              type="button"
              role="tab"
              aria-selected={activePose === pose}
              onClick={() => setActivePose(pose)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>
      <div className="keyframe-grid">
        <Keyframe number="01" title="CLOSED / TOP" detail="TOP VIEW" pose="top-closed" />
        <Keyframe number="02" title="FRONT / PLAY" detail="FRONT VIEW" pose="front" />
        <Keyframe number="03" title="OPEN / LOAD" detail="TOP VIEW" pose="top-open" />
      </div>
    </section>
  );
}
