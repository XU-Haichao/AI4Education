function initIcons(root = document) {
    if (window.lucide) window.lucide.createIcons({ root, nameAttr: 'data-lucide' });
}
initIcons();

function smoothstep(min, max, value) {
    var x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
}

// Approximate cosmic age anchors (time since Big Bang) consistent with common astrophysical milestones.
// We map the UI's 0-100 timeline progress onto cosmic time via piecewise (log) interpolation.
const YEAR_S = 365.25 * 24 * 3600;
const AGE_ANCHORS = [
    { p: 0, s: 0 },                  // Big Bang
    { p: 4, s: 1e-43 },              // end Planck-epoch bucket
    { p: 7, s: 1e-36 },              // end GUT-epoch bucket
    { p: 15, s: 1e-32 },             // end inflation/reheating bucket
    { p: 18, s: 1e-12 },             // electroweak
    { p: 22, s: 1e-6 },              // QCD/hadronization order
    { p: 27, s: 1 },                 // ~1 second
    { p: 30, s: 10 },                // ~10 seconds
    { p: 35, s: 20 * 60 },           // ~20 minutes (BBN)
    { p: 43, s: 380000 * YEAR_S },   // recombination/last scattering (~380 kyr)
    { p: 50, s: 380000 * YEAR_S },   // keep near CMB decoupling
    { p: 60, s: 100e6 * YEAR_S },    // ~100 Myr
    { p: 66, s: 400e6 * YEAR_S },    // ~400 Myr
    { p: 69, s: 1e9 * YEAR_S },      // ~1 Gyr
    { p: 75, s: 3e9 * YEAR_S },      // ~3 Gyr
    { p: 86, s: 6e9 * YEAR_S },      // ~6 Gyr
    { p: 95, s: 13e9 * YEAR_S },     // ~13 Gyr
    { p: 100, s: 13.8e9 * YEAR_S }   // present day (~13.8 Gyr)
];

function ageSecondsFromProgress(progress) {
    const p = Math.max(0, Math.min(100, Number(progress) || 0));
    if (p >= 100) return AGE_ANCHORS[AGE_ANCHORS.length - 1].s;
    for (let i = 0; i < AGE_ANCHORS.length - 1; i++) {
        const a = AGE_ANCHORS[i];
        const b = AGE_ANCHORS[i + 1];
        if (p < a.p || p > b.p) continue;
        const t = (p - a.p) / (b.p - a.p || 1);
        const aS = Number(a.s) || 0;
        const bS = Number(b.s) || 0;
        if (aS > 0 && bS > 0) {
            const logA = Math.log10(aS);
            const logB = Math.log10(bS);
            return Math.pow(10, logA + (logB - logA) * t);
        }
        return aS + (bS - aS) * t;
    }
    return AGE_ANCHORS[AGE_ANCHORS.length - 1].s;
}

function stripTrailingZeros(str) {
    return String(str).replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
}

function formatFixed(value, decimals) {
    return stripTrailingZeros(Number(value).toFixed(decimals));
}

function formatAge(seconds) {
    const s = Math.max(0, Number(seconds) || 0);
    if (s === 0) return '0 s';
    if (s < 1e-3) return `${s.toExponential(0).replace('+', '')} s`;
    if (s < 1) return `${formatFixed(s, 3)} s`;
    if (s < 60) return `${formatFixed(s, 1)} s`;
    if (s < 3600) return `${formatFixed(s / 60, 1)} min`;
    if (s < 86400) return `${formatFixed(s / 3600, 1)} hr`;
    if (s < YEAR_S) return `${formatFixed(s / 86400, 1)} d`;

    const years = s / YEAR_S;
    if (years < 1e3) return `${formatFixed(years, 1)} yr`;
    if (years < 1e6) return `${formatFixed(years / 1e3, 1)} kyr`;
    if (years < 1e9) return `${formatFixed(years / 1e6, 1)} Myr`;
    return `${formatFixed(years / 1e9, 2)} Gyr`;
}

function formatAgeRange(startProgress, endProgress) {
    const a = ageSecondsFromProgress(startProgress);
    const b = ageSecondsFromProgress(endProgress);
    return `t ~ ${formatAge(a)} → ${formatAge(b)}`;
}

function buildStageDescWithAge(stage) {
    if (!stage || !Array.isArray(stage.range)) return stage && stage.desc ? stage.desc : '';
    const original = String(stage.desc || '');
    const suffix = original.includes('|') ? original.split('|').slice(1).join('|').trim() : original;
    const ageText = stage.time ? String(stage.time).trim() : formatAgeRange(stage.range[0], stage.range[1]);
    return suffix ? `${ageText} | ${suffix}` : ageText;
}

function getStageTimeRelationMeta(eraId, stage) {
    if (eraId !== 'structure-formation') return null;
    if (!stage || !Array.isArray(stage.range)) return null;
    const start = stage.range[0];
    const end = stage.range[1];

    // Galaxy formation & evolution (0.66+): many processes overlap and are not strictly sequential.
    if (start === 66 && end === 100) return { kind: 'summary', badge: '概览', icon: 'layers', ongoing: false };
    if (start === 66 && end === 69) return { kind: 'main', badge: '主线', icon: 'zap', ongoing: false };
    if (start === 69 && end === 75) return { kind: 'ongoing', badge: '贯穿', icon: 'git-merge', ongoing: true };
    if (start === 75 && end === 86) return { kind: 'ongoing', badge: '并行', icon: 'target', ongoing: true };
    if (start === 86 && end === 95) return { kind: 'ongoing', badge: '长期', icon: 'disc', ongoing: true };
    if (start === 95 && end === 100) return { kind: 'local', badge: '局部', icon: 'globe', ongoing: true };
    return null;
}

const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 20000);
camera.position.z = 50;
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

// --- Resources Setup (Should ideally be in a Factory, keeping in main for now) ---

// 1. Sphere
const geometry = new THREE.SphereGeometry(1, 128, 128);
const uniforms = { uTime: { value: 0 }, uColor: { value: new THREE.Color(0.6, 0.8, 1.0) }, uIntensity: { value: 10.0 }, uNoiseStrength: { value: 0.0 }, uNoiseMultiplier: { value: 4.0 } };
const material = new THREE.ShaderMaterial({ uniforms: uniforms, vertexShader: SHADERS.sphere.vertex, fragmentShader: SHADERS.sphere.fragment, transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

// 2. Particles
const hadronCount = 800; const leptonCount = 1200; const deuteriumCount = 100; const heliumCount = 50; const lithiumCount = 10;
const totalCount = hadronCount + leptonCount + deuteriumCount + heliumCount + lithiumCount;
const particleGeometry = new THREE.BufferGeometry();
const positions = new Float32Array(totalCount * 3); const velocities = new Float32Array(totalCount * 3); const sizes = new Float32Array(totalCount); const offsets = new Float32Array(totalCount); const speeds = new Float32Array(totalCount); const birthTimes = new Float32Array(totalCount); const deathTimes = new Float32Array(totalCount); const types = new Float32Array(totalCount);
let idx = 0; const hadronIndices = [];
for (let i = 0; i < hadronCount; i++) {
    const ii = idx++; hadronIndices.push(ii); types[ii] = 1.0; birthTimes[ii] = 0.22 + Math.random() * 0.05; deathTimes[ii] = 999.0; sizes[ii] = 2.5 + Math.random() * 1.0;
    positions[ii * 3] = (Math.random() - 0.5) * 80; positions[ii * 3 + 1] = (Math.random() - 0.5) * 50; positions[ii * 3 + 2] = (Math.random() - 0.5) * 40 + 10;
    velocities[ii * 3] = (Math.random() - 0.5) * 2; velocities[ii * 3 + 1] = (Math.random() - 0.5) * 2; velocities[ii * 3 + 2] = (Math.random() - 0.5) * 2;
    offsets[ii] = Math.random() * Math.PI * 2; speeds[ii] = 3.0 + Math.random() * 5.0;
}
for (let i = 0; i < leptonCount; i++) {
    const ii = idx++; types[ii] = 0.0; birthTimes[ii] = 0.22 + Math.random() * 0.08; deathTimes[ii] = 0.35 + Math.random() * 0.08; sizes[ii] = 0.8 + Math.random() * 0.6;
    positions[ii * 3] = (Math.random() - 0.5) * 80; positions[ii * 3 + 1] = (Math.random() - 0.5) * 50; positions[ii * 3 + 2] = (Math.random() - 0.5) * 40 + 10;
    velocities[ii * 3] = (Math.random() - 0.5) * 2; velocities[ii * 3 + 1] = (Math.random() - 0.5) * 2; velocities[ii * 3 + 2] = (Math.random() - 0.5) * 2;
    offsets[ii] = Math.random() * Math.PI * 2; speeds[ii] = 3.0 + Math.random() * 5.0;
}
function createNuclei(count, typeId, baseSize, cost) {
    for (let i = 0; i < count; i++) {
        const ii = idx++; types[ii] = typeId; const birthT = 0.30 + Math.random() * 0.05; birthTimes[ii] = birthT; deathTimes[ii] = 999.0; sizes[ii] = baseSize + Math.random() * 1.0;
        for (let k = 0; k < cost; k++) { if (hadronIndices.length > 0) { const randIndex = Math.floor(Math.random() * hadronIndices.length); const hIdx = hadronIndices[randIndex]; deathTimes[hIdx] = birthT; hadronIndices.splice(randIndex, 1); } }
        positions[ii * 3] = (Math.random() - 0.5) * 80; positions[ii * 3 + 1] = (Math.random() - 0.5) * 50; positions[ii * 3 + 2] = (Math.random() - 0.5) * 40 + 10;
        velocities[ii * 3] = (Math.random() - 0.5) * 2; velocities[ii * 3 + 1] = (Math.random() - 0.5) * 2; velocities[ii * 3 + 2] = (Math.random() - 0.5) * 2;
        offsets[ii] = Math.random() * Math.PI * 2; speeds[ii] = 0.0;
    }
}
createNuclei(deuteriumCount, 2.0, 4.0, 2); createNuclei(heliumCount, 3.0, 6.0, 4); createNuclei(lithiumCount, 4.0, 8.0, 7);
particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); particleGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3)); particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1)); particleGeometry.setAttribute('offset', new THREE.BufferAttribute(offsets, 1)); particleGeometry.setAttribute('speed', new THREE.BufferAttribute(speeds, 1)); particleGeometry.setAttribute('birthTime', new THREE.BufferAttribute(birthTimes, 1)); particleGeometry.setAttribute('deathTime', new THREE.BufferAttribute(deathTimes, 1)); particleGeometry.setAttribute('type', new THREE.BufferAttribute(types, 1));
const particleUniforms = { uTime: { value: 0 }, uMoveTime: { value: 0 }, uProgress: { value: 0 } };
const particleMaterial = new THREE.ShaderMaterial({ uniforms: particleUniforms, vertexShader: SHADERS.particle.vertex, fragmentShader: SHADERS.particle.fragment, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false });
const particles = new THREE.Points(particleGeometry, particleMaterial);
scene.add(particles);

