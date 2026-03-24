import buildCygniA from './cygni-a.js';
import buildCygniB from './cygni-b.js';
import buildCygniBb from './cygni-bb.js';
import buildCygniC from './cygni-c.js';

export default function buildCygniSystem(ctx) {
  const center = new ctx.THREE.Vector3(-4000, -200, -7000);
  ctx.createBarycenter(center, "16 Cygni");
  ctx.addSystemLabel("天鹅座16 (16 Cygni)", "69 ly", center);

  const systemCtx = { ...ctx, center };
  buildCygniA(systemCtx);
  buildCygniB(systemCtx);
  buildCygniC(systemCtx);

  systemCtx.addOrbitLabel("Orbit: ~430 AU", 200, center, 0.5);
  systemCtx.addOrbitLabel("Orbit: ~430 AU", 200, center, 3.5);

  buildCygniBb(systemCtx);

  return {
    id: 'cygni',
    center,
    focusOffset: { x: 0, y: 200, z: 400 }
  };
}
