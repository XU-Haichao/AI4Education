/**
 * 质能方程 E=mc² 交互演示 - 正反物质湮灭
 */

class MassEnergySimulation {
    constructor() {
        this.canvas = document.getElementById('demo-canvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.c = 299792458; // 光速 m/s
        this.mass = 1; // kg
        this.energy = this.mass * this.c * this.c;

        // 动画状态
        this.animationPhase = 0; // 0: 接近, 1: 碰撞, 2: 爆炸
        this.animationProgress = 0;
        this.shockwaves = [];
        this.explosionParticles = [];

        this.resize();
        this.initControls();
        this.initEditor();
        this.loadContent();
        this.updateDisplays();
        this.animate();

        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
    }

    initControls() {
        const massSlider = document.getElementById('mass-slider');

        if (massSlider) {
            massSlider.addEventListener('input', (e) => {
                const exp = parseFloat(e.target.value);
                this.setMass(Math.pow(10, exp));
            });
        }

        // 预设按钮使用直接赋值
        document.getElementById('preset-atom')?.addEventListener('click', () => {
            this.setMass(1e-26);
            document.getElementById('mass-slider').value = -26;
        });
        document.getElementById('preset-cell')?.addEventListener('click', () => {
            this.setMass(1e-12); // 1ng = 10^-12 kg
            document.getElementById('mass-slider').value = -12;
        });
        document.getElementById('preset-hair')?.addEventListener('click', () => {
            this.setMass(1e-6); // 1mg = 10^-6 kg
            document.getElementById('mass-slider').value = -6;
        });
        document.getElementById('preset-human')?.addEventListener('click', () => {
            this.setMass(100);
            document.getElementById('mass-slider').value = 2;
        });
    }

    setMass(m) {
        this.mass = m;
        this.energy = m * this.c * this.c;
        this.resetAnimation();
        this.updateDisplays();
    }

    resetAnimation() {
        this.animationPhase = 0;
        this.animationProgress = 0;
        this.shockwaves = [];
        this.explosionParticles = [];
    }

    updateDisplays() {
        const massValue = document.getElementById('mass-value');
        const displayMass = document.getElementById('display-mass');
        const displayEnergy = document.getElementById('display-energy');
        const displayTnt = document.getElementById('display-tnt');
        const displayPower = document.getElementById('display-power');

        // 科学计数法格式化（使用Unicode上标）
        const toSuperscript = (num) => {
            const superscripts = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
            return num.toString().split('').map(c => superscripts[c] || c).join('');
        };

        const formatScientific = (value) => {
            if (value === 0) return '0';
            const exp = Math.floor(Math.log10(Math.abs(value)));
            const mantissa = value / Math.pow(10, exp);
            if (exp === 0) return mantissa.toFixed(2);
            if (exp === 1) return value.toFixed(1);
            return mantissa.toFixed(2) + '×10' + toSuperscript(exp);
        };

        // TNT当量 (1吨TNT = 4.184×10⁹ J)
        const tntTons = this.energy / (4.184e9);

        // 供电年户数 (假设每户每年3000kWh = 1.08×10¹⁰ J)
        const households = this.energy / (1.08e10);

        if (massValue) massValue.textContent = formatScientific(this.mass);
        if (displayMass) displayMass.textContent = formatScientific(this.mass);
        if (displayEnergy) displayEnergy.textContent = formatScientific(this.energy);
        if (displayTnt) displayTnt.textContent = formatScientific(tntTons);
        if (displayPower) displayPower.textContent = formatScientific(households);
    }

    initEditor() {
        // 使用通用编辑器辅助类
        this.editorHelper = new PageEditorHelper('mass-energy');
        this.editorHelper.initEditor();
    }

    loadContent() {
        if (this.editorHelper) {
            this.editorHelper.loadContent();
        }
    }

    draw() {
        const ctx = this.ctx;
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(0, 0, this.width, this.height);

        const centerX = this.width / 2;
        const centerY = this.height / 2;

        // 粒子大小基于质量的对数缩放
        // 质量范围: 10^-26 到 10^2，指数范围: -26 到 2 (共28个数量级)
        // 映射到粒子半径: 10px 到 50px
        const massExponent = this.mass > 0 ? Math.log10(this.mass) : -26;
        const normalizedExp = (massExponent + 26) / 28; // 归一化到 0-1
        const particleRadius = 10 + normalizedExp * 40; // 10px 到 50px

        // 更新动画进度
        this.updateAnimation();

        // 绘制正反物质和湮灭效果
        if (this.animationPhase === 0) {
            // 接近阶段
            const separation = 200 * (1 - this.animationProgress);
            this.drawParticle(centerX - separation, centerY, particleRadius, true); // 正物质
            this.drawParticle(centerX + separation, centerY, particleRadius, false); // 反物质
        } else if (this.animationPhase === 1) {
            // 碰撞阶段
            const flashIntensity = Math.sin(this.animationProgress * Math.PI);
            this.drawCollisionFlash(centerX, centerY, particleRadius * 3, flashIntensity);
        } else {
            // 爆炸阶段 - 先画冲击波，再画粒子（粒子在上层）
            this.drawShockwaves(centerX, centerY);
            this.drawExplosion(centerX, centerY);
        }
    }

    updateAnimation() {
        const speed = 0.015;

        if (this.animationPhase === 0) {
            // 接近阶段
            this.animationProgress += speed;
            if (this.animationProgress >= 1) {
                this.animationPhase = 1;
                this.animationProgress = 0;
            }
        } else if (this.animationPhase === 1) {
            // 碰撞阶段
            this.animationProgress += speed * 3;
            if (this.animationProgress >= 1) {
                this.animationPhase = 2;
                this.animationProgress = 0;
                this.createExplosion();
                this.createShockwave();
            }
        } else {
            // 爆炸阶段
            this.animationProgress += speed;
            if (this.animationProgress >= 2) {
                this.resetAnimation();
            }
        }
    }

    drawParticle(x, y, radius, isMatter) {
        const ctx = this.ctx;

        if (isMatter) {
            // 纯白色的正物质
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(0.5, '#ffffff');
            gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.6)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();

            // 白色发光效果
            ctx.beginPath();
            ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fill();
        } else {
            // 暗淡的反物质
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, '#8b5cf6');
            gradient.addColorStop(0.5, '#6366f1');
            gradient.addColorStop(1, 'rgba(99, 102, 241, 0.2)');

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();

            // 微弱发光
            ctx.beginPath();
            ctx.arc(x, y, radius * 1.3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(99, 102, 241, 0.1)';
            ctx.fill();
        }
    }

