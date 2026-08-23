/**
 * Industrial surface details for the shared top-loading shell.
 *
 * This module owns only shallow, chassis-bound detail. It deliberately does
 * not own the cassette bay, lid motion, or any interaction state. The parent
 * passes the current quadrilateral so every mark stays attached to the same
 * surface during the top-to-front continuity transition.
 */

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

function BrandPlaque({ quad, depth }) {
  const plaque = quadRect(quad, .438, .072, .562, .16);
  const [cx, cy] = quadPoint(quad, .5, .117);
  const wordmarkStyle = {
    x: cx,
    fontFamily: "SignPainter, 'Brush Script MT', 'Segoe Script', cursive",
    fontSize: 20 * depth,
    fontWeight: 400,
    textAnchor: 'middle',
    textLength: 67 * depth,
    lengthAdjust: 'spacingAndGlyphs',
  };
  return (
    <g className="industrial-brand-plaque" aria-hidden="true">
      <polygon points={polygonString(plaque)} fill="#D3D1C9" stroke="#92948E" strokeWidth=".9" />
      <text
        {...wordmarkStyle}
        y={cy + 5.2 * depth}
        fill="#F1EEE5"
        opacity=".72"
        transform={`translate(${-0.45 * depth} ${-0.55 * depth})`}
      >
        spool.
      </text>
      <text
        {...wordmarkStyle}
        y={cy + 5.2 * depth}
        fill="#85877F"
      >
        spool.
      </text>
    </g>
  );
}

export function TopSurfaceDetails({ panel, top, opacity = 1 }) {
  if (!panel || !top) return null;
  const depth = Math.max(.22, Math.min(1, Math.abs(panel[0][1] - panel[3][1]) / 268));
  return (
    <g
      className="industrial-top-surface-details"
      opacity={opacity}
      pointerEvents="none"
    >
      <polygon
        className="industrial-plastic-grain"
        points={polygonString(panel)}
        fill="url(#industrial-plastic-grain)"
        opacity=".1"
      />
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
