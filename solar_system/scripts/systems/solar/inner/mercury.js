export default function buildMercury(ctx) {
  const mercury = ctx.createBody("水星", "planet", 1.5, ctx.textures.mercury, 20, 0.04, ctx.center);
  ctx.registerBody("水星", mercury);
}

