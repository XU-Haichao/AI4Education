/**
 * 黑洞交互演示
 */

class BlackHoleSimulation {
    constructor() {
        this.canvas = document.getElementById('demo-canvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.logMass = 1; // 对数质量，1表示10太阳质量
        this.accretionParticles = [];
        this.jetParticles = []; // 喷流粒子

        this.resize();
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
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
        this.createAccretionDisk();
        this.createJetParticles();
    }

    // 计算黑洞视觉半径 - 10^8太阳质量时达到最大
    getBlackHoleRadius() {
        // logMass范围1-8，视觉半径范围20-68 (10^8对应的logMass=8时为最大)
        return 20 + (this.logMass - 1) * 6.85; // 1->20, 8->68
    }

    // 获取基准黑洞半径（logMass=1时的半径）
    getBaseBlackHoleRadius() {
        return 20; // logMass=1时的固定半径
    }

    createAccretionDisk() {
        this.accretionParticles = [];
        const numParticles = 1500;
        const bhRadius = this.getBlackHoleRadius();
        const baseRadius = this.getBaseBlackHoleRadius();
        const innerRadius = bhRadius * 4;

        // 外边界: 基准值 * (1 + 0.05 * log10(M))
        const outerRadiusFactor = 1 + this.logMass * 0.05;
        const outerRadius = baseRadius * 20 * outerRadiusFactor;

        // 质量越大，角速度越慢
        const massSpeedFactor = 1 / (1 + this.logMass * 0.3);

        for (let i = 0; i < numParticles; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radiusRange = Math.max(0, outerRadius - innerRadius);
            const radiusBase = innerRadius + Math.random() * radiusRange;

            this.accretionParticles.push({
                angle,
                radius: radiusBase,
                speed: (0.003 + (innerRadius / radiusBase) * 0.02) * massSpeedFactor,
                // 粒子大小增大为原来的1.2倍
                size: (10 + Math.random() * 20) * 1.2,
                brightness: (0.3 + Math.random() * 0.6) * 1.5,
                offsetY: (Math.random() - 0.5) * 0.25
            });
        }
    }

    createJetParticles() {
        this.jetParticles = [];
        const numParticles = 600; // 粒子数增加一倍 (600)
        const bhRadius = this.getBlackHoleRadius();
        const jetLength = bhRadius * 15; // 喷流长度
        const startOffset = bhRadius * 1.65; // 起点设定为1.65倍黑洞半径
        const jetAngle = 0.21; // 张角减小为12度 (约0.21 rad)

        for (let i = 0; i < numParticles; i++) {
            const isUp = i < numParticles / 2;
            // 距离从 startOffset 开始
            const distance = startOffset + Math.random() * jetLength;

            // 锥形分布 (基于距离起点的距离)
            const distFromStart = distance - startOffset;
            const spread = distFromStart * jetAngle * (Math.random() - 0.5) * 2;

            this.jetParticles.push({
                distance: distance,
                startOffset: startOffset, // 存储起点
                spread: spread,
                speed: 8 + Math.random() * 12,
                size: 5 + Math.random() * 8, // 增大粒子大小
                brightness: 0.6 + Math.random() * 0.4, // 增加亮度
                isUp: isUp,
                maxDistance: startOffset + jetLength // 最大距离也要偏移
            });
        }
    }

    initControls() {
        const massSlider = document.getElementById('mass-slider');
        massSlider?.addEventListener('input', (e) => {
            this.logMass = parseFloat(e.target.value);
            this.createAccretionDisk();
            this.createJetParticles();
            this.updateDisplays();
        });

        document.getElementById('preset-stellar')?.addEventListener('click', () => {
            this.logMass = 1;
            this.createAccretionDisk();
            this.createJetParticles();
            this.updateDisplays();
        });
        document.getElementById('preset-intermediate')?.addEventListener('click', () => {
            this.logMass = 4;
            this.createAccretionDisk();
            this.createJetParticles();
            this.updateDisplays();
        });
        document.getElementById('preset-supermassive')?.addEventListener('click', () => {
            this.logMass = 8;
            this.createAccretionDisk();
            this.createJetParticles();
            this.updateDisplays();
        });

        this.updateDisplays();
    }

    formatMass(mass) {
        if (mass >= 1e8) return `${(mass / 1e8).toFixed(1)} 亿 M☉`;
        if (mass >= 1e4) return `${(mass / 1e4).toFixed(1)} 万 M☉`;
        return `${mass.toFixed(0)} M☉`;
    }

    updateDisplays() {
        const mass = Math.pow(10, this.logMass);

        document.getElementById('mass-slider').value = this.logMass;
        document.getElementById('mass-value').textContent = `10^${this.logMass}`;
        document.getElementById('mass-display').textContent = this.formatMass(mass);

        const rs = mass * 3;

        if (rs >= 1e9) {
            document.getElementById('schwarzschild').textContent = (rs / 1e9).toFixed(1);
            document.querySelector('#schwarzschild + .result-unit').textContent = '十亿km';
        } else if (rs >= 1e6) {
            document.getElementById('schwarzschild').textContent = (rs / 1e6).toFixed(1);
            document.querySelector('#schwarzschild + .result-unit').textContent = '百万km';
        } else if (rs >= 1e3) {
            document.getElementById('schwarzschild').textContent = (rs / 1e3).toFixed(1);
            document.querySelector('#schwarzschild + .result-unit').textContent = '千km';
        } else {
            document.getElementById('schwarzschild').textContent = rs.toFixed(0);
            document.querySelector('#schwarzschild + .result-unit').textContent = 'km';
        }

        const photonSphereRs = rs * 1.5;
        if (photonSphereRs >= 1e9) {
            document.getElementById('photon-sphere').textContent = (photonSphereRs / 1e9).toFixed(1);
        } else if (photonSphereRs >= 1e6) {
            document.getElementById('photon-sphere').textContent = (photonSphereRs / 1e6).toFixed(1);
        } else if (photonSphereRs >= 1e3) {
            document.getElementById('photon-sphere').textContent = (photonSphereRs / 1e3).toFixed(1);
        } else {
            document.getElementById('photon-sphere').textContent = photonSphereRs.toFixed(0);
        }
    }

    initEditor() {
        this.editorHelper = new PageEditorHelper('black-holes');
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

        const bhRadius = this.getBlackHoleRadius();

        // 0. 更新所有喷流粒子
        this.updateJetParticles();

        // 1. 绘制下喷流
        this.drawJetParticles(false);

        // 2. 绘制吸积盘（后半部分）
        this.drawAccretionDisk(bhRadius, false);

        // 3. 绘制黑洞
        const gradient = ctx.createRadialGradient(
            this.centerX, this.centerY, bhRadius * 0.5,
            this.centerX, this.centerY, bhRadius * 1.5
        );
        gradient.addColorStop(0, '#000000');
        gradient.addColorStop(0.7, 'rgba(10, 0, 20, 0.9)');
        gradient.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, bhRadius * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, bhRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.fill();
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 4. 绘制上喷流
        this.drawJetParticles(true);

        // 5. 绘制吸积盘（前半部分）
        this.drawAccretionDisk(bhRadius, true);

        // 标签
        ctx.font = '10px "Noto Sans SC"';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'center';
        ctx.fillText('视界', this.centerX, this.centerY + bhRadius + 15);
    }

    drawAccretionDisk(bhRadius, frontOnly) {
        const ctx = this.ctx;
        const baseRadius = this.getBaseBlackHoleRadius();
        const innerRadius = bhRadius * 4;

        // 使用同样的动态外边界公式
        const outerRadiusFactor = 1 + this.logMass * 0.05;
        const outerRadius = baseRadius * 20 * outerRadiusFactor;

        this.accretionParticles.forEach(p => {
            p.angle += p.speed;

            const x = this.centerX + Math.cos(p.angle) * p.radius;
            const flattenFactor = 0.5 + p.offsetY;
            const y = this.centerY + Math.sin(p.angle) * p.radius * flattenFactor;

            const isFront = Math.sin(p.angle) > 0;
            if (frontOnly !== isFront) return;

            const distRatio = Math.max(0, Math.min(1, (p.radius - innerRadius) / (outerRadius - innerRadius)));
            const hue = 10 + distRatio * 30;
            const lightness = 65 - distRatio * 25;

            const gradient = ctx.createRadialGradient(x, y, 0, x, y, p.size);
            const alpha = Math.min(1, p.brightness);
            gradient.addColorStop(0, `hsla(${hue}, 100%, ${lightness}%, ${alpha})`);
            gradient.addColorStop(0.4, `hsla(${hue}, 90%, ${lightness - 10}%, ${alpha * 0.6})`);
            gradient.addColorStop(1, `hsla(${hue}, 80%, ${lightness - 20}%, 0)`);

            ctx.beginPath();
            ctx.arc(x, y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
        });
    }

    updateJetParticles() {
        // 张角
        const jetAngle = 0.21;

        this.jetParticles.forEach(p => {
            p.distance += p.speed;
            if (p.distance > p.maxDistance) {
                p.distance = p.startOffset; // 重置到起点
                // 重新随机一个分布方向，但要保持在锥形内
                // 这里简单处理，重置时重新算 spread 为 0 (顶点)？不对，起点是宽的吗？
                // 如果起点在 3R，这已经是"切掉的锥体"的底面了.
                // 简单点：重置时 recalculate spread based on distance (which is startOffset)
                // 实际上 spread 从 0 开始也可以，或者从 startOffset 对应的宽度开始
                // spread = (dist - startOffset) * angle. At startOffset, spread is 0.
                p.spread = 0;
            } else {
                // 动态扩散
                const distFromStart = p.distance - p.startOffset;
                // 这里的 spread 可以稍微抖动一下使其更有机
                // 或者简单地线性增加
                // spread 应该是 x-offset. 
                // 我们在 create 时分配了 spread direction. 
                // 让它稍微随机扩散
                // 每一帧由于 speed 很小，我们希望它沿着之前的轨迹走
                // 但 create 里面没有存 vector.
                // 简易做法：spread = (distance - startOffset) * angle * randomFactor
                // 为了保持连贯性，我们应该在 create 时存储 'trajectoryAngle' 
                // 但为了简单，并在 createJetParticles 里面使用的是 (Math.random() - 0.5) * 2 作为方向因子
                // 我们确实没存方向因子。

                // Hack: 根据当前位置反推方向因子? 或者重新计算 spread
                // p.spread = distFromStart * jetAngle * (Math.random() - 0.5) * 2; // 这会让它闪烁

                // Let's improve: create 时存 'direction'
                if (p.direction === undefined) {
                    p.direction = (Math.random() - 0.5) * 2;
                }

                p.spread = distFromStart * jetAngle * p.direction;
            }
        });
    }

    drawJetParticles(drawUpper) {
        const ctx = this.ctx;

        this.jetParticles.forEach(p => {
            if (p.isUp !== drawUpper) return;

            const x = this.centerX + p.spread;
            const yOffset = p.distance;
            const y = p.isUp ? this.centerY - yOffset : this.centerY + yOffset;

            // 距离起点的距离
            const distFromStart = p.distance - p.startOffset;
            const totalJetLen = p.maxDistance - p.startOffset;

            // 距离越远，越暗越透明
            const distRatio = distFromStart / totalJetLen;
            const alpha = Math.max(0, (1 - distRatio * 0.8) * p.brightness);
            const size = p.size * (1 - distRatio * 0.5);

            const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
            gradient.addColorStop(0, `rgba(100, 180, 255, ${alpha})`);
            gradient.addColorStop(0.4, `rgba(80, 150, 255, ${alpha * 0.6})`);
            gradient.addColorStop(1, `rgba(60, 120, 255, 0)`);

            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
        });
    }

    animate() {
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

document.addEventListener('DOMContentLoaded', () => new BlackHoleSimulation());
