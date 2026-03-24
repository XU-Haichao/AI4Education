export default function buildUranus(ctx) {
  const uranus = ctx.createBody("天王星", "planet", 4, ctx.textures.uranus, 250, 0.004, ctx.center);
  ctx.registerBody("天王星", uranus);
}

