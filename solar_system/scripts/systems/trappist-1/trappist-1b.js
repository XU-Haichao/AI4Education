export default function buildTrappist1b(ctx) {
  const b = ctx.createBody("TRAPPIST-1b", "planet", 1.1, ctx.textures.mercury, 8, 0.12, ctx.center, 0xcc8888);
  ctx.registerBody("TRAPPIST-1b", b);
}

