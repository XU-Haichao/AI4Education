/**
 * 量子场论模拟（模式谱版本备份）
 * 用“动量模式 = 谐振子、粒子 = 模式上的量子数 n_k”的视角，直观看到：
 * - 真空也会涨落（零点能）
 * - 产生/湮灭算符 a† / a 会让 n_k 上下跳
 * - “波包”本质是许多 k 模式的叠加
 */

class QuantumFieldTheorySimulation {
    constructor() {
        this.canvas = document.getElementById('qft-canvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');

        // UI state
        this.mode = 'field';
        this.energy = 3; // 1..5
        this.showGrid = true;
        this.selectedMode = 6;
        this.hoverMode = null;

        // Simulation state
        this.isRunning = true;
        this.time = 0;
        this.lastFrameTs = null;
        this.lastInjectMs = 0;

        // Model: modes k=1..K
        this.modeCount = 24;
        this.mass = 0.9; // dimensionless, sets ω_k = sqrt(m^2 + k^2)
        this.omega = new Float32Array(this.modeCount + 1);
        this.vacuumPhase = new Float32Array(this.modeCount + 1);
        this.alphaRe = new Float32Array(this.modeCount + 1); // coherent amplitude (Re)
        this.alphaIm = new Float32Array(this.modeCount + 1); // coherent amplitude (Im)

        // Visual effects
        this.effects = [];

        this.pointer = {
            x: 0,
            y: 0,
            down: false,
            inside: false
        };

        this.init();
    }

    init() {
        this.resizeCanvas();
        this.initModes();
        this.bindEvents();
        this.updateUI();

        requestAnimationFrame((ts) => this.animate(ts));

        window.addEventListener('resize', () => {
            this.resizeCanvas();
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

        // Reset transform to avoid scale accumulation on resize
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        this.width = w;
        this.height = h;

        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
    }

    initModes() {
        for (let k = 1; k <= this.modeCount; k++) {
            this.omega[k] = Math.sqrt(this.mass * this.mass + k * k);
            this.vacuumPhase[k] = Math.random() * Math.PI * 2;
            this.alphaRe[k] = 0;
            this.alphaIm[k] = 0;
        }
        this.updateParticleCount();
    }

    bindEvents() {
        // 演示模式按钮
        document.querySelectorAll('.preset-btn[data-mode]').forEach((btn) => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.preset-btn[data-mode]').forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                this.mode = btn.dataset.mode;
                this.updateUI();
            });
        });

        // 强度滑块
        const energySlider = document.getElementById('energy-slider');
        energySlider?.addEventListener('input', (e) => {
            this.energy = parseInt(e.target.value, 10);
            const labels = ['很低', '较低', '中等', '较高', '很高'];
            const energyValue = document.getElementById('energy-value');
            if (energyValue) energyValue.textContent = labels[this.energy - 1] ?? '中等';
        });

