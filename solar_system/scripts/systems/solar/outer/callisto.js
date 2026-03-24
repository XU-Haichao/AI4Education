export default function buildCallisto(ctx) {
  const jupiter = ctx.getBody("木星");
  if (!jupiter) return;
  const callisto = ctx.createGenericMoon("木卫四 (Callisto)", jupiter, 23, 1.1, 0.05, ctx.textures.callisto);
  ctx.registerBody("木卫四 (Callisto)", callisto);
}

