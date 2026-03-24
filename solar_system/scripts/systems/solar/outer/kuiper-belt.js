export default function buildKuiperBelt(ctx) {
  const kuiperInner = 320;
  const kuiperOuter = 400;
  ctx.createSolidBelt(kuiperInner, kuiperOuter, ctx.center, 15000, 0xeeeeff, 40, "柯伊伯带 (Kuiper Belt)", 0.0012, 0.25);
  ctx.solarConfig.kuiperInner = kuiperInner;
  ctx.solarConfig.kuiperOuter = kuiperOuter;
}