// 3. Fog / Cloud
const fogGeometry = new THREE.SphereGeometry(720, 64, 64);
const fogUniforms = { uTime: { value: 0 }, uIntensity: { value: 0.0 }, uCollapse: { value: 0.0 } };
const fogMaterial = new THREE.ShaderMaterial({ uniforms: fogUniforms, vertexShader: SHADERS.fog.vertex, fragmentShader: SHADERS.fog.fragment, transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
const fogSphere = new THREE.Mesh(fogGeometry, fogMaterial);
fogSphere.rotation.x = 0.5; fogSphere.rotation.z = 0.2;
scene.add(fogSphere);

// 4. Accretion
const accCount = 4000;
const accGeo = new THREE.BufferGeometry();
const accPos = new Float32Array(accCount * 3); const accAngle = new Float32Array(accCount); const accRadius = new Float32Array(accCount); const accSpeed = new Float32Array(accCount);
for (let i = 0; i < accCount; i++) { const r = Math.sqrt(Math.random()); const theta = Math.random() * Math.PI * 2; const y = (Math.random() - 0.5) * 0.5; accPos[i * 3] = 0; accPos[i * 3 + 1] = y; accPos[i * 3 + 2] = 0; accRadius[i] = r; accAngle[i] = theta; accSpeed[i] = 1.0 + Math.random(); }
accGeo.setAttribute('position', new THREE.BufferAttribute(accPos, 3)); accGeo.setAttribute('angleOffset', new THREE.BufferAttribute(accAngle, 1)); accGeo.setAttribute('radiusOffset', new THREE.BufferAttribute(accRadius, 1)); accGeo.setAttribute('speed', new THREE.BufferAttribute(accSpeed, 1));
const accUniforms = { uTime: { value: 0 }, uCollapse: { value: 0.0 }, uOpacity: { value: 1.0 }, uMinRadius: { value: 0.0 }, uMaxRadius: { value: 600.0 } };
const accMaterial = new THREE.ShaderMaterial({ uniforms: accUniforms, vertexShader: SHADERS.accretion.vertex, fragmentShader: SHADERS.accretion.fragment, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
const accretionParticles = new THREE.Points(accGeo, accMaterial);
accretionParticles.rotation.x = 0.5; accretionParticles.rotation.z = 0.2;
scene.add(accretionParticles);

// 5. Infall
const infallCount = 150;
const infallGeo = new THREE.BufferGeometry();
const infallPos = new Float32Array(infallCount * 3); const infallSpeed = new Float32Array(infallCount);
for (let i = 0; i < infallCount; i++) {
    const r = 720.0 + Math.random() * 600.0; // Scaled 1.5x (720-1320)
    const theta = Math.random() * Math.PI * 2;
    // Constrain phi to be closer to equator (PI/2) to avoid rotation axis poles
    const phi = Math.PI * 0.3 + Math.random() * Math.PI * 0.4;

    infallPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    infallPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    infallPos[i * 3 + 2] = r * Math.cos(phi);
    infallSpeed[i] = 0.8 + Math.random() * 0.5;
}
infallGeo.setAttribute('position', new THREE.BufferAttribute(infallPos, 3)); infallGeo.setAttribute('speed', new THREE.BufferAttribute(infallSpeed, 1));
const infallUniforms = { uCollapse: { value: 0.0 }, uOpacity: { value: 1.0 } };
const infallMaterial = new THREE.ShaderMaterial({ uniforms: infallUniforms, vertexShader: SHADERS.infall.vertex, fragmentShader: SHADERS.infall.fragment, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
const infallParticles = new THREE.Points(infallGeo, infallMaterial);
infallParticles.rotation.x = 0.5; infallParticles.rotation.z = 0.2;
scene.add(infallParticles);

// 6. Protostar Core
const coreGeometry = new THREE.SphereGeometry(30, 64, 64); // Scaled 1.5x (30)
const coreUniforms = { uIntensity: { value: 0.0 }, uColor: { value: new THREE.Color(1.0, 0.9, 0.6) } };
const coreMaterial = new THREE.ShaderMaterial({ uniforms: coreUniforms, vertexShader: SHADERS.core.vertex, fragmentShader: SHADERS.core.fragment, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
const protostarSphere = new THREE.Mesh(coreGeometry, coreMaterial);
scene.add(protostarSphere);

// 7. Stars (Galaxy Merger System)
const starCount = 12000; // Increased for galaxy merger
const bigStarCount = 24;
const starGeometry = new THREE.BufferGeometry();
const starPositions = new Float32Array(starCount * 3);
const starSizes = new Float32Array(starCount);
const starBirthOffsets = new Float32Array(starCount);
// New attributes for merger
const starClusterIds = new Float32Array(starCount); // 0: Main, 1: Invader1, 2: Invader2, 3: Invader3
const starClusterOffsets = new Float32Array(starCount * 3); // Where the cluster originates

// Cluster Configuration
const clusters = [
    { id: 0, count: 6000, offset: [0, 0, 0], size: 1800.0, scatter: 200.0 }, // Main
    { id: 1, count: 2000, offset: [-3000, 800, -500], size: 600.0, scatter: 100.0 }, // Invader Left
    { id: 2, count: 2000, offset: [3000, -400, 500], size: 600.0, scatter: 100.0 }, // Invader Right
    { id: 3, count: 2000, offset: [0, 2500, 0], size: 700.0, scatter: 120.0 }  // Invader Top
];

let sIdx = 0;
clusters.forEach(cluster => {
    for (let k = 0; k < cluster.count; k++) {
        const i = sIdx++;
        if (i >= starCount) break;

        const theta = Math.random() * Math.PI * 2;
        // Spherical distribution for globular clusters
        const phi = Math.acos(2 * Math.random() - 1);

        // Radius distribution (dense center)
        let r = 20.0 + Math.pow(Math.random(), 2.0) * cluster.size;

        // Big stars only in main cluster center
        if (cluster.id === 0 && k < bigStarCount) {
            r = 200.0 + Math.pow(Math.random(), 2.0) * cluster.size;
            starSizes[i] = 60.0;
            starBirthOffsets[i] = 0.05 + Math.random() * 0.8;
        } else {
            starSizes[i] = 2.0 + Math.random() * 8.0;
            // Delay birth for outer stars
            starBirthOffsets[i] = (r / 2000.0) * 0.8 + 0.05;
        }

        // Local position within cluster
        const lx = r * Math.sin(phi) * Math.cos(theta);
        const ly = r * Math.sin(phi) * Math.sin(theta);
        const lz = r * Math.cos(phi);

        starPositions[i * 3] = lx;
        starPositions[i * 3 + 1] = ly; // Full sphere
        starPositions[i * 3 + 2] = lz;

        starClusterIds[i] = cluster.id;
        starClusterOffsets[i * 3] = cluster.offset[0];
        starClusterOffsets[i * 3 + 1] = cluster.offset[1];
        starClusterOffsets[i * 3 + 2] = cluster.offset[2];
    }
});

starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
starGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));
starGeometry.setAttribute('birthOffset', new THREE.BufferAttribute(starBirthOffsets, 1));
starGeometry.setAttribute('aClusterId', new THREE.BufferAttribute(starClusterIds, 1));
starGeometry.setAttribute('aClusterOffset', new THREE.BufferAttribute(starClusterOffsets, 3));

const starUniforms = { uProgress: { value: 0.0 }, uSizeScale: { value: 1.0 }, uMergerTime: { value: 0.0 } };
const starMaterial = new THREE.ShaderMaterial({ uniforms: starUniforms, vertexShader: SHADERS.star.vertex, fragmentShader: SHADERS.star.fragment, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
const starSystem = new THREE.Points(starGeometry, starMaterial);
scene.add(starSystem);

// 8. Supermassive Black Hole
// Core (Pure Black Event Horizon)
const smbhGeometry = new THREE.SphereGeometry(1.33, 64, 64); // User requested 2/3 of 2.0
const smbhMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
const smbhSphere = new THREE.Mesh(smbhGeometry, smbhMaterial);
smbhSphere.visible = false;
scene.add(smbhSphere);

// Glow (Atmosphere/Halo)
const smbhGlowGeometry = new THREE.SphereGeometry(1.66, 64, 64); // Scaled similarly
const smbhUniforms = {};
const smbhGlowMaterial = new THREE.ShaderMaterial({
    uniforms: smbhUniforms,
    vertexShader: SHADERS.blackHole.vertex,
    fragmentShader: SHADERS.blackHole.fragment,
    transparent: true,
    side: THREE.BackSide, // Key for outward glow effect
    blending: THREE.AdditiveBlending
});
const smbhGlowSphere = new THREE.Mesh(smbhGlowGeometry, smbhGlowMaterial);
smbhGlowSphere.visible = false;
scene.add(smbhGlowSphere);

// 9. Galaxy Nucleus (Bright Glow t=0.75-0.77)
const nucleusGeometry = new THREE.SphereGeometry(60, 64, 64);
const nucleusUniforms = { uOpacity: { value: 0.0 } };
const nucleusMaterial = new THREE.ShaderMaterial({
    uniforms: nucleusUniforms,
    vertexShader: SHADERS.nucleus.vertex,
    fragmentShader: SHADERS.nucleus.fragment,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide
});
const nucleusSphere = new THREE.Mesh(nucleusGeometry, nucleusMaterial);
nucleusSphere.visible = false;
scene.add(nucleusSphere);

// 10. AGN Accretion Disk (t=0.77 - 0.84)
const agnCount = 50000;
const agnGeometry = new THREE.BufferGeometry();
const agnPhases = new Float32Array(agnCount);
const agnRadii = new Float32Array(agnCount);
const agnSpeeds = new Float32Array(agnCount);

for (let i = 0; i < agnCount; i++) {
    agnPhases[i] = Math.random() * Math.PI * 2;
    agnRadii[i] = Math.random(); // 0 to 1
    agnSpeeds[i] = 0.5 + Math.random();
}

// Dummy position attribute (needed for Three.js to know vertex count / frustum culling)
const agnPositions = new Float32Array(agnCount * 3); // Zeros
agnGeometry.setAttribute('position', new THREE.BufferAttribute(agnPositions, 3));

agnGeometry.setAttribute('aPhase', new THREE.BufferAttribute(agnPhases, 1));
agnGeometry.setAttribute('aRadius', new THREE.BufferAttribute(agnRadii, 1));
agnGeometry.setAttribute('aSpeed', new THREE.BufferAttribute(agnSpeeds, 1));

const agnUniforms = {
    uTime: { value: 0.0 },
    uInnerRad: { value: 100.0 }, // Starts far out
    uOuterRad: { value: 105.0 },
    uOpacity: { value: 1.0 } // Added
};

const agnMaterial = new THREE.ShaderMaterial({
    uniforms: agnUniforms,
    vertexShader: SHADERS.agnDisk.vertex,
    fragmentShader: SHADERS.agnDisk.fragment,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
});

const agnSystem = new THREE.Points(agnGeometry, agnMaterial);
agnSystem.visible = false;
scene.add(agnSystem);

// Rotation Logic:
// Normal vector from Theta=20, Phi=30 in User Frame (X=Out, Y=Right, Z=Up)
// User V = (sin20 cos30, sin20 sin30, cos20)
// Converted to Three: (UserY, UserZ, UserX) -> (sin20 sin30, cos20, sin20 cos30)
// Target Y-axis for our disk (since points are in XZ plane) should be this vector.
// V = (0.171, 0.940, 0.296)
const targetNormal = new THREE.Vector3(
    Math.sin(20 * Math.PI / 180) * Math.sin(30 * Math.PI / 180),
    Math.cos(20 * Math.PI / 180),
    Math.sin(20 * Math.PI / 180) * Math.cos(30 * Math.PI / 180)
).normalize();

const initialNormal = new THREE.Vector3(0, 1, 0);
agnSystem.quaternion.setFromUnitVectors(initialNormal, targetNormal);

// 11. Relativistic Jet (t=0.81 - 0.84)
const jetCount = 50000;
const jetGeometry = new THREE.BufferGeometry();
const jetPos = new Float32Array(jetCount * 3);
const jetSides = new Float32Array(jetCount);
const jetSpeeds = new Float32Array(jetCount);
const jetOffsets = new Float32Array(jetCount);
const jetRadialOffsets = new Float32Array(jetCount);
const jetDensitySeeds = new Float32Array(jetCount);
const jetAngleSeeds = new Float32Array(jetCount);

for (let i = 0; i < jetCount; i++) {
    jetSides[i] = (i % 2 === 0) ? 1.0 : -1.0;
    jetSpeeds[i] = 0.5 + Math.random() * 0.5;
    jetOffsets[i] = Math.random(); // 0-1
    jetRadialOffsets[i] = Math.random(); // 0 (center) to 1 (edge)
    jetDensitySeeds[i] = Math.random(); // Independent density gate
    jetAngleSeeds[i] = Math.random(); // Independent angle
}

jetGeometry.setAttribute('position', new THREE.BufferAttribute(jetPos, 3));
jetGeometry.setAttribute('aSide', new THREE.BufferAttribute(jetSides, 1));
jetGeometry.setAttribute('aSpeed', new THREE.BufferAttribute(jetSpeeds, 1));
jetGeometry.setAttribute('aOffset', new THREE.BufferAttribute(jetOffsets, 1));
jetGeometry.setAttribute('aRadialOffset', new THREE.BufferAttribute(jetRadialOffsets, 1));
jetGeometry.setAttribute('aDensitySeed', new THREE.BufferAttribute(jetDensitySeeds, 1));
jetGeometry.setAttribute('aAngleSeed', new THREE.BufferAttribute(jetAngleSeeds, 1));

const jetUniforms = {
    uTime: { value: 0.0 },
    uSpeedScale: { value: 20.0 },
    uDensity: { value: 0.0 }, // Starts hidden
    uMaxDistance: { value: 0.0 }, // Starts explicitly at length 0
    uBHRadius: { value: 1.33 },
    uBaseRadius: { value: 1.33 * 2.0 }, // 2x SMBH radius
    uConeAngle: { value: THREE.MathUtils.degToRad(15.0) }, // 15 degrees (near)
    uConeAngleMin: { value: THREE.MathUtils.degToRad(6.0) }, // 6 degrees (far)
    uBrightnessScale: { value: 1.0 },
    uNearPointMin: { value: 0.2 },
    uNearPointHeight: { value: 20.0 }
};

const jetMaterial = new THREE.ShaderMaterial({
    uniforms: jetUniforms,
    vertexShader: SHADERS.relativisticJet.vertex,
    fragmentShader: SHADERS.relativisticJet.fragment,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
});

const jetSystem = new THREE.Points(jetGeometry, jetMaterial);
jetSystem.visible = false;
jetSystem.frustumCulled = false;
// Apply same rotation as AGN
jetSystem.quaternion.copy(agnSystem.quaternion);
scene.add(jetSystem);

// 12. Dust Torus (3D Donut)
const torusCount = 26000;
const torusGeometry = new THREE.BufferGeometry();
const torusPhases = new Float32Array(torusCount);
const torusRadii = new Float32Array(torusCount);
const torusHeights = new Float32Array(torusCount);
const torusSpeeds = new Float32Array(torusCount);

for (let i = 0; i < torusCount; i++) {
    torusPhases[i] = Math.random() * Math.PI * 2;
    torusRadii[i] = Math.random(); // 0-1
    // Gaussian-like height
    let h = (Math.random() + Math.random() + Math.random() + Math.random() - 2.0) / 2.0;
    torusHeights[i] = h;
    torusSpeeds[i] = 0.5 + Math.random();
}

torusGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(torusCount * 3), 3));
torusGeometry.setAttribute('aPhase', new THREE.BufferAttribute(torusPhases, 1));
torusGeometry.setAttribute('aRadius', new THREE.BufferAttribute(torusRadii, 1));
torusGeometry.setAttribute('aHeight', new THREE.BufferAttribute(torusHeights, 1));
torusGeometry.setAttribute('aSpeed', new THREE.BufferAttribute(torusSpeeds, 1));

const torusUniforms = {
    uTime: { value: 0.0 },
    uInnerRad: { value: 105.0 * 2.0 }, // 2x AGN Outer
    uOuterRad: { value: 105.0 * 5.0 }, // 5x AGN Outer
    uHeightScale: { value: 104.0 }, // Thick donut
    uOpacity: { value: 0.0 },
    uPointScale: { value: 1.0 }
};

const torusMaterial = new THREE.ShaderMaterial({
    uniforms: torusUniforms,
    vertexShader: SHADERS.dustTorus.vertex,
    fragmentShader: SHADERS.dustTorus.fragment,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
});

const torusSystem = new THREE.Points(torusGeometry, torusMaterial);
torusSystem.visible = false;
torusSystem.frustumCulled = false;
torusSystem.quaternion.copy(agnSystem.quaternion);
scene.add(torusSystem);

// --- Context Object ---
const context = {
    scene, camera,
    sphere, uniforms,
    particles, particleUniforms,
    fogSphere, fogUniforms,
    accretionParticles, accUniforms,
    infallParticles, infallUniforms,
    protostarSphere, coreUniforms,
    starSystem, starUniforms,
    smbhSphere, smbhUniforms,
    smbhGlowSphere,
    nucleusSphere, nucleusUniforms,
    agnSystem, agnUniforms,
    jetSystem, jetUniforms,
    torusSystem, torusUniforms
};

// --- UI & Animation ---
const uiElements = {
    title: document.getElementById('era-title'),
    eraCategory: document.getElementById('era-category'),
    indicator: document.getElementById('era-indicator'),
    desc: document.getElementById('era-description'),
    subStages: document.getElementById('sub-stages-list'),
    progressBar: document.getElementById('timeline-progress-bar'),
    handle: document.getElementById('timeline-handle'),
    tooltip: document.getElementById('handle-tooltip'),
    displayTime: document.getElementById('display-time'),
    displayTemp: document.getElementById('display-temp'),
    parallelNote: document.getElementById('parallel-process-note'),
    galaxyLabel: document.getElementById('label-galaxy-evolution'),
    assetsList: document.getElementById('era-assets-list'),
    adminToggle: document.getElementById('admin-mode-toggle'),
    adminPanel: document.getElementById('admin-panel'),
    adminCurrentStage: document.getElementById('admin-current-stage'),
    adminEditor: document.getElementById('admin-text-editor'),
    adminUploadImage: document.getElementById('admin-upload-image'),
    adminUploadVideo: document.getElementById('admin-upload-video'),
    adminUploadDoc: document.getElementById('admin-upload-doc'),
    adminLinkTitle: document.getElementById('admin-link-title'),
    adminLinkUrl: document.getElementById('admin-link-url'),
    adminAddLink: document.getElementById('admin-add-link'),
    adminSave: document.getElementById('admin-save-content'),
    adminBindStorage: document.getElementById('admin-bind-storage'),
    adminStorageStatus: document.getElementById('admin-storage-status'),
    adminAttachmentsManage: document.getElementById('admin-attachments-manage'),
    mediaModal: document.getElementById('media-preview-modal'),
    mediaModalClose: document.getElementById('media-preview-close'),
    mediaModalContent: document.getElementById('media-preview-content'),
    adminLoginModal: document.getElementById('admin-login-modal'),
    adminPasswordInput: document.getElementById('admin-password-input'),
    adminLoginError: document.getElementById('admin-login-error'),
    adminLoginCancel: document.getElementById('admin-login-cancel'),
    adminLoginConfirm: document.getElementById('admin-login-confirm'),
    labels: {
        'very-early': document.getElementById('label-early'),
        'particle-formation': document.getElementById('label-particle'),
        'matter-creation': document.getElementById('label-matter'),
        'structure-formation': document.getElementById('label-structure')
    }
};
let currentProgress = 0;
let isDragging = false;
const clock = new THREE.Clock();
let simTime = 0;
const ORIGIN = new THREE.Vector3(0, 0, 0);
const ADMIN_PASSWORD = 'zjuphy';
const ADMIN_STAGE_STORAGE_KEY = 'cosmos.admin.stageContent.v1';
const ADMIN_PROJECT_CONTENT_PATH = 'admin_uploads/content.json';
const ADMIN_FS_DB_NAME = 'cosmos-admin-fs';
const ADMIN_FS_STORE = 'handles';
const ADMIN_FS_HANDLE_KEY = 'root';
let isAdminMode = false;
let currentStageMeta = null;
let stageCustomContent = {};
let uploadRootHandle = null;
const runtimeAttachmentURLs = new Map();
let lastRenderedStageKey = '';
let projectContentPersistTimer = null;

let uiUpdatePending = false;
function scheduleUIUpdate() {
    if (uiUpdatePending) return;
    uiUpdatePending = true;
    requestAnimationFrame(() => {
        uiUpdatePending = false;
        updateUI();
    });
}

function resetStageStateForTime(t) {
    // Camera defaults: most stages assume a centered camera looking at origin.
    // SolarSystemStage intentionally overrides camera position/orientation (t >= 0.95).
    if (t < 0.95) {
        camera.position.x = 0;
        camera.position.y = 0;
        if (t < 0.50) camera.position.z = 50;
        camera.up.set(0, 1, 0);
        camera.lookAt(ORIGIN);
    }

    // Hard stop all non-current stage visuals each frame to make timeline jumps safe.
    sphere.visible = false;
    fogSphere.visible = false;
    protostarSphere.visible = false;
    accretionParticles.visible = false;
    infallParticles.visible = false;
    starSystem.visible = false;
    if (smbhSphere) smbhSphere.visible = false;
    if (smbhGlowSphere) smbhGlowSphere.visible = false;
    if (nucleusSphere) nucleusSphere.visible = false;
    if (agnSystem) agnSystem.visible = false;
    if (jetSystem) jetSystem.visible = false;
    if (torusSystem) torusSystem.visible = false;

    // Stage modules with their own systems (created lazily).
    if (typeof DarkAges !== 'undefined' && DarkAges.initialized && DarkAges.system) {
        DarkAges.system.visible = false;
    }
    if (typeof GalaxySpiral !== 'undefined' && GalaxySpiral.initialized) {
        if (GalaxySpiral.systemGas) GalaxySpiral.systemGas.visible = false;
        if (GalaxySpiral.systemStars) GalaxySpiral.systemStars.visible = false;
        if (GalaxySpiral.systemBulge) GalaxySpiral.systemBulge.visible = false;
    }
    if (typeof SolarSystemStage !== 'undefined' && SolarSystemStage.initialized && SolarSystemStage.group) {
        SolarSystemStage.group.visible = false;
    }
}

// --- Autoplay (0 -> 1 in ~2 minutes) ---
const AUTOPLAY_DURATION_S = 120;
const AUTOPLAY_BASE_RATE = 100 / AUTOPLAY_DURATION_S; // progress percent per second at 1x
let autoplayEnabled = true;
let resumeAutoplayAfterDrag = true;
let autoplaySpeed = 1;

const autoplayToggleBtn = document.getElementById('autoplay-toggle');
const autoplayRestartBtn = document.getElementById('autoplay-restart');
const autoplayIcon = document.getElementById('autoplay-icon');
const autoplaySpeedBtns = Array.from(document.querySelectorAll('.autoplay-speed-btn'));

function renderAutoplaySpeedUI() {
    for (const btn of autoplaySpeedBtns) {
        const speed = Number(btn.dataset.speed || '1');
        const isActive = Math.abs(speed - autoplaySpeed) < 1e-9;
        btn.classList.toggle('bg-blue-500/20', isActive);
        btn.classList.toggle('text-blue-200', isActive);
        btn.classList.toggle('font-semibold', isActive);
    }
}

function setAutoplaySpeed(speed) {
    const s = Number(speed);
    if (!Number.isFinite(s) || s <= 0) return;
    autoplaySpeed = s;
    try { localStorage.setItem('cosmos.autoplaySpeed', String(autoplaySpeed)); } catch { }
    renderAutoplaySpeedUI();
}

function setAutoplayEnabled(enabled) {
    autoplayEnabled = Boolean(enabled);
    if (autoplayIcon) {
        autoplayIcon.innerHTML = autoplayEnabled
            ? '<i data-lucide="pause" class="w-4 h-4"></i>'
            : '<i data-lucide="play" class="w-4 h-4"></i>';
        initIcons(autoplayIcon);
    }
}

function restartAutoplay() {
    currentProgress = 0;
    simTime = 0;
    particleMoveTime = 0;
    scheduleUIUpdate();
    setAutoplayEnabled(true);
}

if (autoplayToggleBtn) autoplayToggleBtn.addEventListener('click', () => setAutoplayEnabled(!autoplayEnabled));
if (autoplayRestartBtn) autoplayRestartBtn.addEventListener('click', restartAutoplay);
for (const btn of autoplaySpeedBtns) {
    btn.addEventListener('click', () => setAutoplaySpeed(btn.dataset.speed));
}
try {
    const saved = Number(localStorage.getItem('cosmos.autoplaySpeed'));
    if (Number.isFinite(saved) && saved > 0) autoplaySpeed = saved;
} catch { }
renderAutoplaySpeedUI();
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        setAutoplayEnabled(!autoplayEnabled);
    } else if (e.key && e.key.toLowerCase() === 'r') {
        restartAutoplay();
    }
});

function canUseFileSystemAPI() {
    return typeof window.showDirectoryPicker === 'function';
}

function sanitizeFileName(name) {
    return String(name || 'file').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_');
}

function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeStageCustomContent(raw) {
    if (!isPlainObject(raw)) return {};
    const out = {};
    for (const [key, record] of Object.entries(raw)) {
        if (!isPlainObject(record)) continue;
        const text = typeof record.text === 'string' ? record.text : '';
        const attachmentsRaw = Array.isArray(record.attachments) ? record.attachments : [];
        const attachments = attachmentsRaw
            .filter(att => isPlainObject(att) && typeof att.id === 'string' && typeof att.type === 'string')
            .map(att => ({ ...att }));
        out[key] = { text, attachments };
    }
    return out;
}

function mergeStageCustomContent(baseContent, overrideContent) {
    const base = normalizeStageCustomContent(baseContent);
    const override = normalizeStageCustomContent(overrideContent);
    const keys = new Set([...Object.keys(base), ...Object.keys(override)]);
    const merged = {};
    for (const key of keys) {
        const b = base[key] || { text: '', attachments: [] };
        const o = override[key] || { text: '', attachments: [] };
        const text = (typeof o.text === 'string' && o.text.trim()) ? o.text : b.text;

        const outAttachments = [];
        const seen = new Set();
        for (const att of (Array.isArray(o.attachments) ? o.attachments : [])) {
            if (!att || typeof att.id !== 'string' || seen.has(att.id)) continue;
            seen.add(att.id);
            outAttachments.push(att);
        }
        for (const att of (Array.isArray(b.attachments) ? b.attachments : [])) {
            if (!att || typeof att.id !== 'string' || seen.has(att.id)) continue;
            seen.add(att.id);
            outAttachments.push(att);
        }
        merged[key] = { text: text || '', attachments: outAttachments };
    }
    return merged;
}

async function loadStageCustomContentFromProjectFile() {
    try {
        const res = await fetch(ADMIN_PROJECT_CONTENT_PATH, { cache: 'no-store' });
        if (!res.ok) return null;
        const json = await res.json();
        return normalizeStageCustomContent(json);
    } catch {
        return null;
    }
}

async function persistStageCustomContentToProjectFile() {
    if (!uploadRootHandle) return false;
    if (!canUseFileSystemAPI()) return false;
    try {
        const status = await uploadRootHandle.queryPermission({ mode: 'readwrite' });
        if (status !== 'granted') return false;
        const dirs = await ensureUploadFolders();
        const fileHandle = await dirs.uploadDir.getFileHandle('content.json', { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(stageCustomContent, null, 2));
        await writable.close();
        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
}

function scheduleProjectContentPersist() {
    if (projectContentPersistTimer) clearTimeout(projectContentPersistTimer);
    projectContentPersistTimer = setTimeout(() => {
        projectContentPersistTimer = null;
        persistStageCustomContentToProjectFile().catch(() => { });
    }, 250);
}

function loadStageCustomContent() {
    try {
        const raw = localStorage.getItem(ADMIN_STAGE_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

function saveStageCustomContent() {
    try {
        localStorage.setItem(ADMIN_STAGE_STORAGE_KEY, JSON.stringify(stageCustomContent));
    } catch { }
    scheduleProjectContentPersist();
}

function getStageRecord(stageKey, createIfMissing) {
    if (!stageCustomContent[stageKey] && createIfMissing) {
        stageCustomContent[stageKey] = { text: '', attachments: [] };
    }
    return stageCustomContent[stageKey] || null;
}

function buildStageKey(era, stage) {
    const start = stage && Array.isArray(stage.range) ? stage.range[0] : 'na';
    const end = stage && Array.isArray(stage.range) ? stage.range[1] : 'na';
    return `${era.id}::${start}-${end}::${stage.name}`;
}

function getDefaultStageText(currentEra, activeStage) {
    if (activeStage && activeStage.text) return activeStage.text;
    return currentEra.description || '';
}

async function openFsDb() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(ADMIN_FS_DB_NAME, 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(ADMIN_FS_STORE)) {
                db.createObjectStore(ADMIN_FS_STORE);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function persistRootHandle(handle) {
    if (!handle || !window.indexedDB) return;
    const db = await openFsDb();
    await new Promise((resolve, reject) => {
        const tx = db.transaction(ADMIN_FS_STORE, 'readwrite');
        tx.objectStore(ADMIN_FS_STORE).put(handle, ADMIN_FS_HANDLE_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
    db.close();
}

async function loadPersistedRootHandle() {
    if (!window.indexedDB) return null;
    const db = await openFsDb();
    const handle = await new Promise((resolve, reject) => {
        const tx = db.transaction(ADMIN_FS_STORE, 'readonly');
        const req = tx.objectStore(ADMIN_FS_STORE).get(ADMIN_FS_HANDLE_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
    });
    db.close();
    return handle;
}

async function ensureDirectoryPermission(handle, writable) {
    if (!handle) return false;
    const mode = writable ? 'readwrite' : 'read';
    let status = await handle.queryPermission({ mode });
    if (status === 'granted') return true;
    status = await handle.requestPermission({ mode });
    return status === 'granted';
}

async function ensureUploadFolders() {
    if (!uploadRootHandle) throw new Error('未绑定存储目录');
    const uploadDir = await uploadRootHandle.getDirectoryHandle('admin_uploads', { create: true });
    const imagesDir = await uploadDir.getDirectoryHandle('images', { create: true });
    const videosDir = await uploadDir.getDirectoryHandle('videos', { create: true });
    const docsDir = await uploadDir.getDirectoryHandle('docs', { create: true });
    return { uploadDir, imagesDir, videosDir, docsDir };
}

async function saveFileToStageDirectory(file, type) {
    const hasPermission = await ensureDirectoryPermission(uploadRootHandle, true);
    if (!hasPermission) throw new Error('未授予目录写入权限');
    const dirs = await ensureUploadFolders();
    const targetDir = type === 'image' ? dirs.imagesDir : (type === 'video' ? dirs.videosDir : dirs.docsDir);
    const safeName = `${Date.now()}_${sanitizeFileName(file.name)}`;
    const fileHandle = await targetDir.getFileHandle(safeName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(file);
    await writable.close();
    const folder = type === 'image' ? 'images' : (type === 'video' ? 'videos' : 'docs');
    return {
        fileName: file.name,
        mimeType: file.type || '',
        relativePath: `admin_uploads/${folder}/${safeName}`
    };
}

async function readFileFromRelativePath(relativePath) {
    if (!uploadRootHandle || !relativePath) return null;
    const hasPermission = await ensureDirectoryPermission(uploadRootHandle, false);
    if (!hasPermission) return null;
    const segments = String(relativePath).split('/').filter(Boolean);
    if (!segments.length) return null;
    let dir = uploadRootHandle;
    for (let i = 0; i < segments.length - 1; i++) {
        dir = await dir.getDirectoryHandle(segments[i], { create: false });
    }
    const fileHandle = await dir.getFileHandle(segments[segments.length - 1], { create: false });
    return fileHandle.getFile();
}

function getAttachmentRuntimeURL(attachment) {
    return runtimeAttachmentURLs.get(attachment.id) || null;
}

async function ensureAttachmentRuntimeURL(attachment) {
    if (attachment.type === 'link') return null;
    const cached = getAttachmentRuntimeURL(attachment);
    if (cached) return cached;
    try {
        const file = await readFileFromRelativePath(attachment.relativePath);
        if (!file) return attachment.relativePath || null;
        const url = URL.createObjectURL(file);
        runtimeAttachmentURLs.set(attachment.id, url);
        return url;
    } catch {
        return attachment.relativePath || null;
    }
}

function openMediaPreview(type, src, title) {
    if (!uiElements.mediaModal || !uiElements.mediaModalContent || !src) return;
    uiElements.mediaModalContent.innerHTML = '';
    if (type === 'image') {
        const img = document.createElement('img');
        img.src = src;
        img.alt = title || 'image';
        uiElements.mediaModalContent.appendChild(img);
    } else if (type === 'video') {
        const video = document.createElement('video');
        video.src = src;
        video.controls = true;
        video.autoplay = true;
        video.playsInline = true;
        uiElements.mediaModalContent.appendChild(video);
    }
    uiElements.mediaModal.classList.remove('hidden');
    uiElements.mediaModal.classList.add('modal-open');
}

function closeMediaPreview() {
    if (!uiElements.mediaModal || !uiElements.mediaModalContent) return;
    uiElements.mediaModal.classList.remove('modal-open');
    uiElements.mediaModal.classList.add('hidden');
    uiElements.mediaModalContent.innerHTML = '';
}

function openAdminLoginModal() {
    if (!uiElements.adminLoginModal) return;
    if (uiElements.adminLoginError) uiElements.adminLoginError.classList.add('hidden');
    if (uiElements.adminPasswordInput) uiElements.adminPasswordInput.value = '';
    uiElements.adminLoginModal.classList.remove('hidden');
    uiElements.adminLoginModal.classList.add('modal-open');
    if (uiElements.adminPasswordInput) uiElements.adminPasswordInput.focus();
}

function closeAdminLoginModal() {
    if (!uiElements.adminLoginModal) return;
    uiElements.adminLoginModal.classList.remove('modal-open');
    uiElements.adminLoginModal.classList.add('hidden');
}

function submitAdminPassword() {
    const password = (uiElements.adminPasswordInput && uiElements.adminPasswordInput.value || '').trim();
    if (password === ADMIN_PASSWORD) {
        closeAdminLoginModal();
        setAdminMode(true);
        return;
    }
    if (uiElements.adminLoginError) uiElements.adminLoginError.classList.remove('hidden');
}

function renderAdminAttachments(stageMeta) {
    if (!uiElements.adminAttachmentsManage) return;
    const record = stageMeta ? getStageRecord(stageMeta.key, false) : null;
    const attachments = record && Array.isArray(record.attachments) ? record.attachments : [];
    uiElements.adminAttachmentsManage.innerHTML = '';
    if (!attachments.length) {
        uiElements.adminAttachmentsManage.innerHTML = '<p class="text-[10px] text-gray-500">当前时期暂无已保存附件。</p>';
        return;
    }
    attachments.forEach((att) => {
        const row = document.createElement('div');
        row.className = 'admin-attachment-row';
        const name = att.type === 'link' ? `${att.title} (链接)` : `${att.fileName} (${att.type})`;
        const text = document.createElement('span');
        text.className = 'text-[10px] text-gray-300 truncate';
        text.textContent = name;
        text.title = name;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = '删除';
        btn.addEventListener('click', () => {
            const rec = getStageRecord(stageMeta.key, false);
            if (!rec || !Array.isArray(rec.attachments)) return;
            rec.attachments = rec.attachments.filter(x => x.id !== att.id);
            saveStageCustomContent();
            renderAdminAttachments(stageMeta);
            renderStageAttachments(stageMeta);
        });
        row.appendChild(text);
        row.appendChild(btn);
        uiElements.adminAttachmentsManage.appendChild(row);
    });
}

function setStorageStatus(text, isOk) {
    if (!uiElements.adminStorageStatus) return;
    uiElements.adminStorageStatus.textContent = text;
    uiElements.adminStorageStatus.className = `text-[10px] ${isOk ? 'text-emerald-300' : 'text-gray-400'}`;
}

function setStageEditorValue(stageMeta, fallbackText) {
    if (!uiElements.adminEditor) return;
    const record = stageMeta ? getStageRecord(stageMeta.key, false) : null;
    const customText = record && typeof record.text === 'string' ? record.text : '';
    uiElements.adminEditor.value = customText || fallbackText || '';
}

function getDisplayTextForStage(stageMeta, fallbackText) {
    const record = stageMeta ? getStageRecord(stageMeta.key, false) : null;
    const customText = record && typeof record.text === 'string' ? record.text.trim() : '';
    return customText || fallbackText || '';
}

function getStageAttachments(stageMeta) {
    const record = stageMeta ? getStageRecord(stageMeta.key, false) : null;
    return record && Array.isArray(record.attachments) ? record.attachments : [];
}

async function renderStageAttachments(stageMeta) {
    if (!uiElements.assetsList) return;
    uiElements.assetsList.innerHTML = '';
    const attachments = getStageAttachments(stageMeta);
    if (!attachments.length) {
        uiElements.assetsList.innerHTML = '<p class="text-gray-500">当前时期暂无附件。</p>';
        return;
    }

    for (const att of attachments) {
        const item = document.createElement('div');
        item.className = 'asset-item';
        if (att.type === 'link') {
            const link = document.createElement('a');
            link.href = att.url || '#';
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.className = 'text-blue-300 hover:text-blue-200 underline';
            link.textContent = att.title || '未命名链接';
            item.appendChild(link);
            uiElements.assetsList.appendChild(item);
            continue;
        }

        const src = await ensureAttachmentRuntimeURL(att);
        if ((att.type === 'image' || att.type === 'video') && src) {
            if (att.type === 'image') {
                const img = document.createElement('img');
                img.className = 'asset-thumb';
                img.src = src;
                img.alt = att.fileName || 'image';
                img.addEventListener('click', () => openMediaPreview('image', src, att.fileName));
                item.appendChild(img);
            } else {
                const video = document.createElement('video');
                video.className = 'asset-thumb';
                video.src = src;
                video.muted = true;
                video.preload = 'metadata';
                video.playsInline = true;
                video.addEventListener('click', () => openMediaPreview('video', src, att.fileName));
                item.appendChild(video);
            }
            const label = document.createElement('div');
            label.className = 'asset-label';
            label.textContent = att.fileName || '';
            item.appendChild(label);
        } else {
            const link = document.createElement('a');
            link.className = 'text-blue-300 hover:text-blue-200 underline break-all';
            link.textContent = att.fileName || '未命名文档';
            if (src) {
                link.href = src;
                link.download = att.fileName || '';
            } else {
                link.href = '#';
            }
            item.appendChild(link);
        }
        uiElements.assetsList.appendChild(item);
    }
}

function syncAdminPanel(stageMeta, fallbackText) {
    if (!uiElements.adminCurrentStage) return;
    uiElements.adminCurrentStage.textContent = stageMeta ? stageMeta.label : '';
    if (isAdminMode) {
        setStageEditorValue(stageMeta, fallbackText);
        renderAdminAttachments(stageMeta);
    }
}

function renderAdminToggleButton() {
    if (!uiElements.adminToggle) return;
    const label = isAdminMode ? '退出管理员模式' : '管理员模式';
    uiElements.adminToggle.innerHTML = `<i data-lucide="shield-check" class="w-3.5 h-3.5"></i>${label}`;
    initIcons(uiElements.adminToggle);
}

function setAdminMode(enabled) {
    isAdminMode = Boolean(enabled);
    if (uiElements.adminPanel) uiElements.adminPanel.classList.toggle('hidden', !isAdminMode);
    renderAdminToggleButton();
    if (isAdminMode && currentStageMeta) {
        setStageEditorValue(currentStageMeta, currentStageMeta.fallbackText);
        renderAdminAttachments(currentStageMeta);
    }
}

async function bindStorageDirectory() {
    if (!canUseFileSystemAPI()) {
        setStorageStatus('当前浏览器不支持本地目录写入。建议使用最新版 Chrome/Edge。', false);
        return false;
    }
    try {
        const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
        uploadRootHandle = handle;
        await ensureUploadFolders();
        await persistRootHandle(handle);
        scheduleProjectContentPersist();
        setStorageStatus('已绑定目录，附件将保存到所选目录/admin_uploads 下。建议选择项目根目录。', true);
        return true;
    } catch {
        setStorageStatus('目录绑定已取消或失败。', false);
        return false;
    }
}

async function addUploadedFiles(files, type) {
    if (!currentStageMeta) return;
    if (!files || !files.length) return;
    if (!uploadRootHandle) {
        const ok = await bindStorageDirectory();
        if (!ok || !uploadRootHandle) {
            alert('未绑定目录，无法保存附件。');
            return;
        }
    }
    const rec = getStageRecord(currentStageMeta.key, true);
    for (const file of files) {
        try {
            const saved = await saveFileToStageDirectory(file, type);
            rec.attachments.push({
                id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                type,
                fileName: saved.fileName,
                mimeType: saved.mimeType,
                relativePath: saved.relativePath,
                createdAt: new Date().toISOString()
            });
        } catch (err) {
            console.error(err);
            alert(`保存文件失败: ${file.name}`);
        }
    }
    saveStageCustomContent();
    renderAdminAttachments(currentStageMeta);
    await renderStageAttachments(currentStageMeta);
}

function addStageLink() {
    if (!currentStageMeta) return;
    const title = (uiElements.adminLinkTitle && uiElements.adminLinkTitle.value || '').trim();
    const url = (uiElements.adminLinkUrl && uiElements.adminLinkUrl.value || '').trim();
    if (!title || !url) {
        alert('请输入链接标题和 URL。');
        return;
    }
    const rec = getStageRecord(currentStageMeta.key, true);
    rec.attachments.push({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: 'link',
        title,
        url,
        createdAt: new Date().toISOString()
    });
    if (uiElements.adminLinkTitle) uiElements.adminLinkTitle.value = '';
    if (uiElements.adminLinkUrl) uiElements.adminLinkUrl.value = '';
    saveStageCustomContent();
    renderAdminAttachments(currentStageMeta);
    renderStageAttachments(currentStageMeta);
}

function saveCurrentStageText() {
    if (!currentStageMeta || !uiElements.adminEditor) return;
    const rec = getStageRecord(currentStageMeta.key, true);
    rec.text = uiElements.adminEditor.value || '';
    saveStageCustomContent();
    scheduleUIUpdate();
}

async function initAdminMode() {
    const localContent = normalizeStageCustomContent(loadStageCustomContent());
    stageCustomContent = localContent;
    const fileContent = await loadStageCustomContentFromProjectFile();
    if (fileContent) {
        stageCustomContent = mergeStageCustomContent(fileContent, localContent);
        saveStageCustomContent();
        scheduleUIUpdate();
    }
    renderAdminToggleButton();
    if (canUseFileSystemAPI()) {
        try {
            const handle = await loadPersistedRootHandle();
            if (handle) {
                uploadRootHandle = handle;
                const granted = await ensureDirectoryPermission(uploadRootHandle, false);
                if (granted) setStorageStatus('已恢复存储目录。', true);
                else setStorageStatus('已恢复目录句柄，请重新授权访问权限。', false);
            } else {
                setStorageStatus('未绑定存储目录（建议选择项目根目录）。', false);
            }
        } catch {
            setStorageStatus('读取存储目录失败。', false);
        }
    } else {
        setStorageStatus('当前浏览器不支持本地目录写入。', false);
    }

    if (uiElements.adminToggle) {
        uiElements.adminToggle.addEventListener('click', () => {
            if (isAdminMode) {
                setAdminMode(false);
                return;
            }
            openAdminLoginModal();
        });
    }
    if (uiElements.adminLoginCancel) uiElements.adminLoginCancel.addEventListener('click', closeAdminLoginModal);
    if (uiElements.adminLoginConfirm) uiElements.adminLoginConfirm.addEventListener('click', submitAdminPassword);
    if (uiElements.adminPasswordInput) {
        uiElements.adminPasswordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submitAdminPassword();
        });
    }
    if (uiElements.adminLoginModal) {
        uiElements.adminLoginModal.addEventListener('click', (e) => {
            if (e.target === uiElements.adminLoginModal) closeAdminLoginModal();
        });
    }
    if (uiElements.adminBindStorage) uiElements.adminBindStorage.addEventListener('click', bindStorageDirectory);
    if (uiElements.adminSave) uiElements.adminSave.addEventListener('click', saveCurrentStageText);
    if (uiElements.adminAddLink) uiElements.adminAddLink.addEventListener('click', addStageLink);
    if (uiElements.adminUploadImage) uiElements.adminUploadImage.addEventListener('change', async (e) => {
        await addUploadedFiles(Array.from(e.target.files || []), 'image');
        e.target.value = '';
    });
    if (uiElements.adminUploadVideo) uiElements.adminUploadVideo.addEventListener('change', async (e) => {
        await addUploadedFiles(Array.from(e.target.files || []), 'video');
        e.target.value = '';
    });
    if (uiElements.adminUploadDoc) uiElements.adminUploadDoc.addEventListener('change', async (e) => {
        await addUploadedFiles(Array.from(e.target.files || []), 'doc');
        e.target.value = '';
    });
    if (uiElements.mediaModalClose) uiElements.mediaModalClose.addEventListener('click', closeMediaPreview);
    if (uiElements.mediaModal) {
        uiElements.mediaModal.addEventListener('click', (e) => {
            if (e.target === uiElements.mediaModal) closeMediaPreview();
        });
    }
}

function updateUI() {
    let currentEra = ERAS.find(era => currentProgress >= era.start && currentProgress < era.end) || ERAS[ERAS.length - 1];
    uiElements.title.innerText = currentEra.label; uiElements.indicator.style.backgroundColor = currentEra.color; uiElements.indicator.style.boxShadow = `0 0 15px ${currentEra.color}`; uiElements.eraCategory.innerText = currentEra.label;

    const tVal = currentProgress / 100;

    let uiSubStages = currentEra.subStages;
    const isStructureFormation = currentEra.id === 'structure-formation';
    if (isStructureFormation && Array.isArray(currentEra.subStages)) {
        const galaxyStart = 66;
        if (currentProgress < galaxyStart) {
            const early = currentEra.subStages.filter(s => s.range && s.range[1] <= galaxyStart).sort((a, b) => a.range[0] - b.range[0]);
            const galaxyParent = {
                name: '星系形成与演化',
                desc: '0.66 - 1.00 | 星系与行星',
                range: [galaxyStart, 100],
                temp: '~20→2.725 K（CMB）',
                time: '~0.4–13.8 Gyr（多过程并行）',
                text: '星系在引力并合、气体耗散与角动量作用下持续成长并重塑结构；恒星与行星系统在其中不断形成与演化。'
            };
            uiSubStages = [...early, galaxyParent];
        } else {
            uiSubStages = currentEra.subStages.filter(s => s.range && s.range[0] >= galaxyStart).sort((a, b) => a.range[0] - b.range[0]);
        }
    }

    const subStageKey = `${currentEra.id}:${isStructureFormation && currentProgress >= 66 ? 'galaxy-detail' : 'base'}`;
    if (uiElements.subStages.dataset.currentEra !== subStageKey) {
        uiElements.subStages.dataset.currentEra = subStageKey; uiElements.subStages.innerHTML = '';
        uiSubStages.forEach((stage, idx) => {
            const div = document.createElement('div');
            div.id = `substage-${idx}`;
            div.className = 'flex items-center gap-2 p-1.5 rounded bg-white/5 border border-white/5 transition-all duration-300';
            const meta = getStageTimeRelationMeta(currentEra.id, stage);
            const baseIcon = meta && meta.icon ? meta.icon : 'zap';
            const badgeHtml = meta ? `<span class="stage-badge stage-badge--${meta.kind}">${meta.badge}</span>` : '';
            div.innerHTML = `<div class="text-blue-300 stage-icon transition-colors duration-300" data-base-icon="${baseIcon}"><i data-lucide="${baseIcon}" class="w-4 h-4"></i></div><div class="flex items-baseline justify-between w-full"><span class="text-sm font-medium text-white transition-colors duration-300 flex items-center gap-1.5"><span class="stage-text">${stage.name}</span>${badgeHtml}</span><span class="text-[10px] text-gray-500 ml-2">${buildStageDescWithAge(stage)}</span></div>`;
            uiElements.subStages.appendChild(div);
        });
        initIcons(uiElements.subStages);
    }

    const activeStage = uiSubStages.find(s => currentProgress >= s.range[0] && currentProgress < s.range[1]) || uiSubStages[uiSubStages.length - 1];
    const stageKey = buildStageKey(currentEra, activeStage);
    const fallbackText = getDefaultStageText(currentEra, activeStage);
    currentStageMeta = { key: stageKey, eraId: currentEra.id, label: activeStage.name, fallbackText };
    uiElements.title.innerText = activeStage.name;
    uiElements.desc.innerText = getDisplayTextForStage(currentStageMeta, fallbackText);
    if (lastRenderedStageKey !== stageKey) {
        lastRenderedStageKey = stageKey;
        syncAdminPanel(currentStageMeta, fallbackText);
        renderStageAttachments(currentStageMeta);
    }
    if (activeStage) { uiElements.displayTime.innerText = `t ≈ ${formatAge(ageSecondsFromProgress(currentProgress))}`; uiElements.displayTemp.innerText = activeStage.temp || ""; }
    const stageChildren = uiElements.subStages.children;
    uiSubStages.forEach((stage, idx) => {
        const el = stageChildren[idx];
        if (!el || !stage || !Array.isArray(stage.range)) return;

        const meta = getStageTimeRelationMeta(currentEra.id, stage);
        const isPrimaryActive = currentProgress >= stage.range[0] && currentProgress < stage.range[1];
        const isOngoingActive = Boolean(meta && meta.ongoing && currentProgress >= stage.range[0] && currentProgress < 100);

        el.classList.toggle('stage-active', isPrimaryActive);
        el.classList.toggle('stage-ongoing', !isPrimaryActive && isOngoingActive);

        const iconContainer = el.querySelector('.stage-icon');
        if (!iconContainer) return;
        if (isPrimaryActive) {
            iconContainer.innerHTML = '<i data-lucide="activity" class="w-4 h-4"></i>';
            initIcons(iconContainer);
            return;
        }
        if (iconContainer.querySelector('[data-lucide=\"activity\"]')) {
            const baseIcon = iconContainer.dataset.baseIcon || 'zap';
            iconContainer.innerHTML = `<i data-lucide=\"${baseIcon}\" class=\"w-4 h-4\"></i>`;
            initIcons(iconContainer);
        }
    });
    if (uiElements.parallelNote) {
        const showParallel = tVal >= 0.66;
        uiElements.parallelNote.classList.toggle('hidden', !showParallel);
    }
    if (uiElements.galaxyLabel) {
        const baseClasses = 'absolute left-[83%] -translate-x-1/2 -translate-y-1/2 mt-2 text-[10px] font-medium tracking-wider transition-colors whitespace-nowrap';
        const isActive = tVal >= 0.66;
        uiElements.galaxyLabel.className = isActive ? `${baseClasses} text-blue-300` : `${baseClasses} text-gray-600`;
    }
    for (const [key, el] of Object.entries(uiElements.labels)) { let leftClass = ''; if (key === 'very-early') leftClass = 'left-[7.5%]'; else if (key === 'particle-formation') leftClass = 'left-[22.5%]'; else if (key === 'matter-creation') leftClass = 'left-[40%]'; else if (key === 'structure-formation') leftClass = 'left-[75%]'; const baseClasses = `absolute ${leftClass} -translate-x-1/2 -translate-y-1/2 mb-8 text-xs font-medium tracking-wider whitespace-nowrap transition-colors`; if (key === currentEra.id) el.className = `${baseClasses} text-blue-300 scale-110`; else el.className = `${baseClasses} text-gray-600`; }
    uiElements.progressBar.style.width = `${currentProgress}%`; uiElements.handle.style.left = `${currentProgress}%`; uiElements.tooltip.innerText = `t=${formatAge(ageSecondsFromProgress(currentProgress))}`;
}

let particleMoveTime = 0;

function animate() {
    requestAnimationFrame(animate);
    const rawDelta = clock.getDelta();
    const delta = Math.min(rawDelta, 0.05); // cap to avoid huge jumps after stalls
    const stageDelta = isDragging ? 0 : delta;
    if (!isDragging) simTime += delta;
    const time = simTime;

    if (autoplayEnabled && !isDragging && currentProgress < 100) {
        const autoplayRate = AUTOPLAY_BASE_RATE * autoplaySpeed;
        currentProgress = Math.min(100, currentProgress + delta * autoplayRate);
        scheduleUIUpdate();
        if (currentProgress >= 100) setAutoplayEnabled(false);
    }

    const t = currentProgress / 100;

    resetStageStateForTime(t);

    uniforms.uTime.value = time;
    particleUniforms.uTime.value = time;
    particleUniforms.uProgress.value = t;
    fogUniforms.uTime.value = time;
    accUniforms.uTime.value = time;

    // --- Modular Logic Switch ---
    if (t < 0.07) {
        EnergyDominated.update(context, t);
    } else if (t < 0.15) {
        CosmicInflation.update(context, t);
    } else if (t < 0.30) {
        LeptoquarkEra.update(context, t);
    } else if (t < 0.50) {
        Nucleosynthesis.update(context, t);
    } else if (t < 0.60) {
        DarkAges.update(context, t);
    } else {
        StarFormation.update(context, t, stageDelta);
    }

    // --- Particle System Animation (Preserved here essentially as a global system) ---
    // Could also be moved to a 'GlobalEffects' module if desired.
    let speedFactor = 0;
    if (t >= 0.22) {
        if (t <= 0.50) speedFactor = 20.0 - (t - 0.22) / 0.28 * 18.0;
        else if (t <= 1.0) speedFactor = 2.0 - (t - 0.50) / 0.5 * 1.5;
        else speedFactor = 0.5;
    }
    particleMoveTime += stageDelta * speedFactor;
    particleUniforms.uMoveTime.value = particleMoveTime;

    // Global Visibility Check for Particles (simpler to keep here for smooth transition)
    particles.visible = t <= 0.601;

    renderer.render(scene, camera);
}

const timelineTrack = document.getElementById('timeline-track');
function handleInteraction(clientX) {
    const rect = timelineTrack.getBoundingClientRect();
    let newProgress = ((clientX - rect.left) / rect.width) * 100;
    newProgress = Math.max(0, Math.min(100, newProgress));
    if (Math.abs(newProgress - currentProgress) > 0.05) {
        currentProgress = newProgress;
        scheduleUIUpdate();
    }
}
timelineTrack.addEventListener('mousedown', (e) => {
    resumeAutoplayAfterDrag = autoplayEnabled;
    setAutoplayEnabled(false);
    isDragging = true;
    handleInteraction(e.clientX);
    uiElements.handle.style.cursor = 'grabbing';
});
timelineTrack.addEventListener('touchstart', (e) => {
    resumeAutoplayAfterDrag = autoplayEnabled;
    setAutoplayEnabled(false);
    isDragging = true;
    handleInteraction(e.touches[0].clientX);
}, { passive: false });
window.addEventListener('mousemove', (e) => { if (isDragging) handleInteraction(e.clientX); });
window.addEventListener('touchmove', (e) => { if (isDragging) handleInteraction(e.touches[0].clientX); }, { passive: false });
window.addEventListener('mouseup', () => {
    const wasDragging = isDragging;
    isDragging = false;
    uiElements.handle.style.cursor = 'grab';
    if (wasDragging && resumeAutoplayAfterDrag && currentProgress < 100) setAutoplayEnabled(true);
});
window.addEventListener('touchend', () => {
    const wasDragging = isDragging;
    isDragging = false;
    if (wasDragging && resumeAutoplayAfterDrag && currentProgress < 100) setAutoplayEnabled(true);
});
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

initAdminMode();
updateUI();
setAutoplayEnabled(false);
animate();
