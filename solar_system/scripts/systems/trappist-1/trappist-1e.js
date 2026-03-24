export default function buildTrappist1e(ctx) {
  const e = ctx.createBody("TRAPPIST-1e", "planet", 1.1, ctx.textures.terrestrial, 17, 0.06, ctx.center, 0x44aaff);
  ctx.registerBody("TRAPPIST-1e", e);
}

