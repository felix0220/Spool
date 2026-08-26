/**
 * Industrial surface details for the shared top-loading shell.
 *
 * This module owns only shallow, chassis-bound detail. It deliberately does
 * not own the cassette bay, lid motion, or any interaction state. The parent
 * passes the current quadrilateral so every mark stays attached to the same
 * surface during the top-to-front continuity transition.
 */

import {
  MARK_SIZE,
  SPOOL_MARK_PATH,
  WORDMARK_BASELINE_OFFSET,
  WORDMARK_WIDTH,
  getBrandBadgeLayout,
} from './brand-badge-geometry.js';

const lerp = (a, b, t) => a + (b - a) * t;

const quadPoint = (quad, u, v) => {
  // GraphicDeckStage supplies points clockwise from the near/front-left
  // corner. Surface-space v must still read like the reference image:
  // v=0 is the visual top/rear edge and v=1 is the visual bottom/front edge.
  const top = [
    lerp(quad[3][0], quad[2][0], u),
    lerp(quad[3][1], quad[2][1], u),
  ];
  const bottom = [
    lerp(quad[0][0], quad[1][0], u),
    lerp(quad[0][1], quad[1][1], u),
  ];
  return [lerp(top[0], bottom[0], v), lerp(top[1], bottom[1], v)];
};

const quadRect = (quad, u0, v0, u1, v1) => [
  quadPoint(quad, u0, v0),
  quadPoint(quad, u1, v0),
  quadPoint(quad, u1, v1),
  quadPoint(quad, u0, v1),
];

const pointString = (point) => point.map((value) => value.toFixed(2)).join(',');
const polygonString = (polygon) => polygon.map(pointString).join(' ');

function VentBank({ quad, startU, keyPrefix, depth }) {
  return (
    <g className="industrial-vent-bank" aria-hidden="true">
      {Array.from({ length: 3 }, (_, row) => (
        Array.from({ length: 7 }, (_, column) => {
          const u = startU + column * .0145;
          const v = .135 + row * .035;
          const [cx, cy] = quadPoint(quad, u, v);
          return (
            <g
              key={`${keyPrefix}-${row}-${column}`}
              transform={`translate(${cx.toFixed(2)} ${cy.toFixed(2)})`}
            >
              <ellipse rx="2.55" ry={2.55 * depth} fill="#4D4F4B" />
              <ellipse
                cy={-.52 * depth}
                rx="1.55"
                ry={1.2 * depth}
                fill="#242725"
                opacity=".88"
              />
              <path
                d={`M-1.2 ${1.1 * depth}Q0 ${1.65 * depth} 1.2 ${1.1 * depth}`}
                fill="none"
                stroke="#EEEAE0"
                strokeWidth=".55"
                opacity=".38"
              />
            </g>
          );
        })
      ))}
    </g>
  );
}

function Fastener({ quad, u, v, depth }) {
  const [cx, cy] = quadPoint(quad, u, v);
  const ry = 6.2 * Math.max(.24, depth);
  return (
    <g className="industrial-fastener" transform={`translate(${cx.toFixed(2)} ${cy.toFixed(2)})`} aria-hidden="true">
      <ellipse
        rx="6.4"
        ry={ry}
        fill="#C9C8C1"
        stroke="#747772"
        strokeWidth=".95"
      />
      <ellipse
        cy={-.45 * depth}
        rx="4.95"
        ry={Math.max(1.2, ry - 1.35)}
        fill="none"
        stroke="#F1EEE5"
        strokeWidth=".65"
        opacity=".78"
      />
      <path
        d={`M-2.55 0H2.55M0 ${-Math.min(2.55, ry * .52)}V${Math.min(2.55, ry * .52)}`}
        stroke="#656862"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
    </g>
  );
}

/**
 * A recess pressed into the shell. The surface light comes from the upper
 * left, so a pit takes shadow on its top and left inner walls and catches
 * light on the bottom and right ones — the opposite of the raised mark and
 * lettering that sit inside it.
 */
function EngravedWell({ rect }) {
  const [topLeft, topRight, bottomRight, bottomLeft] = rect;
  return (
    <>
      <polygon points={polygonString(rect)} fill="#CFCDC5" />
      <path
        d={`M${pointString(bottomLeft)}L${pointString(topLeft)}L${pointString(topRight)}`}
        fill="none"
        stroke="#8B8D86"
        strokeWidth="1.15"
      />
      <path
        d={`M${pointString(topRight)}L${pointString(bottomRight)}L${pointString(bottomLeft)}`}
        fill="none"
        stroke="#F1EEE5"
        strokeWidth="1.15"
        opacity=".68"
      />
    </>
  );
}

