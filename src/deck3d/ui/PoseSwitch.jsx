import { POSE_ORDER, POSES, AZIMUTH, RADIUS, FOV, TARGET, orbitPosition } from '../camera/poses.js';

export default function PoseSwitch({ pose, onChange, live, deck }) {
  const p = POSES[pose];
  const el = live ? live.elevation : p.elevation;
  const lid = live ? live.lid : p.lid;
  const [px, py, pz] = orbitPosition(el);
  return (
    <div className="hud">
      <div className="hud-row">
        {POSE_ORDER.map((k) => (
          <button
            key={k}
            className={k === pose ? 'on' : ''}
            onClick={() => onChange(k)}
            data-pose={k}
          >
            {k}
          </button>
        ))}
      </div>
      {deck?.phase === 'loaded' && (
        <button className="eject" onClick={() => deck.eject()}>⏏ EJECT</button>
      )}
      <dl className="hud-read">
        <dt>azimuth</dt><dd>{AZIMUTH.toFixed(0)}° <span>locked</span></dd>
        <dt>elevation</dt><dd className="hi">{el.toFixed(1)}°</dd>
        <dt>radius</dt><dd>{RADIUS}</dd>
        <dt>fov</dt><dd>{FOV}°</dd>
        <dt>target</dt><dd>{TARGET.map((n) => n.toFixed(0)).join(', ')}</dd>
        <dt>position</dt><dd>{[px, py, pz].map((n) => n.toFixed(1)).join(', ')}</dd>
        <dt>lid</dt><dd className={lid > 0.05 ? 'hi' : ''}>{lid.toFixed(1)}°</dd>
        <dt>state</dt><dd className={live?.transitioning ? 'hi' : ''}>{live?.transitioning ? 'moving' : live?.playing ? 'playing' : 'idle'}</dd>
        <dt>phase</dt><dd className={deck?.armed ? 'hi' : ''}>{deck?.armed ? 'over bay' : deck?.phase ?? 'idle'}</dd>
      </dl>
    </div>
  );
}