        // 网格开关
        document.querySelectorAll('.preset-btn[data-grid]').forEach((btn) => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.preset-btn[data-grid]').forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                this.showGrid = btn.dataset.grid === 'on';
                const gridValue = document.getElementById('grid-value');
                if (gridValue) gridValue.textContent = this.showGrid ? '开' : '关';
            });
        });

        // 重置
        document.getElementById('reset-btn')?.addEventListener('click', () => this.reset());

        // 触发事件
        document.getElementById('trigger-btn')?.addEventListener('click', () => this.triggerEvent());

        // Canvas interactions
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
            this.pointer.down = false;
            this.hoverMode = null;
        });

        this.canvas.addEventListener('pointermove', (e) => {
            updatePointer(e);

            const layout = this.getLayout();
            this.hoverMode = this.getModeIndexAt(this.pointer.x, this.pointer.y, layout);
            this.canvas.style.cursor = this.hoverMode ? 'pointer' : (this.mode === 'field' ? 'crosshair' : 'default');

            if (this.pointer.down && this.mode === 'field') {
                    const now = performance.now();
                    if (now - this.lastInjectMs > 45) {
                    const fieldX = this.getFieldXNormAt(this.pointer.x, this.pointer.y, layout);
                    if (fieldX !== null) {
                        this.injectPacket(fieldX, this.getDragPacketQuanta());
                        this.lastInjectMs = now;
                    }
                }
            }
        });

        this.canvas.addEventListener('pointerdown', (e) => {
            updatePointer(e);
            this.pointer.down = true;
            this.canvas.setPointerCapture?.(e.pointerId);

            const layout = this.getLayout();
            const hitMode = this.getModeIndexAt(this.pointer.x, this.pointer.y, layout);

            if (hitMode) {
                this.selectedMode = hitMode;
                this.updateUI();

                if (this.mode === 'creation') {
                    this.applyCreation(hitMode, this.getActionQuanta(), null);
                    this.spawnSparkOnMode(hitMode, layout, 'rgba(59, 130, 246, 0.9)');
                } else if (this.mode === 'annihilation') {
                    this.applyAnnihilation(hitMode, this.getActionQuanta());
                    this.spawnSparkOnMode(hitMode, layout, 'rgba(239, 68, 68, 0.9)');
                }
                return;
            }

            // Field area click
            const fieldX = this.getFieldXNormAt(this.pointer.x, this.pointer.y, layout);
            if (fieldX === null) return;

            if (this.mode === 'field') {
                this.injectPacket(fieldX, this.getClickPacketQuanta());
                this.spawnRing(this.pointer.x, this.pointer.y, 'rgba(168, 85, 247, 0.8)');
            } else if (this.mode === 'creation') {
                this.applyCreation(this.selectedMode, this.getActionQuanta(), fieldX);
                this.spawnRing(this.pointer.x, this.pointer.y, 'rgba(59, 130, 246, 0.75)');
            } else if (this.mode === 'annihilation') {
                this.applyAnnihilation(this.selectedMode, this.getActionQuanta());
                this.spawnRing(this.pointer.x, this.pointer.y, 'rgba(239, 68, 68, 0.75)');
            }
        });

        window.addEventListener('pointerup', () => {
            this.pointer.down = false;
        });
    }

    reset() {
        this.mode = 'field';
        this.energy = 3;
        this.showGrid = true;
        this.selectedMode = 6;
        this.hoverMode = null;
        this.time = 0;
        this.lastFrameTs = null;
        this.effects = [];

        for (let k = 1; k <= this.modeCount; k++) {
            this.vacuumPhase[k] = Math.random() * Math.PI * 2;
            this.alphaRe[k] = 0;
            this.alphaIm[k] = 0;
        }

        // 重置UI
        const energySlider = document.getElementById('energy-slider');
        if (energySlider) energySlider.value = '3';
        const energyValue = document.getElementById('energy-value');
        if (energyValue) energyValue.textContent = '中等';
        const gridValue = document.getElementById('grid-value');
        if (gridValue) gridValue.textContent = '开';

        document.querySelectorAll('.preset-btn[data-mode]').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.mode === 'field');
        });
        document.querySelectorAll('.preset-btn[data-grid]').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.grid === 'on');
        });

        this.updateUI();
    }

    updateUI() {
        const triggerBtn = document.getElementById('trigger-btn');
        if (triggerBtn) {
            const labels = {
                field: '注入波包',
                creation: 'a† 加粒子',
                annihilation: 'a 减粒子'
            };
            triggerBtn.textContent = labels[this.mode] ?? '触发事件';
        }

        const creationOp = document.getElementById('creation-op');
        if (creationOp) creationOp.textContent = `a†(k=${this.selectedMode})`;

        const annihilationOp = document.getElementById('annihilation-op');
        if (annihilationOp) annihilationOp.textContent = `a(k=${this.selectedMode})`;

        this.updateParticleCount();
    }

    triggerEvent() {
        const layout = this.getLayout();
        const fieldX = this.pointer.inside ? this.getFieldXNormAt(this.pointer.x, this.pointer.y, layout) : 0.5;
        const xNorm = fieldX ?? 0.5;

        if (this.mode === 'field') {
            this.injectPacket(xNorm, this.getClickPacketQuanta());
            this.spawnRing(this.getFieldPixelX(xNorm, layout), this.getFieldCenterY(layout), 'rgba(168, 85, 247, 0.8)');
        } else if (this.mode === 'creation') {
            this.applyCreation(this.selectedMode, this.getActionQuanta(), xNorm);
            this.spawnSparkOnMode(this.selectedMode, layout, 'rgba(59, 130, 246, 0.9)');
        } else if (this.mode === 'annihilation') {
            this.applyAnnihilation(this.selectedMode, this.getActionQuanta());
            this.spawnSparkOnMode(this.selectedMode, layout, 'rgba(239, 68, 68, 0.9)');
        }
    }

    // --- Model operations ----------------------------------------------------

    getQuanta(k) {
        const re = this.alphaRe[k];
        const im = this.alphaIm[k];
        return re * re + im * im;
    }

    applyCreation(k, quanta, xNormOrNull) {
        if (k < 1 || k > this.modeCount) return;

        const maxQ = 80;
        const oldQ = this.getQuanta(k);
        const newQ = Math.min(maxQ, oldQ + Math.max(0, quanta));

        let phase;
        if (typeof xNormOrNull === 'number') {
            phase = -k * Math.PI * 2 * this.clamp01(xNormOrNull);
        } else if (oldQ > 1e-8) {
            phase = Math.atan2(this.alphaIm[k], this.alphaRe[k]);
        } else {
            phase = Math.random() * Math.PI * 2;
        }

        const r = Math.sqrt(newQ);
        this.alphaRe[k] = r * Math.cos(phase);
        this.alphaIm[k] = r * Math.sin(phase);

        this.updateParticleCount();
    }

    applyAnnihilation(k, quanta) {
        if (k < 1 || k > this.modeCount) return;

        const oldQ = this.getQuanta(k);
        const newQ = Math.max(0, oldQ - Math.max(0, quanta));

        if (newQ <= 1e-10) {
            this.alphaRe[k] = 0;
            this.alphaIm[k] = 0;
            this.updateParticleCount();
            return;
        }

        const phase = Math.atan2(this.alphaIm[k], this.alphaRe[k]);
        const r = Math.sqrt(newQ);
        this.alphaRe[k] = r * Math.cos(phase);
        this.alphaIm[k] = r * Math.sin(phase);

        this.updateParticleCount();
    }

    injectPacket(xNorm, totalQuanta) {
        const qTotal = Math.max(0, totalQuanta);
        if (qTotal <= 0) return;

        // 高强度 -> 更偏向“高 k、窄谱”；低强度 -> 更宽谱
        const k0 = 2 + this.energy * 3; // 5..17
        const sigma = 1.6 + (5 - this.energy) * 1.1; // ~1.6..6.0

        let wSum = 0;
        const w = new Float32Array(this.modeCount + 1);
        for (let k = 1; k <= this.modeCount; k++) {
            const z = (k - k0) / sigma;
            const wk = Math.exp(-0.5 * z * z);
            w[k] = wk;
            wSum += wk;
        }

        const x = this.clamp01(xNorm);
        const maxQ = 80;

        for (let k = 1; k <= this.modeCount; k++) {
            const qk = (qTotal * w[k]) / (wSum || 1);
            if (qk <= 0) continue;

            const phase = -k * Math.PI * 2 * x;
            const addR = Math.sqrt(qk);

            // Add a coherent contribution so multiple packets can superpose
            this.alphaRe[k] += addR * Math.cos(phase);
            this.alphaIm[k] += addR * Math.sin(phase);

            // Cap runaway amplitude
            const qNow = this.getQuanta(k);
            if (qNow > maxQ) {
                const scale = Math.sqrt(maxQ / qNow);
                this.alphaRe[k] *= scale;
                this.alphaIm[k] *= scale;
            }
        }

        this.updateParticleCount();
    }

    // --- Animation ----------------------------------------------------------

    animate(ts) {
        if (!this.isRunning) return;

        if (this.lastFrameTs == null) this.lastFrameTs = ts;
        const dt = Math.min(0.033, Math.max(0.001, (ts - this.lastFrameTs) / 1000));
        this.lastFrameTs = ts;
        this.time += dt;

        this.updateEffects(dt);
        this.render();

        requestAnimationFrame((nextTs) => this.animate(nextTs));
    }

    updateEffects(dt) {
        for (const e of this.effects) {
            e.age += dt;
        }
        this.effects = this.effects.filter((e) => e.age < e.lifetime);
    }

    // --- Rendering ----------------------------------------------------------

    render() {
        const ctx = this.ctx;
        const layout = this.getLayout();

        // Background
        ctx.clearRect(0, 0, this.width, this.height);
        const bg = ctx.createLinearGradient(0, 0, 0, this.height);
        bg.addColorStop(0, 'rgba(8, 10, 30, 0.95)');
        bg.addColorStop(1, 'rgba(2, 6, 23, 0.98)');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, this.width, this.height);

        if (this.showGrid) {
            this.drawGrid(layout);
        }

        this.drawField(layout);
        this.drawSpectrum(layout);
        this.drawEffects();
        this.drawHeader(layout);
    }

    drawGrid(layout) {
        const ctx = this.ctx;
        ctx.save();
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.12)';
        ctx.lineWidth = 1;

        // Field baseline
        const cy = this.getFieldCenterY(layout);
        ctx.beginPath();
        ctx.moveTo(layout.field.x, cy);
        ctx.lineTo(layout.field.x + layout.field.w, cy);
        ctx.stroke();

        // Spectrum grid lines
        const maxH = Math.max(10, layout.spectrum.h - 26);
        const lines = 4;
        for (let i = 1; i <= lines; i++) {
            const y = layout.spectrum.y + layout.spectrum.h - 18 - (i / lines) * maxH;
            ctx.beginPath();
            ctx.moveTo(layout.spectrum.x, y);
            ctx.lineTo(layout.spectrum.x + layout.spectrum.w, y);
            ctx.stroke();
        }
        ctx.restore();
    }

    drawField(layout) {
        const ctx = this.ctx;

        const samples = Math.max(140, Math.floor(layout.field.w));
        const values = new Float32Array(samples);

        const baseVac = 0.08 + 0.02 * (this.energy - 3); // subtle, energy affects “vacuum jitter”
        const baseExc = 0.055;

        for (let i = 0; i < samples; i++) {
            const xNorm = samples === 1 ? 0.5 : i / (samples - 1);
            const phaseX = xNorm * Math.PI * 2;
            let v = 0;

            for (let k = 1; k <= this.modeCount; k++) {
                const omega = this.omega[k];
                const angle = k * phaseX - omega * this.time;

                // vacuum: fixed amplitude, random phase
                v += (baseVac / Math.sqrt(omega)) * Math.cos(angle + this.vacuumPhase[k]);

                // excitations: coherent amplitude α_k
                const re = this.alphaRe[k];
                const im = this.alphaIm[k];
                if (re !== 0 || im !== 0) {
                    v += (baseExc / Math.sqrt(omega)) * (re * Math.cos(angle) - im * Math.sin(angle));
                }
            }
            values[i] = v;
        }

        const centerY = this.getFieldCenterY(layout);
        const scale = layout.field.h * 0.40; // fixed scale so “more particles => bigger wave” is visible

        // Fill
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(layout.field.x, centerY);
        for (let i = 0; i < samples; i++) {
            const x = layout.field.x + (i / (samples - 1)) * layout.field.w;
            const y = centerY - values[i] * scale;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(layout.field.x + layout.field.w, centerY);
        ctx.closePath();

        const fill = ctx.createLinearGradient(0, layout.field.y, 0, layout.field.y + layout.field.h);
        fill.addColorStop(0, 'rgba(168, 85, 247, 0.10)');
        fill.addColorStop(1, 'rgba(59, 130, 246, 0.04)');
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.restore();

        // Stroke
        ctx.save();
        ctx.beginPath();
        for (let i = 0; i < samples; i++) {
            const x = layout.field.x + (i / (samples - 1)) * layout.field.w;
            const y = centerY - values[i] * scale;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.95)';
        ctx.shadowColor = 'rgba(168, 85, 247, 0.35)';
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.restore();

        // Pointer marker (in field area)
        if (this.pointer.inside) {
            const xNorm = this.getFieldXNormAt(this.pointer.x, this.pointer.y, layout);
            if (xNorm !== null) {
                const x = this.pointer.x;
                ctx.save();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
                ctx.beginPath();
                ctx.moveTo(x, layout.field.y);
                ctx.lineTo(x, layout.field.y + layout.field.h);
                ctx.stroke();
                ctx.restore();
            }
        }
    }

    drawSpectrum(layout) {
        const ctx = this.ctx;
        const barW = layout.spectrum.w / this.modeCount;
        const maxH = Math.max(10, layout.spectrum.h - 26);

        ctx.save();
        ctx.font = '12px Inter, Noto Sans SC, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';

        for (let k = 1; k <= this.modeCount; k++) {
            const x = layout.spectrum.x + (k - 1) * barW;
            const q = this.getQuanta(k);
            const n = Math.floor(q + 1e-6);

            const barMaxN = 30;
            const norm = Math.log1p(Math.min(n, barMaxN)) / Math.log1p(barMaxN);
            const h = norm * maxH;
            const y = layout.spectrum.y + layout.spectrum.h - 18 - h;

            const isSelected = k === this.selectedMode;
            const isHover = k === this.hoverMode;

            // Bar
            const baseColor = isSelected ? 'rgba(59, 130, 246, 0.95)' : 'rgba(168, 85, 247, 0.75)';
            const color = isHover ? 'rgba(255, 255, 255, 0.85)' : baseColor;
            ctx.fillStyle = color;
            ctx.fillRect(x + 2, y, barW - 4, h);

            // Outline
            ctx.strokeStyle = isSelected ? 'rgba(255, 255, 255, 0.65)' : 'rgba(255, 255, 255, 0.18)';
            ctx.lineWidth = isSelected ? 2 : 1;
            ctx.strokeRect(x + 2, y, barW - 4, h);

            // k label
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fillText(`k${k}`, x + barW / 2, layout.spectrum.y + layout.spectrum.h - 4);

            // n label for selected/hover
            if ((isSelected || isHover) && n > 0) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
                ctx.fillText(`${n}`, x + barW / 2, y - 6);
            }
        }
        ctx.restore();
    }

    drawEffects() {
        const ctx = this.ctx;
        ctx.save();
        for (const e of this.effects) {
            const t = e.age / e.lifetime;
            const a = (1 - t) * e.alpha;
            const r = e.r0 + (e.r1 - e.r0) * t;
            ctx.globalAlpha = a;
            ctx.strokeStyle = e.color;
            ctx.lineWidth = e.lineWidth;
            ctx.beginPath();
            ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }

    drawHeader(layout) {
        const ctx = this.ctx;
        const modeText = {
            field: '真空&场：拖动注入波包（叠加多个 k 模式）',
            creation: 'a† 创建：点击谱条/画面给选中 k 加粒子数',
            annihilation: 'a 湮灭：点击谱条/按钮给选中 k 减粒子数'
        }[this.mode] ?? '';

        const k = this.selectedMode;
        const n = Math.floor(this.getQuanta(k) + 1e-6);
        const omega = this.omega[k];

        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
        ctx.font = '14px Inter, Noto Sans SC, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(modeText, this.width / 2, 12);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.font = '12px Inter, Noto Sans SC, sans-serif';
        ctx.fillText(`选中：k=${k}  n=${n}  ω≈${omega.toFixed(2)}   |   总粒子数 N=${this.getTotalParticles()}`, this.width / 2, 32);
        ctx.restore();
    }

    // --- Layout & hit testing ------------------------------------------------

    getLayout() {
        const pad = Math.min(40, Math.max(16, this.width * 0.05));
        const headerH = 52;
        const bottomPad = 8;
        const gap = 10;

        const availableH = Math.max(1, this.height - headerH - bottomPad);
        const minFieldH = 90;
        const minSpectrumH = 70;

        let spectrumH = Math.min(150, Math.max(minSpectrumH, availableH * 0.32));
        let fieldH = availableH - spectrumH - gap;

        if (fieldH < minFieldH) {
            fieldH = Math.max(50, availableH - minSpectrumH - gap);
        }

        spectrumH = Math.max(1, availableH - fieldH - gap);

        const w = Math.max(1, this.width - pad * 2);

        const field = {
            x: pad,
            y: headerH,
            w,
            h: Math.max(1, fieldH)
        };

        const spectrum = {
            x: pad,
            y: field.y + field.h + gap,
            w,
            h: Math.max(1, spectrumH)
        };

        return { field, spectrum, pad, headerH };
    }

    getModeIndexAt(px, py, layout) {
        const s = layout.spectrum;
        if (px < s.x || px > s.x + s.w || py < s.y || py > s.y + s.h) return null;

        const barW = s.w / this.modeCount;
        const idx = Math.floor((px - s.x) / barW) + 1;
        if (idx < 1 || idx > this.modeCount) return null;
        return idx;
    }

    getFieldXNormAt(px, py, layout) {
        const f = layout.field;
        if (px < f.x || px > f.x + f.w || py < f.y || py > f.y + f.h) return null;
        return this.clamp01((px - f.x) / f.w);
    }

    getFieldPixelX(xNorm, layout) {
        const f = layout.field;
        return f.x + this.clamp01(xNorm) * f.w;
    }

    getFieldCenterY(layout) {
        const f = layout.field;
        return f.y + f.h / 2;
    }

    // --- UI helpers ----------------------------------------------------------

    getActionQuanta() {
        return Math.max(1, Math.min(5, this.energy));
    }

    getClickPacketQuanta() {
        return 4 + this.energy * 4; // 8..24
    }

    getDragPacketQuanta() {
        return 0.6 * this.energy; // 0.6..3.0
    }

    updateParticleCount() {
        const el = document.getElementById('particle-count');
        if (el) el.textContent = String(this.getTotalParticles());
    }

    getTotalParticles() {
        let total = 0;
        for (let k = 1; k <= this.modeCount; k++) {
            total += Math.floor(this.getQuanta(k) + 1e-6);
        }
        return total;
    }

    clamp01(x) {
        return Math.max(0, Math.min(1, x));
    }

    // --- Effects -------------------------------------------------------------

    spawnRing(x, y, rgba) {
        this.effects.push({
            type: 'ring',
            x,
            y,
            age: 0,
            lifetime: 0.55,
            r0: 4,
            r1: 70,
            alpha: 0.9,
            color: rgba,
            lineWidth: 2
        });
    }

    spawnSparkOnMode(k, layout, color) {
        const s = layout.spectrum;
        const barW = s.w / this.modeCount;
        const x = s.x + (k - 0.5) * barW;
        const y = s.y + s.h - 34;
        this.spawnRing(x, y, color);
    }
}

