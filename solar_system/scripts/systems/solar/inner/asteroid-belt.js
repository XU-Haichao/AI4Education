export default function buildAsteroidBelt(ctx) {
  const asteroidInner = 70;
  const asteroidOuter = 90;
  ctx.createSolidBelt(asteroidInner, asteroidOuter, ctx.center, 5000, 0xcccccc, 8, "小行星带 (Asteroid Belt)", 0.007);
  ctx.solarConfig.asteroidInner = asteroidInner;
  ctx.solarConfig.asteroidOuter = asteroidOuter;
}

