import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import {
  CHASSIS, TOP_PLATE, RIM, BAY, LID, HINGE, FRONT, Z_WELL, TOP_SPEAKER,
  Y_TOP_PLATE_TOP, Y_TOP_PLATE_BOT, Y_RIM_BOT,
  Z_FRONT, Z_REAR, BAY_Z_FRONT, BAY_Z_REAR, BAY_Z_CENTER,
  LID_Z_REAR, LID_Z_FRONT,
} from './dimensions.js';
import { M, PROBE } from './materials.js';
import FrontPlatform from './FrontPlatform.jsx';

/** 倒角盒。探针模式退回硬边 box —— RoundedBox 不支持材质数组，
 *  而顶面探针依赖 boxGeometry 的 6 个材质槽。 */
function Panel({ args, radius = 1.6, material, probeMaterial, castShadow = true, receiveShadow = true, ...rest }) {
  if (probeMaterial !== undefined) {
    return (
      <mesh material={probeMaterial} castShadow={castShadow} receiveShadow={receiveShadow} {...rest}>
        <boxGeometry args={args} />
      </mesh>
    );
  }
  const r = Math.min(radius, Math.min(...args) / 2 - 0.01);
  return (
    <RoundedBox args={args} radius={Math.max(0.02, r)} smoothness={3} steps={1}
                material={material} castShadow={castShadow} receiveShadow={receiveShadow} {...rest} />
  );
}

