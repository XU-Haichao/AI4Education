const DarkAges = {
    system: null,
    uniforms: null,
    initialized: false,

    init: (context) => {
        // 1. Generate Filament Graph
        const nodes = [];
        const nodeCount = 300; // Increased complexity (200 -> 300)
        const range = 1100; // Slightly larger range

        const zOffset = -400.0;

        for (let i = 0; i < nodeCount; i++) {
            nodes.push(new THREE.Vector3(
                (Math.random() - 0.5) * range * 1.5,
                (Math.random() - 0.5) * range,
                (Math.random() - 0.5) * range + zOffset
            ));
        }

        const lines = []; // Now curves
        nodes.forEach((node, i) => {
            const dists = nodes.map((n, idx) => ({ idx, d: node.distanceTo(n) })).filter(x => x.idx !== i);
            dists.sort((a, b) => a.d - b.d);

            const numConnections = 2 + Math.floor(Math.random() * 3);

            for (let k = 0; k < Math.min(numConnections, dists.length); k++) {
                const target = nodes[dists[k].idx];

                // Generate Control Point for Curve
                // Midpoint + random offset perpendicular-ish
                const mid = new THREE.Vector3().addVectors(node, target).multiplyScalar(0.5);
                const dist = node.distanceTo(target);
                // Offset proportional to distance, e.g., 20% to 50% of length
                const offsetMag = dist * (0.2 + Math.random() * 0.3);
                const offset = new THREE.Vector3(
                    (Math.random() - 0.5),
                    (Math.random() - 0.5),
                    (Math.random() - 0.5)
                ).normalize().multiplyScalar(offsetMag);

                const control = mid.add(offset);

                lines.push({ start: node, end: target, control: control });
            }
        });

        // 2. Create Particles
        const particleCount = 30000; // Bubbled count for maximum density
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const targetPos = new Float32Array(particleCount * 3);
        const randomOffsets = new Float32Array(particleCount);

        // Helper for Quadratic Bezier
        const getBezierPoint = (t, p0, p1, p2, out) => {
            const it = 1 - t;
            // (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
            out.x = it * it * p0.x + 2 * it * t * p1.x + t * t * p2.x;
            out.y = it * it * p0.y + 2 * it * t * p1.y + t * t * p2.y;
            out.z = it * it * p0.z + 2 * it * t * p1.z + t * t * p2.z;
        };
        const tempVec = new THREE.Vector3();

        for (let i = 0; i < particleCount; i++) {
            // Start Position
            const r = 700 + Math.random() * 600;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = (r * Math.cos(phi)) + zOffset;

            // Target Position via Bezier Curve
            if (lines.length > 0) {
                const line = lines[Math.floor(Math.random() * lines.length)];
                const alpha = Math.random();

                getBezierPoint(alpha, line.start, line.control, line.end, tempVec);

                const scatter = 3.0;
                const sx = (Math.random() - 0.5);
                const sy = (Math.random() - 0.5);
                const sz = (Math.random() - 0.5);

                targetPos[i * 3] = tempVec.x + sx * scatter * 2.0;
                targetPos[i * 3 + 1] = tempVec.y + sy * scatter * 2.0;
                targetPos[i * 3 + 2] = tempVec.z + sz * scatter * 2.0;
            }

            randomOffsets[i] = Math.random() * 100.0;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('aTargetPos', new THREE.BufferAttribute(targetPos, 3));
        geometry.setAttribute('aRandomOffset', new THREE.BufferAttribute(randomOffsets, 1));

        DarkAges.uniforms = {
            uProgress: { value: 0.0 },
            uSize: { value: 25.0 }, // Increased size: 16.0 -> 25.0
            uColor: { value: new THREE.Color(0.25, 0.6, 0.25) },
            uOpacity: { value: 0.0 }
        };

        const material = new THREE.ShaderMaterial({
            uniforms: DarkAges.uniforms,
            vertexShader: SHADERS.cosmicWeb.vertex,
            fragmentShader: SHADERS.cosmicWeb.fragment,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        DarkAges.system = new THREE.Points(geometry, material);
        context.scene.add(DarkAges.system);
        DarkAges.initialized = true;
    },

    update: (context, t) => {
        const { sphere, uniforms, camera } = context;

        // Lazy Init at start of window
        if (t >= 0.52 && !DarkAges.initialized) {
            DarkAges.init(context);
        }

        // Logic for Cosmic Web (0.52 - 0.58+)
        if (DarkAges.initialized) {
            if (t >= 0.52 && t <= 0.60) {
                DarkAges.system.visible = true;

                // Opacity Fade In (0.52 - 0.53)
                if (t < 0.53) {
                    DarkAges.uniforms.uOpacity.value = (t - 0.52) / 0.01;
                } else if (t > 0.58) {
                    // Fade out (0.58 - 0.60)
                    DarkAges.uniforms.uOpacity.value = 1.0 - (t - 0.58) / 0.02;
                } else {
                    DarkAges.uniforms.uOpacity.value = 1.0;
                }

                // Formation Progress (0.52 - 0.58)
                const formDur = 0.06;
                const formProgress = Math.min((t - 0.52) / formDur, 1.0);
                DarkAges.uniforms.uProgress.value = formProgress;

            } else {
                DarkAges.system.visible = false;
            }
        }

        // --- Original Sphere Logic ---
        // Sphere fades out completely
        sphere.visible = (t <= 0.501);
        const cBlack = new THREE.Color(0.0, 0.0, 0.0);
        if (sphere.visible) {
            sphere.scale.set(38.0, 38.0, 38.0);
            uniforms.uColor.value.copy(cBlack);
            uniforms.uIntensity.value = 0.0;
            uniforms.uNoiseStrength.value = 0.0;
            uniforms.uNoiseMultiplier.value = 0.0;
        }

        // Camera Logic
        // 1. Zoom OUT (0.50 -> 0.52): 50 -> 800 (To see the vast web)
        // 2. Hold (0.52 -> 0.58): 800
        // 3. Zoom IN (0.58 -> 0.60): 800 -> 50 (Into the star formation site)

        let targetZ = 50.0;

        if (t < 0.52) {
            const progress = (t - 0.50) / 0.02;
            const eased = progress * progress * (3 - 2 * progress); // smoothstep
            targetZ = 50.0 + eased * 750.0; // 50 -> 800
        } else if (t < 0.58) {
            targetZ = 800.0;
        } else {
            const progress = (t - 0.58) / 0.02;
            const eased = progress * progress * (3 - 2 * progress);
            targetZ = 800.0 - eased * 750.0; // 800 -> 50
        }

        camera.position.z = targetZ;
    }
};

const StarFormation = {
    _lastT: null,
    update: (context, t, delta) => {
        // Ensure Dark Ages cosmic web particles are hidden in this phase
        if (DarkAges.initialized && DarkAges.system) {
            DarkAges.system.visible = false;
        }

        const {
            camera, fogSphere, protostarSphere, accretionParticles, infallParticles, starSystem,
            fogUniforms, accUniforms, infallUniforms, coreUniforms, starUniforms,
            smbhSphere, smbhGlowSphere,
            nucleusSphere, nucleusUniforms,
            agnSystem, agnUniforms,
            jetSystem, jetUniforms
        } = context;

        // Camera Logic Extension
        // t > 0.60
        const zoomT = Math.min((t - 0.60) / 0.06, 1.0);
        // Adjusted start from 50.0 to avoid jump, zooming out to 1500
        const baseCamZ = 50.0 + zoomT * 1450.0;
        camera.position.z = baseCamZ;

        // Stars zoom-out feel after ignition (t >= 0.68): reduce apparent size and spacing
        if (t >= 0.68) {
            const localT = Math.min((t - 0.68) / 0.02, 1.0);
            const eased = smoothstep(0.0, 1.0, localT);

            // Standard Zoom Out Target
            let targetZ = 1500.0 + eased * 4500.0; // Ends at 6000.0
            let targetScale = 1.0 - eased * 0.8; // Ends at 0.2

            // NEW: Zoom IN to Galaxy Nucleus (t=0.75 - 0.77)
            if (t >= 0.75) {
                const zoomInT = Math.min((t - 0.75) / 0.02, 1.0);
                const zoomEase = smoothstep(0.0, 1.0, zoomInT);

                // Interpolate from 6000.0 down to 25.0 (Nucleus close-up)
                targetZ = THREE.MathUtils.lerp(6000.0, 25.0, zoomEase);

                // Optional: Restore star size scale
                targetScale = THREE.MathUtils.lerp(0.2, 1.0, zoomEase);
            }

            // Maintain close up for SMBH (t >= 0.77), then Zoom Out (t >= 0.83)
            if (t >= 0.77) {
                targetZ = 25.0;
                targetScale = 1.0;

                // Create a dramatic zoom out to see the full jet scale
                if (t >= 0.83) {
                    const zoomOutProgress = Math.min((t - 0.83) / 0.03, 1.0);
                    const zoomOutEase = smoothstep(0.0, 1.0, zoomOutProgress);

                    // Zoom out to 800.0
                    targetZ = THREE.MathUtils.lerp(25.0, 800.0, zoomOutEase);
                }
            }

            camera.position.z = targetZ;
            if (starUniforms.uSizeScale) starUniforms.uSizeScale.value = targetScale;
        } else {
            if (starUniforms.uSizeScale) starUniforms.uSizeScale.value = 1.0;
        }

        // Visibility
        fogSphere.visible = t >= 0.60 && t <= 0.67;
        protostarSphere.visible = t >= 0.60 && t <= 0.67;
        accretionParticles.visible = t >= 0.60 && t <= 0.67;
        infallParticles.visible = t >= 0.60 && t <= 0.67;

        // Stars visible 0.60 -> 0.77, then replaced by BH inside
        starSystem.visible = t > 0.60 && t < 0.77;

        // SMBH visible from 0.77 onwards
        if (smbhSphere) smbhSphere.visible = t >= 0.77;
        if (smbhGlowSphere) smbhGlowSphere.visible = t >= 0.77;

        // Nucleus Glow (0.75 - 0.77)
        if (nucleusSphere && nucleusUniforms) {
            if (t >= 0.75 && t < 0.77) {
                nucleusSphere.visible = true;
                const localT = (t - 0.75) / 0.02;
                nucleusUniforms.uOpacity.value = localT;
            } else {
                nucleusSphere.visible = false;
                nucleusUniforms.uOpacity.value = 0.0;
            }
        }

        // AGN Accretion Disk (0.77 - 0.84)
        if (agnSystem && agnUniforms) {
            if (t >= 0.77) {
                agnSystem.visible = true;

                // Orbital Motion
                agnUniforms.uTime.value += delta;

                // Infill Animation (0.77 - 0.80)
                if (t <= 0.80) {
                    const fillProgress = (t - 0.77) / 0.03;
                    // Inner radius moves from Outer(18) -> ISCO (2.66)
                    const isco = 2.66;
                    const currentInner = THREE.MathUtils.lerp(18.0, isco, fillProgress);
                    agnUniforms.uInnerRad.value = currentInner;
                } else {
                    agnUniforms.uInnerRad.value = 2.66;
                }
            } else {
                agnSystem.visible = false;
                agnUniforms.uInnerRad.value = 18.0;
            }
        }

        // Dust Torus (t >= 0.77)
        // Keep independent from the jet logic so it can appear in 0.77-0.81 as well.
        if (context.torusSystem && context.torusUniforms) {
            if (t >= 0.77) {
                context.torusSystem.visible = true;
                context.torusUniforms.uTime.value += delta;
                const zoomVis = THREE.MathUtils.clamp((camera.position.z - 250.0) / (800.0 - 250.0), 0.0, 1.0);
                const fadeIn = smoothstep(0.77, 0.80, t);
                context.torusUniforms.uOpacity.value = (0.15 + 0.7 * zoomVis) * fadeIn;
                context.torusUniforms.uPointScale.value = THREE.MathUtils.lerp(1.0, 2.5, zoomVis);
            } else {
                context.torusSystem.visible = false;
                context.torusUniforms.uOpacity.value = 0.0;
            }
        }

        // Relativistic Jet (0.81 - 0.84)
        if (jetSystem && jetUniforms) {
            const lastT = StarFormation._lastT;
            if (lastT !== null && (t < lastT || (lastT < 0.81 && t >= 0.81))) {
                jetUniforms.uTime.value = 0.0;
            }
            if (t >= 0.81) {
                jetSystem.visible = true;
                const bhRadius = jetUniforms.uBHRadius ? jetUniforms.uBHRadius.value : 1.33;
                jetUniforms.uBaseRadius.value = bhRadius * 2.0;
                const zoomT = THREE.MathUtils.clamp((camera.position.z - 25.0) / (800.0 - 25.0), 0.0, 1.0);
                const densityScale = THREE.MathUtils.lerp(1.0, 0.35, zoomT);
                const invFactor = 0.04172; // 1 / (1 + invFactor*(800-25)) ~= 0.03
                const distDelta = Math.max(0.0, camera.position.z - 25.0);
                jetUniforms.uBrightnessScale.value = 1.0 / (1.0 + invFactor * distDelta);
                const nearHeight = Math.max(bhRadius * 6.0, camera.position.z * 0.35);
                jetUniforms.uNearPointHeight.value = nearHeight;
                jetUniforms.uTime.value += delta;

                if (t <= 0.84) {
                    const jetProgress = (t - 0.81) / 0.03;
                    // Length grows 0 -> 500
                    jetUniforms.uMaxDistance.value = THREE.MathUtils.lerp(0.0, 500.0, jetProgress);
                    // Density ramps 0.0 -> 1.0 during 0.81-0.83
                    const densityProgress = Math.min(Math.max((t - 0.81) / 0.02, 0.0), 1.0);
                    const densityEase = smoothstep(0.0, 1.0, densityProgress);
                    jetUniforms.uDensity.value = densityEase * densityScale;
                    // Speed ramps 20 -> 150
                    jetUniforms.uSpeedScale.value = THREE.MathUtils.lerp(20.0, 150.0, jetProgress);
                } else {
                    jetUniforms.uMaxDistance.value = 500.0;
                    jetUniforms.uDensity.value = densityScale;
                    jetUniforms.uSpeedScale.value = 150.0;
                }
            } else {
                jetSystem.visible = false;
                jetUniforms.uMaxDistance.value = 0.0;
                jetUniforms.uDensity.value = 0.0;
                jetUniforms.uBrightnessScale.value = 1.0;
            }
        }
        StarFormation._lastT = t;

        // Animation Logic
        if (t >= 0.60 && t <= 0.66) {
            const fogLocalT = (t - 0.60) / 0.06;
            // Move collapse assignment into split logic to avoid overwrite race

            // Brightness Mask Logic (0.60-0.64) - Scaled 2x
            let brightnessMask = 0.0;
            if (t < 0.62) {
                brightnessMask = 0.0;
            } else if (t < 0.64) {
                brightnessMask = (t - 0.62) / 0.02;
            } else {
                brightnessMask = 1.0;
            }

            // Reduced brightness significantly (0.1 -> 0.05, 0.9 -> 0.25)
            // fogUniforms intensity handled inside split logic now

            accUniforms.uOpacity.value = brightnessMask;
            infallUniforms.uOpacity.value = brightnessMask;

            coreUniforms.uIntensity.value = smoothstep(0.0, 1.0, fogLocalT) * 2.0;

            const splitTime = 0.645;

            if (t < splitTime) {
                // Phase 1: Collapse
                const collapseProgress = (t - 0.60) / 0.06; // Keep original pacing base

                fogUniforms.uCollapse.value = collapseProgress;
                accUniforms.uCollapse.value = collapseProgress;
                infallUniforms.uCollapse.value = collapseProgress;
                fogSphere.scale.setScalar(1.0);

                // Fog Intensity (Standard)
                fogUniforms.uIntensity.value = (0.05 + collapseProgress * 0.25) * brightnessMask;

                // Standard Accretion Collapse
                const rFactor = 1.0 - Math.pow(collapseProgress, 1.5);
                accUniforms.uMinRadius.value = 0.0;
                accUniforms.uMaxRadius.value = 600.0 * rFactor;

                // Fog Rotation (Accelerating)
                const currentSpeed = 0.2 + Math.pow(collapseProgress, 3.0) * 0.5;
                fogSphere.rotation.y -= delta * currentSpeed * 0.5;

                // Infall rotation match
                infallParticles.rotation.y -= delta * currentSpeed * 1.5;

            } else {
                // Phase 2: Expansion / Photoevaporation (0.645 - 0.66)
                const expandLocalT = (t - splitTime) / (0.66 - splitTime); // 0 -> 1

                // Keep fog/infall collapse frozen at split state (approx 0.75)
                const frozenCollapse = (splitTime - 0.60) / 0.06;
                fogUniforms.uCollapse.value = frozenCollapse;
                accUniforms.uCollapse.value = frozenCollapse;
                infallUniforms.uCollapse.value = frozenCollapse; // FREEZE IN FALL PARTICLES TOO

                // Radius Expansion
                // Calculate radius at split time
                const rFactorSplit = 1.0 - Math.pow(frozenCollapse, 1.5);
                const currentOuterRadius = 600.0 * rFactorSplit;
                const targetRadius = 720.0;

                accUniforms.uMinRadius.value = 0.0 + expandLocalT * targetRadius; // 0 -> 720
                accUniforms.uMaxRadius.value = currentOuterRadius + expandLocalT * (targetRadius - currentOuterRadius); // current -> 720

                // Fog radius: keep constant during expansion, matching the end size of Phase 1 (t=0.645-).
                // We freeze uCollapse at the split state, so keeping mesh scale at 1.0 avoids a size jump.
                fogSphere.scale.setScalar(1.0);

                // Fog Brightness: fade to 0 over 0.645 -> 0.66
                const currentFogInt = (0.05 + frozenCollapse * 0.25);
                const fadeOut = Math.max(0.0, 1.0 - expandLocalT);
                fogUniforms.uIntensity.value = currentFogInt * fadeOut * brightnessMask;

                // Fog Rotation Frozen
                const frozenSpeed = 0.2 + Math.pow(frozenCollapse, 3.0) * 0.5;
                fogSphere.rotation.y -= delta * frozenSpeed * 0.5;
                infallParticles.rotation.y -= delta * frozenSpeed * 1.5;
            }

        } else if (t > 0.66) {
            const fadeT = (t - 0.66) / 0.01;
            // Already faded out by 0.66 in Phase 2
            fogUniforms.uIntensity.value = 0.0;
            fogUniforms.uCollapse.value = 1.0;
            accUniforms.uCollapse.value = 1.0;
            fogSphere.scale.setScalar(1.0);
            // Ensure opacity is 1.0 if not fading
            accUniforms.uOpacity.value = 1.0;
            infallUniforms.uOpacity.value = 1.0;
            coreUniforms.uIntensity.value = Math.max(0, 2.0 - fadeT * 2.0);
        } else {
            // Reset
            fogUniforms.uCollapse.value = 0.0;
            accUniforms.uCollapse.value = 0.0;
            fogUniforms.uIntensity.value = 0.0;
            fogSphere.scale.setScalar(1.0);
            coreUniforms.uIntensity.value = 0.0;
        }

        if (t > 0.60) starUniforms.uProgress.value = t;
        else starUniforms.uProgress.value = 0.0;

        // Galaxy Merger Logic (0.70 - 0.75)
        if (t >= 0.70) {
            const mergerT = Math.min((t - 0.70) / 0.05, 1.0);
            if (starUniforms.uMergerTime) starUniforms.uMergerTime.value = mergerT;
        } else {
            if (starUniforms.uMergerTime) starUniforms.uMergerTime.value = 0.0;
        }

        // Galaxy formation phase (t >= 0.86)
        GalaxySpiral.update(context, t, delta);

        // Solar system reveal / finale (t >= 0.95)
        SolarSystemStage.update(context, t, delta);
    }
};

const GalaxySpiral = {
    systemGas: null,
    systemStars: null,
    systemBulge: null,
    uniformsGas: null,
    uniformsStars: null,
    uniformsBulge: null,
    initialized: false,

    init: (context) => {
        const { scene } = context;

        // 1. Gas Cloud / Disk - reduced particle count for performance
        const gasCount = 5000;
        const gasGeo = new THREE.BufferGeometry();
        const gasPosKey = new Float32Array(gasCount * 3); // Random Sphere Vec
        const gasDiskPos = new Float32Array(gasCount * 2); // Radius, Angle
        const gasSizes = new Float32Array(gasCount);

        for (let i = 0; i < gasCount; i++) {
            // Random Sphere Vector - center-concentrated
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const rSphere = Math.pow(Math.random(), 0.7); // More particles near center

            gasPosKey[i * 3] = rSphere * Math.sin(phi) * Math.cos(theta);
            gasPosKey[i * 3 + 1] = rSphere * Math.sin(phi) * Math.sin(theta);
            gasPosKey[i * 3 + 2] = rSphere * Math.cos(phi);

            // Disk State Target - exponential concentration (larger disk)
            const rDisk = 70.0 + Math.pow(Math.random(), 0.7) * 1730.0; // Radius up to 1800
            const thetaDisk = Math.random() * Math.PI * 2;

            gasDiskPos[i * 2] = rDisk;
            gasDiskPos[i * 2 + 1] = thetaDisk;

            gasSizes[i] = 1.5 + Math.random() * 2.5;
        }

        gasGeo.setAttribute('aRandomVec', new THREE.BufferAttribute(gasPosKey, 3));
        gasGeo.setAttribute('aDiskPos', new THREE.BufferAttribute(gasDiskPos, 2));
        gasGeo.setAttribute('aSize', new THREE.BufferAttribute(gasSizes, 1));
        gasGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(gasCount * 3), 3));

        const diskMaxR = 1800.0;
        // Negative to match the AGN accretion disk's on-screen clockwise rotation.
        const keplerScale = -0.3;
        const patternSpeed = keplerScale * 0.25 * (1000.0 / diskMaxR) * 0.8;

        GalaxySpiral.uniformsGas = {
            uTime: { value: 0.0 },
            uCollapse: { value: 0.0 },
            uSpiralStrength: { value: 0.0 },
            uOpacity: { value: 1.0 },
            uHeightScale: { value: 1.0 },
            uPatternSpeed: { value: patternSpeed },
            uKeplerScale: { value: keplerScale },
            uArmSpeedIn: { value: 1.0 },
            uArmSpeedOut: { value: 1.0 }
        };

        const matGas = new THREE.ShaderMaterial({
            uniforms: GalaxySpiral.uniformsGas,
            vertexShader: SHADERS.galaxyGas.vertex,
            fragmentShader: SHADERS.galaxyGas.fragment,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        GalaxySpiral.systemGas = new THREE.Points(gasGeo, matGas);
        GalaxySpiral.systemGas.visible = false;
        GalaxySpiral.systemGas.frustumCulled = false;
        scene.add(GalaxySpiral.systemGas);

        // 2. Stars (Spiral Arms + Halo)
        const starsCount = 15000; // More stars for visual impact
        const starsGeo = new THREE.BufferGeometry();
        const starsPosKey = new Float32Array(starsCount * 3);
        const starsDiskPos = new Float32Array(starsCount * 2);
        const starsSizes = new Float32Array(starsCount);
        const starsIgnition = new Float32Array(starsCount); // For pop-in effect

        for (let i = 0; i < starsCount; i++) {
            // Random Sphere Vector - center-concentrated
            const theta = Math.random() * Math.PI * 2;

            // Artificial "Disk Population": 50% of stars start near the disk plane (phi ~ PI/2)
            let phi;
            if (i < starsCount * 0.5) {
                // Disk-born stars: flattened distribution
                // Random phi close to PI/2 (Equator)
                const flatness = 0.2; // Small variation around equator
                phi = Math.PI / 2 + (Math.random() - 0.5) * flatness;
            } else {
                // Sphere-born stars (Halo candidates): uniform spherical
                phi = Math.acos(2 * Math.random() - 1);
            }

            const rSphere = Math.pow(Math.random(), 0.7);

            starsPosKey[i * 3] = rSphere * Math.sin(phi) * Math.cos(theta);
            starsPosKey[i * 3 + 1] = rSphere * Math.sin(phi) * Math.sin(theta);
            starsPosKey[i * 3 + 2] = rSphere * Math.cos(phi);

            // Disk State Target (larger disk to match gas)
            const rDisk = 50.0 + Math.pow(Math.random(), 0.8) * 1750.0;
            const thetaDisk = Math.random() * Math.PI * 2;

            starsDiskPos[i * 2] = rDisk;
            starsDiskPos[i * 2 + 1] = thetaDisk;

            starsSizes[i] = 2.0 + Math.random() * 4.0;


            // Ignition Threshold Logic:
            // 1. Initial Disk Stars (50%): Visible from start (0.0)
            // 2. Halo/Sphere Stars (50%):
            //    - 80% of these are visible from start (0.0)
            //    - 20% pop in randomly during Phase 2 (random 0.0-1.0)
            if (i < starsCount * 0.5) {
                starsIgnition[i] = 0.0;
            } else {
                // For the sphere population
                if (Math.random() < 0.8) {
                    starsIgnition[i] = 0.0; // Visible Halo start
                } else {
                    starsIgnition[i] = Math.random(); // Random pop-in
                }
            }
        }

        starsGeo.setAttribute('aRandomVec', new THREE.BufferAttribute(starsPosKey, 3));
        starsGeo.setAttribute('aDiskPos', new THREE.BufferAttribute(starsDiskPos, 2));
        starsGeo.setAttribute('aSize', new THREE.BufferAttribute(starsSizes, 1));
        starsGeo.setAttribute('aIgnition', new THREE.BufferAttribute(starsIgnition, 1));
        starsGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(starsCount * 3), 3));

        GalaxySpiral.uniformsStars = {
            uTime: { value: 0.0 },
            uCollapse: { value: 0.0 },
            uSpiralStrength: { value: 0.0 },
            uDiskBrightness: { value: 0.3 },  // Initial dim state
            uHaloOpacity: { value: 1.0 },     // Initial full visibility
            uStarProgress: { value: 0.0 },    // For controlling star count (0.0 -> 1.0)
            uPatternSpeed: { value: patternSpeed },
            uKeplerScale: { value: keplerScale },
            uArmSpeedIn: { value: 1.0 },
            uArmSpeedOut: { value: 1.0 }
        };

        const matStars = new THREE.ShaderMaterial({
            uniforms: GalaxySpiral.uniformsStars,
            vertexShader: SHADERS.galaxyStars.vertex,
            fragmentShader: SHADERS.galaxyStars.fragment,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        GalaxySpiral.systemStars = new THREE.Points(starsGeo, matStars);
        GalaxySpiral.systemStars.visible = false;
        GalaxySpiral.systemStars.frustumCulled = false;
        scene.add(GalaxySpiral.systemStars);

        // 3. Galactic Bulge Sphere (slightly larger)
        const bulgeGeo = new THREE.SphereGeometry(380, 64, 64);
        GalaxySpiral.uniformsBulge = {
            uIntensity: { value: 0.0 },
            uColor: { value: new THREE.Color(1.0, 0.95, 0.8) }
        };
        const bulgeMat = new THREE.ShaderMaterial({
            uniforms: GalaxySpiral.uniformsBulge,
            vertexShader: SHADERS.galaxyBulge.vertex,
            fragmentShader: SHADERS.galaxyBulge.fragment,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        GalaxySpiral.systemBulge = new THREE.Mesh(bulgeGeo, bulgeMat);
        GalaxySpiral.systemBulge.visible = false;
        scene.add(GalaxySpiral.systemBulge);

        // --- Alignment with AGN / Black Hole ---
        const targetNormal = new THREE.Vector3(
            Math.sin(20 * Math.PI / 180) * Math.sin(30 * Math.PI / 180),
            Math.cos(20 * Math.PI / 180),
            Math.sin(20 * Math.PI / 180) * Math.cos(30 * Math.PI / 180)
        ).normalize();

        const initialNormal = new THREE.Vector3(0, 0, 1);
        const q = new THREE.Quaternion().setFromUnitVectors(initialNormal, targetNormal);

        GalaxySpiral.systemGas.quaternion.copy(q);
        GalaxySpiral.systemStars.quaternion.copy(q);
        GalaxySpiral.systemBulge.quaternion.copy(q);

        GalaxySpiral.initialized = true;
    },

    update: (context, t, delta) => {
        // Init if needed (Lazy load at 0.85)
        if (t >= 0.85 && !GalaxySpiral.initialized) {
            GalaxySpiral.init(context);
        }

        if (!GalaxySpiral.initialized) return;

        // Active Range: 0.86+
        if (t >= 0.86) {
            GalaxySpiral.systemGas.visible = true;
            GalaxySpiral.systemStars.visible = true;
            GalaxySpiral.systemBulge.visible = true;

            GalaxySpiral.uniformsGas.uTime.value += delta;
            GalaxySpiral.uniformsStars.uTime.value += delta;

            // Density wave speed modulation (0.93 - 0.95):
            // inside arms -> 1.0 -> 0.9 Kepler, outside -> 1.0 -> 1.1 Kepler
            let armIn = 1.0;
            let armOut = 1.0;
            if (t >= 0.93) {
                const armT = Math.min((t - 0.93) / 0.02, 1.0);
                armIn = 1.0 - 0.1 * armT;
                armOut = 1.0 + 0.1 * armT;
            }
            GalaxySpiral.uniformsGas.uArmSpeedIn.value = armIn;
            GalaxySpiral.uniformsGas.uArmSpeedOut.value = armOut;
            GalaxySpiral.uniformsStars.uArmSpeedIn.value = armIn;
            GalaxySpiral.uniformsStars.uArmSpeedOut.value = armOut;

            // ====== Phase 1: Camera Zoom & AGN Fade (0.86 - 0.89) ======
            if (t >= 0.86 && t < 0.89) {
                // Camera zoom: 800 -> 4000
                const camProgress = (t - 0.86) / 0.03;
                const camEase = smoothstep(0.0, 1.0, camProgress);
                context.camera.position.z = THREE.MathUtils.lerp(800.0, 4000.0, camEase);

                // Bulge fade in
                let transT = (t - 0.86) / 0.02;
                transT = Math.min(transT, 1.0);
                transT = smoothstep(0.0, 1.0, transT);
                GalaxySpiral.uniformsBulge.uIntensity.value = transT * 0.6;

                // Fade out AGN components
                const fadeOut = 1.0 - transT;
                if (context.torusUniforms) context.torusUniforms.uOpacity.value *= fadeOut;
                if (context.jetUniforms) context.jetUniforms.uBrightnessScale.value *= fadeOut;
                if (context.jetUniforms) context.jetUniforms.uDensity.value *= fadeOut;
                if (context.agnUniforms) context.agnUniforms.uOpacity.value = fadeOut;
                if (context.smbhGlowSphere) context.smbhGlowSphere.scale.setScalar(1.0 - transT);

                // Initial state: Partially collapsed (t=0.90 state)
                // uCollapse set to 0.4 as requested
                GalaxySpiral.uniformsGas.uCollapse.value = 0.4;
                GalaxySpiral.uniformsGas.uOpacity.value = 1.0;
                GalaxySpiral.uniformsGas.uHeightScale.value = 0.85; // Thicker at 0.4

                GalaxySpiral.uniformsStars.uCollapse.value = 0.4;
                GalaxySpiral.uniformsStars.uDiskBrightness.value = 2.0; // High value to compensate for 0.4 collapse (Effective 0.8)
                GalaxySpiral.uniformsStars.uHaloOpacity.value = 0.8;

                GalaxySpiral.uniformsGas.uSpiralStrength.value = 0.0;
                GalaxySpiral.uniformsStars.uSpiralStrength.value = 0.0;
            }

            // ====== Phase 2: Gas Disk Collapse (0.89 - 0.91) ======
            if (t >= 0.89 && t < 0.91) {
                // Camera hold at 4000
                context.camera.position.z = 4000.0;

                // Collapse progress: 0.4 -> 1.0
                const collapseT = (t - 0.89) / 0.02;
                const collapseEase = smoothstep(0.0, 1.0, Math.min(collapseT, 1.0));
                const collapse = 0.4 + collapseEase * 0.6; // 0.4 -> 1.0

                GalaxySpiral.uniformsGas.uCollapse.value = collapse;
                GalaxySpiral.uniformsGas.uOpacity.value = 1.0;
                // Height scale continues reducing: 0.85 -> 0.5
                GalaxySpiral.uniformsGas.uHeightScale.value = 0.85 - collapseEase * 0.35;

                GalaxySpiral.uniformsStars.uCollapse.value = collapse;
                // Transition brightness 2.0 -> 0.8 as collapse 0.4 -> 1.0 (Maintain eff brightness ~0.8)
                GalaxySpiral.uniformsStars.uDiskBrightness.value = 2.0 - collapseEase * 1.2;
                GalaxySpiral.uniformsStars.uHaloOpacity.value = 0.8;

                // No spiral yet
                GalaxySpiral.uniformsGas.uSpiralStrength.value = 0.0;
                GalaxySpiral.uniformsStars.uSpiralStrength.value = 0.0;

                // Bulge stays visible
                GalaxySpiral.uniformsBulge.uIntensity.value = 0.6;
            }

            // ====== Phase 3: Star Ignition & Gas Fade (0.91 - 0.93) ======
            if (t >= 0.91 && t < 0.93) {
                context.camera.position.z = 4000.0;

                // Keep collapsed
                GalaxySpiral.uniformsGas.uCollapse.value = 1.0;
                GalaxySpiral.uniformsStars.uCollapse.value = 1.0;
                GalaxySpiral.uniformsGas.uHeightScale.value = 0.5; // Keep some thickness

                // Ignition progress: 0 -> 1
                const igniteT = (t - 0.91) / 0.02;
                const igniteEase = smoothstep(0.0, 1.0, Math.min(igniteT, 1.0));

                // Gas fades to 0.4 (was 0.3)
                GalaxySpiral.uniformsGas.uOpacity.value = 1.0 - igniteEase * 0.6;

                // Disk stars brighten
                // Halo opacity stays CONSTANT at 0.8 (no fade)
                GalaxySpiral.uniformsStars.uDiskBrightness.value = 0.8 + igniteEase * 0.7; // 0.8 -> 1.5
                GalaxySpiral.uniformsStars.uHaloOpacity.value = 0.8;

                // Star Count Increases: 0.0 -> 1.0 as gas fades
                // Synchronized with gas opacity decrease
                GalaxySpiral.uniformsStars.uStarProgress.value = igniteEase;

                // Slight spiral begins
                GalaxySpiral.uniformsGas.uSpiralStrength.value = igniteEase * 0.3;
                GalaxySpiral.uniformsStars.uSpiralStrength.value = igniteEase * 0.3;

                GalaxySpiral.uniformsBulge.uIntensity.value = 0.6;
            }

            // ====== Phase 4: Spiral Arm Formation (0.93 - 0.95) ======
            if (t >= 0.93 && t < 0.95) {
                context.camera.position.z = 4000.0;

                // Maintain collapsed state
                GalaxySpiral.uniformsGas.uCollapse.value = 1.0;
                GalaxySpiral.uniformsStars.uCollapse.value = 1.0;
                GalaxySpiral.uniformsGas.uHeightScale.value = 0.5; // Keep some thickness
                GalaxySpiral.uniformsGas.uOpacity.value = 0.4; // Target 0.4
                GalaxySpiral.uniformsGas.uOpacity.value = 0.4; // Target 0.4
                GalaxySpiral.uniformsStars.uDiskBrightness.value = 1.5;
                GalaxySpiral.uniformsStars.uHaloOpacity.value = 0.8; // Constant 0.8
                GalaxySpiral.uniformsStars.uStarProgress.value = 1.0; // All stars visible

                GalaxySpiral.uniformsStars.uStarProgress.value = 1.0; // All stars visible

                // Spiral strength increases
                const spiralT = (t - 0.93) / 0.02;
                const spiralEase = smoothstep(0.0, 1.0, Math.min(spiralT, 1.0));

                GalaxySpiral.uniformsGas.uSpiralStrength.value = 0.3 + spiralEase * 0.7;
                GalaxySpiral.uniformsStars.uSpiralStrength.value = 0.3 + spiralEase * 0.7;

                GalaxySpiral.uniformsBulge.uIntensity.value = 0.6;
            }

            // ====== Phase 5: Stable Spiral Galaxy (0.95+) ======
            if (t >= 0.95) {
                context.camera.position.z = 4000.0;

                GalaxySpiral.uniformsGas.uCollapse.value = 1.0;
                GalaxySpiral.uniformsStars.uCollapse.value = 1.0;
                GalaxySpiral.uniformsGas.uHeightScale.value = 0.5; // Keep some thickness
                GalaxySpiral.uniformsGas.uOpacity.value = 0.4; // Target 0.4
                GalaxySpiral.uniformsStars.uDiskBrightness.value = 1.5;
                GalaxySpiral.uniformsStars.uHaloOpacity.value = 0.8; // Constant 0.8
                GalaxySpiral.uniformsStars.uStarProgress.value = 1.0; // All stars visible
                GalaxySpiral.uniformsGas.uSpiralStrength.value = 1.0;
                GalaxySpiral.uniformsStars.uSpiralStrength.value = 1.0;

                GalaxySpiral.uniformsBulge.uIntensity.value = 0.6;
            }

        } else {
            GalaxySpiral.systemGas.visible = false;
            GalaxySpiral.systemStars.visible = false;
            if (GalaxySpiral.systemBulge) GalaxySpiral.systemBulge.visible = false;
        }

        // Hide Previous Stage Artifacts if fully transitioned
        if (t >= 0.88) {
            if (context.jetSystem) context.jetSystem.visible = false;
            if (context.agnSystem) context.agnSystem.visible = false;
            if (context.torusSystem) context.torusSystem.visible = false;
            if (context.smbhSphere) context.smbhSphere.visible = false;
            if (context.smbhGlowSphere) context.smbhGlowSphere.visible = false;
        }
    }
};

const SolarSystemStage = {
    group: null,
    sun: null,
    sunUniforms: null,
    planets: [],
    asteroidBelt: null,
    kuiperBelt: null,
    initialized: false,

    _lastT: null,
    _stageTime: 0.0,
    _planetTime: 0.0,
    // Zoom target in the galaxy disk (closer to bulge than outer edge, and in the lower half of the screen)
    _focusR: 850.0,
    _focusTheta0: 1.3,
    _anchorWorld: null,
    _anchorTangent: null,
    _anchorNormal: null,
    _orbitTiltDeg: 0.0, // No tilt - Face-on view
    _camStartPos: null,
    _camStartTarget: null,

    init: (context) => {
        const { scene } = context;

        SolarSystemStage.group = new THREE.Group();
        SolarSystemStage.group.visible = false;
        scene.add(SolarSystemStage.group);

        // Sun
        SolarSystemStage.sunUniforms = {
            uTime: { value: 0.0 },
            uDetail: { value: 0.0 },
            uOpacity: { value: 1.0 }
        };
        const sunMat = new THREE.ShaderMaterial({
            uniforms: SolarSystemStage.sunUniforms,
            vertexShader: SHADERS.sunSurface.vertex,
            fragmentShader: SHADERS.sunSurface.fragment,
            transparent: true,
            depthWrite: false
        });
        const sunGeo = new THREE.SphereGeometry(1.0, 128, 128);
        SolarSystemStage.sun = new THREE.Mesh(sunGeo, sunMat);
        // Rotate Sun so local pole (Y) aligns with World +Z
        SolarSystemStage.sun.rotation.x = Math.PI / 2;
        SolarSystemStage.group.add(SolarSystemStage.sun);

        // Planets (stylized, larger for artistic effect)
        const makePlanet = (radius, uniforms, shaderType) => {
            const geo = new THREE.SphereGeometry(radius * 2.0, 64, 64); // Doubled size
            const mat = new THREE.ShaderMaterial({
                uniforms: uniforms,
                vertexShader: SHADERS[shaderType].vertex,
                fragmentShader: SHADERS[shaderType].fragment,
                transparent: true,
                depthWrite: true // Enable depth write for spheres
            });
            // We'll control opacity via the uniform uColorA/B mixing or a separate uOpacity if we added it.
            // But our shaders don't have uOpacity. Let's add it dynamically or just mix color with 0 alpha?
            // Actually, we can just set transparent: true and use a custom blend, OR 
            // Simple hack: We'll add uOpacity to all planet shaders in the uniforms we pass.
            // Wait, I didn't add uOpacity to the shaders. I should have.
            // Fallback: Modulate opacity via JS by updating uniforms? No, I need it in shader.
            // Let's assume I can't change shader now. I will use scale 0 to hide them?
            // OR I can just use MeshBasicMaterial for the "fade in" phase?
            // Actually, for better visuals I want shader always.
            // I'll add uOpacity to the uniforms object, and since my shader doesn't use it, it won't work for fading...
            // Crap. I forgot uOpacity in the Planet Shaders.
            // Quick fix: I will re-edit shaders later if needed, but for now I will rely on "visible" toggle 
            // and assume the fade-in of planets is fast or I'll just snap them in.
            // The previous code faded opacity. 
            // I WILL EDIT SHADERS TO ADD uOpacity later. For now let's setup uniforms.

            // Actually, I can use a standard material for fading, or just let them pop in?
            // User asked for "realistic textures".
            // Let's use the shader. I will update the shader code in the NEXT step if I forgot opacity.
            // (I checked, I did NOT put uOpacity in the planet shaders).

            // Correction: I will add opacity support to the shaders NOW by updating StructureModules first, 
            // then I will do a quick pass on shaders.

            const mesh = new THREE.Mesh(geo, mat);
            // Rotate mesh so its local pole (Y-axis) aligns with World +Z
            mesh.rotation.x = Math.PI / 2;
            mesh.visible = false;
            SolarSystemStage.group.add(mesh);
            return mesh;
        };

        // Orbit radii in arbitrary units (compressed)
        const planetDefs = [
            // Mercury: Grey uniform-ish
            {
                name: 'Mercury', r: 0.45, a: 9.0, speed: 2.4, type: 'planetTerrestrial',
                colors: [new THREE.Color(0x8c8c8c), new THREE.Color(0x555555)], seed: 1.0
            },
            // Venus: Orange/Yellow clouds
            {
                name: 'Venus', r: 0.65, a: 12.5, speed: 1.8, type: 'planetTerrestrial',
                colors: [new THREE.Color(0xe6b86a), new THREE.Color(0xd98c40)], seed: 2.0
            },
            // Earth: Blue/Green/White
            {
                name: 'Earth', r: 0.70, a: 16.0, speed: 1.5, type: 'planetTerrestrial',
                colors: [new THREE.Color(0x2244aa), new THREE.Color(0x228833)], seed: 3.0
            },
            // Mars: Red
            {
                name: 'Mars', r: 0.55, a: 21.0, speed: 1.2, type: 'planetTerrestrial',
                colors: [new THREE.Color(0xc1440e), new THREE.Color(0x8a2305)], seed: 4.0
            },

            // Jupiter: Banded Beige
            // Jupiter: Banded Beige
            {
                name: 'Jupiter', r: 1.60, a: 45.0, speed: 0.65, type: 'planetGasGiant',
                colors: [new THREE.Color(0xe0cda9), new THREE.Color(0xa67f53)], timeScale: 0.5, bands: 10.0
            },
            // Saturn: Banded Gold
            {
                name: 'Saturn', r: 1.35, a: 65.0, speed: 0.52, type: 'planetGasGiant',
                colors: [new THREE.Color(0xf4d089), new THREE.Color(0xcfa662)], timeScale: 0.5, bands: 8.0
            },
            // Uranus: Cyan
            {
                name: 'Uranus', r: 1.05, a: 80.0, speed: 0.42, type: 'planetGasGiant',
                colors: [new THREE.Color(0xa5f2f3), new THREE.Color(0x65bcd9)], timeScale: 0.3, bands: 4.0
            },
            // Neptune: Blue
            {
                name: 'Neptune', r: 1.05, a: 95.0, speed: 0.34, type: 'planetGasGiant',
                colors: [new THREE.Color(0x3366ff), new THREE.Color(0x113399)], timeScale: 0.4, bands: 5.0
            }
        ];

        SolarSystemStage.planets = planetDefs.map((d, i) => {
            const uniforms = {
                uColorA: { value: d.colors[0] },
                uColorB: { value: d.colors[1] },
                uTime: { value: 0.0 },
                uSeed: { value: d.seed || 0.0 },
                uTimeScale: { value: d.timeScale || 1.0 },
                uBands: { value: d.bands || 5.0 },
                uOpacity: { value: 1.0 } // I will add this to shader in next step
            };

            const planet = {
                ...d,
                phase: Math.random() * Math.PI * 2,
                mesh: makePlanet(d.r, uniforms, d.type),
                uniforms: uniforms,
                idx: i
            };

            // Add Rings to Saturn (Procedural Ring Shader)
            if (d.name === 'Saturn') {
                const ringGeo = new THREE.RingGeometry(d.r * 2.0, d.r * 3.8, 64); // Reduced size
                const ringUniforms = { uOpacity: { value: 1.0 } }; // Add opacity uniform
                const ringMat = new THREE.ShaderMaterial({
                    uniforms: ringUniforms,
                    vertexShader: SHADERS.planetRing.vertex,
                    fragmentShader: SHADERS.planetRing.fragment,
                    side: THREE.DoubleSide,
                    transparent: true,
                    depthWrite: false
                });
                const ring = new THREE.Mesh(ringGeo, ringMat);
                ring.rotation.x = Math.PI / 2; // XZ plane relative to planet -> World XY (Orbit)
                planet.mesh.add(ring);
            }
            return planet;
        });

        const makeBelt = (count, rMin, rMax, zRange, colorHex) => {
            const geo = new THREE.BufferGeometry();
            const pos = new Float32Array(count * 3);
            for (let i = 0; i < count; i++) {
                const r = rMin + Math.pow(Math.random(), 0.9) * (rMax - rMin);
                const theta = Math.random() * Math.PI * 2;
                const z = (Math.random() - 0.5) * zRange;
                pos[i * 3] = r * Math.cos(theta);
                pos[i * 3 + 1] = r * Math.sin(theta);
                pos[i * 3 + 2] = z;
            }
            geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            const mat = new THREE.PointsMaterial({
                color: colorHex,
                size: 0.12,
                transparent: true,
                opacity: 0.0,
                depthWrite: false
            });
            const pts = new THREE.Points(geo, mat);
            pts.visible = false;
            SolarSystemStage.group.add(pts);
            return pts;
        };

        // Belts with Thickness
        SolarSystemStage.asteroidBelt = makeBelt(9000, 26.0, 33.0, 2.5, 0xaaaaaa);
        SolarSystemStage.kuiperBelt = makeBelt(14000, 105.0, 130.0, 8.0, 0x8899aa);

        SolarSystemStage.initialized = true;
    },

    _getFocusWorld: (theta, q) => {
        const r = SolarSystemStage._focusR;
        return new THREE.Vector3(r * Math.cos(theta), r * Math.sin(theta), 0.0).applyQuaternion(q);
    },

    update: (context, t, delta) => {
        // Only active for the finale window
        if (t < 0.95) {
            if (SolarSystemStage.group) SolarSystemStage.group.visible = false;
            SolarSystemStage._lastT = t;
            SolarSystemStage._camStartPos = null;
            SolarSystemStage._camStartTarget = null;
            return;
        }

        if (!SolarSystemStage.initialized) SolarSystemStage.init(context);

        // Timeline scrubbing safety: reset internal timers if time goes backwards
        const lastT = SolarSystemStage._lastT;
        if (lastT !== null && t < lastT) {
            SolarSystemStage._stageTime = 0.0;
            SolarSystemStage._planetTime = 0.0;
            SolarSystemStage._anchorWorld = null;
            SolarSystemStage._anchorTangent = null;
            SolarSystemStage._anchorNormal = null;
            SolarSystemStage._camStartPos = null;
            SolarSystemStage._camStartTarget = null;
        }
        SolarSystemStage._lastT = t;

        SolarSystemStage._stageTime += delta;

        const q = (GalaxySpiral.systemStars && GalaxySpiral.systemStars.quaternion) ? GalaxySpiral.systemStars.quaternion : new THREE.Quaternion();
        const keplerScale = (GalaxySpiral.uniformsGas && GalaxySpiral.uniformsGas.uKeplerScale) ? GalaxySpiral.uniformsGas.uKeplerScale.value : -0.3;
        const omegaFocus = keplerScale * 0.25 * (1000.0 / Math.max(SolarSystemStage._focusR, 1.0));
        const theta = SolarSystemStage._focusTheta0 + omegaFocus * SolarSystemStage._stageTime;

        // Galaxy disk basis vectors at the current focus angle (side-view camera lives mostly in the disk plane)
        const tangentWorld = new THREE.Vector3(-Math.sin(theta), Math.cos(theta), 0.0).applyQuaternion(q).normalize();
        const normalWorld = new THREE.Vector3(0.0, 0.0, 1.0).applyQuaternion(q).normalize();

        // Phase A: 0.95 -> 0.97 zoom into an off-center region, co-rotating with local stars
        if (t < 0.97) {
            const localT = THREE.MathUtils.clamp((t - 0.95) / 0.02, 0.0, 1.0);
            const ease = smoothstep(0.0, 1.0, localT);

            const focusWorld = SolarSystemStage._getFocusWorld(theta, q);

            // Override galaxy camera hold (GalaxySpiral sets z=4000)
            const dist = THREE.MathUtils.lerp(4000.0, 900.0, ease);
            // Side view: position mostly along the disk plane (tangent), with a small lift along the disk normal.
            const lift = dist * 0.10;
            const targetPos = new THREE.Vector3(
                focusWorld.x + tangentWorld.x * dist + normalWorld.x * lift,
                focusWorld.y + tangentWorld.y * dist + normalWorld.y * lift,
                focusWorld.z + tangentWorld.z * dist + normalWorld.z * lift
            );
            const targetLook = focusWorld.clone();

            // Prevent a hard jump at exactly t=0.95 by lerping from the current camera state.
            // Before this stage the camera stays at (0,0,4000) looking at origin.
            if (!SolarSystemStage._camStartPos) {
                SolarSystemStage._camStartPos = context.camera.position.clone();
                SolarSystemStage._camStartTarget = new THREE.Vector3(0.0, 0.0, 0.0);
            }
            const startPos = SolarSystemStage._camStartPos;
            const startLook = SolarSystemStage._camStartTarget;
            context.camera.position.copy(startPos).lerp(targetPos, ease);
            const look = startLook.clone().lerp(targetLook, ease);
            context.camera.lookAt(look);

            // Fade out the rest of the galaxy during the zoom
            const fadeOut = 1.0 - ease;
            if (GalaxySpiral.uniformsStars) {
                GalaxySpiral.uniformsStars.uDiskBrightness.value = 1.5 * fadeOut;
                GalaxySpiral.uniformsStars.uHaloOpacity.value = 0.8 * fadeOut;
            }
            if (GalaxySpiral.uniformsGas) GalaxySpiral.uniformsGas.uOpacity.value = 0.4 * fadeOut;
            if (GalaxySpiral.uniformsBulge) GalaxySpiral.uniformsBulge.uIntensity.value = 0.6 * fadeOut;

            SolarSystemStage.group.visible = false;
            return;
        }

        // Anchor the solar system at the focus point reached at 0.97
        if (!SolarSystemStage._anchorWorld) {
            SolarSystemStage._anchorWorld = SolarSystemStage._getFocusWorld(theta, q).clone();
            SolarSystemStage.group.position.copy(SolarSystemStage._anchorWorld);
            // Keep orbital plane roughly parallel to the galaxy disk, but tilt it out of the screen a bit
            // to make the orbit rings read more clearly in perspective.
            const tiltQ = new THREE.Quaternion().setFromAxisAngle(
                new THREE.Vector3(1.0, 0.0, 0.0),
                THREE.MathUtils.degToRad(SolarSystemStage._orbitTiltDeg)
            );
            SolarSystemStage.group.quaternion.copy(q).multiply(tiltQ);
            SolarSystemStage._anchorTangent = tangentWorld.clone();
            SolarSystemStage._anchorNormal = normalWorld.clone();
        }

        // Hide galaxy systems completely after 0.97
        if (GalaxySpiral.systemGas) GalaxySpiral.systemGas.visible = false;
        if (GalaxySpiral.systemStars) GalaxySpiral.systemStars.visible = false;
        if (GalaxySpiral.systemBulge) GalaxySpiral.systemBulge.visible = false;

        // Phase B: 0.97 -> 1.0 zoom into the Sun; planets/belts reveal gradually
        SolarSystemStage.group.visible = true;

        const localT2 = THREE.MathUtils.clamp((t - 0.97) / 0.03, 0.0, 1.0);
        const ease2 = smoothstep(0.0, 1.0, localT2);

        // Camera: Position directly above the Solar System (along normalWorld axis)
        // This gives a face-on view of the concentric orbits.
        const dist2 = THREE.MathUtils.lerp(900.0, 220.0, ease2);
        const nDir = SolarSystemStage._anchorNormal || normalWorld;
        context.camera.position.set(
            SolarSystemStage._anchorWorld.x + nDir.x * dist2,
            SolarSystemStage._anchorWorld.y + nDir.y * dist2,
            SolarSystemStage._anchorWorld.z + nDir.z * dist2
        );
        context.camera.lookAt(SolarSystemStage._anchorWorld);

        // Sun grows and reveals surface structure
        SolarSystemStage.sunUniforms.uTime.value += delta;
        SolarSystemStage.sunUniforms.uDetail.value = ease2;
        SolarSystemStage.sunUniforms.uOpacity.value = 1.0;
        SolarSystemStage.sunUniforms.uTime.value += delta;
        SolarSystemStage.sunUniforms.uDetail.value = ease2;
        SolarSystemStage.sunUniforms.uOpacity.value = 1.0;
        // Rotate Sun around its pole (local Y, which is World Z)
        // Positive direction = CCW in XY = along +Z
        SolarSystemStage.sun.rotation.y += delta * 0.2;

        // Keep the Sun far smaller than Jupiter's orbit in this stylized scale.
        const sunScale = THREE.MathUtils.lerp(1.2, 4.8, ease2);
        SolarSystemStage.sun.scale.setScalar(sunScale);

        // Planets and belts reveal once we are sufficiently zoomed in (keep only Sun at exactly 0.97)
        SolarSystemStage._planetTime += delta;
        const reveal = smoothstep(0.15, 1.0, ease2);

        for (const p of SolarSystemStage.planets) {
            const ang = p.phase + SolarSystemStage._planetTime * p.speed * 0.35;
            p.mesh.position.set(p.a * Math.cos(ang), p.a * Math.sin(ang), 0.0);

            // Rotate planet around its pole (local Y, which is World Z)
            // Positive direction = CCW in XY = along +Z
            p.mesh.rotation.y += delta * 1.0;
            if (p.uniforms) {
                p.uniforms.uTime.value += delta;
                p.uniforms.uOpacity.value = Math.min(1.0, reveal);
            }

            p.mesh.visible = reveal > 0.001;

            // Fade rings if present
            if (p.mesh.children.length > 0) {
                // Update ring uniform if it exists
                if (p.mesh.children[0].material.uniforms && p.mesh.children[0].material.uniforms.uOpacity) {
                    p.mesh.children[0].material.uniforms.uOpacity.value = reveal * 0.8;
                }
            }
        }

        if (SolarSystemStage.asteroidBelt) {
            const op = smoothstep(0.25, 1.0, ease2) * 0.9;
            SolarSystemStage.asteroidBelt.material.opacity = op;
            SolarSystemStage.asteroidBelt.visible = op > 0.001;
            SolarSystemStage.asteroidBelt.rotation.z = SolarSystemStage._planetTime * 0.06;
        }

        if (SolarSystemStage.kuiperBelt) {
            const op = smoothstep(0.45, 1.0, ease2) * 0.7;
            SolarSystemStage.kuiperBelt.material.opacity = op;
            SolarSystemStage.kuiperBelt.visible = op > 0.001;
            SolarSystemStage.kuiperBelt.rotation.z = SolarSystemStage._planetTime * 0.03;
        }
    }
};
