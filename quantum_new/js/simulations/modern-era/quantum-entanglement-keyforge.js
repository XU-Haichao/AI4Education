/**
 * 量子纠缠：纠缠密钥工坊（QKD 小游戏）
 *
 * 把“纠缠=超距关联”的直觉变成一个可玩的任务：
 * - 纠缠源发射一对粒子到 Alice / Bob
 * - 两人各随机选择 基底0 / 基底1 进行测量（可调偏好）
 * - 基底一致 -> 形成一位候选密钥；其中一部分会被公开抽样用于估计 QBER（错误率）
 * - Eve（拦截-重发）/ 通道噪声 会提高 QBER，破坏密钥
 *
 * 说明：这是教学用的简化模型，核心目标是让学生看到：
 * 1) 单方结果始终随机，不能用来“超光速通信”
 * 2) 联合统计可以形成可靠的关联（用来生成密钥）
 * 3) 窃听会留下可检测的统计痕迹（QBER 上升）
 */

class QuantumEntanglementKeyforgeSimulation {
    constructor() {
        this.canvas = document.getElementById('entanglement-canvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');

        // UI state
        this.model = 'quantum'; // 'quantum' | 'eve' | 'random'
        this.preset = 'aligned'; // 'aligned' | 'misaligned' | 'spooky' | 'custom'

        // Measurement settings (deg) — two bases per side
        this.a0Deg = 0;
        this.a1Deg = 90;
        this.b0Deg = 0;
        this.b1Deg = 90;

        // Bias for choosing basis 0
        this.basisBias = 0.75; // [0.5, 0.98]

        // Noise (visibility)
        this.visibility = 1.0;

        // Eve attack rate (only in eve mode)
        this.eveRate = 0.6;

        // Parameter estimation sampling rate (fixed)
        this.checkRate = 0.2;

        // Auto run
        this.rate = 12; // pairs per second
        this.autoRunning = false;

        // Mission (game goal)
        this.goalBits = 32;
        this.qberThreshold = 0.11;

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

            biasSlider: document.getElementById('bias-slider'),
            biasValue: document.getElementById('bias-value'),

            eveSlider: document.getElementById('eve-slider'),
            eveValue: document.getElementById('eve-value'),

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
            siftedCount: document.getElementById('sifted-count'),
            keyCount: document.getElementById('key-count'),
            qberValue: document.getElementById('qber-value'),
            securityVerdict: document.getElementById('security-verdict'),
            keyPreview: document.getElementById('key-preview')
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

        // Bias
        if (this.ui.biasSlider) {
            this.ui.biasSlider.addEventListener('input', (e) => {
                this.basisBias = this.clamp(parseFloat(e.target.value), 0.5, 0.98);
                this.markCustom();
                this.updateUI();
            });
            this.ui.biasSlider.addEventListener('change', () => this.resetExperiment({ preserveAuto: true }));
        }

        // Eve
        if (this.ui.eveSlider) {
            this.ui.eveSlider.addEventListener('input', (e) => {
                this.eveRate = this.clamp(parseFloat(e.target.value), 0, 1);
                this.markCustom();
                this.updateUI();
            });
            this.ui.eveSlider.addEventListener('change', () => this.resetExperiment({ preserveAuto: true }));
        }

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

        const meterWidth = this.clamp(this.width * 0.62, 240, 520);
        const meterHeight = 10;
        const meterX = this.centerX - meterWidth / 2;
        const bottomY = this.height - margin - 18;
        const gap = 26;
        const qberY = bottomY - gap;

        return {
            margin,
            stationRadius,
            analyzerLen,
            particleR,
            leftX,
            rightX,
            y: this.centerY,
            meter: { x: meterX, keyY: bottomY, qberY, w: meterWidth, h: meterHeight }
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

        if (preset === 'aligned') {
            this.a0Deg = 0;
            this.a1Deg = 90;
            this.b0Deg = 0;
            this.b1Deg = 90;
            this.basisBias = 0.75;
            this.visibility = 1.0;
            this.eveRate = 0.6;
        } else if (preset === 'misaligned') {
            this.a0Deg = 0;
            this.a1Deg = 90;
            this.b0Deg = 12;
            this.b1Deg = 102;
            this.basisBias = 0.75;
            this.visibility = 1.0;
            this.eveRate = 0.6;
        } else if (preset === 'spooky') {
            this.a0Deg = 0;
            this.a1Deg = 90;
            this.b0Deg = 45;
            this.b1Deg = 135;
            this.basisBias = 0.5;
            this.visibility = 1.0;
            this.eveRate = 0.6;
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
        this.siftedCount = 0;
        this.sampleCount = 0;
        this.sampleErrors = 0;
        this.keyAlice = [];
        this.keyBob = [];
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
        if (this.ui.settingA) this.ui.settingA.textContent = '基底 ?';
        if (this.ui.settingB) this.ui.settingB.textContent = '基底 ?';

        this.setRoundIndicator({ state: 'idle', symbol: '⟷', text: '等待发射' });
        this.updateUI();
    }

    toggleAuto() {
        this.autoRunning = !this.autoRunning;
        this.spawnAccumulator = 0;
        this.updateUI();

        if (this.autoRunning && this.pairs.length === 0) {
            this.spawnPair({ immediateCollapse: false });
        }
    }

    chooseBasisIndex() {
        return Math.random() < this.basisBias ? 0 : 1;
    }

    spawnPair({ immediateCollapse } = { immediateCollapse: false }) {
        const x = this.chooseBasisIndex();
        const y = this.chooseBasisIndex();

        const thetaA = this.degToRad(x === 0 ? this.a0Deg : this.a1Deg);
        const thetaB = this.degToRad(y === 0 ? this.b0Deg : this.b1Deg);

        const attacked = this.model === 'eve' && Math.random() < this.eveRate;
        const { a, b, eveIdx } = attacked
            ? this.sampleInterceptResendOutcomes(thetaA, thetaB)
            : this.model === 'random'
                ? this.sampleRandomOutcomes()
                : this.sampleEntangledOutcomes(thetaA, thetaB);

        const kept = x === y;
        let check = false;
        let aliceBit = null;
        let bobBit = null;
        let isError = null;

        if (kept) {
            this.siftedCount++;

            // Map outcomes ±1 to key bits. For a singlet-like source, same-axis results are anti-correlated,
            // so Bob flips his raw result to align with Alice.
            aliceBit = a === 1 ? 0 : 1;
            bobBit = b === -1 ? 0 : 1;
            isError = aliceBit !== bobBit;

            check = Math.random() < this.checkRate;
            if (check) {
                this.sampleCount++;
                if (isError) this.sampleErrors++;
            } else {
                this.keyAlice.push(String(aliceBit));
                this.keyBob.push(String(bobBit));
            }
        }

        this.trialCount++;
        this.lastRound = { x, y, a, b, kept, check, attacked, eveIdx, aliceBit, bobBit, isError, thetaA, thetaB };
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
            kept,
            check,
            attacked,
            eveIdx,
            aliceBit,
            bobBit,
            isError,
            collapsed: false,
            phase: Math.random() * Math.PI * 2
        };

        this.pairs.push(pair);

        const maxPairs = 40;
        if (this.pairs.length > maxPairs) {
            this.pairs.splice(0, this.pairs.length - maxPairs);
        }
    }

    sampleRandomOutcomes() {
        return {
            a: Math.random() < 0.5 ? 1 : -1,
            b: Math.random() < 0.5 ? 1 : -1,
            eveIdx: null
        };
    }

    sampleEntangledOutcomes(thetaA, thetaB) {
        // Outcomes are ±1, unbiased. Correlation is E = -V cos(Δθ).
        const E = this.clamp(-this.visibility * Math.cos(thetaA - thetaB), -1, 1);
        const a = Math.random() < 0.5 ? 1 : -1;
        const pSame = (1 + E) / 2;
        const b = Math.random() < pSame ? a : -a;
        return { a, b, eveIdx: null };
    }

    sampleInterceptResendOutcomes(thetaA, thetaB) {
        // Eve chooses one of Bob's bases to measure, then re-sends that eigenstate to Bob.
        // This breaks entanglement and injects errors.
        const eveIdx = Math.random() < 0.5 ? 0 : 1;
        const thetaE = this.degToRad(eveIdx === 0 ? this.b0Deg : this.b1Deg);

        // Eve's measurement result is unbiased
        const e = Math.random() < 0.5 ? 1 : -1;

        // Alice collapses to the opposite eigenstate along thetaE (singlet intuition)
        const aState = -e;
        const pAPlus = (1 + aState * Math.cos(thetaA - thetaE)) / 2;
        const a = Math.random() < pAPlus ? 1 : -1;

        // Bob receives eigenstate 'e' along thetaE
        const pBPlus = (1 + e * Math.cos(thetaB - thetaE)) / 2;
        let b = Math.random() < pBPlus ? 1 : -1;

        // Channel noise: flip Bob with probability (1-V)/2
        const pFlip = (1 - this.visibility) / 2;
        if (Math.random() < pFlip) b = -b;

        return { a, b, eveIdx };
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
            const label = this.preset === 'aligned' ? '对准校准'
                : this.preset === 'misaligned' ? '轻微错位'
                    : this.preset === 'spooky' ? '幽灵模式'
                        : '自定义';
            this.ui.presetValue.textContent = label;
        }

        // Sliders & labels
        this.setSliderAndText(this.ui.a0Slider, this.ui.a0Value, this.a0Deg, (v) => `${v.toFixed(0)}°`);
        this.setSliderAndText(this.ui.a1Slider, this.ui.a1Value, this.a1Deg, (v) => `${v.toFixed(0)}°`);
        this.setSliderAndText(this.ui.b0Slider, this.ui.b0Value, this.b0Deg, (v) => `${v.toFixed(0)}°`);
        this.setSliderAndText(this.ui.b1Slider, this.ui.b1Value, this.b1Deg, (v) => `${v.toFixed(0)}°`);

        if (this.ui.biasSlider) this.ui.biasSlider.value = String(this.basisBias);
        if (this.ui.biasValue) this.ui.biasValue.textContent = `${Math.round(this.basisBias * 100)}%`;

        if (this.ui.eveSlider) this.ui.eveSlider.disabled = this.model !== 'eve';
        if (this.ui.eveSlider) this.ui.eveSlider.value = String(this.eveRate);
        if (this.ui.eveValue) this.ui.eveValue.textContent = `${Math.round(this.eveRate * 100)}%`;

        if (this.ui.visibilitySlider) this.ui.visibilitySlider.value = String(this.visibility);
        if (this.ui.visibilityValue) this.ui.visibilityValue.textContent = this.visibility.toFixed(2);

        if (this.ui.rateSlider) this.ui.rateSlider.value = String(this.rate);
        if (this.ui.rateValue) this.ui.rateValue.textContent = `${this.rate} 对/秒`;

        // Auto button
        if (this.ui.autoBtn) {
            this.ui.autoBtn.classList.toggle('active', this.autoRunning);
            this.ui.autoBtn.textContent = this.autoRunning ? '停止' : '自动运行';
        }

        // Stats
        if (this.ui.trialCount) this.ui.trialCount.textContent = String(this.trialCount);
        if (this.ui.siftedCount) this.ui.siftedCount.textContent = String(this.siftedCount);
        if (this.ui.keyCount) this.ui.keyCount.textContent = String(this.keyAlice.length);

        const qber = this.getQber();
        if (this.ui.qberValue) {
            this.ui.qberValue.textContent = qber == null ? '-' : `${(qber * 100).toFixed(1)}%`;
        }

        if (this.ui.securityVerdict) {
            const verdict = this.getSecurityVerdict(qber);
            this.ui.securityVerdict.textContent = verdict.text;
            this.ui.securityVerdict.style.color = verdict.color;
        }

        if (this.ui.keyPreview) {
            this.ui.keyPreview.textContent = this.formatKeyPreview();
        }
    }

