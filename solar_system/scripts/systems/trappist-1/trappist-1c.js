export default function buildTrappist1c(ctx) {
  const c = ctx.createBody("TRAPPIST-1c", "planet", 1.2, ctx.textures.venus, 11, 0.1, ctx.center, 0xddeedd);
  ctx.registerBody("TRAPPIST-1c", c);
}

