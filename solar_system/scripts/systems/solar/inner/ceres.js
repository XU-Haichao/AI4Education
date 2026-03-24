export default function buildCeres(ctx) {
  const ceres = ctx.createBody("谷神星", "planet", 0.9, ctx.textures.asteroid, 80, 0.014, ctx.center);
  ctx.registerBody("谷神星", ceres);
}

