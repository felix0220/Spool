/**
 * CANONICAL PRODUCT GEOMETRY — 唯一真源。
 *
 * 单位 = mm，1 mm = 1 scene unit。
 * 场景里任何位置/尺寸都必须从这里读，不允许在组件里写裸数字。
 *
 * 坐标系：
 *   +X → 右   +Y → 上   +Z → 前（朝向观众）
 *   原点在 chassis 底面中心，所以 chassis 占 y ∈ [0, 116]。
 *
 * 推导起点是一个物理常量：Compact Cassette 外壳 100.5 × 64 × 12 mm。
 * top-loading 意味着卡带平放，于是 100.5 × 64 锁死顶面最小尺寸。
 */

export const CASSETTE = { w: 100.5, h: 12, d: 64 };

/** chassis — 正面就是它的 +Z 面，180 × 116。 */
export const CHASSIS = { w: 180, h: 116, d: 112 };

/** 顶板压在 chassis 上，四边各出檐 4。这 4 mm 是结构性的，不是装饰：
 *  没有它，elevation 90° 下四面墙全被自身遮住，产品塌成一张没厚度的平卡片。 */
export const TOP_PLATE = { w: 188, h: 8, d: 120, overhang: 4 };

/** chassis 顶部 8 mm 是一圈 rim，中间空出 bay；rim 以下是实心体。 */
export const RIM = { h: 8 };

/** bay 开口 112 × 76，对卡带四周留 ≈6 余量。 */
export const BAY = {
  w: 112,
  d: 76,
  depth: 16,          // 从顶板上表面往下算
  frontMargin: 22,    // 距 chassis 前缘
};

/** lid 嵌在顶板的凹槽里，与顶板上表面齐平。 */
export const LID = {
  w: 168,
  h: 8,
  d: 96,
  bezel: 10,          // 顶板在 lid 四周留下的边宽
  gap: 2,             // lid 与凹槽之间的缝。1mm 在实际渲染尺度下读不出来。没有它，闭仓时盖板与顶板同色齐平，读不出是块盖子
  hingeFromRear: 6,   // 滑轨后端定位，沿用原 hinge 的 z
  /**
   * 滑动行程（mm），不是旋转角度。
   *
   * 旋转开盖有个无法回避的硬伤：盖面在 0°→76° 的扫掠中，
   * 浅角度那段（约 10°）会降到 y≈138，正好穿过 y=140 的拖动平面 ——
   * 悬停在仓口上方的磁带必然被穿模。任何开启角度都躲不掉，
   * 因为盖子必须从水平扫到竖直，途中一定经过磁带所在的高度。
   *
   * 滑动则始终停在 y 116..124 的板层里，离拖动平面 20mm，物理上不可能相交。
   * 72mm 行程让出 bay 的 79%（与原来 76° 旋转让出的比例相同）。
   */
  travel: 72,
  /**
   * 观察窗。位置和尺寸都是算出来的，不是随手定的：
   *   - 96×50 居中时，闭仓透过它能看见 71% 的 bay，两帧只差 1.1 倍，区分失效；
   *   - 移到 bay 前段（避开 z=-21..+5 的卷轴）并收窄到 58×16 后，
   *     闭仓看到的是空仓底，开仓才露出卷轴与磁头。
   */
  window: { w: 58, d: 16, fromFront: 26 },
};

export const EDGE = { radius: 6, chamfer: 2 };

// ---- 派生量：不要手写这些，让它们算出来 ----

export const TOTAL_H = CHASSIS.h + TOP_PLATE.h;   // 124
export const Y_TOP_PLATE_TOP = TOTAL_H;           // 124
export const Y_TOP_PLATE_BOT = CHASSIS.h;         // 116
export const Y_RIM_BOT = CHASSIS.h - RIM.h;       // 108 —— 也是 bay 底面
export const Z_FRONT = CHASSIS.d / 2;             //  +56
export const Z_REAR = -CHASSIS.d / 2;             //  -56

/** bay 在 Z 上的范围 */
export const BAY_Z_FRONT = Z_FRONT - BAY.frontMargin;      // +34
export const BAY_Z_REAR = BAY_Z_FRONT - BAY.d;             // -42
export const BAY_Z_CENTER = (BAY_Z_FRONT + BAY_Z_REAR) / 2;

