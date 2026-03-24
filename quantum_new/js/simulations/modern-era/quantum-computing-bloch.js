/**
 * 量子计算（单量子比特）：布洛赫球 + 常见量子门
 *
 * 面向非理科生的核心直觉：
 * - 布洛赫球把“一个量子比特的状态”画成球面上的一个方向（箭头）
 * - 量子门（在单比特上）就是把这根箭头旋转到新位置
 * - 只要看 Z 方向：就能得到测到 0/1 的概率
 */

class QuantumComputingBlochQubit {
    constructor() {
        this.canvas = document.getElementById('bloch-canvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');

        // Camera (world -> screen): keep |0⟩ / |1⟩ as top/bottom poles (z-axis),
        // and treat x as the "front/back" direction in this view.
        this.camAzimuth = 0; // around z
        this.camElevation = (15 * Math.PI) / 180; // small tilt for depth cue (keeps x mostly "front/back")
        this.basis = null; // {right, up, forward} computed per frame

        // State |ψ⟩ = a|0⟩ + b|1⟩
        this.state = { a: this.c(1, 0), b: this.c(0, 0) };
        this.thetaDeg = 60;
        this.phiDeg = 0;

        this.history = [];

        // UI
        this.ui = null;

        // Background dots
        this.time = 0;
        this.lastFrameTs = null;
        this.bgDots = [];

        // Animation for vector transition
        this.anim = null; // {startTs, duration, fromVec, toVec}

        // Pointer interaction
        this.layout = null; // {cx, cy, r}
        this.dragging = false;

        this.init();
    }

