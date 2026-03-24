export default function buildProximaB(ctx) {
  const b = ctx.createBody("比邻星 b", "planet", 1.1, ctx.textures.terrestrial, 9, 0.09, ctx.center, 0x88ff88);
  ctx.registerBody("比邻星 b", b);
}

