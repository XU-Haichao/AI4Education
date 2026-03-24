/**
 * 量子场论模拟（粒子=场的局域激发）
 *
 * 这个页面用一个“玩具模型”强调直觉：
 * - 粒子不是额外的小球，而是场 φ(x,t) 上一个会跑的局域波包（激发）
 * - a† / a 的操作对应“在某个动量尺度 k 上添加/移除一个激发”
 * - 激发被移除时，能量会以更快的“辐射包 γ”形式散开（仍然是场的动态）
 */

class QuantumFieldTheorySimulation {
    constructor() {
        this.canvas = document.getElementById('qft-canvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');

        // UI state
        this.selectedMode = 8;
        this.hoverMode = null;

        // Simulation state
        this.isRunning = true;
        this.time = 0;
        this.lastFrameTs = null;

        // Model
        this.modeCount = 24;
        this.mass = 0.9; // massive excitation dispersion: ω_k = sqrt(m^2 + k^2)
        this.omega = new Float32Array(this.modeCount + 1);
        this.vacModes = [];

        this.particles = []; // {kind, x, kAbs, kSigned, omega, v, sigma, amp, phase, age, lifetime, trail}
        this.effects = [];
        this.maxParticles = 32;

        this.pointer = { x: 0, y: 0, inside: false };

        this.init();
    }

    init() {
        this.resizeCanvas();
        this.initModel();
        this.bindEvents();
        this.updateUI();

        requestAnimationFrame((ts) => this.animate(ts));

        window.addEventListener('resize', () => this.resizeCanvas());
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

    initModel() {
        for (let k = 1; k <= this.modeCount; k++) {
            this.omega[k] = Math.sqrt(this.mass * this.mass + k * k);
        }

        // A small set of vacuum "modes" to make the baseline gently shimmer.
        this.vacModes = [];
        const vacCount = 9;
        for (let i = 0; i < vacCount; i++) {
            const k = 1 + Math.floor(Math.random() * Math.min(this.modeCount, 12));
            const phase = Math.random() * Math.PI * 2;
            const amp = (0.035 + Math.random() * 0.02) / Math.sqrt(this.omega[k]);
            this.vacModes.push({ k, phase, amp });
        }

        this.updateParticleCount();
    }

    bindEvents() {
        document.getElementById('reset-btn')?.addEventListener('click', () => this.reset());
        document.getElementById('create-btn')?.addEventListener('click', () => this.createPairFromSelection());

        // Pointer handling
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
            this.hoverMode = null;
            this.canvas.style.cursor = 'default';
        });

        this.canvas.addEventListener('pointermove', (e) => {
            updatePointer(e);
            const layout = this.getLayout();
            this.hoverMode = this.getModeIndexAt(this.pointer.x, this.pointer.y, layout);
            this.canvas.style.cursor = this.hoverMode ? 'pointer' : 'crosshair';
        });

