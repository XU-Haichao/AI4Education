/**
 * 汤姆孙模型交互模拟（重做：更接近真实阴极射线实验）
 *
 * 左侧：阴极射线实验 - 电子枪 -> 偏转区(E/B) -> 荧光屏
 * 右侧：葡萄干布丁模型 - 电子在正电荷“布丁”中振动
 */

class ThomsonSimulation {
    constructor() {
        this.cathodeCanvas = document.getElementById('cathode-ray-canvas');
        this.cathodeCtx = this.cathodeCanvas?.getContext('2d');

        this.puddingCanvas = document.getElementById('plum-pudding-canvas');
        this.puddingCtx = this.puddingCanvas?.getContext('2d');

        if (!this.cathodeCanvas || !this.cathodeCtx || !this.puddingCanvas || !this.puddingCtx) return;

        // Physical constants
        this.E_CHARGE = 1.602176634e-19; // C
        this.E_MASS = 9.10938356e-31; // kg
        this.Q = -this.E_CHARGE; // electron charge

        // Apparatus geometry (meters)
        this.dPlate = 0.01; // 1.0 cm
        this.LField = 0.06; // 6 cm
        this.DDrift = 0.12; // 12 cm
        this.yHalf = 0.04; // 4 cm (visible half-height)
        this.fieldVisualScale = 1.3;

        // Tube coordinate system
        this.fieldStartX = 0.08; // 8 cm from gun to field start
        this.fieldEndX = this.fieldStartX + this.LField;
        this.screenX = this.fieldEndX + this.DDrift;
        this.tubeLength = this.screenX + 0.02; // margin after screen

        // UI state (normalized knobs)
        this.Va = 100;
        this.kVd = 0;
        this.kB = 0;
        this.Vd = 0;
        this.Bz = 0; // Tesla
        this.Ey = 0; // V/m
        this.v0 = 0; // m/s
        this.eEnabled = true;
        this.bEnabled = true;

        // Simulation state
        this.electrons = [];
        this.puddingElectrons = [];
        this.emitTimer = null;
        this.lastEmit = 0;
        this.emitIntervalBase = 45;
        this.emitInterval = 45;
        this.emitVRef = this.vFromVa(100);
        this.lastImpactY = 0;

        // Guide trajectory
        this.guideDirty = true;
        this.guidePoints = [];

        this.init();
    }

    init() {
        this.resizeCanvases();
        this.initPuddingElectrons();
        this.bindEvents();
        this.applyVa();
        this.animate();
    }

    // ----- UI helpers -----

    formatScientificSuperscript(value, digits = 2) {
        if (!isFinite(value) || value === 0) return '0';
        const exp = Math.floor(Math.log10(Math.abs(value)));
        const mant = value / Math.pow(10, exp);
        const m = mant.toFixed(digits).replace(/(\.\d)0+$/, '$1').replace(/\.0+$/, '');

        const map = {
            '-': '\u207B',
            '0': '\u2070',
            '1': '\u00B9',
            '2': '\u00B2',
            '3': '\u00B3',
            '4': '\u2074',
            '5': '\u2075',
            '6': '\u2076',
            '7': '\u2077',
            '8': '\u2078',
            '9': '\u2079'
        };
        const expSup = String(exp).split('').map(ch => map[ch] ?? ch).join('');
        return `${m}×10${expSup}`;
    }

    vFromVa(Va) {
        return Math.sqrt((2 * this.E_CHARGE * Va) / this.E_MASS);
    }

    getVdMax(Va) {
        // Calibrated: at Va=500V, Vd_max ≈ 75V gives 3/5 touch edge.
        return 75 * (Va / 500);
    }

    getBMaxTesla(Va) {
        // Calibrated: at Va=500V, B_max ≈ 0.56 mT gives 3/5 touch edge.
        const bMax_mT = 0.56 * Math.sqrt(Va / 500);
        return bMax_mT * 1e-3;
    }

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    // ----- Resize / DPR -----

