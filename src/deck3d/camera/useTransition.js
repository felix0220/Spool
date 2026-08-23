import { useRef, useState, useCallback, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { POSES } from './poses.js';
import { buildSequence } from './choreography.js';

/**
 * 过渡驱动。编排逻辑在 choreography.js（纯函数），这里只负责推时间。
 *
 * 可打断：过渡中改目标时，从「当前实时值」重新构建序列，
 * 而不是回到起始 pose 重放 —— 否则反向点击会看到镜头先跳回去。
 */
export function useTransition(initialPose = 'TOP_CLOSED') {
  const p0 = POSES[initialPose];
  const state = useRef({ elevation: p0.elevation, lid: p0.lid, playing: false });
  const seq = useRef(null);
  const elapsed = useRef(0);

  const [pose, setPoseState] = useState(initialPose);
  const [live, setLive] = useState({ ...state.current, transitioning: false, progress: 1 });

  const reduced = useRef(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduced.current = mq.matches;
    const on = () => { reduced.current = mq.matches; };
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const goto = useCallback((next) => {
    if (!POSES[next]) return;
    setPoseState(next);

    if (reduced.current) {
      // 减弱动效：直接落到终态。不做「更短的动画」—— 规则是关掉，不是压缩。
      const t = POSES[next];
      state.current = { elevation: t.elevation, lid: t.lid, playing: next === 'FRONT' };
      seq.current = null;
      elapsed.current = 0;
      setLive({ ...state.current, transitioning: false, progress: 1 });
      return;
    }

    seq.current = buildSequence(
      { elevation: state.current.elevation, lid: state.current.lid },
      next
    );
    elapsed.current = 0;
  }, []);

  useFrame((_, delta) => {
    const s = seq.current;
    if (!s) return;
    elapsed.current += delta * 1000;
    const frame = s.sample(elapsed.current);
    state.current = { elevation: frame.elevation, lid: frame.lid, playing: frame.playing };

    if (frame.done) {
      // 终态必须与静态 pose 逐字段相等，不能留下插值残差
      const f = s.final();
      state.current = { elevation: f.elevation, lid: f.lid, playing: f.playing };
      seq.current = null;
      setLive({ ...state.current, transitioning: false, progress: 1 });
    } else {
      setLive({
        ...state.current,
        transitioning: true,
        progress: s.duration ? elapsed.current / s.duration : 1,
      });
    }
  });

  /**
   * 让外部（拖拽的 anticipation）直接写 lid。
   * 只在没有序列在跑时生效 —— 否则会和编排打架。
   */
  const setLid = useCallback((v) => {
    if (seq.current) return false;
    state.current = { ...state.current, lid: v };
    setLive((L) => ({ ...L, lid: v }));
    return true;
  }, []);

  /** 当前实时值，给拖拽逻辑做接续起点用。 */
  const read = useCallback(() => state.current, []);

  /** 不走动画，直接落终态。验收脚本用它精确复现三个静态 keyframe。 */
  const snapTo = useCallback((next) => {
    if (!POSES[next]) return;
    const t = POSES[next];
    setPoseState(next);
    state.current = { elevation: t.elevation, lid: t.lid, playing: next === 'FRONT' };
    seq.current = null;
    elapsed.current = 0;
    setLive({ ...state.current, transitioning: false, progress: 1 });
  }, []);

  return { pose, goto, snapTo, setLid, read, busy: () => !!seq.current, ...live, ref: state };
}
