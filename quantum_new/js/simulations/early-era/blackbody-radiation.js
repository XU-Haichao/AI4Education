/**
 * 黑体辐射交互模拟
 * 
 * 左侧：黑体加热模拟 - 随温度变化的颜色和亮度
 * 右侧：辐射曲线对比 - 普朗克、瑞利-金斯、维恩曲线
 */

class BlackbodySimulation {
    constructor() {
        // 黑体模拟画布
        this.blackbodyCanvas = document.getElementById('blackbody-canvas');
        this.blackbodyCtx = this.blackbodyCanvas?.getContext('2d');

        // 光谱曲线画布
        this.spectrumCanvas = document.getElementById('spectrum-canvas');
        this.spectrumCtx = this.spectrumCanvas?.getContext('2d');

        if (!this.blackbodyCanvas || !this.spectrumCanvas) return;

        // 温度参数
        this.temperature = 3000;  // K

        // 显示选项
        this.showPlanck = true;
        this.showRayleigh = true;
        this.showWien = true;

        // 物理常数
        this.h = 6.626e-34;      // 普朗克常数 J·s
        this.c = 3e8;            // 光速 m/s
        this.k = 1.381e-23;      // 玻尔兹曼常数 J/K
        this.sigma = 5.67e-8;    // 斯特藩-玻尔兹曼常数 W/(m²·K⁴)
        this.wien = 2.898e-3;    // 维恩位移常数 m·K

        // 粒子效果
        this.particles = [];

        this.init();
    }

    init() {
        this.resizeCanvases();
        this.initParticles();
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

        resize(this.blackbodyCanvas);
        resize(this.spectrumCanvas);

        window.addEventListener('resize', () => {
            resize(this.blackbodyCanvas);
            resize(this.spectrumCanvas);
            this.initParticles();
        });
    }

