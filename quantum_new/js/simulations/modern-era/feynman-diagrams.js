/**
 * 费曼图模拟
 * 可视化粒子相互作用的费曼图
 */

class FeynmanDiagramSimulation {
    constructor() {
        this.canvas = document.getElementById('feynman-canvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.diagramType = 'electron-scattering';
        this.speed = 3;
        this.isPlaying = false;
        this.animationProgress = 0;
        this.time = 0;

        this.diagrams = {
            'electron-scattering': {
                name: 'e⁻e⁻→e⁻e⁻',
                title: '电子-电子散射（莫勒散射）'
            },
            'pair-annihilation': {
                name: 'e⁺e⁻→γγ',
                title: '正负电子湮灭'
            },
            'compton': {
                name: 'e⁻γ→e⁻γ',
                title: '康普顿散射'
            },
            'pair-production': {
                name: 'γγ→e⁺e⁻',
                title: '正负电子对产生'
            }
        };

        this.init();
    }

    init() {
        this.resizeCanvas();
        this.bindEvents();
        this.render();

        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.render();
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

        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.width = rect.width;
        this.height = rect.height;

        // 计算图的中心和大小
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
        this.scale = Math.min(this.width, this.height) * 0.4;
    }

    bindEvents() {
        // 图类型按钮
        document.querySelectorAll('.preset-btn[data-diagram]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.preset-btn[data-diagram]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.diagramType = btn.dataset.diagram;
                this.animationProgress = 0;
                this.updateProcessName();
                this.render();
            });
        });

        // 重置按钮
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.reset());
        }

        // 播放按钮
        const playBtn = document.getElementById('play-btn');
        if (playBtn) {
            playBtn.addEventListener('click', () => this.togglePlay());
        }

        this.updateProcessName();
    }

    updateProcessName() {
        const diagram = this.diagrams[this.diagramType];
        document.getElementById('process-name').textContent = diagram.name;
    }

    reset() {
        this.isPlaying = false;
        this.animationProgress = 0;
        document.getElementById('play-btn').textContent = '播放动画';
        this.render();
    }

    togglePlay() {
        this.isPlaying = !this.isPlaying;
        document.getElementById('play-btn').textContent = this.isPlaying ? '暂停动画' : '播放动画';

        if (this.isPlaying) {
            this.animate();
        }
    }

    animate() {
        if (!this.isPlaying) return;

        this.time += 0.016;
        this.animationProgress += 0.005 * this.speed;

        if (this.animationProgress >= 1) {
            this.animationProgress = 0;
        }

        this.render();
        requestAnimationFrame(() => this.animate());
    }

    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // 绘制背景
        this.drawBackground();

        // 绘制当前费曼图
        switch (this.diagramType) {
            case 'electron-scattering':
                this.drawElectronScattering();
                break;
            case 'pair-annihilation':
                this.drawPairAnnihilation();
                break;
            case 'compton':
                this.drawComptonScattering();
                break;
            case 'pair-production':
                this.drawPairProduction();
                break;
        }

        // 绘制标题
        this.drawTitle();

        // 绘制图例
        this.drawLegend();
    }

    drawBackground() {
        // 时间轴标记
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);

        // 垂直虚线表示时间方向
        this.ctx.beginPath();
        this.ctx.moveTo(this.centerX, 50);
        this.ctx.lineTo(this.centerX, this.height - 50);
        this.ctx.stroke();

        this.ctx.setLineDash([]);

        // 时间箭头
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.font = '12px Inter';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('时间 →', this.width - 50, this.centerY);
    }

    drawTitle() {
        const diagram = this.diagrams[this.diagramType];

        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.font = 'bold 18px Inter';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(diagram.title, this.centerX, 35);
    }

    drawLegend() {
        const legendX = 20;
        const legendY = this.height - 80;

        this.ctx.font = '12px Inter';
        this.ctx.textAlign = 'left';

        // 电子线
        this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.9)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(legendX, legendY);
        this.ctx.lineTo(legendX + 40, legendY);
        this.ctx.stroke();
        this.drawArrow(legendX + 20, legendY, 1, 0, 'rgba(59, 130, 246, 0.9)');
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.fillText('电子 e⁻', legendX + 50, legendY + 4);

        // 正电子线
        this.ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
        this.ctx.beginPath();
        this.ctx.moveTo(legendX, legendY + 20);
        this.ctx.lineTo(legendX + 40, legendY + 20);
        this.ctx.stroke();
        this.drawArrow(legendX + 20, legendY + 20, -1, 0, 'rgba(239, 68, 68, 0.9)');
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.fillText('正电子 e⁺', legendX + 50, legendY + 24);

        // 光子线
        this.ctx.strokeStyle = 'rgba(255, 220, 100, 0.9)';
        this.drawPhotonLine(legendX, legendY + 40, legendX + 40, legendY + 40);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.fillText('光子 γ', legendX + 50, legendY + 44);
    }

    // 绘制电子散射（莫勒散射）
    drawElectronScattering() {
        const cx = this.centerX;
        const cy = this.centerY;
        const s = this.scale;

        // 入射电子1
        this.drawFermionLine(cx - s, cy - s * 0.6, cx - s * 0.3, cy - s * 0.2, 'electron', this.animationProgress);

        // 入射电子2
        this.drawFermionLine(cx - s, cy + s * 0.6, cx - s * 0.3, cy + s * 0.2, 'electron', this.animationProgress);

        // 顶点1
        this.drawVertex(cx - s * 0.3, cy - s * 0.2);

        // 顶点2
        this.drawVertex(cx - s * 0.3, cy + s * 0.2);

        // 虚光子（交换）
        this.drawPhotonLine(cx - s * 0.3, cy - s * 0.2, cx - s * 0.3, cy + s * 0.2);

        // 出射电子1
        this.drawFermionLine(cx - s * 0.3, cy - s * 0.2, cx + s * 0.3, cy - s * 0.6, 'electron', this.animationProgress);

        // 出射电子2
        this.drawFermionLine(cx - s * 0.3, cy + s * 0.2, cx + s * 0.3, cy + s * 0.6, 'electron', this.animationProgress);

        // 标签
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.font = '14px Inter';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('e⁻', cx - s - 20, cy - s * 0.6);
        this.ctx.fillText('e⁻', cx - s - 20, cy + s * 0.6);
        this.ctx.fillText('e⁻', cx + s * 0.3 + 20, cy - s * 0.6);
        this.ctx.fillText('e⁻', cx + s * 0.3 + 20, cy + s * 0.6);
        this.ctx.fillText('γ', cx - s * 0.3 + 20, cy);
    }

    // 绘制正负电子湮灭
    drawPairAnnihilation() {
        const cx = this.centerX;
        const cy = this.centerY;
        const s = this.scale;

        // 入射电子
        this.drawFermionLine(cx - s, cy - s * 0.5, cx, cy, 'electron', this.animationProgress);

        // 入射正电子（箭头反向）
        this.drawFermionLine(cx - s, cy + s * 0.5, cx, cy, 'positron', this.animationProgress);

        // 顶点
        this.drawVertex(cx, cy);

        // 出射光子1
        this.drawPhotonLine(cx, cy, cx + s, cy - s * 0.5);

        // 出射光子2
        this.drawPhotonLine(cx, cy, cx + s, cy + s * 0.5);

        // 标签
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.font = '14px Inter';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('e⁻', cx - s - 20, cy - s * 0.5);
        this.ctx.fillText('e⁺', cx - s - 20, cy + s * 0.5);
        this.ctx.fillText('γ', cx + s + 20, cy - s * 0.5);
        this.ctx.fillText('γ', cx + s + 20, cy + s * 0.5);
    }

    // 绘制康普顿散射
    drawComptonScattering() {
        const cx = this.centerX;
        const cy = this.centerY;
        const s = this.scale;

        // 入射电子
        this.drawFermionLine(cx - s, cy + s * 0.3, cx - s * 0.3, cy, 'electron', this.animationProgress);

        // 入射光子
        this.drawPhotonLine(cx - s, cy - s * 0.5, cx - s * 0.3, cy);

        // 顶点1
        this.drawVertex(cx - s * 0.3, cy);

        // 内线电子
        this.drawFermionLine(cx - s * 0.3, cy, cx + s * 0.3, cy, 'electron', this.animationProgress);

        // 顶点2
        this.drawVertex(cx + s * 0.3, cy);

        // 出射电子
        this.drawFermionLine(cx + s * 0.3, cy, cx + s, cy + s * 0.3, 'electron', this.animationProgress);

        // 出射光子
        this.drawPhotonLine(cx + s * 0.3, cy, cx + s, cy - s * 0.5);

        // 标签
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.font = '14px Inter';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('e⁻', cx - s - 20, cy + s * 0.3);
        this.ctx.fillText('γ', cx - s - 20, cy - s * 0.5);
        this.ctx.fillText('e⁻', cx + s + 20, cy + s * 0.3);
        this.ctx.fillText('γ', cx + s + 20, cy - s * 0.5);
    }

    // 绘制正负电子对产生
    drawPairProduction() {
        const cx = this.centerX;
        const cy = this.centerY;
        const s = this.scale;

        // 入射光子1
        this.drawPhotonLine(cx - s, cy - s * 0.5, cx, cy);

        // 入射光子2
        this.drawPhotonLine(cx - s, cy + s * 0.5, cx, cy);

        // 顶点
        this.drawVertex(cx, cy);

        // 出射电子
        this.drawFermionLine(cx, cy, cx + s, cy - s * 0.5, 'electron', this.animationProgress);

        // 出射正电子
        this.drawFermionLine(cx, cy, cx + s, cy + s * 0.5, 'positron', this.animationProgress);

        // 标签
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.font = '14px Inter';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('γ', cx - s - 20, cy - s * 0.5);
        this.ctx.fillText('γ', cx - s - 20, cy + s * 0.5);
        this.ctx.fillText('e⁻', cx + s + 20, cy - s * 0.5);
        this.ctx.fillText('e⁺', cx + s + 20, cy + s * 0.5);
    }

    drawFermionLine(x1, y1, x2, y2, type, progress) {
        const color = type === 'electron' ? 'rgba(59, 130, 246, 0.9)' : 'rgba(239, 68, 68, 0.9)';

        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2.5;
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();

        // 箭头
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);

        // 正电子箭头反向
        const dir = type === 'positron' ? -1 : 1;
        this.drawArrow(midX, midY, dx / len * dir, dy / len * dir, color);

        // 动画粒子
        if (this.isPlaying) {
            const px = x1 + (x2 - x1) * progress;
            const py = y1 + (y2 - y1) * progress;

            this.ctx.beginPath();
            this.ctx.arc(px, py, 5, 0, Math.PI * 2);
            this.ctx.fillStyle = color;
            this.ctx.fill();

            this.ctx.shadowColor = color;
            this.ctx.shadowBlur = 10;
            this.ctx.beginPath();
            this.ctx.arc(px, py, 3, 0, Math.PI * 2);
            this.ctx.fillStyle = 'white';
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }
    }

    drawPhotonLine(x1, y1, x2, y2) {
        const color = 'rgba(255, 220, 100, 0.9)';
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;

        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        const waves = Math.floor(len / 15);
        const amplitude = 8;

        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);

        for (let i = 1; i <= waves * 10; i++) {
            const t = i / (waves * 10);
            const x = x1 + dx * t;
            const y = y1 + dy * t;

            // 垂直于线方向的偏移
            const perpX = -dy / len;
            const perpY = dx / len;
            const offset = Math.sin(t * waves * Math.PI * 2) * amplitude;

            this.ctx.lineTo(x + perpX * offset, y + perpY * offset);
        }

        this.ctx.stroke();

        // 动画光子
        if (this.isPlaying) {
            const progress = (this.animationProgress + 0.5) % 1;
            const px = x1 + dx * progress;
            const py = y1 + dy * progress;

            this.ctx.beginPath();
            this.ctx.arc(px, py, 4, 0, Math.PI * 2);
            this.ctx.fillStyle = color;
            this.ctx.fill();

            this.ctx.shadowColor = color;
            this.ctx.shadowBlur = 15;
            this.ctx.beginPath();
            this.ctx.arc(px, py, 2, 0, Math.PI * 2);
            this.ctx.fillStyle = 'white';
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }
    }

    drawVertex(x, y) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, 6, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(168, 85, 247, 0.9)';
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.arc(x, y, 3, 0, Math.PI * 2);
        this.ctx.fillStyle = 'white';
        this.ctx.fill();
    }

    drawArrow(x, y, dx, dy, color) {
        const arrowSize = 8;
        const angle = Math.atan2(dy, dx);

        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(x + Math.cos(angle) * arrowSize, y + Math.sin(angle) * arrowSize);
        this.ctx.lineTo(x + Math.cos(angle + 2.5) * arrowSize, y + Math.sin(angle + 2.5) * arrowSize);
        this.ctx.lineTo(x + Math.cos(angle - 2.5) * arrowSize, y + Math.sin(angle - 2.5) * arrowSize);
        this.ctx.closePath();
        this.ctx.fill();
    }
}

