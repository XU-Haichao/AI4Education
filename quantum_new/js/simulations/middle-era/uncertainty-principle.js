/**
 * 不确定性原理交互模拟 - 单缝衍射实验
 * 通过“限制位置（狭缝）导致动量分散（衍射）”来直观展示 ΔxΔp ≥ ħ/2
 */

class UncertaintySimulation {
    constructor() {
        this.canvas = document.getElementById('experiment-canvas');
        this.ctx = this.canvas?.getContext('2d');

        // Safety check
        if (!this.canvas || !this.ctx) {
            console.error('Canvas element not found or context init failed');
            return;
        }

        // Default dimensions to prevent invisible canvas if resize fails
        this.width = 800;
        this.height = 400;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // Simulation State
        this.particles = [];
        this.hits = []; // Screen hits for histogram
        this.slitWidth = 50; // Matches HTML default
        this.isFiring = false;
        this.animationId = null;

        // Physics Constants
        this.wavelength = 5; // De Broglie wavelength
        this.particleSpeed = 4;
        this.slitXRatio = 0.25; // Slit slightly right (20% -> 25%)
        this.screenXRatio = 0.82; // Screen slightly right (75% -> 82%)

        this.init();
    }

    init() {
        this.resizeCanvas();
        this.bindEvents();
        this.startFiring(); // Auto start
        this.animate();
    }

    resizeCanvas() {
        const resize = () => {
            const rect = this.canvas.parentElement.getBoundingClientRect();
            // Fallback to default if rect is invalid (e.g. hidden or initializing)
            if (rect.width > 0 && rect.height > 0) {
                this.canvas.width = rect.width;
                this.canvas.height = rect.height;
                this.width = rect.width;
                this.height = rect.height;
            } else {
                // Ensure reasonable defaults
                this.canvas.width = this.width || 800;
                this.canvas.height = this.height || 400;
            }
        };
        resize();
        window.addEventListener('resize', resize);
    }

    bindEvents() {
        // Slider Control
        const slider = document.getElementById('slit-slider');
        const display = document.getElementById('width-display');
        const sliderValDisplay = document.getElementById('slider-val');
        const spreadDisplay = document.getElementById('spread-display');

        const updateSlit = () => {
            if (!slider) return;
            this.slitWidth = parseInt(slider.value);

            // Map slider (20-150) to display text
            let label = '中等';
            if (this.slitWidth < 40) label = '极窄';
            else if (this.slitWidth < 70) label = '较窄';
            else if (this.slitWidth < 100) label = '中等';
            else if (this.slitWidth < 130) label = '较宽';
            else label = '极宽';

            if (sliderValDisplay) sliderValDisplay.textContent = label + ` (${this.slitWidth}px)`;
            if (display) display.textContent = this.slitWidth.toFixed(1) + ' nm'; // Pseudo unit
            this.updateStats();
        };

        if (slider) {
            slider.addEventListener('input', updateSlit);
            // Initialize immediately
            setTimeout(updateSlit, 0);
        }

        // Buttons
        document.getElementById('fire-btn')?.addEventListener('click', () => {
            this.isFiring = !this.isFiring;
            const btn = document.getElementById('fire-btn');
            if (btn) btn.textContent = this.isFiring ? '停止发射' : '发射粒子流';
        });

        document.getElementById('clear-btn')?.addEventListener('click', () => {
            this.hits = [];
            this.particles = [];
        });
    }

    updateStats() {
        // Theoretical Spread (Diffraction Angle) estimation
        // theta ~ lambda / a
        // Delta p ~ h / Delta x
        const spreadDisplay = document.getElementById('spread-display');
        if (spreadDisplay) {
            const spreadInv = 1000 / Math.max(this.slitWidth, 1); // Avoid div by zero
            spreadDisplay.textContent = `~ ${spreadInv.toFixed(1)} units`;
        }
    }

    startFiring() {
        this.isFiring = true;
        const btn = document.getElementById('fire-btn');
        if (btn) btn.textContent = '停止发射';
    }

    spawnParticle() {
        // Spawn at left source
        const cy = this.height / 2;
        // Small spread at source mostly straight
        this.particles.push({
            x: 0,
            y: cy + (Math.random() - 0.5) * 10, // Slight source spread
            vx: this.particleSpeed,
            vy: 0,
            life: 1.0,
            color: `hsl(${Math.random() * 60 + 180}, 100%, 70%)` // Cyan to Blue
        });
    }

    // Single Slit Diffraction Distribution (Sinc^2)
    sampleDiffractionAngle() {
        // Rejection sampling for sinc(x)^2
        // Domain x in [-3pi, 3pi] covers main lobe and side lobes
        const range = 3 * Math.PI;
        let x, y;
        let attempts = 0;
        do {
            x = (Math.random() * 2 - 1) * range;
            y = Math.random();
            const sinc = x === 0 ? 1 : Math.sin(x) / x;
            if (y < sinc * sinc) break;
            attempts++;
        } while (attempts < 10);

        // Map x to angle theta
        // x = (pi * a / lambda) * sin(theta)
        // sin(theta) = x * lambda / (pi * a)
        // For visual effect, scalefactors tailored for canvas
        // Prevent div by zero
        const width = Math.max(this.slitWidth, 1);
        const sinTheta = (x * this.wavelength) / (Math.PI * width);
        return sinTheta * this.particleSpeed * 2.0; // Return vy component
    }

