export default function buildPluto(ctx) {
  const pluto = ctx.createBody("冥王星", "planet", 1.4, ctx.textures.pluto, 330, 0.0025, ctx.center);
  pluto.mesh.material.emissive = new ctx.THREE.Color(0xffffff);
  pluto.mesh.material.emissiveIntensity = 0.2;
  ctx.registerBody("冥王星", pluto);
}

