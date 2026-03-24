const EnergyDominated = {
    update: (context, t) => {
        const { sphere, uniforms } = context;
        if (!sphere.visible) sphere.visible = true;

        const cBlueWhite = new THREE.Color(0.6, 0.8, 1.0);

        // t range: 0 -> 0.07
        const localT = t / 0.07;
        const scale = 0.1 + localT * 0.9;
        sphere.scale.set(scale, scale, scale);

        uniforms.uColor.value.copy(cBlueWhite);
        uniforms.uIntensity.value = 10.0;
        uniforms.uNoiseStrength.value = 0.0;
        uniforms.uNoiseMultiplier.value = 4.0;
    }
};
