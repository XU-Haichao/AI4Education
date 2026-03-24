/**
 * 量子计算：振幅放大（Grover 的二维旋转图像）
 *
 * 教学目标：突出“物理过程”
 * - Oracle：对目标态做相位翻转（反射）
 * - Diffuser：围绕平均值做镜像（反射）
 * - 两次反射 = 一次旋转：状态向量在二维子空间内朝目标态转动 -> 概率被放大
 *
 * 模型：唯一目标态（|w⟩），其余态合并为 |r⟩（与 |w⟩ 正交）
 * - sin θ = 1/√N，初态 |s⟩ 在二维平面中与 |r⟩ 夹角为 θ
 * - k 轮后：|ψ_k⟩ 的角度为 φ = (2k+1)θ
 * - 目标命中率：p(k) = sin²((2k+1)θ)
 *
 * 噪声：用概率混合的方式做“退相干”直觉（把分布向均匀抹平）
 */

class QuantumComputingAmplitudeAmplification {
    constructor() {
        this.canvas = document.getElementById('bloch-canvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');

        // Parameters
        this.qubits = 3; // 2..8
        this.N = 1 << this.qubits;
        this.theta = this.computeTheta(this.N);

        this.k = 0;
        this.kFloat = 0;

        this.noise = 0; // 0..0.30

        // Playback
        this.playing = false;
        this.playAccumulator = 0;
        this.stepInterval = 0.9; // seconds per iteration
        this.anim = null; // {startTs, duration, fromK, toK}

        // Stats
        this.shots = 0;
        this.hits = 0;
        this.lastShot = null; // {hit, p}

        // Pointer
        this.pointer = { x: 0, y: 0, inside: false };

        // Background
        this.time = 0;
        this.lastFrameTs = null;
        this.bgDots = [];

        this.init();
    }

    init() {
        this.cacheUI();
        this.resizeCanvas();
        this.bindEvents();

        this.updateDerived();
        this.updateUI();

        requestAnimationFrame((ts) => this.animate(ts));
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    cacheUI() {
        this.ui = {
            qubitsSlider: document.getElementById('qubits-slider'),
            spaceValue: document.getElementById('space-value'),

            kSlider: document.getElementById('k-slider'),
            kValue: document.getElementById('k-value'),

            noiseSlider: document.getElementById('noise-slider'),
            noiseValue: document.getElementById('noise-value'),

            resetBtn: document.getElementById('reset-btn'),
            playBtn: document.getElementById('play-btn'),
            stepBtn: document.getElementById('step-btn'),
            measureBtn: document.getElementById('measure-btn'),

            nDisplay: document.getElementById('n-display'),
            thetaDisplay: document.getElementById('theta-display'),
            koptDisplay: document.getElementById('kopt-display'),
            pDisplay: document.getElementById('p-display'),

            kDisplay: document.getElementById('k-display'),
            shots: document.getElementById('shots'),
            hits: document.getElementById('hits'),
            lastShot: document.getElementById('last-shot'),

            hintNote: document.getElementById('hint-note')
        };
    }

    bindEvents() {
        // Qubits
        if (this.ui.qubitsSlider) {
            this.ui.qubitsSlider.addEventListener('input', (e) => {
                const n = this.clampInt(parseInt(e.target.value, 10), 2, 8);
                if (n === this.qubits) return;
                this.setQubits(n);
            });
        }

        // k
        if (this.ui.kSlider) {
            this.ui.kSlider.addEventListener('input', (e) => {
                const k = this.clampInt(parseInt(e.target.value, 10), 0, this.kMax);
                this.setK(k, { animate: true });
            });
        }

        // Noise
        if (this.ui.noiseSlider) {
            this.ui.noiseSlider.addEventListener('input', (e) => {
                const pct = this.clampInt(parseInt(e.target.value, 10), 0, 30);
                this.noise = pct / 100;
                this.updateUI();
            });
        }

        // Buttons
        this.ui.resetBtn?.addEventListener('click', () => this.reset());
        this.ui.playBtn?.addEventListener('click', () => this.togglePlay());
        this.ui.stepBtn?.addEventListener('click', () => this.stepOnce());
        this.ui.measureBtn?.addEventListener('click', () => this.measureOnce());

        // Canvas click = measure
        const updatePointer = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.pointer.x = e.clientX - rect.left;
            this.pointer.y = e.clientY - rect.top;
            this.pointer.inside = this.pointer.x >= 0 && this.pointer.y >= 0 && this.pointer.x <= rect.width && this.pointer.y <= rect.height;
        };

        this.canvas.addEventListener('pointerenter', (e) => {
            updatePointer(e);
            this.pointer.inside = true;
        });

        this.canvas.addEventListener('pointerleave', () => {
            this.pointer.inside = false;
        });

        this.canvas.addEventListener('pointerdown', (e) => {
            updatePointer(e);
            if (!this.pointer.inside) return;
            this.measureOnce();
        });
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        const w = Math.max(1, Math.floor(rect.width));
        const h = Math.max(1, Math.floor(rect.height));

        this.canvas.width = Math.max(1, Math.floor(w * dpr));
        this.canvas.height = Math.max(1, Math.floor(h * dpr));
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';

        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.width = w;
        this.height = h;

        this.initBackgroundDots();
    }

