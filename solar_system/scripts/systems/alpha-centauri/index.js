import buildAlphaA from './alpha-a.js';
import buildAlphaB from './alpha-b.js';

export default function buildAlphaCentauriSystem(ctx) {
  const center = new ctx.THREE.Vector3(1200, 50, -1200);

  ctx.createBarycenter(center, "Alpha Centauri");
  ctx.addSystemLabel("半人马座 α (Alpha Centauri)", "4.37 ly", center);

  const systemCtx = { ...ctx, center };
  buildAlphaA(systemCtx);
  buildAlphaB(systemCtx);

  systemCtx.addOrbitLabel("Orbit: ~11 AU", 18, center, 0.5);
  systemCtx.addOrbitLabel("Orbit: ~13 AU", 25, center, 3.5);

  return {
    id: 'alpha',
    center,
    focusOffset: { x: 0, y: 100, z: 200 }
  };
}

