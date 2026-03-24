export default function buildCygniBb(ctx) {
  const cygniB = ctx.getBody("天鹅座16 B");
  if (!cygniB) return;
  const planet = ctx.createEccentricPlanet("天鹅座16 Bb", 75, 0.68, 0.04, cygniB.mesh.position, ctx.textures.cygniBb, 4, 0xddbb99, "1.68 AU");
  ctx.registerBody("天鹅座16 Bb", planet);
}