    initBackgroundDots() {
        const density = this.width * this.height / 14000;
        const count = Math.floor(this.clamp(density, 50, 120));
        this.bgDots = [];
        for (let i = 0; i < count; i++) {
            this.bgDots.push({
                u: Math.random(),
                v: Math.random(),
                r: 0.6 + Math.random() * 1.6,
                phase: Math.random() * Math.PI * 2,
                speed: 0.4 + Math.random() * 1.0,
                hue: 245 + Math.random() * 90
            });
        }
    }

    setQubits(n) {
        this.qubits = this.clampInt(n, 2, 8);
        this.updateDerived();
        this.reset({ keepNoise: true, keepQubits: true });
    }

    updateDerived() {
        this.N = 1 << this.qubits;
        this.theta = this.computeTheta(this.N);

        // Keep k range short and demo-friendly
        const kOpt = this.recommendedK();
        this.kMax = this.clampInt(Math.max(6, 2 * kOpt + 4), 6, 40);
        if (this.k > this.kMax) this.k = this.kMax;
        if (this.kFloat > this.kMax) this.kFloat = this.kMax;

        if (this.ui.kSlider) {
            this.ui.kSlider.max = String(this.kMax);
        }
    }

    reset({ keepNoise, keepQubits } = {}) {
        this.playing = false;
        this.anim = null;
        this.playAccumulator = 0;

        this.k = 0;
        this.kFloat = 0;

        if (!keepNoise) this.noise = 0;
        if (!keepQubits) {
            this.qubits = 3;
            this.updateDerived();
        }

        this.shots = 0;
        this.hits = 0;
        this.lastShot = null;

        this.updateUI();
    }

    togglePlay() {
        this.playing = !this.playing;
        if (this.playing) {
            // If already at end, restart
            if (this.k >= this.kMax) this.setK(0, { animate: true });
        }
        this.updateUI();
    }

    stepOnce() {
        if (this.k >= this.kMax) return;
        this.playing = false;
        this.setK(this.k + 1, { animate: true });
        this.updateUI();
    }

    setK(k, { animate } = {}) {
        const next = this.clampInt(k, 0, this.kMax);
        if (next === this.k && !this.anim) return;

        if (animate) {
            this.anim = {
                startTs: performance.now(),
                duration: 520,
                fromK: this.kFloat,
                toK: next
            };
        } else {
            this.anim = null;
            this.kFloat = next;
        }

        this.k = next;
        this.updateUI();
    }

    measureOnce() {
        const p = this.pTarget(this.kFloat);
        const pNoisy = this.applyNoiseToProbability(p);
        const hit = Math.random() < pNoisy;

        this.shots += 1;
        if (hit) this.hits += 1;

        this.lastShot = { hit, p: pNoisy };
        this.updateUI();
    }

    computeTheta(N) {
        return Math.asin(1 / Math.sqrt(N));
    }

    recommendedK() {
        return Math.max(1, Math.floor(Math.PI / 4 * Math.sqrt(this.N)));
    }

    pTarget(k) {
        const phi = (2 * k + 1) * this.theta;
        const s = Math.sin(phi);
        return s * s;
    }

    applyNoiseToProbability(p) {
        if (this.noise <= 0) return p;
        const uniform = 1 / this.N;
        return (1 - this.noise) * p + this.noise * uniform;
    }

