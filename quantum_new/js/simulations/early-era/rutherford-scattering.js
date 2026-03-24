/**
 * 卢瑟福散射交互模拟
 * 
 * 左侧：α粒子散射实验 - 对比核式模型和布丁模型的散射行为
 * 右侧：卢瑟福行星模型 - 电子在椭圆轨道上绕核旋转
 */

class RutherfordSimulation {
    constructor() {
        // 散射实验画布
        this.scatterCanvas = document.getElementById('scattering-canvas');
        this.scatterCtx = this.scatterCanvas?.getContext('2d');

        // 行星模型画布
        this.planetaryCanvas = document.getElementById('planetary-canvas');
        this.planetaryCtx = this.planetaryCanvas?.getContext('2d');

        if (!this.scatterCanvas || !this.planetaryCanvas) return;

        // 当前模型：nucleus (核式) 或 pudding (布丁)
        this.currentModel = 'nucleus';

        // α粒子列表
        this.alphaParticles = [];
        this.particleTrails = [];

        // 散射参数
        this.incidentAngle = 0;
        this.emissionRate = 3;
        this.emissionHeight = 0;
        this.useRandomHeight = true;
        this.emissionTimer = null;
        this.isAutoPaused = false;

        // 统计数据
        this.stats = {
            total: 0,
            smallAngle: 0,
            largeAngle: 0,
            backscatter: 0
        };

        // 行星模型参数
        this.electrons = [];
        this.electronCount = 3;

        this.init();
    }

    init() {
        this.resizeCanvases();
        this.initElectrons();
        this.bindEvents();
        this.startEmission();
        this.animate();
    }

    resizeCanvases() {
        const resizeCanvas = (canvas) => {
            const rect = canvas.parentElement.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
        };

        resizeCanvas(this.scatterCanvas);
        resizeCanvas(this.planetaryCanvas);

        window.addEventListener('resize', () => {
            resizeCanvas(this.scatterCanvas);
            resizeCanvas(this.planetaryCanvas);
            this.initElectrons();
        });
    }

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    initElectrons() {
        this.electrons = [];
        const w = this.planetaryCanvas.width;
        const h = this.planetaryCanvas.height;
        const centerX = w / 2;
        const centerY = h / 2;

        // 三个电子：等半径圆轨道，角速度方向在 xz 平面内
        const radius = Math.min(w, h) * 0.22;
        const speed = 0.02;
        const phases = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
        const angles = [0, 60, 120].map(a => (a * Math.PI) / 180);

        const normalize = (v) => {
            const len = Math.hypot(v.x, v.y, v.z) || 1;
            return { x: v.x / len, y: v.y / len, z: v.z / len };
        };
        const cross = (a, b) => ({
            x: a.y * b.z - a.z * b.y,
            y: a.z * b.x - a.x * b.z,
            z: a.x * b.y - a.y * b.x
        });

        angles.forEach((theta, i) => {
            const n = normalize({ x: Math.sin(theta), y: 0, z: Math.cos(theta) });
            const up = { x: 0, y: 1, z: 0 };
            let u = cross(up, n);
            u = normalize(u);
            const v = normalize(cross(n, u));

            this.electrons.push({
                centerX: centerX,
                centerY: centerY,
                radius: radius,
                phase: phases[i],
                speed: speed,
                u: u,
                v: v,
                wx: 0,
                wy: 0,
                wz: 0
            });
        });
    }

