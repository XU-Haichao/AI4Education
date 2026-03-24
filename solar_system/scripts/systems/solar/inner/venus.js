export default function buildVenus(ctx) {
  const venus = ctx.createBody("金星", "planet", 2.2, ctx.textures.venus, 30, 0.03, ctx.center);
  ctx.registerBody("金星", venus);
}

