export default function buildProximaStar(ctx) {
  const proxima = ctx.createBody("比邻星 (Proxima)", "star", 4, ctx.textures.proxima, 0, 0, ctx.center, 0xff3300);
  ctx.registerBody("比邻星 (Proxima)", proxima);
}

