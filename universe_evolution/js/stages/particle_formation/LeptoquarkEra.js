const LeptoquarkEra = {
    update: (context, t) => {
        const { sphere, uniforms } = context;
        if (!sphere.visible) sphere.visible = true;

        const cBlueWhite = new THREE.Color(0.6, 0.8, 1.0);
        const cWhite = new THREE.Color(1.0, 1.0, 1.0);
        const cInflationEnd = cBlueWhite.clone().lerp(cWhite, 0.5);
        const cOrange = new THREE.Color(1.0, 0.5, 0.0);

        // t range: 0.15 -> 0.30
        sphere.scale.set(38.0, 38.0, 38.0);
        uniforms.uNoiseStrength.value = 0.25;

        const localT = (t - 0.15) / 0.15;
        uniforms.uColor.value.lerpColors(cInflationEnd, cOrange, localT);
        uniforms.uIntensity.value = 2.0 - localT * 1.5;
        uniforms.uNoiseMultiplier.value = 4.0 - localT * 2.0;
    }
};
