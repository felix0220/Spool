import { useRef, useLayoutEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { FOV, TARGET, orbitPosition } from './poses.js';

/**
 * 唯一的相机。elevation 是它唯一接受的变量。
 * 组件不接受 position —— 位置只能由 orbitPosition 算出来。
 */
export default function PoseCamera({ elevation, focus = 0 }) {
  const ref = useRef();
  const focusRef = useRef(0);
  const set = useThree((s) => s.set);
  const size = useThree((s) => s.size);

  useLayoutEffect(() => {
    if (ref.current) set({ camera: ref.current });
  }, [set]);

  useFrame((_, delta) => {
    const cam = ref.current;
    if (!cam) return;

    // Front 到位后再把镜头推近屏幕。它仍然是同一台机器，只是第二段 camera move。
    const targetFocus = Math.max(0, Math.min(1, focus));
    focusRef.current += (targetFocus - focusRef.current) * (1 - Math.pow(0.001, Math.min(delta, 0.05)));
    const f = focusRef.current;
    const [x, y, z] = orbitPosition(elevation);
    // 第二段只把正面推到约 80% 画幅，不把产品裁掉。
    const position = new THREE.Vector3(x, y, z).lerp(new THREE.Vector3(0, 66, 390), f);
    const target = new THREE.Vector3(TARGET[0], TARGET[1], TARGET[2]).lerp(new THREE.Vector3(0, 64, 16), f);

    cam.position.copy(position);
    // elevation 90° 时 up 与视线共线会退化。用连续函数而不是离散分支。
    const elRad = (elevation * Math.PI) / 180;
    cam.up.set(0, Math.cos(elRad), -Math.sin(elRad));
    cam.lookAt(target);
    cam.aspect = size.width / size.height;
    cam.fov = FOV;
    cam.near = 10;
    cam.far = 4000;
    cam.updateProjectionMatrix();
  });

  return <perspectiveCamera ref={ref} />;
}
