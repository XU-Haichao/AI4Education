export default function buildGanymede(ctx) {
  const jupiter = ctx.getBody("木星");
  if (!jupiter) return;
  const ganymede = ctx.createGenericMoon("木卫三 (Ganymede)", jupiter, 18, 1.2, 0.07, ctx.textures.ganymede);
  ctx.registerBody("木卫三 (Ganymede)", ganymede);
}