    resizeCanvases() {
        const resizeCanvas = (canvas) => {
            const rect = canvas.parentElement.getBoundingClientRect();
            const dpr = Math.max(1, window.devicePixelRatio || 1);
            canvas.width = Math.floor(rect.width * dpr);
            canvas.height = Math.floor(rect.height * dpr);
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;
            return dpr;
        };

        const dpr1 = resizeCanvas(this.cathodeCanvas);
        this.cathodeCtx.setTransform(dpr1, 0, 0, dpr1, 0, 0);

        const dpr2 = resizeCanvas(this.puddingCanvas);
        this.puddingCtx.setTransform(dpr2, 0, 0, dpr2, 0, 0);

        window.addEventListener('resize', () => {
            const d1 = resizeCanvas(this.cathodeCanvas);
            this.cathodeCtx.setTransform(d1, 0, 0, d1, 0, 0);

            const d2 = resizeCanvas(this.puddingCanvas);
            this.puddingCtx.setTransform(d2, 0, 0, d2, 0, 0);

            this.initPuddingElectrons();
            this.guideDirty = true;
        });
    }

    // ----- Pudding model -----

    initPuddingElectrons() {
        this.puddingElectrons = [];
        const w = this.puddingCanvas.clientWidth;
        const h = this.puddingCanvas.clientHeight;
        const centerX = w / 2;
        const centerY = h / 2;
        const radius = Math.min(w, h) * 0.35;

        const electronCount = 8;
        for (let i = 0; i < electronCount; i++) {
            const angle = (i / electronCount) * Math.PI * 2;
            const r = radius * (0.3 + Math.random() * 0.5);
            this.puddingElectrons.push({
                baseX: centerX + Math.cos(angle) * r,
                baseY: centerY + Math.sin(angle) * r,
                x: 0,
                y: 0,
                phase: Math.random() * Math.PI * 2,
                frequency: 0.02 + Math.random() * 0.02,
                amplitude: 5 + Math.random() * 10
            });
        }
    }

    updatePuddingModel() {
        this.puddingElectrons.forEach(e => {
            e.phase += e.frequency;
            e.x = e.baseX + Math.sin(e.phase) * e.amplitude;
            e.y = e.baseY + Math.cos(e.phase * 1.3) * e.amplitude * 0.8;
        });
    }

    drawPuddingModel() {
        const ctx = this.puddingCtx;
        const w = this.puddingCanvas.clientWidth;
        const h = this.puddingCanvas.clientHeight;
        const centerX = w / 2;
        const centerY = h / 2;
        const radius = Math.min(w, h) * 0.35;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(0, 0, w, h);

        const puddingGradient = ctx.createRadialGradient(
            centerX - radius * 0.3, centerY - radius * 0.3, 0,
            centerX, centerY, radius
        );
        puddingGradient.addColorStop(0, 'rgba(245, 158, 11, 0.6)');
        puddingGradient.addColorStop(0.5, 'rgba(245, 158, 11, 0.3)');
        puddingGradient.addColorStop(1, 'rgba(245, 158, 11, 0.1)');

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = puddingGradient;
        ctx.fill();

        ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = 'rgba(245, 158, 11, 0.4)';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const r = radius * (0.3 + (i % 3) * 0.25);
            const x = centerX + Math.cos(angle) * r;
            const y = centerY + Math.sin(angle) * r;
            ctx.fillText('+', x, y);
        }

        this.puddingElectrons.forEach(e => {
            const gradient = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, 14);
            gradient.addColorStop(0, 'rgba(34, 211, 238, 0.85)');
            gradient.addColorStop(0.5, 'rgba(34, 211, 238, 0.25)');
            gradient.addColorStop(1, 'transparent');

            ctx.beginPath();
            ctx.arc(e.x, e.y, 14, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(e.x, e.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#22d3ee';
            ctx.fill();

            ctx.fillStyle = '#0a0a14';
            ctx.font = 'bold 10px Arial';
            ctx.fillText('−', e.x, e.y);
        });

        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('正电荷均匀分布的球体', centerX, h - 30);
        ctx.fillText('(布丁)', centerX, h - 12);
    }

    // ----- Cathode ray tube sim -----

