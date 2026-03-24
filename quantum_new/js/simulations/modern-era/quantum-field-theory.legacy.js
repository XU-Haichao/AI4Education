/**
 * 量子场论模拟
 * 可视化场的量子化与粒子产生/湮灭
 */

class QuantumFieldTheorySimulation {
    constructor() {
        this.canvas = document.getElementById('qft-canvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.mode = 'field';
        this.energy = 3;
        this.showGrid = true;
        this.particles = [];
        this.fieldPoints = [];
        this.time = 0;
        this.isRunning = true;

        this.init();
    }

    init() {
        this.resizeCanvas();
        this.initField();
        this.bindEvents();
        this.animate();

        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.initField();
        });
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';

        this.ctx.scale(dpr, dpr);
        this.width = rect.width;
        this.height = rect.height;
    }

    initField() {
        this.fieldPoints = [];
        const cols = 40;
        const rows = 25;
        const spacingX = this.width / cols;
        const spacingY = this.height / rows;

        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                this.fieldPoints.push({
                    x: (i + 0.5) * spacingX,
                    y: (j + 0.5) * spacingY,
                    phase: Math.random() * Math.PI * 2,
                    amplitude: 0,
                    frequency: 0.5 + Math.random() * 0.5
                });
            }
        }
    }

    bindEvents() {
        // 演示模式按钮
        document.querySelectorAll('.preset-btn[data-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.preset-btn[data-mode]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.mode = btn.dataset.mode;
                this.particles = [];
                this.updateParticleCount();
            });
        });

        // 能量滑块
        const energySlider = document.getElementById('energy-slider');
        if (energySlider) {
            energySlider.addEventListener('input', (e) => {
                this.energy = parseInt(e.target.value);
                const labels = ['很低', '较低', '中等', '较高', '很高'];
                document.getElementById('energy-value').textContent = labels[this.energy - 1];
            });
        }

        // 网格开关
        document.querySelectorAll('.preset-btn[data-grid]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.preset-btn[data-grid]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.showGrid = btn.dataset.grid === 'on';
                document.getElementById('grid-value').textContent = this.showGrid ? '开' : '关';
            });
        });

        // 重置按钮
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.reset());
        }

        // 触发事件按钮
        const triggerBtn = document.getElementById('trigger-btn');
        if (triggerBtn) {
            triggerBtn.addEventListener('click', () => this.triggerEvent());
        }
    }

    reset() {
        this.mode = 'field';
        this.energy = 3;
        this.showGrid = true;
        this.particles = [];
        this.time = 0;

        // 重置UI
        document.getElementById('energy-slider').value = 3;
        document.getElementById('energy-value').textContent = '中等';
        document.getElementById('grid-value').textContent = '开';

        document.querySelectorAll('.preset-btn[data-mode]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === 'field');
        });
        document.querySelectorAll('.preset-btn[data-grid]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.grid === 'on');
        });

        this.initField();
        this.updateParticleCount();
    }

    triggerEvent() {
        const centerX = this.width / 2 + (Math.random() - 0.5) * this.width * 0.4;
        const centerY = this.height / 2 + (Math.random() - 0.5) * this.height * 0.4;

        if (this.mode === 'creation') {
            // 创建粒子对
            this.createParticlePair(centerX, centerY);
        } else if (this.mode === 'annihilation') {
            // 如果有粒子，触发湮灭
            if (this.particles.length >= 2) {
                this.annihilateParticles();
            } else {
                // 先创建粒子对，稍后湮灭
                this.createParticlePair(centerX, centerY);
                setTimeout(() => this.annihilateParticles(), 1500);
            }
        } else {
            // 场振动模式：创建场扰动
            this.createFieldDisturbance(centerX, centerY);
        }
    }

    createParticlePair(x, y) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + this.energy * 0.5;

        // 粒子
        this.particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            type: 'particle',
            color: 'rgba(59, 130, 246, 0.9)',
            trail: [],
            age: 0,
            creating: true
        });

        // 反粒子
        this.particles.push({
            x: x,
            y: y,
            vx: -Math.cos(angle) * speed,
            vy: -Math.sin(angle) * speed,
            type: 'antiparticle',
            color: 'rgba(239, 68, 68, 0.9)',
            trail: [],
            age: 0,
            creating: true
        });

        // 创建闪光效果
        this.createFlash(x, y, 'rgba(255, 255, 255, 0.8)');
        this.updateParticleCount();
    }

    annihilateParticles() {
        if (this.particles.length < 2) return;

        // 找到一对粒子和反粒子
        const particle = this.particles.find(p => p.type === 'particle');
        const antiparticle = this.particles.find(p => p.type === 'antiparticle');

        if (particle && antiparticle) {
            const midX = (particle.x + antiparticle.x) / 2;
            const midY = (particle.y + antiparticle.y) / 2;

            // 移除粒子
            this.particles = this.particles.filter(p => p !== particle && p !== antiparticle);

            // 创建湮灭闪光
            this.createFlash(midX, midY, 'rgba(255, 200, 50, 1)');

            // 创建光子（能量释放）
            for (let i = 0; i < 2; i++) {
                const angle = Math.random() * Math.PI * 2;
                this.particles.push({
                    x: midX,
                    y: midY,
                    vx: Math.cos(angle) * 3,
                    vy: Math.sin(angle) * 3,
                    type: 'photon',
                    color: 'rgba(255, 220, 100, 0.9)',
                    trail: [],
                    age: 0,
                    lifetime: 100
                });
            }
        }

        this.updateParticleCount();
    }

    createFlash(x, y, color) {
        // 在场点上创建扰动
        this.fieldPoints.forEach(point => {
            const dx = point.x - x;
            const dy = point.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) {
                point.amplitude = (1 - dist / 150) * this.energy * 2;
            }
        });
    }

    createFieldDisturbance(x, y) {
        this.fieldPoints.forEach(point => {
            const dx = point.x - x;
            const dy = point.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 200) {
                point.amplitude += (1 - dist / 200) * this.energy * 1.5;
                point.phase = Math.atan2(dy, dx);
            }
        });
    }

    updateParticleCount() {
        const count = this.particles.filter(p => p.type !== 'photon').length;
        document.getElementById('particle-count').textContent = count;
    }

    animate() {
        if (!this.isRunning) return;

        this.time += 0.016;
        this.update();
        this.render();

        requestAnimationFrame(() => this.animate());
    }

    update() {
        // 更新场振动
        this.fieldPoints.forEach(point => {
            // 真空涨落
            const vacuumFluctuation = Math.sin(this.time * point.frequency * 2 + point.phase) * 0.1 * this.energy;
            point.amplitude = point.amplitude * 0.98 + vacuumFluctuation;
        });

        // 更新粒子
        this.particles.forEach((particle, index) => {
            particle.age++;

            // 记录轨迹
            particle.trail.push({ x: particle.x, y: particle.y });
            if (particle.trail.length > 30) {
                particle.trail.shift();
            }

            // 移动
            particle.x += particle.vx;
            particle.y += particle.vy;

            // 边界反弹
            if (particle.x < 0 || particle.x > this.width) particle.vx *= -1;
            if (particle.y < 0 || particle.y > this.height) particle.vy *= -1;

            // 创建动画结束
            if (particle.creating && particle.age > 20) {
                particle.creating = false;
            }

            // 光子生命周期
            if (particle.lifetime && particle.age > particle.lifetime) {
                this.particles.splice(index, 1);
            }
        });
    }

    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // 绘制网格
        if (this.showGrid) {
            this.drawGrid();
        }

        // 绘制场
        this.drawField();

        // 绘制粒子
        this.drawParticles();

        // 绘制模式说明
        this.drawModeLabel();
    }

    drawGrid() {
        this.ctx.strokeStyle = 'rgba(168, 85, 247, 0.1)';
        this.ctx.lineWidth = 1;

        const gridSize = 30;

        for (let x = 0; x < this.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }

        for (let y = 0; y < this.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }
    }

    drawField() {
        this.fieldPoints.forEach(point => {
            const amplitude = Math.abs(point.amplitude);
            if (amplitude > 0.05) {
                const hue = point.amplitude > 0 ? 260 : 180;
                const alpha = Math.min(amplitude * 0.5, 0.8);
                const size = 3 + amplitude * 5;

                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
                this.ctx.fillStyle = `hsla(${hue}, 70%, 60%, ${alpha})`;
                this.ctx.fill();
            }
        });
    }

    drawParticles() {
        this.particles.forEach(particle => {
            // 绘制轨迹
            if (particle.trail.length > 1) {
                this.ctx.beginPath();
                this.ctx.moveTo(particle.trail[0].x, particle.trail[0].y);
                particle.trail.forEach((pos, i) => {
                    this.ctx.lineTo(pos.x, pos.y);
                });
                this.ctx.strokeStyle = particle.color.replace('0.9', '0.3');
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }

            // 绘制粒子
            const size = particle.creating ?
                8 * (particle.age / 20) :
                (particle.type === 'photon' ? 4 : 8);

            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
            this.ctx.fillStyle = particle.color;
            this.ctx.fill();

            // 发光效果
            this.ctx.shadowColor = particle.color;
            this.ctx.shadowBlur = 15;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, size * 0.6, 0, Math.PI * 2);
            this.ctx.fillStyle = 'white';
            this.ctx.fill();
            this.ctx.shadowBlur = 0;

            // 标签
            if (particle.type !== 'photon') {
                this.ctx.fillStyle = 'white';
                this.ctx.font = 'bold 10px Inter';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(
                    particle.type === 'particle' ? 'e⁻' : 'e⁺',
                    particle.x,
                    particle.y
                );
            }
        });
    }

    drawModeLabel() {
        const labels = {
            'field': '场振动模式：观察量子真空涨落',
            'creation': '粒子产生模式：点击"触发事件"创建正反粒子对',
            'annihilation': '粒子湮灭模式：正反粒子相遇时湮灭释放能量'
        };

        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.font = '14px Inter';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(labels[this.mode], this.width / 2, 30);
    }
}

