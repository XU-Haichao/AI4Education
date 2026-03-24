export default function buildHaleBopp(ctx) {
  const comet = ctx.createComet("海尔-波普彗星", 40, 950, 0.003, ctx.center, '#ffffff');
  ctx.registerBody("海尔-波普彗星", comet);
}

