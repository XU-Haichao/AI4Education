export default function buildTrappist1g(ctx) {
  const g = ctx.createBody("TRAPPIST-1g", "planet", 1.3, ctx.textures.ice, 23, 0.04, ctx.center, 0xaaddff);
  ctx.registerBody("TRAPPIST-1g", g);
}