    init() {
        this.cacheUI();
        this.resizeCanvas();
        this.bindEvents();

        // Initialize from default angles
        this.setAngles(this.thetaDeg, this.phiDeg, { resetHistory: true, syncSliders: true });

        requestAnimationFrame((ts) => this.animate(ts));
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    cacheUI() {
        this.ui = {
            // Angle controls
            thetaSlider: document.getElementById('theta-slider'),
            thetaValue: document.getElementById('theta-value'),
            phiSlider: document.getElementById('phi-slider'),
            phiValue: document.getElementById('phi-value'),

            // Presets
            presetButtons: Array.from(document.querySelectorAll('.preset-btn[data-preset]')),

            // Gates
            gateButtons: Array.from(document.querySelectorAll('.preset-btn[data-gate]')),
            rotSlider: document.getElementById('rot-slider'),
            rotValue: document.getElementById('rot-value'),

            // Actions
            undoBtn: document.getElementById('undo-btn'),
            resetBtn: document.getElementById('reset-btn'),

            // Readouts
            p0Fill: document.getElementById('p0-fill'),
            p1Fill: document.getElementById('p1-fill'),
            p0Value: document.getElementById('p0-value'),
            p1Value: document.getElementById('p1-value'),
            blochXyz: document.getElementById('bloch-xyz'),
            ketDisplay: document.getElementById('ket-display'),
            ketBadge: document.getElementById('ket-badge')
        };
    }

    bindEvents() {
        this.ui.thetaSlider?.addEventListener('input', (e) => {
            const theta = this.clampInt(parseInt(e.target.value, 10), 0, 180);
            this.setAngles(theta, this.phiDeg, { resetHistory: true, syncSliders: false, animate: false });
        });

        this.ui.phiSlider?.addEventListener('input', (e) => {
            const phi = this.modDeg(parseInt(e.target.value, 10));
            this.setAngles(this.thetaDeg, phi, { resetHistory: true, syncSliders: false, animate: false });
        });

        this.ui.rotSlider?.addEventListener('input', (e) => {
            const deg = this.clampInt(parseInt(e.target.value, 10), -180, 180);
            if (this.ui.rotValue) this.ui.rotValue.textContent = `${deg}°`;
        });

        for (const btn of this.ui.presetButtons) {
            btn.addEventListener('click', () => {
                this.applyPreset(btn.dataset.preset);
            });
        }

        for (const btn of this.ui.gateButtons) {
            btn.addEventListener('click', () => {
                this.applyGate(btn.dataset.gate);
            });
        }

        this.ui.undoBtn?.addEventListener('click', () => this.undo());
        this.ui.resetBtn?.addEventListener('click', () => this.reset());

        // Drag on Bloch sphere to set state (Shift = back hemisphere)
        const setFromEvent = (e) => this.setStateFromPointerEvent(e);

        this.canvas.addEventListener('pointerdown', (e) => {
            if (!this.layout) return;
            const rect = this.canvas.getBoundingClientRect();
            const px = e.clientX - rect.left;
            const py = e.clientY - rect.top;
            const d = Math.hypot(px - this.layout.cx, py - this.layout.cy) / this.layout.r;
            if (d > 1.06) return;
            this.dragging = true;
            this.canvas.setPointerCapture?.(e.pointerId);
            setFromEvent(e);
        });

        this.canvas.addEventListener('pointermove', (e) => {
            if (!this.dragging) return;
            setFromEvent(e);
        });

        const endDrag = () => {
            this.dragging = false;
        };
        this.canvas.addEventListener('pointerup', endDrag);
        this.canvas.addEventListener('pointercancel', endDrag);
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
        const density = (this.width * this.height) / 16000;
        const count = Math.floor(this.clamp(density, 30, 90));
        this.bgDots = [];
        for (let i = 0; i < count; i++) {
            this.bgDots.push({
                u: Math.random(),
                v: Math.random(),
                r: 0.6 + Math.random() * 1.6,
                phase: Math.random() * Math.PI * 2,
                speed: 0.35 + Math.random() * 0.9,
                hue: 235 + Math.random() * 70
            });
        }
    }

    // ---------- State management ----------

    setAngles(thetaDeg, phiDeg, { resetHistory, syncSliders, animate } = {}) {
        this.thetaDeg = this.clamp(thetaDeg, 0, 180);
        this.phiDeg = this.modDeg(phiDeg);

        const theta = (this.thetaDeg * Math.PI) / 180;
        const phi = (this.phiDeg * Math.PI) / 180;

        const a = this.c(Math.cos(theta / 2), 0);
        const b = this.mul(this.c(Math.cos(phi), Math.sin(phi)), this.c(Math.sin(theta / 2), 0));

        this.setState(
            { a, b },
            {
                resetHistory: !!resetHistory,
                animateFromCurrent: animate !== false
            }
        );

        if (syncSliders) {
            if (this.ui.thetaSlider) this.ui.thetaSlider.value = String(Math.round(this.thetaDeg));
            if (this.ui.phiSlider) this.ui.phiSlider.value = String(Math.round(this.phiDeg));
        }
    }

    setState(nextState, { resetHistory, animateFromCurrent } = {}) {
        const prevVec = this.blochVector(this.state);

        this.state = this.normalizeState(nextState);

        const nextVec = this.blochVector(this.state);

        if (animateFromCurrent) {
            this.anim = {
                startTs: performance.now(),
                duration: 260,
                fromVec: prevVec,
                toVec: nextVec
            };
        } else {
            this.anim = null;
        }

        if (resetHistory) this.history = [];
        this.updateReadouts();
    }

    reset() {
        this.history = [];
        this.setAngles(0, 0, { resetHistory: true, syncSliders: true });
    }

    undo() {
        const prev = this.history.pop();
        if (!prev) return;
        this.setState(prev, { resetHistory: false, animateFromCurrent: true });
        this.syncAnglesFromState({ syncSliders: true });
    }

    applyPreset(name) {
        const presets = {
            zero: { theta: 0, phi: 0 }, // |0>
            one: { theta: 180, phi: 0 }, // |1>
            plus: { theta: 90, phi: 0 }, // |+>
            minus: { theta: 90, phi: 180 }, // |->
            iplus: { theta: 90, phi: 90 }, // |i+>
            iminus: { theta: 90, phi: 270 } // |i->
        };

        const p = presets[name];
        if (!p) return;
        this.setAngles(p.theta, p.phi, { resetHistory: true, syncSliders: true });
    }

    applyGate(gateName) {
        const gate = String(gateName || '').trim();
        if (!gate) return;

        const prevState = { a: this.state.a, b: this.state.b };
        this.history.push(prevState);

        const angleDeg = this.ui.rotSlider ? this.clampInt(parseInt(this.ui.rotSlider.value, 10), -180, 180) : 90;
        if (this.ui.rotValue) this.ui.rotValue.textContent = `${angleDeg}°`;

        const U = this.getGateMatrix(gate, angleDeg);
        if (!U) {
            this.history.pop();
            return;
        }

        const next = this.applyMatrix(U, this.state);
        this.setState(next, { resetHistory: false, animateFromCurrent: true });

        // After a unitary, θ/φ generally changes
        this.syncAnglesFromState({ syncSliders: true });
    }

    syncAnglesFromState({ syncSliders } = {}) {
        const { thetaDeg, phiDeg } = this.anglesFromState(this.state);
        this.thetaDeg = thetaDeg;
        this.phiDeg = phiDeg;

        if (syncSliders) {
            if (this.ui.thetaSlider) this.ui.thetaSlider.value = String(Math.round(this.thetaDeg));
            if (this.ui.phiSlider) this.ui.phiSlider.value = String(Math.round(this.phiDeg));
        }

        if (this.ui.thetaValue) this.ui.thetaValue.textContent = `${Math.round(this.thetaDeg)}°`;
        if (this.ui.phiValue) this.ui.phiValue.textContent = `${Math.round(this.phiDeg)}°`;
        if (this.ui.ketBadge) this.ui.ketBadge.textContent = `θ=${Math.round(this.thetaDeg)}°，φ=${Math.round(this.phiDeg)}°`;
    }

    updateReadouts() {
        const p0 = this.abs2(this.state.a);
        const p1 = this.abs2(this.state.b);

        if (this.ui.p0Fill) this.ui.p0Fill.style.width = `${Math.round(this.clamp(p0, 0, 1) * 100)}%`;
        if (this.ui.p1Fill) this.ui.p1Fill.style.width = `${Math.round(this.clamp(p1, 0, 1) * 100)}%`;
        if (this.ui.p0Value) this.ui.p0Value.textContent = this.formatPercent(p0);
        if (this.ui.p1Value) this.ui.p1Value.textContent = this.formatPercent(p1);

        const v = this.blochVector(this.state);
        if (this.ui.blochXyz) {
            this.ui.blochXyz.textContent = `(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`;
        }

        const ket = this.formatKet(this.state);
        if (this.ui.ketDisplay) this.ui.ketDisplay.textContent = ket;

        if (this.ui.thetaValue) this.ui.thetaValue.textContent = `${Math.round(this.thetaDeg)}°`;
        if (this.ui.phiValue) this.ui.phiValue.textContent = `${Math.round(this.phiDeg)}°`;
        if (this.ui.ketBadge) this.ui.ketBadge.textContent = `θ=${Math.round(this.thetaDeg)}°，φ=${Math.round(this.phiDeg)}°`;

        if (this.ui.undoBtn) this.ui.undoBtn.disabled = this.history.length === 0;
    }

    // ---------- Animation loop ----------

    animate(ts) {
        if (this.lastFrameTs == null) this.lastFrameTs = ts;
        const dt = Math.min(0.05, Math.max(0, (ts - this.lastFrameTs) / 1000));
        this.lastFrameTs = ts;

        this.time += dt;

        this.render(ts);
        requestAnimationFrame((t2) => this.animate(t2));
    }

    render(ts) {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.drawBackground();

        const minDim = Math.min(this.width, this.height);
        const r = Math.max(110, minDim * 0.34);
        const cx = this.width / 2;
        const cy = this.height / 2;
        this.layout = { cx, cy, r };
        this.basis = this.cameraBasis();

        this.drawSphere({ cx, cy, r });
        this.drawGreatCircles({ cx, cy, r });
        this.drawAxes({ cx, cy, r });

        const vec = this.currentDisplayVector(ts);
        this.drawStateVector({ cx, cy, r, vec });
        this.drawPoleLabels({ cx, cy, r });
    }

    currentDisplayVector(ts) {
        if (!this.anim) return this.blochVector(this.state);

        const t = (ts - this.anim.startTs) / this.anim.duration;
        if (t >= 1) {
            this.anim = null;
            return this.blochVector(this.state);
        }

        const u = this.easeInOutCubic(this.clamp(t, 0, 1));
        return this.slerpVec(this.anim.fromVec, this.anim.toVec, u);
    }

    drawBackground() {
        const g = this.ctx.createRadialGradient(
            this.width * 0.5,
            this.height * 0.35,
            60,
            this.width * 0.5,
            this.height * 0.35,
            Math.max(this.width, this.height) * 0.9
        );
        g.addColorStop(0, 'rgba(168, 85, 247, 0.12)');
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        this.ctx.fillStyle = g;
        this.ctx.fillRect(0, 0, this.width, this.height);

        for (const d of this.bgDots) {
            const x = d.u * this.width;
            const y = d.v * this.height;
            const t = this.time * d.speed + d.phase;
            const a = 0.04 + 0.05 * Math.sin(t);
            this.ctx.fillStyle = `hsla(${d.hue}, 90%, 70%, ${a})`;
            this.ctx.beginPath();
            this.ctx.arc(x, y, d.r, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawSphere({ cx, cy, r }) {
        this.ctx.save();

        // soft highlight
        const g = this.ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.2, cx, cy, r * 1.05);
        g.addColorStop(0, 'rgba(255, 255, 255, 0.10)');
        g.addColorStop(0.35, 'rgba(255, 255, 255, 0.04)');
        g.addColorStop(1, 'rgba(255, 255, 255, 0.01)');
        this.ctx.fillStyle = g;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
        this.ctx.fill();

        // outline
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
        this.ctx.stroke();

        this.ctx.restore();
    }

    drawAxes({ cx, cy, r }) {
        // In this view:
        // - z is vertical (|0⟩ up, |1⟩ down)
        // - y is left/right
        // - x is front/back (rendered with solid/dashed + ±x labels)
        this.drawAxisLine({ cx, cy, r, a: { x: 0, y: -1, z: 0 }, b: { x: 0, y: 1, z: 0 }, color: 'rgba(34,211,238,0.12)' }); // y
        this.drawAxisLine({ cx, cy, r, a: { x: 0, y: 0, z: -1 }, b: { x: 0, y: 0, z: 1 }, color: 'rgba(255,255,255,0.10)' }); // z
        this.drawXAxisPerspective({ cx, cy, r });
        this.drawAxisLabels({ cx, cy, r });
    }

    drawAxisLine({ cx, cy, r, a, b, color }) {
        const pa = this.project(a, { cx, cy, r });
        const pb = this.project(b, { cx, cy, r });
        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([6, 8]);
        this.ctx.beginPath();
        this.ctx.moveTo(pa.x, pa.y);
        this.ctx.lineTo(pb.x, pb.y);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        this.ctx.restore();
    }

    drawXAxisPerspective({ cx, cy, r }) {
        const pPlus = this.project({ x: 1, y: 0, z: 0 }, { cx, cy, r });
        const pMinus = this.project({ x: -1, y: 0, z: 0 }, { cx, cy, r });

        // Determine which end is visually in front
        const plusIsFront = pPlus.depth >= pMinus.depth;
        const front = plusIsFront ? pPlus : pMinus;
        const back = plusIsFront ? pMinus : pPlus;

        this.ctx.save();
        // Back half (dashed)
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        this.ctx.lineWidth = 1.5;
        this.ctx.setLineDash([6, 8]);
        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy);
        this.ctx.lineTo(back.x, back.y);
        this.ctx.stroke();

        // Front half (solid)
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([]);
        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy);
        this.ctx.lineTo(front.x, front.y);
        this.ctx.stroke();

        // Labels: +x / -x (keep x as front/back with perspective line styles)
        this.drawAxisTag({
            cx,
            cy,
            x: front.x,
            y: front.y,
            text: plusIsFront ? '+x' : '-x',
            emphasis: 'front'
        });
        this.drawAxisTag({
            cx,
            cy,
            x: back.x,
            y: back.y,
            text: plusIsFront ? '-x' : '+x',
            emphasis: 'back'
        });

        this.ctx.restore();
    }

    drawAxisTag({ cx, cy, x, y, text, emphasis }) {
        const dx = x - cx;
        const dy = y - cy;
        const n = Math.hypot(dx, dy) || 1;

        const ox = (dx / n) * 16;
        const oy = (dy / n) * 16;
        const tx = x + ox;
        const ty = y + oy;

        this.ctx.save();

        const isFront = emphasis === 'front';
        this.ctx.font = '12px Inter';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        const padX = 7;
        const padY = 3;
        const w = this.ctx.measureText(text).width;
        const boxW = w + padX * 2;
        const boxH = 12 + padY * 2;

        this.ctx.fillStyle = isFront ? 'rgba(0, 0, 0, 0.58)' : 'rgba(0, 0, 0, 0.40)';
        this.ctx.strokeStyle = isFront ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.10)';
        this.ctx.lineWidth = 1;
        this.roundRect(tx - boxW / 2, ty - boxH / 2, boxW, boxH, 9);
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.fillStyle = isFront ? 'rgba(255, 255, 255, 0.88)' : 'rgba(255, 255, 255, 0.62)';
        this.ctx.fillText(text, tx, ty);
        this.ctx.restore();
    }

