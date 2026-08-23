import { useRef, useState, useCallback, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useTransition } from '../camera/useTransition.js';
import {
  HOMES, EXIT, SEATED, DRAG_PLANE_Y, SEAT_MS,
  overBay, dropProximity, seatCurve,
} from './tapes.js';

/**
 * 完整的 insert 流程（handoff §7）：
 *   悬浮 → 拖动跟手 → 悬到仓口只做 anticipation（不自动吸入）
 *   → 松手才确认 → 沿短曲线入仓 → 被仓口几何遮挡而没入
 *   → 关盖 + 机械沉降 → 剩余卡带有方向地退场 → 镜头转正面 → 播放
 *
 * 关键的克制：悬停时**只开盖，不吸带**。自动吸入会把「我在决定」变成「它替我决定了」。
 */

const PHASES = ['idle', 'dragging', 'seating', 'loaded', 'ejecting'];

export function useDeck() {
  const tr = useTransition('TOP_CLOSED');
  const { camera, gl } = useThree();

  const tapes = useRef(
    HOMES.map((h, i) => ({
      id: i,
      pos: new THREE.Vector3(h.x, h.y, h.z),
      target: new THREE.Vector3(h.x, h.y, h.z),
      rot: new THREE.Euler(0, h.ry, h.rz),
      home: h,
      inDeck: false,
      exited: false,
      vel: new THREE.Vector3(),
    }))
  );

  const phase = useRef('idle');
  const dragId = useRef(null);
  const grabOffset = useRef(new THREE.Vector3());
  const anticip = useRef(0);
  const seating = useRef(null);
  const [ui, setUi] = useState({ phase: 'idle', dragging: null, armed: false });

  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -DRAG_PLANE_Y), []);
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const hit = useMemo(() => new THREE.Vector3(), []);

  const pointerToPlane = useCallback((e) => {
    const r = gl.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1
    );
    ray.setFromCamera(ndc, camera);
    return ray.ray.intersectPlane(plane, hit) ? hit.clone() : null;
  }, [camera, gl, plane, ray, hit]);

  const grab = useCallback((id, e) => {
    if (phase.current !== 'idle' || tr.busy()) return;
    const t = tapes.current[id];
    if (t.inDeck || t.exited) return;
    const p = pointerToPlane(e);
    if (!p) return;
    e.target?.setPointerCapture?.(e.pointerId);
    grabOffset.current.copy(t.pos).sub(p);
    dragId.current = id;
    phase.current = 'dragging';
    setUi({ phase: 'dragging', dragging: id, armed: false });
  }, [pointerToPlane, tr]);

  const move = useCallback((e) => {
    if (phase.current !== 'dragging' || dragId.current === null) return;
    const p = pointerToPlane(e);
    if (!p) return;
    const t = tapes.current[dragId.current];
    t.target.copy(p).add(grabOffset.current);
    t.target.y = DRAG_PLANE_Y;
  }, [pointerToPlane]);

  const release = useCallback(() => {
    if (phase.current !== 'dragging' || dragId.current === null) return;
    const id = dragId.current;
    const t = tapes.current[id];

    if (overBay(t.pos.x, t.pos.z)) {
      // 确认投放。曲线的起点是「松手那一刻的实际位置」，不是仓口正上方 ——
      // 从别处瞬移到正上方再落下，会抹掉用户刚做的操作。
      seating.current = { id, t: 0, from: t.pos.clone(), rot: t.rot.clone() };
      phase.current = 'seating';
      setUi({ phase: 'seating', dragging: null, armed: false });
    } else {
      // 没投中就弹回停放位，不做惩罚性动画
      t.target.set(t.home.x, t.home.y, t.home.z);
      phase.current = 'idle';
      setUi({ phase: 'idle', dragging: null, armed: false });
    }
    dragId.current = null;
  }, []);

  /**
   * 卡带的进出画绑定在 FRONT 这个 pose 上，而不是绑在 insert 流程里。
   * 原因：卡带带旋转，AABB 尾部伸到 z≈-111，而 FRONT 视锥上沿随 z 变宽（那里是 200.7），
   * 停放位无论怎么调都容易插进视锥一角。把退场变成「到 FRONT 就退场」之后，
   * 任何到达 FRONT 的路径（拖放、pose 按钮、验收脚本 snap）都自然满足，
   * 不必为了躲视锥把卡带抬到压过机器的高度。
   */
  const syncTapes = useCallback((toPose, instant = false) => {
    const front = toPose === 'FRONT';
    tapes.current.forEach((t) => {
      if (t.inDeck) return;
      if (front) {
        t.exited = true;
        t.target.set(t.home.x * 1.35, EXIT.y, EXIT.z);
      } else {
        t.exited = false;
        t.target.set(t.home.x, t.home.y, t.home.z);
      }
      if (instant) t.pos.copy(t.target);
    });
  }, []);

  const goto = useCallback((next) => { syncTapes(next); tr.goto(next); }, [syncTapes, tr]);
  const snapTo = useCallback((next) => { syncTapes(next, true); tr.snapTo(next); }, [syncTapes, tr]);

  const eject = useCallback(() => {
    if (phase.current !== 'loaded' || tr.busy()) return;
    phase.current = 'ejecting';
    setUi({ phase: 'ejecting', dragging: null, armed: false });
    goto('TOP_OPEN');
    // 相机回到顶视、盖子开完之后，卡带才吐出来
    setTimeout(() => {
      tapes.current.forEach((t) => { t.inDeck = false; });
      syncTapes('TOP_OPEN');
      phase.current = 'idle';
      setUi({ phase: 'idle', dragging: null, armed: false });
    }, 1080);
  }, [tr, goto, syncTapes]);

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);

    // ---- 拖动跟手：带阻尼，不是硬吸附 ----
    if (phase.current === 'dragging' && dragId.current !== null) {
      const t = tapes.current[dragId.current];
      const prev = t.pos.clone();
      t.pos.lerp(t.target, 1 - Math.pow(0.001, d));   // 帧率无关的阻尼
      t.vel.subVectors(t.pos, prev).divideScalar(Math.max(d, 1e-4));

      // 倾斜跟随速度 —— 让它有重量，而不是一张贴纸。
      // 上限 0.14rad（8°）：handoff 要的是「轻微 rotation」，
      // 0.26rad（15°）拖起来像在甩一块板子。
      const tiltZ = THREE.MathUtils.clamp(-t.vel.x * 0.0009, -0.14, 0.14);
      const tiltX = THREE.MathUtils.clamp(t.vel.z * 0.0009, -0.14, 0.14);
      t.rot.z += (tiltZ - t.rot.z) * (1 - Math.pow(0.02, d));
      t.rot.x += (tiltX - t.rot.x) * (1 - Math.pow(0.02, d));

      // anticipation：越靠近仓口，盖开得越大。只开盖，不吸带。
      const over = overBay(t.pos.x, t.pos.z);
      const want = over ? 1 - dropProximity(t.pos.x, t.pos.z) * 0.25 : 0;
      anticip.current += (want - anticip.current) * (1 - Math.pow(0.004, d));
      tr.setLid(anticip.current);
      if (ui.armed !== over) setUi((u) => ({ ...u, armed: over }));
    }

    // ---- 未被拖动的卡带回位 ----
    tapes.current.forEach((t, i) => {
      if (phase.current === 'dragging' && dragId.current === i) return;
      if (t.inDeck) return;
      t.pos.lerp(t.target, 1 - Math.pow(0.006, d));
      t.rot.z += (t.home.rz - t.rot.z) * (1 - Math.pow(0.02, d));
      t.rot.x += (0 - t.rot.x) * (1 - Math.pow(0.02, d));
    });

    // ---- 闲置且没在拖：盖子回落 ----
    if (phase.current === 'idle' && anticip.current > 0.001) {
      anticip.current += (0 - anticip.current) * (1 - Math.pow(0.004, d));
      tr.setLid(anticip.current);
    }

    // ---- 入仓 ----
    if (phase.current === 'seating' && seating.current) {
      const s = seating.current;
      s.t += (d * 1000) / SEAT_MS;
      const k = Math.min(1, s.t);
      const t = tapes.current[s.id];
      const p = seatCurve(k, s.from);
      t.pos.set(p.x, p.y, p.z);
      // 入仓时姿态归正 —— 机构会把它扶正
      t.rot.x += (0 - t.rot.x) * (1 - Math.pow(0.004, d));
      t.rot.y += (0 - t.rot.y) * (1 - Math.pow(0.004, d));
      t.rot.z += (0 - t.rot.z) * (1 - Math.pow(0.004, d));

      if (k >= 1) {
        t.inDeck = true;
        t.pos.set(SEATED.x, SEATED.y, SEATED.z);
        seating.current = null;
        anticip.current = 0;
        phase.current = 'loaded';
        setUi({ phase: 'loaded', dragging: null, armed: false });

        // goto('FRONT') 会顺带让剩余卡带有方向地退场
        goto('FRONT');
      }
    }
  });

  return {
    ...tr,
    goto,
    snapTo,
    tapes: tapes.current,
    phase: ui.phase,
    dragging: ui.dragging,
    armed: ui.armed,
    grab, move, release, eject,
  };
}
