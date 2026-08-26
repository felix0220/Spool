import NightSoulReelFace from './NightSoulReelFace.jsx';
import { NIGHT_SOUL_REF_V4 } from './night-soul-reference.js';

function GuideHardware({ x }) {
  return (
    <g transform={`translate(${x} ${NIGHT_SOUL_REF_V4.guides.y})`}>
      <circle r={NIGHT_SOUL_REF_V4.guides.outerRadius} fill="#06225D" opacity=".82" stroke="#0A388F" strokeWidth="1.4" />
      <circle r="9.5" fill="#D94B31" opacity=".88" stroke="#F2A27E" strokeWidth="1.3" />
      <circle r="5.2" fill="#173C9A" opacity=".92" />
      <circle r="2.2" fill="#E9C5AB" opacity=".76" />
      <path d="M-5-9H5" stroke="#DCE7FF" strokeWidth="1" opacity=".52" />
    </g>
  );
}

export default function NightSoulSignalCassette({
  tape,
  onPointerDown,
  onKeyDown,
  interactive = true,
  holding = false,
  playing = false,
  reducedMotion = false,
}) {
  const reelTurn = tape.reelTurn ?? 0;
  const bodyMaskId = `night-soul-v4-body-cutouts-${tape.id}`;
  const grainPatternId = `night-soul-v4-grain-${tape.id}`;
  return (
    <g
      className="graphic-tape-entity graphic-tape-entity--night-soul-v4"
      data-tape-id={tape.id}
      data-tape-x={tape.x}
      data-tape-y={tape.y}
      data-tape-rotation={tape.rotation}
      data-tape-scale={tape.scale ?? 1}
      data-tape-visible={tape.visible ? 'true' : 'false'}
      transform={`translate(${tape.x} ${tape.y}) rotate(${tape.rotation}) scale(${tape.scale ?? 1})`}
      opacity={tape.opacity ?? 1}
    >
      <defs>
        <mask id={bodyMaskId} maskUnits="userSpaceOnUse" x="-150" y="-88" width="300" height="176">
          <rect x="-150" y="-88" width="300" height="176" fill="white" />
          <circle cx={-NIGHT_SOUL_REF_V4.reel.centerX} cy="0" r={NIGHT_SOUL_REF_V4.reel.holeRadius} fill="black" />
          <circle cx={NIGHT_SOUL_REF_V4.reel.centerX} cy="0" r={NIGHT_SOUL_REF_V4.reel.holeRadius} fill="black" />
        </mask>
        <pattern id={grainPatternId} width="16" height="16" patternUnits="userSpaceOnUse">
          <image href={NIGHT_SOUL_REF_V4.textures.grain} x="0" y="0" width="16" height="16" preserveAspectRatio="none" />
        </pattern>
      </defs>
      <rect
        className="graphic-tape-shadow"
        x="-141"
        y="-79"
        width="282"
        height="158"
        rx="12"
        fill="#061333"
        opacity=".34"
        transform="translate(0 10)"
        filter="url(#tape-shadow)"
        pointerEvents="none"
      />
      <g
        className={`graphic-tape${interactive ? ' is-draggable' : ''}`}
        data-variant="signal"
        data-track-id={tape.trackId || undefined}
        data-art-variant={tape.artVariant || undefined}
        data-cassette-art="night-soul-blue-reel-ref-v4"
        data-holding={holding ? 'true' : undefined}
        onPointerDown={interactive ? onPointerDown : undefined}
        onKeyDown={interactive ? onKeyDown : undefined}
        role={interactive ? 'button' : undefined}
        aria-label={interactive ? 'Drag cassette into the deck' : undefined}
        tabIndex={interactive ? 0 : undefined}
      >
        <g className={interactive ? 'graphic-tape-idle-drift' : undefined} style={interactive ? { '--idle-delay': `${-tape.phase / 1.35}s` } : undefined}>
          <rect
            data-cassette-drag-hit="true"
            x="-140"
            y="-78"
            width="280"
            height="156"
            rx="11"
            fill="transparent"
            pointerEvents={interactive ? 'all' : 'none'}
          />
          <g data-cassette-depth-layer="night-soul-v4-body" mask={`url(#${bodyMaskId})`} pointerEvents="none">
            <g data-cassette-depth-layer="rear-media">
              <rect x="-136" y="-75" width="272" height="150" rx="11" fill={NIGHT_SOUL_REF_V4.colors.shellDeep} opacity=".98" />
              <rect x="-127" y="-61" width="254" height="91" rx="5" fill={NIGHT_SOUL_REF_V4.colors.rearMedia} opacity=".96" />
            </g>
            <g data-cassette-depth-layer="lower-mechanical-substrate">
              <path d="M-132 26H132L116 75H-116Z" fill="#0E56C2" opacity=".60" stroke="#73CFFF" strokeWidth="1.1" />
              <path d="M-119 33H119L106 69H-106Z" fill="#125FD1" opacity=".34" stroke="#082F88" strokeWidth="1" />
              <path d="M-116 57Q-42 42 0 68Q42 42 116 57" fill="none" stroke="#6BC9FF" strokeWidth="1.35" opacity=".44" />
              <path d="M-116 71H116" fill="none" stroke="#A5E3FF" strokeWidth="1" opacity=".30" />
              <path d="M0 49V71" fill="none" stroke="#06276F" strokeWidth="2.2" opacity=".84" />
              <rect x="-17" y="67" width="34" height="7" rx="2" fill="#062A72" stroke="#17459B" strokeWidth="1.1" opacity=".94" />
              {[-44, 44].map((x) => (
                <g key={x} transform={`translate(${x} 61)`}>
                  <circle r="7" fill="#0A2A70" stroke="#5AA6EC" strokeWidth="1" opacity=".82" />
                  <circle r="3.4" fill="#05153C" stroke="#3D7AC7" strokeWidth=".8" />
                  <path d="M-2.4-2.4L2.4 2.4M2.4-2.4L-2.4 2.4" stroke="#98C9F3" strokeWidth=".7" opacity=".56" />
                </g>
              ))}
            </g>
            <g data-cassette-depth-layer="translucent-shell-field">
              <rect x="-140" y="-78" width="280" height="156" rx="11" fill={NIGHT_SOUL_REF_V4.colors.shellCobalt} opacity=".56" stroke="#008CD8" strokeWidth="2.4" />
              <rect x="-134" y="-72" width="268" height="144" rx="9" fill="none" stroke={NIGHT_SOUL_REF_V4.colors.shellCyan} strokeWidth="1.4" opacity=".68" />
              <rect x="-129" y="-66" width="258" height="105" rx="6" fill="#041A47" opacity=".54" stroke="#0F4CC1" strokeWidth="1" />
              <path d="M-134-48H134M-134 37H134" stroke="#62CFFF" strokeWidth="1" opacity=".24" />
              <path d="M-126-68H-37M37-68H126M-126 73H-40M40 73H126" stroke="#A9E8FF" strokeWidth="1.2" opacity=".42" />
            </g>
            <g data-cassette-depth-layer="electric-glow-texture" opacity=".56">
              <image href={NIGHT_SOUL_REF_V4.textures.glow} x="-140" y="-78" width="280" height="156" preserveAspectRatio="xMidYMid slice" style={{ mixBlendMode: 'screen' }} />
            </g>
            <g data-cassette-depth-layer="shell-fog-overlay" opacity=".52">
              <image href={NIGHT_SOUL_REF_V4.textures.fog} x="-140" y="-78" width="280" height="156" preserveAspectRatio="xMidYMid slice" style={{ mixBlendMode: 'screen' }} />
            </g>
            <g data-cassette-depth-layer="molded-seams">
              <path d="M-132-62V-70H-112M132-62V-70H112M-132 61V70H-112M132 61V70H112" fill="none" stroke="#8EDFFF" strokeWidth="1.6" opacity=".58" />
              <path d="M-136-75H136M-136 75H136" fill="none" stroke="#082B7A" strokeWidth="1.1" opacity=".74" />
              {[-122, 122].flatMap((x) => [-66, 66].map((y) => (
                <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
                  <circle r="5.2" fill="#05112F" stroke="#6FB7EF" strokeWidth="1" opacity=".86" />
                  <circle r="2" fill="#020817" />
                </g>
              )))}
            </g>
            <g data-cassette-depth-layer="shell-edge-wear" opacity=".74">
              <image href={NIGHT_SOUL_REF_V4.textures.edgeWear} x="-140" y="-78" width="280" height="156" preserveAspectRatio="xMidYMid slice" />
            </g>
          </g>

          <NightSoulReelFace side="left" reelTurn={reelTurn} playing={playing} reducedMotion={reducedMotion} />
          <NightSoulReelFace side="right" reelTurn={reelTurn} playing={playing} reducedMotion={reducedMotion} />

          <g data-cassette-depth-layer="lower-guide-hardware" pointerEvents="none">
            <GuideHardware x={NIGHT_SOUL_REF_V4.guides.leftX} />
            <GuideHardware x={NIGHT_SOUL_REF_V4.guides.rightX} />
            <g transform={`translate(${NIGHT_SOUL_REF_V4.centerLock.x} ${NIGHT_SOUL_REF_V4.centerLock.y})`}>
              <circle r={NIGHT_SOUL_REF_V4.centerLock.radius + 3} fill="#0A2C76" stroke="#5DAAFF" strokeWidth="1.3" opacity=".9" />
              <circle r={NIGHT_SOUL_REF_V4.centerLock.radius} fill="#06163E" stroke="#1760CB" strokeWidth="1.2" />
              <circle r="3" fill="#010712" />
            </g>
          </g>

          <g data-cassette-depth-layer="top-stickers" pointerEvents="none">
            <g data-cassette-depth-layer="sticker-shadows" opacity=".10" filter="url(#night-soul-tape-shadow)">
              <image href={NIGHT_SOUL_REF_V4.stickers.lord.href} x={NIGHT_SOUL_REF_V4.stickers.lord.x} y={NIGHT_SOUL_REF_V4.stickers.lord.y + 2} width={NIGHT_SOUL_REF_V4.stickers.lord.width} height={NIGHT_SOUL_REF_V4.stickers.lord.height} preserveAspectRatio="xMidYMid meet" />
              <image href={NIGHT_SOUL_REF_V4.stickers.waitOnYou.href} x={NIGHT_SOUL_REF_V4.stickers.waitOnYou.x} y={NIGHT_SOUL_REF_V4.stickers.waitOnYou.y + 2} width={NIGHT_SOUL_REF_V4.stickers.waitOnYou.width} height={NIGHT_SOUL_REF_V4.stickers.waitOnYou.height} preserveAspectRatio="xMidYMid meet" />
            </g>
            <g opacity=".88">
              <image data-cassette-decal="lord-strip" href={NIGHT_SOUL_REF_V4.stickers.lord.href} x={NIGHT_SOUL_REF_V4.stickers.lord.x} y={NIGHT_SOUL_REF_V4.stickers.lord.y} width={NIGHT_SOUL_REF_V4.stickers.lord.width} height={NIGHT_SOUL_REF_V4.stickers.lord.height} preserveAspectRatio="xMidYMid meet" />
              <image data-cassette-decal="wait-on-you-strip" href={NIGHT_SOUL_REF_V4.stickers.waitOnYou.href} x={NIGHT_SOUL_REF_V4.stickers.waitOnYou.x} y={NIGHT_SOUL_REF_V4.stickers.waitOnYou.y} width={NIGHT_SOUL_REF_V4.stickers.waitOnYou.width} height={NIGHT_SOUL_REF_V4.stickers.waitOnYou.height} preserveAspectRatio="xMidYMid meet" />
            </g>
          </g>

          <rect data-cassette-depth-layer="surface-grain" x="-140" y="-78" width="280" height="156" fill={`url(#${grainPatternId})`} opacity=".78" style={{ mixBlendMode: 'soft-light' }} pointerEvents="none" />

          {holding && (
            <g className="graphic-tape-hold-indicator" pointerEvents="none">
              <rect x="-140" y="-78" width="280" height="156" rx="11" fill="none" stroke="#FFFDF6" strokeWidth="2.4" opacity=".94" />
              <rect x="-137" y="-75" width="274" height="150" rx="9" fill="none" stroke="#6B86FF" strokeWidth="1.4" opacity=".88" />
            </g>
          )}
        </g>
      </g>
    </g>
  );
}
