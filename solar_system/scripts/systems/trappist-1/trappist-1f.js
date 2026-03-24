export default function buildTrappist1f(ctx) {
  const f = ctx.createBody("TRAPPIST-1f", "planet", 1.2, ctx.textures.terrestrial, 20, 0.05, ctx.center, 0x66ccff);
  ctx.registerBody("TRAPPIST-1f", f);
}

