export default function buildProximaD(ctx) {
  const d = ctx.createBody("比邻星 d", "planet", 0.8, ctx.textures.mars, 6, 0.12, ctx.center, 0xcc8888);
  ctx.registerBody("比邻星 d", d);
}