    getQber() {
        if (this.sampleCount <= 0) return null;
        return this.sampleErrors / this.sampleCount;
    }

    getSecurityVerdict(qber) {
        if (qber == null || this.sampleCount < 20) {
            return { text: '样本不足', color: 'var(--color-text-muted)' };
        }
        if (qber <= this.qberThreshold) {
            return { text: '可能安全', color: 'var(--color-success)' };
        }
        if (qber <= 0.2) {
            return { text: '可疑', color: 'var(--color-warning)' };
        }
        return { text: '不安全', color: 'var(--color-error)' };
    }

    formatKeyPreview() {
        if (this.keyAlice.length === 0) return '—';

        const maxBits = 48;
        const a = this.keyAlice.slice(-maxBits);
        const b = this.keyBob.slice(-maxBits);

        const group = (arr) => {
            const s = arr.join('');
            return s.replace(/(.{4})/g, '$1 ').trim();
        };

        return `A: ${group(a)}\nB: ${group(b)}`;
    }

    setSliderAndText(sliderEl, textEl, value, format) {
        if (sliderEl) sliderEl.value = String(value);
        if (textEl) textEl.textContent = format(value);
    }

    setParticleResult(which, bit) {
        const el = which === 'A' ? this.ui.stateA : this.ui.stateB;
        if (!el) return;

        if (bit == null) {
            el.textContent = '?';
            el.className = 'particle-state';
            return;
        }

        el.textContent = String(bit);
        el.className = 'particle-state ' + (bit === 0 ? 'bit0' : 'bit1');
    }

