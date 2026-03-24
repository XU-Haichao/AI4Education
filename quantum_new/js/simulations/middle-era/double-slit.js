/**
 * 双缝干涉实验交互模拟
 */

class DoubleSlitSimulation {
    constructor() {
        this.canvas = document.getElementById('double-slit-canvas');
        this.ctx = this.canvas?.getContext('2d');
        if (!this.canvas) return;

        this.mode = 'wave';
        this.detectorOn = false;
        this.slitDistance = 5;
        this.particles = [];
        this.screenHits = [];
        this.particleCount = 0;
        this.histogramBins = new Array(50).fill(0);
        this.isPaused = false;
        this.isEmitting = false;

        this.init();
    }

    init() {
        this.resizeCanvas();
        this.bindEvents();
        this.animate();
    }

    resizeCanvas() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    bindEvents() {
        document.querySelectorAll('.preset-btn[data-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.preset-btn[data-mode]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.mode = btn.dataset.mode;
                this.resetScreen();
            });
        });

        document.querySelectorAll('.preset-btn[data-detector]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.preset-btn[data-detector]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.detectorOn = btn.dataset.detector === 'on';
                this.resetScreen();
            });
        });



        document.getElementById('reset-btn')?.addEventListener('click', () => this.resetScreen());

        const pauseBtn = document.getElementById('pause-btn');
        pauseBtn?.addEventListener('click', () => {
            this.isPaused = !this.isPaused;
            pauseBtn.textContent = this.isPaused ? '继续' : '暂停';
        });

        const emitBtn = document.getElementById('emit-btn');
        emitBtn?.addEventListener('click', () => {
            this.isEmitting = !this.isEmitting;
            emitBtn.textContent = this.isEmitting ? '停止发射' : '发射粒子';
        });
    }

    resetScreen() {
        this.particles = [];
        this.screenHits = [];
        this.histogramBins.fill(0);
        this.particleCount = 0;
    }



    emitParticle() {
        const h = this.canvas.height;
        const centerY = h / 2;
        const count = this.mode === 'wave' ? 5 : 1;

        for (let i = 0; i < count; i++) {
            this.particleCount++;
            this.particles.push({
                x: 20,
                y: centerY + (Math.random() - 0.5) * 40,
                targetY: centerY,
                phase: 'approaching',
                slit: null
            });
        }
    }

    updateParticles() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const slitX = w * 0.2;
        const screenX = w * 0.6;
        const slitGap = 30 + this.slitDistance * 15;
        const centerY = h / 2;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            if (p.phase === 'approaching') {
                p.x += 3;
                if (p.x >= slitX - 10) {
                    p.phase = 'at_slit';
                    if (this.detectorOn) {
                        p.slit = Math.random() > 0.5 ? 1 : -1;
                        p.y = centerY + p.slit * slitGap / 2;
                    }
                }
            } else if (p.phase === 'at_slit') {
                p.x += 3;
                if (p.x >= slitX + 10) {
                    p.phase = 'past_slit';
                    if (this.detectorOn) {
                        p.targetY = centerY + p.slit * slitGap / 2 + (Math.random() - 0.5) * 30;
                    } else {
                        p.targetY = this.calculateInterference(slitGap);
                    }
                }
            } else if (p.phase === 'past_slit') {
                p.x += 3;
                p.y += (p.targetY - p.y) * 0.05;

                if (p.x >= screenX) {
                    this.screenHits.push({ y: p.y, alpha: 1 });

                    // Update histogram
                    const binIndex = Math.floor((p.y / h) * this.histogramBins.length);
                    if (binIndex >= 0 && binIndex < this.histogramBins.length) {
                        this.histogramBins[binIndex]++;
                    }

                    this.particles.splice(i, 1);
                }
            }
        }
    }

    calculateInterference(slitGap) {
        const h = this.canvas.height;
        const centerY = h / 2;
        const fringeSpacing = 300 / this.slitDistance;

        const r = Math.random();
        let angle;
        if (r < 0.3) {
            angle = (Math.random() - 0.5) * fringeSpacing * 0.5;
        } else {
            const order = Math.floor(Math.random() * 4);
            const sign = Math.random() > 0.5 ? 1 : -1;
            angle = sign * order * fringeSpacing + (Math.random() - 0.5) * fringeSpacing * 0.4;
        }
        return centerY + angle;
    }

    draw() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const slitX = w * 0.2;
        const screenX = w * 0.6;
        const slitGap = 30 + this.slitDistance * 15;
        const centerY = h / 2;

        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(0, 0, w, h);

        // 光源
        const gradient = ctx.createRadialGradient(20, centerY, 0, 20, centerY, 30);
        gradient.addColorStop(0, '#22d3ee');
        gradient.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(20, centerY, 30, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // 双缝
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(slitX - 5, 0, 10, centerY - slitGap / 2 - 10);
        ctx.fillRect(slitX - 5, centerY - slitGap / 2 + 10, 10, slitGap - 20);
        ctx.fillRect(slitX - 5, centerY + slitGap / 2 + 10, 10, h);

        // 探测器
        if (this.detectorOn) {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
            ctx.fillRect(slitX + 15, centerY - slitGap - 20, 30, slitGap * 2 + 40);
            ctx.strokeStyle = '#ef4444';
            ctx.strokeRect(slitX + 15, centerY - slitGap - 20, 30, slitGap * 2 + 40);
        }

        // 屏幕
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(screenX - 5, 20, 10, h - 40);

        // 统计直方图
        const maxBin = Math.max(...this.histogramBins, 1);
        const binHeight = h / this.histogramBins.length;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.histogramBins.forEach((count, i) => {
            if (count > 0) {
                const barLength = (count / maxBin) * (w - screenX);
                const y = i * binHeight;
                ctx.fillRect(screenX + 5, y, barLength, binHeight);
            }
        });

        // 击中点
        this.screenHits.forEach(hit => {
            const g = ctx.createRadialGradient(screenX, hit.y, 0, screenX, hit.y, 5);
            g.addColorStop(0, `rgba(34, 211, 238, ${hit.alpha})`);
            g.addColorStop(1, 'transparent');
            ctx.beginPath();
            ctx.arc(screenX, hit.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = g;
            ctx.fill();
            hit.alpha *= 0.995;
        });

        // 粒子
        this.particles.forEach(p => {
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 10);
            g.addColorStop(0, '#22d3ee');
            g.addColorStop(1, 'transparent');
            ctx.beginPath();
            ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
            ctx.fillStyle = g;
            ctx.fill();
        });

        // 说明
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '12px Inter';
        ctx.textAlign = 'left';
        ctx.fillText(this.detectorOn ? '探测器开启：干涉消失' : '探测器关闭：产生干涉', 20, 25);
        ctx.fillText(`发射粒子数：${this.particleCount}`, 20, 45);

        ctx.textAlign = 'right';
        ctx.fillText('粒子数分布统计', w - 20, 25);
    }

    animate() {
        if (!this.isPaused) {
            if (this.isEmitting && Math.random() < 0.1) this.emitParticle();
            this.updateParticles();
        }
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

if (typeof DefaultContent !== 'undefined') {
    DefaultContent['double-slit'] = `# 双缝干涉实验

双缝实验被费曼称为"包含量子力学全部奥秘"的实验。

## 惊人发现

1. **单个粒子也能干涉** —— 粒子与自身干涉！
2. **观测改变结果** —— 开启探测器后干涉消失！

> 💡 **试试看**：开启/关闭探测器，观察干涉条纹的变化！

## 量子解释

粒子以**波函数**形式传播，处于"同时通过两条缝"的叠加态。
测量会使波函数**坍缩**，破坏叠加态。`;
}

document.addEventListener('DOMContentLoaded', () => { new DoubleSlitSimulation(); });
