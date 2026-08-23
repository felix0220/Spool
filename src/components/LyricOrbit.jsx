export function LyricOrbit({
  cue,
  cueIndex,
  cueCount,
  isHovered,
  isPlaying,
  track,
  onHoverChange,
}) {
  const cueId = `lyric-cue-${track.number}`;

  return (
    <button
      className={`record-button ${isPlaying ? 'is-playing' : 'is-paused'} ${isHovered ? 'is-hovered' : ''}`}
      type="button"
      aria-label={`Reveal lyric cue ${cueIndex + 1} for ${track.title}`}
      aria-controls={cueId}
      aria-expanded={isHovered}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      onFocus={() => onHoverChange(true)}
      onBlur={() => onHoverChange(false)}
      onClick={() => onHoverChange(true)}
    >
      <span className="record-grooves" aria-hidden="true" />
      <span className="record-label">
        <span className="record-label-top">BLONDE / SIDE A</span>
        <span className="record-label-title">{track.title}</span>
        <span className="record-hole" />
        <span className="record-label-bottom">FRANK OCEAN · 001</span>
      </span>
      <span
        id={cueId}
        className="lyric-layer"
        aria-hidden={!isHovered}
        style={{
          opacity: isHovered ? 1 : 0,
          transform: isHovered ? 'scale(1) rotate(0deg)' : 'scale(0.9) rotate(-8deg)',
        }}
      >
        <span className="lyric-tag">CUE {String(cueIndex + 1).padStart(2, '0')} / {String(cueCount).padStart(2, '0')} · {cue?.source}</span>
        <span className="lyric-lines" style={{ transform: isHovered ? 'translateY(0)' : 'translateY(9px)' }}>{cue?.text ?? 'LYRICS SLOT'}</span>
      </span>
      <span className="needle-shadow" aria-hidden="true" />
    </button>
  );
}
