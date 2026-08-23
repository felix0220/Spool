import { RoundedBox } from '@react-three/drei';
import { CASSETTE } from './dimensions.js';
import { M } from './materials.js';

/**
 * 卡带。参考图的结构：近黑圆角外壳 + 彩色内板 + 米色标签 + 双轮毂（红十字）+ 四角螺丝。
 * 物理尺寸 100.5 × 12 × 64 是常量，不可调。
 */
export default function Cassette({ tint = M.terra }) {
  const { w, h, d } = CASSETTE;
  const inset = 5;
  // 验收 §09 靠这个标记在场景里找到卡带网格
  const tag = (o) => { if (o) o.userData.isTape = true; };

  return (
    <group>
      {/* 外壳：近黑，圆角 */}
      <RoundedBox ref={tag} args={[w, h, d]} radius={2.2} smoothness={3} steps={1}
                  material={M.shell} castShadow receiveShadow />

      {/* 彩色内板，沉在外壳里 */}
      <RoundedBox args={[w - inset * 2, 1.2, d - inset * 2]} radius={1.2} smoothness={2} steps={1}
                  position={[0, h / 2 + 0.2, 0]} material={tint} />

      {/* 标签 */}
      <RoundedBox args={[w - 34, 0.8, d - 26]} radius={0.8} smoothness={2} steps={1}
                  position={[0, h / 2 + 1.0, 2]} material={M.label} />
      {[0, 1].map((i) => (
        <mesh key={i} position={[0, h / 2 + 1.5, -2 + i * 7]} material={M.aluDark}>
          <boxGeometry args={[w - 46, 0.3, 0.5]} />
        </mesh>
      ))}

      {/* 双轮毂：外环 + 内环 + 红十字（参考图的标志性细节） */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 26, h / 2 + 1.1, -4]}>
          <mesh material={M.darkGrey}><cylinderGeometry args={[10, 10, 1.4, 32]} /></mesh>
          <mesh position={[0, 0.5, 0]} material={M.aluDark}><cylinderGeometry args={[7, 7, 1.2, 28]} /></mesh>
          <mesh position={[0, 0.9, 0]} material={M.black}><cylinderGeometry args={[3.4, 3.4, 1.2, 20]} /></mesh>
          {[0, 1].map((i) => (
            <mesh key={i} position={[0, 1.5, 0]} rotation={[0, (i * Math.PI) / 2, 0]} material={M.hubRed}>
              <boxGeometry args={[11.5, 0.4, 1.1]} />
            </mesh>
          ))}
        </group>
      ))}

      {/* 前缘走带口 */}
      <mesh position={[0, 0, d / 2 - 1.2]} material={M.black}>
        <boxGeometry args={[w - 30, h - 5, 2.4]} />
      </mesh>

      {/* 四角螺丝 */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * (w / 2 - 5.5), h / 2 + 0.4, sz * (d / 2 - 5.5)]} material={M.aluDark}>
          <cylinderGeometry args={[1.5, 1.5, 0.8, 14]} />
        </mesh>
      ))}
    </group>
  );
}
