export default function buildHalley(ctx) {
  const comet = ctx.createComet("哈雷彗星", 22, 850, 0.005, ctx.center, '#aaddff');
  ctx.registerBody("哈雷彗星", comet);
}

