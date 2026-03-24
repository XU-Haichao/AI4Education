export default function buildSiriusA(ctx) {
  const siriusA = ctx.createBody("天狼星 A", "star", 6, ctx.textures.siriusA, 12, 0.02, ctx.center, 0xaaddff);
  ctx.registerBody("天狼星 A", siriusA);
}

