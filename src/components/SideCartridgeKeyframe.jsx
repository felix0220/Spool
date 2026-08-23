function StereoWaveform() {
  return (
    <svg className="side-keyframe-waveform" viewBox="0 0 760 286" role="img" aria-label="Stereo audio waveform with a red playback head">
      <defs>
        <pattern id="wave-grid" width="76" height="57" patternUnits="userSpaceOnUse">
          <path d="M 76 0 L 0 0 0 57" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.32" />
        </pattern>
      </defs>
      <rect width="760" height="286" fill="url(#wave-grid)" />
      <path d="M0 142H760" className="wave-divider" />
      <path d="M0 72 C15 68 19 92 35 82 S54 55 68 73 S90 98 108 76 S123 36 140 68 S156 84 169 72 S188 64 201 75 S216 90 231 75 S245 26 262 58 S281 108 300 81 S317 55 332 74 S346 120 364 77 S383 42 399 73 S419 92 436 73 S452 60 467 76 S486 101 503 76 S523 37 537 67 S552 96 569 76 S590 56 604 76 S621 116 637 80 S656 43 672 74 S692 90 707 72 S732 60 760 75" className="wave-path wave-path-a" />
      <path d="M0 212 C16 199 26 229 42 215 S61 185 78 211 S94 235 110 213 S124 172 140 203 S158 226 174 213 S192 200 206 214 S225 230 241 212 S257 169 274 199 S290 245 307 216 S327 190 342 211 S360 253 377 213 S395 181 411 209 S430 230 445 211 S463 199 479 214 S499 242 515 211 S533 175 549 201 S568 235 585 214 S602 195 617 213 S637 251 654 213 S674 182 689 208 S710 232 727 211 S748 196 760 211" className="wave-path wave-path-b" />
      <line x1="405" y1="0" x2="405" y2="286" className="wave-playhead" />
      <circle cx="405" cy="11" r="5" className="wave-playhead-cap" />
      <circle cx="405" cy="275" r="5" className="wave-playhead-cap" />
    </svg>
  );
}

function Dial({ label, value, accent = 'cream' }) {
  return (
    <div className={`side-dial side-dial-${accent}`} aria-hidden="true">
      <div className="side-dial-label">{label}</div>
      <div className="side-dial-face"><span className="side-dial-ticks" /><span className="side-dial-pointer" /><span className="side-dial-cap" /></div>
      <div className="side-dial-value">{value}</div>
    </div>
  );
}

function CassetteWindow() {
  return (
    <div className="side-cassette-window" aria-hidden="true">
      <div className="side-cassette-label">SIDE A</div>
      <div className="side-cassette-body">
        <span className="side-reel side-reel-left"><i /></span>
        <span className="side-reel side-reel-right"><i /></span>
        <span className="side-tape-line" />
        <span className="side-cassette-glint" />
      </div>
      <div className="side-cassette-foot">C-60&nbsp;&nbsp; NORMAL</div>
    </div>
  );
}

function TransportBay() {
  return (
    <div className="side-transport-bay" aria-hidden="true">
      <Dial label="INPUT" value="+06" accent="orange" />
      <Dial label="OUTPUT" value="-03" accent="cream" />
      <div className="side-pitch-control">
        <div className="side-dial-label">PITCH</div>
        <div className="side-pitch-rail"><span /></div>
        <div className="side-pitch-scale"><span>−</span><b>0</b><span>+</span></div>
      </div>
      <div className="side-transport-controls">
        <span className="transport-button transport-rewind"><i /></span>
        <span className="transport-button transport-stop"><i /></span>
        <span className="transport-button transport-forward"><i /></span>
        <span className="transport-button transport-play"><i /></span>
      </div>
    </div>
  );
}

function SpeakerDots() {
  return <div className="side-speaker-dots" aria-hidden="true">{Array.from({ length: 36 }, (_, index) => <span key={index} />)}</div>;
}

export default function SideCartridgeKeyframe() {
  return (
    <main className="side-cartridge-page">
      <div className="side-keyframe-intro"><span>INITIAL PROTOTYPE / FRONT KEYFRAME</span><span>STYLE ADAPTATION 02</span></div>
      <section className="side-cartridge-frame" role="img" aria-label="Side Cartridge audio sampler front keyframe">
        <header className="side-keyframe-header">
          <div className="side-header-mark"><span className="side-led" />02</div>
          <div className="side-header-title">SIDE CARTRIDGE</div>
          <div className="side-header-time">01:47:27</div>
          <div className="side-header-mode">STEREO</div>
          <div className="side-header-length">LEN&nbsp;&nbsp;04:20:00</div>
        </header>
        <div className="side-keyframe-main">
          <section className="side-scope-screen" aria-label="Stereo waveform screen">
            <div className="side-screen-topline"><span>L</span><span>R</span><span className="side-screen-status">PLAY / LOADED</span></div>
            <div className="side-wave-stage">
              <StereoWaveform />
              <span className="side-wave-time side-wave-time-start">00:00</span><span className="side-wave-time side-wave-time-mid">01:30</span><span className="side-wave-time side-wave-time-end">04:20</span>
            </div>
            <div className="side-screen-footer"><span>SR&nbsp;&nbsp;48K</span><span>BITS&nbsp;&nbsp;24</span><span>HPF&nbsp;&nbsp;40 Hz</span><span>LPF&nbsp;&nbsp;18 kHz</span><span className="side-screen-footer-accent">A / B</span></div>
          </section>
          <aside className="side-cartridge-module" aria-label="Cartridge and telemetry module">
            <CassetteWindow />
            <div className="side-module-divider" />
            <Dial label="FREQ" value="440 — 1440" accent="blue" />
            <div className="side-module-modes"><span><i className="mode-dot mode-orange" />BIAS</span><span><i className="mode-dot mode-blue" />EQ</span><span><i className="mode-dot mode-cream" />NR</span></div>
            <SpeakerDots />
          </aside>
        </div>
        <div className="side-keyframe-divider" />
        <TransportBay />
        <footer className="side-keyframe-footer"><span>INPUT / PLAYABLE SOURCE</span><span className="side-footer-center">CUE&nbsp;&nbsp; ◇ &nbsp;&nbsp; SAMPLE&nbsp;&nbsp; ◇ &nbsp;&nbsp; LOOP</span><span>OUTPUT / SIDE A</span></footer>
      </section>
    </main>
  );
}
