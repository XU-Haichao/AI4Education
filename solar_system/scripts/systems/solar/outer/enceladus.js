export default function buildEnceladus(ctx) {
  const saturn = ctx.getBody("土星");
  if (!saturn) return;
  const enceladus = ctx.createGenericMoon("土卫二 (Enceladus)", saturn, 15, 0.4, 0.1, ctx.textures.enceladus);
  ctx.registerBody("土卫二 (Enceladus)", enceladus);
}

