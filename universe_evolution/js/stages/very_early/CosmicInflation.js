const CosmicInflation = {
    update: (context, t) => {
        const { sphere, uniforms } = context;
        if (!sphere.visible) sphere.visible = true;

        const cBlueWhite = new THREE.Color(0.6, 0.8, 1.0);
        const cWhite = new THREE.Color(1.0, 1.0, 1.0);
        const cInflationEnd = cBlueWhite.clone().lerp(cWhite, 0.5);

        // t range: 0.07 -> 0.15
        const localT = (t - 0.07) / 0.08;
        const startScale = 1.0;
        const endScale = 38.0;
        const scale = startScale + Math.pow(localT, 3) * (endScale - startScale);
        sphere.scale.set(scale, scale, scale);

        uniforms.uColor.value.lerpColors(cBlueWhite, cInflationEnd, localT);

        const startIntensity = 10.0;
        const endIntensity = 2.0;
        uniforms.uIntensity.value = startIntensity - localT * (startIntensity - endIntensity);

        const endNoise = 0.25;
        uniforms.uNoiseStrength.value = localT * endNoise;
        uniforms.uNoiseMultiplier.value = 4.0;
    }
};
