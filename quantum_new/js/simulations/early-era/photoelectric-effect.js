/**
 * 光电效应交互模拟
 * 
 * 左侧：光电效应实验装置 - 光子照射金属产生电子
 * 右侧：动能-频率关系曲线 - 验证爱因斯坦光电方程
 */

class PhotoelectricSimulation {
    constructor() {
        // 实验装置画布
        this.experimentCanvas = document.getElementById('photoelectric-canvas');
        this.experimentCtx = this.experimentCanvas?.getContext('2d');

        // 曲线图画布
        this.plotCanvas = document.getElementById('energy-plot-canvas');
        this.plotCtx = this.plotCanvas?.getContext('2d');

        if (!this.experimentCanvas || !this.plotCanvas) return;

        // 光源参数
        this.frequency = 6;  // ×10¹⁴ Hz
        this.intensity = 3;  // 1-5

        // 金属参数（逸出功 eV）
        this.metals = {
            cs: { name: '铯', workFunction: 1.9, color: '#fcd34d' },
            na: { name: '钠', workFunction: 2.3, color: '#94a3b8' },
            zn: { name: '锌', workFunction: 4.3, color: '#a1a1aa' },
            cu: { name: '铜', workFunction: 4.7, color: '#f97316' }
        };
        this.currentMetal = 'zn';

        // 物理常数
        this.h = 4.136e-15;  // 普朗克常数 eV·s

        // 动画粒子
        this.photons = [];
        this.electrons = [];
        this.isEmitting = false;

        this.init();
    }

    init() {
        this.resizeCanvases();
        this.bindEvents();
        this.updateCalculations();
        this.animate();
    }

    resizeCanvases() {
        const resize = (canvas) => {
            const rect = canvas.parentElement.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
        };

        resize(this.experimentCanvas);
        resize(this.plotCanvas);

        window.addEventListener('resize', () => {
            resize(this.experimentCanvas);
            resize(this.plotCanvas);
        });
    }