    drawAxisLabels({ cx, cy, r }) {
        const yPos = this.project({ x: 0, y: 1, z: 0 }, { cx, cy, r });
        const yNeg = this.project({ x: 0, y: -1, z: 0 }, { cx, cy, r });

        this.ctx.save();
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
        this.ctx.font = '13px Inter';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        const place = (p, text) => {
            const dx = p.x - cx;
            const dy = p.y - cy;
            const n = Math.hypot(dx, dy) || 1;
            const ox = (dx / n) * 14;
            const oy = (dy / n) * 14;
            this.ctx.fillText(text, p.x + ox, p.y + oy);
        };
        place(yPos, '+y');
        place(yNeg, '-y');
        this.ctx.restore();
    }

    drawGreatCircles({ cx, cy, r }) {
        const circles = [
            { plane: 'equator', color: 'rgba(255,255,255,0.10)' },
            { plane: 'xz', color: 'rgba(255,255,255,0.08)' },
            { plane: 'yz', color: 'rgba(255,255,255,0.08)' }
        ];

        for (const c of circles) {
            this.drawGreatCircle({ cx, cy, r, plane: c.plane, color: c.color });
        }
    }

    drawGreatCircle({ cx, cy, r, plane, color }) {
        const steps = 120;
        const pts = [];

        for (let i = 0; i <= steps; i++) {
            const t = (i / steps) * Math.PI * 2;
            let p;
            if (plane === 'equator') p = { x: Math.cos(t), y: Math.sin(t), z: 0 };
            else if (plane === 'xz') p = { x: Math.cos(t), y: 0, z: Math.sin(t) };
            else p = { x: 0, y: Math.cos(t), z: Math.sin(t) };

            pts.push(this.project(p, { cx, cy, r }));
        }

        // Draw back then front for depth hint
        this.drawDepthPolyline(pts, { front: false, color });
        this.drawDepthPolyline(pts, { front: true, color });
    }