    initParticles() {
        this.particles = [];
        const count = 50;
        const w = this.blackbodyCanvas.width;
        const h = this.blackbodyCanvas.height;

        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: w / 2 + (Math.random() - 0.5) * 100,
                y: h / 2 + (Math.random() - 0.5) * 100,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                size: 2 + Math.random() * 3,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    bindEvents() {
        // 温度滑块
        const tempSlider = document.getElementById('temp-slider');
        const tempValue = document.getElementById('temp-value');
        if (tempSlider) {
            tempSlider.addEventListener('input', () => {
                this.temperature = parseInt(tempSlider.value);
                tempValue.textContent = `${this.temperature} K`;
                this.updateCalculations();
                this.updatePresetButtons();
            });
        }

        // 预设温度按钮
        document.querySelectorAll('.preset-btn[data-temp]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.temperature = parseInt(btn.dataset.temp);
                if (tempSlider) tempSlider.value = this.temperature;
                if (tempValue) tempValue.textContent = `${this.temperature} K`;
                this.updateCalculations();
                this.updatePresetButtons();
            });
        });

        // 曲线显示复选框
        document.getElementById('show-planck')?.addEventListener('change', (e) => {
            this.showPlanck = e.target.checked;
        });
        document.getElementById('show-rayleigh')?.addEventListener('change', (e) => {
            this.showRayleigh = e.target.checked;
        });
        document.getElementById('show-wien')?.addEventListener('change', (e) => {
            this.showWien = e.target.checked;
        });
    }

    updatePresetButtons() {
        document.querySelectorAll('.preset-btn[data-temp]').forEach(btn => {
            const temp = parseInt(btn.dataset.temp);
            btn.classList.toggle('active', Math.abs(temp - this.temperature) < 200);
        });
    }

    updateCalculations() {
        // 维恩位移定律：峰值波长
        const peakWavelength = (this.wien / this.temperature) * 1e9;  // nm

        // 斯特藩-玻尔兹曼定律：辐射功率
        const power = this.sigma * Math.pow(this.temperature, 4) / 1e6;  // MW/m²

        // 更新显示
        document.getElementById('peak-wavelength').textContent = peakWavelength.toFixed(0);
        document.getElementById('power-value').textContent = power.toFixed(1);
        document.getElementById('wien-constant').textContent = '2.898';

        // 确定颜色名称
        const colorName = this.getColorName(this.temperature);
        document.getElementById('color-name').textContent = colorName;
    }

    getColorName(T) {
        if (T < 1500) return '暗红';
        if (T < 2500) return '红橙';
        if (T < 3500) return '橙黄';
        if (T < 5000) return '黄白';
        if (T < 6500) return '纯白';
        if (T < 8000) return '蓝白';
        return '蓝亮';
    }

    // 温度转RGB颜色
    temperatureToRGB(T) {
        // 简化的黑体颜色计算
        let r, g, b;

        T = T / 100;

        // 红色分量
        if (T <= 66) {
            r = 255;
        } else {
            r = T - 60;
            r = 329.698727446 * Math.pow(r, -0.1332047592);
            r = Math.max(0, Math.min(255, r));
        }

        // 绿色分量
        if (T <= 66) {
            g = T;
            g = 99.4708025861 * Math.log(g) - 161.1195681661;
        } else {
            g = T - 60;
            g = 288.1221695283 * Math.pow(g, -0.0755148492);
        }
        g = Math.max(0, Math.min(255, g));

        // 蓝色分量
        if (T >= 66) {
            b = 255;
        } else if (T <= 19) {
            b = 0;
        } else {
            b = T - 10;
            b = 138.5177312231 * Math.log(b) - 305.0447927307;
            b = Math.max(0, Math.min(255, b));
        }

        return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
    }

    // 普朗克分布函数
    planckDistribution(wavelength, T) {
        // wavelength in nm, T in K
        const lambda = wavelength * 1e-9;  // 转换为米
        const c1 = 2 * this.h * this.c * this.c;
        const c2 = this.h * this.c / this.k;

        const exponent = c2 / (lambda * T);
        if (exponent > 700) return 0;  // 避免溢出

        return c1 / (Math.pow(lambda, 5) * (Math.exp(exponent) - 1));
    }

    // 瑞利-金斯分布（经典，导致紫外灾难）
    rayleighJeansDistribution(wavelength, T) {
        const lambda = wavelength * 1e-9;
        return 2 * this.c * this.k * T / Math.pow(lambda, 4);
    }

    // 维恩分布（低频近似）
    wienDistribution(wavelength, T) {
        const lambda = wavelength * 1e-9;
        const c1 = 2 * this.h * this.c * this.c;
        const c2 = this.h * this.c / this.k;

        const exponent = c2 / (lambda * T);
        if (exponent > 700) return 0;

        return c1 / (Math.pow(lambda, 5) * Math.exp(exponent));
    }

    drawBlackbody() {
        const ctx = this.blackbodyCtx;
        const w = this.blackbodyCanvas.width;
        const h = this.blackbodyCanvas.height;
        const centerX = w / 2;
        const centerY = h / 2;

        // 清空画布
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(0, 0, w, h);

        const color = this.temperatureToRGB(this.temperature);
        const intensity = Math.min(1, this.temperature / 6000);

        // 黑体外壳
        const bodyRadius = Math.min(w, h) * 0.3;

        // 发光效果（多层渐变）
        const glowSize = bodyRadius * (1 + intensity * 0.8);
        for (let layer = 3; layer >= 0; layer--) {
            const layerRadius = glowSize + layer * 20;
            const gradient = ctx.createRadialGradient(
                centerX, centerY, bodyRadius * 0.5,
                centerX, centerY, layerRadius
            );

            const alpha = (0.3 - layer * 0.07) * intensity;
            gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`);
            gradient.addColorStop(1, 'transparent');

            ctx.beginPath();
            ctx.arc(centerX, centerY, layerRadius, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
        }

        // 黑体主体
        const bodyGradient = ctx.createRadialGradient(
            centerX - bodyRadius * 0.3, centerY - bodyRadius * 0.3, 0,
            centerX, centerY, bodyRadius
        );
        bodyGradient.addColorStop(0, `rgba(${Math.min(255, color.r + 50)}, ${Math.min(255, color.g + 50)}, ${Math.min(255, color.b + 50)}, 1)`);
        bodyGradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, 1)`);
        bodyGradient.addColorStop(1, `rgba(${color.r * 0.5}, ${color.g * 0.5}, ${color.b * 0.5}, 1)`);

        ctx.beginPath();
        ctx.arc(centerX, centerY, bodyRadius, 0, Math.PI * 2);
        ctx.fillStyle = bodyGradient;
        ctx.fill();

        // 小开口（辐射出口）
        const holeRadius = bodyRadius * 0.15;
        const holeGradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, holeRadius
        );
        holeGradient.addColorStop(0, `rgba(${Math.min(255, color.r + 100)}, ${Math.min(255, color.g + 100)}, ${Math.min(255, color.b + 100)}, 1)`);
        holeGradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`);

        ctx.beginPath();
        ctx.arc(centerX, centerY, holeRadius, 0, Math.PI * 2);
        ctx.fillStyle = holeGradient;
        ctx.fill();

        // 辐射粒子
        const particleSpeed = 0.5 + intensity * 2;
        this.particles.forEach(p => {
            p.phase += 0.05;

            // 向外扩散
            const dx = p.x - centerX;
            const dy = p.y - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0) {
                p.x += (dx / dist) * particleSpeed;
                p.y += (dy / dist) * particleSpeed;
            }

            // 超出范围后重置
            if (dist > Math.max(w, h) * 0.6) {
                const angle = Math.random() * Math.PI * 2;
                const r = holeRadius * 0.5;
                p.x = centerX + Math.cos(angle) * r;
                p.y = centerY + Math.sin(angle) * r;
            }

            // 绘制粒子
            const alpha = Math.max(0, 1 - dist / (Math.max(w, h) * 0.5));
            const particleSize = p.size * (1 + Math.sin(p.phase) * 0.3);

            ctx.beginPath();
            ctx.arc(p.x, p.y, particleSize, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * intensity})`;
            ctx.fill();
        });

        // 温度标签
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = 'bold 24px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.temperature} K`, centerX, h - 30);
    }

    drawSpectrumCurves() {
        const ctx = this.spectrumCtx;
        const w = this.spectrumCanvas.width;
        const h = this.spectrumCanvas.height;

        // 清空画布
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(0, 0, w, h);

        const margin = { left: 50, right: 30, top: 30, bottom: 60 };
        const chartWidth = w - margin.left - margin.right;
        const chartHeight = h - margin.top - margin.bottom;

        // 波长范围 (nm)
        const minWL = 100;
        const maxWL = 3500;

        // 计算最大强度用于归一化
        let maxIntensity = 0;
        for (let wl = minWL; wl <= maxWL; wl += 10) {
            const intensity = this.planckDistribution(wl, this.temperature);
            if (intensity > maxIntensity) maxIntensity = intensity;
        }

        // 绘制坐标轴
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(margin.left, margin.top);
        ctx.lineTo(margin.left, margin.top + chartHeight);
        ctx.lineTo(margin.left + chartWidth, margin.top + chartHeight);
        ctx.stroke();

        // X轴标签
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        for (let wl = 500; wl <= maxWL; wl += 500) {
            const x = margin.left + (wl - minWL) / (maxWL - minWL) * chartWidth;
            ctx.fillText(`${wl}`, x, margin.top + chartHeight + 20);
        }
        ctx.fillText('波长 (nm)', margin.left + chartWidth / 2, margin.top + chartHeight + 45);

        // Y轴标签
        ctx.save();
        ctx.translate(15, margin.top + chartHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText('辐射强度 (相对)', 0, 0);
        ctx.restore();

        // 可见光区域
        const visibleStart = margin.left + (380 - minWL) / (maxWL - minWL) * chartWidth;
        const visibleEnd = margin.left + (780 - minWL) / (maxWL - minWL) * chartWidth;

        const visibleGradient = ctx.createLinearGradient(visibleStart, 0, visibleEnd, 0);
        visibleGradient.addColorStop(0, 'rgba(148, 0, 211, 0.15)');    // 紫
        visibleGradient.addColorStop(0.17, 'rgba(75, 0, 130, 0.15)');  // 靛
        visibleGradient.addColorStop(0.33, 'rgba(0, 0, 255, 0.15)');   // 蓝
        visibleGradient.addColorStop(0.5, 'rgba(0, 255, 0, 0.15)');    // 绿
        visibleGradient.addColorStop(0.67, 'rgba(255, 255, 0, 0.15)'); // 黄
        visibleGradient.addColorStop(0.83, 'rgba(255, 127, 0, 0.15)'); // 橙
        visibleGradient.addColorStop(1, 'rgba(255, 0, 0, 0.15)');      // 红

        ctx.fillStyle = visibleGradient;
        ctx.fillRect(visibleStart, margin.top, visibleEnd - visibleStart, chartHeight);

        // 区域标签
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = '10px Inter, sans-serif';
        const uvLabelX = margin.left + (200 - minWL) / (maxWL - minWL) * chartWidth;
        ctx.fillText('紫外', uvLabelX, margin.top + 40);
        ctx.fillText('可见光', (visibleStart + visibleEnd) / 2, margin.top + 40);
        const irLabelX = margin.left + (1000 - minWL) / (maxWL - minWL) * chartWidth;
        ctx.fillText('红外', irLabelX, margin.top + 40);

        // Y轴显示上限：普朗克曲线最大值的 1.3 倍
        const yMaxScale = maxIntensity * 1.3;

        // 绘制曲线的辅助函数：
        // - 使用统一归一化基准 yMaxScale
        // - 当强度超过 yMaxScale 时，不绘制（避免被截平成顶端水平线）
        const drawCurve = (getIntensity, color, maxScale = yMaxScale) => {
            ctx.beginPath();
            let started = false;

            for (let wl = minWL; wl <= maxWL; wl += 5) {
                const x = margin.left + (wl - minWL) / (maxWL - minWL) * chartWidth;
                let intensity = getIntensity(wl);

                // 超出显示上限则不绘制该点
                if (intensity > maxScale) {
                    started = false;
                    continue;
                }

                // 归一化到 [0, 1]
                intensity = intensity / maxScale;
                const y = margin.top + chartHeight - intensity * chartHeight;

                if (!started) {
                    ctx.moveTo(x, y);
                    started = true;
                } else {
                    ctx.lineTo(x, y);
                }
            }

            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
        };

        // 瑞利-金斯曲线（红色，紫外灾难）
        if (this.showRayleigh) {
            drawCurve(
                (wl) => this.rayleighJeansDistribution(wl, this.temperature),
                '#ef4444'
            );
        }

        // 维恩曲线（蓝色）
        if (this.showWien) {
            drawCurve(
                (wl) => this.wienDistribution(wl, this.temperature),
                '#3b82f6'
            );
        }

        // 普朗克曲线（绿色，正确曲线）
        if (this.showPlanck) {
            drawCurve(
                (wl) => this.planckDistribution(wl, this.temperature),
                '#22c55e'
            );

            // 峰值标记
            const peakWL = this.wien / this.temperature * 1e9;
            if (peakWL >= minWL && peakWL <= maxWL) {
                const peakX = margin.left + (peakWL - minWL) / (maxWL - minWL) * chartWidth;
                const peakY = margin.top + chartHeight * 0.05;

                ctx.setLineDash([4, 4]);
                ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(peakX, margin.top);
                ctx.lineTo(peakX, margin.top + chartHeight);
                ctx.stroke();
                ctx.setLineDash([]);

                ctx.fillStyle = '#22c55e';
                ctx.font = '10px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`λmax=${peakWL.toFixed(0)}nm`, peakX, margin.top + chartHeight + 35);
            }
        }

        // 图例
        const legendX = margin.left + chartWidth - 120;
        const legendY = margin.top + 40;

        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'left';

        if (this.showPlanck) {
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(legendX, legendY, 15, 3);
            ctx.fillText('普朗克', legendX + 20, legendY + 4);
        }
        if (this.showRayleigh) {
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(legendX, legendY + 18, 15, 3);
            ctx.fillText('瑞利-金斯', legendX + 20, legendY + 22);
        }
        if (this.showWien) {
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(legendX, legendY + 36, 15, 3);
            ctx.fillText('维恩', legendX + 20, legendY + 40);
        }
    }

    animate() {
        this.drawBlackbody();
        this.drawSpectrumCurves();
        requestAnimationFrame(() => this.animate());
    }
}

