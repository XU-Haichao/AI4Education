import buildTrappistStar from './trappist-1.js';
import buildTrappist1b from './trappist-1b.js';
import buildTrappist1c from './trappist-1c.js';
import buildTrappist1d from './trappist-1d.js';
import buildTrappist1e from './trappist-1e.js';
import buildTrappist1f from './trappist-1f.js';
import buildTrappist1g from './trappist-1g.js';
import buildTrappist1h from './trappist-1h.js';

export default function buildTrappistSystem(ctx) {
  const center = new ctx.THREE.Vector3(3500, -300, 4000);
  ctx.addSystemLabel("特拉皮斯特-1 (TRAPPIST-1)", "40.7 ly", center);

  const systemCtx = { ...ctx, center };
  buildTrappistStar(systemCtx);
  buildTrappist1b(systemCtx);
  buildTrappist1c(systemCtx);
  buildTrappist1d(systemCtx);
  buildTrappist1e(systemCtx);
  buildTrappist1f(systemCtx);
  buildTrappist1g(systemCtx);
  buildTrappist1h(systemCtx);

  systemCtx.addOrbitLabel("0.011 AU (b)", 8, center, 0);
  systemCtx.addOrbitLabel("0.015 AU (c)", 11, center, 1.0);
  systemCtx.addOrbitLabel("0.021 AU (d)", 14, center, 2.0);
  systemCtx.addOrbitLabel("0.028 AU (e)", 17, center, 3.0);
  systemCtx.addOrbitLabel("0.037 AU (f)", 20, center, 4.0);
  systemCtx.addOrbitLabel("0.045 AU (g)", 23, center, 5.0);
  systemCtx.addOrbitLabel("0.060 AU (h)", 26, center, 6.0);

  return {
    id: 'trappist',
    center,
    focusOffset: { x: 0, y: 20, z: 40 }
  };
}

