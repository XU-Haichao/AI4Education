export default function buildMoon(ctx) {
  const earth = ctx.getBody("地球");
  if (!earth) return;
  const moon = ctx.createGenericMoon("月球", earth, 6, 0.6, 0.1, ctx.textures.moon);
  ctx.registerBody("月球", moon);
}