    setRoundIndicator({ state, symbol, text }) {
        if (!this.ui.roundIndicator) return;
        this.ui.roundIndicator.classList.remove('keep', 'drop', 'sample', 'warn');

        if (state) this.ui.roundIndicator.classList.add(state);
        if (this.ui.roundSymbol) this.ui.roundSymbol.textContent = symbol ?? '⟷';
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

        // Display mapped key bits if available, otherwise show raw mapping anyway
        const aBit = pair.aliceBit ?? (pair.a === 1 ? 0 : 1);
        const bBit = pair.bobBit ?? (pair.b === -1 ? 0 : 1);
        this.setParticleResult('A', aBit);
        this.setParticleResult('B', bBit);

        const aLabel = pair.x === 0 ? `基底 0 · ${this.a0Deg.toFixed(0)}°` : `基底 1 · ${this.a1Deg.toFixed(0)}°`;
        const bLabel = pair.y === 0 ? `基底 0 · ${this.b0Deg.toFixed(0)}°` : `基底 1 · ${this.b1Deg.toFixed(0)}°`;
        if (this.ui.settingA) this.ui.settingA.textContent = aLabel;
        if (this.ui.settingB) this.ui.settingB.textContent = bLabel;

        const suffix = pair.attacked ? ' · Eve拦截' : '';

        if (!pair.kept) {
            this.setRoundIndicator({
                state: 'drop',
                symbol: '⊘',
                text: `基底不同：丢弃${suffix}`
            });
        } else if (pair.check) {
            this.setRoundIndicator({
                state: 'sample',
                symbol: '🔍',
                text: `${pair.isError ? '抽样：不一致' : '抽样：一致'}（估计 QBER）${suffix}`
            });
        } else if (pair.isError) {
            this.setRoundIndicator({
                state: 'warn',
                symbol: '⚠',
                text: `保留为密钥（但发生错误）${suffix}`
            });
        } else {
            const bitIndex = this.keyAlice.length;
            this.setRoundIndicator({
                state: 'keep',
                symbol: '🔑',
                text: `保留为密钥 · 第 ${bitIndex} 位${suffix}`
            });
        }

        // Flash effects
        const { leftX, rightX, y } = this.layout;
        const color = !pair.kept ? 'rgba(148,163,184,0.9)'
            : pair.check ? 'rgba(34,211,238,0.9)'
                : pair.isError ? 'rgba(245,158,11,0.9)'
                    : 'rgba(16,185,129,0.9)';
        this.effects.push({ t0: this.time, duration: 0.35, x: leftX, y, color });
        this.effects.push({ t0: this.time, duration: 0.35, x: rightX, y, color });

        // Mission completion sparkle
        if (this.isMissionComplete()) {
            this.effects.push({ t0: this.time, duration: 0.7, x: this.centerX, y: y - 90, color: 'rgba(168,85,247,0.9)' });
        }
    }