// 初始化模拟
document.addEventListener('DOMContentLoaded', () => {
    new QuantumFieldTheorySimulation();
});

// 默认学习内容（后续可在页面“编辑”中自定义覆盖）
if (typeof DefaultContent !== 'undefined') {
    DefaultContent['quantum-field-theory'] = `# 量子场论

> **一句话版本：** 量子场论把“粒子”看成“场的量子化激发”。每个动量模式就像一个小谐振子，$a^\\dagger$ / $a$ 让它的能级一格一格地上/下。

## 0. 如何读图（快速上手）

- 上半部分曲线：场的形状 $\\phi(x,t)$（你看到的“波纹”）
- 下半部分谱条：每个动量模式的粒子数 $n_k$（条越高，说明该模式占据越多）
- 「注入强度」越高：每次 $a^\\dagger/a$ 改变的粒子数越多；注入的波包也更偏向高 $k$（更短的波长）

## 1. 场为什么比粒子更基本？

在高能世界里，粒子数不是固定的：正负电子可以产生/湮灭，能量也可以以光子的形式来回转换。要描述这种“粒子数可变”的世界，最自然的语言就是——**场**。

## 2. 模式分解：把场拆成一堆谐振子

把（比如一维的）场写成不同动量模式的叠加：

$$
\\phi(x,t)=\\sum_k \\frac{1}{\\sqrt{2\\omega_k}}\\Big(a_k\\,e^{i(kx-\\omega_k t)}+a_k^\\dagger\\,e^{-i(kx-\\omega_k t)}\\Big).
$$

对每个 $k$ 来说，它的哈密顿量像谐振子：

$$
H_k = \\omega_k\\,(n_k+\\tfrac12).
$$

所以：**$n_k$ 就是“这个模式里有多少个粒子”**（更准确地说，是该模式的占据数）。

## 3. 产生/湮灭算符：让粒子数上下跳

- $a_k^\\dagger|n_k\\rangle = \\sqrt{n_k+1}\\,|n_k+1\\rangle$
- $a_k|n_k\\rangle = \\sqrt{n_k}\\,|n_k-1\\rangle$

你会看到：当某个 $k$ 的 $n_k$ 变大时，对应的场波纹也会更显眼。

## 4. 真空涨落：就算 $n_k=0$，场也不“安静”

因为零点能 $\\tfrac12\\omega_k$，真空不是一条完全平的直线，而是会有微小的“底噪式”起伏（这和卡西米尔效应等现象相关）。

## 5. 这个页面怎么玩（建议做 3 个小实验）

1) 只给某个低 $k$ 模式加粒子数：你会看到一条“长波”  
2) 再试试高 $k$：波长变短、纹理更密  
3) 回到「真空&场」，拖动注入“波包”，观察它其实是许多 $k$ 模式一起参与的结果
`;
}
