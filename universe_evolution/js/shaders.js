const SHADERS = {
    sphere: {
        vertex: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vViewPosition = -mvPosition.xyz;
            gl_Position = projectionMatrix * mvPosition;
        }
        `,
        fragment: `
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uIntensity;
        uniform float uNoiseStrength;
        uniform float uNoiseMultiplier;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        float snoise(vec3 v) {
            const vec2 C = vec2(1.0/6.0, 1.0/3.0);
            const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
            vec3 i = floor(v + dot(v, C.yyy));
            vec3 x0 = v - i + dot(i, C.xxx);
            vec3 g = step(x0.yzx, x0.xyz);
            vec3 l = 1.0 - g;
            vec3 i1 = min(g.xyz, l.zxy);
            vec3 i2 = max(g.xyz, l.zxy);
            vec3 x1 = x0 - i1 + C.xxx;
            vec3 x2 = x0 - i2 + C.yyy;
            vec3 x3 = x0 - D.yyy;
            i = mod289(i);
            vec4 p = permute(permute(permute(
                        i.z + vec4(0.0, i1.z, i2.z, 1.0))
                    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
            float n_ = 0.142857142857;
            vec3 ns = n_ * D.wyz - D.xzx;
            vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
            vec4 x_ = floor(j * ns.z);
            vec4 y_ = floor(j - 7.0 * x_);
            vec4 x = x_ *ns.x + ns.yyyy;
            vec4 y = y_ *ns.x + ns.yyyy;
            vec4 h = 1.0 - abs(x) - abs(y);
            vec4 b0 = vec4(x.xy, y.xy);
            vec4 b1 = vec4(x.zw, y.zw);
            vec4 s0 = floor(b0)*2.0 + 1.0;
            vec4 s1 = floor(b1)*2.0 + 1.0;
            vec4 sh = -step(h, vec4(0.0));
            vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
            vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
            vec3 p0 = vec3(a0.xy,h.x);
            vec3 p1 = vec3(a0.zw,h.y);
            vec3 p2 = vec3(a1.xy,h.z);
            vec3 p3 = vec3(a1.zw,h.w);
            vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
            p0 *= norm.x;
            p1 *= norm.y;
            p2 *= norm.z;
            p3 *= norm.w;
            vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
            m = m * m;
            return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }
        void main() {
            vec3 normal = normalize(vNormal);
            vec3 viewDir = normalize(vViewPosition);
            float dotNV = max(0.0, dot(normal, viewDir));
            float alpha = pow(dotNV, 1.2); 
            float noise = snoise(normal * 6.0 + uTime * 0.3);
            vec3 finalColor = uColor * uIntensity;
            float rim = 1.0 - dotNV;
            finalColor += uColor * pow(rim, 2.5) * 4.0; 
            finalColor += vec3(noise * uNoiseStrength * uNoiseMultiplier);
            gl_FragColor = vec4(finalColor, alpha);
        }
        `
    },
    particle: {
        vertex: `
        attribute float size;
        attribute float offset;
        attribute float speed;
        attribute float birthTime;
        attribute float deathTime; 
        attribute float type;      
        attribute vec3 velocity; 
        
        uniform float uTime; 
        uniform float uMoveTime; 
        uniform float uProgress;
        
        varying float vAlpha;
        varying vec3 vColor;

        void main() {
            vec3 animatedPos = position + vec3(
                sin(uMoveTime * velocity.x * 0.5), 
                cos(uMoveTime * velocity.y * 0.5), 
                sin(uMoveTime * velocity.z * 0.5)
            ) * 4.0;

            vec4 mvPosition = modelViewMatrix * vec4(animatedPos, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            
            gl_PointSize = size * (200.0 / -mvPosition.z);

            // 1. 可见性控制
            float born = step(birthTime, uProgress);
            float dead = step(deathTime, uProgress);
            float visible = born * (1.0 - dead);
            
            // 2. 闪烁动画控制
            float blinkPhase = uTime * speed + offset;
            float blink = smoothstep(0.0, 0.2, sin(blinkPhase));

            if (type < 0.5) { if (uProgress > 0.30) blink = 1.0; } 
            else if (type < 1.5) { if (uProgress > 0.27) blink = 1.0; } 
            else { blink = 1.0; }
            
            float particleFade = 1.0;
            if (uProgress > 0.50) {
                // Fade from 0.50 to 0.52
                particleFade = 1.0 - (uProgress - 0.50) / 0.02; 
                particleFade = clamp(particleFade, 0.0, 1.0);
            }
            
            vAlpha = visible * blink * particleFade;
            
            if (type < 0.5) vColor = vec3(0.8, 0.9, 1.0); 
            else if (type < 1.5) vColor = vec3(1.0, 0.9, 0.8); 
            else if (type < 2.5) vColor = vec3(1.0, 0.8, 0.6); 
            else if (type < 3.5) vColor = vec3(1.0, 0.6, 0.4); 
            else vColor = vec3(1.0, 0.4, 0.4); 
        }
        `,
        fragment: `
        varying float vAlpha;
        varying vec3 vColor;

        void main() {
            if (vAlpha <= 0.01) discard;
            vec2 coord = gl_PointCoord - vec2(0.5);
            float dist = length(coord);
            if (dist > 0.5) discard;
            float strength = 1.0 - (dist * 2.0);
            strength = pow(strength, 1.5);
            gl_FragColor = vec4(vColor, vAlpha * strength);
        }
        `
    },
    accretion: {
        vertex: `
        attribute float angleOffset;
        attribute float radiusOffset;
        attribute float speed;
        
        uniform float uTime;
        uniform float uCollapse; // 0.0 -> 1.0 (Used for rotation/brightness only now)
        uniform float uMinRadius; // Dynamic Inner Radius
        uniform float uMaxRadius; // Dynamic Outer Radius
        
        varying float vAlpha;

        void main() {
            // New logic: Direct radius mapping
            float r = mix(uMinRadius, uMaxRadius, radiusOffset);
            
            // Rotation logic
            // Use uCollapse for speedup? Or just uTime?
            // Existing: float rotation = uTime * speed * 1.0 + uCollapse * 20.0 * (1.0 / (rFactor + 0.1));
            // We can simplify or approximate rotation speed increase based on radius contraction (conservation of angular momentum implies smaller r = faster)
            // Let's use 600.0/r as a speed multiplier proxy
            float speedMult = 600.0 / (r + 1.0);
            float rotation = uTime * speed * (1.0 + speedMult * 0.5); 
            float currentAngle = angleOffset + rotation;
            
            float x = r * cos(currentAngle);
            float z = r * sin(currentAngle);
            float y = position.y * (r / 600.0); // Flatten based on current radius ratio
            
            vec3 pos = vec3(x, y, z);
            
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            
            gl_PointSize = 3.5 * (300.0 / -mvPosition.z);
            
            float fadeIn = smoothstep(0.0, 0.2, uCollapse);
            float fadeOut = smoothstep(0.9, 1.0, uCollapse);
            vAlpha = fadeIn * (1.0 - fadeOut) * 3.0; // Increased brightness significantly
        }
        `,
        fragment: `
        varying float vAlpha;
        uniform float uOpacity;
        void main() {
            if (vAlpha <= 0.01) discard;
            vec2 coord = gl_PointCoord - vec2(0.5);
            if (length(coord) > 0.5) discard;
            gl_FragColor = vec4(0.9, 0.7, 0.4, vAlpha * uOpacity);
        }
        `
    },
    infall: {
        vertex: `
        attribute float speed; // fall speed multiplier
        uniform float uCollapse; // 0.0 -> 1.0 global progress
        varying float vAlpha;

        void main() {
            // 调整：分布范围缩小到 60-140，穿插在气体云(R120)中
            float factor = 1.0 - uCollapse * speed * 2.0; 
            if (factor < 0.0) factor = 0.0; 
            
            // 螺旋逻辑:
            // 修改点：使用负值 (-4.0) 使其顺时针旋转，与吸积盘一致
            float angle = -(1.0 - factor) * 4.0; // 负值 -> 顺时针
            float s = sin(angle);
            float c = cos(angle);
            
            // 绕 Y 轴旋转 position.x 和 position.z
            float nx = position.x * c - position.z * s;
            float nz = position.x * s + position.z * c;
            
            // 应用塌缩因子
            vec3 pos = vec3(nx, position.y, nz) * factor;
            
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            
            // 调整粒子大小
            gl_PointSize = 3.5 * (300.0 / -mvPosition.z);
            
            float dist = length(pos);
            float alpha = smoothstep(0.0, 20.0, dist); 
            float fadeIn = smoothstep(0.0, 0.1, uCollapse);
            
            // 调整亮度: 0.1
            vAlpha = alpha * fadeIn * 0.1; 
        }
        `,
        fragment: `
        varying float vAlpha;
        uniform float uOpacity;
        void main() {
            if (vAlpha <= 0.01) discard;
            gl_FragColor = vec4(0.7, 0.8, 0.9, vAlpha * uOpacity); 
        }
        `
    },
    fog: {
        vertex: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec3 vPos;
        uniform float uCollapse; 
        void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vPos = position; 
            float scale = mix(1.0, 0.005, uCollapse * uCollapse); 
            vec3 scaledPos = position * scale;
            vec4 mvPosition = modelViewMatrix * vec4(scaledPos, 1.0);
            vViewPosition = -mvPosition.xyz;
            gl_Position = projectionMatrix * mvPosition;
        }
        `,
        fragment: `
        uniform float uTime;
        uniform float uIntensity; 
        uniform float uCollapse;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec3 vPos; 
        
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        float snoise(vec3 v) {
            const vec2 C = vec2(1.0/6.0, 1.0/3.0);
            const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
            vec3 i = floor(v + dot(v, C.yyy));
            vec3 x0 = v - i + dot(i, C.xxx);
            vec3 g = step(x0.yzx, x0.xyz);
            vec3 l = 1.0 - g;
            vec3 i1 = min(g.xyz, l.zxy);
            vec3 i2 = max(g.xyz, l.zxy);
            vec3 x1 = x0 - i1 + C.xxx;
            vec3 x2 = x0 - i2 + C.yyy;
            vec3 x3 = x0 - D.yyy;
            i = mod289(i);
            vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
            float n_ = 0.142857142857;
            vec3 ns = n_ * D.wyz - D.xzx;
            vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
            vec4 x_ = floor(j * ns.z);
            vec4 y_ = floor(j - 7.0 * x_);
            vec4 x = x_ *ns.x + ns.yyyy;
            vec4 y = y_ *ns.x + ns.yyyy;
            vec4 h = 1.0 - abs(x) - abs(y);
            vec4 b0 = vec4(x.xy, y.xy);
            vec4 b1 = vec4(x.zw, y.zw);
            vec4 s0 = floor(b0)*2.0 + 1.0;
            vec4 s1 = floor(b1)*2.0 + 1.0;
            vec4 sh = -step(h, vec4(0.0));
            vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
            vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
            vec3 p0 = vec3(a0.xy,h.x);
            vec3 p1 = vec3(a0.zw,h.y);
            vec3 p2 = vec3(a1.xy,h.z);
            vec3 p3 = vec3(a1.zw,h.w);
            vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
            p0 *= norm.x;
            p1 *= norm.y;
            p2 *= norm.z;
            p3 *= norm.w;
            vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
            m = m * m;
            return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }

        void main() {
            vec3 normal = normalize(vNormal);
            vec3 viewDir = normalize(vViewPosition);
            float dotNV = max(0.0, dot(normal, viewDir));
            
            float nScale = 2.0 + uCollapse * 5.0; 
            float noise = snoise(vPos * 0.0083 + uTime * 0.2); // Further reduced frequency for 6x scale 
            
            float core = pow(dotNV, 1.5); 
            
            vec3 gasColor = mix(vec3(0.1, 0.2, 0.5), vec3(0.8, 0.9, 1.0), uCollapse + noise * 0.2);
            
            float alpha = uIntensity * core * (0.3 + uCollapse * 0.7); 
            
            gl_FragColor = vec4(gasColor, alpha);
        }
        `
    },
    star: {
        vertex: `
	        attribute float size;
	        attribute float birthOffset; 
            attribute float aClusterId;
            attribute vec3 aClusterOffset;

	        uniform float uProgress;     
	        uniform float uSizeScale;
            uniform float uMergerTime; // 0.0 -> 1.0 (0.70-0.75)
	        
	        varying float vAlpha;
	        varying float vGlow;

	        void main() {
                // Base position relative to cluster center
                vec3 pos = position; 
                
                // Merger Logic
                // If aClusterId > 0.0, it means it's an incoming cluster
                // We want to interpolate its "center" from aClusterOffset to vec3(0.0)
                
                vec3 clusterCenter = aClusterOffset;
                
                // Apply merger movement
                float mergerProgress = smoothstep(0.0, 1.0, uMergerTime);
                if (aClusterId > 0.0) {
                     clusterCenter = mix(aClusterOffset, vec3(0.0), mergerProgress);
                }

                // Apply spiral rotation during merger
                // Rotate entire cluster around global Y axis as it approaches
                float angle = mergerProgress * 45.0 * (aClusterId * 0.5 + 1.0); // Maximum spirals (25.0 -> 45.0)
                float s = sin(angle);
                float c = cos(angle);
                
                // Rotate local position first (spin)
                float spin = mergerProgress * 2.0;
                float ss = sin(spin);
                float sc = cos(spin);
                float rx = pos.x * sc - pos.z * ss;
                float rz = pos.x * ss + pos.z * sc;
                pos.x = rx; pos.z = rz;

                // Add cluster center offset
                vec3 finalPos = pos + clusterCenter;
                
                // Global Galaxy Rotation for finalPos
                // As merger happens, everything starts spinning together
                if (uMergerTime > 0.0) {
                    float gAngle = uMergerTime * 2.0; 
                    float gs = sin(gAngle);
                    float gc = cos(gAngle);
                    float gx = finalPos.x * gc - finalPos.z * gs;
                    float gz = finalPos.x * gs + finalPos.z * gc;
                    finalPos.x = gx;
                    finalPos.z = gz;
                }

	            vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
	            gl_Position = projectionMatrix * mvPosition;
	            
	            gl_PointSize = (size * uSizeScale) * (300.0 / -mvPosition.z);

	            float igniteTime = 0.66; 
	            
	            float visible = 0.0;
            if (uProgress >= igniteTime) {
                 float localP = (uProgress - igniteTime) / 0.03; 
                 float trigger = step(birthOffset, localP);
                 float fade = smoothstep(0.0, 0.2, localP - birthOffset + 0.1);
                 visible = trigger * fade;
            }
            
            vAlpha = visible;
            vGlow = visible;
        }
        `,
        fragment: `
        varying float vAlpha;
        varying float vGlow;

        void main() {
            if (vAlpha <= 0.01) discard;
            vec2 coord = gl_PointCoord - vec2(0.5);
            float dist = length(coord);
            if (dist > 0.5) discard;
            
            float core = 1.0 - (dist * 2.0);
            core = pow(core, 3.0); 

            float halo = 1.0 - (dist * 2.0);
            halo = pow(halo, 0.5);

            vec3 col = vec3(1.0, 0.95, 0.8);
            
            if (uProgress >= igniteTime) {
                 float localP = (uProgress - igniteTime) / 0.03; 
                 float trigger = step(birthOffset, localP);
                 float fade = smoothstep(0.0, 0.2, localP - birthOffset + 0.1);
                 visible = trigger * fade;
            }
            
            vAlpha = visible;
            vGlow = visible;
        }
        `,
        fragment: `
        varying float vAlpha;
        varying float vGlow;

        void main() {
            if (vAlpha <= 0.01) discard;
            vec2 coord = gl_PointCoord - vec2(0.5);
            float dist = length(coord);
            if (dist > 0.5) discard;
            
            float core = 1.0 - (dist * 2.0);
            core = pow(core, 3.0); 

            float halo = 1.0 - (dist * 2.0);
            halo = pow(halo, 0.5);

            vec3 col = vec3(1.0, 0.95, 0.8);
            
            float finalAlpha = vAlpha * (core * 0.8 + halo * 0.2);
            gl_FragColor = vec4(col, finalAlpha);
        }
        `
    },
    core: {
        vertex: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
            vNormal = normalize(normalMatrix * normal);
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vViewPosition = -mvPosition.xyz;
            gl_Position = projectionMatrix * mvPosition;
        }
        `,
        fragment: `
        uniform float uIntensity;
        uniform vec3 uColor;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
            vec3 normal = normalize(vNormal);
            vec3 viewDir = normalize(vViewPosition);
            float dotNV = max(0.0, dot(normal, viewDir));
            float glow = pow(dotNV, 3.0); 
            gl_FragColor = vec4(uColor, glow * uIntensity);
        }
        `
    },
    cosmicWeb: {
        vertex: `
        attribute vec3 aTargetPos;
        attribute float aRandomOffset;
        
        uniform float uProgress; // 0.0 (random) -> 1.0 (structure)
        uniform float uSize;
        
        varying float vAlpha;

        void main() {
            // Cubic ease in-out
            float t = uProgress;
            float ease = t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
            
            // Adding a bit of noise/drift based on offset so they don't move in perfectly straight lines
            vec3 drift = vec3(
                sin(aRandomOffset + t * 5.0),
                cos(aRandomOffset + t * 5.0),
                sin(aRandomOffset * 2.0 + t * 5.0)
            ) * (1.0 - ease) * 10.0; // Drift reduces as they lock into place

            vec3 pos = mix(position, aTargetPos, ease) + drift;
            
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            
            gl_PointSize = uSize * (300.0 / -mvPosition.z);
            
            // Determine visibility/alpha
            // Fade in initially 
            // Also fade out slightly if needed, but controlled by uniform uOpacity mainly
            vAlpha = 1.0; 
        }
        `,
        fragment: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vAlpha;

        void main() {
            vec2 coord = gl_PointCoord - vec2(0.5);
            float dist = length(coord);
            if (dist > 0.5) discard;
            
            // Soft blurry particle
            float strength = 1.0 - (dist * 2.0);
            strength = pow(strength, 2.0);
            
            gl_FragColor = vec4(uColor, strength * vAlpha * uOpacity);
        }
        `
    },
    blackHole: {
        vertex: `
        varying vec3 vNormal;
        void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
        `,
        fragment: `
        varying vec3 vNormal;
        void main() {
            // "Outward" Glow (Atmosphere style)
            // Rendered on BackSide of a slightly larger sphere
            vec3 viewDirection = vec3(0.0, 0.0, 1.0); // Approx in view space
            float intensity = pow(0.6 - dot(vNormal, viewDirection), 4.0);
            
            // Blue-Purple
            vec3 glowColor = vec3(0.3, 0.0, 0.9);
            
            // Reduced brightness (User asked for reduced scale/brightness)
            gl_FragColor = vec4(glowColor, intensity * 0.25); 
        }
        `
    },
    nucleus: {
        vertex: `
        varying vec3 vNormal;
        void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
        `,
        fragment: `
        varying vec3 vNormal;
        uniform float uOpacity;
        void main() {
            // Stronger, larger glow
            vec3 viewDir = vec3(0.0, 0.0, 1.0); 
            // Power reduced (2.0 -> 1.0) for wider falloff, Base increased (0.3 -> 0.4)
            float intensity = pow(0.4 + dot(vNormal, viewDir), 1.0);
            
            // Bright White/Yellowish
            vec3 color = vec3(1.0, 0.95, 0.8);
            
            // Overdrive center
            gl_FragColor = vec4(color, intensity * uOpacity * 1.5); 
        }
        `
    },
    sunSurface: {
        vertex: `
        varying vec3 vPos;
        varying vec3 vN;
        void main() {
            vPos = position;
            vN = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
        `,
        fragment: `
        varying vec3 vPos;
        varying vec3 vN;
        uniform float uTime;
        uniform float uDetail;   // 0.0 -> 1.0 (more surface structure)
        uniform float uOpacity;

        float hash12(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float hash13(vec3 p) {
            return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
        }

        void main() {
            vec3 n = normalize(vN);
            
            // Map texture based on Local Position (vPos) instead of View Normal
            // vPos is on unit sphere (radius 1). normalize it to be safe.
            vec3 localPos = normalize(vPos);
            
            // Spherical coords from Local Position
            // Pole is Y axis.
            float lon = atan(localPos.z, localPos.x);
            float lat = asin(clamp(localPos.y, -1.0, 1.0));

            // Large-scale bands
            float bands = 0.5 + 0.5 * sin(lat * 18.0 + uTime * 0.35);

            // Granulation-like cells via hashed lattice on LOCAL position
            vec3 p = localPos * (25.0 + 55.0 * uDetail);
            vec3 ip = floor(p);
            float g = 0.0;
            g += hash13(ip + vec3(0.0, 0.0, 0.0));
            g += hash13(ip + vec3(1.0, 0.0, 0.0));
            g += hash13(ip + vec3(0.0, 1.0, 0.0));
            g += hash13(ip + vec3(0.0, 0.0, 1.0));
            g *= 0.25;

            // Slow drift
            float drift = 0.5 + 0.5 * sin(lon * 6.0 + lat * 4.0 + uTime * 0.18);

            // Sunspots
            float spot = hash12(floor(vec2(lon, lat) * 6.0));
            float spots = smoothstep(0.985, 1.0, spot) * uDetail;

            float structure = (0.35 * bands + 0.45 * g + 0.20 * drift);
            structure = mix(0.55, structure, uDetail);

            vec3 cBase = vec3(1.0, 0.82, 0.25);
            vec3 cBright = vec3(1.0, 0.92, 0.55);
            vec3 cDark = vec3(0.55, 0.30, 0.08);

            vec3 col = mix(cBase, cBright, structure);
            col = mix(col, cDark, spots);

            // Slight limb darkening
            float limb = pow(1.0 - max(0.0, n.z), 1.5);
            col *= (1.0 - 0.25 * limb);

            gl_FragColor = vec4(col, uOpacity);
        }
        `
    },
    agnDisk: {
        vertex: `
        attribute float aPhase;
        attribute float aRadius; // 0.0 to 1.0
        attribute float aSpeed;
        
        uniform float uTime;
        uniform float uInnerRad;
        uniform float uOuterRad;
        
        varying float vAlpha;
        varying vec3 vColor;
        
        void main() {
            // Calculate actual radius
            float r = uInnerRad + aRadius * (uOuterRad - uInnerRad);
            
            // Keplerian velocity approximation: v ~ 1/sqrt(r)
            // Angular velocity omega = v/r ~ 1/r^1.5 
            float omega = aSpeed * 50.0 / pow(r, 1.5);
            
            float angle = aPhase + omega * uTime;
            
            // Position in disk plane (before tilt)
            vec3 pos = vec3(r * cos(angle), 0.0, r * sin(angle));
            
            // Calculate Color based on Temperature (radius)
            // Hot blue inner, cooler red outer
            float tRel = 1.0 - aRadius; // 1.0 at inner, 0.0 at outer
            vec3 cHot = vec3(0.4, 0.6, 1.0); // Blue-ish
            vec3 cCool = vec3(1.0, 0.3, 0.1); // Red-ish Orange
            vColor = mix(cCool, cHot, tRel * tRel); // Bias towards cool for visual balance
            
            vAlpha = smoothstep(0.0, 0.1, aRadius) * smoothstep(1.0, 0.9, aRadius);
            
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            
            // Size attenuation
            gl_PointSize = (1170.0 / -mvPosition.z); 
        }
        `,
        fragment: `
            varying float vAlpha;
            varying vec3 vColor;
            uniform float uOpacity; // Added for fade out
            
            void main() {
                vec2 coord = gl_PointCoord - vec2(0.5);
                float dist = length(coord);
                if (dist > 0.5) discard;
                
                float alpha = 1.0 - (dist * 2.0);
                alpha = pow(alpha, 1.5);
                
                // Reduced brightness further + Global Opacity
                gl_FragColor = vec4(vColor, alpha * vAlpha * 0.6 * uOpacity);
            }
        `
    },
    relativisticJet: {
        vertex: `
        attribute float aSide; // +1 (Up) or -1 (Down)
        attribute float aSpeed;
        attribute float aOffset; // Random 0-1 for density check + flow offset
        attribute float aRadialOffset; // For width
        attribute float aDensitySeed; // Independent density gate
        attribute float aAngleSeed; // Independent angle

        uniform float uTime;
        uniform float uSpeedScale;
        uniform float uDensity; // 0.0 to 1.0
        uniform float uMaxDistance; // Current jet length
        uniform float uBHRadius;
        uniform float uBaseRadius; // Jet starts at base radius
        uniform float uConeAngle; // Cone half-angle in radians
        uniform float uConeAngleMin; // Cone min angle in radians
        uniform float uBrightnessScale;
        uniform float uNearPointMin;
        uniform float uNearPointHeight;

        varying float vAlpha;
        varying vec3 vColor;

        void main() {
            // Density Check: Hide particle if its 'ticket' > density
            // Use independent seed to avoid angular bias
            if (aDensitySeed > uDensity) {
                gl_Position = vec4(2.0, 2.0, 2.0, 1.0); // Clip
                return;
            }

            // Flow Logic
            // Distance along jet axis
            // Cycle: (Time * Speed + Offset) % MaxPhysLength
            float maxPhysLength = 500.0;
            float travelLength = max(uMaxDistance, 1.0);
            float linearPos = mod(uTime * aSpeed * uSpeedScale + aOffset * travelLength, travelLength);

            // Hide if jet hasn't started yet
            if (uMaxDistance <= 0.001) {
                gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
                return;
            }

            // Shape: cone from a base radius at 1.15x SMBH radius
            float axisPos = linearPos + uBaseRadius;
            float bh3 = uBHRadius * 3.0;
            float bh10 = uBHRadius * 10.0;
            float angleT = clamp((axisPos - bh3) / (bh10 - bh3), 0.0, 1.0);
            float coneAngle = mix(uConeAngle, uConeAngleMin, angleT);
            float width = axisPos * tan(coneAngle);
            float angle = aAngleSeed * 6.28; // Random angle around axis
            float r = aRadialOffset * width;
            
            vec3 localPos = vec3(
                r * cos(angle),
                aSide * axisPos, // Main axis is Y
                r * sin(angle)
            );

            // Color: Blue/White Core -> Violet Edge
            float coreFactor = 1.0 - aRadialOffset;
            vColor = mix(vec3(0.5, 0.0, 1.0), vec3(0.8, 0.9, 1.0), coreFactor);
            vAlpha = coreFactor;

            gl_Position = projectionMatrix * modelViewMatrix * vec4(localPos, 1.0);
            // Log-scale size ramp: thin near base, reach full size at threshold
            float heightRatio = max(uNearPointHeight, 0.001);
            float logT = log(1.0 + axisPos / heightRatio) / log(2.0);
            float pointScale = clamp(logT, 0.0, 1.0);
            gl_PointSize = 24.0 * mix(uNearPointMin, 1.0, pointScale);
        }
        `,
        fragment: `
        varying float vAlpha;
        varying vec3 vColor;
        uniform float uBrightnessScale;
        void main() {
            vec2 coord = gl_PointCoord - vec2(0.5);
            float dist = length(coord);
            if (dist > 0.5) discard;
            float alpha = 1.0 - (dist * 2.0);
            // Match AGN softness
            alpha = pow(alpha, 1.5);
            
            // Soft glow (0.8) instead of hard bright (2.0)
            gl_FragColor = vec4(vColor, alpha * vAlpha * 2.5 * uBrightnessScale);
        }
        `
    },
    dustTorus: {
        vertex: `
        attribute float aPhase;
        attribute float aRadius; // 0.0 to 1.0
        attribute float aHeight; // -1.0 to 1.0 (Vertical offset)
        attribute float aSpeed;
        
        uniform float uTime;
        uniform float uInnerRad;
        uniform float uOuterRad;
        uniform float uHeightScale; // Max height at outer edge
        uniform float uOpacity;
        uniform float uPointScale;
        
        varying float vAlpha;
        varying vec3 vColor;
        
        void main() {
            float r = uInnerRad + aRadius * (uOuterRad - uInnerRad);
            
            // Keplerian-ish rotation (slower than inner disk)
            float omega = aSpeed * 30.0 / pow(r, 1.5);
            float angle = aPhase + omega * uTime;
            
            // Torus Shape: Thick Donut
            // Height increases with radius to simulate flaring or just constant thickness
            // Let's make it a thick flared torus: h ~ r * height_factor * random_offset
            float h = aHeight * uHeightScale * (r / 200.0);
            
            vec3 pos = vec3(r * cos(angle), h, r * sin(angle));
            
            // Color: dusty gray-yellow (slightly brighter inside)
            vec3 cInner = vec3(0.72, 0.68, 0.48);
            vec3 cOuter = vec3(0.42, 0.40, 0.28);
            vColor = mix(cInner, cOuter, aRadius);
            
            // Fade edges (Soft boundaries)
            vAlpha = smoothstep(0.0, 0.2, aRadius) * smoothstep(1.0, 0.8, aRadius) * uOpacity;
            
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            
            // Large particles for volumetric feel
            gl_PointSize = (20000.0 / -mvPosition.z) * uPointScale; 
        }
        `,
        fragment: `
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
            vec2 coord = gl_PointCoord - vec2(0.5);
            float dist = length(coord);
            if (dist > 0.5) discard;
            
            float alpha = 1.0 - (dist * 2.0);
            alpha = pow(alpha, 1.5); // Soft cloud
            
            // Low opacity for dust
            float a = alpha * vAlpha * 0.046;
            // Cap per-fragment alpha to reduce over-bright stacking.
            a = min(a, 0.005);
            gl_FragColor = vec4(vColor, a); 
        }
        `
    },
    galaxyGas: {
        vertex: `
            uniform float uTime;
            uniform float uCollapse; // 0.0 (Sphere) -> 1.0 (Disk)
            uniform float uSpiralStrength; // 0.0 -> 1.0
            uniform float uOpacity; // Overall opacity for fade effect
            uniform float uHeightScale; // 1.0 = full height, 0.0 = thin disk
            uniform float uPatternSpeed; // Rigid pattern speed
            uniform float uKeplerScale;  // Particle rotation scale
            uniform float uArmSpeedIn;   // Kepler speed multiplier inside arms
            uniform float uArmSpeedOut;  // Kepler speed multiplier outside arms
            
            attribute float aSize;
            attribute vec3 aRandomVec; // For random initial positions in sphere
            attribute vec2 aDiskPos; // Pre-calculated (Radius, Angle) for disk state
            
            varying float vAlpha;
            varying vec3 vColor;

            // Spiral Parameters
            const float SPIRAL_ARMS = 4.0;
            const float ARM_WARP = 0.12; // Angular warp amplitude (radians) at uSpiralStrength=1.0

            void main() {
                // Sphere State - center-concentrated distribution
                float rFactor = 0.3 + 0.7 * pow(length(aRandomVec), 0.5);
                vec3 posSphere = aRandomVec * 1500.0 * rFactor;
                
                // Disk State (Flat with Spiral perturbation)
                float r = aDiskPos.x; // Radius
                float theta = aDiskPos.y; // Angle
                
                // Spiral arm pattern - logarithmic spiral (POSITIVE log for trailing arms with CW rotation)
                float spiralAngle = log(r/40.0 + 1.0) * 3.0;
                
                // Density Wave Pattern (Rigid Rotation)
                float patternAngle = spiralAngle + uPatternSpeed * uTime;
                
                // If uSpiralStrength > 0, we can slightly perturb particle positions towards arms if desired
                // But for pure density wave, we mainly modulate Alpha. 
                // Let's keep position simple (Rigid Rotation) to avoid winding artifacts.
                
                // Height: spherical to disk with THICKNESS (not thin!)
                float sphereHeight = aRandomVec.z * 800.0 * (0.3 + 0.7 * r / 1000.0);
                float diskHeight = aRandomVec.z * 100.0; // THICKER DISK (was 30)
                float currentHeight = mix(sphereHeight, diskHeight, uCollapse) * uHeightScale;
                
                // Keplerian rotation for particles.
                // IMPORTANT: Avoid multiplying uTime by a time-varying factor (e.g. armMask-based speed),
                // otherwise particles will "accelerate" and can even flip rotation direction as time grows.
                float omegaK = uKeplerScale * 0.25 * (1000.0 / max(r, 1.0));
                float thetaK = theta + omegaK * uTime;

                // Density-wave phase (rigidly rotating pattern).
                float armPhase = SPIRAL_ARMS * (thetaK - patternAngle);

                // Mild angular warp that concentrates particles into arms without causing time-scaling artifacts.
                float thetaWarp = thetaK + ARM_WARP * uSpiralStrength * cos(armPhase);
                
                // Convert to Cartesian
                vec3 posDisk = vec3(
                    r * cos(thetaWarp),
                    r * sin(thetaWarp),
                    currentHeight
                );
                
                // Lerp Position
                vec3 pos = mix(posSphere, posDisk, uCollapse);
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_Position = projectionMatrix * mvPosition;
                
                // SIGNIFICANTLY LARGER particles for cloud-like gas appearance
                gl_PointSize = aSize * 20.0 * (6000.0 / -mvPosition.z);
                
                float spiralDensity = 0.5 + 0.5 * sin(armPhase);
                spiralDensity = pow(spiralDensity, 2.0); // Sharper arms contrast
                
                // Modulate by uSpiralStrength (if 0, density is uniform)
                spiralDensity = mix(1.0, spiralDensity, uSpiralStrength);
                
                // Alpha: VERY LOW brightness to prevent additive overexposure
                float baseAlpha = 0.03 + 0.02 * spiralDensity;
                vAlpha = baseAlpha * uOpacity * uCollapse;
                
                // Blue-ish gas color - dimmer to prevent blending overload
                vec3 gasBlue = vec3(0.2, 0.35, 0.7);
                vec3 gasWhite = vec3(0.4, 0.5, 0.7);
                vColor = mix(gasBlue, gasWhite, spiralDensity * 0.3);
            }
        `,
        fragment: `
            varying float vAlpha;
            varying vec3 vColor;
            
            void main() {
                vec2 coord = gl_PointCoord - vec2(0.5);
                float dist = length(coord);
                if (dist > 0.5) discard;
                
                // Very soft fuzzy gas cloud particle
                float strength = 1.0 - (dist * 2.0);
                strength = pow(strength, 0.5); // Even softer falloff for cloud effect
                
                // Clamp final alpha to prevent additive overexposure
                float finalAlpha = min(vAlpha * strength, 0.01);
                gl_FragColor = vec4(vColor * 0.3, finalAlpha);
            }
        `
    },
    planetTerrestrial: {
        vertex: `
        varying vec3 vNormal;
        varying vec3 vPos;
        void main() {
            vPos = position;
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
        `,
        fragment: `
        varying vec3 vNormal;
        varying vec3 vPos;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform float uTime;
        uniform float uSeed;
        uniform float uOpacity;
        
        // Simplex noise helper
        vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        
        float snoise(vec3 v) {
            const vec2 C = vec2(1.0/6.0, 1.0/3.0);
            const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
            
            // First corner
            vec3 i  = floor(v + dot(v, C.yyy));
            vec3 x0 = v - i + dot(i, C.xxx);
            
            // Other corners
            vec3 g = step(x0.yzx, x0.xyz);
            vec3 l = 1.0 - g;
            vec3 i1 = min( g.xyz, l.zxy );
            vec3 i2 = max( g.xyz, l.zxy );
            
            vec3 x1 = x0 - i1 + C.xxx;
            vec3 x2 = x0 - i2 + C.yyy;
            vec3 x3 = x0 - D.yyy;
            
            // Permutations
            i = mod289(i);
            vec4 p = permute( permute( permute(
                     i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                   + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                   + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
                   
            float n_ = 0.142857142857;
            vec3  ns = n_ * D.wyz - D.xzx;
            
            vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
            
            vec4 x_ = floor(j * ns.z);
            vec4 y_ = floor(j - 7.0 * x_ );
            
            vec4 x = x_ *ns.x + ns.yyyy;
            vec4 y = y_ *ns.x + ns.yyyy;
            vec4 h = 1.0 - abs(x) - abs(y);
            
            vec4 b0 = vec4( x.xy, y.xy );
            vec4 b1 = vec4( x.zw, y.zw );
            
            vec4 s0 = floor(b0)*2.0 + 1.0;
            vec4 s1 = floor(b1)*2.0 + 1.0;
            vec4 sh = -step(h, vec4(0.0));
            
            vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
            vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
            
            vec3 p0 = vec3(a0.xy,h.x);
            vec3 p1 = vec3(a0.zw,h.y);
            vec3 p2 = vec3(a1.xy,h.z);
            vec3 p3 = vec3(a1.zw,h.w);
            
            vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
            p0 *= norm.x;
            p1 *= norm.y;
            p2 *= norm.z;
            p3 *= norm.w;
            
            vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
            m = m * m;
            return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
        }

        void main() {
            vec3 n = normalize(vNormal);
            float light = max(0.1, dot(n, vec3(0.5, 0.2, 1.0))); // Simple fixed light
            
            // Noise sampling
            float noiseVal = snoise(vPos * (2.0 + uSeed * 0.5) + uSeed * 10.0);
            
            // Mix colors
            vec3 col = mix(uColorA, uColorB, smoothstep(-0.5, 0.5, noiseVal));
            
            // Fake clouds for Earth (Seed ~ 3)
            if (abs(uSeed - 3.0) < 0.1) {
                float clouds = smoothstep(0.4, 0.6, snoise(vPos * 3.0 + uTime * 0.1));
                col = mix(col, vec3(1.0), clouds);
            }
            
            gl_FragColor = vec4(col * light, uOpacity);
        }
        `
    },
    planetGasGiant: {
        vertex: `
        varying vec3 vNormal;
        varying vec3 vPos;
        void main() {
            vPos = position;
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
        `,
        fragment: `
        varying vec3 vNormal;
        varying vec3 vPos;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform float uTime;
        uniform float uTimeScale;
        uniform float uBands;
        uniform float uOpacity;
        
        float hash(float n) { return fract(sin(n) * 43758.5453123); }
        float noise(float x) {
            float i = floor(x);
            float f = fract(x);
            float u = f * f * (3.0 - 2.0 * f);
            return mix(hash(i), hash(i + 1.0), u);
        }

        void main() {
            vec3 n = normalize(vNormal);
            float light = max(0.1, dot(n, vec3(0.5, 0.2, 1.0)));
            
            // Banded structure (Y-axis based)
            float y = vPos.y * uBands;
            
            // Add turbulence
            float turb = noise(vPos.x * 2.0 + uTime * uTimeScale);
            float pattern = noise(y + turb * 0.5);
            
            vec3 col = mix(uColorA, uColorB, pattern);
            
            // Limb darkening
            float limb = 1.0 - max(0.0, dot(n, vec3(0.0, 0.0, 1.0)));
            col *= (1.0 - 0.4 * limb * limb);
            
            gl_FragColor = vec4(col * light, uOpacity);
        }
        `
    },
    planetRing: {
        vertex: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
        `,
        fragment: `
        varying vec2 vUv;
        uniform float uOpacity;
        void main() {
            vec2 center = vUv - 0.5;
            float r = length(center) * 2.0;
            
            // Ring bands
            if (r < 0.5 || r > 1.0) discard;
            
            float bands = sin(r * 40.0) * 0.5 + 0.5;
            float alpha = 0.4 + 0.6 * bands;
            
            vec3 col = vec3(0.8, 0.7, 0.5); // Saturn ring color
            
            gl_FragColor = vec4(col, alpha * uOpacity);
        }
        `
    },
    galaxyStars: {
        vertex: `
            uniform float uTime;
            uniform float uCollapse;
            uniform float uSpiralStrength;
            uniform float uDiskBrightness;  // 0.0 = dim, 1.0 = bright (disk stars)
            uniform float uHaloOpacity;     // 1.0 = visible, 0.0 = hidden (halo stars)
            uniform float uPatternSpeed;    // Rigid pattern speed
            uniform float uKeplerScale;     // Particle rotation scale
            uniform float uArmSpeedIn;      // Kepler speed multiplier inside arms
            uniform float uArmSpeedOut;     // Kepler speed multiplier outside arms
            uniform float uStarProgress;    // 0.0 -> 1.0, controls population size
            
            attribute float aSize;
            attribute vec3 aRandomVec;
            attribute vec2 aDiskPos; // (Radius, Angle)
            attribute float aIgnition; // Ignition threshold (0.0 to 1.0)
            
            varying float vAlpha;
            varying vec3 vColor;

            const float SPIRAL_ARMS = 4.0;
            const float ARM_WARP = 0.12; // Angular warp amplitude (radians) at uSpiralStrength=1.0
            
            void main() {
                // Sphere State - center-concentrated
                float rFactor = 0.3 + 0.7 * pow(length(aRandomVec), 0.5);
                vec3 posSphere = aRandomVec * 1500.0 * rFactor;
                
                // Disk State
                float r = aDiskPos.x;
                float theta = aDiskPos.y;
                
                // Spiral arm pattern - MATCHING GAS SHADER (Density Wave)
                float spiralAngle = log(r/40.0 + 1.0) * 3.0; // Positive log
                
                // Rigid Rotation for spiral pattern (Density Wave)
                float patternAngle = spiralAngle + uPatternSpeed * uTime;
                
                // Height: spherical to disk with THICKNESS
                float sphereHeight = aRandomVec.z * 800.0 * (0.3 + 0.7 * r / 1000.0);
                float diskHeight = aRandomVec.z * 80.0; // THICKER DISK
                float currentHeight = mix(sphereHeight, diskHeight, uCollapse);
                
                // Keplerian rotation for particles.
                // IMPORTANT: Avoid multiplying uTime by a time-varying factor (e.g. armMask-based speed),
                // otherwise particles will "accelerate" and can even flip rotation direction as time grows.
                float omegaK = uKeplerScale * 0.25 * (1000.0 / max(r, 1.0));
                float thetaK = theta + omegaK * uTime;
                
                // Density-wave phase (rigidly rotating pattern).
                float armPhase0 = SPIRAL_ARMS * (thetaK - patternAngle);

                // Mild angular warp that concentrates particles into arms without causing time-scaling artifacts.
                float thetaWarp = thetaK + ARM_WARP * uSpiralStrength * cos(armPhase0);
                
                vec3 posDisk = vec3(
                    r * cos(thetaWarp),
                    r * sin(thetaWarp),
                    currentHeight
                );
                
                // Determine if star is in disk or halo based on Z position
                float zNormalized = abs(aRandomVec.z);
                float isDisk = 1.0 - smoothstep(0.0, 0.3, zNormalized);
                float isHalo = smoothstep(0.2, 0.5, zNormalized);
                
                // Position mixing:
                // Disk stars: mix(posSphere, posDisk, uCollapse)
                // Halo stars: mix(posSphere, posDisk, 0.5) -- User requested 0.5 collapse for halo
                
                vec3 finalPosDisk = mix(posSphere, posDisk, uCollapse);
                vec3 finalPosHalo = mix(posSphere, posDisk, 0.8); // Halo forced to 0.8 collapse state
                
                vec3 pos = mix(finalPosDisk, finalPosHalo, isHalo);
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_Position = projectionMatrix * mvPosition;
                
                gl_PointSize = aSize * (3000.0 / -mvPosition.z);
                
                // Spiral density for arm structure (4 arms matching gas)
                float spiralDensity = 0.5 + 0.5 * sin(armPhase0);
                
                // Modulate by uSpiralStrength
                spiralDensity = mix(1.0, spiralDensity, uSpiralStrength);
                
                // Colors: Core is yellowish, Arms are blueish
                // Colors: Core is yellowish, Arms/Halo are mixed
                vec3 cCore = vec3(1.0, 0.9, 0.5); // Warmer Yellow
                vec3 cArm = vec3(0.6, 0.8, 1.0);  // Blueish

                // Generate random value (0.0 to 1.0) for each star based on its random attributes
                float colorRandom = fract(sin(dot(aRandomVec.xy, vec2(12.9898, 78.233))) * 43758.5453);
                
                // Color Type: 0.0 = Yellow, 1.0 = Blue
                // User requested 50% yellow, 50% blue for both Disk and Halo
                float colorType = step(0.5, colorRandom);
                
                vec3 mixedColor = mix(cCore, cArm, colorType);
                
                // Mix based on radius: Core forced to Yellow, Outer regions use Mixed Color
                float tColor = smoothstep(100.0, 600.0, r); 
                vColor = mix(cCore, mixedColor, tColor);
                
                // Recalculate isHalo for Alpha (broader range for brightness)
                // Reuse existing zNormalized and isDisk
                isHalo = smoothstep(0.1, 0.4, zNormalized);
                
                // ALpha: Increase halo brightness factor
                float haloFactor = uHaloOpacity * 1.5; // Boost halo brightness
                haloFactor = clamp(haloFactor, 0.0, 1.0);
                
                float diskAlpha = isDisk * uDiskBrightness;
                float haloAlpha = isHalo * haloFactor;
                float midAlpha = (1.0 - isDisk - isHalo) * mix(haloFactor, uDiskBrightness, 0.5);
                
                // Boost spiral arm stars slightly
                float armBoost = 1.0 + spiralDensity * 0.3;
                
                // Removed uCollapse from alpha since we want initial disk stars visible immediately
                // Visibility is now fully controlled by uDiskBrightness and uHaloOpacity
                vAlpha = (diskAlpha + haloAlpha + midAlpha) * uCollapse * armBoost;
                
                // Population Control: Check ignition threshold
                // If aIgnition > uStarProgress, star is invisible
                float isBorn = step(aIgnition, uStarProgress + 0.01); // +0.01 to ensure 0.0 passes at start
                vAlpha *= isBorn;
            }
        `,
        fragment: `
            varying float vAlpha;
            varying vec3 vColor;
            
            void main() {
                vec2 coord = gl_PointCoord - vec2(0.5);
                float dist = length(coord);
                if (dist > 0.5) discard;
                
                // Soft Star
                float strength = 1.0 - (dist * 2.0);
                strength = pow(strength, 2.0);
                
                gl_FragColor = vec4(vColor, vAlpha * strength);
            }
        `
    },
    galaxyBulge: {
        vertex: `
            varying vec3 vNormal;
            varying vec3 vPosition;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragment: `
            uniform vec3 uColor;
            uniform float uIntensity;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            void main() {
                vec3 viewDir = normalize(-vPosition);
                float dotNV = dot(viewDir, vNormal);
                dotNV = clamp(dotNV, 0.0, 1.0);
                
                // Soft Core Glow (Halo Style)
                // Power factor controls focus: 
                // lower = broader halo, higher = tighter core
                float alpha = pow(dotNV, 1.5); 
                
                // Soften the very edge completely
                alpha *= smoothstep(0.0, 0.2, dotNV);
                
                // Boost strength at center
                float intensity = 1.5 * alpha;

                gl_FragColor = vec4(uColor, uIntensity * intensity);
            }
        `
    }
};
