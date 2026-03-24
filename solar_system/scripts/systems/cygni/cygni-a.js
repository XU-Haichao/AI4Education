export default function buildCygniA(ctx) {
  const star = ctx.createBody("天鹅座16 A", "star", 11, ctx.textures.cygniA, 200, 0.002, ctx.center, 0xffffee);
  ctx.registerBody("天鹅座16 A", star);
}

