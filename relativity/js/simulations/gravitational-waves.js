/**
 * 引力波3D交互演示
 * 使用 Three.js 实现物理真实的双星旋进系统
 */

class GravitationalWavesSimulation {
    constructor() {
        // 检查 Three.js 是否加载
        if (typeof THREE === 'undefined') {
            console.error('Three.js 未加载！请检查网络连接。');
            return;
        }

        this.container = document.querySelector('.demo-canvas-container');
        if (!this.container) {
            console.error('找不到容器元素 .demo-canvas-container');
            return;
        }

        console.log('初始化引力波模拟...');

        // 物理参数 (归一化单位制: G=1, 初始半长轴 a0=1)
        this.massRatio = 1.0;       // q = m2/m1, 范围 0.1-1.0
        this.totalMass = 30;        // M = m1 + m2, 太阳质量
        this.timeScale = 1.0;       // 时间加速倍率

        // 轨道状态
        this.a = 1.0;               // 当前半长轴 (归一化)
        this.theta = 0;             // 轨道相位角
        this.omega = 0;             // 角速度
        this.phase = 'inspiral';    // inspiral | merge | ringdown
        this.mergeTime = 0;

        // 波纹参数
        this.waves = [];
        this.waveInterval = 0;

        // 视觉缩放
        this.visualScale = 80;      // 轨道半径的视觉放大倍数

        // 播放控制
        this.isPaused = false;

        this.initThreeJS();
        this.initPhysics();
        this.initControls();
        this.initEditor();
        this.loadContent();
        this.animate();

        window.addEventListener('resize', () => this.resize());
    }

    initThreeJS() {
        // 场景
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a14);

        // 获取容器尺寸
        const rect = this.container.getBoundingClientRect();
        const width = rect.width || 800;
        const height = rect.height || 470;

        console.log('容器尺寸:', width, 'x', height);

