import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import './three-spatial-prototype.css';

const COLORS = {
  orange: '#F04B31',
  shell: '#D9D7CF',
  shellHi: '#ECEAE3',
  ink: '#17181B',
  inkDeep: '#0D0F12',
  blue: '#4B61A8',
  ochre: '#A97849',
  paper: '#EEECE4',
};

const WAVE = [0.18, 0.34, 0.22, 0.58, 0.31, 0.72, 0.28, 0.45, 0.62, 0.24, 0.4, 0.67, 0.3, 0.52, 0.2, 0.38, 0.56, 0.25, 0.48, 0.32];

function Knob({ position, color }) {
  return (
    <group position={position} rotation={[Math.PI / 2, 0, 0]}>
      <mesh>
        <cylinderGeometry args={[0.43, 0.43, 0.16, 32]} />
        <meshStandardMaterial color={color} roughness={0.82} metalness={0.08} />
      </mesh>
      <mesh position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.03, 20]} />
        <meshStandardMaterial color={COLORS.ink} roughness={0.9} />
      </mesh>
    </group>
  );
}

function Reel({ position, accent = COLORS.orange, scale = 1 }) {
  return (
    <group position={position} rotation={[Math.PI / 2, 0, 0]} scale={scale}>
      <mesh>
        <torusGeometry args={[0.46, 0.055, 10, 32]} />
        <meshStandardMaterial color={COLORS.paper} roughness={0.72} metalness={0.06} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.31, 0.31, 0.06, 32]} />
        <meshStandardMaterial color={COLORS.inkDeep} roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <torusGeometry args={[0.19, 0.035, 8, 24]} />
        <meshStandardMaterial color={accent} roughness={0.78} />
      </mesh>
    </group>
  );
}

function Cassette({ loaded, onLoad, groupRef }) {
  return (
    <group ref={groupRef} onClick={onLoad}>
      <RoundedBox args={[5.05, 0.2, 2.46]} radius={0.12} smoothness={3}>
        <meshStandardMaterial color="#BF6248" roughness={0.92} metalness={0.02} />
      </RoundedBox>
      <RoundedBox args={[4.28, 0.045, 1.72]} radius={0.05} smoothness={2} position={[0, 0.13, 0]}>
        <meshStandardMaterial color={COLORS.paper} roughness={0.95} />
      </RoundedBox>
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[2.65, 0.02, 0.04]} />
        <meshStandardMaterial color={COLORS.ochre} roughness={0.85} />
      </mesh>
      <Reel position={[-1.28, 0.16, 0]} accent={COLORS.orange} />
      <Reel position={[1.28, 0.16, 0]} accent={COLORS.orange} />
      <mesh position={[0, 0.15, 0.8]}>
        <boxGeometry args={[1.22, 0.035, 0.12]} />
        <meshStandardMaterial color={COLORS.ink} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.15, -0.8]}>
        <boxGeometry args={[1.22, 0.035, 0.12]} />
        <meshStandardMaterial color={COLORS.ink} roughness={0.9} />
      </mesh>
      {!loaded && (
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[3.7, 0.025, 0.025]} />
          <meshStandardMaterial color={COLORS.paper} roughness={0.9} />
        </mesh>
      )}
    </group>
  );
}

function FrontInterface() {
  return (
    <group position={[0, 0, 0.47]}>
      <RoundedBox args={[7.48, 4.02, 0.1]} radius={0.08} smoothness={3}>
        <meshStandardMaterial color={COLORS.ink} roughness={0.84} />
      </RoundedBox>
      <RoundedBox args={[6.75, 2.48, 0.08]} radius={0.06} smoothness={2} position={[0, 0.68, 0.09]}>
        <meshStandardMaterial color="#0A0C0F" roughness={0.95} />
      </RoundedBox>
      {WAVE.map((height, index) => (
        <RoundedBox
          key={index}
          args={[0.1, Math.max(0.08, height * 1.48), 0.035]}
          radius={0.025}
          smoothness={2}
          position={[-2.92 + index * 0.31, 0.68 + (index % 2 ? 0.2 : -0.18), 0.16]}
        >
          <meshStandardMaterial color={index % 4 === 0 ? COLORS.orange : index % 3 === 0 ? COLORS.blue : COLORS.paper} roughness={0.78} />
        </RoundedBox>
      ))}
      <mesh position={[0, 0.12, 0.15]}>
        <boxGeometry args={[6.05, 0.028, 0.035]} />
        <meshStandardMaterial color={COLORS.paper} roughness={0.88} />
      </mesh>
      <mesh position={[0, -0.86, 0.15]}>
        <boxGeometry args={[6.05, 0.028, 0.035]} />
        <meshStandardMaterial color={COLORS.orange} roughness={0.88} />
      </mesh>
      <Knob position={[-2.6, -1.47, 0.16]} color={COLORS.blue} />
      <Knob position={[-0.95, -1.47, 0.16]} color={COLORS.paper} />
      <Knob position={[0.72, -1.47, 0.16]} color={COLORS.ochre} />
      <RoundedBox args={[1.08, 0.34, 0.1]} radius={0.05} smoothness={2} position={[2.2, -1.47, 0.16]}>
        <meshStandardMaterial color={COLORS.orange} roughness={0.82} />
      </RoundedBox>
    </group>
  );
}

