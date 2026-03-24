/**
 * 双生子佯谬交互演示
 */

class TwinParadoxSimulation {
    constructor() {
        this.canvas = document.getElementById('demo-canvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.velocity = 0.8;
        this.distance = 10; // 光年
        this.initialAge = 20;
        this.isRunning = false;
        this.phase = 'waiting'; // waiting, outbound, returning, done
        this.progress = 0;
        this.earthAge = this.initialAge;
        this.travelerAge = this.initialAge;

        // 加载SVG图片
        this.earthImage = new Image();
        this.earthImage.src = '../../assets/svg/earth.svg';
        this.earthLoaded = false;
        this.earthImage.onload = () => { this.earthLoaded = true; };

        this.jupiterImage = new Image();
        this.jupiterImage.src = '../../assets/svg/jupiter.svg';
        this.jupiterLoaded = false;
        this.jupiterImage.onload = () => { this.jupiterLoaded = true; };

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
        const distanceSlider = document.getElementById('distance-slider');
        const startBtn = document.getElementById('start-btn');
        const resetBtn = document.getElementById('reset-btn');

        velocitySlider?.addEventListener('input', (e) => {
            this.velocity = parseFloat(e.target.value) / 100;
            document.getElementById('velocity-value').textContent = e.target.value + '%';
            document.getElementById('speed-display').textContent = this.velocity.toFixed(2) + 'c';
        });

        distanceSlider?.addEventListener('input', (e) => {
            this.distance = parseFloat(e.target.value);
            document.getElementById('distance-value').textContent = e.target.value;
        });

        startBtn?.addEventListener('click', () => this.startJourney());
        resetBtn?.addEventListener('click', () => this.reset());
    }

    startJourney() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.phase = 'outbound';
        this.progress = 0;
        document.getElementById('status-display').textContent = '去程中...';
        document.getElementById('start-btn').disabled = true;
    }

    reset() {
        this.isRunning = false;
        this.phase = 'waiting';
        this.progress = 0;
        this.earthAge = this.initialAge;
        this.travelerAge = this.initialAge;
        this.updateResults();
        document.getElementById('status-display').textContent = '准备出发';
        document.getElementById('start-btn').disabled = false;
    }

    updateResults() {
        document.getElementById('earth-age').textContent = this.earthAge.toFixed(1);
        document.getElementById('traveler-age').textContent = this.travelerAge.toFixed(1);
        document.getElementById('earth-time').textContent = (this.earthAge - this.initialAge).toFixed(1);
        document.getElementById('age-diff').textContent = (this.earthAge - this.travelerAge).toFixed(1);
    }

    calculateTimes() {
        const gamma = 1 / Math.sqrt(1 - this.velocity * this.velocity);
        const earthTimeOneWay = this.distance / this.velocity;
        const travelerTimeOneWay = earthTimeOneWay / gamma;
        return {
            earthTotal: earthTimeOneWay * 2,
            travelerTotal: travelerTimeOneWay * 2,
            gamma
        };
    }

