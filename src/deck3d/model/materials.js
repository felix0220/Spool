import * as THREE from 'three';

/**
 * 配色。取自参考图后转 OKLCH 铺成体系：
 * 中性阶固定 H=115.7°、C=0.007（暖偏中性 —— 纯灰会读成「没选过」），只调 L；
 * 信号色各自 hue、L 对齐，C 取各自 sRGB 上限的同一比例，避免「同一个 C 值」造成的视觉不匀。
 * 推导脚本见 scripts/palette.mjs。
 */
export const C = {
  bg:       '#F5442B',
  ground:   '#E54831',
  casing:   '#EDEBE7',
  alu:      '#B9B9B7',
  aluDark:  '#898A87',
  well:     '#686A66',
  darkGrey: '#4B4C49',
  black:    '#111113',
  shell:    '#19191B',
  accent:   '#E33B0C',
  scope:    '#2F4FBF',
  terra:    '#A8664D',
  cream:    '#D6D3C6',
  label:    '#F0EBDD',
  hubRed:   '#E33B0C',
  trim:     '#8A6A34',
};

const mk = (color, roughness, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

/**
 * 拉丝铝的各向异性纹理。程序化生成，不用外部贴图 ——
 * artifact 的 CSP 禁止任何外部请求。
 * 只做粗糙度贴图：金属的「拉丝」感来自高光沿一个方向被拉长，
 * 那是 roughness 的方向性变化，不是颜色变化。
 */
function brushedRoughness(size = 512, base = 0.3, amp = 0.16) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const c = cv.getContext('2d');
  const img = c.createImageData(size, size);
  // 每一行一个随机偏移，沿 X 拉长 —— 这就是「拉丝」
  for (let y = 0; y < size; y++) {
    let v = base;
    for (let x = 0; x < size; x++) {
      v += (Math.random() - 0.5) * 0.05;
      v = Math.max(base - amp, Math.min(base + amp, v));
      const g = Math.round(v * 255);
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = g;
      img.data[i + 3] = 255;
    }
  }
  c.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

/** 塑料的细微颗粒。同理，只做粗糙度扰动，颜色保持干净。 */
function grainRoughness(size = 256, base = 0.55, amp = 0.07) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const c = cv.getContext('2d');
  const img = c.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const g = Math.round((base + (Math.random() - 0.5) * amp * 2) * 255);
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = g;
    img.data[i * 4 + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  return tex;
}

const hasDOM = typeof document !== 'undefined';
const aluRough = hasDOM ? brushedRoughness() : null;
const plasticRough = hasDOM ? grainRoughness() : null;

export const M = {
  casing:   mk(C.casing, 0.55),
  /** 拉丝铝：低粗糙 + 高金属度 + 方向性粗糙度贴图。
   *  金属需要有东西可反射，App 里配了一组程序化 Lightformer 作为反射源。 */
  alu:      new THREE.MeshStandardMaterial({
    color: C.alu, roughness: 0.32, metalness: 0.86, roughnessMap: aluRough,
  }),
  aluDark:  new THREE.MeshStandardMaterial({
    color: C.aluDark, roughness: 0.38, metalness: 0.8, roughnessMap: aluRough,
  }),
  well:     mk(C.well, 0.62),
  midGrey:  mk(C.aluDark, 0.5),
  darkGrey: mk(C.darkGrey, 0.48),
  glass:    mk('#0C0C10', 0.14, 0.1),
  accent:   mk(C.accent, 0.4),
  scope:    mk(C.scope, 0.45),
  terra:    mk(C.terra, 0.45),
  cream:    mk(C.cream, 0.55),
  label:    mk(C.label, 0.68),
  hubRed:   mk(C.hubRed, 0.42),
  trim:     mk(C.trim, 0.4, 0.5),
  black:    mk(C.black, 0.6),
  shell:    mk(C.shell, 0.42),
  tape:     mk(C.cream, 0.62),
};

if (plasticRough) {
  M.casing.roughnessMap = plasticRough;
  M.shell.roughnessMap = plasticRough;
}

/**
 * PROBE —— 验收用。toneMapped:false 是必须的：渲染器用 ACESFilmic，
 * 纯绿会被映射成 (147,228,89)、纯品红成 (247,40,228)，
 * 不关掉的话「可见像素 = 0」这类断言既可能假通过也可能假失败。
 */
export const PROBE = {
  front:   new THREE.MeshBasicMaterial({ color: '#FF00FF', toneMapped: false }),
  topFace: new THREE.MeshBasicMaterial({ color: '#00FF00', toneMapped: false }),
  body:    new THREE.MeshBasicMaterial({ color: '#FFFFFF', toneMapped: false }),
  bay:     new THREE.MeshBasicMaterial({ color: '#00FFFF', toneMapped: false }),
  neutral: new THREE.MeshBasicMaterial({ color: '#242428', toneMapped: false }),
};
