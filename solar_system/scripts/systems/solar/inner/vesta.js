export default function buildVesta(ctx) {
  const vesta = ctx.createBody("灶神星", "planet", 0.7, ctx.textures.asteroid, 76, 0.015, ctx.center);
  ctx.registerBody("灶神星", vesta);
}

