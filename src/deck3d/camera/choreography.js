/**
 * TRANSITION 编排。
 *
 * 全部是纯函数：给定「起点状态 + 目标 pose + 已过毫秒」，算出这一帧的
 * { elevation, lid, playing }。不碰 React、不碰 three，于是可以在 node 里直接单测
 * 连续性、端点精度和边界，而不必先渲染再去数像素。
 *
 * 两条不可破的约束：
 *   1. 过渡是 camera continuity —— 只有 elevation 在动，azimuth/radius/fov/target 全程不变。
 *   2. 机身几何上没有任何 opacity。淡入淡出不是过渡。
 */

import { POSES } from './poses.js';

/** CSS 同款三次贝塞尔求值（Newton-Raphson + 二分兜底）。 */
export function cubicBezier(x1, y1, x2, y2) {
  const A = (a, b) => 1 - 3 * b + 3 * a;
  const B = (a, b) => 3 * b - 6 * a;
  const C = (a) => 3 * a;
  const calc = (t, a, b) => ((A(a, b) * t + B(a, b)) * t + C(a)) * t;
  const slope = (t, a, b) => 3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a);

  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const d = slope(t, x1, x2);
      if (Math.abs(d) < 1e-6) break;
      const err = calc(t, x1, x2) - x;
      if (Math.abs(err) < 1e-7) break;
      t -= err / d;
    }
    if (t < 0 || t > 1) {
      let lo = 0, hi = 1;
      t = x;
      for (let i = 0; i < 20; i++) {
        const err = calc(t, x1, x2) - x;
        if (Math.abs(err) < 1e-7) break;
        err > 0 ? (hi = t) : (lo = t);
        t = (lo + hi) / 2;
      }
    }
    return calc(t, y1, y2);
  };
}

export const EASE = {
  /** 相机：先加速，再长长地滑到静止。读作电动摇臂，不是 UI 弹窗。 */
  camera: cubicBezier(0.5, 0, 0.1, 1),
  /** 关盖：ease-in，像被放下而不是被拉下。 */
  lidFall: cubicBezier(0.55, 0, 0.85, 0.45),
  /** 开盖（滑出）：ease-out-back。y2 > 1 让曲线自己冲过目标再落回，
   *  比外挂一个 sin 包络干净 —— 后者会在拼接处留下 velocity kink。 */
  lidRise: cubicBezier(0.34, 1.18, 0.64, 1),
  /** 回弹沉降。 */
  settle: cubicBezier(0.33, 1, 0.68, 1),
};

/**
 * 时长。比 UI 动画的 300ms 上限长，因为这是一次「仪式」而不是高频操作
 * —— 每次载入只发生一次。但仍然收着：整段 insert 1.26s，超过就拖。
 * eject 是「离开」，按惯例比 enter 快 20–30%。
 */
export const TIMING = {
  lidClose: 360,
  lidSettleDur: 150,
  lidRebound: 0.045,    // 关到位后的机械回弹，占行程比例
  /**
   * 相机在盖子「关到位」之后多久起步。
   * 不等沉降走完 —— 沉降 150ms 与相机头 90ms 重叠，整段读成一个连续的机械事件；
   * 串行排列会让开头 590ms 都在等，主戏（相机）迟迟不来。
   */
  camLeadIn: 60,
  cameraDown: 720,      // TOP → FRONT

  cameraUp: 660,        // FRONT → TOP。比下行快，但不按 UI 的 20–30% 砍 ——
                        // 相机摇臂砍太狠会变成甩镜，不是「更利落」
  holdBeforeLid: 60,
  lidOpen: 300,
};

const lerp = (a, b, t) => a + (b - a) * t;
/** 局部进度：把绝对时间映射到某条轨道的 0..1 */
const local = (t, start, dur) => (dur <= 0 ? 1 : Math.min(1, Math.max(0, (t - start) / dur)));

/**
 * 关盖轨道：落下 → 回弹 → 沉降到 0。
 * 「机械沉降」是 handoff §7 明确要的，不是装饰 —— 它让盖子有重量。
 */
function lidCloseAt(t, from, start) {
  const { lidClose, lidSettleDur, lidRebound } = TIMING;
  if (t <= start) return from;
  if (t < start + lidClose) return lerp(from, 0, EASE.lidFall(local(t, start, lidClose)));
  const s = local(t, start + lidClose, lidSettleDur);
  // 0 → 回弹 → 0，用半个正弦包络乘以 ease-out 衰减
  return lidRebound * Math.sin(s * Math.PI) * (1 - EASE.settle(s));
}

/** 开盖轨道。过冲由 lidRise 曲线本身产生，不再外挂包络。 */
function lidOpenAt(t, from, to, start) {
  if (t <= start) return from;
  return lerp(from, to, EASE.lidRise(local(t, start, TIMING.lidOpen)));
}

/**
 * 构建一次过渡。from 是「当前实时状态」而不是某个 pose 名 ——
 * 这样过渡中途改目标时能从当前值接着走，不会跳回起点重放。
 */
export function buildSequence(fromState, toPose) {
  const target = POSES[toPose];
  const el0 = fromState.elevation;
  const lid0 = fromState.lid;
  const el1 = target.elevation;
  const lid1 = target.lid;

  const elMoves = Math.abs(el1 - el0) > 0.01;
  const lidMoves = Math.abs(lid1 - lid0) > 0.01;
  const goingDown = el1 < el0;   // 抬头看顶 → 平视正面

  // 距离越短，时长按比例缩，避免小幅修正也走满全程；但设下限保住手感。
  const elSpan = Math.abs(el1 - el0) / 90;
  const scale = elMoves ? Math.max(0.45, Math.min(1, elSpan)) : 0;

  let camStart = 0, camDur = 0, lidStart = 0;

  if (goingDown) {
    // 先关盖 + 沉降，再落相机。handoff §7：cassette 到位 → 关盖 → 机械沉降 → camera orbit
    lidStart = 0;
    camStart = lidMoves ? TIMING.lidClose + TIMING.camLeadIn : 0;
    camDur = elMoves ? TIMING.cameraDown * scale : 0;
  } else if (elMoves) {
    // 先抬相机，到顶后再开盖。eject 的顺序。
    camStart = 0;
    camDur = TIMING.cameraUp * scale;
    lidStart = camDur + TIMING.holdBeforeLid;
  } else {
    // 相机不动，只开合盖（TOP_CLOSED ↔ TOP_OPEN）
    lidStart = 0;
  }

  const lidTail = !lidMoves
    ? 0
    : lid1 === 0
    ? TIMING.lidClose + TIMING.lidSettleDur
    : TIMING.lidOpen;

  const duration = Math.max(camStart + camDur, lidStart + lidTail);

  function sample(t) {
    const tc = Math.min(t, duration);

    const elevation = !elMoves
      ? el1
      : tc <= camStart
      ? el0
      : lerp(el0, el1, EASE.camera(local(tc, camStart, camDur)));

    let lid;
    if (!lidMoves) lid = lid1;
    else if (lid1 === 0) lid = lidCloseAt(tc, lid0, lidStart);
    else lid = lidOpenAt(tc, lid0, lid1, lidStart);

    // 播放态只在相机完全停稳、且目标是 FRONT 之后才出现
    const playing = toPose === 'FRONT' && tc >= duration;

    return { elevation, lid, playing, t: tc, done: t >= duration };
  }

  /** 终态必须与静态 pose 逐字段相等，不允许有残留偏差。 */
  function final() {
    return { elevation: el1, lid: lid1, playing: toPose === 'FRONT', t: duration, done: true };
  }

  return { duration, sample, final, camStart, camDur, lidStart };
}
