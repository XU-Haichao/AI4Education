/**
 * 量子纠缠：贝尔测试（CHSH）互动模拟
 *
 * 这个版本把“纠缠=结果瞬间关联”的直觉，升级成可玩的实验台：
 * - 选择模型：量子纠缠 / 局域隐变量 / 独立随机
 * - 调四个测量角 a0,a1,b0,b1，跑 CHSH 实验
 * - 用“可见度 V”模拟噪声（Werner 混合的直觉版本）
 * - 看 |S| 能否超过经典上限 2
 */

class QuantumEntanglementSimulation {
    constructor() {
        this.canvas = document.getElementById('entanglement-canvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');

        // UI state
        this.model = 'quantum'; // 'quantum' | 'lhv' | 'random'
        this.preset = 'quantum-optimal'; // 'quantum-optimal' | 'classic-optimal' | 'parallel' | 'custom'

        // Angles (deg)
        this.a0Deg = 0;
        this.a1Deg = 90;
        this.b0Deg = 45;
        this.b1Deg = 135;

        // Quantum noise (visibility)
        this.visibility = 1.0;

        // Auto run
        this.rate = 12; // trials per second
        this.autoRunning = false;

        // Stats & caches
        this.resetStats();

        // Animation state
        this.time = 0;
        this.lastFrameTs = null;
        this.spawnAccumulator = 0;
        this.pairs = [];
        this.effects = [];

        // Background particles
        this.bgDots = [];

        this.init();
    }

    init() {
        this.cacheUI();
        this.resizeCanvas();
        this.bindEvents();
        this.applyPreset(this.preset, { reset: true });
        this.updateUI();

        requestAnimationFrame((ts) => this.animate(ts));
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    cacheUI() {
        this.ui = {
            presetValue: document.getElementById('preset-value'),
            a0Slider: document.getElementById('a0-slider'),
            a1Slider: document.getElementById('a1-slider'),
            b0Slider: document.getElementById('b0-slider'),
            b1Slider: document.getElementById('b1-slider'),
            a0Value: document.getElementById('a0-value'),
            a1Value: document.getElementById('a1-value'),
            b0Value: document.getElementById('b0-value'),
            b1Value: document.getElementById('b1-value'),
            visibilitySlider: document.getElementById('visibility-slider'),
            visibilityValue: document.getElementById('visibility-value'),
            rateSlider: document.getElementById('rate-slider'),
            rateValue: document.getElementById('rate-value'),
            resetBtn: document.getElementById('reset-btn'),
            autoBtn: document.getElementById('auto-btn'),
            measureBtn: document.getElementById('measure-btn'),

            stateA: document.getElementById('state-a'),
            stateB: document.getElementById('state-b'),
            settingA: document.getElementById('setting-a'),
            settingB: document.getElementById('setting-b'),
            roundIndicator: document.getElementById('round-indicator'),
            roundSymbol: document.getElementById('round-symbol'),
            roundText: document.getElementById('round-text'),

            trialCount: document.getElementById('trial-count'),
            winRate: document.getElementById('win-rate'),
            chshValue: document.getElementById('chsh-value'),
            bellVerdict: document.getElementById('bell-verdict')
        };
    }

    bindEvents() {
        // Model buttons
        document.querySelectorAll('.preset-btn[data-model]').forEach((btn) => {
            btn.addEventListener('click', () => {
                this.setModel(btn.dataset.model);
            });
        });

        // Preset buttons
        document.querySelectorAll('.preset-btn[data-preset]').forEach((btn) => {
            btn.addEventListener('click', () => {
                this.applyPreset(btn.dataset.preset, { reset: true });
            });
        });

        // Angle sliders
        this.bindAngleSlider(this.ui.a0Slider, (v) => { this.a0Deg = v; }, () => this.markCustomAndReset());
        this.bindAngleSlider(this.ui.a1Slider, (v) => { this.a1Deg = v; }, () => this.markCustomAndReset());
        this.bindAngleSlider(this.ui.b0Slider, (v) => { this.b0Deg = v; }, () => this.markCustomAndReset());
        this.bindAngleSlider(this.ui.b1Slider, (v) => { this.b1Deg = v; }, () => this.markCustomAndReset());

        // Visibility
        if (this.ui.visibilitySlider) {
            this.ui.visibilitySlider.addEventListener('input', (e) => {
                this.visibility = this.clamp(parseFloat(e.target.value), 0, 1);
                this.markCustom();
                this.updateUI();
            });
            this.ui.visibilitySlider.addEventListener('change', () => this.resetExperiment({ preserveAuto: true }));
        }

        // Auto rate
        if (this.ui.rateSlider) {
            this.ui.rateSlider.addEventListener('input', (e) => {
                this.rate = Math.max(1, Math.floor(parseFloat(e.target.value)));
                this.updateUI();
            });
        }

        // Buttons
        this.ui.resetBtn?.addEventListener('click', () => this.resetExperiment({ preserveAuto: false }));
        this.ui.measureBtn?.addEventListener('click', () => this.spawnPair({ immediateCollapse: false }));
        this.ui.autoBtn?.addEventListener('click', () => this.toggleAuto());

        // Bonus: click canvas to spawn a pair
        this.canvas.addEventListener('pointerdown', (e) => {
            if (this.autoRunning) return;
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height) {
                this.spawnPair({ immediateCollapse: false });
            }
        });
    }