    updatePhysics() {
        if (this.isFiring) {
            this.spawnParticle();
            this.spawnParticle(); // Fire rate
        }

        const slitX = this.width * this.slitXRatio;
        const screenX = this.width * this.screenXRatio;
        const cy = this.height / 2;
        const slitTop = cy - this.slitWidth / 2;
        const slitBottom = cy + this.slitWidth / 2;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            // Move
            p.x += p.vx;
            p.y += p.vy;

            // Check Slit Interaction
            // If passing slit X plane
            if (p.x >= slitX && p.x - p.vx < slitX) {
                // Check if blocked
                if (p.y < slitTop || p.y > slitBottom) {
                    // Blocked
                    this.particles.splice(i, 1);
                    continue;
                } else {
                    // Passed -> Diffract!
                    // Position uncertainty (Slit Width) -> Momentum uncertainty (vy change)
                    p.vy += this.sampleDiffractionAngle();
                    // Add some randomness to x to prevent "lines"
                    p.vx *= 0.9 + Math.random() * 0.2;
                }
            }

            // Check Screen Collision
            if (p.x >= screenX) {
                // Hit screen
                this.hits.push({ y: p.y, age: 100 });
                this.particles.splice(i, 1);
                continue;
            }

            // Out of bounds
            if (p.x > this.width || p.y < 0 || p.y > this.height) {
                this.particles.splice(i, 1);
                continue;
            }
        }

        // Limit hits memory
        if (this.hits.length > 2000) {
            this.hits.splice(0, 100); // Remove oldest
        }
    }

    draw() {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;
        const cy = h / 2;

        // Clear
        ctx.fillStyle = '#0a0a0f'; // Dark background
        ctx.fillRect(0, 0, w, h);

        // Draw Experiment Setup
        const slitX = w * this.slitXRatio;
        const screenX = w * this.screenXRatio;

        // Slit Barriers
        ctx.fillStyle = '#334155'; // Wall color
        ctx.fillRect(slitX - 5, 0, 10, cy - this.slitWidth / 2); // Top Wall
        ctx.fillRect(slitX - 5, cy + this.slitWidth / 2, 10, h - (cy + this.slitWidth / 2)); // Bottom Wall

        // Glow effect for slit edges
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#22d3ee';
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(slitX - 5, cy - this.slitWidth / 2 - 2, 10, 2);
        ctx.fillRect(slitX - 5, cy + this.slitWidth / 2, 10, 2);
        ctx.shadowBlur = 0;

        // Screen
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(screenX, 0, 10, h);

        // Draw Particles
        for (const p of this.particles) {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw Hits / Pattern on Screen
        // We accumulate hits into bins to draw a nice curve
        const bins = new Array(100).fill(0);
        const binSize = h / 100;

        // Draw individual hits as glow
        ctx.globalCompositeOperation = 'screen';
        for (const hit of this.hits) {
            // Find bin for histogram
            const binIdx = Math.floor(hit.y / binSize);
            if (binIdx >= 0 && binIdx < 100) bins[binIdx]++;

            // Fade visual hit
            ctx.fillStyle = `rgba(34, 211, 238, ${hit.age / 300})`; // Fading cyan
            ctx.beginPath();
            ctx.arc(screenX + 5, hit.y, 3, 0, Math.PI * 2);
            ctx.fill();
            hit.age -= 0.5;
        }

        // Remove old hits
        this.hits = this.hits.filter(h => h.age > 0);

        // Draw Histogram Overlay
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = '#ec4899'; // Pink for momentum/diffraction pattern
        ctx.lineWidth = 2;
        ctx.beginPath();
        const maxBin = Math.max(...bins, 1);
        const scale = 100; // px width of histogram

        for (let i = 0; i < 100; i++) {
            const val = bins[i];
            const barLen = (val / maxBin) * scale;
            const y = i * binSize;
            if (i === 0) ctx.moveTo(screenX + 10 + barLen, y);
            else ctx.lineTo(screenX + 10 + barLen, y);
        }
        ctx.stroke();

        // Label
        ctx.fillStyle = '#ec4899';
        ctx.font = '12px Inter';
        ctx.fillText('衍射图样 (动量分布)', screenX + 20, 30);

        // Debug Overlay
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`P: ${this.particles.length} | W: ${this.width} | S: ${this.slitWidth} | Hits: ${this.hits.length}`, 10, 10);
    }

    animate() {
        this.updatePhysics();
        this.draw();
        this.animationId = requestAnimationFrame(() => this.animate());
    }
}

// Initial Launch
if (typeof DefaultContent !== 'undefined') {
    DefaultContent['uncertainty-principle'] = `# 实验：位置与动量的权衡
通过模拟**单缝衍射实验**，我们直观地看到了不确定性原理的威力。

### 实验原理
- **改变 Δx**：通过调节**狭缝宽度**，你正在精确限制粒子通过的位置范围 ($\\Delta x$)。
- **观察 Δp**：屏幕上的**衍射图样**展示了粒子的动量分布 ($\\Delta p$)。

### 试一试
1. 将狭缝调到**最宽**：粒子几乎直线通过，动量非常确定 ($\\Delta p$ 小)，但位置范围大 ($\\Delta x$ 大)。
2. 将狭缝**逐渐减小**：你会惊讶地发现，粒子并没有变"准"，反而在屏幕上散得更开了！
   - 限制位置 ($\\Delta x \\downarrow$) 强迫动量变得不确定 ($\\Delta p \\uparrow$)。

这就是量子力学的核心：**你不能同时完美地知道位置和动量。**`;
}

// Ensure DOM is fully ready
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure layout is calculated
    setTimeout(() => {
        new UncertaintySimulation();
    }, 100);
});
