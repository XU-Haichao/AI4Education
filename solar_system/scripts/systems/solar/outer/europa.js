export default function buildEuropa(ctx) {
  const jupiter = ctx.getBody("木星");
  if (!jupiter) return;
  const europa = ctx.createGenericMoon("木卫二 (Europa)", jupiter, 14, 0.7, 0.1, ctx.textures.europa);
  ctx.registerBody("木卫二 (Europa)", europa);
}