    bindAngleSlider(sliderEl, onValue, onCommit) {
        if (!sliderEl) return;

        sliderEl.addEventListener('input', (e) => {
            const v = this.normalizeDeg(parseFloat(e.target.value));
            onValue(v);
            this.markCustom();
            this.updateUI();
        });

        sliderEl.addEventListener('change', () => {
            onCommit?.();
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

        // Reset transform to avoid scale accumulation
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        this.width = w;
        this.height = h;
        this.centerX = w / 2;
        this.centerY = h / 2;

        this.layout = this.getLayout();
        this.initBackgroundDots();
    }

    initBackgroundDots() {
        const count = Math.floor(this.clamp(this.width * this.height / 12000, 50, 140));
        this.bgDots = [];
        for (let i = 0; i < count; i++) {
            this.bgDots.push({
                u: Math.random(),
                v: Math.random(),
                r: 0.6 + Math.random() * 1.6,
                phase: Math.random() * Math.PI * 2,
                speed: 0.5 + Math.random() * 1.2,
                hue: 240 + Math.random() * 90
            });
        }
    }

    getLayout() {
        const base = Math.min(this.width, this.height);
        const margin = Math.max(16, base * 0.06);

        const stationRadius = this.clamp(base * 0.11, 38, 62);
        let stationOffsetX = Math.min(this.width * 0.34, 320);
        stationOffsetX = Math.max(stationOffsetX, stationRadius * 2.2);
        stationOffsetX = Math.min(stationOffsetX, this.centerX - margin);

        const leftX = this.centerX - stationOffsetX;
        const rightX = this.centerX + stationOffsetX;

        const analyzerLen = stationRadius * 0.95;
        const particleR = this.clamp(base * 0.01, 3.0, 6.0);

        const meterWidth = this.clamp(this.width * 0.5, 220, 420);
        const meterHeight = 10;
        const meterX = this.centerX - meterWidth / 2;
        const meterY = this.height - margin - 18;

        return {
            margin,
            stationRadius,
            analyzerLen,
            particleR,
            leftX,
            rightX,
            y: this.centerY,
            meter: { x: meterX, y: meterY, w: meterWidth, h: meterHeight }
        };
    }

    setModel(model) {
        if (!model) return;
        this.model = model;
        this.resetExperiment({ preserveAuto: true });
        this.updateUI();
    }

    applyPreset(preset, { reset } = { reset: true }) {
        if (!preset) return;
        this.preset = preset;

        if (preset === 'quantum-optimal') {
            // Near Tsirelson bound for singlet-like correlations
            this.a0Deg = 0;
            this.a1Deg = 90;
            this.b0Deg = 45;
            this.b1Deg = 135; // = -45°
        } else if (preset === 'classic-optimal') {
            // Close to the classical boundary |S|≈2 with distinct settings
            this.a0Deg = 0;
            this.a1Deg = 24;
            this.b0Deg = 45;
            this.b1Deg = 135;
        } else if (preset === 'parallel') {
            // Same direction: strong correlation but no Bell violation
            this.a0Deg = 0;
            this.a1Deg = 0;
            this.b0Deg = 0;
            this.b1Deg = 0;
        } else {
            // custom: keep current
        }

        if (reset) this.resetExperiment({ preserveAuto: true });
        this.updateUI();
    }

    markCustom() {
        if (this.preset !== 'custom') {
            this.preset = 'custom';
        }
    }

    markCustomAndReset() {
        this.markCustom();
        this.resetExperiment({ preserveAuto: true });
    }

    resetStats() {
        this.trialCount = 0;
        this.winCount = 0;

        // For each (x,y) in {0,1}x{0,1}: count and Σ(A·B)
        this.bell = [
            { n: 0, sum: 0 }, // 00
            { n: 0, sum: 0 }, // 01
            { n: 0, sum: 0 }, // 10
            { n: 0, sum: 0 }  // 11
        ];

        this.measuredChshAbs = null;
        this.theoryChshAbs = this.computeTheoryChshAbs();
        this.lastRound = null;
    }

    resetExperiment({ preserveAuto }) {
        if (!preserveAuto) this.autoRunning = false;
        this.spawnAccumulator = 0;
        this.pairs = [];
        this.effects = [];
        this.resetStats();

        // Reset result display
        this.setParticleResult('A', null);
        this.setParticleResult('B', null);
        if (this.ui.settingA) this.ui.settingA.textContent = 'Alice';
        if (this.ui.settingB) this.ui.settingB.textContent = 'Bob';

        this.setRoundIndicator({ state: 'idle', text: '等待发射' });

        this.updateUI();
    }

    toggleAuto() {
        this.autoRunning = !this.autoRunning;
        this.spawnAccumulator = 0;
        this.updateUI();

        // A little kick so users see something immediately
        if (this.autoRunning && this.pairs.length === 0) {
            this.spawnPair({ immediateCollapse: false });
        }
    }

    spawnPair({ immediateCollapse } = { immediateCollapse: false }) {
        const x = Math.random() < 0.5 ? 0 : 1;
        const y = Math.random() < 0.5 ? 0 : 1;

        const thetaA = this.degToRad(x === 0 ? this.a0Deg : this.a1Deg);
        const thetaB = this.degToRad(y === 0 ? this.b0Deg : this.b1Deg);

        const { a, b } = this.sampleOutcomes(thetaA, thetaB);
        const ab = a * b;

        // Record stats
        this.trialCount++;
        const idx = x * 2 + y;
        this.bell[idx].n++;
        this.bell[idx].sum += ab;

        // CHSH game win condition: AB = +1 unless (x,y)=(1,1), then AB=-1
        const target = (x === 1 && y === 1) ? -1 : 1;
        const isWin = ab === target;
        if (isWin) this.winCount++;

        this.lastRound = { x, y, a, b, ab, target, isWin, thetaA, thetaB };
        this.updateChshCache();
        this.updateUI();

        const duration = immediateCollapse ? 0.01 : this.clamp(0.9 - this.rate * 0.01, 0.22, 0.9);
        const pair = {
            startTime: this.time,
            duration,
            x,
            y,
            thetaA,
            thetaB,
            a,
            b,
            collapsed: false,
            phase: Math.random() * Math.PI * 2
        };
        this.pairs.push(pair);

        const maxPairs = 40;
        if (this.pairs.length > maxPairs) {
            this.pairs.splice(0, this.pairs.length - maxPairs);
        }
    }

    sampleOutcomes(thetaA, thetaB) {
        // Outcomes are ±1, unbiased. Correlation is set by model.
        if (this.model === 'quantum') {
            const E = this.clamp(-this.visibility * Math.cos(thetaA - thetaB), -1, 1);
            const a = Math.random() < 0.5 ? 1 : -1;
            const pSame = (1 + E) / 2;
            const b = Math.random() < pSame ? a : -a;
            return { a, b };
        }

        if (this.model === 'lhv') {
            // Shared hidden angle λ, local deterministic response sign(cos(θ-λ))
            // This produces a *linear* correlation vs. Δθ and never violates |S|>2.
            const lambda = Math.random() * Math.PI * 2;
            const a = this.signNonZero(Math.cos(thetaA - lambda));
            const b = -this.signNonZero(Math.cos(thetaB - lambda));
            return { a, b };
        }

        // random / separable
        return {
            a: Math.random() < 0.5 ? 1 : -1,
            b: Math.random() < 0.5 ? 1 : -1
        };
    }

    updateChshCache() {
        const E = [];
        for (let i = 0; i < 4; i++) {
            if (this.bell[i].n === 0) {
                this.measuredChshAbs = null;
                return;
            }
            E[i] = this.bell[i].sum / this.bell[i].n;
        }
        const S = E[0] + E[1] + E[2] - E[3];
        this.measuredChshAbs = Math.abs(S);
    }

    computeTheoryChshAbs() {
        const e = (thetaA, thetaB) => {
            if (this.model === 'quantum') {
                return -this.visibility * Math.cos(thetaA - thetaB);
            }
            if (this.model === 'lhv') {
                // Expected correlation for the sign(cos) hidden-variable model
                let delta = Math.abs(thetaA - thetaB);
                delta = this.clamp(delta, 0, Math.PI);
                return -1 + (2 * delta) / Math.PI;
            }
            return 0;
        };

        const a0 = this.degToRad(this.a0Deg);
        const a1 = this.degToRad(this.a1Deg);
        const b0 = this.degToRad(this.b0Deg);
        const b1 = this.degToRad(this.b1Deg);

        const E00 = e(a0, b0);
        const E01 = e(a0, b1);
        const E10 = e(a1, b0);
        const E11 = e(a1, b1);

        const S = E00 + E01 + E10 - E11;
        return Math.abs(S);
    }

    updateUI() {
        // Buttons active states
        document.querySelectorAll('.preset-btn[data-model]').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.model === this.model);
        });

