export default function buildSun(ctx) {
  const sun = ctx.createBody("太阳", "star", 12, ctx.textures.sun, 0, 0, ctx.center, 0xffaa00);
  ctx.registerBody("太阳", sun);
}

