import buildSiriusA from './sirius-a.js';
import buildSiriusB from './sirius-b.js';

export default function buildSiriusSystem(ctx) {
  const center = new ctx.THREE.Vector3(-2000, 100, 2500);
  ctx.createBarycenter(center, "Sirius");
  ctx.addSystemLabel("天狼星 (Sirius)", "8.60 ly", center);

  const systemCtx = { ...ctx, center };
  buildSiriusA(systemCtx);
  buildSiriusB(systemCtx);

  systemCtx.addOrbitLabel("Orbit: ~8 AU", 12, center, 0.5);
  systemCtx.addOrbitLabel("Orbit: ~20 AU", 28, center, 3.5);

  return {
    id: 'sirius',
    center,
    focusOffset: { x: 0, y: 100, z: 200 }
  };
}

