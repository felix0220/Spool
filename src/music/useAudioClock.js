import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AUDIO_LOAD_STATUS,
  MINIMUM_AUDIO_DURATION,
  createLoadRequestGuard,
  describeAudioFailure,
  describeTooShortAudio,
  isAudioDurationEligible,
  resolveAudioSource,
} from './audio-source-lifecycle.js';

const clampVolume = (value) => Math.max(0, Math.min(1, value));

function rampElementVolume(audio, target, duration, isCurrent) {
  const safeTarget = clampVolume(target);
  if (!audio || duration <= 0 || audio.paused || audio.volume === safeTarget) {
    if (audio) audio.volume = safeTarget;
    return Promise.resolve(Boolean(audio));
  }

  const startVolume = audio.volume;
  const start = performance.now();
  return new Promise((resolve) => {
    const step = (now) => {
      if (!isCurrent()) {
        resolve(false);
        return;
      }
      const progress = Math.min(1, (now - start) / duration);
      audio.volume = startVolume + (safeTarget - startVolume) * progress;
      if (progress < 1) requestAnimationFrame(step);
      else resolve(true);
    };
    requestAnimationFrame(step);
  });
}

export function useAudioClock({
  audioRef: providedAudioRef,
  fallbackDuration,
  isPlaying,
  repeat,
  setIsPlaying,
  onNext,
  sourceId = '',
  sourceUrl = '',
  sourceName = '',
  playbackRate = 1,
  loopRange = null,
  volume = 0.78,
  rampOutput = null,
  restoreOutput = null,
  minimumDuration = MINIMUM_AUDIO_DURATION,
}) {
  const internalAudioRef = useRef(null);
  const audioRef = providedAudioRef || internalAudioRef;
  const objectUrlRef = useRef('');
  const uploadSequenceRef = useRef(0);
  const repeatRef = useRef(repeat);
  const loopRangeRef = useRef(loopRange);
  const onNextRef = useRef(onNext);
  const playbackRateRef = useRef(playbackRate);
  const storedVolumeRef = useRef(clampVolume(volume));
  const loadGuardRef = useRef(null);
  const volumeTransitionRef = useRef(0);
  const sourceIdentityRef = useRef({ id: '', name: '' });
  const [uploadSource, setUploadSource] = useState(null);
  const [audioReady, setAudioReady] = useState(false);
  const [audioDuration, setAudioDuration] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [loadStatus, setLoadStatus] = useState(AUDIO_LOAD_STATUS.IDLE);
  const [loadError, setLoadError] = useState('');

  if (!loadGuardRef.current) loadGuardRef.current = createLoadRequestGuard();
  repeatRef.current = repeat;
  loopRangeRef.current = loopRange;
  onNextRef.current = onNext;
  playbackRateRef.current = playbackRate;
  storedVolumeRef.current = clampVolume(volume);

  const builtInSource = useMemo(() => (
    sourceUrl
      ? { id: sourceId || sourceUrl, url: sourceUrl, name: sourceName || sourceId || 'Built-in audio' }
      : null
  ), [sourceId, sourceName, sourceUrl]);
  const resolvedSource = useMemo(
    () => resolveAudioSource({ builtInSource, uploadSource }),
    [builtInSource, uploadSource],
  );
  const resolvedSourceId = resolvedSource?.id || '';
  const resolvedSourceName = resolvedSource?.name || '';
  const resolvedSourceUrl = resolvedSource?.url || '';
  sourceIdentityRef.current = { id: resolvedSourceId, name: resolvedSourceName };

  const duration = audioDuration ?? fallbackDuration;

  const reportFailure = useCallback((stage, error, { keepReady = false } = {}) => {
    const identity = sourceIdentityRef.current;
    const message = describeAudioFailure(stage, error);
    setLoadStatus(AUDIO_LOAD_STATUS.ERROR);
    setLoadError(message);
    if (!keepReady) setAudioReady(false);
    setIsPlaying(false);
    console.error(`[audio:${identity.id || 'unassigned'}] ${stage} failed`, error);
    return message;
  }, [setIsPlaying]);

  const seek = useCallback((time) => {
    const nextTime = Math.max(0, Math.min(time, duration));
    setCurrentTime(nextTime);
    if (audioRef.current && audioReady) audioRef.current.currentTime = nextTime;
  }, [audioReady, duration]);

  const reset = useCallback(() => {
    setCurrentTime(0);
    if (audioRef.current) audioRef.current.currentTime = 0;
  }, []);

  const stopAndSilence = useCallback(async ({ rampMs = 120, resetTime = false } = {}) => {
    const audio = audioRef.current;
    if (!audio) {
      setIsPlaying(false);
      return false;
    }
    const transitionId = volumeTransitionRef.current + 1;
    volumeTransitionRef.current = transitionId;
    const isCurrent = () => transitionId === volumeTransitionRef.current;
    const completed = typeof rampOutput === 'function'
      ? await rampOutput(0, rampMs)
      : await rampElementVolume(audio, 0, rampMs, isCurrent);
    if (!completed || !isCurrent()) return false;
    audio.pause();
    if (resetTime) {
      audio.currentTime = 0;
      setCurrentTime(0);
    }
    if (typeof restoreOutput === 'function') restoreOutput();
    else audio.volume = storedVolumeRef.current;
    setIsPlaying(false);
    return true;
  }, [rampOutput, restoreOutput, setIsPlaying]);

  // Built-in library URLs are passed directly through sourceUrl. Object URLs
  // exist only in this explicit future-upload path and are always revoked.
  const loadAudio = useCallback((file) => {
    const nextSource = URL.createObjectURL(file);
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = nextSource;
    uploadSequenceRef.current += 1;
    setUploadSource({
      id: `upload:${uploadSequenceRef.current}`,
      url: nextSource,
      name: file.name,
    });
  }, []);

  const clearAudio = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = '';
    }
    setUploadSource(null);
  }, []);

  useEffect(() => () => {
    loadGuardRef.current?.invalidate();
    volumeTransitionRef.current += 1;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const requestId = loadGuardRef.current.begin();
    const isCurrent = () => loadGuardRef.current.isCurrent(requestId);
    let disposed = false;
    let playbackFrameId = 0;
    const guard = () => !disposed && isCurrent();

    const cancelPlaybackFrame = () => {
      if (!playbackFrameId) return;
      cancelAnimationFrame(playbackFrameId);
      playbackFrameId = 0;
    };

    setAudioReady(false);
    setAudioDuration(null);
    setCurrentTime(0);
    setLoadError('');
    setLoadStatus(resolvedSourceUrl ? AUDIO_LOAD_STATUS.LOADING : AUDIO_LOAD_STATUS.IDLE);

    const handleLoaded = () => {
      if (!guard()) return;
      const actualDuration = Number.isFinite(audio.duration) ? audio.duration : null;
      setAudioDuration(actualDuration);
      if (!isAudioDurationEligible(actualDuration, minimumDuration)) {
        audio.pause();
        setAudioReady(false);
        setLoadStatus(AUDIO_LOAD_STATUS.TOO_SHORT);
        setLoadError(describeTooShortAudio(actualDuration, minimumDuration));
        setIsPlaying(false);
        return;
      }
      setAudioReady(true);
      setLoadStatus(AUDIO_LOAD_STATUS.READY);
      setLoadError('');
    };
    const handleError = () => {
      if (!guard()) return;
      reportFailure('source-load', audio.error);
    };
    const handleTime = () => {
      if (!guard()) return;
      const range = loopRangeRef.current;
      if (repeatRef.current && range && range.end > range.start && audio.currentTime >= range.end) {
        audio.currentTime = range.start;
        setCurrentTime(range.start);
        return;
      }
      setCurrentTime(audio.currentTime);
    };
    // `timeupdate` is intentionally kept as a low-frequency fallback, but it
    // is not precise enough for a visual playhead. While media is playing we
    // sample the media clock once per frame and stop the loop with the media.
    const playbackFrame = () => {
      if (!guard() || audio.paused || audio.ended) {
        playbackFrameId = 0;
        return;
      }
      handleTime();
      playbackFrameId = requestAnimationFrame(playbackFrame);
    };
    const startPlaybackClock = () => {
      if (!playbackFrameId) playbackFrameId = requestAnimationFrame(playbackFrame);
    };
    const handlePlaying = () => startPlaybackClock();
    const handlePause = () => {
      cancelPlaybackFrame();
      handleTime();
    };
    const handleEnded = () => {
      if (!guard()) return;
      cancelPlaybackFrame();
      if (repeatRef.current) {
        audio.currentTime = 0;
        audio.play().catch((error) => reportFailure('playback', error, { keepReady: true }));
        return;
      }
      onNextRef.current?.();
    };

    audio.addEventListener('loadedmetadata', handleLoaded);
    audio.addEventListener('canplay', handleLoaded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('timeupdate', handleTime);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    const prepareSource = async () => {
      await stopAndSilence({ rampMs: 120, resetTime: true });
      if (!guard()) return;
      if (!resolvedSourceUrl) {
        audio.removeAttribute('src');
        audio.load();
        return;
      }
      try {
        audio.src = resolvedSourceUrl;
        audio.playbackRate = playbackRateRef.current;
        audio.volume = typeof rampOutput === 'function' ? 1 : storedVolumeRef.current;
        audio.load();
      } catch (error) {
        if (guard()) reportFailure('source-load', error);
      }
    };
    prepareSource();

    return () => {
      disposed = true;
      cancelPlaybackFrame();
      audio.removeEventListener('loadedmetadata', handleLoaded);
      audio.removeEventListener('canplay', handleLoaded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('timeupdate', handleTime);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [minimumDuration, reportFailure, resolvedSourceId, resolvedSourceUrl, stopAndSilence]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !resolvedSourceUrl || !audioReady) return;
    if (!isPlaying) {
      audio.pause();
      return;
    }
    setLoadError('');
    setLoadStatus(AUDIO_LOAD_STATUS.READY);
    audio.volume = typeof rampOutput === 'function' ? 1 : storedVolumeRef.current;
    audio.play().catch((error) => reportFailure('playback', error, { keepReady: true }));
  }, [audioReady, isPlaying, rampOutput, reportFailure, resolvedSourceUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !resolvedSourceUrl) return;
    audio.playbackRate = playbackRate;
  }, [playbackRate, resolvedSourceUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !resolvedSourceUrl) return;
    audio.volume = typeof rampOutput === 'function' ? 1 : storedVolumeRef.current;
  }, [rampOutput, resolvedSourceUrl, volume]);

  useEffect(() => {
    if (resolvedSourceUrl || !isPlaying) return undefined;
    const timer = window.setInterval(() => {
      setCurrentTime((time) => {
        if (time >= fallbackDuration - 0.25) {
          if (repeatRef.current) return 0;
          onNextRef.current?.();
          return 0;
        }
        return Math.min(fallbackDuration, time + 0.25);
      });
    }, 250);
    return () => window.clearInterval(timer);
  }, [fallbackDuration, isPlaying, resolvedSourceUrl]);

  return {
    audioRef,
    audioSource: resolvedSourceUrl,
    audioFileName: resolvedSourceName,
    audioReady,
    currentTime,
    duration,
    loadStatus,
    loadError,
    loadAudio,
    clearAudio,
    reportFailure,
    reset,
    seek,
    stopAndSilence,
  };
}
