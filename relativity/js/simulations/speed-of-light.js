/**
 * 光速不变原理交互演示
 */

class SpeedOfLightSimulation {
    constructor() {
        this.canvas = document.getElementById('demo-canvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.frame = 'ground'; // ground | train
        this.trainSpeed = 0.5;
        this.lightBeams = [];
        this.trainX = 0;
        this.animationTime = 0; // 跟踪动画时间

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
        const groundBtn = document.getElementById('frame-ground');
        const trainBtn = document.getElementById('frame-train');
        const emitBtn = document.getElementById('emit-light');
        const speedSlider = document.getElementById('train-speed-slider');
        const speedValue = document.getElementById('speed-value');
        const trainSpeedDisplay = document.getElementById('train-speed');

        groundBtn?.addEventListener('click', () => {
            this.setFrame('ground');
            groundBtn.classList.add('active');
            trainBtn.classList.remove('active');
        });

        trainBtn?.addEventListener('click', () => {
            this.setFrame('train');
            trainBtn.classList.add('active');
            groundBtn.classList.remove('active');
        });

        emitBtn?.addEventListener('click', () => this.emitLight());

        // 速度滑动条控制
        speedSlider?.addEventListener('input', (e) => {
            this.trainSpeed = parseFloat(e.target.value);
            const displaySpeed = this.trainSpeed.toFixed(2);
            if (speedValue) {
                speedValue.textContent = `${displaySpeed}c`;
            }
            if (trainSpeedDisplay) {
                trainSpeedDisplay.textContent = displaySpeed;
            }
        });
    }

    setFrame(frame) {
        this.frame = frame;
        document.getElementById('frame-display').textContent = frame === 'ground' ? '地面' : '火车';
    }

    emitLight() {
        const trainCenter = this.frame === 'ground' ? this.trainX : this.width / 2;
        this.lightBeams.push({
            x: trainCenter,
            y: this.height * 0.65, // Lower light emission height
            direction: 1,
            age: 0
        });
        this.lightBeams.push({
            x: trainCenter,
            y: this.height * 0.65, // Lower light emission height
            direction: -1,
            age: 0
        });
    }

    initEditor() {
        // 使用通用编辑器辅助类
        this.editorHelper = new PageEditorHelper('speed-of-light');
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

        // 光速是恒定的参考速度（像素/帧）
        const lightSpeed = 4; // c = 4 像素/帧
        // 火车速度是光速的一个比例
        const trainAnimationSpeed = lightSpeed * this.trainSpeed;

        // 更新动画时间（用于枕木移动）
        this.animationTime += trainAnimationSpeed;

        // 更新火车位置（速度随trainSpeed变化，相对于光速）
        if (this.frame === 'ground') {
            this.trainX = (this.trainX + trainAnimationSpeed) % (this.width + 200);
        } else {
            this.trainX = this.width / 2;
        }

        // 绘制地面（减少底部空白）
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, this.height * 0.85, this.width, this.height * 0.15);

        // 绘制铁轨
        ctx.strokeStyle = '#4a4a5e';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, this.height * 0.83);
        ctx.lineTo(this.width, this.height * 0.83);
        ctx.stroke();

        // 绘制枕木（火车参考系下地面移动，地面参考系下地面静止）
        const sleeperOffset = this.frame === 'train' ? (-this.animationTime) % 40 : 0;
        for (let x = sleeperOffset; x < this.width; x += 40) {
            ctx.fillStyle = '#3a3a4e';
            ctx.fillRect(x, this.height * 0.81, 20, 8);
        }

        // 绘制火车
        this.drawTrain(this.frame === 'ground' ? this.trainX - 100 : this.width / 2 - 100);

        // 更新和绘制光线
        this.lightBeams = this.lightBeams.filter(beam => {
            beam.age += 0.5; // 减慢计时
            beam.x += beam.direction * 4; // 光速恒定（减慢动画速度）

            if (beam.age > 100) return false;

            // 绘制光束
            const gradient = ctx.createRadialGradient(beam.x, beam.y, 0, beam.x, beam.y, 20);
            gradient.addColorStop(0, 'rgba(34, 211, 238, 0.8)');
            gradient.addColorStop(1, 'transparent');

            ctx.beginPath();
            ctx.arc(beam.x, beam.y, 20, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();

            // 光尾
            ctx.beginPath();
            ctx.moveTo(beam.x, beam.y);
            ctx.lineTo(beam.x - beam.direction * 50, beam.y);
            const tailGradient = ctx.createLinearGradient(beam.x, beam.y, beam.x - beam.direction * 50, beam.y);
            tailGradient.addColorStop(0, 'rgba(34, 211, 238, 0.5)');
            tailGradient.addColorStop(1, 'transparent');
            ctx.strokeStyle = tailGradient;
            ctx.lineWidth = 4;
            ctx.stroke();

            return beam.x > 0 && beam.x < this.width;
        });

        // 绘制观察者（使用人像）
        if (this.frame === 'ground') {
            this.drawObserver(60, this.height * 0.85, '🧑‍🔬', '地面观察者');
        }
        // 火车上的观察者（在车厢内）
        const trainCenterX = this.frame === 'ground' ? this.trainX : this.width / 2;
        this.drawObserver(trainCenterX, this.height * 0.72, '🧑', '火车观察者');
    }

    drawTrain(x) {
        const ctx = this.ctx;
        const y = this.height * 0.62;
        const w = 200;
        const h = 80;

        // 车身
        ctx.fillStyle = '#4f46e5';
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 10);
        ctx.fill();

        // 窗户
        ctx.fillStyle = '#22d3ee';
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.roundRect(x + 30 + i * 55, y + 15, 40, 30, 5);
            ctx.fill();
        }

        // 车轮
        ctx.fillStyle = '#1e1e2e';
        ctx.beginPath();
        ctx.arc(x + 40, y + h + 10, 15, 0, Math.PI * 2);
        ctx.arc(x + w - 40, y + h + 10, 15, 0, Math.PI * 2);
        ctx.fill();

        // 火车上的光源指示
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, 8, 0, Math.PI * 2);
        ctx.fill();

        // 速度标签 - 显示在火车上方
        const speedText = `v = ${this.trainSpeed.toFixed(2)}c`;
        ctx.font = 'bold 16px "JetBrains Mono"';
        const textWidth = ctx.measureText(speedText).width;

        // 速度背景框
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.beginPath();
        ctx.roundRect(x + w / 2 - textWidth / 2 - 10, y - 32, textWidth + 20, 24, 6);
        ctx.fill();

        // 速度文字
        ctx.fillStyle = '#22d3ee';
        ctx.textAlign = 'center';
        ctx.fillText(speedText, x + w / 2, y - 15);
    }

    drawObserver(x, y, emoji, label) {
        const ctx = this.ctx;
        ctx.font = '36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(emoji, x, y);
        ctx.font = '12px "Noto Sans SC"';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(label, x, y + 25);
    }

    animate() {
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SpeedOfLightSimulation();
});