/**
 * The mark, pressed rather than printed. It carries no colour of its own: the
 * exact two-layer treatment the wordmark uses — a light rim offset up-left,
 * then the dark face over it — so both wells read as one stamping operation.
 */
function BrandMark({ centerX, centerY, size, depth }) {
  const place = `translate(${(centerX - size / 2).toFixed(2)} ${(centerY - size / 2).toFixed(2)})`
    + ` scale(${(size / 100).toFixed(5)})`;
  return (
    <>
      <path
        d={SPOOL_MARK_PATH}
        fillRule="evenodd"
        fill="#F1EEE5"
        opacity=".72"
        transform={`translate(${-0.45 * depth} ${-0.55 * depth}) ${place}`}
      />
      <path
        d={SPOOL_MARK_PATH}
        fillRule="evenodd"
        fill="#85877F"
        transform={place}
      />
    </>
  );
}

function BrandPlaque({ quad, depth }) {
  const badge = getBrandBadgeLayout();
  const markWell = quadRect(quad, badge.markWell.u0, badge.v0, badge.markWell.u1, badge.v1);
  const wordWell = quadRect(quad, badge.wordWell.u0, badge.v0, badge.wordWell.u1, badge.v1);
  const [markX, markY] = quadPoint(quad, badge.markCenterU, badge.midV);
  const [wordX, wordY] = quadPoint(quad, badge.wordCenterU, badge.midV);

  return (
    <g className="industrial-brand-plaque" aria-hidden="true">
      <EngravedWell rect={markWell} />
      <EngravedWell rect={wordWell} />

      <BrandMark centerX={markX} centerY={markY} size={MARK_SIZE * depth} depth={depth} />

      {[{ fill: '#F1EEE5', op: '.72', dx: -0.45 * depth, dy: -0.55 * depth },
        { fill: '#85877F', op: '1', dx: 0, dy: 0 }].map((layer, index) => (
        <text
          key={index}
          x={wordX}
          y={wordY + WORDMARK_BASELINE_OFFSET * depth}
          fontFamily="SignPainter, 'Brush Script MT', 'Segoe Script', cursive"
          fontSize={20 * depth}
          fontWeight={400}
          textAnchor="middle"
          textLength={WORDMARK_WIDTH * depth}
          lengthAdjust="spacingAndGlyphs"
          fill={layer.fill}
          opacity={layer.op}
          transform={`translate(${layer.dx} ${layer.dy})`}
        >
          spool.
        </text>
      ))}
    </g>
  );
}

export function TopSurfaceDetails({ panel, top, panelPath, opacity = 1 }) {
  if (!panel || !top) return null;
  const depth = Math.max(.22, Math.min(1, Math.abs(panel[0][1] - panel[3][1]) / 268));
  return (
    <g
      className="industrial-top-surface-details"
      opacity={opacity}
      pointerEvents="none"
    >
      {panelPath ? (
        <path
          className="industrial-plastic-grain"
          d={panelPath}
          fill="url(#industrial-plastic-grain)"
          opacity=".1"
        />
      ) : (
        <polygon
          className="industrial-plastic-grain"
          points={polygonString(panel)}
          fill="url(#industrial-plastic-grain)"
          opacity=".1"
        />
      )}
      <g opacity=".92">
        <VentBank
          quad={panel}
          startU={.105}
          keyPrefix="left-vent"
          depth={depth}
        />
        <VentBank
          quad={panel}
          startU={.808}
          keyPrefix="right-vent"
          depth={depth}
        />
      </g>

      <BrandPlaque quad={panel} depth={depth} />

      <g opacity=".86">
        <Fastener quad={panel} u={.025} v={.055} depth={depth} />
        <Fastener quad={panel} u={.975} v={.055} depth={depth} />
        <Fastener quad={panel} u={.025} v={.945} depth={depth} />
        <Fastener quad={panel} u={.975} v={.945} depth={depth} />
      </g>
    </g>
  );
}

export function LidSurfaceDetails({ lid, opacity = 1 }) {
  if (!lid) return null;
  return (
    <g className="industrial-lid-surface-details" opacity={opacity} pointerEvents="none">
      <polygon points={polygonString(lid)} fill="url(#industrial-plastic-grain)" opacity=".085" />
    </g>
  );
}
