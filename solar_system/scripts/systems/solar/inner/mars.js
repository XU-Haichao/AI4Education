export default function buildMars(ctx) {
  const mars = ctx.createBody("火星", "planet", 1.8, ctx.textures.mars, 60, 0.016, ctx.center);
  ctx.registerBody("火星", mars);
}

