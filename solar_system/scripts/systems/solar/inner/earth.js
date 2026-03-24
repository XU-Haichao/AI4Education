export default function buildEarth(ctx) {
  const earth = ctx.createBody("地球", "planet", 2.3, ctx.textures.earth, 45, 0.02, ctx.center);
  ctx.registerBody("地球", earth);
}

