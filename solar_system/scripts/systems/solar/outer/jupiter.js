export default function buildJupiter(ctx) {
  const jupiter = ctx.createBody("木星", "planet", 7, ctx.textures.jupiter, 135, 0.008, ctx.center);
  ctx.registerBody("木星", jupiter);
}

