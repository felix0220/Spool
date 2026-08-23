/**
 * 屏幕内容。用 Canvas 2D 画成贴图 —— 这种密度的仪表界面用几何体堆是灾难。
 *
 * 语言取自参考图 2/3/4：
 *   - 双卷盘 + 十字辐条 + 走带路径（图 2 上）
 *   - timecode 读数、多轨彩色条带、播放头（图 2 上）
 *   - L/R 双声道波形，米色场 + 灰色 trim（图 2 中）
 *   - VU 指针表 + 描边大数字（图 3 下）
 *   - 细线示波（图 2 下）
 * 配色守住黑底 + vermilion/blue/gold 三色信号分工。
 */

export const SCREEN_PX = { w: 1248, h: 560 };   // 156×70mm @ 8px/mm

/**
 * 屏幕配色。第一版按「黑底 + 低调灰」来配，结果缩到实际尺寸后整块读成关机状态 ——
 * 屏幕在画面里只有 156mm 宽，细节被压掉，只剩平均亮度。
 * 所以次级信息也必须够亮：dim 从 #4A4A52 提到 #7C7C88。
 */
const C = {
  bg: '#0C0C10',
  grid: '#26262E',
  dim: '#7C7C88',
  text: '#EDEBE6',
  cream: '#D8D5C8',
  red: '#F2591F',
  blue: '#6E90DE',
  gold: '#C29A57',
  white: '#F2F0EC',
};

const mono = (px, w = 400) => `${w} ${px}px ui-monospace, "SF Mono", Menlo, monospace`;

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/** 卷盘：同心圆 + 十字辐条 + 中心暗孔。辐条是必须的 —— 没有它旋转对称，转起来看不出来。 */
function reel(c, cx, cy, r, angle, tint) {
  c.strokeStyle = C.dim; c.lineWidth = 2;
  c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.arc(cx, cy, r * 0.62, 0, Math.PI * 2); c.stroke();

  c.save();
  c.translate(cx, cy); c.rotate(angle);
  c.strokeStyle = tint; c.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI) / 3;
    c.beginPath();
    c.moveTo(-Math.cos(a) * r * 0.58, -Math.sin(a) * r * 0.58);
    c.lineTo(Math.cos(a) * r * 0.58, Math.sin(a) * r * 0.58);
    c.stroke();
  }
  c.restore();

  c.fillStyle = C.bg; c.beginPath(); c.arc(cx, cy, r * 0.2, 0, Math.PI * 2); c.fill();
  c.strokeStyle = C.text; c.lineWidth = 2;
  c.beginPath(); c.arc(cx, cy, r * 0.2, 0, Math.PI * 2); c.stroke();
}

/** VU 指针表（图 3 下）。 */
function vu(c, x, y, w, h, level, tint, label) {
  const cx = x + w / 2, cy = y + h * 0.92, r = h * 0.72;
  c.strokeStyle = C.grid; c.lineWidth = 1.5;
  c.beginPath(); c.arc(cx, cy, r, Math.PI * 1.18, Math.PI * 1.82); c.stroke();
  c.strokeStyle = C.red; c.lineWidth = 2.5;
  c.beginPath(); c.arc(cx, cy, r, Math.PI * 1.72, Math.PI * 1.82); c.stroke();

  for (let i = 0; i <= 6; i++) {
    const a = Math.PI * 1.18 + (Math.PI * 0.64 * i) / 6;
    c.strokeStyle = C.dim; c.lineWidth = 1;
    c.beginPath();
    c.moveTo(cx + Math.cos(a) * r * 0.86, cy + Math.sin(a) * r * 0.86);
    c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    c.stroke();
  }
  const a = Math.PI * 1.18 + Math.PI * 0.64 * Math.min(1, level);
  c.strokeStyle = tint; c.lineWidth = 2.5;
  c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * r * 0.94, cy + Math.sin(a) * r * 0.94); c.stroke();

  c.fillStyle = C.dim; c.font = mono(15); c.textAlign = 'center';
  c.fillText(label, cx, y + h + 20);
}

/** 波形带（图 2 中）：米色场上的黑色波形 + 两端灰色 trim。 */
function waveLane(c, x, y, w, h, seed, playhead, label) {
  c.fillStyle = C.cream; c.fillRect(x, y, w, h);
  c.fillStyle = '#9C9A94';
  c.fillRect(x, y, 14, h); c.fillRect(x + w - 14, y, 14, h);

  c.fillStyle = '#111113';
  const mid = y + h / 2, n = 96;
  c.beginPath(); c.moveTo(x + 16, mid);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const amp = (Math.sin(t * 22 + seed) * 0.4 + Math.sin(t * 61 + seed * 2) * 0.3 + Math.sin(t * 7 + seed) * 0.3);
    const env = Math.sin(t * Math.PI) ** 0.5;
    c.lineTo(x + 16 + t * (w - 32), mid - amp * env * h * 0.42);
  }
  for (let i = n; i >= 0; i--) {
    const t = i / n;
    const amp = (Math.sin(t * 22 + seed) * 0.4 + Math.sin(t * 61 + seed * 2) * 0.3 + Math.sin(t * 7 + seed) * 0.3);
    const env = Math.sin(t * Math.PI) ** 0.5;
    c.lineTo(x + 16 + t * (w - 32), mid + amp * env * h * 0.42);
  }
  c.closePath(); c.fill();

  c.fillStyle = C.red;
  c.fillRect(x + 16 + playhead * (w - 32), y, 2, h);

  c.fillStyle = '#55534E'; c.font = mono(15, 500); c.textAlign = 'left';
  c.fillText(label, x + 20, y + 20);
}

