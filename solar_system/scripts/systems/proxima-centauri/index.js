import buildProximaStar from './proxima.js';
import buildProximaD from './proxima-d.js';
import buildProximaB from './proxima-b.js';
import buildProximaC from './proxima-c.js';

export default function buildProximaCentauriSystem(ctx) {
  const center = new ctx.THREE.Vector3(1000, -50, -1000);
  ctx.addSystemLabel("比邻星 (Proxima Centauri)", "4.24 ly", center);

  const systemCtx = { ...ctx, center };
  buildProximaStar(systemCtx);
  buildProximaD(systemCtx);
  buildProximaB(systemCtx);
  buildProximaC(systemCtx);

  systemCtx.addOrbitLabel("0.029 AU (d)", 6, center, 0);
  systemCtx.addOrbitLabel("0.049 AU (b)", 9, center, 2.0);
  systemCtx.addOrbitLabel("1.49 AU (c)", 25, center, 4.0);

  return {
    id: 'proxima',
    center,
    focusOffset: { x: 0, y: 20, z: 40 }
  };
}

