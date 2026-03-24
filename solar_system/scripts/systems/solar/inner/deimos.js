export default function buildDeimos(ctx) {
  const mars = ctx.getBody("火星");
  if (!mars) return;
  const deimos = ctx.createGenericMoon("火卫二 (Deimos)", mars, 5.0, 0.2, 0.15, ctx.textures.deimos, true);
  ctx.registerBody("火卫二 (Deimos)", deimos);
}