/** 卷盘。playing 时匀速转 —— 匀速运动就该 linear，加 ease 反而假。 */
function ReelWell({ side, playing, mat }) {
  const hub = useRef();
  useFrame((_, dt) => { if (hub.current && playing) hub.current.rotation.y += dt * 1.5 * side; });
  return (
    <group>
      <mesh material={mat(M.darkGrey)} position={[0, 2, 0]}>
        <cylinderGeometry args={[13, 13, 4, 40]} />
      </mesh>
      <group ref={hub}>
        <mesh material={mat(M.aluDark)} position={[0, 4.6, 0]}>
          <cylinderGeometry args={[5.5, 5.5, 5, 28]} />
        </mesh>
        <mesh material={mat(M.black)} position={[0, 7.4, 0]}>
          <cylinderGeometry args={[2.2, 2.2, 5, 20]} />
        </mesh>
        {/* 辐条：没有它旋转对称，转和不转一模一样 */}
        {[0, 1, 2].map((i) => (
          <mesh key={i} material={mat(M.black)} position={[0, 7.6, 0]} rotation={[0, (i * Math.PI) / 3, 0]}>
            <boxGeometry args={[10.4, 0.8, 1.6]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/**
 * CANONICAL PRODUCT MODEL —— 场景里唯一的机身。
 * 三个 keyframe 是这一个立体在三个相机角度下的结果，不是三张图。
 * 唯一接受的形态变量是 lidOpen（0..1 滑动比例）。
 */
export default function CassetteDeck({ lidOpen = 0, probe = false, playing = false, loaded = false }) {
  const bodyOnly = probe === 'body';
  const P = (m) => (bodyOnly ? PROBE.body : probe ? PROBE.neutral : m);
  const B = (m) => (bodyOnly ? PROBE.body : probe ? PROBE.bay : m);
  const pm = (m) => (probe ? P(m) : undefined);     // Panel 的探针材质
  const plateProbe = bodyOnly
    ? PROBE.body
    : probe
    ? [PROBE.neutral, PROBE.neutral, PROBE.topFace, PROBE.neutral, PROBE.neutral, PROBE.neutral]
    : undefined;

  const g = LID.gap;
  const plateFrontD = TOP_PLATE.d / 2 - LID_Z_FRONT - g;
  const plateRearD = LID_Z_REAR - (-TOP_PLATE.d / 2) - g;
  const plateSideW = (TOP_PLATE.w - LID.w) / 2 - g;
  const plateY = Y_TOP_PLATE_BOT + TOP_PLATE.h / 2;

  const rimFrontD = Z_FRONT - BAY_Z_FRONT;
  const rimRearD = BAY_Z_REAR - Z_REAR;
  const rimSideW = (CHASSIS.w - BAY.w) / 2;
  const rimY = Y_RIM_BOT + RIM.h / 2;

  return (
    <group name="CassetteDeck">

      {/* ---- chassis 主体。前部深度只到 Z_WELL —— 凹槽是真挖出来的 ---- */}
      <Panel args={[CHASSIS.w, Y_RIM_BOT, Z_WELL - Z_REAR]} radius={2.4}
             position={[0, Y_RIM_BOT / 2, (Z_REAR + Z_WELL) / 2]}
             material={P(M.casing)} probeMaterial={pm(M.casing)} />

      {/* ---- 前脸皮层：围着 well 开口的一圈 ---- */}
      {(() => {
        const wd = FRONT.well.depth, zc = Z_WELL + wd / 2;
        const yTop = CHASSIS.h - FRONT.well.top, yBot = FRONT.well.bottom;
        const sideX = CHASSIS.w / 2 - FRONT.well.side;
        return (
          <>
            <Panel key="t" args={[CHASSIS.w, Y_RIM_BOT - yTop, wd]} radius={2}
                   position={[0, (yTop + Y_RIM_BOT) / 2, zc]} material={P(M.casing)} probeMaterial={pm(M.casing)} />
            <Panel key="b" args={[CHASSIS.w, yBot, wd]} radius={1.2}
                   position={[0, yBot / 2, zc]} material={P(M.casing)} probeMaterial={pm(M.casing)} />
            {[-1, 1].map((sx) => (
              <Panel key={`s${sx}`} args={[FRONT.well.side, yTop - yBot, wd]} radius={1.2}
                     position={[sx * (sideX + FRONT.well.side / 2), (yTop + yBot) / 2, zc]}
                     material={P(M.casing)} probeMaterial={pm(M.casing)} />
            ))}
          </>
        );
      })()}

      {/* ---- chassis 顶部 rim：四条边围出 bay 开口 ---- */}
      <Panel args={[CHASSIS.w, RIM.h, rimFrontD]} radius={1}
             position={[0, rimY, Z_FRONT - rimFrontD / 2]} material={P(M.casing)} probeMaterial={pm(M.casing)} />
      <Panel args={[CHASSIS.w, RIM.h, rimRearD]} radius={1}
             position={[0, rimY, Z_REAR + rimRearD / 2]} material={P(M.casing)} probeMaterial={pm(M.casing)} />
      {[-1, 1].map((s) => (
        <Panel key={s} args={[rimSideW, RIM.h, BAY.d]} radius={1}
               position={[s * (CHASSIS.w - rimSideW) / 2, rimY, BAY_Z_CENTER]}
               material={P(M.casing)} probeMaterial={pm(M.casing)} />
      ))}

      {/* ---- bay 内部 ---- */}
      <mesh position={[0, Y_RIM_BOT + 0.4, BAY_Z_CENTER]} material={P(M.black)} receiveShadow>
        <boxGeometry args={[BAY.w, 0.8, BAY.d]} />
      </mesh>
      <mesh position={[0, Y_RIM_BOT + 5, BAY_Z_FRONT - 3]} material={P(M.darkGrey)}>
        <boxGeometry args={[BAY.w - 8, 9, 3]} />
      </mesh>
      <mesh position={[0, Y_RIM_BOT + 6, BAY_Z_FRONT - 8]} material={B(M.aluDark)} castShadow>
        <boxGeometry args={[22, 11, 5]} />
      </mesh>
      <mesh position={[0, Y_RIM_BOT + 8, BAY_Z_FRONT - 8]} material={B(M.trim)}>
        <boxGeometry args={[14, 5, 5.6]} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 24, Y_RIM_BOT + 1, BAY_Z_CENTER - 4]}>
          <ReelWell side={s} playing={playing} mat={B} />
        </group>
      ))}

      {/* ---- 正面控制面（不隐藏，靠顶板出檐遮挡） ---- */}
      {!bodyOnly && <FrontPlatform probe={probe} playing={playing} loaded={loaded} />}

      {/* ---- 顶板：四边围出滑轨凹槽 ---- */}
      <Panel args={[TOP_PLATE.w, TOP_PLATE.h, plateFrontD]} radius={1.4}
             position={[0, plateY, TOP_PLATE.d / 2 - plateFrontD / 2]}
             material={M.alu} probeMaterial={plateProbe} />
      <Panel args={[TOP_PLATE.w, TOP_PLATE.h, plateRearD]} radius={1.4}
             position={[0, plateY, -TOP_PLATE.d / 2 + plateRearD / 2]}
             material={M.alu} probeMaterial={plateProbe} />
      {[-1, 1].map((s) => (
        <Panel key={s} args={[plateSideW, TOP_PLATE.h, LID.d]} radius={1.4}
               position={[s * (TOP_PLATE.w - plateSideW) / 2, plateY, (LID_Z_REAR + LID_Z_FRONT) / 2]}
               material={M.alu} probeMaterial={plateProbe} />
      ))}

      {/* 滑轨槽底：深色，让 2mm 缝读成真实接缝 */}
      {(() => {
        const oW = LID.w + 2 * g, oD = LID.d + 2 * g;
        const oZ = (LID_Z_REAR + LID_Z_FRONT) / 2;
        const fZ = oZ + oD / 2, rZ = oZ - oD / 2;
        const fD = fZ - BAY_Z_FRONT, rD = BAY_Z_REAR - rZ, sW = (oW - BAY.w) / 2;
        const y = Y_TOP_PLATE_BOT + 1;
        const bar = (k, args, pos) => (
          <mesh key={k} position={pos} material={P(M.black)}><boxGeometry args={args} /></mesh>
        );
        return (
          <>
            {bar('f', [oW, 2, fD], [0, y, fZ - fD / 2])}
            {bar('r', [oW, 2, rD], [0, y, rZ + rD / 2])}
            {[-1, 1].map((sx) => bar(`s${sx}`, [sW, 2, BAY.d], [sx * (oW - sW) / 2, y, BAY_Z_CENTER]))}
          </>
        );
      })()}

      {/* 顶板前沿喇叭 —— 正面让给屏幕，这里顺带给顶视补细节 */}
      {!bodyOnly && (() => {
        const sp = TOP_SPEAKER;
        const zc = (LID_Z_FRONT + g + TOP_PLATE.d / 2) / 2;
        const pitch = sp.w / (sp.cols - 1);
        const out = [];
        for (let r = 0; r < sp.rows; r++)
          for (let cc = 0; cc < sp.cols; cc++)
            out.push(
              <mesh key={`sp${r}-${cc}`}
                    position={[-sp.w / 2 + cc * pitch, Y_TOP_PLATE_TOP - 0.5, zc + (r - 0.5) * 3.4]}
                    material={P(M.black)}>
                <cylinderGeometry args={[sp.holeR, sp.holeR, 1.8, 10]} />
              </mesh>
            );
        return <>{out}</>;
      })()}

      {/* 顶板四角螺丝 + 丝印 —— 顶视是最空的一面，没有细节它就是一块板 */}
      {!bodyOnly && [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <group key={`sc${i}`} position={[sx * (TOP_PLATE.w / 2 - 6), Y_TOP_PLATE_TOP - 0.3, sz * (TOP_PLATE.d / 2 - 5.5)]}>
          <mesh material={P(M.aluDark)}><cylinderGeometry args={[2.4, 2.4, 1.2, 20]} /></mesh>
          <mesh position={[0, 0.5, 0]} material={P(M.darkGrey)}><boxGeometry args={[3.2, 0.6, 0.7]} /></mesh>
        </group>
      ))}
      {!bodyOnly && (
        <>
          <mesh position={[-TOP_PLATE.w / 2 + 17, Y_TOP_PLATE_TOP + 0.3, -TOP_PLATE.d / 2 + 5.5]} material={P(M.accent)}>
            <boxGeometry args={[13, 0.6, 2.4]} />
          </mesh>
          <mesh position={[-TOP_PLATE.w / 2 + 17, Y_TOP_PLATE_TOP + 0.3, -TOP_PLATE.d / 2 + 9.5]} material={P(M.darkGrey)}>
            <boxGeometry args={[7.5, 0.6, 1.2]} />
          </mesh>
        </>
      )}

      {/* ---- LID —— 围绕同一个后方 hinge 抬起。相机不动时，
             TOP_CLOSED / TOP_OPEN 只改变这一个 lid state。 ---- */}
      {!bodyOnly && (
        <group position={[0, HINGE.y, HINGE.z]}
               rotation={[lidOpen * (76 * Math.PI / 180), 0, 0]}
               name="lidHinge">
          <Panel args={[LID.w, LID.h, LID.d]} radius={1.4}
                 position={[0, -LID.h / 2, LID.d / 2]}
                 material={M.alu} probeMaterial={plateProbe} />
          {/* 观察窗：真开口（四条边框），不是黑色实体板 —— 用透明材质会引入 opacity */}
          {(() => {
            const winW = LID.window.w, winD = LID.window.d;
            const cz = LID.d - LID.window.fromFront;
            const sideW = (LID.w - winW) / 2, frontD = (LID.d - winD) / 2;
            const mat = M.alu;
            return (
              <>
                {[-1, 1].map((sx) => (
                  <Panel key={`x${sx}`} args={[sideW, LID.h + 0.1, winD]} radius={0.8}
                         position={[sx * (LID.w - sideW) / 2, -LID.h / 2, cz]}
                         material={mat} probeMaterial={plateProbe} />
                ))}
                {[-1, 1].map((sz) => (
                  <Panel key={`z${sz}`} args={[LID.w, LID.h + 0.1, frontD]} radius={0.8}
                         position={[0, -LID.h / 2, cz + sz * (LID.d - frontD) / 2]}
                         material={mat} probeMaterial={plateProbe} />
                ))}
              </>
            );
          })()}
          {/* 前缘指槽 —— 滑动式仓盖的操作点 */}
          <mesh position={[0, -LID.h - 1.2, LID.d - 5]} material={P(M.aluDark)}>
            <boxGeometry args={[38, 1.6, 5]} />
          </mesh>
        </group>
      )}

      {/* 两条铰链座：让 top view 能读出 lid 的结构关系。 */}
      {!bodyOnly && [-1, 1].map((s) => (
        <mesh key={`hinge-${s}`} position={[s * (LID.w / 2 - 16), Y_TOP_PLATE_TOP - 1.4, HINGE.z]}
              material={P(M.darkGrey)}>
          <boxGeometry args={[12, 2.8, 7]} />
        </mesh>
      ))}
    </group>
  );
}