    applyVa() {
        // Acceleration voltage is fixed for this simulation.
        this.Va = 100;
        this.v0 = this.vFromVa(this.Va);
        this.updateEmitInterval();

        const vdMax = this.getVdMax(this.Va);
        const bMaxT = this.getBMaxTesla(this.Va);

        // Keep normalized knobs stable across Va changes
        this.Vd = this.kVd * vdMax;
        this.Bz = this.kB * bMaxT;
        this.Ey = this.Vd / this.dPlate;

        // Update slider ranges & values
        const vdSlider = document.getElementById('vd-slider');
        const bSlider = document.getElementById('b-slider');

        if (vdSlider) {
            vdSlider.min = String(-vdMax);
            vdSlider.max = String(vdMax);
            vdSlider.value = this.Vd.toFixed(1);
        }
        if (bSlider) {
            const bMax_mT = bMaxT * 1e3;
            bSlider.min = String(-bMax_mT);
            bSlider.max = String(bMax_mT);
            bSlider.value = String(this.Bz * 1e3);
        }

        this.electrons = [];
        this.lastImpactY = 0;
        this.updateUI();
        this.guideDirty = true;
    }

    updateEmitInterval() {
        if (!isFinite(this.v0) || this.v0 <= 0) {
            this.emitInterval = this.emitIntervalBase;
            return;
        }
        const ratio = this.emitVRef / this.v0;
        const interval = this.emitIntervalBase * ratio;
        this.emitInterval = this.clamp(interval, 15, 120);
    }

    updateUI() {
        const setText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        setText('v-value', `${this.formatScientificSuperscript(this.v0, 2)} m/s`);
        setText('vd-value', `${this.Vd.toFixed(1)} V`);
        setText('e-value', `${Math.round(this.Ey)} V/m`);
        setText('b-value', `${(this.Bz * 1e3).toFixed(2)} mT`);

        setText('v-result', (this.v0 / 1e6).toFixed(2));
        setText('e-result', `${Math.round(this.Ey)}`);
        setText('b-result', `${(this.Bz * 1e3).toFixed(2)}`);
    }

    bindEvents() {
        const vdSlider = document.getElementById('vd-slider');
        const bSlider = document.getElementById('b-slider');
        const eEnabled = document.getElementById('e-enabled');
        const bEnabled = document.getElementById('b-enabled');

        vdSlider?.addEventListener('input', () => {
            const vd = parseFloat(vdSlider.value);
            const vdMax = this.getVdMax(this.Va);
            this.Vd = this.clamp(vd, -vdMax, vdMax);
            this.kVd = vdMax === 0 ? 0 : this.Vd / vdMax;
            this.Ey = this.Vd / this.dPlate;
            this.updateUI();
            this.guideDirty = true;
        });

        bSlider?.addEventListener('input', () => {
            const b_mT = parseFloat(bSlider.value);
            const bMaxT = this.getBMaxTesla(this.Va);
            const bMax_mT = bMaxT * 1e3;
            const bClamped_mT = this.clamp(b_mT, -bMax_mT, bMax_mT);
            this.Bz = bClamped_mT * 1e-3;
            this.kB = bMaxT === 0 ? 0 : this.Bz / bMaxT;
            this.updateUI();
            this.guideDirty = true;
        });

        eEnabled?.addEventListener('change', () => {
            this.eEnabled = !!eEnabled.checked;
            this.guideDirty = true;
        });

        bEnabled?.addEventListener('change', () => {
            this.bEnabled = !!bEnabled.checked;
            this.guideDirty = true;
        });

        document.getElementById('reset-btn')?.addEventListener('click', () => {
            this.resetAll();
        });

        document.getElementById('balance-btn')?.addEventListener('click', () => {
            // Balance: E = vB (magnitude)
            if (!this.eEnabled || !this.bEnabled || this.Bz === 0) return;
            const vdMax = this.getVdMax(this.Va);
            const vd = this.v0 * this.Bz * this.dPlate;
            this.Vd = this.clamp(vd, -vdMax, vdMax);
            this.kVd = vdMax === 0 ? 0 : this.Vd / vdMax;
            this.Ey = this.Vd / this.dPlate;

            const vdSlider2 = document.getElementById('vd-slider');
            if (vdSlider2) vdSlider2.value = this.Vd.toFixed(1);

            this.updateUI();
            this.guideDirty = true;
        });

        // Auto-emit runs continuously.
    }

    resetAll() {
        this.kVd = 0;
        this.kB = 0;
        this.eEnabled = true;
        this.bEnabled = true;
        const eEnabled = document.getElementById('e-enabled');
        const bEnabled = document.getElementById('b-enabled');
        if (eEnabled) eEnabled.checked = true;
        if (bEnabled) bEnabled.checked = true;

        this.electrons = [];
        this.lastImpactY = 0;
        const defEl = document.getElementById('deflection-value');
        if (defEl) defEl.textContent = '0.0';

        this.applyVa();
    }

