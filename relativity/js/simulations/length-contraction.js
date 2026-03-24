/**
 * 长度收缩交互演示
 */

class LengthContractionSimulation {
    constructor() {
        this.canvas = document.getElementById('demo-canvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.velocity = 0;
        this.gamma = 1;
        this.restLength = 100;
        this.shipX = 0;

        // 加载火箭SVG图片
        this.rocketImage = new Image();
        this.rocketImage.src = '../../assets/svg/rocket.svg';
        this.rocketLoaded = false;
        this.rocketImage.onload = () => {
            this.rocketLoaded = true;
        };

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
    }

    initControls() {
        const velocitySlider = document.getElementById('velocity-slider');
        const velocityValue = document.getElementById('velocity-value');

        if (velocitySlider) {
            velocitySlider.addEventListener('input', (e) => {
                this.setVelocity(parseFloat(e.target.value) / 100);
                velocityValue.textContent = e.target.value + '%';
            });
        }

        document.getElementById('preset-1')?.addEventListener('click', () => this.setPreset(0.1));
        document.getElementById('preset-2')?.addEventListener('click', () => this.setPreset(0.5));
        document.getElementById('preset-3')?.addEventListener('click', () => this.setPreset(0.8));
        document.getElementById('preset-4')?.addEventListener('click', () => this.setPreset(0.95));
        document.getElementById('reset-btn')?.addEventListener('click', () => this.setPreset(0));
    }

    setPreset(v) {
        this.setVelocity(v);
        const slider = document.getElementById('velocity-slider');
        const value = document.getElementById('velocity-value');
        if (slider) slider.value = v * 100;
        if (value) value.textContent = (v * 100).toFixed(1) + '%';
    }

    setVelocity(v) {
        this.velocity = Math.min(0.999, Math.max(0, v));
        this.gamma = 1 / Math.sqrt(1 - this.velocity * this.velocity);
        this.updateDisplays();
    }

    updateDisplays() {
        const speedDisplay = document.getElementById('speed-display');
        const contractionDisplay = document.getElementById('contraction-display');
        const contractedLength = document.getElementById('contracted-length');
        const lengthReduction = document.getElementById('length-reduction');
        const gammaValue = document.getElementById('gamma-value');

        const contractFactor = 1 / this.gamma;
        const newLength = this.restLength * contractFactor;
        const reduction = (1 - contractFactor) * 100;

        if (speedDisplay) speedDisplay.textContent = this.velocity.toFixed(2) + 'c';
        if (contractionDisplay) contractionDisplay.textContent = contractFactor.toFixed(3);
        if (contractedLength) contractedLength.textContent = newLength.toFixed(2);
        if (lengthReduction) lengthReduction.textContent = reduction.toFixed(2);
        if (gammaValue) gammaValue.textContent = this.gamma.toFixed(3);
    }

    initEditor() {
        // 使用通用编辑器辅助类
        this.editorHelper = new PageEditorHelper('length-contraction');
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

        // 星空效果
        const time = Date.now() * 0.001;
        for (let i = 0; i < 50; i++) {
            const speed = this.velocity * 300 + 10;
            const x = ((i * 73 + time * speed) % (this.width + 100)) - 50;
            const y = (i * 97) % this.height;

            ctx.beginPath();
            if (this.velocity > 0.5) {
                // 高速时变成线条
                ctx.moveTo(x, y);
                ctx.lineTo(x - this.velocity * 30, y);
                ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 + Math.sin(time + i) * 0.2})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            } else {
                ctx.arc(x, y, 1, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.sin(time + i) * 0.2})`;
                ctx.fill();
            }
        }

        const centerY = this.height / 2;
        const contractFactor = 1 / this.gamma;

        // 移动飞船
        this.shipX = (this.shipX + this.velocity * 5 + 0.5) % (this.width + 300);

        // 绘制静止参考飞船（上方，透明）
        this.drawSpaceship(this.width / 2 - 75, centerY - 80, 150, 50, 1, 0.3, '静止时 (L₀ = 100m)');

        // 绘制运动飞船（下方）
        const shipWidth = 150 * contractFactor;
        this.drawSpaceship(
            this.shipX - shipWidth / 2,
            centerY + 40,
            shipWidth,
            50,
            1,
            1,
            `运动时 (L = ${(100 * contractFactor).toFixed(1)}m)`
        );

        // 绘制比例尺
        this.drawScale();
    }

    drawSpaceship(x, y, width, height, scaleY, alpha, label) {
        const ctx = this.ctx;
        ctx.save();
        ctx.globalAlpha = alpha;

        // 如果火箭图片已加载，使用SVG图片
        if (this.rocketLoaded && this.rocketImage.complete) {
            ctx.drawImage(
                this.rocketImage,
                x,
                y,
                width,
                height
            );
        } else {
            // 备用：原始的多边形飞船
            ctx.beginPath();
            ctx.moveTo(x + width, y + height / 2);
            ctx.lineTo(x + width * 0.7, y);
            ctx.lineTo(x, y + height * 0.3);
            ctx.lineTo(x, y + height * 0.7);
            ctx.lineTo(x + width * 0.7, y + height);
            ctx.closePath();

            const gradient = ctx.createLinearGradient(x, y, x, y + height);
            gradient.addColorStop(0, '#6366f1');
            gradient.addColorStop(0.5, '#8b5cf6');
            gradient.addColorStop(1, '#4f46e5');
            ctx.fillStyle = gradient;
            ctx.fill();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // 窗户
            ctx.fillStyle = '#22d3ee';
            ctx.beginPath();
            ctx.ellipse(x + width * 0.5, y + height / 2, width * 0.15, height * 0.2, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // 引擎发光
        if (this.velocity > 0 && alpha === 1) {
            const glowSize = 10 + this.velocity * 40;
            const engineGlow = ctx.createRadialGradient(x - 5, y + height / 2, 0, x - 5, y + height / 2, glowSize);
            engineGlow.addColorStop(0, 'rgba(245, 158, 11, 0.8)');
            engineGlow.addColorStop(0.5, 'rgba(245, 158, 11, 0.3)');
            engineGlow.addColorStop(1, 'transparent');

            ctx.beginPath();
            ctx.arc(x - 5, y + height / 2, glowSize, 0, Math.PI * 2);
            ctx.fillStyle = engineGlow;
            ctx.fill();
        }

        ctx.restore();

        // 标签
        ctx.font = '14px "Noto Sans SC", sans-serif';
        ctx.fillStyle = alpha === 1 ? '#e2e8f0' : '#64748b';
        ctx.textAlign = 'center';
        ctx.fillText(label, x + width / 2, y + height + 25);
    }

    drawScale() {
        const ctx = this.ctx;
        const y = this.height - 40;
        const scaleWidth = 150;
        const startX = (this.width - scaleWidth) / 2;

        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;

        // 刻度线
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(startX + scaleWidth, y);
        ctx.stroke();

        // 端点
        ctx.beginPath();
        ctx.moveTo(startX, y - 10);
        ctx.lineTo(startX, y + 10);
        ctx.moveTo(startX + scaleWidth, y - 10);
        ctx.lineTo(startX + scaleWidth, y + 10);
        ctx.stroke();

        // 标签
        ctx.font = '12px "JetBrains Mono"';
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'center';
        ctx.fillText('100m (静止参考)', startX + scaleWidth / 2, y + 25);
    }

    animate() {
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new LengthContractionSimulation();
});
