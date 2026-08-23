import { useEffect, useMemo, useState } from 'react';
import {
  createWaveformPlaceholder,
  DEFAULT_SAMPLE_COUNT,
  getCachedWaveform,
  loadTrackWaveform,
} from './waveform-cache.js';

const EMPTY_WAVEFORM = createWaveformPlaceholder();

function describeWaveformError(error) {
  if (error?.name === 'AbortError') return 'Waveform decode was cancelled.';
  return error instanceof Error ? error.message : 'Waveform decode failed.';
}

export function useTrackWaveform(track, { sampleCount = DEFAULT_SAMPLE_COUNT } = {}) {
  const trackKey = useMemo(
    () => track ? `${track.id}:${track.audioUrl}:${sampleCount}` : '',
    [sampleCount, track],
  );
  const [state, setState] = useState({ key: '', status: 'empty', waveform: EMPTY_WAVEFORM, error: '' });

  useEffect(() => {
    let stale = false;
    if (!track) {
      setState({ key: '', status: 'empty', waveform: EMPTY_WAVEFORM, error: '' });
      return undefined;
    }

    const cached = getCachedWaveform(track, sampleCount);
    if (cached) {
      setState({ key: trackKey, status: 'ready', waveform: cached, error: '' });
      return undefined;
    }

    setState({ key: trackKey, status: 'loading', waveform: EMPTY_WAVEFORM, error: '' });
    loadTrackWaveform(track, { sampleCount })
      .then((waveform) => {
        if (!stale) setState({ key: trackKey, status: 'ready', waveform, error: '' });
      })
      .catch((error) => {
        if (!stale) setState({ key: trackKey, status: 'error', waveform: EMPTY_WAVEFORM, error: describeWaveformError(error) });
      });

    return () => {
      stale = true;
    };
  }, [sampleCount, track, trackKey]);

  if (state.key !== trackKey) {
    return { status: track ? 'loading' : 'empty', waveform: EMPTY_WAVEFORM, error: '' };
  }
  return state;
}
