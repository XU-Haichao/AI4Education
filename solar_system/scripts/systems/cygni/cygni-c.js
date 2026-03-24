export default function buildCygniC(ctx) {
  const cygniA = ctx.getBody("天鹅座16 A");
  if (!cygniA) return;

  // 16 Cygni C：小质量红矮星（在本项目中做艺术化、近距离伴星演示）
  const star = ctx.createBody(
    "天鹅座16 C",
    "star",
    5,
    ctx.textures.cygniC,
    60,
    0.01,
    cygniA.mesh.position,
    0xff7755
  );
  ctx.registerBody("天鹅座16 C", star);
}
