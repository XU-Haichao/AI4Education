const Nucleosynthesis = {
    update: (context, t) => {
        const { sphere, uniforms } = context;
        if (!sphere.visible) sphere.visible = true;

        const cOrange = new THREE.Color(1.0, 0.5, 0.0);
        const cRed = new THREE.Color(0.5, 0.0, 0.0);

        // t range: 0.30 -> 0.50
        sphere.scale.set(38.0, 38.0, 38.0);
        uniforms.uNoiseStrength.value = 0.25;

        const localT = (t - 0.30) / 0.20;
        uniforms.uColor.value.lerpColors(cOrange, cRed, localT);
        uniforms.uIntensity.value = 0.5 * (1.0 - localT);
        uniforms.uNoiseMultiplier.value = 2.0 * (1.0 - localT);
    }
};
