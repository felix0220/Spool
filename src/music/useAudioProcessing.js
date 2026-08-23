import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clampGain,
  scheduleGainRamp,
  scheduleGainTarget,
} from './audio-gain.js';
import { createSignalLevelStore } from './signal-level-store.js';
import { registerWaveformDecodeContext } from './waveform-cache.js';

// A media element can only be passed to createMediaElementSource once for its
// lifetime. Keep the graph per element so React StrictMode remounts and hot
// reloads reconnect the existing source instead of throwing InvalidStateError.
const graphCache = new WeakMap();

function makeTapeCurve(amount = 1) {
  const curve = new Float32Array(1024);
  const drive = 1 + amount * 5;
  for (let index = 0; index < curve.length; index += 1) {
    const x = (index * 2) / (curve.length - 1) - 1;
    curve[index] = Math.tanh(x * drive) / Math.tanh(drive);
  }
  return curve;
}

export function useAudioProcessing({
  audioRef,
  toneCutoff = 400,
  spaceAmount = 0,
  textureAmount = 0,
  volume = 0.78,
  isPlaying = false,
}) {
  const graphRef = useRef(null);
  const isPlayingRef = useRef(isPlaying);
  const volumeRef = useRef(clampGain(volume));
  const gainTransitionRef = useRef(null);
  const signalStoreRef = useRef(null);
  if (!signalStoreRef.current) signalStoreRef.current = createSignalLevelStore();
  const [graphReady, setGraphReady] = useState(false);

  isPlayingRef.current = isPlaying;
  volumeRef.current = clampGain(volume);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || typeof window === 'undefined') return undefined;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return undefined;

    let graph = graphCache.get(audio);
    if (!graph) {
      const context = new AudioContextClass();
      graph = {
        context,
        source: context.createMediaElementSource(audio),
        filter: context.createBiquadFilter(),
        shaper: context.createWaveShaper(),
        dry: context.createGain(),
        wet: context.createGain(),
        spaceDelay: context.createDelay(1),
        spaceFeedback: context.createGain(),
        spaceWet: context.createGain(),
        output: context.createGain(),
        analyser: context.createAnalyser(),
      };
      graph.shaper.oversample = '2x';
      graph.analyser.fftSize = 256;
      graph.analyser.smoothingTimeConstant = 0.72;
      graph.spaceDelay.delayTime.value = 0.12;
      graph.spaceFeedback.gain.value = 0;
      graph.spaceWet.gain.value = 0;
      graphCache.set(audio, graph);
    }

    const {
      context,
      source,
      filter,
      shaper,
      dry,
      wet,
      spaceDelay,
      spaceFeedback,
      spaceWet,
      output,
      analyser,
    } = graph;
    // Tone is additive: at the left endpoint the source remains full-band and
    // neutral; scrolling right adds a gentle high-shelf lift. A low-pass here
    // would make the initial state muffled and make a fuller indicator appear
    // paradoxically clearer.
    filter.type = 'highshelf';
    filter.frequency.value = 2400;
    // Reuse the media graph's AudioContext for waveform decoding. This keeps
    // the active track on one browser audio lifecycle instead of creating a
    // second decoder context for every cassette.
    registerWaveformDecodeContext(context);
    // StrictMode cleanup disconnects these nodes before the second setup.
    // Reconnecting the cached source is valid; recreating it is not.
    source.connect(filter);
    filter.connect(dry);
    filter.connect(shaper);
    shaper.connect(wet);
    filter.connect(spaceDelay);
    spaceDelay.connect(spaceFeedback);
    spaceFeedback.connect(spaceDelay);
    spaceDelay.connect(spaceWet);
    dry.connect(output);
    wet.connect(output);
    spaceWet.connect(output);
    output.connect(analyser);
    analyser.connect(context.destination);

    audio.volume = 1;
    output.gain.value = volumeRef.current;

    graphRef.current = graph;
    setGraphReady(true);
    let frameId = 0;
    const buffer = new Uint8Array(analyser.fftSize);
    const sample = () => {
      analyser.getByteTimeDomainData(buffer);
      let sum = 0;
      for (const value of buffer) {
        const centered = (value - 128) / 128;
        sum += centered * centered;
      }
      const rms = isPlayingRef.current
        ? Math.min(1, Math.sqrt(sum / buffer.length) * 2.2)
        : 0;
      const previous = signalStoreRef.current.getSnapshot();
      const next = (() => {
        const response = rms > previous ? 0.36 : 0.08;
        const candidate = previous + (rms - previous) * response;
        if (Math.abs(candidate - previous) < 0.001) return rms === 0 ? 0 : previous;
        return candidate;
      })();
      signalStoreRef.current.set(next);
      frameId = window.requestAnimationFrame(sample);
    };
    frameId = window.requestAnimationFrame(sample);

    return () => {
      window.cancelAnimationFrame(frameId);
      source.disconnect();
      filter.disconnect();
      shaper.disconnect();
      dry.disconnect();
      wet.disconnect();
      spaceDelay.disconnect();
      spaceFeedback.disconnect();
      spaceWet.disconnect();
      output.disconnect();
      analyser.disconnect();
      graphRef.current = null;
      setGraphReady(false);
      signalStoreRef.current.reset();
      if (gainTransitionRef.current) {
        window.clearTimeout(gainTransitionRef.current.timer);
        gainTransitionRef.current.resolve(false);
        gainTransitionRef.current = null;
      }
      // Do not close the context: the cached MediaElementSource must remain
      // reusable if React remounts this hook or Vite hot-reloads the module.
    };
  }, [audioRef]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    const toneValue = Math.max(0, Math.min(1, (toneCutoff - 400) / (20000 - 400)));
    graph.filter.frequency.setTargetAtTime(2400, graph.context.currentTime, 0.025);
    graph.filter.gain.setTargetAtTime(toneValue * 16, graph.context.currentTime, 0.025);
  }, [toneCutoff]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    const amount = Math.max(0, Math.min(1, spaceAmount));
    const now = graph.context.currentTime;
    // SPACE is a continuous short-room send. At zero it is fully dry; the
    // delay, feedback, and return gain all ramp together to avoid stepped
    // changes when the dial is adjusted with the wheel.
    graph.spaceDelay.delayTime.setTargetAtTime(0.12 + amount * 0.26, now, 0.025);
    graph.spaceFeedback.gain.setTargetAtTime(amount * 0.32, now, 0.025);
    graph.spaceWet.gain.setTargetAtTime(amount * 0.24, now, 0.025);
  }, [spaceAmount]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    const amount = Math.max(0, Math.min(1, textureAmount));
    graph.shaper.curve = makeTapeCurve(amount);
    graph.dry.gain.setTargetAtTime(1 - amount * 0.68, graph.context.currentTime, 0.025);
    graph.wet.gain.setTargetAtTime(amount * 0.68, graph.context.currentTime, 0.025);
  }, [textureAmount]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    scheduleGainTarget(graph.output.gain, volumeRef.current, graph.context.currentTime);
  }, [volume]);

  const resumeAudio = useCallback(() => {
    const context = graphRef.current?.context;
    if (context?.state === 'suspended') return context.resume();
    return Promise.resolve();
  }, []);

  const rampOutput = useCallback((target, durationMs = 120) => {
    const graph = graphRef.current;
    if (!graph) return Promise.resolve(true);
    if (gainTransitionRef.current) {
      window.clearTimeout(gainTransitionRef.current.timer);
      gainTransitionRef.current.resolve(false);
      gainTransitionRef.current = null;
    }
    scheduleGainRamp(graph.output.gain, target, graph.context.currentTime, durationMs);
    return new Promise((resolve) => {
      const timer = window.setTimeout(() => {
        if (gainTransitionRef.current?.timer === timer) gainTransitionRef.current = null;
        resolve(true);
      }, Math.max(0, durationMs));
      gainTransitionRef.current = { timer, resolve };
    });
  }, []);

  const restoreOutput = useCallback(() => {
    const graph = graphRef.current;
    if (!graph) return;
    scheduleGainTarget(graph.output.gain, volumeRef.current, graph.context.currentTime);
  }, []);

  return {
    graphReady,
    signalStore: signalStoreRef.current,
    resumeAudio,
    rampOutput,
    restoreOutput,
  };
}