    emitElectron() {
        const y0 = 0;
        const vy0 = 0;
        this.electrons.push({
            x: 0.03,
            y: y0,
            vx: this.v0,
            vy: vy0,
            age: 0,
            trail: []
        });

        if (this.electrons.length > 140) this.electrons.splice(0, this.electrons.length - 140);
    }

    integrateElectron(p, dt) {
        let Ey = 0;
        let Bz = 0;
        if (p.x >= this.fieldStartX && p.x <= this.fieldEndX) {
            if (this.eEnabled) Ey = this.Ey;
            if (this.bEnabled) Bz = this.Bz;
        }

        const qOverM = this.Q / this.E_MASS;
        const ax = qOverM * (p.vy * Bz);
        const ay = qOverM * (Ey - p.vx * Bz);

        p.vx += ax * dt;
        p.vy += ay * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
    }

    updateCathodeRay() {
        const dt = 1e-10;
        const steps = 100;

        for (let i = this.electrons.length - 1; i >= 0; i--) {
            const p = this.electrons[i];
            for (let s = 0; s < steps; s++) {
                this.integrateElectron(p, dt);
                if (p.x >= this.screenX) break;
            }

            p.age += dt * steps;
            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > 10) p.trail.shift();

            if (p.x >= this.screenX) {
                this.electrons.splice(i, 1);
                continue;
            }

            if (p.x > this.tubeLength + 0.05 || Math.abs(p.y) > this.yHalf * 3) {
                this.electrons.splice(i, 1);
            }
        }

