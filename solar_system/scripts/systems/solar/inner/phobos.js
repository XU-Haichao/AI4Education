export default function buildPhobos(ctx) {
  const mars = ctx.getBody("火星");
  if (!mars) return;
  const phobos = ctx.createGenericMoon("火卫一 (Phobos)", mars, 3.5, 0.3, 0.2, ctx.textures.phobos, true);
  ctx.registerBody("火卫一 (Phobos)", phobos);
}

