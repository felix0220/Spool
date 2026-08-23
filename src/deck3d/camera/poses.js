import { CHASSIS } from '../model/dimensions.js';

/**
 * CAMERA MODEL — 一个自由度。
 *
 * 相机在以机身中心为球心的球面上，但 azimuth 永久锁 0°，radius 与 fov 固定。
 * 三个 keyframe 之间唯一变化的量是 elevation。
 *
 * 为什么锁 azimuth：斜梯形只可能由非零 azimuth 或错切 transform 产生。
 * 锁死之后，上一版最刺眼的那个问题在结构上就不可能重现。
 *
 * 为什么 target.y = H/2：视线水平且位于顶板（y=116）下方，
 * 于是 FRONT 在几何上无法看到顶面 —— 不需要任何隐藏逻辑。
 */

export const AZIMUTH = 0;      // 度，永久锁定
export const RADIUS = 560;     // mm
export const FOV = 24;         // 竖直 FOV，度

/** target = chassis 中心。整个模型只有这一个注视点。 */
export const TARGET = [0, CHASSIS.h / 2, 0];   // (0, 58, 0)

/** lid 是开启比例 0..1（滑动行程的百分比），不再是角度。 */
export const POSES = {
  TOP_CLOSED: { elevation: 90, lid: 0 },
  FRONT:      { elevation: 0,  lid: 0 },
  TOP_OPEN:   { elevation: 90, lid: 1 },
};

export const POSE_ORDER = ['TOP_CLOSED', 'FRONT', 'TOP_OPEN'];

/** (azimuth, elevation, radius) → 世界坐标。azimuth 恒为 0，保留参数只为让公式完整。 */
export function orbitPosition(elevationDeg, azimuthDeg = AZIMUTH, radius = RADIUS) {
  const el = (elevationDeg * Math.PI) / 180;
  const az = (azimuthDeg * Math.PI) / 180;
  return [
    TARGET[0] + radius * Math.sin(az) * Math.cos(el),
    TARGET[1] + radius * Math.sin(el),
    TARGET[2] + radius * Math.cos(az) * Math.cos(el),
  ];
}