    initEditor() {
        // 使用通用编辑器辅助类
        this.editorHelper = new PageEditorHelper('twin-paradox');
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

        // 更新进度
        if (this.isRunning) {
            this.progress += 0.005;
            const times = this.calculateTimes();

            if (this.phase === 'outbound' && this.progress >= 0.5) {
                this.phase = 'returning';
                document.getElementById('status-display').textContent = '返程中...';
            } else if (this.phase === 'returning' && this.progress >= 1) {
                this.phase = 'done';
                this.isRunning = false;
                this.progress = 1;
                document.getElementById('status-display').textContent = '旅行完成！';
                document.getElementById('start-btn').disabled = false;
            }

            // 更新年龄
            this.earthAge = this.initialAge + times.earthTotal * this.progress;
            this.travelerAge = this.initialAge + times.travelerTotal * this.progress;
            this.updateResults();
        }

        // 绘制星空
        const time = Date.now() * 0.0005;
        for (let i = 0; i < 80; i++) {
            const x = (i * 73) % this.width;
            const y = (i * 97) % this.height;
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${0.2 + Math.sin(time + i) * 0.2})`;
            ctx.fill();
        }

        const centerY = this.height / 2;
        const earthX = this.width * 0.15;
        const starX = this.width * 0.85;

        // 绘制地球
        this.drawEarth(earthX, centerY);

        // 绘制目标星球
        this.drawStar(starX, centerY);

        // 绘制旅行路径
        ctx.setLineDash([5, 10]);
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
        ctx.beginPath();
        ctx.moveTo(earthX + 50, centerY);
        ctx.lineTo(starX - 30, centerY);
        ctx.stroke();
        ctx.setLineDash([]);

        // 绘制飞船位置
        let shipX = earthX + 50;
        if (this.phase === 'outbound') {
            shipX = earthX + 50 + (starX - earthX - 80) * (this.progress * 2);
        } else if (this.phase === 'returning') {
            shipX = starX - 30 - (starX - earthX - 80) * ((this.progress - 0.5) * 2);
        } else if (this.phase === 'done') {
            shipX = earthX + 50;
        }

        if (this.phase !== 'waiting') {
            this.drawSpaceship(shipX, centerY, this.phase === 'returning');
        }

        // 绘制双胞胎
        this.drawTwin(earthX, centerY + 80, '🧑', '地球双胞胎', this.earthAge, '#10b981');

        if (this.phase === 'done' || this.phase === 'waiting') {
            this.drawTwin(earthX + 80, centerY + 80, '👨‍🚀', '旅行双胞胎', this.travelerAge, '#6366f1');
        }

        // 时间线
        this.drawTimeline();
    }

    drawEarth(x, y) {
        const ctx = this.ctx;
        const radius = 40;

        if (this.earthLoaded) {
            // 使用SVG图片
            ctx.drawImage(this.earthImage, x - radius, y - radius, radius * 2, radius * 2);
        } else {
            // 回退：简单渐变
            const gradient = ctx.createRadialGradient(x - 10, y - 10, 0, x, y, radius);
            gradient.addColorStop(0, '#22d3ee');
            gradient.addColorStop(0.5, '#3b82f6');
            gradient.addColorStop(1, '#1e3a8a');

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
        }

        // 标签
        ctx.font = '14px "Noto Sans SC"';
        ctx.fillStyle = '#e2e8f0';
        ctx.textAlign = 'center';
        ctx.fillText('地球', x, y - radius - 15);
    }

    drawStar(x, y) {
        const ctx = this.ctx;
        const radius = 35;

        if (this.jupiterLoaded) {
            // 使用SVG图片
            ctx.drawImage(this.jupiterImage, x - radius, y - radius, radius * 2, radius * 2);
        } else {
            // 回退：简单渐变
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, '#fbbf24');
            gradient.addColorStop(0.7, '#f59e0b');
            gradient.addColorStop(1, '#b45309');

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
        }

        // 标签
        ctx.font = '14px "Noto Sans SC"';
        ctx.fillStyle = '#e2e8f0';
        ctx.textAlign = 'center';
        ctx.fillText(`目标星球 (${this.distance}光年)`, x, y - radius - 15);
    }

    drawSpaceship(x, y, reversed) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(x, y);
        if (reversed) ctx.scale(-1, 1);

        // 船身
        ctx.beginPath();
        ctx.moveTo(25, 0);
        ctx.lineTo(-15, -12);
        ctx.lineTo(-15, 12);
        ctx.closePath();
        ctx.fillStyle = '#6366f1';
        ctx.fill();

        // 引擎光
        const engineGlow = ctx.createRadialGradient(-20, 0, 0, -20, 0, 25);
        engineGlow.addColorStop(0, 'rgba(245, 158, 11, 0.8)');
        engineGlow.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(-20, 0, 25, 0, Math.PI * 2);
        ctx.fillStyle = engineGlow;
        ctx.fill();

        ctx.restore();
    }

    drawTwin(x, y, emoji, label, age, color) {
        const ctx = this.ctx;

        ctx.font = '36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(emoji, x, y);

        ctx.font = '12px "Noto Sans SC"';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(label, x, y + 20);

        ctx.font = 'bold 14px "JetBrains Mono"';
        ctx.fillStyle = color;
        ctx.fillText(age.toFixed(1) + ' 岁', x, y + 38);
    }

    drawTimeline() {
        const ctx = this.ctx;
        const y = this.height - 30;
        const startX = 50;
        const endX = this.width - 50;

        // 背景线
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();

        // 进度
        ctx.strokeStyle = '#6366f1';
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(startX + (endX - startX) * this.progress, y);
        ctx.stroke();

        // 标记点
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '10px "Noto Sans SC"';
        ctx.textAlign = 'center';
        ctx.fillText('出发', startX, y - 15);
        ctx.fillText('到达目标', (startX + endX) / 2, y - 15);
        ctx.fillText('返回', endX, y - 15);
    }

    animate() {
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TwinParadoxSimulation();
});
