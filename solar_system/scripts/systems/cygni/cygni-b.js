export default function buildCygniB(ctx) {
  const cygniA = ctx.getBody("天鹅座16 A");
  const star = ctx.createBody("天鹅座16 B", "star", 10, ctx.textures.cygniB, 200, 0.002, ctx.center, 0xffddcc);
  if (cygniA) {
    star.angle = cygniA.angle + Math.PI;
  }
  ctx.registerBody("天鹅座16 B", star);
}

