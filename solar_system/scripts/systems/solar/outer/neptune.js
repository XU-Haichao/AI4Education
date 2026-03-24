export default function buildNeptune(ctx) {
  const neptune = ctx.createBody("海王星", "planet", 3.8, ctx.textures.neptune, 300, 0.003, ctx.center);
  ctx.registerBody("海王星", neptune);
}