// 扩展默认内容
if (typeof DefaultContent !== 'undefined') {
    DefaultContent['blackbody-radiation'] = `# 黑体辐射

19世纪末，物理学家们在研究黑体辐射时遭遇了著名的"紫外灾难"，这一危机最终催生了量子理论。

## 什么是黑体？

**黑体**是一个理想化的物体，它能完全吸收所有入射的电磁辐射。当黑体被加热时，它会发出连续光谱的热辐射。

> 💡 **观察**：调整温度，看看黑体颜色如何变化！

## 紫外灾难

经典的**瑞利-金斯公式**预测辐射强度：
$$u(\\lambda) = \\frac{8\\pi k T}{\\lambda^4}$$

但这导致了一个荒谬的结果：随着波长减小（频率增加），辐射强度趋向无穷大！这被称为**紫外灾难**。

## 普朗克的革命

1900年，普朗克提出了一个大胆的假设：
> 能量不是连续的，而是以离散的"量子"形式存在

**普朗克公式**：
$$u(\\lambda) = \\frac{8\\pi hc}{\\lambda^5} \\cdot \\frac{1}{e^{hc/(\\lambda k T)} - 1}$$

关键量子化条件：
$$E = nh\\nu, \\quad n = 0, 1, 2, ...$$

其中 $h = 6.626 \\times 10^{-34}$ J·s 是普朗克常数。

## 相关定律

| 定律 | 公式 | 含义 |
|------|------|------|
| 维恩位移 | $\\lambda_{max} T = b$ | 峰值波长与温度成反比 |
| 斯特藩-玻尔兹曼 | $P = \\sigma T^4$ | 辐射功率与温度四次方成正比 |`;
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    new BlackbodySimulation();
});