/**
 * 画一帧。state = { playing, t, level, position }
 * 没有卡带时画待机屏 —— 空屏比假装在播放诚实。
 */
export function drawScreen(c, state) {
  const { w, h } = SCREEN_PX;
  const { playing = false, loaded = false, t = 0, position = 0 } = state;

  c.fillStyle = C.bg;
  c.fillRect(0, 0, w, h);

  // 细网格，给黑场一点密度
  c.strokeStyle = C.grid; c.lineWidth = 1;
  for (let x = 0; x < w; x += 48) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
  for (let y = 0; y < h; y += 48) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }

  if (!loaded) {
    c.fillStyle = C.dim; c.font = mono(30, 500); c.textAlign = 'center';
    c.fillText('NO TAPE', w / 2, h / 2 - 8);
    c.font = mono(19);
    c.fillText('DROP A CASSETTE INTO THE BAY', w / 2, h / 2 + 30);
    c.strokeStyle = C.grid; c.lineWidth = 2;
    roundRect(c, w / 2 - 190, h / 2 - 62, 380, 108, 6); c.stroke();
    return;
  }

  // ── 顶栏：timecode + 状态 ──
  const total = 42 + position * 138;
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(Math.floor(total % 60)).padStart(2, '0');
  const ff = String(Math.floor((total * 30) % 30)).padStart(2, '0');
  c.fillStyle = C.text; c.font = mono(46, 500); c.textAlign = 'center';
  c.fillText(`${mm}:${ss}:${ff}`, w / 2, 54);

  c.font = mono(18, 500); c.textAlign = 'left';
  c.fillStyle = playing ? C.red : C.dim;
  c.fillText(playing ? '▶ PLAY' : '■ STOP', 26, 46);
  c.textAlign = 'right';
  c.fillStyle = C.gold; c.fillText('100%', w - 26, 46);
  c.fillStyle = C.dim; c.font = mono(15);
  c.fillText('TYPE II', w - 26, 70);

  // ── 双卷盘 ──
  const ang = playing ? t * 1.6 : 0;
  reel(c, 148, 216, 74, ang, C.white);
  reel(c, 340, 216, 74, ang * (1 + position * 0.6), C.gold);

  // 走带路径
  c.strokeStyle = C.dim; c.lineWidth = 2;
  c.beginPath();
  c.moveTo(148, 290); c.lineTo(196, 318); c.lineTo(292, 318); c.lineTo(340, 290);
  c.stroke();
  [196, 244, 292].forEach((x) => {
    c.fillStyle = C.bg; c.strokeStyle = C.text; c.lineWidth = 2;
    c.beginPath(); c.arc(x, 318, 9, 0, Math.PI * 2); c.fill(); c.stroke();
  });
  // 磁头
  c.fillStyle = C.red; c.fillRect(236, 300, 16, 12);

  // ── 右侧：L/R 波形 ──
  waveLane(c, 442, 108, 470, 92, 1.7, position, 'L');
  waveLane(c, 442, 214, 470, 92, 3.1, position, 'R');

  // ── 右上角：VU ──
  const lv = playing ? 0.45 + 0.35 * Math.abs(Math.sin(t * 2.1) * Math.sin(t * 0.7)) : 0.04;
  vu(c, 950, 96, 130, 96, lv, C.blue, 'L');
  vu(c, 1094, 96, 130, 96, lv * 0.88, C.red, 'R');

  // ── 底部：多轨彩色条带 + 播放头 ──
  const bars = [
    { c: C.white, s: 0.0, e: 0.28 },
    { c: C.blue, s: 0.28, e: 0.62 },
    { c: C.red, s: 0.34, e: 0.52 },
    { c: C.gold, s: 0.62, e: 0.80 },
    { c: '#3A3A40', s: 0.80, e: 1.0 },
  ];
  const bx = 442, bw = 782, by = 340;
  bars.forEach((b, i) => {
    c.fillStyle = '#17171A';
    c.fillRect(bx, by + i * 14, bw, 10);
    c.fillStyle = b.c;
    c.fillRect(bx + b.s * bw, by + i * 14, (b.e - b.s) * bw, 10);
  });
  c.fillStyle = C.red;
  c.fillRect(bx + position * bw, by - 6, 2, 5 * 14 + 8);

  // ── 底栏：滤波读数（图 2 下的语言）──
  c.fillStyle = C.dim; c.font = mono(16, 500); c.textAlign = 'left';
  c.fillText('FILTER', 26, 432);
  c.fillStyle = C.blue; c.fillText('440 – 1440', 108, 432);
  c.fillStyle = C.dim; c.fillText('STEREO', 268, 432);

  // 细线示波
  c.strokeStyle = C.blue; c.lineWidth = 1.6; c.globalAlpha = 0.85;
  c.beginPath();
  for (let i = 0; i <= 160; i++) {
    const a = (i / 160) * Math.PI * 2;
    const x = 168 + Math.sin(a * 3 + t) * 118;
    const y = 490 + Math.sin(a * 2) * 44;
    i ? c.lineTo(x, y) : c.moveTo(x, y);
  }
  c.stroke(); c.globalAlpha = 1;

  // 右下：轨道号，描边大数字（图 3 下）
  c.strokeStyle = C.dim; c.lineWidth = 2; c.font = mono(58, 300); c.textAlign = 'right';
  c.strokeText('02', w - 26, 512);
}