        this.canvas.addEventListener('pointerdown', (e) => {
            updatePointer(e);
            this.canvas.setPointerCapture?.(e.pointerId);

            const layout = this.getLayout();

            // Click on spectrum bars: select k
            const hitMode = this.getModeIndexAt(this.pointer.x, this.pointer.y, layout);
            if (hitMode) {
                this.selectedMode = hitMode;
                this.updateUI();
            }
        });
    }

    reset() {
        this.selectedMode = 8;
        this.hoverMode = null;
        this.time = 0;
        this.lastFrameTs = null;

        this.particles = [];
        this.effects = [];
        this.initModel();

        this.updateUI();
    }

    updateUI() {
        const creationOp = document.getElementById('creation-op');
        if (creationOp) creationOp.textContent = `a†(k=${this.selectedMode})`;

        const annihilationOp = document.getElementById('annihilation-op');
        if (annihilationOp) annihilationOp.textContent = `a(k=${this.selectedMode})（自动）`;

        this.updateParticleCount();
    }

    getActionXNorm(layout) {
        if (!this.pointer.inside) return 0.5;
        const xNorm = this.getFieldXNormAt(this.pointer.x, this.pointer.y, layout);
        return xNorm ?? 0.5;
    }

    createPairFromSelection() {
        const layout = this.getLayout();
        const x = this.getActionXNorm(layout);
        this.createPair(this.selectedMode, x);
        this.spawnRing(this.getFieldPixelX(x, layout), this.getFieldCenterY(layout), 'rgba(59, 130, 246, 0.85)');
        this.spawnSparkOnMode(this.selectedMode, layout, 'rgba(59, 130, 246, 0.95)');
    }

    // --- Particle operations -------------------------------------------------

    getMatterSigma() {
        return 0.055;
    }

    getMatterAmp() {
        return 1.05;
    }

    getPhotonSigma() {
        return 0.038;
    }

    getPhotonAmp() {
        return 0.55;
    }

    createPair(kAbs, xNorm) {
        const k = this.clampInt(kAbs, 1, this.modeCount);
        const x = this.clamp01(xNorm);

        // Momentum conservation (toy): +k and -k
        const s = Math.random() < 0.5 ? -1 : 1;
        const jitter = 0.02;
        const omega = this.omega[k];

        const sigma = this.getMatterSigma();
        const amp = this.getMatterAmp();
        const phase = Math.random() * Math.PI * 2;

        this.addParticle({
            kind: 'particle',
            x: this.clamp01(x - jitter),
            kAbs: k,
            kSigned: s * k,
            omega,
            vScale: 0.23,
            sigma,
            amp,
            phase,
            color: 'rgba(59, 130, 246, 0.95)',
            label: 'e⁻',
            lifetime: null
        });

        this.addParticle({
            kind: 'antiparticle',
            x: this.clamp01(x + jitter),
            kAbs: k,
            kSigned: -s * k,
            omega,
            vScale: 0.23,
            sigma,
            amp,
            phase: phase + Math.PI * 0.35,
            color: 'rgba(239, 68, 68, 0.95)',
            label: 'e⁺',
            lifetime: null
        });

        this.updateParticleCount();
    }

    stepAutoAnnihilation() {
        const threshold = 0.008;
        let best = null; // {pIdx, aIdx, dist, midX, kAbs}

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            if (p.kind !== 'particle') continue;
            const aIdx = this.findNearestIndex('antiparticle', p.kAbs, p.x);
            if (aIdx == null) continue;

            const a = this.particles[aIdx];
            const dist = Math.abs(p.x - a.x);
            if (dist > threshold) continue;

            if (!best || dist < best.dist) {
                best = { pIdx: i, aIdx, dist, midX: (p.x + a.x) / 2, kAbs: p.kAbs };
            }
        }

        if (!best) return false;

        const i1 = Math.max(best.pIdx, best.aIdx);
        const i0 = Math.min(best.pIdx, best.aIdx);
        this.particles.splice(i1, 1);
        this.particles.splice(i0, 1);

        this.spawnPhotons(best.midX, best.kAbs);
        this.spawnFieldRing(best.midX, 'rgba(255, 220, 120, 0.85)');
        this.spawnSparkOnMode(best.kAbs, this.getLayout(), 'rgba(255, 220, 120, 0.9)');
        this.updateParticleCount();
        return true;
    }

    findNearestIndex(kind, kAbs, xTarget) {
        const k = this.clampInt(kAbs, 1, this.modeCount);
        const x = this.clamp01(xTarget);

        let bestIdx = null;
        let bestScore = Infinity;

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            if (p.kind !== kind) continue;
            if (p.kAbs !== k) continue;

            const dx = Math.abs(p.x - x);
            const score = dx + 0.015 * (p.age || 0);
            if (score < bestScore) {
                bestScore = score;
                bestIdx = i;
            }
        }
        return bestIdx;
    }

    spawnPhotons(xNorm, kAbs) {
        // Two γ wave packets fly away (toy picture of annihilation radiation)
        const baseK = this.clampInt(kAbs + 7, 10, this.modeCount);
        const x = this.clamp01(xNorm);

        for (const dir of [-1, 1]) {
            const omega = Math.max(0.0001, baseK); // massless ω=|k|
            this.addParticle({
                kind: 'photon',
                x,
                kAbs: baseK,
                kSigned: dir * baseK,
                omega,
                vScale: 0.36,
                sigma: this.getPhotonSigma(),
                amp: this.getPhotonAmp(),
                phase: Math.random() * Math.PI * 2,
                color: 'rgba(255, 220, 120, 0.95)',
                label: 'γ',
                lifetime: 2.2
            });
        }
    }

    addParticle(spec) {
        // Keep the scene readable
        if (this.particles.length >= this.maxParticles) {
            // Prefer dropping old photons first, then the oldest matter excitation
            const photonIdx = this.particles.findIndex((p) => p.kind === 'photon');
            if (photonIdx >= 0) this.particles.splice(photonIdx, 1);
            else this.particles.shift();
        }

        const p = {
            kind: spec.kind,
            x: this.clamp01(spec.x),
            kAbs: this.clampInt(spec.kAbs, 1, this.modeCount),
            kSigned: spec.kSigned,
            omega: spec.omega,
            v: (spec.kSigned / Math.max(0.0001, spec.omega)) * spec.vScale,
            sigma: Math.max(0.015, spec.sigma),
            amp: spec.amp,
            phase: spec.phase,
            age: 0,
            lifetime: spec.lifetime,
            color: spec.color,
            label: spec.label,
            trail: []
        };
        this.particles.push(p);
        this.updateParticleCount();
    }

    getCounts() {
        let particle = 0;
        let antiparticle = 0;
        let photon = 0;
        for (const p of this.particles) {
            if (p.kind === 'particle') particle++;
            else if (p.kind === 'antiparticle') antiparticle++;
            else if (p.kind === 'photon') photon++;
        }
        return { particle, antiparticle, photon };
    }

    updateParticleCount() {
        const el = document.getElementById('particle-count');
        if (!el) return;
        const { particle } = this.getCounts();
        el.textContent = String(particle);
    }

    // --- Animation ----------------------------------------------------------

    animate(ts) {
        if (!this.isRunning) return;

        if (this.lastFrameTs == null) this.lastFrameTs = ts;
        const dt = Math.min(0.04, Math.max(0.001, (ts - this.lastFrameTs) / 1000));
        this.lastFrameTs = ts;
        this.time += dt;

        this.update(dt);
        this.render();

        requestAnimationFrame((nextTs) => this.animate(nextTs));
    }

    update(dt) {
        // particles
        for (const p of this.particles) {
            p.age += dt;

            // keep a short trail for "particle-ness"
            p.trail.push({ x: p.x });
            if (p.trail.length > 26) p.trail.shift();

            p.x += p.v * dt;
            if (p.x < 0) {
                p.x = -p.x;
                p.v *= -1;
                p.kSigned *= -1;
            } else if (p.x > 1) {
                p.x = 2 - p.x;
                p.v *= -1;
                p.kSigned *= -1;
            }
        }

        // decay photon packets
        this.particles = this.particles.filter((p) => !(p.lifetime != null && p.age > p.lifetime));

        // auto annihilation when particle meets antiparticle
        this.stepAutoAnnihilation();

        // effects
        for (const e of this.effects) e.age += dt;
        this.effects = this.effects.filter((e) => e.age < e.lifetime);

        this.updateParticleCount();
    }

    // --- Rendering ----------------------------------------------------------

    render() {
        const ctx = this.ctx;
        const layout = this.getLayout();

        // Background
        ctx.clearRect(0, 0, this.width, this.height);
        const bg = ctx.createLinearGradient(0, 0, 0, this.height);
        bg.addColorStop(0, 'rgba(8, 10, 30, 0.96)');
        bg.addColorStop(1, 'rgba(2, 6, 23, 0.99)');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, this.width, this.height);

        const fieldData = this.drawField(layout);
        this.drawParticles(layout, fieldData);
        this.drawSpectrum(layout);
        this.drawEffects();
        this.drawHeader(layout);
    }

    drawField(layout) {
        const ctx = this.ctx;
        const f = layout.field;

        const samples = Math.min(520, Math.max(220, Math.floor(f.w)));
        const values = new Float32Array(samples);

        for (let i = 0; i < samples; i++) {
            const xNorm = samples === 1 ? 0.5 : i / (samples - 1);
            const phaseX = xNorm * Math.PI * 2;

            // Vacuum background
            let phi = 0;
            for (const vm of this.vacModes) {
                phi += vm.amp * Math.cos(vm.k * phaseX - this.omega[vm.k] * this.time + vm.phase);
            }

            // Particle excitations = localized packets
            for (const p of this.particles) {
                const dx = xNorm - p.x;
                const env = Math.exp(-(dx * dx) / (2 * p.sigma * p.sigma));
                phi += (p.amp / Math.sqrt(p.omega)) * env * Math.cos(p.kSigned * phaseX - p.omega * this.time + p.phase);
            }

            values[i] = phi;
        }

        const centerY = this.getFieldCenterY(layout);
        const scale = f.h * 0.42;

        // Fill under curve
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(f.x, centerY);
        for (let i = 0; i < samples; i++) {
            const x = f.x + (i / (samples - 1)) * f.w;
            const y = centerY - values[i] * scale;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(f.x + f.w, centerY);
        ctx.closePath();

        const fill = ctx.createLinearGradient(0, f.y, 0, f.y + f.h);
        fill.addColorStop(0, 'rgba(168, 85, 247, 0.11)');
        fill.addColorStop(1, 'rgba(59, 130, 246, 0.04)');
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.restore();

        // Stroke curve
        ctx.save();
        ctx.beginPath();
        for (let i = 0; i < samples; i++) {
            const x = f.x + (i / (samples - 1)) * f.w;
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

        // Field cursor line
        if (this.pointer.inside) {
            const xNorm = this.getFieldXNormAt(this.pointer.x, this.pointer.y, layout);
            if (xNorm != null) {
                const x = this.pointer.x;
                ctx.save();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.beginPath();
                ctx.moveTo(x, f.y);
                ctx.lineTo(x, f.y + f.h);
                ctx.stroke();
                ctx.restore();
            }
        }

        return { values, samples, centerY, scale };
    }

    drawParticles(layout, fieldData) {
        const ctx = this.ctx;
        const f = layout.field;
        const { values, samples, centerY, scale } = fieldData;

        const samplePhiAt = (xNorm) => {
            const t = this.clamp01(xNorm) * (samples - 1);
            const i0 = Math.floor(t);
            const frac = t - i0;
            const v0 = values[i0] ?? 0;
            const v1 = values[Math.min(samples - 1, i0 + 1)] ?? v0;
            return v0 * (1 - frac) + v1 * frac;
        };

        const toPxX = (xNorm) => f.x + this.clamp01(xNorm) * f.w;

        for (const p of this.particles) {
            const px = toPxX(p.x);
            const py = centerY - samplePhiAt(p.x) * scale;

            // Envelope glow (so users see it's "field localized")
            ctx.save();
            const glowW = Math.max(18, p.sigma * f.w * 2.6);
            const grad = ctx.createRadialGradient(px, py, 0, px, py, glowW);
            grad.addColorStop(0, p.color.replace('0.95', '0.28'));
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(px, py, glowW, glowW * 0.55, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Trail
            if (p.trail.length > 1) {
                ctx.save();
                ctx.strokeStyle = p.color.replace('0.95', '0.25');
                ctx.lineWidth = 2;
                ctx.beginPath();
                for (let i = 0; i < p.trail.length; i++) {
                    const tx = toPxX(p.trail[i].x);
                    const ty = centerY - samplePhiAt(p.trail[i].x) * scale;
                    if (i === 0) ctx.moveTo(tx, ty);
                    else ctx.lineTo(tx, ty);
                }
                ctx.stroke();
                ctx.restore();
            }

            // Particle dot
            const size = p.kind === 'photon' ? 4.5 : 7.5;
            ctx.save();
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 18;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fill();

            // Direction arrow
            const dir = Math.sign(p.kSigned) || 1;
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.beginPath();
            ctx.moveTo(px + dir * (size + 3), py);
            ctx.lineTo(px + dir * (size - 2), py - 3);
            ctx.lineTo(px + dir * (size - 2), py + 3);
            ctx.closePath();
            ctx.fill();

            // Label
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = 'bold 11px Inter, Noto Sans SC, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(p.label, px, py - 14);

            ctx.restore();
        }
    }

    drawSpectrum(layout) {
        const ctx = this.ctx;
        const s = layout.spectrum;
        const barW = s.w / this.modeCount;
        const maxH = Math.max(10, s.h - 26);

        const counts = new Array(this.modeCount + 1).fill(0);
        for (const p of this.particles) {
            if (p.kind !== 'particle') continue;
            counts[p.kAbs] += 1;
        }

        ctx.save();
        ctx.font = '12px Inter, Noto Sans SC, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';

        const maxN = 12;

        for (let k = 1; k <= this.modeCount; k++) {
            const x = s.x + (k - 1) * barW;
            const n = counts[k];

            const norm = Math.log1p(Math.min(n, maxN)) / Math.log1p(maxN);
            const h = norm * maxH;
            const y = s.y + s.h - 18 - h;

            const isSelected = k === this.selectedMode;
            const isHover = k === this.hoverMode;

            const baseColor = isSelected ? 'rgba(59, 130, 246, 0.95)' : 'rgba(168, 85, 247, 0.75)';
            const color = isHover ? 'rgba(255, 255, 255, 0.85)' : baseColor;

            ctx.fillStyle = color;
            ctx.fillRect(x + 2, y, barW - 4, h);

            ctx.strokeStyle = isSelected ? 'rgba(255, 255, 255, 0.65)' : 'rgba(255, 255, 255, 0.18)';
            ctx.lineWidth = isSelected ? 2 : 1;
            ctx.strokeRect(x + 2, y, barW - 4, h);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fillText(`k${k}`, x + barW / 2, s.y + s.h - 4);

            if ((isSelected || isHover) && n > 0) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
                ctx.fillText(`${n}`, x + barW / 2, y - 6);
            }
        }

        // Spectrum title (inside canvas)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.font = '12px Inter, Noto Sans SC, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('动量模式占据 nₖ（条高=该 k 的粒子对数）', s.x + 6, s.y + 6);

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
        const modeText = '点击谱条选 k；点 a†：成对产生 e⁻/e⁺；e⁻ 与 e⁺ 接近时自动湮灭 → γ';

        const counts = this.getCounts();
        const k = this.selectedMode;

        // Count for selected k
        let nk = 0;
        for (const p of this.particles) {
            if (p.kind === 'particle' && p.kAbs === k) nk++;
        }

        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
        ctx.font = '14px Inter, Noto Sans SC, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(modeText, this.width / 2, 12);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.font = '12px Inter, Noto Sans SC, sans-serif';
        ctx.fillText(`选中：k=${k}  nₖ=${nk}  ω≈${this.omega[k].toFixed(2)}   |   e⁻=${counts.particle}  e⁺=${counts.antiparticle}  γ=${counts.photon}`, this.width / 2, 32);
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

        const field = { x: pad, y: headerH, w, h: Math.max(1, fieldH) };
        const spectrum = { x: pad, y: field.y + field.h + gap, w, h: Math.max(1, spectrumH) };

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

    spawnFieldRing(xNorm, rgba) {
        const layout = this.getLayout();
        this.spawnRing(this.getFieldPixelX(xNorm, layout), this.getFieldCenterY(layout), rgba);
    }

    spawnSparkOnMode(k, layout, color) {
        const s = layout.spectrum;
        const barW = s.w / this.modeCount;
        const x = s.x + (k - 0.5) * barW;
        const y = s.y + s.h - 34;
        this.spawnRing(x, y, color);
    }

    // --- utils ---------------------------------------------------------------

    clamp01(x) {
        return Math.max(0, Math.min(1, x));
    }

    clampInt(v, min, max) {
        return Math.max(min, Math.min(max, Math.floor(v)));
    }
}

// 初始化模拟
document.addEventListener('DOMContentLoaded', () => {
    new QuantumFieldTheorySimulation();
});

// 默认学习内容（后续可在页面“编辑”中自定义覆盖）
if (typeof DefaultContent !== 'undefined') {
    DefaultContent['quantum-field-theory'] = `# 量子场论

> **核心直觉：** 粒子不是“附加的小球”，而是场 $\\phi(x,t)$ 的一种**局域激发**。这个页面里每个发光点，都对应场上的一个局域波包。

## 0. 如何读图（30 秒上手）

- 上半部分曲线：场的形状 $\\phi(x,t)$（真空也会有轻微起伏）
- 发光点：一个“会跑的局域波包”——把它当作**粒子（场的激发）**（蓝：$e^-$，红：$e^+$）
- 下半部分谱条：按动量尺度分组的占据数 $n_k$（条越高，说明该 $k$ 上的粒子对越多）

## 1. 从“场”到“粒子”：模式=谐振子

把场分解成动量模式：

$$
\\phi(x,t)=\\sum_k \\frac{1}{\\sqrt{2\\omega_k}}\\Big(a_k\\,e^{i(kx-\\omega_k t)}+a_k^\\dagger\\,e^{-i(kx-\\omega_k t)}\\Big).
$$

每个 $k$ 模式都像一个量子谐振子，能级由占据数 $n_k$ 决定：

$$
H_k = \\omega_k\\,(n_k+\\tfrac12).
$$

## 2. 产生 / 湮灭：让占据数离散地改变

- $a_k^\\dagger|n_k\\rangle = \\sqrt{n_k+1}\\,|n_k+1\\rangle$（创建一个激发）
- $a_k|n_k\\rangle = \\sqrt{n_k}\\,|n_k-1\\rangle$（移除一个激发）

在这个玩具演示里，我们把“激发”画成一个会移动的局域波包，让你直观看到：**粒子就是场的激发**。

## 3. 建议做的 3 个小实验

1) 选低 $k$，点击一次 $a^\\dagger$：观察一对 $e^- / e^+$ 如何从场中出现  
2) 选高 $k$ 再来一次：波包内部“波长更短”、运动更快  
3) 观察当 $e^-$ 与 $e^+$ 靠近时的自动湮灭：释放两束 $\\gamma$ 辐射包
`;
}