        document.querySelectorAll('.preset-btn[data-preset]').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.preset === this.preset);
        });

        // Preset label
        if (this.ui.presetValue) {
            const label = this.preset === 'quantum-optimal' ? '量子最优'
                : this.preset === 'classic-optimal' ? '经典边界'
                    : this.preset === 'parallel' ? '同向'
                        : '自定义';
            this.ui.presetValue.textContent = label;
        }

        // Sliders & labels
        this.setSliderAndText(this.ui.a0Slider, this.ui.a0Value, this.a0Deg, (v) => `${v.toFixed(0)}°`);
        this.setSliderAndText(this.ui.a1Slider, this.ui.a1Value, this.a1Deg, (v) => `${v.toFixed(0)}°`);
        this.setSliderAndText(this.ui.b0Slider, this.ui.b0Value, this.b0Deg, (v) => `${v.toFixed(0)}°`);
        this.setSliderAndText(this.ui.b1Slider, this.ui.b1Value, this.b1Deg, (v) => `${v.toFixed(0)}°`);

        // Visibility (disabled for non-quantum)
        if (this.ui.visibilitySlider) {
            this.ui.visibilitySlider.disabled = this.model !== 'quantum';
        }
        if (this.ui.visibilitySlider) this.ui.visibilitySlider.value = String(this.visibility);
        if (this.ui.visibilityValue) this.ui.visibilityValue.textContent = this.model === 'quantum' ? this.visibility.toFixed(2) : '—';

        // Rate
        if (this.ui.rateSlider) this.ui.rateSlider.value = String(this.rate);
        if (this.ui.rateValue) this.ui.rateValue.textContent = `${this.rate} 次/秒`;

        // Auto button
        if (this.ui.autoBtn) {
            this.ui.autoBtn.classList.toggle('active', this.autoRunning);
            this.ui.autoBtn.textContent = this.autoRunning ? '停止' : '自动运行';
        }

        // Stats
        if (this.ui.trialCount) this.ui.trialCount.textContent = String(this.trialCount);
        if (this.ui.winRate) {
            this.ui.winRate.textContent = this.trialCount > 0 ? `${(this.winCount / this.trialCount * 100).toFixed(1)}%` : '-';
        }

        // Recompute theory (cheap)
        this.theoryChshAbs = this.computeTheoryChshAbs();

        if (this.ui.chshValue) {
            this.ui.chshValue.textContent = this.measuredChshAbs != null ? this.measuredChshAbs.toFixed(3) : '-';
        }

        if (this.ui.bellVerdict) {
            if (this.measuredChshAbs == null) {
                this.ui.bellVerdict.textContent = '-';
                this.ui.bellVerdict.style.color = 'var(--color-text-muted)';
            } else if (this.measuredChshAbs > 2.0) {
                this.ui.bellVerdict.textContent = '违反';
                this.ui.bellVerdict.style.color = 'var(--color-success)';
            } else {
                this.ui.bellVerdict.textContent = '未违反';
                this.ui.bellVerdict.style.color = 'var(--color-text-secondary)';
            }
        }
    }

    setSliderAndText(sliderEl, textEl, value, format) {
        if (sliderEl) sliderEl.value = String(value);
        if (textEl) textEl.textContent = format(value);
    }

    setParticleResult(which, outcome) {
        const el = which === 'A' ? this.ui.stateA : this.ui.stateB;
        if (!el) return;

        if (outcome == null) {
            el.textContent = '?';
            el.className = 'particle-state';
            return;
        }

        el.textContent = outcome === 1 ? '↑' : '↓';
        el.className = 'particle-state ' + (outcome === 1 ? 'up' : 'down');
    }

    setRoundIndicator({ state, text }) {
        if (!this.ui.roundIndicator) return;
        this.ui.roundIndicator.classList.remove('win', 'lose');

        if (state === 'win') this.ui.roundIndicator.classList.add('win');
        if (state === 'lose') this.ui.roundIndicator.classList.add('lose');

        if (this.ui.roundSymbol) {
            this.ui.roundSymbol.textContent = state === 'win' ? '✓' : state === 'lose' ? '×' : '⟷';
        }
        if (this.ui.roundText) this.ui.roundText.textContent = text ?? '';
    }

    animate(ts) {
        if (this.lastFrameTs == null) this.lastFrameTs = ts;
        const dt = this.clamp((ts - this.lastFrameTs) / 1000, 0, 0.05);
        this.lastFrameTs = ts;
        this.time += dt;

        if (this.autoRunning) {
            this.spawnAccumulator += dt * this.rate;
            while (this.spawnAccumulator >= 1) {
                this.spawnAccumulator -= 1;
                this.spawnPair({ immediateCollapse: false });
            }
        }

        // Collapse & clean up pairs
        for (const pair of this.pairs) {
            const age = this.time - pair.startTime;
            if (!pair.collapsed && age >= pair.duration) {
                this.onPairCollapse(pair);
            }
        }
        this.pairs = this.pairs.filter((p) => (this.time - p.startTime) <= p.duration + 0.6);

        // Clean up effects
        this.effects = this.effects.filter((fx) => (this.time - fx.t0) <= fx.duration);

        this.render();
        requestAnimationFrame((t) => this.animate(t));
    }

    onPairCollapse(pair) {
        pair.collapsed = true;

        // UI update from the last round (this pair)
        this.setParticleResult('A', pair.a);
        this.setParticleResult('B', pair.b);

        const aLabel = pair.x === 0 ? 'a₀' : 'a₁';
        const bLabel = pair.y === 0 ? 'b₀' : 'b₁';
        if (this.ui.settingA) this.ui.settingA.textContent = `Alice · ${aLabel}`;
        if (this.ui.settingB) this.ui.settingB.textContent = `Bob · ${bLabel}`;

        const target = (pair.x === 1 && pair.y === 1) ? -1 : 1;
        const isWin = pair.a * pair.b === target;
        this.setRoundIndicator({
            state: isWin ? 'win' : 'lose',
            text: `回合：A${pair.x} vs B${pair.y}（目标 AB=${target === 1 ? '+1' : '−1'}）`
        });

        // Flash effects
        const { leftX, rightX, y } = this.layout;
        this.effects.push({ t0: this.time, duration: 0.35, x: leftX, y, color: isWin ? 'rgba(16,185,129,0.9)' : 'rgba(239,68,68,0.9)' });
        this.effects.push({ t0: this.time, duration: 0.35, x: rightX, y, color: isWin ? 'rgba(16,185,129,0.9)' : 'rgba(239,68,68,0.9)' });
    }

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        this.drawBackground();
        this.drawStations();
        this.drawPairs();
        this.drawEffects();
        this.drawMeter();
        this.drawHud();
    }

    drawBackground() {
        const ctx = this.ctx;
        const base = Math.min(this.width, this.height);

        // Soft vignette + quantum glow
        const g = ctx.createRadialGradient(this.centerX, this.centerY, base * 0.05, this.centerX, this.centerY, base * 0.7);
        g.addColorStop(0, 'rgba(168, 85, 247, 0.10)');
        g.addColorStop(0.5, 'rgba(99, 102, 241, 0.05)');
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, this.width, this.height);

        // Twinkling dots
        for (const d of this.bgDots) {
            const x = d.u * this.width;
            const y = d.v * this.height;
            const tw = 0.35 + 0.35 * Math.sin(this.time * d.speed + d.phase);
            ctx.fillStyle = `hsla(${d.hue}, 80%, 70%, ${0.12 + tw * 0.25})`;
            ctx.beginPath();
            ctx.arc(x, y, d.r, 0, Math.PI * 2);
            ctx.fill();
        }

        // Center line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 1;
        ctx.setLineDash([8, 10]);
        ctx.beginPath();
        ctx.moveTo(this.centerX, 16);
        ctx.lineTo(this.centerX, this.height - 16);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    drawStations() {
        const ctx = this.ctx;
        const { leftX, rightX, y, stationRadius, analyzerLen } = this.layout;

        // Source
        ctx.save();
        const srcR = 14;
        const glow = ctx.createRadialGradient(this.centerX, y, 0, this.centerX, y, srcR * 4);
        glow.addColorStop(0, 'rgba(168, 85, 247, 0.35)');
        glow.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(this.centerX, y, srcR * 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
        ctx.beginPath();
        ctx.arc(this.centerX, y, srcR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Stations
        this.drawStation(leftX, y, stationRadius, analyzerLen, 'Alice');
        this.drawStation(rightX, y, stationRadius, analyzerLen, 'Bob');
    }

    drawStation(x, y, r, len, label) {
        const ctx = this.ctx;

        // Base ring
        ctx.save();
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();

        // Inner fill
        const fill = ctx.createRadialGradient(x, y, 0, x, y, r);
        fill.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
        fill.addColorStop(1, 'rgba(255, 255, 255, 0.015)');
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.arc(x, y, r - 2, 0, Math.PI * 2);
        ctx.fill();

        // Analyzers (two settings)
        const isAlice = label === 'Alice';
        const a0 = this.degToCanvasRad(isAlice ? this.a0Deg : this.b0Deg);
        const a1 = this.degToCanvasRad(isAlice ? this.a1Deg : this.b1Deg);

        // Highlight the last used setting if available
        const activeIdx = this.lastRound ? (isAlice ? this.lastRound.x : this.lastRound.y) : null;

        this.drawAnalyzerLine(x, y, len, a0, activeIdx === 0);
        this.drawAnalyzerLine(x, y, len, a1, activeIdx === 1);

        // Labels
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.font = 'bold 14px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(label, x, y - r - 10);

        ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
        ctx.font = '12px Inter';
        ctx.textBaseline = 'top';
        const s0 = isAlice ? `a₀ ${this.a0Deg.toFixed(0)}°` : `b₀ ${this.b0Deg.toFixed(0)}°`;
        const s1 = isAlice ? `a₁ ${this.a1Deg.toFixed(0)}°` : `b₁ ${this.b1Deg.toFixed(0)}°`;
        ctx.fillText(`${s0}  |  ${s1}`, x, y + r + 10);

        ctx.restore();
    }

    drawAnalyzerLine(x, y, len, angleRad, active) {
        const ctx = this.ctx;
        const dx = Math.cos(angleRad) * len;
        const dy = Math.sin(angleRad) * len;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineWidth = active ? 4 : 2;
        ctx.strokeStyle = active ? 'rgba(34, 211, 238, 0.95)' : 'rgba(255, 255, 255, 0.18)';
        ctx.shadowColor = active ? 'rgba(34, 211, 238, 0.7)' : 'transparent';
        ctx.shadowBlur = active ? 10 : 0;
        ctx.beginPath();
        ctx.moveTo(x - dx, y - dy);
        ctx.lineTo(x + dx, y + dy);
        ctx.stroke();
        ctx.restore();
    }

    drawPairs() {
        const ctx = this.ctx;
        const { leftX, rightX, y, particleR } = this.layout;

        // Draw only the most recent few entanglement threads for performance
        const maxThreads = 12;
        const startIdx = Math.max(0, this.pairs.length - maxThreads);

        for (let i = startIdx; i < this.pairs.length; i++) {
            const pair = this.pairs[i];
            const age = this.time - pair.startTime;
            const t = this.clamp(age / pair.duration, 0, 1);
            const p = this.easeInOutCubic(t);

            const wobble = (1 - p) * 10;
            const yA = y + Math.sin(this.time * 6 + pair.phase) * wobble;
            const yB = y + Math.sin(this.time * 6 + pair.phase + 1.7) * wobble;
            const xA = this.centerX + (leftX - this.centerX) * p;
            const xB = this.centerX + (rightX - this.centerX) * p;

            // Entanglement thread
            const alpha = this.model === 'quantum' ? 0.22 : this.model === 'lhv' ? 0.14 : 0.06;
            this.drawThread(xA, yA, xB, yB, pair.phase, alpha * (1 - 0.25 * p));

            // Particles
            const reveal = pair.collapsed ? 1 : p * 0.3;
            const colA = pair.collapsed ? (pair.a === 1 ? 'rgba(59, 130, 246,' : 'rgba(236, 72, 153,') : 'rgba(168, 85, 247,';
            const colB = pair.collapsed ? (pair.b === 1 ? 'rgba(59, 130, 246,' : 'rgba(236, 72, 153,') : 'rgba(168, 85, 247,';
            this.drawParticle(xA, yA, particleR, `${colA} ${0.85 * reveal})`);
            this.drawParticle(xB, yB, particleR, `${colB} ${0.85 * reveal})`);
        }
    }

    drawThread(x1, y1, x2, y2, phase, alpha) {
        const ctx = this.ctx;
        const segments = 22;
        const amp = 10;
        const hueBase = 265;
        ctx.save();
        ctx.strokeStyle = `hsla(${hueBase}, 80%, 70%, ${alpha})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const x = x1 + (x2 - x1) * t;
            const yLerp = y1 + (y2 - y1) * t;
            const w = Math.sin(t * Math.PI * 2 * 2 + this.time * 7 + phase) * amp * (1 - Math.abs(t - 0.5) * 1.6);
            const y = yLerp + w;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
    }

    drawParticle(x, y, r, color) {
        const ctx = this.ctx;
        ctx.save();
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    drawEffects() {
        const ctx = this.ctx;
        for (const fx of this.effects) {
            const age = this.time - fx.t0;
            const t = this.clamp(age / fx.duration, 0, 1);
            const r = 6 + t * 46;
            const a = (1 - t) * 0.35;
            ctx.save();
            ctx.strokeStyle = fx.color.replace(/0\.9\)/, `${a})`);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    drawMeter() {
        const ctx = this.ctx;
        const { x, y, w, h } = this.layout.meter;

        const maxS = 2 * Math.sqrt(2);
        const classical = 2.0;

        const measured = this.measuredChshAbs ?? 0;
        const theory = this.theoryChshAbs ?? 0;

        // Track
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.beginPath();
        this.pathRoundRect(ctx, x, y, w, h, 6);
        ctx.fill();

        // Fill (measured)
        const fillW = w * this.clamp(measured / maxS, 0, 1);
        const grad = ctx.createLinearGradient(x, 0, x + w, 0);
        grad.addColorStop(0, 'rgba(59, 130, 246, 0.65)');
        grad.addColorStop(0.5, 'rgba(168, 85, 247, 0.65)');
        grad.addColorStop(1, 'rgba(236, 72, 153, 0.65)');
        ctx.fillStyle = grad;
        if (fillW > 0.5) {
            ctx.beginPath();
            this.pathRoundRect(ctx, x, y, fillW, h, 6);
            ctx.fill();
        }

        // Classical bound marker
        const classicX = x + w * (classical / maxS);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(classicX, y - 6);
        ctx.lineTo(classicX, y + h + 6);
        ctx.stroke();

        // Theory marker (dotted)
        const theoryX = x + w * this.clamp(theory / maxS, 0, 1);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(theoryX, y - 8);
        ctx.lineTo(theoryX, y + h + 8);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.font = '12px Inter';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText('CHSH |S|（实测填充 / 理论虚线 / 经典=2）', x, y - 10);

        ctx.restore();
    }

    drawHud() {
        const ctx = this.ctx;
        const margin = this.layout.margin;

        const modelText = this.model === 'quantum' ? '量子纠缠'
            : this.model === 'lhv' ? '局域隐变量'
                : '独立随机';

        const sText = this.measuredChshAbs == null ? '—' : this.measuredChshAbs.toFixed(3);
        const theoText = this.theoryChshAbs.toFixed(3);

        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        this.pathRoundRect(ctx, margin, margin, 240, 56, 12);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.font = 'bold 13px Inter';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`${modelText}${this.model === 'quantum' ? ` · V=${this.visibility.toFixed(2)}` : ''}`, margin + 12, margin + 10);

        ctx.fillStyle = 'rgba(148, 163, 184, 0.95)';
        ctx.font = '12px Inter';
        ctx.fillText(`|S| 实测：${sText}   理论：${theoText}`, margin + 12, margin + 30);
        ctx.restore();
    }

    // Helpers
    clamp(v, min, max) {
        return Math.min(max, Math.max(min, v));
    }

    degToRad(deg) {
        return (deg * Math.PI) / 180;
    }

    degToCanvasRad(deg) {
        // 0° -> up, 90° -> right (canvas y is downward)
        return this.degToRad(deg - 90);
    }

    normalizeDeg(deg) {
        // Keep in [0,180]
        if (!Number.isFinite(deg)) return 0;
        return this.clamp(deg, 0, 180);
    }

    signNonZero(x) {
        return x >= 0 ? 1 : -1;
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    pathRoundRect(ctx, x, y, w, h, r) {
        const rr = Math.max(0, Math.min(r, w / 2, h / 2));
        if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(x, y, w, h, rr);
            return;
        }

        ctx.moveTo(x + rr, y);
        ctx.arcTo(x + w, y, x + w, y + h, rr);
        ctx.arcTo(x + w, y + h, x, y + h, rr);
        ctx.arcTo(x, y + h, x, y, rr);
        ctx.arcTo(x, y, x + w, y, rr);
        ctx.closePath();
    }
}

// 初始化模拟
document.addEventListener('DOMContentLoaded', () => {
    new QuantumEntanglementSimulation();
});

// 默认学习内容
if (typeof DefaultContent !== 'undefined') {
    DefaultContent['quantum-entanglement'] = `# 量子纠缠：贝尔测试（CHSH）

> 爱因斯坦把纠缠叫做“超距作用的幽灵”。  
> 贝尔不等式把这种“幽灵”变成了**可以做实验验证的数字**。

## 1. 这页在做什么？

你正在操作一个简化的 **Bell 实验台**：
- 中间发射一对纠缠粒子（分别到 Alice / Bob）
- Alice 与 Bob 各有两种测量设置：\\(a_0,a_1\\) 与 \\(b_0,b_1\\)
- 每次发射都会随机抽取一个回合 \\((x,y)\\in\\{0,1\\}^2\\)，并输出 \\(A,B\\in\\{+1,-1\\}\\)
- 我们统计四种组合下的相关性 \\(E(a_x,b_y)=\\langle AB\\rangle\\)，计算 **CHSH 参数**：

$$S = E(a_0,b_0)+E(a_0,b_1)+E(a_1,b_0)-E(a_1,b_1)$$

经典的“局域隐变量理论”要求：

$$|S|\\le 2$$

而量子力学允许达到：

$$|S|\\le 2\\sqrt{2}\\approx 2.828$$

## 2. 操作指南（建议玩法）

1. 选 **量子纠缠**，点击 **量子最优**，保持 \\(V=1\\)，开启 **自动运行**  
   你会看到 \\(|S|\\) 逐步逼近 \\(\\approx 2.8\\)，出现“违反”判定。
2. 不改角度，切到 **局域隐变量**  
   你会发现 \\(|S|\\) 再怎么跑也不会超过 2。
3. 回到 **量子纠缠**，把 **可见度 \\(V\\)** 往下调  
   噪声越大，纠缠越难“显形”，最终 \\(|S|\\) 会掉回 \\(\\le 2\\)（大约在 \\(V\\lesssim 0.707\\) 附近不再违背）。

## 3. 重要提醒

- “纠缠关联”不等于“超光速通信”：单看 Alice 或 Bob 的结果仍是随机的。  
- 真正神奇的是：**两边的联合统计**无法用局域隐变量解释（当 \\(|S|>2\\) 时）。
`;
}
