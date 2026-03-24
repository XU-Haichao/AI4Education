/**
 * 时间膨胀交互演示
 */

class TimeDilationSimulation {
    constructor() {
        this.canvas = document.getElementById('demo-canvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.velocity = 0; // 0-0.999 (相对于光速)
        this.gamma = 1;
        this.earthTime = 0;
        this.shipTime = 0;
        this.lastTimestamp = 0;
        this.isRunning = true;

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

        // 预设按钮
        document.getElementById('preset-slow')?.addEventListener('click', () => this.setPreset(0.1));
        document.getElementById('preset-medium')?.addEventListener('click', () => this.setPreset(0.5));
        document.getElementById('preset-fast')?.addEventListener('click', () => this.setPreset(0.9));
        document.getElementById('preset-extreme')?.addEventListener('click', () => this.setPreset(0.99));
        document.getElementById('reset-btn')?.addEventListener('click', () => this.reset());
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

    reset() {
        this.setPreset(0);
        this.earthTime = 0;
        this.shipTime = 0;
        this.updateResults();
    }

    updateDisplays() {
        const speedDisplay = document.getElementById('speed-display');
        const gammaDisplay = document.getElementById('gamma-display');

        if (speedDisplay) speedDisplay.textContent = this.velocity.toFixed(2) + 'c';
        if (gammaDisplay) gammaDisplay.textContent = this.gamma.toFixed(3);
    }

    updateResults() {
        document.getElementById('earth-time').textContent = this.earthTime.toFixed(2);
        document.getElementById('ship-time').textContent = this.shipTime.toFixed(2);
        document.getElementById('time-diff').textContent = (this.earthTime - this.shipTime).toFixed(2);
        document.getElementById('slow-factor').textContent = this.gamma.toFixed(2);
    }

    initEditor() {
        // 使用通用编辑器辅助类
        this.editorHelper = new PageEditorHelper('time-dilation');
        this.editorHelper.initEditor();
    }

    loadContent() {
        if (this.editorHelper) {
            this.editorHelper.loadContent();
        }
    }

    draw(timestamp) {
        // 计算时间增量
        if (this.lastTimestamp) {
            const dt = (timestamp - this.lastTimestamp) / 1000;
            this.earthTime += dt * 0.1; // 0.1年/秒
            this.shipTime += dt * 0.1 / this.gamma;
            this.updateResults();
        }
        this.lastTimestamp = timestamp;

        // 清空画布
        this.ctx.fillStyle = '#0a0a14';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 绘制星空背景（简化版）
        this.drawStars();

        // 绘制两个时钟对比
        const centerY = this.height / 2;
        const clockRadius = Math.min(this.width / 6, this.height / 3);

        // 地球时钟（左侧）
        this.drawClock(
            this.width * 0.25,
            centerY,
            clockRadius,
            this.earthTime,
            '地球时钟',
            '#10b981'
        );

        // 飞船时钟（右侧）
        this.drawClock(
            this.width * 0.75,
            centerY,
            clockRadius,
            this.shipTime,
            '飞船时钟',
            '#6366f1'
        );

        // 绘制飞船动画
        this.drawSpaceship();
    }

    drawStars() {
        const time = Date.now() * 0.0001;
        for (let i = 0; i < 50; i++) {
            const x = ((i * 73 + time * (this.velocity * 500 + 10)) % this.width);
            const y = (i * 97) % this.height;
            const alpha = 0.3 + Math.sin(time + i) * 0.2;

            this.ctx.beginPath();
            this.ctx.arc(x, y, 1, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            this.ctx.fill();
        }
    }

    drawClock(x, y, radius, time, label, color) {
        const ctx = this.ctx;

        // 时钟外圈
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.stroke();

        // 发光效果
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(x, y, radius * 0.8, x, y, radius * 1.2);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.5, color + '20');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fill();

        // 时钟刻度
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
            const innerR = radius * 0.85;
            const outerR = radius * 0.95;

            ctx.beginPath();
            ctx.moveTo(x + Math.cos(angle) * innerR, y + Math.sin(angle) * innerR);
            ctx.lineTo(x + Math.cos(angle) * outerR, y + Math.sin(angle) * outerR);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // 时针（基于累计时间）
        const hourAngle = (time * Math.PI * 2) - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(hourAngle) * radius * 0.5, y + Math.sin(hourAngle) * radius * 0.5);
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.stroke();

        // 分针
        const minuteAngle = (time * 12 * Math.PI * 2) - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(minuteAngle) * radius * 0.7, y + Math.sin(minuteAngle) * radius * 0.7);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 中心点
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // 标签
        ctx.font = '16px "Noto Sans SC", sans-serif';
        ctx.fillStyle = '#e2e8f0';
        ctx.textAlign = 'center';
        ctx.fillText(label, x, y + radius + 30);

        // 时间显示
        ctx.font = '14px "JetBrains Mono", monospace';
        ctx.fillStyle = color;
        ctx.fillText(time.toFixed(2) + ' 年', x, y + radius + 50);
    }

    drawSpaceship() {
        const ctx = this.ctx;
        const time = Date.now() * 0.001;

        // 飞船位置（在画面顶部单向移动）
        const speed = (this.velocity * 300 + 50); // 速度随velocity变化
        const shipX = ((time * speed) % (this.width + 150)) - 75; // 从左到右循环
        const shipY = this.height * 0.15;

        // 根据速度计算收缩（长度收缩预览）
        const contractFactor = 1 / this.gamma;

        // 火箭尺寸
        const rocketWidth = 120;
        const rocketHeight = 50;

        ctx.save();
        ctx.translate(shipX, shipY);
        ctx.scale(contractFactor, 1);

        // 如果火箭图片已加载，使用SVG图片
        if (this.rocketLoaded && this.rocketImage.complete) {
            ctx.drawImage(
                this.rocketImage,
                -rocketWidth / 2,
                -rocketHeight / 2,
                rocketWidth,
                rocketHeight
            );
        } else {
            // 备用：简单的椭圆形飞船
            ctx.beginPath();
            ctx.ellipse(0, 0, 30, 10, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#6366f1';
            ctx.fill();

            ctx.beginPath();
            ctx.ellipse(5, 0, 8, 5, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#22d3ee';
            ctx.fill();
        }

        // 额外的引擎光效（速度较高时）
        if (this.velocity > 0.3) {
            const glowSize = 15 + this.velocity * 40;
            const engineGlow = ctx.createRadialGradient(-rocketWidth / 2 - 10, 0, 0, -rocketWidth / 2 - 10, 0, glowSize);
            engineGlow.addColorStop(0, 'rgba(245, 158, 11, 0.6)');
            engineGlow.addColorStop(0.5, 'rgba(245, 158, 11, 0.2)');
            engineGlow.addColorStop(1, 'transparent');

            ctx.beginPath();
            ctx.arc(-rocketWidth / 2 - 10, 0, glowSize, 0, Math.PI * 2);
            ctx.fillStyle = engineGlow;
            ctx.fill();
        }

        ctx.restore();
    }

    animate(timestamp = 0) {
        if (this.isRunning) {
            this.draw(timestamp);
            requestAnimationFrame((t) => this.animate(t));
        }
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    new TimeDilationSimulation();
});