// 初始化模拟
document.addEventListener('DOMContentLoaded', () => {
    new QuantumFieldTheorySimulation();
});

// 默认学习内容
if (typeof DefaultContent !== 'undefined') {
    DefaultContent['quantum-field-theory'] = `# 量子场论

## 从粒子到场

量子力学最初描述的是固定数目的粒子。但在高能物理中，粒子可以**产生**和**湮灭**——一对正负电子可以从"虚无"中产生，也可以相遇后消失转化为光子。

量子场论（QFT）正是为了描述这些现象而发展起来的理论。

## 场的量子化

在量子场论中，基本的物理对象不再是粒子，而是**场**。粒子是场的激发态：

> **粒子 = 场的量子化激发**

例如，电子是电子场的激发，光子是电磁场的激发。

## 产生与湮灭算符

量子场可以用**产生算符** $a^\\dagger$ 和**湮灭算符** $a$ 来描述：

- $a^\\dagger |n\\rangle = \\sqrt{n+1}|n+1\\rangle$ — 创建一个粒子
- $a |n\\rangle = \\sqrt{n}|n-1\\rangle$ — 消灭一个粒子

其中 $|n\\rangle$ 表示有 n 个粒子的状态。

## 真空涨落

量子场论最神奇的预言之一是**真空涨落**：

即使在"真空"中，量子场也在不断涨落，虚粒子对不断产生和湮灭。这不是纯粹的理论推测——它已被**卡西米尔效应**等实验证实。

## 演示模式说明

1. **场振动**：观察量子场的基态涨落
2. **粒子产生**：看正反粒子对如何从场中产生
3. **粒子湮灭**：观察正反粒子相遇时的湮灭过程

## 量子场论的成就

量子场论是现代物理学最成功的理论之一：
- **量子电动力学（QED）**：描述电磁相互作用，理论预言与实验符合到小数点后12位
- **标准模型**：统一描述强力、弱力和电磁力
- **粒子物理实验**：从对撞机实验中发现希格斯玻色子等新粒子
`;
}
// Legacy simulation kept for reference.