    drawDepthPolyline(points, { front, color }) {
        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1;

        if (!front) {
            this.ctx.strokeStyle = color.replace('0.10', '0.05').replace('0.08', '0.04');
            this.ctx.setLineDash([6, 8]);
        } else {
            this.ctx.setLineDash([]);
        }

        let started = false;
        let hasAny = false;
        this.ctx.beginPath();
        for (const p of points) {
            const isFront = p.depth >= 0;
            if ((front && !isFront) || (!front && isFront)) {
                started = false;
                continue;
            }
            if (!started) {
                this.ctx.moveTo(p.x, p.y);
                started = true;
                hasAny = true;
            } else {
                this.ctx.lineTo(p.x, p.y);
            }
        }
        if (hasAny) this.ctx.stroke();

        this.ctx.restore();
    }

    drawStateVector({ cx, cy, r, vec }) {
        const tip = this.project(vec, { cx, cy, r });

        this.ctx.save();
        this.ctx.lineWidth = 4;

        const grad = this.ctx.createLinearGradient(cx, cy, tip.x, tip.y);
        grad.addColorStop(0, 'rgba(168, 85, 247, 0.22)');
        grad.addColorStop(1, 'rgba(168, 85, 247, 1)');
        this.ctx.strokeStyle = grad;

        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy);
        this.ctx.lineTo(tip.x, tip.y);
        this.ctx.stroke();

