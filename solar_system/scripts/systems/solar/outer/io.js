export default function buildIo(ctx) {
  const jupiter = ctx.getBody("木星");
  if (!jupiter) return;
  const io = ctx.createGenericMoon("木卫一 (Io)", jupiter, 11, 0.8, 0.12, ctx.textures.io);
  ctx.registerBody("木卫一 (Io)", io);
}