        // 相机 - 斜俯视角度
        const aspect = width / height;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 2000);
        this.camera.position.set(0, 200, 250);
        this.camera.lookAt(0, 0, 0);

        // 渲染器
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        console.log('Three.js 渲染器已创建');

        // 轨道控制器
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI * 0.85;
        this.controls.minDistance = 100;
        this.controls.maxDistance = 600;

        // 灯光
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffffff, 1, 500);
        pointLight.position.set(0, 100, 100);
        this.scene.add(pointLight);

        // 创建波纹平面
        this.createWaveSurface();

        // 创建双星系统
        this.createBinarySystem();

        // 创建轨道线
        this.createOrbitLine();
    }

    createWaveSurface() {
        // 大平面网格用于显示引力波
        const size = 800;
        const segments = 200;
        const geometry = new THREE.PlaneGeometry(size, size, segments, segments);

        // 自定义着色器材质 - 更立体的效果
        this.waveMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                waveFrequency: { value: 0.08 },
                waveAmplitude: { value: 25.0 },  // 更大的振幅
                waveSpeed: { value: 2.0 },
                centerX: { value: 0.0 },
                centerY: { value: 0.0 },
                color1: { value: new THREE.Color(0x22d3ee) },
                color2: { value: new THREE.Color(0x8b5cf6) },
                color3: { value: new THREE.Color(0xec4899) }  // 第三种颜色增加层次感
            },
            vertexShader: `
                uniform float time;
                uniform float waveFrequency;
                uniform float waveAmplitude;
                uniform float waveSpeed;
                uniform float centerX;
                uniform float centerY;
                
                varying vec2 vUv;
                varying float vHeight;
                varying float vDistance;
                varying vec3 vNormal;
                varying float vWavePhase;
                
                void main() {
                    vUv = uv;
                    
                    vec3 pos = position;
                    float dx = pos.x - centerX;
                    float dy = pos.y - centerY;
                    float distance = sqrt(dx * dx + dy * dy);
                    vDistance = distance;
                    
                    // 四极模式：沿两个正交方向振荡
                    float angle = atan(dy, dx);
                    float quadrupole = cos(2.0 * angle);
                    
                    // 波纹传播 - 多层波叠加
                    float phase1 = distance * waveFrequency - time * waveSpeed;
                    float phase2 = distance * waveFrequency * 1.5 - time * waveSpeed * 1.2;
                    float wave1 = sin(phase1) * quadrupole;
                    float wave2 = sin(phase2) * quadrupole * 0.3;
                    float wave = wave1 + wave2;
                    
                    vWavePhase = sin(phase1);
                    
                    // 振幅随距离衰减 - 改用更平滑的衰减
                    float decay = 1.0 / (1.0 + distance * 0.008);
                    
                    // 中心区域平滑
                    float centerCutoff = smoothstep(30.0, 80.0, distance);
                    
                    pos.z = wave * waveAmplitude * decay * centerCutoff;
                    vHeight = pos.z;
                    
                    // 计算法线用于光照
                    float epsilon = 2.0;
                    float hL = sin((distance - epsilon) * waveFrequency - time * waveSpeed) * quadrupole * waveAmplitude * decay * centerCutoff;
                    float hR = sin((distance + epsilon) * waveFrequency - time * waveSpeed) * quadrupole * waveAmplitude * decay * centerCutoff;
                    vec3 normal = normalize(vec3(hL - hR, epsilon * 2.0, 0.0));
                    vNormal = normal;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color1;
                uniform vec3 color2;
                uniform vec3 color3;
                uniform float time;
                
                varying vec2 vUv;
                varying float vHeight;
                varying float vDistance;
                varying vec3 vNormal;
                varying float vWavePhase;
                
                void main() {
                    // 根据高度和波相位着色，产生更丰富的颜色变化
                    float heightNorm = (vHeight + 25.0) / 50.0;
                    
                    // 三色渐变
                    vec3 color;
                    if (heightNorm < 0.5) {
                        color = mix(color1, color2, heightNorm * 2.0);
                    } else {
                        color = mix(color2, color3, (heightNorm - 0.5) * 2.0);
                    }
                    
                    // 基于法线的简单光照效果
                    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.5));
                    float lighting = max(0.3, dot(vNormal, lightDir));
                    color *= lighting;
                    
                    // 波峰高亮
                    float peakHighlight = pow(max(0.0, vWavePhase), 3.0) * 0.5;
                    color += vec3(peakHighlight);
                    
                    // 距离衰减透明度
                    float alpha = 1.0 / (1.0 + vDistance * 0.003);
                    alpha *= 0.85;
                    
                    // 中心区域透明
                    float centerFade = smoothstep(30.0, 100.0, vDistance);
                    alpha *= centerFade;
                    
                    // 波谷更透明，波峰更不透明
                    alpha *= (0.5 + heightNorm * 0.5);
                    
                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide,
            wireframe: false
        });

        this.waveSurface = new THREE.Mesh(geometry, this.waveMaterial);
        this.waveSurface.rotation.x = -Math.PI / 2;
        this.waveSurface.position.y = 0;
        this.scene.add(this.waveSurface);
    }

    createBinarySystem() {
        // 计算质量
        const m1 = this.totalMass / (1 + this.massRatio);
        const m2 = this.totalMass - m1;

        // 天体1 - 较大
        const radius1 = 8 + Math.log10(m1) * 3;
        const geometry1 = new THREE.SphereGeometry(radius1, 32, 32);
        const material1 = new THREE.MeshPhongMaterial({
            color: 0x1e1e3f,
            emissive: 0x4a0080,
            emissiveIntensity: 0.5,
            shininess: 50
        });
        this.star1 = new THREE.Mesh(geometry1, material1);
        this.scene.add(this.star1);

        // 天体2 - 较小
        const radius2 = 8 + Math.log10(m2) * 3;
        const geometry2 = new THREE.SphereGeometry(radius2, 32, 32);
        const material2 = new THREE.MeshPhongMaterial({
            color: 0x1e1e3f,
            emissive: 0x800040,
            emissiveIntensity: 0.5,
            shininess: 50
        });
        this.star2 = new THREE.Mesh(geometry2, material2);
        this.scene.add(this.star2);
    }

    createOrbitLine() {
        // 轨道路径
        const orbitPoints = [];
        for (let i = 0; i <= 64; i++) {
            const angle = (i / 64) * Math.PI * 2;
            orbitPoints.push(new THREE.Vector3(
                Math.cos(angle) * this.a * this.visualScale,
                0,
                Math.sin(angle) * this.a * this.visualScale
            ));
        }
        const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
        const orbitMaterial = new THREE.LineBasicMaterial({
            color: 0x6366f1,
            transparent: true,
            opacity: 0.3
        });
        this.orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
        this.scene.add(this.orbitLine);
    }

    updateOrbitLine() {
        const points = [];
        for (let i = 0; i <= 64; i++) {
            const angle = (i / 64) * Math.PI * 2;
            points.push(new THREE.Vector3(
                Math.cos(angle) * this.a * this.visualScale,
                0,
                Math.sin(angle) * this.a * this.visualScale
            ));
        }
        this.orbitLine.geometry.setFromPoints(points);
    }

    initPhysics() {
        this.a = 1.0;
        this.theta = 0;
        this.phase = 'inspiral';
        this.mergeTime = 0;
        this.updateOmega();
    }

    updateOmega() {
        // 开普勒第三定律: omega = sqrt(GM/a^3)
        // 归一化单位制下 G=1
        const M = this.totalMass / 30; // 归一化到30太阳质量
        this.omega = Math.sqrt(M / (this.a * this.a * this.a));
    }

    updatePhysics(dt) {
        if (this.phase === 'merge') {
            this.mergeTime += dt;
            // 合并阶段持续3秒后进入环降
            if (this.mergeTime > 3) {
                this.phase = 'ringdown';
                this.mergeTime = 0;
                document.getElementById('phase').textContent = '环降';
            }
            return;
        }

        if (this.phase === 'ringdown') {
            this.mergeTime += dt;
            // 环降阶段：波纹在前6秒逐渐消失，最后2秒完全没有波纹
            const fadeDuration = 6;
            const fadeProgress = Math.min(1, this.mergeTime / fadeDuration);
            this.waveMaterial.uniforms.waveAmplitude.value = 60 * (1 - fadeProgress);

            // 环降阶段持续8秒后重置
            if (this.mergeTime > 8) {
                this.reset();
            }
            return;
        }

        // 旋进阶段：自动轨道衰减
        const m1 = this.totalMass / (1 + this.massRatio);
        const m2 = this.totalMass - m1;
        const M = this.totalMass;

        // 能量损失率 (归一化并放大)
        const scaleFactor = 0.0005;
        const da_dt = -scaleFactor * (m1 * m2 * M) / (30 * 30 * 30) / (this.a * this.a * this.a);

        this.a += da_dt * dt;

        // 更新滑块位置以反映当前进度
        const progress = Math.round(((1.0 - this.a) / 0.9) * 100);
        const inspiralSlider = document.getElementById('inspiral-slider');
        if (inspiralSlider) {
            inspiralSlider.value = Math.min(100, Math.max(0, progress));
            document.getElementById('inspiral-value').textContent = progress + '%';
        }

        // 检测合并
        if (this.a < 0.1) {
            this.phase = 'merge';
            this.mergeTime = 0;
            this.triggerMergeEffect();
            return;
        }

        // 更新角速度和相位
        this.updateOmega();
        this.theta += this.omega * dt;
        this.updateOrbitLine();

        // 更新波纹参数
        this.waveMaterial.uniforms.waveFrequency.value = 0.04 + (1 - this.a) * 0.12;
        this.waveMaterial.uniforms.waveAmplitude.value = 15 + (1 - this.a) * 40;
        this.waveMaterial.uniforms.waveSpeed.value = 1.5 + this.omega * 2;
    }

    triggerMergeEffect() {
        // 合并时的爆发效果
        this.waveMaterial.uniforms.waveAmplitude.value = 60;
        document.getElementById('phase').textContent = '合并中...';
    }

    updateBinaryPositions() {
        const m1 = this.totalMass / (1 + this.massRatio);
        const m2 = this.totalMass - m1;
        const M = this.totalMass;

        // 质心坐标系中的位置
        const r1 = (m2 / M) * this.a * this.visualScale;
        const r2 = (m1 / M) * this.a * this.visualScale;

        // 天体1位置
        this.star1.position.x = Math.cos(this.theta) * r1;
        this.star1.position.z = Math.sin(this.theta) * r1;
        this.star1.position.y = 5; // 略高于波纹平面

        // 天体2位置 (相位差180度)
        this.star2.position.x = -Math.cos(this.theta) * r2;
        this.star2.position.z = -Math.sin(this.theta) * r2;
        this.star2.position.y = 5;

        // 合并时移向中心
        if (this.phase === 'merge') {
            const progress = Math.min(1, this.mergeTime / 3);
            this.star1.position.x *= (1 - progress);
            this.star1.position.z *= (1 - progress);
            this.star2.position.x *= (1 - progress);
            this.star2.position.z *= (1 - progress);

            // 逐渐放大天体1，缩小天体2
            const m1 = this.totalMass / (1 + this.massRatio);
            const m2 = this.totalMass - m1;
            const baseRadius1 = 6 + Math.log10(Math.max(1, m1)) * 4;
            const baseRadius2 = 6 + Math.log10(Math.max(1, m2)) * 4;
            const mergedRadius = 6 + Math.log10(Math.max(1, this.totalMass)) * 4;

            this.star1.scale.setScalar((baseRadius1 + (mergedRadius - baseRadius1) * progress) / 10);
            this.star2.scale.setScalar(baseRadius2 * (1 - progress) / 10);
        }

        // 环降阶段：保持合并后的大质量天体在中心
        if (this.phase === 'ringdown') {
            this.star1.position.set(0, 5, 0);
            this.star2.visible = false;  // 隐藏第二颗星

            // 显示合并后的大天体
            const mergedRadius = 6 + Math.log10(Math.max(1, this.totalMass)) * 4;
            this.star1.scale.setScalar(mergedRadius / 10);
        }
    }

    updateStarSizes() {
        const m1 = this.totalMass / (1 + this.massRatio);
        const m2 = this.totalMass - m1;

        // 更新天体大小
        const radius1 = 6 + Math.log10(Math.max(1, m1)) * 4;
        const radius2 = 6 + Math.log10(Math.max(1, m2)) * 4;

        this.star1.scale.setScalar(radius1 / 10);
        this.star2.scale.setScalar(radius2 / 10);
    }

    reset() {
        this.a = 1.0;
        this.theta = 0;
        this.phase = 'inspiral';
        this.mergeTime = 0;
        this.updateOmega();
        this.updateOrbitLine();
        document.getElementById('phase').textContent = '旋进';
        this.waveMaterial.uniforms.waveAmplitude.value = 25;
        this.waveMaterial.uniforms.waveFrequency.value = 0.08;

        // 恢复双星可见性和大小
        this.star2.visible = true;
        this.updateStarSizes();

        // 重置滑块
        const inspiralSlider = document.getElementById('inspiral-slider');
        if (inspiralSlider) {
            inspiralSlider.value = 0;
            document.getElementById('inspiral-value').textContent = '0%';
        }
    }

    initControls() {
        // 质量比滑块
        const massRatioSlider = document.getElementById('mass-ratio-slider');
        massRatioSlider?.addEventListener('input', (e) => {
            this.massRatio = parseFloat(e.target.value);
            this.updateStarSizes();
            this.updateDisplays();
        });

        // 总质量滑块
        const totalMassSlider = document.getElementById('total-mass-slider');
        totalMassSlider?.addEventListener('input', (e) => {
            this.totalMass = parseFloat(e.target.value);
            this.updateStarSizes();
            this.updateOmega();
            this.updateDisplays();
        });

        // 旋进阶段滑块
        const inspiralSlider = document.getElementById('inspiral-slider');
        inspiralSlider?.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            document.getElementById('inspiral-value').textContent = value + '%';

            // 只在旋进阶段生效
            if (this.phase === 'inspiral') {
                // 将滑块值(0-100)映射到半长轴(1.0-0.1)
                this.a = 1.0 - (value / 100) * 0.9;
                this.updateOmega();
                this.updateOrbitLine();

                // 更新波纹参数
                this.waveMaterial.uniforms.waveFrequency.value = 0.04 + (1 - this.a) * 0.12;
                this.waveMaterial.uniforms.waveAmplitude.value = 15 + (1 - this.a) * 40;
                this.waveMaterial.uniforms.waveSpeed.value = 1.5 + this.omega * 2;

                // 当滑块拉到100%时触发合并
                if (value >= 100) {
                    this.phase = 'merge';
                    this.mergeTime = 0;
                    this.triggerMergeEffect();
                }
            }
        });

        // 重置按钮
        document.getElementById('reset-btn')?.addEventListener('click', () => this.reset());

        // 视角重置按钮
        document.getElementById('reset-view-btn')?.addEventListener('click', () => {
            this.camera.position.set(0, 200, 250);
            this.camera.lookAt(0, 0, 0);
            this.controls.reset();
        });

        // 播放/暂停按钮
        const playPauseBtn = document.getElementById('play-pause-btn');
        playPauseBtn?.addEventListener('click', () => {
            this.isPaused = !this.isPaused;
            playPauseBtn.textContent = this.isPaused ? '▶️' : '⏸️';
            playPauseBtn.title = this.isPaused ? '播放' : '暂停';
        });

        this.updateDisplays();
    }

    updateDisplays() {
        const m1 = this.totalMass / (1 + this.massRatio);
        const m2 = this.totalMass - m1;

        // 更新滑块值显示
        document.getElementById('mass-ratio-value').textContent = this.massRatio.toFixed(2);
        document.getElementById('total-mass-value').textContent = this.totalMass.toFixed(0) + ' M☉';

        // 计算物理量
        const orbitRadius = this.a * 100; // 假设100km为归一化单位
        const orbitalFreq = this.omega / (2 * Math.PI);
        const gwFreq = orbitalFreq * 2; // 引力波频率是轨道频率的2倍

        // 更新结果面板
        document.getElementById('orbital-period')?.textContent &&
            (document.getElementById('orbital-period').textContent = (1 / orbitalFreq).toFixed(2));
        document.getElementById('gw-frequency')?.textContent &&
            (document.getElementById('gw-frequency').textContent = (gwFreq * 100).toFixed(1));
        document.getElementById('orbital-radius')?.textContent &&
            (document.getElementById('orbital-radius').textContent = (orbitRadius * this.a).toFixed(1));

        // 质量显示
        document.getElementById('m1-display')?.textContent &&
            (document.getElementById('m1-display').textContent = m1.toFixed(1) + ' M☉');
        document.getElementById('m2-display')?.textContent &&
            (document.getElementById('m2-display').textContent = m2.toFixed(1) + ' M☉');
    }

    initEditor() {
        this.editorHelper = new PageEditorHelper('gravitational-waves');
        this.editorHelper.initEditor();
    }

    loadContent() {
        if (this.editorHelper) {
            this.editorHelper.loadContent();
        }
    }

    resize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const dt = 0.016; // 约60fps

        // 如果没有暂停，更新物理和动画
        if (!this.isPaused) {
            // 更新物理
            this.updatePhysics(dt);

            // 更新双星位置
            this.updateBinaryPositions();

            // 更新轨道线
            if (this.phase === 'inspiral') {
                this.updateOrbitLine();
            }

            // 更新波纹时间
            this.waveMaterial.uniforms.time.value += dt * this.timeScale;

            // 更新显示
            this.updateDisplays();
        }

        // 更新控制器
        this.controls.update();

        // 渲染
        this.renderer.render(this.scene, this.camera);
    }
}

document.addEventListener('DOMContentLoaded', () => new GravitationalWavesSimulation());