        // arrow head
        const dx = tip.x - cx;
        const dy = tip.y - cy;
        const len = Math.max(1, Math.hypot(dx, dy));
        const ux = dx / len;
        const uy = dy / len;
        const size = 12;
        const px = -uy;
        const py = ux;

        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        this.ctx.beginPath();
        this.ctx.moveTo(tip.x, tip.y);
        this.ctx.lineTo(tip.x - ux * size + px * (size * 0.55), tip.y - uy * size + py * (size * 0.55));
        this.ctx.lineTo(tip.x - ux * size - px * (size * 0.55), tip.y - uy * size - py * (size * 0.55));
        this.ctx.closePath();
        this.ctx.fill();

        // tip glow
        const pulse = 0.6 + 0.4 * Math.sin(this.time * 2.2);
        this.ctx.shadowColor = 'rgba(168, 85, 247, 0.8)';
        this.ctx.shadowBlur = 22 * pulse;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        this.ctx.beginPath();
        this.ctx.arc(tip.x, tip.y, 6, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;

        // Label
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
        this.ctx.font = '12px Inter';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('|ψ⟩', tip.x + 10, tip.y - 12);

        this.ctx.restore();
    }

    drawPoleLabels({ cx, cy, r }) {
        const north = this.project({ x: 0, y: 0, z: 1 }, { cx, cy, r });
        const south = this.project({ x: 0, y: 0, z: -1 }, { cx, cy, r });

        this.ctx.save();
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
        this.ctx.font = '13px Inter';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('|0⟩', north.x, north.y - 14);
        this.ctx.fillText('|1⟩', south.x, south.y + 14);
        this.ctx.restore();
    }

