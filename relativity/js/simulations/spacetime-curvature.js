/**
 * 时空弯曲交互演示
 */

class SpacetimeCurvatureSimulation {
    constructor() {
        this.canvas = document.getElementById('demo-canvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.mass = 1; // 太阳质量
        this.particles = [];
        this.absorbedCount = 0; // 被吸收的粒子计数
        this.gridSize = 20; // 更密集的网格，产生放大效果

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
    }

    initControls() {
        const massSlider = document.getElementById('mass-slider');

        massSlider?.addEventListener('input', (e) => {
            this.mass = parseFloat(e.target.value);
            this.updateDisplays();
        });

        document.getElementById('preset-sun')?.addEventListener('click', () => this.setMass(1));
        document.getElementById('preset-neutron')?.addEventListener('click', () => this.setMass(2));
        document.getElementById('preset-blackhole')?.addEventListener('click', () => this.setMass(10));
        document.getElementById('add-particle')?.addEventListener('click', () => this.addParticle());
    }

    setMass(m) {
        this.mass = m;
        document.getElementById('mass-slider').value = m;
        this.updateDisplays();
    }

    addParticle() {
        const angle = Math.random() * Math.PI * 2;
        const distance = 80 + Math.random() * 80; // 粒子更靠近中心
        const speed = 1.5 + Math.random();

        this.particles.push({
            x: this.centerX + Math.cos(angle) * distance,
            y: this.centerY + Math.sin(angle) * distance,
            vx: Math.cos(angle + Math.PI / 2) * speed,
            vy: Math.sin(angle + Math.PI / 2) * speed,
            trail: [],
            color: `hsl(${Math.random() * 60 + 180}, 80%, 60%)`
        });

        if (this.particles.length > 50) this.particles.shift();
        this.updateDisplays();
    }

    updateDisplays() {
        const massValue = document.getElementById('mass-value');
        const massDisplay = document.getElementById('mass-display');
        const displayMass = document.getElementById('display-mass');
        const schwarzschild = document.getElementById('schwarzschild');
        const curvature = document.getElementById('curvature');
        const particleCount = document.getElementById('particle-count');
        const absorbedCount = document.getElementById('absorbed-count');

        const rs = this.mass * 3; // 史瓦西半径 (km)，简化计算

        if (massValue) massValue.textContent = this.mass.toFixed(1);
        if (massDisplay) massDisplay.textContent = this.mass.toFixed(1) + ' 太阳质量';
        if (displayMass) displayMass.textContent = this.mass.toFixed(1);
        if (schwarzschild) schwarzschild.textContent = rs.toFixed(1);
        if (curvature) curvature.textContent = this.mass.toFixed(1);
        if (particleCount) particleCount.textContent = this.particles.length;
        if (absorbedCount) absorbedCount.textContent = this.absorbedCount;
    }

    initEditor() {
        // 使用通用编辑器辅助类
        this.editorHelper = new PageEditorHelper('spacetime-curvature');
        this.editorHelper.initEditor();
    }

    loadContent() {
        if (this.editorHelper) {
            this.editorHelper.loadContent();
        }
    }

    getGridDeformation(x, y) {
        const dx = x - this.centerX;
        const dy = y - this.centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 天体视觉半径
        const visualRadius = 25 + this.mass * 8;
        if (distance < visualRadius) return { x: 0, y: 0 };

        // 改进的弯曲公式：混合使用1/r和1/r²
        // 1/r²在近处效果强，1/r在远处也能看到形变
        const baseCurvature = Math.log10(this.mass + 1) + 1.5;
        const nearFieldStrength = baseCurvature * this.mass * 4000 / (distance * distance);
        const farFieldStrength = baseCurvature * this.mass * 150 / distance; // 远场效果
        const strength = nearFieldStrength + farFieldStrength;
        const maxDeform = 200 * Math.sqrt(this.mass);
        const deform = Math.min(strength, maxDeform);

        return {
            x: (dx / distance) * deform,
            y: (dy / distance) * deform
        };
    }

    draw() {
        const ctx = this.ctx;
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(0, 0, this.width, this.height);

        // 绘制弯曲的网格
        this.drawCurvedGrid();

        // 更新和绘制粒子
        this.updateParticles();

        // 绘制中心天体
        this.drawCentralMass();
    }

    drawCurvedGrid() {
        const ctx = this.ctx;
        const gridSpacing = this.gridSize;

        ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
        ctx.lineWidth = 1;

        // 水平线
        for (let y = gridSpacing; y < this.height; y += gridSpacing) {
            ctx.beginPath();
            for (let x = 0; x <= this.width; x += 5) {
                const deform = this.getGridDeformation(x, y);
                const newX = x + deform.x;
                const newY = y + deform.y;

                if (x === 0) {
                    ctx.moveTo(newX, newY);
                } else {
                    ctx.lineTo(newX, newY);
                }
            }
            ctx.stroke();
        }

        // 垂直线
        for (let x = gridSpacing; x < this.width; x += gridSpacing) {
            ctx.beginPath();
            for (let y = 0; y <= this.height; y += 5) {
                const deform = this.getGridDeformation(x, y);
                const newX = x + deform.x;
                const newY = y + deform.y;

                if (y === 0) {
                    ctx.moveTo(newX, newY);
                } else {
                    ctx.lineTo(newX, newY);
                }
            }
            ctx.stroke();
        }
    }

    drawCentralMass() {
        const ctx = this.ctx;
        const radius = 25 + this.mass * 8; // 增大天体视觉尺寸

        // 发光效果
        const glow = ctx.createRadialGradient(
            this.centerX, this.centerY, radius * 0.5,
            this.centerX, this.centerY, radius * 3
        );
        glow.addColorStop(0, 'rgba(251, 191, 36, 0.3)');
        glow.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, radius * 3, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // 天体本身
        const gradient = ctx.createRadialGradient(
            this.centerX - radius * 0.3, this.centerY - radius * 0.3, 0,
            this.centerX, this.centerY, radius
        );
        gradient.addColorStop(0, '#fde68a');
        gradient.addColorStop(0.5, '#f59e0b');
        gradient.addColorStop(1, '#b45309');

        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
    }

    updateParticles() {
        const ctx = this.ctx;
        // 天体的吸收半径（视觉半径）
        const absorptionRadius = 25 + this.mass * 8;

        this.particles = this.particles.filter(p => {
            // 引力计算
            const dx = this.centerX - p.x;
            const dy = this.centerY - p.y;
            const distSq = dx * dx + dy * dy;
            const dist = Math.sqrt(distSq);

            // 检测是否被天体吸收
            if (dist < absorptionRadius) {
                this.absorbedCount++;
                this.updateDisplays();
                return false; // 粒子被吸收
            }

            // 飞出屏幕
            if (dist > Math.max(this.width, this.height)) return false;

            // 引力强度随质量增加
            const force = this.mass * 80 / distSq;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;

            p.x += p.vx;
            p.y += p.vy;

            // 记录轨迹
            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > 100) p.trail.shift();

            // 绘制轨迹
            if (p.trail.length > 1) {
                ctx.beginPath();
                ctx.moveTo(p.trail[0].x, p.trail[0].y);
                for (let i = 1; i < p.trail.length; i++) {
                    ctx.lineTo(p.trail[i].x, p.trail[i].y);
                }
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.5;
                ctx.stroke();
                ctx.globalAlpha = 1;
            }

            // 绘制粒子
            ctx.beginPath();
            ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();

            return true;
        });

        document.getElementById('particle-count').textContent = this.particles.length;
    }

    animate() {
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SpacetimeCurvatureSimulation();
});
