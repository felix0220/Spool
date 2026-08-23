import { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import CassetteDeck from '../deck3d/model/CassetteDeck.jsx';
import Cassette from '../deck3d/model/Cassette.jsx';
import PoseCamera from '../deck3d/camera/PoseCamera.jsx';
import { useDeck } from '../deck3d/interaction/useDeck.js';
import { POSE_ORDER, AZIMUTH, RADIUS, FOV, TARGET, POSES } from '../deck3d/camera/poses.js';
import { M } from '../deck3d/model/materials.js';

/** 背景取自参考图：亮暖灰。中性阶固定 H=115.7° —— 纯灰会读成「没选过」。
 *  浅机身压在浅背景上要靠接触阴影和材质差异分离，不靠加深背景。 */
const BG = '#F5442B';
const GROUND = '#E54831';

/**
 * 三卷带。位置由状态机逐帧写进 ref，不走 React state ——
 * 每帧 setState 会让拖动掉帧。
 */
function Tapes({ deck }) {
  const tints = [M.terra, M.scope, M.cream];
  const refs = useRef([]);

  useFrame(() => {
    deck.tapes.forEach((t, i) => {
      const g = refs.current[i];
      if (!g) return;
      g.position.copy(t.pos);
      g.rotation.set(t.rot.x, t.rot.y, t.rot.z);
    });
  });

  return (
    <group>
      {deck.tapes.map((t, i) => (
        <group
          key={t.id}
          ref={(el) => (refs.current[i] = el)}
          onPointerDown={(e) => { e.stopPropagation(); deck.grab(t.id, e.nativeEvent); }}
          onPointerOver={() => (document.body.style.cursor = 'grab')}
          onPointerOut={() => (document.body.style.cursor = '')}
        >
          <Cassette tint={tints[i]} />
        </group>
      ))}
    </group>
  );
}

function Scene({ pose, probe, snap, onLive, onDeck }) {
  const tr = useDeck();

  // 外部改 pose 时驱动过渡；snap=true 直接落终态（验收脚本用，保证三帧可精确复现）
  useEffect(() => {
    if (snap) { tr.snapTo(pose); } else { tr.goto(pose); }
  }, [pose, snap]);

  useEffect(() => { onLive?.({ elevation: tr.elevation, lid: tr.lid, playing: tr.playing, transitioning: tr.transitioning }); },
            [tr.elevation, tr.lid, tr.playing, tr.transitioning, onLive]);
  useEffect(() => { onDeck?.(tr); }, [tr.phase, tr.armed, tr.dragging, onDeck]);

  // 指针在整个 canvas 上跟踪，而不是只在卡带上 —— 快速拖动时指针会甩出网格
  useEffect(() => {
    const mv = (e) => tr.move(e);
    const up = () => tr.release();
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [tr]);

  return (
    <>
      <PoseCamera elevation={tr.elevation} focus={tr.playing ? 1 : 0} />

      {/* 程序化环境光。金属需要有东西可反射，否则拉丝铝会发黑；
          用 Lightformer 而不是 HDR 文件 —— artifact 的 CSP 禁止任何外部请求。 */}
      {!probe && (
        <Environment resolution={256} frames={1}>
          <Lightformer intensity={1.5} position={[0, 8, 1]} scale={[14, 8, 1]} rotation={[Math.PI / 2, 0, 0]} color="#ffffff" />
          <Lightformer intensity={0.85} position={[-7, 3, 5]} scale={[7, 9, 1]} rotation={[0, Math.PI / 4, 0]} color="#e6ebf4" />
          <Lightformer intensity={0.6} position={[7, 2, 5]} scale={[7, 9, 1]} rotation={[0, -Math.PI / 4, 0]} color="#f4ece0" />
          <Lightformer intensity={0.5} position={[0, -2, -7]} scale={[12, 5, 1]} color="#b9bcc4" />
        </Environment>
      )}
      <ambientLight intensity={0.55} />
      {/* 主光偏软：参考图是柔和的产品图光，不是硬投影 */}
      <directionalLight
        position={[-220, 560, 380]}
        intensity={0.85}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-400}
        shadow-camera-right={400}
        shadow-camera-top={400}
        shadow-camera-bottom={-400}
        shadow-camera-near={10}
        shadow-camera-far={1600}
        shadow-bias={-0.0006}
        shadow-radius={6}
      />
      <directionalLight position={[340, 200, 300]} intensity={0.28} />
      <directionalLight position={[0, 140, -480]} intensity={0.2} />

      {/* 承接阴影的台面。参考图里机器是落在一个浅色台面上的，不是浮在空中 */}
      {!probe && (
        <mesh position={[0, -0.4, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[3000, 3000]} />
          <meshStandardMaterial color={GROUND} roughness={0.92} />
        </mesh>
      )}

      <CassetteDeck lidOpen={tr.lid} probe={probe} playing={tr.playing} loaded={tr.tapes.some((t) => t.inDeck)} />
      {!probe && <Tapes deck={tr} />}

      {/* 接触阴影 —— §05：TOP 视图的厚度感一半来自这里 */}
      {!probe && <ContactShadows
        position={[0, 0.1, 0]}
        scale={620}
        resolution={2048}
        blur={3.2}
        opacity={0.34}
        far={180}
        color="#6d6f68"
      />}
    </>
  );
}

export default function App() {
  const [pose, setPose] = useState('TOP_CLOSED');
  const [probe, setProbe] = useState(false);  // false | true | 'body'
  const [snap, setSnap] = useState(false);
  const [live, setLive] = useState({ elevation: 90, lid: 0, playing: false, transitioning: false });
  const [deck, setDeck] = useState(null);

  // 保留隐式 QA hooks，但不把 debug HUD 放进产品画面。
  useEffect(() => {
    window.__setPose = setPose;
    window.__poses = POSE_ORDER;
    window.__setProbe = setProbe;
    // 验收 §09-01 直接读这张表，而不是相信源码注释
    // 验收脚本切三帧时要精确落在静态 pose 上，不能等动画
    window.__setSnap = setSnap;
    window.__deck = () => deck;
    window.__live = () => live;
    window.__poseTable = POSE_ORDER.map((k) => ({
      name: k,
      elevation: POSES[k].elevation,
      lid: POSES[k].lid,
      azimuth: AZIMUTH,
      radius: RADIUS,
      fov: FOV,
      target: TARGET,
    }));
  }, [live, deck]);

  return (
    <div className={`stage${probe ? ' probing' : ''}`}>
      <Canvas
        shadows
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        dpr={[1, 2]}
        onCreated={({ gl, scene, camera }) => {
          gl.setClearColor(BG);
          // 环境光 + 平行光叠加后整体偏亮，卡带尤其过曝；压一点曝光
          gl.toneMappingExposure = 1.0;
          window.__bg = BG;
          // 验收脚本用它做场景内省，不靠猜
          window.__scene = scene;
          window.__gl = gl;
          window.__getCamera = () => camera;
          window.__three = THREE;
          window.__r3fReady = true;
        }}
      >
        <Scene pose={pose} probe={probe} snap={snap} onLive={setLive} onDeck={setDeck} />
      </Canvas>
      {deck?.phase === 'loaded' && (
        <button className="eject-control" type="button" aria-label="Eject cassette" onClick={() => deck.eject()}>
          <span aria-hidden="true">⏏</span>
        </button>
      )}
    </div>
  );
}