    cameraBasis() {
        const az = this.camAzimuth;
        const el = this.camElevation;

        const forward = this.normalizeVec({
            x: Math.cos(az) * Math.cos(el),
            y: Math.sin(az) * Math.cos(el),
            z: Math.sin(el)
        });

        const worldUp = { x: 0, y: 0, z: 1 };
        let right = this.cross3(worldUp, forward);
        const rightLen = Math.hypot(right.x, right.y, right.z);
        if (rightLen < 1e-6) right = { x: 0, y: 1, z: 0 };
        right = this.normalizeVec(right);

        const up = this.cross3(forward, right);

        return { right, up, forward };
    }

    project(v, { cx, cy, r }) {
        const basis = this.basis || this.cameraBasis();
        const xCam = this.dot3(v, basis.right);
        const yCam = this.dot3(v, basis.up);
        const zCam = this.dot3(v, basis.forward);
        return { x: cx + xCam * r, y: cy - yCam * r, depth: zCam };
    }

    setStateFromPointerEvent(e) {
        if (!this.layout) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const dx = x - this.layout.cx;
        const dy = y - this.layout.cy;
        const rr = this.layout.r;

        let sx = dx / rr;
        let sy = -dy / rr;
        const d = Math.hypot(sx, sy);
        if (d > 1) {
            sx /= d;
            sy /= d;
        }

        const szAbs = Math.sqrt(Math.max(0, 1 - sx * sx - sy * sy));
        const sz = e.shiftKey ? -szAbs : szAbs;

        const basis = this.basis || this.cameraBasis();
        const v = this.normalizeVec(
            this.add3(
                this.add3(this.scale3(basis.right, sx), this.scale3(basis.up, sy)),
                this.scale3(basis.forward, sz)
            )
        );
        const theta = (Math.acos(this.clamp(v.z, -1, 1)) * 180) / Math.PI;
        let phi = (Math.atan2(v.y, v.x) * 180) / Math.PI;
        phi = this.modDeg(phi);

        this.setAngles(theta, phi, { resetHistory: true, syncSliders: true, animate: false });
    }