    animate(ts) {
        const dt = this.lastFrameTs ? Math.min(0.05, (ts - this.lastFrameTs) / 1000) : 0.016;
        this.lastFrameTs = ts;
        this.time += dt;

        // Playback pacing (discrete steps)
        if (this.playing && !this.anim) {
            this.playAccumulator += dt;
            if (this.playAccumulator >= this.stepInterval) {
                this.playAccumulator = 0;
                if (this.k >= this.kMax) {
                    this.playing = false;
                } else {
                    this.setK(this.k + 1, { animate: true });
                }
            }
        }

        // Animate kFloat
        if (this.anim) {
            const t = (ts - this.anim.startTs) / this.anim.duration;
            const u = this.easeInOutCubic(this.clamp(t, 0, 1));
            this.kFloat = this.anim.fromK + (this.anim.toK - this.anim.fromK) * u;
            if (t >= 1) {
                this.kFloat = this.anim.toK;
                this.anim = null;
            }
        } else {
            this.kFloat = this.k;
        }

        this.render();
        requestAnimationFrame((t2) => this.animate(t2));
    }

    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.drawBackground();

        const layout = this.getLayout();
        this.drawRotationDiagram(layout.circle);
        this.drawProbabilityBar(layout.bar);
        this.drawCaption(layout.caption);
    }

    getLayout() {
        const base = Math.min(this.width, this.height);
        const margin = Math.max(18, base * 0.06);
        const gap = Math.max(14, base * 0.05);

        const circleSize = Math.min(base * 0.62, this.width * 0.60);
        const circle = {
            cx: this.width * 0.36,
            cy: this.height * 0.50,
            r: Math.max(90, circleSize * 0.40)
        };

        const bar = {
            x: circle.cx + circle.r + gap,
            y: circle.cy - circle.r,
            w: Math.max(140, this.width - (circle.cx + circle.r + gap) - margin),
            h: circle.r * 2
        };

        const caption = {
            x: margin,
            y: margin,
            w: this.width - margin * 2
        };

        return { margin, gap, circle, bar, caption };
    }

    drawBackground() {
        const g = this.ctx.createRadialGradient(
            this.width * 0.5,
            this.height * 0.35,
            60,
            this.width * 0.5,
            this.height * 0.35,
            Math.max(this.width, this.height) * 0.85
        );
        g.addColorStop(0, 'rgba(168, 85, 247, 0.10)');
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        this.ctx.fillStyle = g;
        this.ctx.fillRect(0, 0, this.width, this.height);

        for (const d of this.bgDots) {
            const x = d.u * this.width;
            const y = d.v * this.height;
            const t = this.time * d.speed + d.phase;
            const a = 0.05 + 0.05 * Math.sin(t);
            this.ctx.fillStyle = `hsla(${d.hue}, 90%, 70%, ${a})`;
            this.ctx.beginPath();
            this.ctx.arc(x, y, d.r, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawRotationDiagram({ cx, cy, r }) {
        // Circle panel
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        this.roundRect(cx - r - 26, cy - r - 26, (r + 26) * 2, (r + 26) * 2, 16);
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // Circle
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
        this.ctx.stroke();

        // Axes: |r⟩ (horizontal) and |w⟩ (vertical)
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(cx - r, cy);
        this.ctx.lineTo(cx + r, cy);
        this.ctx.moveTo(cx, cy - r);
        this.ctx.lineTo(cx, cy + r);
        this.ctx.stroke();

        // Labels
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.70)';
        this.ctx.font = '12px Inter';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('|r⟩（其余态）', cx + 10, cy + r - 16);
        this.ctx.save();
        this.ctx.translate(cx - r + 14, cy - 12);
        this.ctx.rotate(-Math.PI / 2);
        this.ctx.fillText('|w⟩（目标态）', 0, 0);
        this.ctx.restore();

        // State vector angle φ = (2k+1)θ from |r⟩ axis toward |w⟩
        const phi = (2 * this.kFloat + 1) * this.theta;
        const vx = Math.cos(phi);
        const vy = Math.sin(phi);

        // Arrow
        const x2 = cx + vx * r * 0.92;
        const y2 = cy - vy * r * 0.92;

        const grad = this.ctx.createLinearGradient(cx, cy, x2, y2);
        grad.addColorStop(0, 'rgba(168, 85, 247, 0.25)');
        grad.addColorStop(1, 'rgba(168, 85, 247, 1)');

        this.ctx.strokeStyle = grad;
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();

        // Tip
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        this.ctx.shadowColor = 'rgba(168, 85, 247, 0.8)';
        this.ctx.shadowBlur = 18;
        this.ctx.beginPath();
        this.ctx.arc(x2, y2, 6, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;

        // Small arc showing θ (initial) and current φ
        const theta = this.theta;
        this.ctx.strokeStyle = 'rgba(250, 204, 21, 0.65)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, r * 0.22, 0, -theta, true);
        this.ctx.stroke();
        this.ctx.fillStyle = 'rgba(250, 204, 21, 0.85)';
        this.ctx.font = '12px Inter';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('θ', cx + r * 0.24, cy - r * 0.07);

        this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.55)';
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, r * 0.32, 0, -phi, true);
        this.ctx.stroke();
        this.ctx.fillStyle = 'rgba(59, 130, 246, 0.85)';
        this.ctx.fillText('φ', cx + r * 0.34, cy - r * 0.10);

        // Title
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        this.ctx.font = '700 14px Inter';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('二维子空间中的“旋转”', cx, cy - r - 18);

        this.ctx.restore();
    }

    drawProbabilityBar({ x, y, w, h }) {
        const pad = 18;
        const innerX = x;
        const innerY = y;
        const innerW = w;
        const innerH = h;

        this.ctx.save();
        this.roundRect(innerX, innerY, innerW, innerH, 16);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        const p = this.pTarget(this.kFloat);
        const pNoisy = this.applyNoiseToProbability(p);

        const barW = innerW - pad * 2;
        const barH = 16;
        const top = innerY + pad + 18;

        // Target bar
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        this.roundRect(innerX + pad, top, barW, barH, 10);
        this.ctx.fill();

        const fillW = barW * this.clamp(pNoisy, 0, 1);
        const g = this.ctx.createLinearGradient(innerX + pad, top, innerX + pad + barW, top);
        g.addColorStop(0, 'rgba(34, 197, 94, 0.65)');
        g.addColorStop(1, 'rgba(59, 130, 246, 0.75)');
        this.ctx.fillStyle = g;
        this.roundRect(innerX + pad, top, Math.max(2, fillW), barH, 10);
        this.ctx.fill();

        // Labels
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
        this.ctx.font = '12px Inter';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('目标命中率 p(k)', innerX + pad, top - 12);

        this.ctx.textAlign = 'right';
        this.ctx.fillText(`${this.formatPercent(pNoisy)}`, innerX + pad + barW, top + barH / 2);

        // Secondary: others
        const top2 = top + 42;
        const pOthers = 1 - pNoisy;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        this.roundRect(innerX + pad, top2, barW, barH, 10);
        this.ctx.fill();
        this.ctx.fillStyle = 'rgba(168, 85, 247, 0.55)';
        this.roundRect(innerX + pad, top2, Math.max(2, barW * this.clamp(pOthers, 0, 1)), barH, 10);
        this.ctx.fill();

        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('其余态合计', innerX + pad, top2 - 12);

        // Small note
        const kOpt = this.recommendedK();
        const noteY = innerY + innerH - pad - 12;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        this.ctx.font = '12px Inter';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`推荐 k*≈${kOpt}（唯一目标）`, innerX + pad, noteY);

        if (this.noise > 0) {
            this.ctx.textAlign = 'right';
            this.ctx.fillText(`噪声：${Math.round(this.noise * 100)}%`, innerX + innerW - pad, noteY);
        }

        this.ctx.restore();
    }

    drawCaption({ x, y, w }) {
        const p = this.applyNoiseToProbability(this.pTarget(this.kFloat));
        const kOpt = this.recommendedK();

        this.ctx.save();
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.90)';
        this.ctx.font = '700 16px Inter';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText('振幅放大：用干涉把概率推向目标', x, y);

        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.60)';
        this.ctx.font = '12px Inter';
        const line1 = `N=${this.N}，当前 k≈${this.kFloat.toFixed(1)}，目标命中率≈${this.formatPercent(p)}（推荐 k*≈${kOpt}）`;
        this.ctx.fillText(line1, x, y + 24);

        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        this.ctx.font = '12px Inter';
        const line2 = '操作：点“放大一次 / 自动运行”，再点“开箱测量”。做太多次会“转过头”。';
        this.ctx.fillText(line2, x, y + 44);

        this.ctx.restore();
    }

    updateUI() {
        // Basic values
        const nText = `N=${this.N}`;
        if (this.ui.spaceValue) this.ui.spaceValue.textContent = nText;
        if (this.ui.qubitsSlider) this.ui.qubitsSlider.value = String(this.qubits);

        if (this.ui.kSlider) this.ui.kSlider.value = String(this.k);
        if (this.ui.kValue) this.ui.kValue.textContent = String(this.k);

        if (this.ui.noiseSlider) this.ui.noiseSlider.value = String(Math.round(this.noise * 100));
        if (this.ui.noiseValue) this.ui.noiseValue.textContent = `${Math.round(this.noise * 100)}%`;

        // Result panel
        if (this.ui.nDisplay) this.ui.nDisplay.textContent = String(this.N);
        if (this.ui.thetaDisplay) this.ui.thetaDisplay.textContent = `${this.theta.toFixed(3)} rad`;
        if (this.ui.koptDisplay) this.ui.koptDisplay.textContent = String(this.recommendedK());

        const p = this.applyNoiseToProbability(this.pTarget(this.k));
        if (this.ui.pDisplay) this.ui.pDisplay.textContent = this.formatPercent(p);

        if (this.ui.kDisplay) this.ui.kDisplay.textContent = String(this.k);
        if (this.ui.shots) this.ui.shots.textContent = String(this.shots);
        if (this.ui.hits) this.ui.hits.textContent = String(this.hits);

        if (this.ui.lastShot) {
            this.ui.lastShot.classList.remove('hit', 'miss');
            if (!this.lastShot) {
                this.ui.lastShot.textContent = '—';
            } else if (this.lastShot.hit) {
                this.ui.lastShot.textContent = `✅ 命中（p≈${this.formatPercent(this.lastShot.p)}）`;
                this.ui.lastShot.classList.add('hit');
            } else {
                this.ui.lastShot.textContent = `❌ 未中（p≈${this.formatPercent(this.lastShot.p)}）`;
                this.ui.lastShot.classList.add('miss');
            }
        }

        // Hint note
        if (this.ui.hintNote) {
            const pNow = this.applyNoiseToProbability(this.pTarget(this.k));
            const kOpt = this.recommendedK();
            this.ui.hintNote.textContent = `当前：k=${this.k}，目标命中率≈${this.formatPercent(pNow)}；推荐 k*≈${kOpt}（做太多会转过头）。`;
        }

        // Play button label
        if (this.ui.playBtn) {
            this.ui.playBtn.textContent = this.playing ? '暂停' : '自动运行';
            this.ui.playBtn.classList.toggle('active', this.playing);
        }
    }

    roundRect(x, y, w, h, r) {
        const rr = Math.min(r, w / 2, h / 2);
        this.ctx.beginPath();
        this.ctx.moveTo(x + rr, y);
        this.ctx.arcTo(x + w, y, x + w, y + h, rr);
        this.ctx.arcTo(x + w, y + h, x, y + h, rr);
        this.ctx.arcTo(x, y + h, x, y, rr);
        this.ctx.arcTo(x, y, x + w, y, rr);
        this.ctx.closePath();
    }

    formatPercent(p) {
        const pct = this.clamp(p, 0, 1) * 100;
        if (pct >= 99.95) return '≈100%';
        if (pct >= 10) return `${pct.toFixed(1)}%`;
        if (pct >= 1) return `${pct.toFixed(2)}%`;
        return `${pct.toFixed(2)}%`;
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    clampInt(v, min, max) {
        return Math.max(min, Math.min(max, v | 0));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new QuantumComputingAmplitudeAmplification();
});

// 默认学习内容（更偏“物理过程”）
if (typeof DefaultContent !== 'undefined') {
    DefaultContent['quantum-computing'] = `# 量子计算：把“正确答案”变得更可能

想象你在 **N 个宝箱**里找 **1 个宝藏**：

- 经典做法：一个个试，平均要试很多次  
- 量子做法：不是“更快地翻箱子”，而是用 **干涉** 把概率逐步“搬运”到目标那一格

这页只做一件事：让你直观看到 **命中率 p** 是怎么被一步步放大的。

## 你会看到什么

- 点一次 **放大一次**：状态会向“目标”方向旋一点，命中率上升  
- 但放大不是无限增长：点太多次会 **转过头**，命中率又下降  
- 所以会出现一个 **推荐轮数 k***（在它附近更容易命中）

## 玩法建议（30 秒上手）

1. 先选一个 N（宝箱多一些更明显）  
2. 连点几次 **放大一次**，观察 **目标命中率 p(k)** 的变化  
3. 点 **开箱测量**：你会感受到“更可能”并不等于“必然”`;
}