// 初始化模拟
document.addEventListener('DOMContentLoaded', () => {
    new FeynmanDiagramSimulation();
});

// 默认学习内容
if (typeof DefaultContent !== 'undefined') {
    DefaultContent['feynman-diagrams'] = `# 费曼图

## 物理学家的图形语言

费曼图是理查德·费曼在1948年发明的一种图形工具，用于直观地表示粒子相互作用过程。它将复杂的数学计算转化为简洁的图形表示。

## 费曼图的基本元素

### 1. 费米子线（实线）
- **电子**：带箭头的实线，箭头指向时间流向
- **正电子**：箭头反向（表示反粒子）

### 2. 玻色子线
- **光子**：波浪线 ∿∿∿
- **胶子**：螺旋线
- **W/Z玻色子**：虚线波浪

### 3. 顶点
每个顶点代表一次基本相互作用，必须遵守守恒定律：
- 电荷守恒
- 能量-动量守恒
- 轻子数守恒

## 费曼图的读法

时间通常从左向右流动：
- **左侧**：初态粒子（入射）
- **右侧**：末态粒子（出射）
- **中间**：虚粒子（交换）

## 本页展示的过程

### 电子-电子散射（莫勒散射）
$$e^- + e^- \\to e^- + e^-$$
两个电子通过交换虚光子发生散射。

### 正负电子湮灭
$$e^+ + e^- \\to \\gamma + \\gamma$$
正负电子相遇湮灭，产生两个光子。

### 康普顿散射
$$e^- + \\gamma \\to e^- + \\gamma$$
光子被电子散射，能量和方向发生改变。

### 正负电子对产生
$$\\gamma + \\gamma \\to e^+ + e^-$$
两个高能光子碰撞产生正负电子对。

## 计算规则

费曼图不仅是图形表示，每个元素对应精确的数学因子：
- 每条**传播子**（内线）对应一个传播函数
- 每个**顶点**对应一个耦合常数
- 最终通过积分得到散射振幅

这使得量子场论的复杂计算变得系统化和可操作。
`;
}
