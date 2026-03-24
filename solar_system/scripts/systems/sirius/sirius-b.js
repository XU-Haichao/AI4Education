export default function buildSiriusB(ctx) {
  const siriusA = ctx.getBody("天狼星 A");
  const siriusB = ctx.createBody("天狼星 B", "star", 2.5, ctx.textures.siriusB, 28, 0.02, ctx.center, 0xffffff);
  if (siriusA) {
    siriusB.angle = siriusA.angle + Math.PI;
  }
  ctx.registerBody("天狼星 B", siriusB);
}

