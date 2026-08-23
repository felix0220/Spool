import { useRef, useState } from 'react';
import { formatTime } from '../music/time.js';

export function TimelineSeek({ currentTime, duration, cues, onSeek }) {
  const trackRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const seekFromPointer = (event) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || !duration) return;
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    onSeek(ratio * duration);
  };

  const handlePointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setIsDragging(true);
    seekFromPointer(event);
  };

  const handlePointerMove = (event) => {
    if (isDragging) seekFromPointer(event);
  };

  const handlePointerUp = (event) => {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsDragging(false);
  };

  return (
    <div className="timeline-control">
      <div
        ref={trackRef}
        className={`timeline-track-wrap ${isDragging ? 'is-dragging' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="timeline-markers" aria-hidden="true">
          {cues.map((cue) => (
            <span key={cue.id} style={{ left: `${Math.min(100, (cue.start / duration) * 100)}%` }} />
          ))}
        </div>
        <input
          aria-label="Playback position"
          type="range"
          min="0"
          max={duration}
          step="0.01"
          value={Math.min(currentTime, duration)}
          aria-valuetext={formatTime(currentTime)}
          onChange={(event) => onSeek(Number(event.target.value))}
        />
      </div>
      <div className="progress-line-foot">
        <span className="timecode">{formatTime(currentTime)}</span>
        <span className="timeline-hint">DRAG / J K CUE / ← → SEEK</span>
        <span className="timecode">{formatTime(duration)}</span>
      </div>
    </div>
  );
}
