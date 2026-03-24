/**
 * De Broglie Wave Simulation
 * Adapted for Standard Layout
 */

class DeBroglieApp {
    constructor() {
        this.canvas = document.getElementById('de-broglie-canvas');
        this.ctx = this.canvas?.getContext('2d');

        if (!this.canvas) return;

        // Physics Constants
        this.h = 6.626e-34;

        // State
        this.particles = {
            electron: { name: '电子', mass: 9.109e-31, color: '#22d3ee', scale: 1 },
            proton: { name: '质子', mass: 1.673e-27, color: '#f472b6', scale: 50 },
            c60: { name: '富勒烯', mass: 1.2e-24, color: '#a78bfa', scale: 200 },
            dust: { name: '星际尘埃', mass: 1e-17, color: '#A0522D', scale: 1000 }
        };

        this.state = {
            massName: 'electron',
            massVal: 9.109e-31,
            velocityPercent: 20,
            time: 0
        };

        this.stars = [];
        this.init();
    }

    init() {
        this.resize();
        this.createStars();

        // Handle Resize
        const observer = new ResizeObserver(() => this.resize());
        observer.observe(this.canvas.parentElement);
        window.addEventListener('resize', () => this.resize());

        this.bindControls();
        this.updatePhysics();
        this.animate();
    }