    // ---------- Gates ----------

    getGateMatrix(name, angleDeg) {
        const c = (re, im = 0) => this.c(re, im);
        const s2 = 1 / Math.sqrt(2);
        const i = c(0, 1);

        const gate = String(name || '').trim();

        // Fixed gates
        if (gate === 'I') return [[c(1), c(0)], [c(0), c(1)]];
        if (gate === 'X') return [[c(0), c(1)], [c(1), c(0)]];
        if (gate === 'Y') return [[c(0), this.mul(c(-1), i)], [i, c(0)]];
        if (gate === 'Z') return [[c(1), c(0)], [c(0), c(-1)]];
        if (gate === 'H') return [[c(s2), c(s2)], [c(s2), c(-s2)]];
        if (gate === 'S') return [[c(1), c(0)], [c(0), i]];
        if (gate === 'T') return [[c(1), c(0)], [c(0), this.expi(Math.PI / 4)]];

        // Rotation gates
        const ang = (angleDeg * Math.PI) / 180;
        const ca = Math.cos(ang / 2);
        const sa = Math.sin(ang / 2);

        if (gate === 'Rx') {
            // cos(a/2)I - i sin(a/2)X
            const minusI = c(0, -1);
            const off = this.mul(minusI, c(sa, 0)); // -i sin
            return [[c(ca), off], [off, c(ca)]];
        }

        if (gate === 'Ry') {
            // [[cos, -sin],[sin, cos]]
            return [[c(ca), c(-sa)], [c(sa), c(ca)]];
        }

        if (gate === 'Rz') {
            // diag(e^{-i a/2}, e^{+i a/2})
            return [[this.expi(-ang / 2), c(0)], [c(0), this.expi(ang / 2)]];
        }

        return null;
    }

    applyMatrix(U, state) {
        const a = state.a;
        const b = state.b;

        const a2 = this.add(this.mul(U[0][0], a), this.mul(U[0][1], b));
        const b2 = this.add(this.mul(U[1][0], a), this.mul(U[1][1], b));
        return { a: a2, b: b2 };
    }

    // ---------- Bloch helpers ----------

    blochVector(state) {
        const a = state.a;
        const b = state.b;
        const ab = this.mul(this.conj(a), b);
        const x = 2 * ab.re;
        const y = 2 * ab.im;
        const z = this.abs2(a) - this.abs2(b);
        return this.normalizeVec({ x, y, z });
    }

    anglesFromState(state) {
        const v = this.blochVector(state);
        const theta = Math.acos(this.clamp(v.z, -1, 1));
        let phi = Math.atan2(v.y, v.x);
        if (phi < 0) phi += Math.PI * 2;
        return {
            thetaDeg: (theta * 180) / Math.PI,
            phiDeg: (phi * 180) / Math.PI
        };
    }

    slerpVec(a, b, t) {
        const v0 = this.normalizeVec(a);
        const v1 = this.normalizeVec(b);
        const dot = this.clamp(v0.x * v1.x + v0.y * v1.y + v0.z * v1.z, -1, 1);
        const omega = Math.acos(dot);
        if (omega < 1e-6) return v1;
        const so = Math.sin(omega);
        const s0 = Math.sin((1 - t) * omega) / so;
        const s1 = Math.sin(t * omega) / so;
        return this.normalizeVec({
            x: v0.x * s0 + v1.x * s1,
            y: v0.y * s0 + v1.y * s1,
            z: v0.z * s0 + v1.z * s1
        });
    }

    normalizeVec(v) {
        const n = Math.hypot(v.x, v.y, v.z) || 1;
        return { x: v.x / n, y: v.y / n, z: v.z / n };
    }