    isMissionComplete() {
        const qber = this.getQber();
        if (qber == null || this.sampleCount < 20) return false;
        return this.keyAlice.length >= this.goalBits && qber <= this.qberThreshold;
    }

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        this.drawBackground();
        this.drawStations();
        this.drawPairs();
        this.drawEffects();
        this.drawMeters();
        this.drawHud();
    }

    drawBackground() {
        const ctx = this.ctx;
        const base = Math.min(this.width, this.height);

        const g = ctx.createRadialGradient(this.centerX, this.centerY, base * 0.05, this.centerX, this.centerY, base * 0.7);
        g.addColorStop(0, 'rgba(168, 85, 247, 0.10)');
        g.addColorStop(0.5, 'rgba(99, 102, 241, 0.05)');
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, this.width, this.height);

        for (const d of this.bgDots) {
            const x = d.u * this.width;
            const y = d.v * this.height;
            const tw = 0.35 + 0.35 * Math.sin(this.time * d.speed + d.phase);
            ctx.fillStyle = `hsla(${d.hue}, 80%, 70%, ${0.12 + tw * 0.25})`;
            ctx.beginPath();
            ctx.arc(x, y, d.r, 0, Math.PI * 2);
            ctx.fill();
        }

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

        ctx.fillStyle = 'rgba(168, 85, 247, 0.85)';
        ctx.beginPath();
        ctx.arc(this.centerX, y, srcR, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.centerX, y, srcR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Eve badge (mode hint)
        if (this.model === 'eve') {
            this.drawEveBadge(this.centerX, y - 52, this.lastRound?.attacked === true);
        }

        // Stations
        const activeX = this.lastRound?.x ?? null;
        const activeY = this.lastRound?.y ?? null;
        this.drawStation(leftX, y, stationRadius, analyzerLen, 'Alice', true, activeX);
        this.drawStation(rightX, y, stationRadius, analyzerLen, 'Bob', false, activeY);
    }

    drawEveBadge(x, y, active) {
        const ctx = this.ctx;
        const r = 18;
        ctx.save();
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
        g.addColorStop(0, active ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.18)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = active ? 'rgba(239,68,68,0.85)' : 'rgba(245,158,11,0.75)';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.font = 'bold 11px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('EVE', x, y + 0.5);
        ctx.restore();
    }

    drawStation(x, y, r, len, label, isAlice, activeIdx) {
        const ctx = this.ctx;
        ctx.save();

        const stationGlow = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
        stationGlow.addColorStop(0, 'rgba(59, 130, 246, 0.08)');
        stationGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = stationGlow;
        ctx.beginPath();
        ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        this.pathRoundRect(ctx, x - r, y - r, r * 2, r * 2, r);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();

        // Basis lines
        const a0 = this.degToCanvasRad(isAlice ? this.a0Deg : this.b0Deg);
        const a1 = this.degToCanvasRad(isAlice ? this.a1Deg : this.b1Deg);
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
        const s0 = isAlice ? `基0 ${this.a0Deg.toFixed(0)}°` : `基0 ${this.b0Deg.toFixed(0)}°`;
        const s1 = isAlice ? `基1 ${this.a1Deg.toFixed(0)}°` : `基1 ${this.b1Deg.toFixed(0)}°`;
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

            const alpha = this.model === 'quantum' ? 0.22 : this.model === 'eve' ? 0.18 : 0.06;
            const hue = pair.attacked ? 15 : 265;
            this.drawThread(xA, yA, xB, yB, pair.phase, alpha * (1 - 0.25 * p), hue);

            const reveal = pair.collapsed ? 1 : p * 0.3;
            const colBit = (bit) => (bit === 0 ? 'rgba(59, 130, 246,' : 'rgba(236, 72, 153,');
            const aBit = pair.aliceBit ?? (pair.a === 1 ? 0 : 1);
            const bBit = pair.bobBit ?? (pair.b === -1 ? 0 : 1);
            const colA = pair.collapsed ? colBit(aBit) : 'rgba(168, 85, 247,';
            const colB = pair.collapsed ? colBit(bBit) : 'rgba(168, 85, 247,';
            this.drawParticle(xA, yA, particleR, `${colA} ${0.85 * reveal})`);
            this.drawParticle(xB, yB, particleR, `${colB} ${0.85 * reveal})`);
        }
    }

    drawThread(x1, y1, x2, y2, phase, alpha, hue) {
        const ctx = this.ctx;
        const segments = 22;
        const amp = 10;
        ctx.save();
        ctx.strokeStyle = `hsla(${hue}, 80%, 70%, ${alpha})`;
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

    drawMeters() {
        const ctx = this.ctx;
        const { x, keyY, qberY, w, h } = this.layout.meter;

        const qber = this.getQber() ?? 0;

        // QBER bar (0..30% range for readability)
        const qMax = 0.3;
        const qFill = w * this.clamp(qber / qMax, 0, 1);
        const qThresholdX = x + w * (this.qberThreshold / qMax);
        const qGood = qber <= this.qberThreshold;

        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.beginPath();
        this.pathRoundRect(ctx, x, qberY, w, h, 6);
        ctx.fill();

        if (this.sampleCount > 0 && qFill > 0.5) {
            ctx.fillStyle = qGood ? 'rgba(16, 185, 129, 0.55)' : 'rgba(245, 158, 11, 0.55)';
            ctx.beginPath();
            this.pathRoundRect(ctx, x, qberY, qFill, h, 6);
            ctx.fill();
        }

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(qThresholdX, qberY - 6);
        ctx.lineTo(qThresholdX, qberY + h + 6);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.font = '12px Inter';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`抽样 QBER（阈值 11%）  样本=${this.sampleCount}`, x, qberY - 10);
        ctx.restore();

        // Key progress bar
        const keyLen = this.keyAlice.length;
        const kFill = w * this.clamp(keyLen / this.goalBits, 0, 1);

        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.beginPath();
        this.pathRoundRect(ctx, x, keyY, w, h, 6);
        ctx.fill();

        if (kFill > 0.5) {
            const grad = ctx.createLinearGradient(x, 0, x + w, 0);
            grad.addColorStop(0, 'rgba(59, 130, 246, 0.65)');
            grad.addColorStop(0.5, 'rgba(168, 85, 247, 0.65)');
            grad.addColorStop(1, 'rgba(236, 72, 153, 0.65)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            this.pathRoundRect(ctx, x, keyY, kFill, h, 6);
            ctx.fill();
        }

        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.font = '12px Inter';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`密钥进度：${keyLen}/${this.goalBits}（目标）`, x, keyY - 10);
        ctx.restore();
    }

    drawHud() {
        const ctx = this.ctx;
        const margin = this.layout.margin;

        const modelText = this.model === 'quantum' ? '纠缠源'
            : this.model === 'eve' ? 'Eve 模式'
                : '独立随机';

        const qber = this.getQber();
        const qText = qber == null ? '—' : `${(qber * 100).toFixed(1)}%`;

        const mission = this.isMissionComplete()
            ? '任务完成：密钥达标 ✓'
            : `任务：${this.goalBits} 位密钥 + QBER≤11%`;

        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        this.pathRoundRect(ctx, margin, margin, 286, 76, 12);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
        ctx.font = 'bold 13px Inter';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const extra = this.model === 'eve' ? ` · p=${Math.round(this.eveRate * 100)}%` : '';
        ctx.fillText(`${modelText}${extra} · V=${this.visibility.toFixed(2)} · 偏好=${Math.round(this.basisBias * 100)}%`, margin + 12, margin + 10);

        ctx.fillStyle = 'rgba(148, 163, 184, 0.95)';
        ctx.font = '12px Inter';
        ctx.fillText(`发射=${this.trialCount}  匹配=${this.siftedCount}  QBER=${qText}`, margin + 12, margin + 30);
        ctx.fillText(mission, margin + 12, margin + 50);
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
        if (!Number.isFinite(deg)) return 0;
        return this.clamp(deg, 0, 180);
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
    new QuantumEntanglementKeyforgeSimulation();
});