    createStars() {
        this.stars = [];
        // Fewer stars for smaller canvas
        for (let i = 0; i < 80; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 1.5,
                alpha: Math.random() * 0.5 + 0.1
            });
        }
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        // Re-create stars to fit new dim if drastically changed? 
        // Or just let them be. Let's re-create if empty, otherwise just let them exist off-screen
        if (this.stars.length === 0) this.createStars();
    }

    bindControls() {
        // Particle Presets
        document.querySelectorAll('.preset-btn[data-preset]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.preset-btn[data-preset]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.loadPreset(btn.dataset.preset);
                document.getElementById('particle-name').textContent = btn.textContent;
            });
        });

        // Mass Slider
        const mInput = document.getElementById('mass-slider');
        const mLabel = document.getElementById('mass-log-val');

        mInput.addEventListener('input', (e) => {
            // Manual slider overrides preset visual state
            document.querySelectorAll('.preset-btn[data-preset]').forEach(b => b.classList.remove('active'));
            document.getElementById('particle-name').textContent = '自定义';

            const exp = parseFloat(e.target.value);
            const m = Math.pow(10, exp);
            this.state.massVal = m;
            this.state.massName = 'custom';
            mLabel.textContent = m.toExponential(1) + ' kg';

            this.updatePhysics();
        });

        // Velocity Slider
        const vInput = document.getElementById('velocity-slider');
        vInput.addEventListener('input', (e) => {
            this.state.velocityPercent = parseFloat(e.target.value);
            this.updatePhysics();
        });
    }

    loadPreset(key) {
        const p = this.particles[key];
        this.state.massName = key;
        this.state.massVal = p.mass;

        // Update Slider to match preset
        const exp = Math.log10(p.mass);
        const mInput = document.getElementById('mass-slider');
        mInput.value = exp;
        document.getElementById('mass-log-val').textContent = p.mass.toExponential(1) + ' kg';

        this.updatePhysics();
    }

    updatePhysics() {
        // Physics Calculation
        // v_real mapped to make sense: 100% = 10km/s for Baseball? 
        // But for Electron 10km/s is slow.
        // Let's make V scale dependent on particle type for better visual effect?
        // Or just keep it abstract "percent of relevant speed".
        // Let's stick to abstract speed for visualization control.
        // Assuming slider is 0..100 "Speed Units"

        const v_display = this.state.velocityPercent / 10; // km/s displayed
        const v_real = v_display * 1000; // m/s

        const m = this.state.massVal;
        const p = m * v_real;
        let lambda = 0;
        if (p > 0) lambda = this.h / p;

        // Visual Parameters
        // Visualization Logic with Normalization
        // 1. Packet Size (Sigma) propto 1/p
        // Range of p: ~1e-27 (Electron) to ~1e-13 (Dust) -> 14 orders of magnitude.
        // We map log10(p) to a visual size range [200px, 2px].

        let visualSigma = 0;
        const p_min_log = -28; // Electron-ish
        const p_max_log = -14; // Dust-ish

        let p_log = -28;
        if (p > 0) p_log = Math.log10(p);

        // Clamp for safety
        if (p_log < p_min_log) p_log = p_min_log;
        if (p_log > p_max_log) p_log = p_max_log;

        // Normalization factor (0 to 1, 0=Electron, 1=Dust)
        const t = (p_log - p_min_log) / (p_max_log - p_min_log);

        // Size mapping: Large -> Small
        // Using a power-like feel or just linear linear-log
        visualSigma = 200 * (1 - t) + 3 * t;

        // 2. Wavelength lambda = sigma / 4
        // Fixed ratio as requested
        const visualLambda = visualSigma / 4;

        // 3. Frequency propto m * v^2 (Energy)
        // Energy range: ~1e-30 J to ~1e-13 J. Huge range.
        // Map log10(E) to visual phase speed.
        const E = 0.5 * m * v_real * v_real;
        let E_log = -30;
        if (E > 0) E_log = Math.log10(E);

        const E_min_log = -30;
        const E_max_log = -10;
        const t_E = Math.max(0, Math.min(1, (E_log - E_min_log) / (E_max_log - E_min_log)));

        // Speed: 0.02 (Slow) -> 0.4 (Fast)
        const visualPhaseSpeed = 0.02 + t_E * 0.4;

        // Pass to simulation state
        this.simulationState = {
            v_real,
            m,
            lambda,
            visualWavelength: visualLambda,
            visualSigma: visualSigma,
            visualPhaseSpeed: visualPhaseSpeed,
            visualSpeed: this.state.velocityPercent * 0.2 // Background movement
        };

        // Update UI
        document.getElementById('velocity-val').textContent = `${v_display.toFixed(1)} km/s`;

        document.getElementById('res-mass').textContent = m.toExponential(2).replace('e', '×10^');
        document.getElementById('res-wavelength').textContent = lambda.toExponential(2).replace('e', '×10^');

        const scaleLabel = document.getElementById('res-scale');
        if (m < 1e-25) {
            scaleLabel.textContent = "显著 (量子域)";
            scaleLabel.style.color = '#22c55e';
        } else if (m < 1e-15) {
            scaleLabel.textContent = "微弱 (介观域)";
            scaleLabel.style.color = '#eab308';
        } else {
            scaleLabel.textContent = "不可见 (经典域)";
            scaleLabel.style.color = '#ef4444';
        }
    }

    animate() {
        this.state.time++;
        // Use a safe fallback for context if canvas disappeared
        if (!this.ctx) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawBackground();
        this.drawParticle();

        requestAnimationFrame(() => this.animate());
    }

    drawBackground() {
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Background Color
        this.ctx.fillStyle = '#0a0a14';
        this.ctx.fillRect(0, 0, w, h);



        // Stars
        this.ctx.fillStyle = 'white';
        this.stars.forEach(star => {
            let x = star.x;
            x -= this.simulationState.visualSpeed * 0.5 * this.state.time; // Stars farther away move slower than grid? Or parallax.
            // Wrap around
            x = ((x % w) + w) % w;

            this.ctx.globalAlpha = star.alpha;
            this.ctx.beginPath();
            this.ctx.arc(x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1;
    }

    drawParticle() {
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        const wl = this.simulationState.visualWavelength;
        const sigma = this.simulationState.visualSigma;
        const isWave = sigma > 5; // Scaling threshold
        const color = this.particles[this.state.massName]?.color || '#fff';

        this.ctx.save();
        this.ctx.translate(cx, cy);

        if (isWave) {
            // Draw Wave Packet
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();

            const range = sigma * 3; // 3 sigma coverage
            const steps = 200;

            // Draw Wave
            this.ctx.beginPath();
            for (let i = 0; i <= steps; i++) {
                const x = -range + (i / steps) * range * 2;

                // Gaussian Envelope
                const env = Math.exp(-(x * x) / (2 * sigma * sigma));

                // Wave: k = 2pi / lambda
                const k = (2 * Math.PI) / wl;
                const phase = this.state.time * this.simulationState.visualPhaseSpeed;

                const y = Math.sin(k * x - phase) * 30 * env;

                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            }
            this.ctx.stroke();

            // Glow
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = color;
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;

            // Envelope outline
            this.ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            this.ctx.setLineDash([4, 4]);
            this.ctx.beginPath();
            for (let i = 0; i <= steps; i++) {
                const x = -range + (i / steps) * range * 2;
                const env = Math.exp(-(x * x) / (2 * sigma * sigma));
                const y = 30 * env; // Amplitude fixed at 30
                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            }
            for (let i = 0; i <= steps; i++) {
                const x = range - (i / steps) * range * 2;
                const env = Math.exp(-(x * x) / (2 * sigma * sigma));
                const y = -30 * env;
                this.ctx.lineTo(x, y);
            }
            this.ctx.stroke();
            this.ctx.setLineDash([]);

        } else {
            // Particle
            this.ctx.fillStyle = color;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = color;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 10, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;

            // Trail or Motion Blur?
            // Simple dash line behind
            if (this.simulationState.visualSpeed > 0) {
                this.ctx.strokeStyle = color;
                this.ctx.globalAlpha = 0.3;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(-20, 0);
                this.ctx.lineTo(-50, 0);
                this.ctx.stroke();
                this.ctx.globalAlpha = 1;
            }
        }

        this.ctx.restore();
    }
}

// 扩展默认内容
if (typeof DefaultContent !== 'undefined') {
    DefaultContent['de-broglie-wave'] = `# 德布罗意波 (De Broglie Waves)

1924年，法国物理学家路易·德布罗意 (Louis de Broglie) 在他的博士论文中提出了一个大胆的假说：**所有运动的物质都具有波动性**。这一思想将爱因斯坦对光的"粒子性"认识推广到了一切物质粒子。

---

## 🧠 理论背景：从光到物质

### 爱因斯坦的启发

1905年，爱因斯坦提出光量子假说，赋予光以粒子性：

$$ E = h\\\\nu, \\\\quad p = \\\\frac{h}{\\\\lambda} $$

德布罗意的关键洞察在于：**如果光（波）可以表现为粒子，那么粒子是否也可以表现为波？**

### 相对论推导

德布罗意从相对论的质能关系出发，将频率 $\\\\nu$ 和波长 $\\\\lambda$ 同时赋予运动粒子：

$$E = h\\\\nu = mc^2 \\\\quad \\\\Rightarrow \\\\quad \\\\nu = \\\\frac{mc^2}{h}$$

$$p = \\\\frac{h}{\\\\lambda} \\\\quad \\\\Rightarrow \\\\quad \\\\lambda = \\\\frac{h}{p} = \\\\frac{h}{mv}$$

---

## 🔬 为什么日常物体看不到波动性？

在上方的模拟中，尝试切换不同的粒子类型，观察波长的变化：

| 粒子 | 质量 (kg) | 速度 (km/s) | 德布罗意波长 |
|------|----------|------------|-------------|
| 电子 | $9.1 \\\\times 10^{-31}$ | 2.0 | $\\\\sim 0.36$ nm（与原子尺度相当 ✅） |
| 质子 | $1.7 \\\\times 10^{-27}$ | 2.0 | $\\\\sim 0.20$ pm（比原子小得多） |
| 富勒烯 C₆₀ | $1.2 \\\\times 10^{-24}$ | 2.0 | $\\\\sim 2.8 \\\\times 10^{-13}$ m |
| 星际尘埃 | $1 \\\\times 10^{-17}$ | 2.0 | $\\\\sim 3.3 \\\\times 10^{-20}$ m |

- **微观粒子**（如电子）：质量极小，波长与原子间距相当，波动性**显著可观测**。
- **宏观物体**：质量大，波长远小于任何可探测尺度，表现为经典粒子。

> 📏 **关键判据**：当德布罗意波长 $\\\\lambda$ 与物体的特征尺寸（如晶格间距 $\\\\sim 0.1$ nm）相当时，波动效应才可被观测到。`;
}

document.addEventListener('DOMContentLoaded', () => {
    new DeBroglieApp();
});