        const deflectionMm = this.lastImpactY * 1000;
        const defEl = document.getElementById('deflection-value');
        if (defEl) defEl.textContent = deflectionMm.toFixed(1);
    }

    recomputeGuide() {
        const pts = [];
        const p = { x: 0.03, y: 0, vx: this.v0, vy: 0 };
        const dt = 1e-10;
        const maxSteps = 1600;
        for (let i = 0; i < maxSteps; i++) {
            pts.push({ x: p.x, y: p.y });
            this.integrateElectron(p, dt);
            if (p.x >= this.screenX) break;
            if (Math.abs(p.y) > this.yHalf * 2.2) break;
        }
        this.guidePoints = pts;
        this.lastImpactY = pts.length > 0 ? pts[pts.length - 1].y : 0;
        this.guideDirty = false;
    }

    toCanvas(xm, ym) {
        const w = this.cathodeCanvas.clientWidth;
        const h = this.cathodeCanvas.clientHeight;
        const marginX = 18;
        const marginY = 16;
        const usableW = w - marginX * 2;
        const usableH = h - marginY * 2;
        const cx = marginX + (xm / this.tubeLength) * usableW;
        const cy = marginY + usableH / 2 - (ym / this.yHalf) * (usableH / 2);
        return { x: cx, y: cy };
    }

    drawRoundedRect(ctx, x, y, w, h, r) {
        if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, r);
            return;
        }
        const rr = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + rr, y);
        ctx.arcTo(x + w, y, x + w, y + h, rr);
        ctx.arcTo(x + w, y + h, x, y + h, rr);
        ctx.arcTo(x, y + h, x, y, rr);
        ctx.arcTo(x, y, x + w, y, rr);
    }

    drawCathodeRay() {
        const ctx = this.cathodeCtx;
        const w = this.cathodeCanvas.clientWidth;
        const h = this.cathodeCanvas.clientHeight;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#070711';
        ctx.fillRect(0, 0, w, h);

        // Tube area
        const tl = this.toCanvas(0, this.yHalf);
        const br = this.toCanvas(this.tubeLength, -this.yHalf);
        const tubeX = tl.x;
        const tubeY = tl.y;
        const tubeW = br.x - tl.x;
        const tubeH = br.y - tl.y;

        // Glass tube
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
        ctx.lineWidth = 1;
        this.drawRoundedRect(ctx, tubeX, tubeY, tubeW, tubeH, 14);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Centerline
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        const c1 = this.toCanvas(0, 0);
        const c2 = this.toCanvas(this.tubeLength, 0);
        ctx.moveTo(c1.x, c1.y);
        ctx.lineTo(c2.x, c2.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Electron gun
        const gun = this.toCanvas(0.03, 0);
        ctx.save();
        const gunX = gun.x - 16;
        const gunY = gun.y - 18;
        const gunW = 26;
        const gunH = 36;

        // Gun body
        ctx.fillStyle = 'rgba(99, 102, 241, 0.25)';
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.55)';
        ctx.lineWidth = 1.5;
        this.drawRoundedRect(ctx, gunX, gunY, gunW, gunH, 10);
        ctx.fill();
        ctx.stroke();

        // Cathode (negative) - blue electrode plate at left edge
        ctx.fillStyle = 'rgba(59, 130, 246, 0.85)';
        ctx.fillRect(gunX + 2, gunY + 4, 4, gunH - 8);

        // Anode (positive) - red electrode plate with opening at right edge
        ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
        const anodeX = gunX + gunW - 6;
        const anodeW = 4;
        const gapH = 10;
        const gapY = gunY + (gunH - gapH) / 2;
        ctx.fillRect(anodeX, gunY + 4, anodeW, gapY - (gunY + 4));
        ctx.fillRect(anodeX, gapY + gapH, anodeW, (gunY + gunH - 4) - (gapY + gapH));

        ctx.restore();

        // Slit (collimator)
        const slit = this.toCanvas(0.055, 0);
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.fillRect(slit.x - 2, tubeY + 6, 4, tubeH - 12);
        ctx.restore();

        // Field region bounds (visual only)
        const visualExtra = this.LField * (this.fieldVisualScale - 1);
        const drawFieldStartX = this.clamp(this.fieldStartX - visualExtra / 2, 0, this.fieldEndX);
        const drawFieldEndX = this.clamp(this.fieldEndX + visualExtra / 2, this.fieldStartX, this.tubeLength);
        const fs = this.toCanvas(drawFieldStartX, this.yHalf);
        const fe = this.toCanvas(drawFieldEndX, -this.yHalf);

        // Deflection plates (E)
        const plateTopY = this.toCanvas(0, this.yHalf * 0.80).y;
        const plateBotY = this.toCanvas(0, -this.yHalf * 0.80).y;
        ctx.save();
        const neutralPlate = 'rgba(255, 255, 255, 0.06)';
        let topPlate = neutralPlate;
        let bottomPlate = neutralPlate;
        if (this.eEnabled) {
            if (this.Vd >= 0) {
                topPlate = 'rgba(239, 68, 68, 0.30)';
                bottomPlate = 'rgba(59, 130, 246, 0.30)';
            } else {
                topPlate = 'rgba(59, 130, 246, 0.30)';
                bottomPlate = 'rgba(239, 68, 68, 0.30)';
            }
        }
        ctx.fillStyle = topPlate;
        ctx.fillRect(fs.x + 8, plateTopY - 4, (fe.x - fs.x) - 16, 8);
        ctx.fillStyle = bottomPlate;
        ctx.fillRect(fs.x + 8, plateBotY - 4, (fe.x - fs.x) - 16, 8);
        ctx.restore();

        // E-field direction arrows (visual only)
        if (this.eEnabled && this.Vd !== 0) {
            const vdMax = this.getVdMax(this.Va);
            const intensity = vdMax === 0 ? 0 : Math.min(1, Math.abs(this.Vd) / vdMax);
            const minArrows = 2;
            const maxArrows = 6;
            const stepLevels = maxArrows - minArrows;
            const arrowCount = Math.max(
                minArrows,
                Math.min(maxArrows, minArrows + Math.floor(intensity * (stepLevels + 1)))
            );

            const arrowLeft = fs.x + 8;
            const arrowRight = fe.x - 8;
            const arrowSpan = Math.max(1, arrowRight - arrowLeft);
            const step = arrowSpan / arrowCount;

            const dir = this.Vd > 0 ? 1 : -1; // +Vd: field downward, -Vd: upward
            const startY = dir > 0 ? plateTopY + 2 : plateBotY - 2;
            const endY = dir > 0 ? plateBotY - 2 : plateTopY + 2;
            const head = 6;

            const drawArrow = (x) => {
                ctx.beginPath();
                ctx.moveTo(x, startY);
                ctx.lineTo(x, endY);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x - head, endY - dir * head);
                ctx.lineTo(x, endY);
                ctx.lineTo(x + head, endY - dir * head);
                ctx.fill();
            };

            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
            ctx.lineWidth = 1.6;
            for (let i = 0; i < arrowCount; i++) {
                const x = arrowLeft + (i + 0.5) * step;
                drawArrow(x);
            }
            ctx.restore();
        }

        // B symbols
        ctx.save();
        if (this.bEnabled && this.Bz !== 0) {
            const bMaxT = this.getBMaxTesla(this.Va);
            const bIntensity = bMaxT === 0 ? 0 : Math.min(1, Math.abs(this.Bz) / bMaxT);
            const symbol = this.Bz > 0 ? '⊙' : '⊗';
            ctx.fillStyle = 'rgba(168, 85, 247, 0.40)';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            const bLeft = fs.x + 12;
            const bRight = fe.x - 2;
            const bTop = plateTopY + 18;
            const bBottom = plateBotY + 6;
            const bMinStepX = 22;
            const bMinStepY = 20;
            const bMaxStepX = 72;
            const bMaxStepY = 62;
            const bStepLevels = 3;
            const bStepIndex = Math.min(bStepLevels, Math.floor(bIntensity * (bStepLevels + 1)));
            const stepX = bMaxStepX - ((bMaxStepX - bMinStepX) * bStepIndex) / bStepLevels;
            const stepY = bMaxStepY - ((bMaxStepY - bMinStepY) * bStepIndex) / bStepLevels;
            for (let x = bLeft; x < bRight; x += stepX) {
                for (let y = bTop; y < bBottom; y += stepY) {
                    ctx.fillText(symbol, x, y);
                }
            }
        }
        ctx.restore();

        // Screen
        const sc = this.toCanvas(this.screenX, 0);
        ctx.save();
        const screenGrad = ctx.createLinearGradient(sc.x - 10, 0, sc.x + 10, 0);
        screenGrad.addColorStop(0, 'rgba(34, 211, 238, 0.10)');
        screenGrad.addColorStop(1, 'rgba(34, 211, 238, 0.02)');
        ctx.fillStyle = screenGrad;
        ctx.fillRect(sc.x - 8, tubeY + 6, 16, tubeH - 12);

        // Grid on screen region
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.10)';
        ctx.lineWidth = 1;
        for (let dy = -0.04; dy <= 0.04; dy += 0.01) {
            const p1 = this.toCanvas(this.screenX, dy);
            ctx.beginPath();
            ctx.moveTo(sc.x - 8, p1.y);
            ctx.lineTo(sc.x + 8, p1.y);
            ctx.stroke();
        }
        ctx.restore();

        // Guide trajectory (steady beam)
        if (this.guideDirty) this.recomputeGuide();
        ctx.save();
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.38)';
        ctx.lineWidth = 2.2;
        ctx.shadowColor = 'rgba(34, 211, 238, 0.30)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        this.guidePoints.forEach((pt, idx) => {
            const c = this.toCanvas(pt.x, pt.y);
            if (idx === 0) ctx.moveTo(c.x, c.y);
            else ctx.lineTo(c.x, c.y);
        });
        ctx.stroke();
        ctx.restore();

        // Screen spot (constant brightness)
        const spot = this.toCanvas(this.screenX, this.lastImpactY);
        ctx.save();
        ctx.fillStyle = 'rgba(34, 211, 238, 0.55)';
        ctx.beginPath();
        ctx.arc(spot.x, spot.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Labels
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const labelY = Math.max(6, tubeY + 4);
        const gunLabelY = Math.max(6, gun.y - 36);
        ctx.fillText('电子枪', gun.x - 22, gunLabelY);
        ctx.textAlign = 'center';
        const plateLeft = fs.x + 8;
        const plateRight = fe.x - 8;
        const plateCenterX = (plateLeft + plateRight) / 2;
        ctx.fillText('偏转区', plateCenterX, labelY);
        ctx.textAlign = 'left';
        ctx.fillText('荧光屏', sc.x - 18, labelY);
        ctx.restore();
    }

    animate(timestamp = 0) {
        if (timestamp - this.lastEmit >= this.emitInterval) {
            this.emitElectron();
            this.lastEmit = timestamp;
        }
        this.updateCathodeRay();
        this.drawCathodeRay();

        this.updatePuddingModel();
        this.drawPuddingModel();

        requestAnimationFrame((t) => this.animate(t));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ThomsonSimulation();
});
