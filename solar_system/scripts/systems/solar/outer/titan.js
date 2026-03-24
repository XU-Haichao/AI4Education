export default function buildTitan(ctx) {
  const saturn = ctx.getBody("土星");
  if (!saturn) return;
  const titan = ctx.createGenericMoon("土卫六 (Titan)", saturn, 24, 1.1, 0.06, ctx.textures.titan);
  ctx.registerBody("土卫六 (Titan)", titan);
}

