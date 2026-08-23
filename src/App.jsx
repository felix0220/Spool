import { useEffect, useState } from 'react';
import GraphicDeckStage from './components/GraphicDeckStage.jsx';
import SideCartridgeKeyframe from './components/SideCartridgeKeyframe.jsx';
import './graphic-deck.css';
import './side-cartridge.css';
import './front-reference.css';

const FRONT_MODES = new Set(['legacy', 'reference']);

export function App() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view');
  const requestedFront = params.get('front');
  const frontMode = FRONT_MODES.has(requestedFront) ? requestedFront : 'reference';
  const isThreeSpatialPrototype = import.meta.env.DEV && params.get('proto') === 'three-spatial';
  const [ThreeSpatialPrototype, setThreeSpatialPrototype] = useState(null);

  useEffect(() => {
    if (!isThreeSpatialPrototype) return undefined;
    let active = true;
    import('./components/prototypes/ThreeSpatialPrototype.jsx').then(({ default: Prototype }) => {
      if (active) setThreeSpatialPrototype(() => Prototype);
    });
    return () => { active = false; };
  }, [isThreeSpatialPrototype]);

  if (isThreeSpatialPrototype) {
    return ThreeSpatialPrototype
      ? <ThreeSpatialPrototype />
      : <main className="three-spatial-proto three-spatial-proto--loading">Loading spatial fork…</main>;
  }

  return view === 'keyframe'
    ? <SideCartridgeKeyframe />
    : <GraphicDeckStage frontMode={frontMode} />;
}
