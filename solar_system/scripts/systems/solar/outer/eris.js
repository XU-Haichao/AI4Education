export default function buildEris(ctx) {
  const eris = ctx.createBody("阋神星", "planet", 1.3, ctx.textures.ice, 380, 0.002, ctx.center);
  eris.mesh.material.emissive = new ctx.THREE.Color(0xffffff);
  eris.mesh.material.emissiveIntensity = 0.2;
  ctx.registerBody("阋神星", eris);
}

