import { CASSETTE, BAY, BAY_Z_CENTER, Y_RIM_BOT, Y_TOP_PLATE_TOP } from '../model/dimensions.js';

/**
 * 卡带的停放与投放规则。纯数据 + 纯函数，可在 node 里单测。
 *
 * 停放在机身**前方**（+z）。仓盖绕后缘铰链向后开，只占 z ∈ [-50, -26.8]，
 * 所以前方永远不会穿模、也不会挡住仓口。
 * 摆在后方时为了躲开仓盖必须把卡带抬到 y=206，在顶视里胀到占宽 43%；
 * 挪到前方后约束消失，可以降到 y=140 —— 占宽 37%，机器重新成为主角。
 * z 也要收着：z=70 时卡带尾端落在取景下边缘（半深 101.6）被裁掉一截，
 * 收到 58/64 后完整在画内，同时仍在投放区（|z+4| ≤ 56）之外。
 */
export const TAPE_Y = 140;

/** 三卷带的停放位。扇形排布在机身后上方，前缘让开 bay 后沿。 */
/**
 * 扇形叠放，不是并排。三卷带各 100.5mm 宽，并排展开 300mm+，
 * 比 188mm 的机身还宽 —— 必然压过产品。重叠成一摞才是真实世界里的样子，
 * 也让机器重新占住画面主体。中间那卷压在上层（z 更大 = 离顶视相机更近）。
 */
export const HOMES = [
  { x: -68, y: TAPE_Y, z: 54, ry: -0.13, rz: 0.055 },
  { x: 2,   y: TAPE_Y, z: 70, ry: 0.03, rz: -0.015 },
  { x: 72,  y: TAPE_Y, z: 54, ry: 0.13, rz: -0.05 },
];

/** 退场位：向上、向外撤出 FRONT 视锥（z=104 处上沿 155.8）。 */
export const EXIT = { y: 214, z: 104 };

/** 卡带坐进 bay 之后的位置。 */
export const SEATED = { x: 0, y: Y_RIM_BOT + CASSETTE.h / 2 + 1.2, z: BAY_Z_CENTER };

export const DRAG_PLANE_Y = TAPE_Y;

/**
 * 投放区判定：bay 开口外扩 18mm。
 * 要求像素级对准会让拖放变得挑剔 —— 这里给的是意图判定，不是碰撞检测。
 */
export const DROP_PAD = 18;
export function overBay(x, z) {
  return Math.abs(x) <= BAY.w / 2 + DROP_PAD &&
         Math.abs(z - BAY_Z_CENTER) <= BAY.d / 2 + DROP_PAD;
}

/** 0 = 正中，1 = 判定边缘。驱动 anticipation 强度。 */
export function dropProximity(x, z) {
  const dx = Math.abs(x) / (BAY.w / 2 + DROP_PAD);
  const dz = Math.abs(z - BAY_Z_CENTER) / (BAY.d / 2 + DROP_PAD);
  return Math.min(1, Math.max(dx, dz));
}

/** 入仓曲线：先小幅抬起再沉入，读起来像被机构接住，而不是直线掉下去。 */
export function seatCurve(t, from) {
  const e = t * t * (3 - 2 * t);
  const lift = 14;
  const arc = Math.sin(Math.min(1, t * 1.35) * Math.PI) * lift;
  return {
    x: from.x + (SEATED.x - from.x) * e,
    y: from.y + (SEATED.y - from.y) * (e * e) + arc,
    z: from.z + (SEATED.z - from.z) * e,
  };
}

export const SEAT_MS = 420;

/** 低于顶板上沿即视为已进入机身 —— 此后由仓口几何遮挡，不需要任何 mask。 */
export const SWALLOWED_Y = Y_TOP_PLATE_TOP;
