import { NIGHT_SOUL_REF_V4 } from './night-soul-reference.js';

function Aperture({ aperture, ...props }) {
  return (
    <rect
      {...props}
      x={aperture.x - aperture.width / 2}
      y={aperture.y - aperture.height / 2}
      width={aperture.width}
      height={aperture.height}
      rx={aperture.rx}
      transform={`rotate(${aperture.rotation} ${aperture.x} ${aperture.y})`}
    />
  );
}

/**
 * One physical reel face, rendered twice with left/right pivot-local assets.
 * The parent cassette owns translation and interaction; this component only
 * owns the face mask, printed layer and real reel rotation.
 */
export default function NightSoulReelFace({
  side = 'left',
  reelTurn = 0,
  playing = false,
  reducedMotion = false,
  reelX = NIGHT_SOUL_REF_V4.reel.centerX,
}) {
  const sign = side === 'right' ? 1 : -1;
  const print = side === 'right' ? NIGHT_SOUL_REF_V4.prints.right : NIGHT_SOUL_REF_V4.prints.left;
  const maskId = `night-soul-ref-v4-face-${side}`;
  const rotation = reducedMotion ? 0 : reelTurn * sign;
  const state = playing ? 'playing' : reelTurn ? 'moving' : 'idle';

  return (
    <g
      data-cassette-functional-layer="functional-reel-hardware"
      data-cassette-element="reel-gear"
      data-reel-pivot="receiver-centre"
      data-reel-motion="signal"
      data-reel-state={state}
      data-reel-side={side}
      transform={`translate(${sign * reelX} 0)`}
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="-52" y="-52" width="104" height="104">
          <rect x="-52" y="-52" width="104" height="104" fill="black" />
          <circle r={NIGHT_SOUL_REF_V4.reel.faceRadius} fill="white" />
          <circle r={NIGHT_SOUL_REF_V4.reel.holeRadius} fill="black" />
          {NIGHT_SOUL_REF_V4.reel.apertures.map((aperture) => (
            <Aperture key={`${aperture.x}-${aperture.y}`} aperture={aperture} fill="black" />
          ))}
        </mask>
      </defs>
      <g transform={`rotate(${rotation})`}>
        <g data-cassette-depth-layer="reel-face-plate" mask={`url(#${maskId})`}>
          <circle r={NIGHT_SOUL_REF_V4.reel.faceRadius} fill={NIGHT_SOUL_REF_V4.reel.plateFill} />
          <image
            data-cassette-texture="reel-face-grain"
            href={NIGHT_SOUL_REF_V4.prints.grain}
            x="-50"
            y="-50"
            width="100"
            height="100"
            opacity=".22"
            preserveAspectRatio="xMidYMid slice"
          />
          <image
            data-cassette-decal={`reel-print-${side}`}
            href={print.href}
            x={print.x}
            y={print.y}
            width={print.width}
            height={print.height}
            preserveAspectRatio="xMidYMid meet"
          />
        </g>
        <circle r={NIGHT_SOUL_REF_V4.reel.faceRadius} fill="none" stroke={NIGHT_SOUL_REF_V4.reel.plateEdge} strokeWidth="1.2" opacity=".9" />
        <circle r={NIGHT_SOUL_REF_V4.reel.holeRadius} fill="none" stroke="#234B91" strokeWidth="1.4" opacity=".88" />
        {NIGHT_SOUL_REF_V4.reel.apertures.map((aperture) => (
          <Aperture key={`edge-${aperture.x}-${aperture.y}`} aperture={aperture} fill="none" stroke="#234B91" strokeWidth="1.2" opacity=".72" />
        ))}
      </g>
    </g>
  );
}
