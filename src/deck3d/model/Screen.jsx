import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FRONT, CHASSIS, Z_FRONT } from './dimensions.js';
import { M } from './materials.js';
import { drawScreen, SCREEN_PX } from './screen.js';

/**
 * 屏幕。内容画在 Canvas 上做成贴图 —— 这种密度的仪表界面用几何体堆不现实。
 * 只在需要时重绘：播放时 ~20fps，静止时只在状态变化后画一次。
 */
export default function Screen({ playing = false, loaded = false, probe = false }) {
  const { screen } = FRONT;
  const meshRef = useRef();
  const acc = useRef(0);
  const posRef = useRef(0);
  const dirty = useRef(true);

  const { canvas, ctx, texture } = useMemo(() => {
    const cv = document.createElement('canvas');
    cv.width = SCREEN_PX.w;
    cv.height = SCREEN_PX.h;
    const cx = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return { canvas: cv, ctx: cx, texture: tex };
  }, []);

  /** 屏幕自发光，用不受光的 Basic —— 用 Standard 的话内容会被环境光压暗、失去屏幕感。
   *  toneMapped:false 让画好的颜色原样输出，不被 ACES 改掉。 */
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
    [texture]
  );

  useEffect(() => { dirty.current = true; }, [playing, loaded]);

  useFrame((st, dt) => {
    acc.current += dt;
    if (playing) posRef.current = (posRef.current + dt * 0.035) % 1;
    // 播放时 20fps 重绘；静止时只在状态变化后画一帧
    if (!dirty.current && (!playing || acc.current < 0.05)) return;
    if (playing) acc.current = 0;
    dirty.current = false;
    drawScreen(ctx, {
      playing,
      loaded,
      t: st.clock.elapsedTime,
      position: posRef.current,
    });
    texture.needsUpdate = true;
  });

  const x = -CHASSIS.w / 2 + screen.left + screen.w / 2;
  const y = CHASSIS.h - screen.top - screen.h / 2;

  return (
    <group position={[x, y, Z_FRONT]}>
      {/* 黑玻璃边框。厚度 2.8，前表面在 +0.6 —— 屏幕平面必须放到它前面，
          否则会被边框盒子整个盖住（第一版就是这样，屏幕全黑）。 */}
      <mesh position={[0, 0, -0.8]} material={M.glass}>
        <boxGeometry args={[screen.w + screen.bezel * 2, screen.h + screen.bezel * 2, 2.8]} />
      </mesh>
      <mesh ref={meshRef} position={[0, 0, 0.7]} material={mat}>
        <planeGeometry args={[screen.w, screen.h]} />
      </mesh>
    </group>
  );
}
