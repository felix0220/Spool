import { useEffect, useState } from 'react';
import { IntakeStage } from './components/IntakeStage.jsx';
import { LyricOrbit } from './components/LyricOrbit.jsx';
import { TimelineSeek } from './components/TimelineSeek.jsx';
import { cueIndexAtTime, DEMO_CUES, parseLrc } from './music/lyrics.js';
import { formatTime } from './music/time.js';
import { useAudioClock } from './music/useAudioClock.js';

const tracks = [
  { title: 'Pink + White', artist: 'Frank Ocean', album: 'Blonde', number: '01', duration: 184 },
  { title: 'Nights', artist: 'Frank Ocean', album: 'Blonde', number: '02', duration: 307 },
  { title: 'Ivy', artist: 'Frank Ocean', album: 'Blonde', number: '03', duration: 250 },
];

function Icon({ name, weight = 'regular' }) {
  return <i className={`ph-${weight} ph-${name}`} aria-hidden="true" />;
}

export function App() {
  const [showIntake, setShowIntake] = useState(true);
  const [trackIndex, setTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [isRepeated, setIsRepeated] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [volume, setVolume] = useState(72);
  const [cues, setCues] = useState(DEMO_CUES);
  const [cueSource, setCueSource] = useState('demo slot');

  const track = tracks[trackIndex];

  const selectTrack = (index) => {
    setTrackIndex(index);
    setCues(DEMO_CUES);
    setCueSource('demo slot');
    clearAudio();
    setIsPlaying(true);
  };

  const skip = (direction) => {
    const next = isShuffled
      ? Math.floor(Math.random() * tracks.length)
      : (trackIndex + direction + tracks.length) % tracks.length;
    selectTrack(next);
  };

  const { audioRef, audioReady, audioFileName, currentTime, duration, loadAudio, clearAudio, seek } = useAudioClock({
    fallbackDuration: track.duration,
    isPlaying,
    repeat: isRepeated,
    setIsPlaying,
    onNext: () => skip(1),
  });

  const handleIntakeSource = (file) => {
    setTrackIndex(0);
    setCues(DEMO_CUES);
    setCueSource('demo slot');
    loadAudio(file);
    setIsPlaying(false);
  };

  const handleIntakeComplete = () => {
    setShowIntake(false);
    setIsPlaying(true);
  };

  const cueIndex = cueIndexAtTime(cues, currentTime);
  const cue = cues[cueIndex];

  const handleSeek = (time) => seek(time);

  const jumpCue = (direction) => {
    if (!cues.length) return;
    const current = cueIndex < 0 ? 0 : cueIndex;
    const target = Math.max(0, Math.min(cues.length - 1, current + direction));
    handleSeek(cues[target].start);
  };

  useEffect(() => {
    if (showIntake) return undefined;

    const handleKeyDown = (event) => {
      const tag = event.target?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(tag)) return;
      if (event.code === 'Space') {
        event.preventDefault();
        setIsPlaying((playing) => !playing);
      } else if (event.key.toLowerCase() === 'j') {
        jumpCue(-1);
      } else if (event.key.toLowerCase() === 'k') {
        jumpCue(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handleSeek(currentTime - 5);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleSeek(currentTime + 5);
      } else if (event.key === 'Home') {
        handleSeek(0);
      } else if (event.key === 'End') {
        handleSeek(duration);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, duration, cueIndex, cues, showIntake]);

  const handleLyricsImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const imported = parseLrc(await file.text());
    if (!imported.length) return;
    setCues(imported);
    setCueSource(file.name);
    handleSeek(imported[0].start);
  };

  const handleAudioImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    loadAudio(file);
  };

  return (
    <main className={`app-shell ${showIntake ? 'is-intake' : 'is-workbench'}`} tabIndex="-1" aria-keyshortcuts="Space J K ArrowLeft ArrowRight Home End">
      <audio ref={audioRef} preload="metadata" aria-label="Loaded track audio" />
      {showIntake ? (
        <IntakeStage />
      ) : (
        <>
          <div className="grain" aria-hidden="true" />
      <header className="topline panel">
        <div className="brand-lockup">
          <span className="brand-mark"><Icon name="waveform" weight="bold" /></span>
          <span>SIDE A</span>
          <small>LISTENING CONSOLE / 001</small>
        </div>
        <nav className="top-nav" aria-label="Primary navigation">
          <button className="nav-item is-active" type="button"><Icon name="disc" /> Library</button>
          <button className="nav-item" type="button"><Icon name="broadcast" /> Radio</button>
          <button className="nav-item" type="button"><Icon name="sliders-horizontal" /> Mix</button>
        </nav>
        <button className="icon-button" type="button" aria-label="Open settings"><Icon name="gear-six" /></button>
      </header>

      <section className="console-grid">
        <section className="hero-panel panel">
          <div className="hero-meta">
            <div>
              <p className="eyebrow">NOW / PLAYING</p>
              <p className="mono-caption">SIGNAL LOCKED <span className="signal-dot" /></p>
            </div>
            <div className="readout-block">
              <span className="readout">{track.number} / {String(tracks.length).padStart(2, '0')}</span>
              <span className="cue-readout">CUE {String(Math.max(cueIndex + 1, 1)).padStart(2, '0')} / {String(cues.length).padStart(2, '0')}</span>
            </div>
          </div>

          <div className="hero-copy">
            <p className="kicker">SIDE A / {track.album.toUpperCase()}</p>
            <h1>{track.title}</h1>
            <div className="artist-line">
              <span>{track.artist}</span>
              <span className="hairline" />
              <span>{track.album}</span>
            </div>
            <p className="cue-live" aria-live="polite">{cue?.text ?? 'LYRICS SLOT'} <span>/ {cueSource}</span></p>
          </div>

          <div className="record-stage">
            <div className="stage-label stage-label-left">HOVER / CLICK / FOCUS<br />TO REVEAL CUE</div>
            <div className="stage-label stage-label-right">33⅓ RPM<br />{audioReady ? `AUDIO / ${audioFileName.slice(0, 18)}` : 'DEMO CLOCK / READY'}</div>
            <LyricOrbit cue={cue} cueIndex={Math.max(cueIndex, 0)} cueCount={cues.length} isHovered={isHovered} isPlaying={isPlaying} track={track} onHoverChange={setIsHovered} />
            <span className="orbit orbit-one" aria-hidden="true" />
            <span className="orbit orbit-two" aria-hidden="true" />
          </div>

          <div className="meter-row" aria-hidden="true">
            {Array.from({ length: 18 }).map((_, index) => (
              <span key={index} className={index < Math.min(17, Math.round((currentTime / duration) * 18)) ? 'is-lit' : ''} />
            ))}
          </div>
          <div className="hero-footer">
            <span>TRACK TYPE / LOSSLESS</span>
            <span>{cues.length} CUES / {cueSource.toUpperCase()}</span>
            <span>J / K CUE NAV</span>
          </div>
        </section>

        <aside className="side-column">
          <section className="signal-panel panel">
            <div className="panel-heading">
              <span className="eyebrow">SIGNAL / SPECTRUM</span>
              <span className="status-chip">{audioReady ? 'AUDIO' : 'DEMO'}</span>
            </div>
            <div className="spectrum" aria-label="Animated audio spectrum">
              {Array.from({ length: 24 }).map((_, index) => (
                <span key={index} style={{ '--bar-height': `${18 + ((index * 17) % 58)}%`, '--delay': `${index * -0.08}s` }} />
              ))}
            </div>
            <div className="spectrum-foot"><span>L</span><span>STEREO / R</span><span>{formatTime(currentTime)}</span></div>
          </section>

          <section className="queue-panel panel">
            <div className="panel-heading">
              <span className="eyebrow">UP NEXT / QUEUE</span>
              <button className="text-button" type="button" onClick={() => setIsQueueOpen((current) => !current)}>
                {isQueueOpen ? 'CLOSE' : 'OPEN'} <Icon name={isQueueOpen ? 'caret-up' : 'arrow-up-right'} />
              </button>
            </div>
            <div className={`queue-list ${isQueueOpen ? 'is-open' : ''}`}>
              {tracks.map((item, index) => (
                <button className={`queue-item ${index === trackIndex ? 'is-current' : ''}`} type="button" key={item.title} onClick={() => selectTrack(index)}>
                  <span className="queue-index">{item.number}</span>
                  <span className="queue-track"><strong>{item.title}</strong><small>{item.artist}</small></span>
                  <span className="queue-time">{formatTime(item.duration)}</span>
                  <Icon name={index === trackIndex ? 'speaker-high' : 'play'} />
                </button>
              ))}
            </div>
            <div className="queue-footer"><span>3 TRACKS / 12:21</span><span>READY</span></div>
          </section>

          <section className="note-panel panel">
            <span className="note-number">02</span>
            <div>
              <p className="eyebrow">TIMELINE / INPUTS</p>
              <p>Lyrics are the first clock. Add your own licensed .lrc and audio file when ready; every component will follow the same cue map.</p>
              <div className="source-actions">
                <label className="file-button">LOAD .LRC<input type="file" accept=".lrc,.txt" onChange={handleLyricsImport} /></label>
                <label className="file-button">LOAD AUDIO<input type="file" accept="audio/*" onChange={handleAudioImport} /></label>
              </div>
            </div>
          </section>
        </aside>
      </section>

      <footer className="player-bar panel">
        <div className="player-track">
          <span className="mini-record" aria-hidden="true"><Icon name="disc" weight="bold" /></span>
          <div><strong>{track.title}</strong><span>{track.artist} / {track.album}</span></div>
          <button className={`icon-button ${isFavorite ? 'is-selected' : ''}`} type="button" aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'} aria-pressed={isFavorite} onClick={() => setIsFavorite((current) => !current)}><Icon name="heart" weight={isFavorite ? 'fill' : 'regular'} /></button>
        </div>
        <div className="transport">
          <div className="transport-buttons">
            <button className={`icon-button ${isShuffled ? 'is-selected' : ''}`} type="button" aria-label="Toggle shuffle" aria-pressed={isShuffled} onClick={() => setIsShuffled((current) => !current)}><Icon name="shuffle" /></button>
            <button className="icon-button" type="button" aria-label="Previous track" onClick={() => skip(-1)}><Icon name="skip-back" weight="fill" /></button>
            <button className="play-button" type="button" aria-label={isPlaying ? 'Pause' : 'Play'} onClick={() => setIsPlaying((current) => !current)}><Icon name={isPlaying ? 'pause' : 'play'} weight="fill" /></button>
            <button className="icon-button" type="button" aria-label="Next track" onClick={() => skip(1)}><Icon name="skip-forward" weight="fill" /></button>
            <button className={`icon-button ${isRepeated ? 'is-selected' : ''}`} type="button" aria-label="Toggle repeat" aria-pressed={isRepeated} onClick={() => setIsRepeated((current) => !current)}><Icon name="repeat" /></button>
          </div>
          <TimelineSeek currentTime={currentTime} duration={duration} cues={cues} onSeek={handleSeek} />
        </div>
        <div className="volume-control">
          <Icon name={volume === 0 ? 'speaker-slash' : 'speaker-high'} />
          <input aria-label="Volume" type="range" min="0" max="100" value={volume} onChange={(event) => setVolume(Number(event.target.value))} />
        </div>
      </footer>
        </>
      )}
    </main>
  );
}
