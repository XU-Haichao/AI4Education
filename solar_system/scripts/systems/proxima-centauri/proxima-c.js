export default function buildProximaC(ctx) {
  const c = ctx.createBody("比邻星 c", "planet", 1.5, ctx.textures.ice, 25, 0.02, ctx.center, 0xaaddff);
  ctx.registerBody("比邻星 c", c);
}