function CssSpatialFallback({ viewMode, loaded, onLoad }) {
  return (
    <div className={`three-css-fallback three-css-fallback--${viewMode}`} aria-label="CSS spatial fallback for the Three.js prototype">
      <div className="three-css-fallback__machine">
        <div className="three-css-fallback__top">
          <div className="three-css-fallback__bay">
            <div className="three-css-fallback__pin three-css-fallback__pin--left" />
            <div className="three-css-fallback__pin three-css-fallback__pin--right" />
            {!loaded && (
              <button className="three-css-fallback__cassette" type="button" onClick={onLoad} aria-label="Load cassette">
                <span className="three-css-fallback__reel three-css-fallback__reel--left" />
                <span className="three-css-fallback__reel three-css-fallback__reel--right" />
              </button>
            )}
          </div>
        </div>
        <div className="three-css-fallback__front">
          <div className="three-css-fallback__screen">
            <div className="three-css-fallback__wave" />
            <div className="three-css-fallback__meters"><i /><i /><i /><i /><i /><i /><i /></div>
          </div>
          <div className="three-css-fallback__controls">
            <span /><span /><span /><b />
          </div>
        </div>
        <div className="three-css-fallback__leg three-css-fallback__leg--left" />
        <div className="three-css-fallback__leg three-css-fallback__leg--right" />
      </div>
    </div>
  );
}

function DeckScene({ viewMode, loaded, onLoad }) {
  const cassetteRef = useRef(null);
  const lidRef = useRef(null);
  const motionRef = useRef({ view: viewMode === 'front' ? 1 : 0, load: loaded ? 1 : 0 });

  useFrame(({ camera }, delta) => {
    const motion = motionRef.current;
    motion.view = THREE.MathUtils.damp(motion.view, viewMode === 'front' ? 1 : 0, 3.4, delta);
    motion.load = THREE.MathUtils.damp(motion.load, loaded ? 1 : 0, 5.6, delta);

    const topCamera = new THREE.Vector3(0, 9.2, 0.45);
    const frontCamera = new THREE.Vector3(0, 0.1, 10.4);
    camera.position.lerpVectors(topCamera, frontCamera, motion.view);
    camera.lookAt(0, 0, 0);

    if (cassetteRef.current) {
      const lift = 2.76 + (1 - motion.load) * 0.64;
      cassetteRef.current.position.set(0, lift, -0.1);
      cassetteRef.current.rotation.y = (1 - motion.load) * -0.035;
    }
    if (lidRef.current) {
      // A small physical lid hinge remains visible in the top view, then
      // settles flush before the camera reaches the front view.
      lidRef.current.rotation.x = -0.02 + motion.load * 0.02;
    }
  });

  return (
    <>
      <ambientLight intensity={2.2} />
      <directionalLight position={[3, 7, 6]} intensity={1.4} />
      <group>
        <RoundedBox args={[8, 4.5, 0.82]} radius={0.18} smoothness={4} position={[0, 0, 0]}>
          <meshStandardMaterial color={COLORS.shell} roughness={0.88} metalness={0.04} />
        </RoundedBox>
        <RoundedBox args={[7.52, 0.12, 3.72]} radius={0.08} smoothness={3} position={[0, 2.29, 0]}>
          <meshStandardMaterial color={COLORS.shellHi} roughness={0.9} metalness={0.03} />
        </RoundedBox>
        <RoundedBox args={[6.85, 0.12, 2.92]} radius={0.08} smoothness={3} position={[0, 2.38, 0]}>
          <meshStandardMaterial color={COLORS.inkDeep} roughness={0.96} />
        </RoundedBox>
        <group ref={lidRef} position={[0, 2.43, -1.46]}>
          <RoundedBox args={[6.82, 0.1, 0.16]} radius={0.04} smoothness={2}>
            <meshStandardMaterial color={COLORS.shell} roughness={0.9} />
          </RoundedBox>
        </group>
        <Reel position={[-1.28, 2.5, 0]} accent={COLORS.ochre} scale={0.72} />
        <Reel position={[1.28, 2.5, 0]} accent={COLORS.ochre} scale={0.72} />
        <group ref={cassetteRef}>
          <Cassette loaded={loaded} onLoad={onLoad} groupRef={null} />
        </group>
        <FrontInterface />
        <RoundedBox args={[1.2, 2.35, 0.75]} radius={0.08} smoothness={3} position={[-2.55, -3.15, 0]} rotation={[0, 0, -0.08]}>
          <meshStandardMaterial color="#24272A" roughness={0.82} metalness={0.12} />
        </RoundedBox>
        <RoundedBox args={[1.2, 2.35, 0.75]} radius={0.08} smoothness={3} position={[2.55, -3.15, 0]} rotation={[0, 0, 0.08]}>
          <meshStandardMaterial color="#24272A" roughness={0.82} metalness={0.12} />
        </RoundedBox>
        <mesh position={[-2.55, -4.32, 0]}>
          <cylinderGeometry args={[0.42, 0.42, 0.16, 32]} />
          <meshStandardMaterial color="#9B9B95" roughness={0.68} metalness={0.5} />
        </mesh>
        <mesh position={[2.55, -4.32, 0]}>
          <cylinderGeometry args={[0.42, 0.42, 0.16, 32]} />
          <meshStandardMaterial color="#9B9B95" roughness={0.68} metalness={0.5} />
        </mesh>
      </group>
    </>
  );
}

