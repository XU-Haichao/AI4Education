export default function buildSaturn(ctx) {
  const saturn = ctx.createBody("土星", "planet", 6, ctx.textures.saturn, 195, 0.006, ctx.center, 0xffffff, true);
  ctx.registerBody("土星", saturn);
}

