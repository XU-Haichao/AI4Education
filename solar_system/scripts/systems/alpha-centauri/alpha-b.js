export default function buildAlphaB(ctx) {
  const alphaA = ctx.getBody("半人马座 α A");
  const alphaB = ctx.createBody("半人马座 α B", "star", 10, ctx.textures.alphaB, 25, 0.01, ctx.center, 0xffaa66);
  if (alphaA) {
    alphaB.angle = alphaA.angle + Math.PI;
  }
  ctx.registerBody("半人马座 α B", alphaB);
}