export default function ThreeSpatialPrototype() {
  const [viewMode, setViewMode] = useState('top');
  const [loaded, setLoaded] = useState(false);
  const [webglAvailable, setWebglAvailable] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  useEffect(() => {
    const probe = document.createElement('canvas');
    let context = null;
    try {
      context = probe.getContext('webgl2') || probe.getContext('webgl');
    } catch {
      context = null;
    }
    setWebglAvailable(Boolean(context));
  }, []);

  const loadCassette = () => {
    setLoaded(true);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setViewMode('front'), 900);
  };

  const reset = () => {
    window.clearTimeout(timerRef.current);
    setViewMode('top');
    setLoaded(false);
  };

  return (
    <main className="three-spatial-proto">
      <div className="three-spatial-proto__canvas" aria-label="Three.js spatial cassette deck prototype">
        {webglAvailable === null && <div className="three-spatial-proto__checking">CHECKING WEBGL</div>}
        {webglAvailable === true && (
          <Canvas
            orthographic
            camera={{ position: [0, 9.2, 0.45], zoom: 58, near: 0.1, far: 100 }}
            gl={{ antialias: true, alpha: true }}
            dpr={[1, 2]}
          >
            <DeckScene viewMode={viewMode} loaded={loaded} onLoad={loadCassette} />
          </Canvas>
        )}
        {webglAvailable === false && <CssSpatialFallback viewMode={viewMode} loaded={loaded} onLoad={loadCassette} />}
      </div>
      <header className="three-spatial-proto__header">
        <span>THREE / SPATIAL FORK</span>
        <span className="three-spatial-proto__state">
          {viewMode === 'top' ? 'TOP LOADING' : 'FRONT CONSOLE'}{webglAvailable === false ? ' / CSS FALLBACK' : ''}
        </span>
      </header>
      <div className="three-spatial-proto__controls" role="group" aria-label="Spatial prototype controls">
        <button type="button" className={viewMode === 'top' ? 'is-active' : ''} onClick={() => setViewMode('top')}>TOP</button>
        <button type="button" className={viewMode === 'front' ? 'is-active' : ''} onClick={() => setViewMode('front')}>FRONT</button>
        <button type="button" className="is-accent" onClick={loadCassette}>LOAD</button>
        <button type="button" onClick={reset}>RESET</button>
      </div>
      <p className="three-spatial-proto__hint">Click the cassette or LOAD to test the shared camera path.</p>
    </main>
  );
}