    drawCollisionFlash(x, y, radius, intensity) {
        const ctx = this.ctx;

        // 强烈的白色闪光
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * intensity);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${intensity})`);
        gradient.addColorStop(0.5, `rgba(245, 158, 11, ${intensity * 0.8})`);
        gradient.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(x, y, radius * intensity, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
    }

    createExplosion() {
        this.explosionParticles = [];
        // 粒子数量基于质量的对数 - 从10到10001的范围
        // 质量范围: 10^-26 到 10^2（共281个数量级）
        const massExponent = this.mass > 0 ? Math.log10(this.mass) : -26;
        const normalizedExp = (massExponent + 26) / 28; // 归一化到0-1
        const particleCount = Math.round(10 + normalizedExp * 990); // 10 到1000

        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.3;
            const speed = 2 + Math.random() * 4;
            const size = 2 + Math.random() * 3;

            this.explosionParticles.push({
                angle,
                distance: 0,
                speed,
                size,
                life: 1,
                // 亮度基于质量，范围更广
                brightness: 60 + Math.log10(this.mass + 1) * 15
            });
        }
    }

    drawExplosion(centerX, centerY) {
        const ctx = this.ctx;
        // 传播距离基于质量：质量越大，传播越远
        const massFactor = Math.log10(this.mass + 1);
        const maxDist = Math.min(this.width, this.height) * (0.4 + massFactor * 0.1);

        this.explosionParticles.forEach(p => {
            p.distance += p.speed;
            p.life = Math.max(0, 1 - p.distance / maxDist);

            const x = centerX + Math.cos(p.angle) * p.distance;
            const y = centerY + Math.sin(p.angle) * p.distance;

            // 尾迹
            const tailLength = 15;
            const tailX = x - Math.cos(p.angle) * tailLength;
            const tailY = y - Math.sin(p.angle) * tailLength;

            const gradient = ctx.createLinearGradient(tailX, tailY, x, y);
            gradient.addColorStop(0, 'transparent');
            gradient.addColorStop(1, `hsl(${30 + Math.random() * 30}, 100%, ${p.brightness * p.life}%)`);

            ctx.beginPath();
            ctx.moveTo(tailX, tailY);
            ctx.lineTo(x, y);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = p.size * p.life;
            ctx.stroke();

            // 粒子
            ctx.beginPath();
            ctx.arc(x, y, p.size * p.life, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${40 + Math.random() * 20}, 100%, ${p.brightness}%, ${p.life})`;
            ctx.fill();
        });
    }

    createShockwave() {
        // 只创建一个冲击波，宽度和亮度由质量控制
        const massExponent = this.mass > 0 ? Math.log10(this.mass) : -26;
        const normalizedExp = (massExponent + 26) / 28; // 归一化到0-1

        // 清空之前的冲击波，确保只有一个
        this.shockwaves = [{
            radius: 0,
            maxRadius: Math.min(this.width, this.height) * 0.7,
            alpha: 0.3 + normalizedExp * 0.7, // 亮度: 0.3 到 1.0
            width: 3 + normalizedExp * 97, // 宽度: 3px 到 100px
            speed: 4 + normalizedExp * 4 // 速度: 4 到 8
        }];
    }

    drawShockwaves(centerX, centerY) {
        const ctx = this.ctx;

        // 计算粒子的最后端距离（用于同步冲击波内边界）
        let minParticleDistance = Infinity;
        this.explosionParticles.forEach(p => {
            if (p.distance < minParticleDistance) {
                minParticleDistance = p.distance;
            }
        });
        if (minParticleDistance === Infinity) minParticleDistance = 0;

        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const wave = this.shockwaves[i];

            // 内边界跟随粒子最后端
            const innerRadius = minParticleDistance;
            // 外边界 = 内边界 + 宽度
            const outerRadius = innerRadius + wave.width;

            // 使用与粒子相同的最大距离来计算进度，确保同步消散
            const massExponent = this.mass > 0 ? Math.log10(this.mass) : -26;
            const normalizedExp = (massExponent + 26) / 28;
            const particleMaxDist = Math.min(this.width, this.height) * (0.3 + normalizedExp * 0.08);

            // 使用最大粒子距离来计算alpha，冲击波消散速度为粒子的1/2（持续时间2倍）
            const maxParticleDist = Math.max(...this.explosionParticles.map(p => p.distance), 0);
            const particleProgress = maxParticleDist / particleMaxDist;
            const shockwaveProgress = particleProgress / 2; // 冲击波进度为粒子的1/2
            const alpha = wave.alpha * Math.max(0, 1 - shockwaveProgress);

            // 只有当alpha完全消失时才移除冲击波，确保渐变消失
            if (alpha <= 0.01) {
                this.shockwaves.splice(i, 1);
                continue;
            }

            // 使用径向渐变实现内亮外暗效果
            const gradient = ctx.createRadialGradient(
                centerX, centerY, innerRadius,
                centerX, centerY, outerRadius
            );

            // 内边缘明亮，外边缘暗淡
            gradient.addColorStop(0, `rgba(245, 158, 11, ${Math.min(1, alpha)})`);
            gradient.addColorStop(0.3, `rgba(245, 158, 11, ${Math.min(1, alpha * 0.7)})`);
            gradient.addColorStop(0.7, `rgba(245, 158, 11, ${alpha * 0.3})`);
            gradient.addColorStop(1, 'rgba(245, 158, 11, 0)');

            // 绘制环形
            ctx.beginPath();
            ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
            if (innerRadius > 0) {
                ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2, true);
            }
            ctx.fillStyle = gradient;
            ctx.fill();
        }
        // 不再定期创建新冲击波
    }

    animate() {
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MassEnergySimulation();
});