/** hinge 轴：沿 X，位于顶板上表面的后缘附近。
 *  TOP_CLOSED 与 TOP_OPEN 引用同一个对象 —— 这是「两帧外轮廓必须一致」的机制保证。 */
export const HINGE = {
  y: Y_TOP_PLATE_TOP,                 // 124
  z: Z_REAR + LID.hingeFromRear,      // -50
};

/** lid 闭合时在 Z 上的范围（从 hinge 往前铺开） */
export const LID_Z_REAR = HINGE.z;                 // -50
export const LID_Z_FRONT = HINGE.z + LID.d;        // +46

/**
 * 正面分区。y 从正面顶缘（= CHASSIS.h = 116）往下量，x 从左缘往右量。
 * band A 是顶板出檐下方的静默带：只放丝印，不放需要读的东西。
 */
/**
 * 正面分区。y 从正面顶缘（= CHASSIS.h = 116）往下量，x 从左缘往右量。
 *
 * 屏幕占正面面积的 52%（156×70 / 180×116）—— 这台机器的表达主体是屏幕，
 * 不是旋钮阵列。旋钮因此收到 2 个，transport 收到 4 键，
 * 原来的 meter / timecode 全部并入屏幕内容（参考图里它们本来就是屏幕元素）。
 * 喇叭移到顶板前沿，顺带给顶视补上细节。
 */
export const FRONT = {
  bandA: 12,
  screen: { w: 96, h: 38, left: 12, top: 12, inset: 1.6, bezel: 3 },
  grille: { w: 52, h: 38, left: 116, top: 12, rows: 6, cols: 8, holeR: 1.2 },
  /** 控制区凹槽。见下方 well 的注释。 */
  well: { top: 62, bottom: 4, side: 8, depth: 10 },
  knob: { d: 26, protrude: 12, top: 80, xs: [36, 86] },
  keys: { w: 18, h: 14, protrude: 3, cols: [124, 148, 172], rows: [80] },
};

/** 顶板前沿的喇叭开孔。 */
export const TOP_SPEAKER = { w: 76, rows: 2, cols: 26, holeR: 1.1 };

/** 控制区凹槽底面的 Z。凹槽里的一切都以它为基准，而不是 Z_FRONT。 */
export const Z_WELL = Z_FRONT - FRONT.well.depth;   // +46

/** 屏幕占正面的面积比。低于 0.5 就违背了「屏幕是主体」这个决定，由测试守着。 */
export const SCREEN_RATIO = (FRONT.screen.w * FRONT.screen.h) / (CHASSIS.w * CHASSIS.h);

/** 正面局部坐标 → 世界坐标。left/top 以 mm 计，从正面左上角起算。 */
export function frontPos(left, top, w = 0, h = 0) {
  return [
    -CHASSIS.w / 2 + left + w / 2,
    CHASSIS.h - top - h / 2,
    Z_FRONT,
  ];
}

export const MM = 1;


/**
 * 正面控件的 2D 包围盒（面局部坐标：left 从左缘、top 从上缘，单位 mm）。
 * 验收脚本用它做互相重叠与越界检查 —— 旋钮压到按键这类问题应该被测出来，
 * 不该靠人盯截图。
 */
export function frontBoxes() {
  const f = FRONT;
  const b = [{ id: 'screen', left: f.screen.left, top: f.screen.top, w: f.screen.w, h: f.screen.h }];
  f.knob.xs.forEach((x, i) =>
    b.push({ id: `knob${i}`, left: x - f.knob.d / 2, top: f.knob.top - f.knob.d / 2, w: f.knob.d, h: f.knob.d }));
  f.keys.rows.forEach((ty, r) =>
    f.keys.cols.forEach((tx, c) =>
      b.push({ id: `key${r}${c}`, left: tx - f.keys.w / 2, top: ty - f.keys.h / 2, w: f.keys.w, h: f.keys.h })));
  return b;
}

/** well 开口的 2D 范围，同样是面局部坐标。 */
export function wellBox() {
  return {
    left: FRONT.well.side,
    top: FRONT.well.top,
    w: CHASSIS.w - 2 * FRONT.well.side,
    h: CHASSIS.h - FRONT.well.top - FRONT.well.bottom,
  };
}
