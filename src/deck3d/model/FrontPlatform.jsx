import { CHASSIS, FRONT, Z_FRONT, Z_WELL, frontPos } from './dimensions.js';
import { M, PROBE } from './materials.js';
import Screen from './Screen.jsx';

/**
 * 正面控制面。屏幕占 52% 面积 —— 这台机器的表达主体是屏幕，不是旋钮阵列。
 * 原来的 meter / timecode 全部并入屏幕内容（参考图里它们本来就是屏幕元素）。
 * TOP 视图下这一整面靠顶板出檐遮挡，不需要隐藏逻辑。
 */
export default function FrontPlatform({ probe = false, playing = false, loaded = false }) {
  const { knob, keys, grille } = FRONT;
  const P = (m) => (probe ? PROBE.front : m);

  return (
    <group>
      {/* 正面的黑色功能岛：保留原 demo 的黑 / cream 对比，但它仍是机身上的真实面。 */}
      <mesh position={[0, CHASSIS.h / 2, Z_WELL - 1.2]} material={P(M.black)}>
        <boxGeometry args={[CHASSIS.w - 12, CHASSIS.h - 14, 2.4]} />
      </mesh>

      {probe ? (
        // 探针模式用纯色板代替屏幕，保证「正面可见像素」能被数出来
        <mesh
          position={frontPos(FRONT.screen.left, FRONT.screen.top, FRONT.screen.w, FRONT.screen.h)}
          material={PROBE.front}
        >
          <boxGeometry args={[FRONT.screen.w, FRONT.screen.h, 2]} />
        </mesh>
      ) : (
        <Screen playing={playing} loaded={loaded} />
      )}

      {/* 冲孔 speaker grille：几何孔阵列，不用一张扁平纹理冒充。 */}
      {!probe && (() => {
        const pitchX = grille.w / (grille.cols - 1);
        const pitchY = grille.h / (grille.rows - 1);
        const holes = [];
        for (let row = 0; row < grille.rows; row++) {
          for (let col = 0; col < grille.cols; col++) {
            holes.push(
              <mesh
                key={`grille-${row}-${col}`}
                position={[
                  -CHASSIS.w / 2 + grille.left + col * pitchX,
                  CHASSIS.h - grille.top - row * pitchY,
                  Z_FRONT + 2.5,
                ]}
                material={M.aluDark}
                rotation={[Math.PI / 2, 0, 0]}
              >
                <cylinderGeometry args={[grille.holeR, grille.holeR, 1.4, 12]} />
              </mesh>
            );
          }
        }
        return <>{holes}</>;
      })()}

      {/* 旋钮：圆柱 + 平顶 + 有色轴环（K.O. II 语言），沉在凹槽里 */}
      {knob.xs.map((lx, i) => {
        const [x, y] = frontPos(lx - knob.d / 2, knob.top - knob.d / 2, knob.d, knob.d);
        return (
          <group key={i} position={[x, y, Z_WELL]}>
            <mesh material={P(i === 0 ? M.accent : M.darkGrey)} rotation={[Math.PI / 2, 0, 0]}
                  position={[0, 0, knob.protrude / 2]} castShadow>
              <cylinderGeometry args={[knob.d / 2, knob.d / 2 - 0.7, knob.protrude, 40]} />
            </mesh>
            {/* 滚花：TP-7 的旋钮细节 */}
            {Array.from({ length: 46 }).map((_, k) => {
              const a = (k / 46) * Math.PI * 2;
              return (
                <mesh key={k} material={P(i === 0 ? M.accent : M.darkGrey)}
                      position={[Math.cos(a) * (knob.d / 2 - 0.3), Math.sin(a) * (knob.d / 2 - 0.3), knob.protrude / 2]}>
                  <boxGeometry args={[0.5, 0.5, knob.protrude - 1.6]} />
                </mesh>
              );
            })}
            <mesh material={P(M.aluDark)} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, knob.protrude + 0.5]}>
              <cylinderGeometry args={[knob.d / 2 - 3.5, knob.d / 2 - 3.5, 1.4, 40]} />
            </mesh>
            <mesh material={P(M.black)} position={[0, knob.d / 2 - 4.5, knob.protrude + 1.3]}>
              <boxGeometry args={[1.4, 5, 0.7]} />
            </mesh>
          </group>
        );
      })}

      {/* transport 键：微凸橡胶键，最后一枚是 accent */}
      {keys.rows.map((ty, r) =>
        keys.cols.map((tx, c) => {
          const [x, y] = frontPos(tx - keys.w / 2, ty - keys.h / 2, keys.w, keys.h);
          const isPlay = c === keys.cols.length - 1;
          return (
            <mesh key={`${r}-${c}`} position={[x, y, Z_WELL + keys.protrude / 2]}
                  material={P(isPlay ? M.accent : M.midGrey)} castShadow>
              <boxGeometry args={[keys.w, keys.h, keys.protrude]} />
            </mesh>
          );
        })
      )}
    </group>
  );
}
