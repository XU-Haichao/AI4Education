export default function buildTrappist1d(ctx) {
  const d = ctx.createBody("TRAPPIST-1d", "planet", 0.9, ctx.textures.terrestrial, 14, 0.08, ctx.center, 0x88ccff);
  ctx.registerBody("TRAPPIST-1d", d);
}