// 默认学习内容
if (typeof DefaultContent !== 'undefined') {
    DefaultContent['quantum-entanglement'] = `# 量子纠缠：纠缠密钥工坊（QKD 小游戏）

> 纠缠不是“超光速传信”，而是 **联合统计的特殊关联**。  
> 这页把纠缠做成一台“密钥工坊”：你能用纠缠生成共享密钥，也能看到窃听如何留下痕迹。

## 1. 你正在做什么？

中间的源每次发射一对粒子到 Alice / Bob。  
两边会各自随机选择 **基底 0 / 基底 1** 来测量，结果是 0 或 1：

- **基底一致**：这对结果可以保留下来，作为候选密钥位（🔑）
- **基底不同**：丢弃（⊘）
- **公开抽样**：从保留下来的位里抽一部分公开比对，用来估计 **QBER（错误率）**（🔍）
- 你也可以调节 Alice/Bob 的基底角度（相当于测量方向）：对准时更容易得到低 QBER

> QBER 越高，说明噪声越大，或出现了窃听（Eve）。

## 2. 推荐玩法（更有趣也更直观）

1. 选 **纠缠源（可生成密钥）**，点 **对准校准**，然后开启 **自动运行**  
   你会看到 QBER 很低，密钥长度稳定增长。
2. 切到 **窃听者 Eve**，保持其它参数不变  
   QBER 会明显升高，系统会给出“不安全/可疑”的判定。
3. 回到 **纠缠源**，把 **可见度 V** 往下调  
   噪声变大时，即使没有窃听，QBER 也会上升。

## 3. 重要提醒（纠缠的“幽灵感”在哪里？）

- 单看 Alice 或 Bob 的结果永远是随机的（所以不能超光速通信）。  
- 但当两边在同一基底测量时，它们的结果会表现出稳定的关联：  
  **随机 + 相关** 这件事，正是纠缠的核心魅力。
`;
}