    dot3(a, b) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }

    cross3(a, b) {
        return {
            x: a.y * b.z - a.z * b.y,
            y: a.z * b.x - a.x * b.z,
            z: a.x * b.y - a.y * b.x
        };
    }

    add3(a, b) {
        return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
    }

    scale3(v, k) {
        return { x: v.x * k, y: v.y * k, z: v.z * k };
    }

    roundRect(x, y, w, h, r) {
        const rr = Math.min(Math.max(0, r), w / 2, h / 2);
        this.ctx.beginPath();
        this.ctx.moveTo(x + rr, y);
        this.ctx.arcTo(x + w, y, x + w, y + h, rr);
        this.ctx.arcTo(x + w, y + h, x, y + h, rr);
        this.ctx.arcTo(x, y + h, x, y, rr);
        this.ctx.arcTo(x, y, x + w, y, rr);
        this.ctx.closePath();
    }

    formatKet(state) {
        const aAbs = Math.sqrt(this.abs2(state.a));
        const bAbs = Math.sqrt(this.abs2(state.b));

        // relative phase between b and a (global phase removed)
        const pa = Math.atan2(state.a.im, state.a.re);
        const pb = Math.atan2(state.b.im, state.b.re);
        let rel = ((pb - pa) * 180) / Math.PI;
        rel = ((rel % 360) + 360) % 360;

        const aTxt = aAbs.toFixed(3);
        const bTxt = bAbs.toFixed(3);
        const phTxt = `${Math.round(rel)}°`;

        return `${aTxt}|0⟩ + e^{i·${phTxt}}·${bTxt}|1⟩`;
    }

    normalizeState(state) {
        const n = Math.sqrt(this.abs2(state.a) + this.abs2(state.b)) || 1;
        return { a: this.scale(state.a, 1 / n), b: this.scale(state.b, 1 / n) };
    }

    // ---------- Complex helpers ----------

    c(re, im = 0) {
        return { re, im };
    }

    add(a, b) {
        return { re: a.re + b.re, im: a.im + b.im };
    }

    mul(a, b) {
        return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
    }

    scale(a, k) {
        return { re: a.re * k, im: a.im * k };
    }

    conj(a) {
        return { re: a.re, im: -a.im };
    }

    abs2(a) {
        return a.re * a.re + a.im * a.im;
    }

    expi(theta) {
        return { re: Math.cos(theta), im: Math.sin(theta) };
    }

    // ---------- Utilities ----------

    formatPercent(p) {
        const v = Math.round(this.clamp(p, 0, 1) * 100);
        return `${v}%`;
    }

    clamp(x, a, b) {
        return Math.max(a, Math.min(b, x));
    }

    clampInt(n, a, b) {
        return Math.max(a, Math.min(b, n | 0));
    }

    modDeg(d) {
        const x = d % 360;
        return x < 0 ? x + 360 : x;
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new QuantumComputingBlochQubit();
});

if (typeof DefaultContent !== 'undefined') {
    DefaultContent['quantum-computing'] = `# 单量子比特：布洛赫球与量子门

这页只做一件事：把一个量子比特画成 **布洛赫球上的箭头**，并让你看到——**量子门就是旋转**。

## 你会看到什么

- 北极是 **|0⟩**，南极是 **|1⟩**  
- 箭头指向哪里，就代表量子态在哪里  
- 点不同的量子门（X/Y/Z/H/S/T 或 Rx/Ry/Rz），箭头会跳到新位置  
- 右侧实时显示：测到 **0** 和 **1** 的概率

## 30 秒玩法

1. 直接在球面上拖动箭头（也可以拖动 **θ/φ** 滑块）：观察 P(0)/P(1) 如何变化  
2. 再拖动 **φ**：观察箭头“绕圈”，但概率几乎不变（Z 基测量）  
3. 点一下 **H**：常常会把 |0⟩ 变成“50/50”  
4. 用 **Rx/Ry/Rz** 配合角度，做你自己的旋转（按住 Shift 可点到背面）`;
}
