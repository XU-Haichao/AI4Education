export default function buildTrappist1h(ctx) {
  const h = ctx.createBody("TRAPPIST-1h", "planet", 0.8, ctx.textures.ice, 26, 0.03, ctx.center);
  ctx.registerBody("TRAPPIST-1h", h);
}

