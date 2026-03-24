/**
 * 引力透镜交互演示 - 真实粒子模拟
 * 展示观察者、透镜星系、背景光源三体系统
 * 背景光源由300个发光粒子组成，实时计算透镜效应
 */

class GravitationalLensingSimulation {
    constructor() {
        this.canvas = document.getElementById('demo-canvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');

        // 对数质量范围: 10^6 到 10^12 太阳质量
        this.logMass = 9;

        // 背景光源位置 (相对于透镜-观察者连线的偏移)
        this.sourceOffsetX = 0;
        this.sourceOffsetY = 0;

        // 背景光源半径
        this.sourceRadius = 25;

        // 背景光源粒子
        this.sourceParticles = [];
        this.numParticles = 300;

        // 时间用于动画
        this.time = 0;

        this.resize();
        this.generateSourceParticles();
        this.initControls();
        this.initEditor();
        this.loadContent();
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

        // 场景布局:
        // 观察者在底部, 透镜在中间, 背景光源在上方
        this.observerY = this.height - 50;
        this.lensY = this.height * 0.45;
        this.sourceBaseY = 60;
        this.centerX = this.width / 2;
    }

    generateSourceParticles() {
        // 生成球形分布的背景光源粒子
        this.sourceParticles = [];

        for (let i = 0; i < this.numParticles; i++) {
            // 使用球面均匀分布
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = Math.pow(Math.random(), 1 / 3) * this.sourceRadius;

            // 转换为2D投影 (俯视图)
            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi); // 用于亮度调制

            this.sourceParticles.push({
                localX: x,
                localY: y,
                localZ: z,
                brightness: 0.3 + 0.7 * (z + this.sourceRadius) / (2 * this.sourceRadius),
                size: 1.5 + Math.random() * 1.5,
                color: this.getParticleColor()
            });
        }
    }

    getParticleColor() {
        // 星系颜色变化 (蓝白到黄白)
        const hue = 180 + Math.random() * 60;
        const sat = 30 + Math.random() * 40;
        const light = 70 + Math.random() * 30;
        return `hsl(${hue}, ${sat}%, ${light}%)`;
    }

    initControls() {
        const massSlider = document.getElementById('mass-slider');
        const offsetXSlider = document.getElementById('offset-x-slider');
        const offsetYSlider = document.getElementById('offset-y-slider');

        massSlider?.addEventListener('input', (e) => {
            this.logMass = parseFloat(e.target.value);
            this.updateDisplays();
        });

        offsetXSlider?.addEventListener('input', (e) => {
            this.sourceOffsetX = parseFloat(e.target.value);
            this.updateDisplays();
        });

        offsetYSlider?.addEventListener('input', (e) => {
            this.sourceOffsetY = parseFloat(e.target.value);
            this.updateDisplays();
        });

        // 预设按钮
        document.getElementById('preset-perfect')?.addEventListener('click', () => {
            this.logMass = 10;
            this.sourceOffsetX = 0;
            this.sourceOffsetY = 0;
            this.updateDisplays();
        });

        document.getElementById('preset-arc')?.addEventListener('click', () => {
            this.logMass = 10;
            this.sourceOffsetX = 30;
            this.sourceOffsetY = 0;
            this.updateDisplays();
        });

        this.updateDisplays();
    }

    updateDisplays() {
        const massSlider = document.getElementById('mass-slider');
        const offsetXSlider = document.getElementById('offset-x-slider');
        const offsetYSlider = document.getElementById('offset-y-slider');

        if (massSlider) massSlider.value = this.logMass;
        if (offsetXSlider) offsetXSlider.value = this.sourceOffsetX;
        if (offsetYSlider) offsetYSlider.value = this.sourceOffsetY;

        const mass = Math.pow(10, this.logMass);
        const massStr = this.formatMass(mass);

        document.getElementById('mass-value').textContent = `10^${this.logMass}`;
        document.getElementById('mass-display').textContent = massStr;
        document.getElementById('offset-x-value').textContent = this.sourceOffsetX.toFixed(0);
        document.getElementById('offset-y-value').textContent = this.sourceOffsetY.toFixed(0);

        // 爱因斯坦半径
        const einsteinRadius = this.calculateEinsteinRadius();
        document.getElementById('einstein-radius').textContent = einsteinRadius.toFixed(1);

        // 爱因斯坦环状态
        const offset = Math.sqrt(this.sourceOffsetX ** 2 + this.sourceOffsetY ** 2);
        let ringStatus;
        if (offset < 5) ringStatus = '完整环';
        else if (offset < 25) ringStatus = '弧形';
        else if (offset < 45) ringStatus = '双像';
        else ringStatus = '单像';
        document.getElementById('einstein-ring').textContent = ringStatus;

        // 放大倍数
        const magnification = 1 + einsteinRadius / 40;
        document.getElementById('magnification').textContent = magnification.toFixed(1);
    }

    formatMass(mass) {
        if (mass >= 1e12) return `${(mass / 1e12).toFixed(1)} 万亿 M☉`;
        if (mass >= 1e9) return `${(mass / 1e9).toFixed(1)} 十亿 M☉`;
        if (mass >= 1e6) return `${(mass / 1e6).toFixed(1)} 百万 M☉`;
        return `${mass.toFixed(0)} M☉`;
    }

    calculateEinsteinRadius() {
        // 爱因斯坦半径与质量的平方根成正比
        const baseRadius = 30;
        const scaleFactor = (this.logMass - 6) * 12;
        return Math.max(baseRadius, baseRadius + scaleFactor);
    }

    // 计算单个粒子的透镜像位置
    calculateLensedPositions(particleX, particleY) {
        const einsteinRadius = this.calculateEinsteinRadius();

        // 粒子相对于透镜中心的位置
        const dx = particleX;
        const dy = particleY;
        const beta = Math.sqrt(dx * dx + dy * dy); // 源角位置

        if (beta < 0.1) {
            // 完美对齐 - 形成爱因斯坦环
            const numRingPoints = 36;
            const positions = [];
            for (let i = 0; i < numRingPoints; i++) {
                const angle = (i / numRingPoints) * Math.PI * 2;
                positions.push({
                    x: Math.cos(angle) * einsteinRadius,
                    y: Math.sin(angle) * einsteinRadius,
                    magnification: 1.0 / numRingPoints * 10
                });
            }
            return positions;
        }

        // 透镜方程: theta^2 - beta*theta - theta_E^2 = 0
        // 解: theta = (beta ± sqrt(beta^2 + 4*theta_E^2)) / 2
        const thetaE = einsteinRadius;
        const discriminant = Math.sqrt(beta * beta + 4 * thetaE * thetaE);

        // 两个像的角位置
        const theta1 = (beta + discriminant) / 2;
        const theta2 = (beta - discriminant) / 2;

        // 方向单位向量
        const dirX = dx / beta;
        const dirY = dy / beta;

        // 像的位置
        const positions = [];

        // 主像 (外侧, 更亮)
        const mag1 = Math.abs(theta1 / beta * (theta1 / beta + 1) / 2);
        positions.push({
            x: dirX * theta1,
            y: dirY * theta1,
            magnification: Math.min(mag1, 5)
        });

        // 次像 (内侧, 较暗, 倒像)
        if (Math.abs(theta2) > 0) {
            const mag2 = Math.abs(theta2 / beta * (theta2 / beta + 1) / 2);
            positions.push({
                x: -dirX * Math.abs(theta2),
                y: -dirY * Math.abs(theta2),
                magnification: Math.min(mag2, 3)
            });
        }

        return positions;
    }

    initEditor() {
        this.editorHelper = new PageEditorHelper('gravitational-lensing');
        this.editorHelper.initEditor();
    }

    loadContent() {
        if (this.editorHelper) {
            this.editorHelper.loadContent();
        }
    }

    draw() {
        const ctx = this.ctx;
        this.time += 0.01;

        // 深空背景
        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, this.width, this.height);

        // 绘制背景星星
        this.drawStarField();

        // 绘制场景示意线
        this.drawSceneLayout();

        // 绘制背景光源 (原始位置)
        this.drawBackgroundSource();

        // 绘制透镜星系
        this.drawLensGalaxy();

        // 绘制透镜像 (所有粒子的像叠加)
        this.drawLensedImages();

        // 绘制观察者
        this.drawObserver();

        // 绘制爱因斯坦半径参考圆
        this.drawEinsteinRadiusReference();

        // 绘制右下角观察者视图
        this.drawObserverView();
    }

    drawStarField() {
        const ctx = this.ctx;
        const seed = 12345;
        for (let i = 0; i < 60; i++) {
            const x = ((seed * (i + 1) * 7) % this.width);
            const y = ((seed * (i + 1) * 13) % this.height);
            const size = 0.3 + (i % 3) * 0.3;
            const brightness = 0.2 + (i % 5) * 0.08;

            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
            ctx.fill();
        }
    }

    drawSceneLayout() {
        const ctx = this.ctx;

        // 虚线连接观察者、透镜、光源
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(this.centerX, this.observerY - 20);
        ctx.lineTo(this.centerX, this.sourceBaseY + 30);
        ctx.strokeStyle = 'rgba(100, 150, 200, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
    }

    drawBackgroundSource() {
        const ctx = this.ctx;
        const sourceX = this.centerX + this.sourceOffsetX;
        const sourceY = this.sourceBaseY + this.sourceOffsetY;

        // 绘制每个源粒子 (仅用于显示，不影响透镜计算)
        this.sourceParticles.forEach(p => {
            const x = sourceX + p.localX * 1.2;
            const y = sourceY + p.localY * 1.2;

            ctx.beginPath();
            ctx.arc(x, y, p.size * 1.2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(120, 200, 255, ${p.brightness * 0.9})`;
            ctx.fill();
        });

        // 标签
        ctx.font = '11px "Noto Sans SC"';
        ctx.fillStyle = '#64b5f6';
        ctx.textAlign = 'center';
        ctx.fillText('背景光源', sourceX, sourceY - this.sourceRadius * 0.8 - 12);
    }

    drawLensGalaxy() {
        const ctx = this.ctx;
        const radius = 18 + (this.logMass - 6) * 2;

        // 光晕
        const outerGlow = ctx.createRadialGradient(
            this.centerX, this.lensY, 0,
            this.centerX, this.lensY, radius * 2.5
        );
        outerGlow.addColorStop(0, 'rgba(255, 200, 100, 0.25)');
        outerGlow.addColorStop(0.5, 'rgba(200, 150, 100, 0.1)');
        outerGlow.addColorStop(1, 'rgba(150, 100, 80, 0)');

        ctx.beginPath();
        ctx.arc(this.centerX, this.lensY, radius * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = outerGlow;
        ctx.fill();

        // 核心
        const coreGradient = ctx.createRadialGradient(
            this.centerX, this.lensY, 0,
            this.centerX, this.lensY, radius
        );
        coreGradient.addColorStop(0, '#ffe4a0');
        coreGradient.addColorStop(0.4, '#c9a060');
        coreGradient.addColorStop(0.8, '#7a5030');
        coreGradient.addColorStop(1, 'rgba(60, 30, 20, 0.5)');

        ctx.beginPath();
        ctx.arc(this.centerX, this.lensY, radius, 0, Math.PI * 2);
        ctx.fillStyle = coreGradient;
        ctx.fill();

        // 标签
        ctx.font = '11px "Noto Sans SC"';
        ctx.fillStyle = '#ffc107';
        ctx.textAlign = 'center';
        ctx.fillText('透镜星系', this.centerX, this.lensY + radius + 16);
    }

    drawLensedImages() {
        const ctx = this.ctx;
        const einsteinRadius = this.calculateEinsteinRadius();

        // 对每个源粒子计算透镜像
        this.sourceParticles.forEach(p => {
            // 粒子在源坐标系中的位置
            const particleX = this.sourceOffsetX + p.localX;
            const particleY = this.sourceOffsetY + p.localY;

            // 计算透镜像位置
            const lensedPositions = this.calculateLensedPositions(particleX, particleY);

            // 绘制每个像
            lensedPositions.forEach(pos => {
                const imageX = this.centerX + pos.x;
                const imageY = this.lensY + pos.y * 0.3; // 压缩Y方向以适应视角

                const size = p.size * Math.sqrt(pos.magnification) * 0.8;
                const alpha = Math.min(1, p.brightness * pos.magnification * 0.6);

                if (size > 0.3 && alpha > 0.05) {
                    const gradient = ctx.createRadialGradient(
                        imageX, imageY, 0,
                        imageX, imageY, size * 2
                    );
                    gradient.addColorStop(0, `rgba(150, 220, 255, ${alpha})`);
                    gradient.addColorStop(0.5, `rgba(100, 180, 255, ${alpha * 0.5})`);
                    gradient.addColorStop(1, 'rgba(80, 150, 255, 0)');

                    ctx.beginPath();
                    ctx.arc(imageX, imageY, size * 2, 0, Math.PI * 2);
                    ctx.fillStyle = gradient;
                    ctx.fill();
                }
            });
        });
    }

    drawObserver() {
        const ctx = this.ctx;

        // 观察者图标 (望远镜/眼睛)
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('👁️', this.centerX, this.observerY);

        // 标签
        ctx.font = '11px "Noto Sans SC"';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('观察者', this.centerX, this.observerY + 18);

        // 视线范围指示
        ctx.beginPath();
        ctx.moveTo(this.centerX, this.observerY - 15);
        ctx.lineTo(this.centerX - 80, this.lensY + 50);
        ctx.lineTo(this.centerX + 80, this.lensY + 50);
        ctx.closePath();
        ctx.fillStyle = 'rgba(100, 150, 200, 0.05)';
        ctx.fill();
    }

    drawEinsteinRadiusReference() {
        const ctx = this.ctx;
        const einsteinRadius = this.calculateEinsteinRadius();

        // 在透镜平面绘制爱因斯坦半径参考
        ctx.beginPath();
        ctx.ellipse(this.centerX, this.lensY, einsteinRadius, einsteinRadius * 0.3, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.25)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        // 标注
        ctx.font = '9px "JetBrains Mono"';
        ctx.fillStyle = 'rgba(100, 200, 255, 0.5)';
        ctx.textAlign = 'left';
        ctx.fillText(`θ_E`, this.centerX + einsteinRadius + 5, this.lensY);
    }

    drawObserverView() {
        const ctx = this.ctx;
        const einsteinRadius = this.calculateEinsteinRadius();

        // 观察者视图参数
        const viewRadius = 70;
        const viewCenterX = this.width - viewRadius - 15;
        const viewCenterY = this.height - viewRadius - 15;
        const viewScale = viewRadius / (einsteinRadius * 1.8);

        // 绘制视图背景（圆形）
        ctx.save();

        // 创建圆形裁剪区域
        ctx.beginPath();
        ctx.arc(viewCenterX, viewCenterY, viewRadius, 0, Math.PI * 2);
        ctx.clip();

        // 深空背景
        const bgGradient = ctx.createRadialGradient(
            viewCenterX, viewCenterY, 0,
            viewCenterX, viewCenterY, viewRadius
        );
        bgGradient.addColorStop(0, '#0a0a18');
        bgGradient.addColorStop(1, '#050510');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(viewCenterX - viewRadius, viewCenterY - viewRadius, viewRadius * 2, viewRadius * 2);

        // 绘制透镜星系中心（小）
        const lensViewRadius = 8;
        const lensGradient = ctx.createRadialGradient(
            viewCenterX, viewCenterY, 0,
            viewCenterX, viewCenterY, lensViewRadius
        );
        lensGradient.addColorStop(0, '#ffe4a0');
        lensGradient.addColorStop(0.5, '#c9a060');
        lensGradient.addColorStop(1, 'rgba(60, 30, 20, 0.5)');

        ctx.beginPath();
        ctx.arc(viewCenterX, viewCenterY, lensViewRadius, 0, Math.PI * 2);
        ctx.fillStyle = lensGradient;
        ctx.fill();

        // 绘制每个源粒子在观察者视角下的像
        this.sourceParticles.forEach(p => {
            const particleX = this.sourceOffsetX + p.localX;
            const particleY = this.sourceOffsetY + p.localY;

            const lensedPositions = this.calculateLensedPositions(particleX, particleY);

            lensedPositions.forEach(pos => {
                // 在观察者视图中的位置（缩放后）
                const imageX = viewCenterX + pos.x * viewScale;
                const imageY = viewCenterY + pos.y * viewScale;

                const size = p.size * Math.sqrt(pos.magnification) * viewScale * 0.8;
                const alpha = Math.min(1, p.brightness * pos.magnification * 0.7);

                if (size > 0.2 && alpha > 0.05) {
                    const gradient = ctx.createRadialGradient(
                        imageX, imageY, 0,
                        imageX, imageY, size * 2
                    );
                    gradient.addColorStop(0, `rgba(150, 220, 255, ${alpha})`);
                    gradient.addColorStop(0.6, `rgba(100, 180, 255, ${alpha * 0.4})`);
                    gradient.addColorStop(1, 'rgba(80, 150, 255, 0)');

                    ctx.beginPath();
                    ctx.arc(imageX, imageY, size * 2, 0, Math.PI * 2);
                    ctx.fillStyle = gradient;
                    ctx.fill();
                }
            });
        });

        ctx.restore();

        // 绘制视图边框
        ctx.beginPath();
        ctx.arc(viewCenterX, viewCenterY, viewRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 绘制视图标题
        ctx.font = '10px "Noto Sans SC"';
        ctx.fillStyle = '#64b5f6';
        ctx.textAlign = 'center';
        ctx.fillText('👁️ 观察者视角', viewCenterX, viewCenterY - viewRadius - 8);

        // 绘制爱因斯坦半径参考圆（在观察者视图中）
        const einsteinViewRadius = einsteinRadius * viewScale;
        ctx.beginPath();
        ctx.arc(viewCenterX, viewCenterY, einsteinViewRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    animate() {
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

document.addEventListener('DOMContentLoaded', () => new GravitationalLensingSimulation());