    bindEvents() {
        // 模型切换
        document.querySelectorAll('.model-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.model-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentModel = tab.dataset.model;
                this.clearTrails();
            });
        });

        // 入射角度（固定为 0°）
        this.incidentAngle = 0;

        // 发射高度（仅用于单次发射）
        const heightSlider = document.getElementById('height-slider');
        const heightValue = document.getElementById('height-value');
        if (heightSlider) {
            heightSlider.addEventListener('input', () => {
                this.emissionHeight = parseInt(heightSlider.value);
                if (heightValue) heightValue.textContent = `${this.emissionHeight}`;
            });
        }

        // 发射按钮
        document.getElementById('fire-btn')?.addEventListener('click', () => {
            this.fireSingleWithPause();
        });

        // 发射大量按钮
        document.getElementById('fire-burst-btn')?.addEventListener('click', () => {
            this.fireAlphaBurst();
        });
    }

    clearTrails() {
        this.particleTrails = [];
        this.alphaParticles = [];
    }

    startEmission() {
        if (this.emissionTimer) {
            window.clearInterval(this.emissionTimer);
        }
        this.emissionTimer = window.setInterval(() => {
            if (this.isAutoPaused) return;
            if (this.alphaParticles.length < 30) {
                const count = Math.floor(Math.random() * this.emissionRate);
                for (let i = 0; i < count; i++) {
                    this.emitAlphaParticle();
                }
            }
        }, 500);
    }

    stopEmission() {
        if (this.emissionTimer) {
            window.clearInterval(this.emissionTimer);
            this.emissionTimer = null;
        }
    }

    emitAlphaParticle(overrideHeight = null, color = null) {
        const h = this.scatterCanvas.height;
        const w = this.scatterCanvas.width;

        // 入射位置（高度可控，0 表示穿过原子核水平线）
        const y = overrideHeight === null
            ? (this.useRandomHeight
                ? this.clamp(h / 2 + (Math.random() - 0.5) * h * 0.6, 20, h - 20)
                : this.clamp(h / 2 + this.emissionHeight, 20, h - 20))
            : this.clamp(h / 2 + overrideHeight, 20, h - 20);

        // 计算瞄准参数 b（impact parameter）
        const targetY = h / 2;
        const b = y - targetY;

        // 入射角度（度转弧度）
        const angleRad = 0;

        this.alphaParticles.push({
            x: 20,
            y: y,
            vx: 4 * Math.cos(angleRad),
            vy: 4 * Math.sin(angleRad),
            b: b,  // impact parameter
            trail: [],
            scattered: false,
            scatterAngle: 0,
            color: color
        });

        this.stats.total++;
        this.updateStats();
    }

    fireAlphaBurst() {
        for (let i = 0; i < 20; i++) {
            setTimeout(() => this.emitAlphaParticle(), i * 60);
        }
    }

    fireSingleWithPause() {
        if (this.isAutoPaused) return;
        this.isAutoPaused = true;
        this.stopEmission();

        const targetHeight = this.emissionHeight;
        window.setTimeout(() => {
            this.emitAlphaParticle(targetHeight, '#f59e0b');
            window.setTimeout(() => {
                this.isAutoPaused = false;
                this.startEmission();
            }, 2000);
        }, 2000);
    }

    updateStats() {
        document.getElementById('total-count').textContent = this.stats.total;
        document.getElementById('small-angle-count').textContent = this.stats.smallAngle;
        document.getElementById('large-angle-count').textContent = this.stats.largeAngle;
        document.getElementById('backscatter-count').textContent = this.stats.backscatter;
    }

    updateScattering() {
        const w = this.scatterCanvas.width;
        const h = this.scatterCanvas.height;
        const centerX = w / 2;
        const centerY = h / 2;

        for (let i = this.alphaParticles.length - 1; i >= 0; i--) {
            const p = this.alphaParticles[i];

            // 记录轨迹
            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > 100) p.trail.shift();

            // 计算到中心的距离
            const dx = p.x - centerX;
            const dy = p.y - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (this.currentModel === 'nucleus') {
                // 核式模型：库仑散射
                // 原子核半径很小，排斥力在近距离时非常强
                const nucleusRadius = 8;
                const forceRange = 150;

                if (dist < forceRange && dist > nucleusRadius) {
                    // 库仑力 F ∝ 1/r²
                    const forceMag = 2000 / (dist * dist);
                    const forceX = (dx / dist) * forceMag;
                    const forceY = (dy / dist) * forceMag;

                    p.vx += forceX * 0.016;
                    p.vy += forceY * 0.016;
                }

                // 碰到原子核反弹
                if (dist < nucleusRadius) {
                    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                    p.vx = (dx / dist) * speed;
                    p.vy = (dy / dist) * speed;
                }
            } else {
                // 布丁模型：正电荷均匀分布，几乎不偏转
                const puddingRadius = 80;

                if (dist < puddingRadius) {
                    // 均匀分布的正电荷，力很弱
                    const forceMag = 0.5 * (dist / puddingRadius);
                    const forceX = (dx / dist) * forceMag;
                    const forceY = (dy / dist) * forceMag;

                    p.vx += forceX * 0.016;
                    p.vy += forceY * 0.016;
                }
            }

            // 移动粒子
            p.x += p.vx;
            p.y += p.vy;

            // 检查是否离开屏幕
            if (p.x < -10 || p.x > w + 10 || p.y < -10 || p.y > h + 10) {
                // 计算散射角
                if (!p.scattered) {
                    const outAngle = Math.atan2(p.vy, p.vx) * 180 / Math.PI;
                    const inAngle = this.incidentAngle;
                    let scatterAngle = Math.abs(outAngle - inAngle);
                    if (scatterAngle > 180) scatterAngle = 360 - scatterAngle;

                    p.scatterAngle = scatterAngle;
                    p.scattered = true;

                    // 统计
                    if (scatterAngle < 10) {
                        this.stats.smallAngle++;
                    } else if (scatterAngle > 150) {
                        this.stats.backscatter++;
                        this.stats.largeAngle++;
                    } else if (scatterAngle > 90) {
                        this.stats.largeAngle++;
                    }
                    this.updateStats();

                    // 保存轨迹
                    this.particleTrails.push([...p.trail]);
                    if (this.particleTrails.length > 20) {
                        this.particleTrails.shift();
                    }
                }

                this.alphaParticles.splice(i, 1);
            }
        }
    }

    drawScattering() {
        const ctx = this.scatterCtx;
        const w = this.scatterCanvas.width;
        const h = this.scatterCanvas.height;
        const centerX = w / 2;
        const centerY = h / 2;

        // 清空画布
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(0, 0, w, h);

        // 绘制金箔（垂直线）
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
        ctx.lineWidth = 40;
        ctx.beginPath();
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, h);
        ctx.stroke();

        // 根据模型绘制原子
        if (this.currentModel === 'nucleus') {
            // 核式模型：小而致密的原子核
            const nucleusRadius = 8;

            // 原子核发光效果
            const gradient = ctx.createRadialGradient(
                centerX, centerY, 0,
                centerX, centerY, nucleusRadius * 3
            );
            gradient.addColorStop(0, 'rgba(239, 68, 68, 1)');
            gradient.addColorStop(0.3, 'rgba(239, 68, 68, 0.5)');
            gradient.addColorStop(1, 'transparent');

            ctx.beginPath();
            ctx.arc(centerX, centerY, nucleusRadius * 3, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();

            // 原子核核心
            ctx.beginPath();
            ctx.arc(centerX, centerY, nucleusRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#ef4444';
            ctx.fill();

            // 标注
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.font = '11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('原子核', centerX, centerY + 25);
            ctx.fillText('(很小)', centerX, centerY + 38);
        } else {
            // 布丁模型：大的均匀正电荷球
            const puddingRadius = 80;

            const gradient = ctx.createRadialGradient(
                centerX - puddingRadius * 0.3, centerY - puddingRadius * 0.3, 0,
                centerX, centerY, puddingRadius
            );
            gradient.addColorStop(0, 'rgba(245, 158, 11, 0.5)');
            gradient.addColorStop(0.7, 'rgba(245, 158, 11, 0.2)');
            gradient.addColorStop(1, 'rgba(245, 158, 11, 0.1)');

            ctx.beginPath();
            ctx.arc(centerX, centerY, puddingRadius, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // 正电荷符号
            ctx.fillStyle = 'rgba(245, 158, 11, 0.5)';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const r = puddingRadius * 0.5;
                ctx.fillText('+', centerX + Math.cos(angle) * r, centerY + Math.sin(angle) * r + 5);
            }

            // 标注
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.font = '11px Inter, sans-serif';
            ctx.fillText('正电荷均匀分布', centerX, centerY + puddingRadius + 20);
        }

        // 绘制历史轨迹
        this.particleTrails.forEach(trail => {
            if (trail.length < 2) return;
            ctx.beginPath();
            ctx.moveTo(trail[0].x, trail[0].y);
            for (let i = 1; i < trail.length; i++) {
                ctx.lineTo(trail[i].x, trail[i].y);
            }
            ctx.strokeStyle = 'rgba(168, 85, 247, 0.15)';
            ctx.lineWidth = 1;
            ctx.stroke();
        });

        // 绘制α粒子和它们的轨迹
        this.alphaParticles.forEach(p => {
            const baseColor = p.color ?? '#a855f7';
            const glow = p.color === '#f59e0b'
                ? ['rgba(245, 158, 11, 0.85)', 'rgba(245, 158, 11, 0.35)']
                : ['rgba(168, 85, 247, 0.8)', 'rgba(168, 85, 247, 0.3)'];
            const trailColor = p.color === '#f59e0b' ? 'rgba(245, 158, 11, 0.5)' : 'rgba(168, 85, 247, 0.5)';
            // 轨迹
            if (p.trail.length > 1) {
                ctx.beginPath();
                ctx.moveTo(p.trail[0].x, p.trail[0].y);
                for (let i = 1; i < p.trail.length; i++) {
                    ctx.lineTo(p.trail[i].x, p.trail[i].y);
                }
                ctx.strokeStyle = trailColor;
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // α粒子发光效果
            const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 10);
            gradient.addColorStop(0, glow[0]);
            gradient.addColorStop(0.5, glow[1]);
            gradient.addColorStop(1, 'transparent');

            ctx.beginPath();
            ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();

            // α粒子核心
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = baseColor;
            ctx.fill();
        });

        // 发射源指示（与发射区域一致）
        const emissionHalf = h * 0.3;
        const emissionTop = this.clamp(h / 2 - emissionHalf, 20, h - 20);
        const emissionBottom = this.clamp(h / 2 + emissionHalf, 20, h - 20);
        const emissionHeight = Math.max(0, emissionBottom - emissionTop);
        ctx.fillStyle = 'rgba(168, 85, 247, 0.5)';
        ctx.fillRect(5, emissionTop, 15, emissionHeight);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.save();
        ctx.translate(12, (emissionTop + emissionBottom) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('α源', 0, 4);
        ctx.restore();
    }

    updatePlanetaryModel() {
        this.electrons.forEach(e => {
            e.phase += e.speed;

            const cosT = Math.cos(e.phase);
            const sinT = Math.sin(e.phase);
            const rx = e.radius * (e.u.x * cosT + e.v.x * sinT);
            const ry = e.radius * (e.u.y * cosT + e.v.y * sinT);
            const rz = e.radius * (e.u.z * cosT + e.v.z * sinT);
            e.wx = rx;
            e.wy = ry;
            e.wz = rz;
        });
    }

    drawPlanetaryModel() {
        const ctx = this.planetaryCtx;
        const w = this.planetaryCanvas.width;
        const h = this.planetaryCanvas.height;
        const centerX = w / 2;
        const centerY = h / 2;
        const fov = 380;
        // A slight pitch (y component) breaks the visual symmetry of the three orbit planes
        // (their normals all lie in the xz plane), making all 3 tracks easier to distinguish.
        const viewYaw = (35 * Math.PI) / 180;   // around y axis
        const viewPitch = (18 * Math.PI) / 180; // tilt up/down
        const viewDir = {
            x: Math.cos(viewYaw) * Math.cos(viewPitch),
            y: Math.sin(viewPitch),
            z: Math.sin(viewYaw) * Math.cos(viewPitch)
        };
        const normalize = (v) => {
            const len = Math.hypot(v.x, v.y, v.z) || 1;
            return { x: v.x / len, y: v.y / len, z: v.z / len };
        };
        const cross = (a, b) => ({
            x: a.y * b.z - a.z * b.y,
            y: a.z * b.x - a.x * b.z,
            z: a.x * b.y - a.y * b.x
        });
        const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;

        const forward = normalize(viewDir);
        const up = { x: 0, y: 1, z: 0 };
        const right = normalize(cross(up, forward));
        const rotateAroundAxis = (v, axis, angle) => {
            // Rodrigues' rotation formula
            const c = Math.cos(angle);
            const s = Math.sin(angle);
            const k = axis; // assumed normalized
            const kv = dot(k, v);
            return {
                x: v.x * c + (k.y * v.z - k.z * v.y) * s + k.x * kv * (1 - c),
                y: v.y * c + (k.z * v.x - k.x * v.z) * s + k.y * kv * (1 - c),
                z: v.z * c + (k.x * v.y - k.y * v.x) * s + k.z * kv * (1 - c)
            };
        };

        // Rotate the view direction by +60 degrees around the current screen horizontal axis.
        const forwardRot = normalize(rotateAroundAxis(forward, right, (80 * Math.PI) / 180));
        const up2 = cross(forwardRot, right);

        const project = (x, y, z) => {
            const p = { x, y, z };
            const vx = dot(p, right);
            const vy = dot(p, up2);
            const vz = dot(p, forwardRot);
            const scale = fov / (fov + vz);
            return {
                x: centerX + vx * scale,
                y: centerY + vy * scale,
                scale: scale
            };
        };

        // 清空画布
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(0, 0, w, h);

        // 绘制轨道（3D -> 2D 投影）
        this.electrons.forEach((e, index) => {
            ctx.save();
            ctx.beginPath();
            const steps = 120;
            for (let i = 0; i <= steps; i++) {
                const t = (i / steps) * Math.PI * 2;
                const rx = e.radius * (e.u.x * Math.cos(t) + e.v.x * Math.sin(t));
                const ry = e.radius * (e.u.y * Math.cos(t) + e.v.y * Math.sin(t));
                const rz = e.radius * (e.u.z * Math.cos(t) + e.v.z * Math.sin(t));
                const p = project(rx, ry, rz);
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            }
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.3 - index * 0.05})`;
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        });

        // 绘制原子核（中心）
        const nucleusRadius = 15;
        const gradient = ctx.createRadialGradient(
            centerX - 5, centerY - 5, 0,
            centerX, centerY, nucleusRadius * 2
        );
        gradient.addColorStop(0, 'rgba(239, 68, 68, 1)');
        gradient.addColorStop(0.3, 'rgba(239, 68, 68, 0.7)');
        gradient.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(centerX, centerY, nucleusRadius * 2, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(centerX, centerY, nucleusRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();

        // 绘制电子
        this.electrons.forEach(e => {
            const p = project(e.wx, e.wy, e.wz);
            // 发光效果
            const glowR = 12 * p.scale;
            const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
            gradient.addColorStop(0, 'rgba(34, 211, 238, 0.8)');
            gradient.addColorStop(0.5, 'rgba(34, 211, 238, 0.3)');
            gradient.addColorStop(1, 'transparent');

            ctx.beginPath();
            ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();

            // 电子核心
            ctx.beginPath();
            ctx.arc(p.x, p.y, 5 * p.scale, 0, Math.PI * 2);
            ctx.fillStyle = '#22d3ee';
            ctx.fill();

            // -号
            ctx.fillStyle = '#0a0a14';
            ctx.font = 'bold 8px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('−', p.x, p.y);
        });

        // 标注
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('电子绕原子核运动', centerX, h - 20);
    }

    animate() {
        this.updateScattering();
        this.drawScattering();

        this.updatePlanetaryModel();
        this.drawPlanetaryModel();

        requestAnimationFrame(() => this.animate());
    }
}

// 扩展默认内容
if (typeof DefaultContent !== 'undefined') {
    DefaultContent['rutherford-scattering'] = `# 卢瑟福散射实验

1909-1911年，卢瑟福和他的学生盖革、马斯登进行了著名的α粒子散射实验，彻底推翻了汤姆孙的"葡萄干布丁"模型。

## 实验设计

- 用α粒子（氦原子核）轰击很薄的金箔
- 用荧光屏检测α粒子的散射方向
- 测量不同散射角度的粒子数量

## 惊人的发现

> "这就像你向一张薄纱纸发射15英寸的炮弹，结果炮弹反弹回来打中了你！"
> —— 卢瑟福

大多数α粒子直接穿过金箔，只有少数发生大角度偏转，极少数甚至**反弹回来**！

## 两种模型的对比

| 现象 | 布丁模型预测 | 核式模型预测 |
|------|-------------|-------------|
| 大多数粒子 | 小角度偏转 | 直接穿过 ✓ |
| 大角度偏转 | 几乎不可能 | 偶尔发生 ✓ |
| 反弹 | 不可能 | 极少发生 ✓ |

> 💡 **试试看**：切换左侧的模型，观察α粒子在不同模型下的散射行为！

## 卢瑟福原子模型

基于实验结果，卢瑟福提出了**行星模型**：
- 原子质量集中在很小的**原子核**中
- 原子核带正电
- 电子像行星一样**绑定原子核运动**

散射公式给出了散射角θ与撞击参数b的关系：
$$\\cot\\frac{\\theta}{2} = \\frac{2E \\cdot b}{Z_1 Z_2 e^2 k}$$`;
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    new RutherfordSimulation();
});
