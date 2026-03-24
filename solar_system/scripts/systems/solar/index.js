import buildInner from './inner/index.js';
import buildOuter from './outer/index.js';

export default function buildSolarSystem(ctx) {
  const center = new ctx.THREE.Vector3(0, 0, 0);
  const solarConfig = {};
  const systemCtx = { ...ctx, center, solarConfig };

  buildInner(systemCtx);
  buildOuter(systemCtx);

  systemCtx.addOrbitLabel("0.39 AU", 20, center, 0);
  systemCtx.addOrbitLabel("0.72 AU", 30, center, 1);
  systemCtx.addOrbitLabel("1.00 AU", 45, center, 2);
  systemCtx.addOrbitLabel("1.52 AU", 60, center, 3);
  systemCtx.addOrbitLabel("2.2 AU (Inner)", solarConfig.asteroidInner ?? 70, center, 3.5);
  systemCtx.addOrbitLabel("3.2 AU (Outer)", solarConfig.asteroidOuter ?? 90, center, 3.5);
  systemCtx.addOrbitLabel("5.20 AU", 135, center, 4);
  systemCtx.addOrbitLabel("9.54 AU", 195, center, 5);
  systemCtx.addOrbitLabel("19.2 AU", 250, center, 0.5);
  systemCtx.addOrbitLabel("30.1 AU", 300, center, 1.5);
  systemCtx.addOrbitLabel("30.0 AU (Inner)", solarConfig.kuiperInner ?? 320, center, 2.0);
  systemCtx.addOrbitLabel("50.0 AU (Outer)", solarConfig.kuiperOuter ?? 400, center, 2.0);
  systemCtx.addOrbitLabel("39.5 AU (Pluto)", 330, center, 2.5);

  systemCtx.addSystemLabel("太阳系 (Solar System)", "", new ctx.THREE.Vector3(0, 100, 0));

  return {
    id: 'solar',
    center,
    focusOffset: { x: 0, y: 150, z: 250 }
  };
}

