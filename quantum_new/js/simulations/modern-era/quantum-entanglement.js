/**
 * 量子纠缠模拟
 * 可视化纠缠态和测量关联
 */

class QuantumEntanglementSimulation {
    constructor() {
        this.canvas = document.getElementById('entanglement-canvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.entangledState = 'bell-phi-plus';
        this.measureBasis = 'z';
        this.time = 0;
        this.measureCount = 0;
        this.correlatedCount = 0;
        this.particleA = { x: 0, measured: false, result: null };
        this.particleB = { x: 0, measured: false, result: null };
        this.entanglementLines = [];

        this.init();
    }

    init() {
        this.resizeCanvas();
        this.bindEvents();
        this.resetParticles();
        this.animate();

        window.addEventListener('resize', () => {
            this.resizeCanvas();
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

        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
    }

    bindEvents() {
        // 纠缠态类型按钮
        document.querySelectorAll('.preset-btn[data-state]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.preset-btn[data-state]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.entangledState = btn.dataset.state;
                this.reset();
            });
        });

        // 测量基按钮
        document.querySelectorAll('.preset-btn[data-basis]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.preset-btn[data-basis]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.measureBasis = btn.dataset.basis;
                document.getElementById('basis-value').textContent = btn.dataset.basis.toUpperCase() + '基';
            });
        });

        // 重置按钮
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.reset());
        }

        // 测量按钮
        const measureBtn = document.getElementById('measure-btn');
        if (measureBtn) {
            measureBtn.addEventListener('click', () => this.measure());
        }
    }

    reset() {
        this.measureCount = 0;
        this.correlatedCount = 0;
        this.resetParticles();
        this.updateStats();
        this.updateDisplay();
    }

    resetParticles() {
        this.particleA = { x: this.centerX - 100, measured: false, result: null, phase: 0 };
        this.particleB = { x: this.centerX + 100, measured: false, result: null, phase: Math.PI };
        this.entanglementLines = [];

        // 初始化纠缠连线
        for (let i = 0; i < 20; i++) {
            this.entanglementLines.push({
                offset: Math.random() * Math.PI * 2,
                amplitude: 5 + Math.random() * 10,
                speed: 0.02 + Math.random() * 0.02
            });
        }

        document.getElementById('state-a').textContent = '?';
        document.getElementById('state-a').className = 'particle-state';
        document.getElementById('state-b').textContent = '?';
        document.getElementById('state-b').className = 'particle-state';
    }

    measure() {
        if (this.particleA.measured) {
            this.resetParticles();
        }

        this.measureCount++;

        // 根据纠缠态类型确定测量结果
        let resultA, resultB;

        if (this.entangledState === 'bell-phi-plus') {
            // |Φ⁺⟩ = (|00⟩ + |11⟩)/√2: 完全正相关
            resultA = Math.random() < 0.5 ? 'up' : 'down';
            resultB = resultA; // 相同
        } else if (this.entangledState === 'bell-psi-plus') {
            // |Ψ⁺⟩ = (|01⟩ + |10⟩)/√2: 完全反相关
            resultA = Math.random() < 0.5 ? 'up' : 'down';
            resultB = resultA === 'up' ? 'down' : 'up'; // 相反
        } else {
            // 可分离态：独立随机
            resultA = Math.random() < 0.5 ? 'up' : 'down';
            resultB = Math.random() < 0.5 ? 'up' : 'down';
        }

        // 判断是否关联
        const isCorrelated = (this.entangledState === 'bell-phi-plus' && resultA === resultB) ||
            (this.entangledState === 'bell-psi-plus' && resultA !== resultB);

        if (this.entangledState !== 'separable' && isCorrelated) {
            this.correlatedCount++;
        } else if (this.entangledState === 'separable') {
            // 可分离态：约50%随机相关
            if ((resultA === resultB && Math.random() < 0.5) ||
                (resultA !== resultB && Math.random() < 0.5)) {
                this.correlatedCount++;
            }
        }

        this.particleA.measured = true;
        this.particleA.result = resultA;
        this.particleB.measured = true;
        this.particleB.result = resultB;

        this.updateDisplay();
        this.updateStats();
    }

    updateDisplay() {
        const stateA = document.getElementById('state-a');
        const stateB = document.getElementById('state-b');

        if (this.particleA.measured) {
            stateA.textContent = this.particleA.result === 'up' ? '↑' : '↓';
            stateA.className = 'particle-state ' + this.particleA.result;
            stateB.textContent = this.particleB.result === 'up' ? '↑' : '↓';
            stateB.className = 'particle-state ' + this.particleB.result;
        }
    }

    updateStats() {
        document.getElementById('measure-count').textContent = this.measureCount;

        if (this.measureCount > 0) {
            const rate = (this.correlatedCount / this.measureCount * 100).toFixed(0);
            document.getElementById('correlation-rate').textContent = rate + '%';
        } else {
            document.getElementById('correlation-rate').textContent = '-';
        }
    }

    animate() {
        this.time += 0.016;
        this.render();
        requestAnimationFrame(() => this.animate());
    }

    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // 绘制背景
        this.drawBackground();

        // 绘制纠缠连线
        if (!this.particleA.measured) {
            this.drawEntanglementLines();
        }

        // 绘制粒子
        this.drawParticle(this.particleA, 'A', this.width * 0.25);
        this.drawParticle(this.particleB, 'B', this.width * 0.75);

        // 绘制Alice和Bob标签
        this.drawLabels();

        // 如果已测量，绘制测量效果
        if (this.particleA.measured) {
            this.drawMeasurementEffect();
        }
    }

    drawBackground() {
        // 绘制分隔线
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([10, 10]);

        this.ctx.beginPath();
        this.ctx.moveTo(this.centerX, 50);
        this.ctx.lineTo(this.centerX, this.height - 50);
        this.ctx.stroke();

        this.ctx.setLineDash([]);

        // 距离标签
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.font = '12px Inter';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('任意距离', this.centerX, this.height - 30);
    }

    drawEntanglementLines() {
        const x1 = this.width * 0.25;
        const x2 = this.width * 0.75;

        this.entanglementLines.forEach((line, i) => {
            const progress = this.time * line.speed + line.offset;

            this.ctx.strokeStyle = `hsla(${270 + i * 5}, 70%, 60%, ${0.3 + Math.sin(progress) * 0.2})`;
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();

            for (let t = 0; t <= 1; t += 0.02) {
                const x = x1 + (x2 - x1) * t;
                const wave = Math.sin(t * Math.PI * 4 + progress) * line.amplitude;
                const y = this.centerY + wave;

                if (t === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }

            this.ctx.stroke();
        });
    }

    drawParticle(particle, label, x) {
        const y = this.centerY;
        const radius = 30;

        // 粒子主体
        const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);

        if (particle.measured) {
            if (particle.result === 'up') {
                gradient.addColorStop(0, 'rgba(59, 130, 246, 0.9)');
                gradient.addColorStop(1, 'rgba(59, 130, 246, 0.2)');
            } else {
                gradient.addColorStop(0, 'rgba(236, 72, 153, 0.9)');
                gradient.addColorStop(1, 'rgba(236, 72, 153, 0.2)');
            }
        } else {
            // 叠加态：混合颜色
            const phase = this.time * 2 + (label === 'A' ? 0 : Math.PI);
            const blend = (Math.sin(phase) + 1) / 2;

            gradient.addColorStop(0, `rgba(${59 + blend * 177}, ${130 - blend * 58}, ${246 - blend * 93}, 0.9)`);
            gradient.addColorStop(1, `rgba(${59 + blend * 177}, ${130 - blend * 58}, ${246 - blend * 93}, 0.2)`);
        }

        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = gradient;
        this.ctx.fill();

        // 发光效果
        this.ctx.shadowColor = particle.measured ?
            (particle.result === 'up' ? 'rgba(59, 130, 246, 0.8)' : 'rgba(236, 72, 153, 0.8)') :
            'rgba(168, 85, 247, 0.8)';
        this.ctx.shadowBlur = 20;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fill();
        this.ctx.shadowBlur = 0;

        // 粒子标签
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 16px Inter';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        if (particle.measured) {
            this.ctx.fillText(particle.result === 'up' ? '↑' : '↓', x, y);
        } else {
            // 叠加态符号
            this.ctx.fillText('⟨↑|↓⟩', x, y);
        }
    }

    drawLabels() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.font = 'bold 16px Inter';
        this.ctx.textAlign = 'center';

        this.ctx.fillText('Alice', this.width * 0.25, 40);
        this.ctx.fillText('Bob', this.width * 0.75, 40);

        // 纠缠态标签
        this.ctx.fillStyle = 'rgba(168, 85, 247, 0.9)';
        this.ctx.font = '14px Inter';

        let stateLabel = '';
        if (this.entangledState === 'bell-phi-plus') {
            stateLabel = '|Φ⁺⟩ = (|↑↑⟩ + |↓↓⟩)/√2';
        } else if (this.entangledState === 'bell-psi-plus') {
            stateLabel = '|Ψ⁺⟩ = (|↑↓⟩ + |↓↑⟩)/√2';
        } else {
            stateLabel = '|ψ⟩ = |ψ_A⟩ ⊗ |ψ_B⟩';
        }

        this.ctx.fillText(stateLabel, this.centerX, 70);
    }

    drawMeasurementEffect() {
        // 测量闪光效果
        const flash = Math.max(0, 1 - (this.time % 1) * 2);

        if (flash > 0) {
            [this.width * 0.25, this.width * 0.75].forEach(x => {
                this.ctx.beginPath();
                this.ctx.arc(x, this.centerY, 50 * flash, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(255, 255, 255, ${flash * 0.3})`;
                this.ctx.fill();
            });
        }
    }
}

// 初始化模拟
document.addEventListener('DOMContentLoaded', () => {
    new QuantumEntanglementSimulation();
});

// 默认学习内容
if (typeof DefaultContent !== 'undefined') {
    DefaultContent['quantum-entanglement'] = `# 量子纠缠

## 爱因斯坦的"幽灵"

量子纠缠是量子力学中最神秘的现象之一。爱因斯坦将其称为"超距作用的幽灵"（spooky action at a distance）。

## 什么是量子纠缠？

当两个粒子处于**纠缠态**时，它们的量子态无法独立描述——必须作为一个整体来描述。

最著名的纠缠态是**Bell态**：

$$|\\Phi^+\\rangle = \\frac{1}{\\sqrt{2}}(|\\uparrow\\uparrow\\rangle + |\\downarrow\\downarrow\\rangle)$$

这意味着：
- 测量前，两个粒子都处于自旋↑和↓的叠加态
- 一旦测量粒子A，粒子B的状态**瞬间确定**，无论相距多远

## 关键特性

### 1. 完美关联
对于|Φ⁺⟩态，两个粒子的测量结果总是**相同**（同为↑或同为↓）。

对于|Ψ⁺⟩态，结果总是**相反**（一个↑，另一个↓）。

### 2. 无法用于超光速通信
虽然纠缠关联是瞬时的，但无法用来传递信息。单独测量任一粒子得到的都是随机结果。

### 3. 贝尔不等式
贝尔证明了：如果存在"隐变量"预先决定测量结果，则关联程度有一个上限（贝尔不等式）。

实验表明量子力学**违反**贝尔不等式，证明纠缠是真实的量子效应。

## 应用

### 量子密钥分发（QKD）
利用纠缠生成共享密钥，任何窃听都会被发现。

### 量子隐形传态
通过纠缠和经典通信，将量子态从一处传送到另一处。

### 量子计算
纠缠是量子计算机的核心资源之一。

## 尝试模拟

1. 选择不同的纠缠态类型
2. 多次点击"测量"观察关联性
3. 对比Bell态与可分离态的关联率差异
`;
}
