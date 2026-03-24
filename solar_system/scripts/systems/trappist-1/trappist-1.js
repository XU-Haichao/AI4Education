export default function buildTrappistStar(ctx) {
  const star = ctx.createBody("TRAPPIST-1", "star", 5, ctx.textures.trappist, 0, 0, ctx.center, 0xff3300);
  ctx.registerBody("TRAPPIST-1", star);
}