    bindEvents() {
        // 频率滑块
        const freqSlider = document.getElementById('freq-slider');
        const freqValue = document.getElementById('freq-value');
        const wavelengthBar = document.getElementById('wavelength-bar');

        const updateWavelengthIndicator = () => {
            if (!wavelengthBar) return;
            // 映射到波长条（250nm~1000nm 线性），λ(nm)=3000/freq，其中 freq 单位是 ×10^14 Hz
            const wavelength = 3000 / this.frequency;
            const minWavelength = 250;
            const maxWavelength = 1000;
            const clamped = Math.min(maxWavelength, Math.max(minWavelength, wavelength));
            const percent = ((clamped - minWavelength) / (maxWavelength - minWavelength)) * 100;
            wavelengthBar.style.setProperty('--indicator-pos', `${percent}%`);
            wavelengthBar.style.setProperty('--indicator-color', this.frequencyToColor(this.frequency));
        };
        if (freqSlider) {
            freqSlider.addEventListener('input', () => {
                this.frequency = parseFloat(freqSlider.value);
                freqValue.textContent = `${this.frequency.toFixed(1)} ×10¹⁴ Hz`;

                // 更新波长条指示器位置
                updateWavelengthIndicator();

                this.updateCalculations();
            });
        }
        updateWavelengthIndicator();

        // 光强滑块
        const intensitySlider = document.getElementById('intensity-slider');
        const intensityValue = document.getElementById('intensity-value');
        const intensityLabels = ['极弱', '弱', '中等', '强', '极强'];
        if (intensitySlider) {
            intensitySlider.addEventListener('input', () => {
                this.intensity = parseInt(intensitySlider.value);
                intensityValue.textContent = intensityLabels[this.intensity - 1];
            });
        }

        // 金属选择
        document.querySelectorAll('.preset-btn[data-metal]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.preset-btn[data-metal]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentMetal = btn.dataset.metal;
                this.updateCalculations();
                this.electrons = [];  // 清除电子
            });
        });

        // 重置按钮
        document.getElementById('reset-btn')?.addEventListener('click', () => {
            this.photons = [];
            this.electrons = [];
            this.isEmitting = false;
        });

        // 发射按钮
        document.getElementById('emit-btn')?.addEventListener('click', () => {
            this.emitPhotonBurst();
        });
    }

    updateCalculations() {
        const metal = this.metals[this.currentMetal];
        const photonEnergy = this.h * this.frequency * 1e14;  // eV
        const kineticEnergy = Math.max(0, photonEnergy - metal.workFunction);

        // 更新显示
        document.getElementById('photon-energy').textContent = photonEnergy.toFixed(2);
        document.getElementById('work-function').textContent = metal.workFunction.toFixed(1);
        document.getElementById('kinetic-energy').textContent = kineticEnergy.toFixed(2);

        // 状态
        const statusEl = document.getElementById('effect-status');
        if (photonEnergy >= metal.workFunction) {
            statusEl.textContent = '有效应';
            statusEl.style.color = '#22c55e';
        } else {
            statusEl.textContent = '无效应';
            statusEl.style.color = '#ef4444';
        }

        this.photonEnergy = photonEnergy;
        this.kineticEnergy = kineticEnergy;
    }

    // 波长对应颜色
    frequencyToColor(freq) {
        // freq in 10^14 Hz
        // λ(nm) = c/f = 3e8 / (freq * 1e14) m = (3e-6 / freq) m = (3000 / freq) nm
        const wavelength = 3000 / freq;

        if (wavelength < 380) return '#a855f7';      // UV
        if (wavelength < 450) return '#3b82f6';      // 蓝
        if (wavelength < 495) return '#06b6d4';      // 青
        if (wavelength < 570) return '#22c55e';      // 绿
        if (wavelength < 590) return '#eab308';      // 黄
        if (wavelength < 620) return '#f97316';      // 橙
        if (wavelength < 750) return '#ef4444';      // 红
        return '#991b1b';                             // IR
    }

    emitPhotonBurst() {
        this.isEmitting = true;
        const count = this.intensity * 3;

        for (let i = 0; i < count; i++) {
            setTimeout(() => this.emitPhoton(), i * 100);
        }

        setTimeout(() => {
            this.isEmitting = false;
        }, count * 100 + 500);
    }

    emitPhoton() {
        const h = this.experimentCanvas.height;
        const metalY = h * 0.7;

        this.photons.push({
            x: 50 + Math.random() * 30,
            y: 50 + Math.random() * 50,
            targetX: 150 + Math.random() * 80,
            targetY: metalY - 5,
            progress: 0,
            color: this.frequencyToColor(this.frequency)
        });
    }

    drawExperiment() {
        const ctx = this.experimentCtx;
        const w = this.experimentCanvas.width;
        const h = this.experimentCanvas.height;
        const metal = this.metals[this.currentMetal];
        const metalY = h * 0.7;

        // 清空画布
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(0, 0, w, h);

        // 绘制真空管外壳
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(30, 30, w - 60, h - 60, 20);
        ctx.stroke();

        // 光源（左上）
        const lightColor = this.frequencyToColor(this.frequency);
        const lightX = 50;
        const lightY = 60;

        // 光源发光效果
        const lightGradient = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, 40);
        lightGradient.addColorStop(0, lightColor);
        lightGradient.addColorStop(0.5, lightColor + '80');
        lightGradient.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(lightX, lightY, 40, 0, Math.PI * 2);
        ctx.fillStyle = lightGradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(lightX, lightY, 15, 0, Math.PI * 2);
        ctx.fillStyle = lightColor;
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('光源', lightX, lightY + 55);

        // 光束（如果正在发射）
        if (this.isEmitting || this.photons.length > 0) {
            ctx.strokeStyle = lightColor + '40';
            ctx.lineWidth = 30;
            ctx.beginPath();
            ctx.moveTo(lightX + 20, lightY + 20);
            ctx.lineTo(180, metalY - 20);
            ctx.stroke();
        }

        // 金属板
        const metalGradient = ctx.createLinearGradient(80, metalY - 30, 80, metalY + 30);
        metalGradient.addColorStop(0, metal.color);
        metalGradient.addColorStop(0.5, metal.color + 'cc');
        metalGradient.addColorStop(1, metal.color + '80');

        ctx.fillStyle = metalGradient;
        ctx.fillRect(80, metalY - 30, 150, 60);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(80, metalY - 30, 150, 60);

        ctx.fillStyle = 'white';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${metal.name}极板`, 155, metalY + 50);

        // 集电极（阳极）
        const collectorX = w - 100;
        const collectorWidth = 20;
        const collectorHeight = 180;
        const collectorTop = Math.max(40, metalY - collectorHeight / 2 - 50);
        const collectorBottom = collectorTop + collectorHeight;

        ctx.fillStyle = '#4a4a5a';
        ctx.fillRect(collectorX, collectorTop, collectorWidth, collectorHeight);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '10px Inter, sans-serif';
        const collectorLabelY = Math.min(h - 10, collectorBottom + 18);
        ctx.fillText('集电极', collectorX + collectorWidth / 2, collectorLabelY);

        // 电流表
        const meterX = w * 0.5;
        const meterY = 80;

        ctx.beginPath();
        ctx.arc(meterX, meterY, 30, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 表针
        const current = this.electrons.length > 0 ? Math.min(1, this.electrons.length / 10) : 0;
        const needleAngle = -Math.PI * 0.7 + current * Math.PI * 0.4;

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(meterX, meterY);
        ctx.lineTo(meterX + Math.cos(needleAngle) * 20, meterY + Math.sin(needleAngle) * 20);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText('电流', meterX, meterY + 45);

        // 更新和绘制光子
        for (let i = this.photons.length - 1; i >= 0; i--) {
            const p = this.photons[i];
            p.progress += 0.03;

            // 贝塞尔曲线插值
            const t = p.progress;
            p.x = p.x + (p.targetX - p.x) * t;
            p.y = p.y + (p.targetY - p.y) * t;

            if (p.progress >= 1) {
                // 光子到达金属表面
                this.photons.splice(i, 1);

                // 如果能量足够，产生电子
                if (this.photonEnergy >= metal.workFunction) {
                    // 增强“频率越高 -> 动能越大 -> 速度越快”的视觉对比
                    // 线性缩放比 sqrt 更明显（尤其在低动能区域）
                    const speed = Math.max(0, this.kineticEnergy) * 1.75;
                    this.electrons.push({
                        x: p.targetX,
                        y: metalY - 35,
                        vx: 2 + speed + Math.random() * speed,
                        vy: -1 - Math.random() * 2 - speed * 0.06,
                        alpha: 1
                    });
                }
                continue;
            }

            // 绘制光子
            const photonGradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 10);
            photonGradient.addColorStop(0, p.color);
            photonGradient.addColorStop(0.5, p.color + '80');
            photonGradient.addColorStop(1, 'transparent');

            ctx.beginPath();
            ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
            ctx.fillStyle = photonGradient;
            ctx.fill();

            ctx.fillStyle = p.color;
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('γ', p.x, p.y + 4);
        }

        // 更新和绘制电子
        for (let i = this.electrons.length - 1; i >= 0; i--) {
            const e = this.electrons[i];
            e.x += e.vx;
            e.y += e.vy;
            e.vy += 0.02;  // 微弱重力
            e.alpha -= 0.005;

            if (e.x > w || e.alpha <= 0) {
                this.electrons.splice(i, 1);
                continue;
            }

            // 绘制电子
            const electronGradient = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, 10);
            electronGradient.addColorStop(0, `rgba(34, 211, 238, ${e.alpha})`);
            electronGradient.addColorStop(0.5, `rgba(34, 211, 238, ${e.alpha * 0.5})`);
            electronGradient.addColorStop(1, 'transparent');

            ctx.beginPath();
            ctx.arc(e.x, e.y, 10, 0, Math.PI * 2);
            ctx.fillStyle = electronGradient;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(e.x, e.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(34, 211, 238, ${e.alpha})`;
            ctx.fill();
        }

        // 爱因斯坦方程
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('hν = W + Ek', w / 2, h - 40);
    }

    drawEnergyPlot() {
        const ctx = this.plotCtx;
        const w = this.plotCanvas.width;
        const h = this.plotCanvas.height;
        const metal = this.metals[this.currentMetal];

        // 清空画布
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(0, 0, w, h);

        const margin = { left: 60, right: 30, top: 30, bottom: 60 };
        const chartWidth = w - margin.left - margin.right;
        const chartHeight = h - margin.top - margin.bottom;

        // 坐标轴范围
        const minFreq = 0;
        const maxFreq = 15;  // ×10¹⁴ Hz
        const minEnergy = 0;
        const maxEnergy = 4;  // eV

        const getX = (f) => margin.left + (f / maxFreq) * chartWidth;
        const getY = (e) => margin.top + chartHeight - ((e - minEnergy) / (maxEnergy - minEnergy)) * chartHeight;

        // 绘制坐标轴
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;

        // Y轴
        ctx.beginPath();
        ctx.moveTo(margin.left, margin.top);
        ctx.lineTo(margin.left, margin.top + chartHeight);
        ctx.stroke();

        // X轴（在E=0处）
        const zeroY = getY(0);
        ctx.beginPath();
        ctx.moveTo(margin.left, zeroY);
        ctx.lineTo(margin.left + chartWidth, zeroY);
        ctx.stroke();

        // 坐标轴标签
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';

        // X轴刻度
        for (let f = 0; f <= 15; f += 3) {
            const x = getX(f);
            ctx.fillText(`${f}`, x, zeroY + 20);
        }
        ctx.fillText('频率 ν (×10¹⁴ Hz)', margin.left + chartWidth / 2, h - 15);

        // Y轴刻度
        ctx.textAlign = 'right';
        for (let e = 0; e <= 4; e += 1) {
            const y = getY(e);
            ctx.fillText(`${e}`, margin.left - 10, y + 4);
        }

        // Y轴标签
        ctx.save();
        ctx.translate(15, margin.top + chartHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText('最大动能 Ek (eV)', 0, 0);
        ctx.restore();

        // 截止频率
        const thresholdFreq = metal.workFunction / this.h / 1e14;
        const thresholdX = getX(thresholdFreq);

        // 截止频率虚线
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
        ctx.beginPath();
        ctx.moveTo(thresholdX, margin.top);
        ctx.lineTo(thresholdX, margin.top + chartHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#ef4444';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`ν₀=${thresholdFreq.toFixed(1)}`, thresholdX, margin.top + chartHeight + 35);

        // 绘制各金属的曲线
        Object.entries(this.metals).forEach(([key, m]) => {
            const tf = m.workFunction / this.h / 1e14;
            const isActive = key === this.currentMetal;

            ctx.strokeStyle = isActive ? '#22c55e' : 'rgba(99, 102, 241, 0.3)';
            ctx.lineWidth = isActive ? 3 : 1;

            ctx.beginPath();

            // 从截止频率开始画线（Ek = hν - W）
            for (let f = tf; f <= maxFreq; f += 0.5) {
                const ek = this.h * f * 1e14 - m.workFunction;
                const x = getX(f);
                const y = getY(ek);

                if (f === tf) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();

            // 金属标签
            if (isActive) {
                ctx.fillStyle = '#22c55e';
                ctx.font = '11px Inter, sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(`${m.name} (W=${m.workFunction}eV)`, getX(tf) + 5, getY(0) - 10);
            }
        });

        // 当前状态点
        const currentX = getX(this.frequency);
        const currentY = getY(this.kineticEnergy);

        if (this.frequency * 1e14 * this.h >= metal.workFunction) {
            // 在曲线上的点
            ctx.beginPath();
            ctx.arc(currentX, currentY, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#22c55e';
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else {
            // 低于截止频率，显示在X轴上
            ctx.beginPath();
            ctx.arc(currentX, zeroY, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#ef4444';
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // 斜率说明
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('斜率 = h (普朗克常数)', margin.left + 10, margin.top + 45);
    }

    animate() {
        this.drawExperiment();
        this.drawEnergyPlot();
        requestAnimationFrame(() => this.animate());
    }
}

// 扩展默认内容
if (typeof DefaultContent !== 'undefined') {
    DefaultContent['photoelectric-effect'] = `# 光电效应

1905年，爱因斯坦用**光量子假说**完美解释了光电效应，这是量子理论的重大突破。

## 经典理论的困惑

用经典波动理论无法解释的现象：
1. **截止频率**：光的频率低于某个值时，无论多强都不能产生光电效应
2. **瞬时性**：光电子几乎瞬间产生，无需能量积累
3. **动能与频率**：电子最大动能只与频率有关，与光强无关

> 💡 **试试看**：调整光的频率和强度，观察能否产生光电效应！

## 爱因斯坦的解释

爱因斯坦提出光由一个个**光量子（光子）**组成：
$$E_{光子} = h\\nu$$

光电效应方程：
$$h\\nu = W + E_k$$

其中：
- $h\\nu$ 是光子能量
- $W$ 是逸出功（使电子脱离金属所需最小能量）
- $E_k$ 是光电子最大动能

## 实验规律

| 规律 | 解释 |
|------|------|
| 截止频率存在 | 光子能量必须大于逸出功 |
| 瞬时产生 | 单个光子一次性释放全部能量 |
| 动能与频率成正比 | $E_k = h\\nu - W$ |
| 电流与光强成正比 | 光子数目决定电子数目 |`;
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    new PhotoelectricSimulation();
});
