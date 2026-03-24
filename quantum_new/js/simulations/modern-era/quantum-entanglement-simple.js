/**
 * 量子纠缠：同步硬币（面向非理科生的直观版本）
 *
 * 核心直觉：
 * - 单看 Alice 或 Bob：结果像掷硬币（50/50）
 * - 把两份记录对照：会出现“关联”，并且随测量设置（Δθ）变化
 *
 * 这里用一个简化模型做演示（强调现象而非推导）：
 * - 纠缠模式：P(一致) = cos²(Δθ)
 * - 独立随机：P(一致) = 1/2
 * - 两边边缘分布始终 50/50（不能靠纠缠“传消息”）
 */

class QuantumEntanglementSimple {
    constructor() {
        this.canvas = document.getElementById('entanglement-canvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');

        this.mode = 'entangled'; // 'entangled' | 'random'
        this.deltaDeg = 0;

        this.pairs = 0;
        this.samePairs = 0;
        this.aliceOnes = 0;
        this.bobOnes = 0;

        this.last = null; // {aBit,bBit,isSame}

        this.playing = false;
        this.emitRate = 2; // pairs/sec
        this.emitAccumulator = 0;

        this.time = 0;
        this.lastFrameTs = null;

        this.bgDots = [];
        this.pulses = []; // {t0, aBit, bBit}

        this.init();
    }

    init() {
        this.cacheUI();
        this.resizeCanvas();
        this.bindEvents();
        this.updateUI();

        requestAnimationFrame((ts) => this.animate(ts));
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    cacheUI() {
        this.ui = {
            angleSlider: document.getElementById('angle-slider'),
            angleValue: document.getElementById('angle-value'),
            angleBadge: document.getElementById('angle-badge'),
            expectedBadge: document.getElementById('expected-badge'),

            modeBadge: document.getElementById('mode-badge'),

            resetBtn: document.getElementById('reset-btn'),
            autoBtn: document.getElementById('auto-btn'),
            emitBtn: document.getElementById('emit-btn'),

            stateA: document.getElementById('state-a'),
            stateB: document.getElementById('state-b'),
            marginalA: document.getElementById('marginal-a'),
            marginalB: document.getElementById('marginal-b'),

            roundSymbol: document.getElementById('round-symbol'),
            roundText: document.getElementById('round-text'),

            pairCount: document.getElementById('pair-count'),
            sameRate: document.getElementById('same-rate'),
            expectedRate: document.getElementById('expected-rate'),
            aliceOneRate: document.getElementById('alice-one-rate'),
            bobOneRate: document.getElementById('bob-one-rate')
        };
    }

    bindEvents() {
        document.querySelectorAll('.preset-btn[data-mode]').forEach((btn) => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.preset-btn[data-mode]').forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                this.setMode(btn.dataset.mode);
            });
        });

        this.ui.angleSlider?.addEventListener('input', (e) => {
            const v = this.clampInt(parseInt(e.target.value, 10), 0, 90);
            this.setDeltaDeg(v);
        });

        this.ui.resetBtn?.addEventListener('click', () => this.reset());
        this.ui.autoBtn?.addEventListener('click', () => this.togglePlay());
        this.ui.emitBtn?.addEventListener('click', () => this.emitPair());

        // Click canvas = emit one pair (small “game feel”)
        this.canvas.addEventListener('pointerdown', () => this.emitPair());
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
        const density = this.width * this.height / 15000;
        const count = Math.floor(this.clamp(density, 35, 90));
        this.bgDots = [];
        for (let i = 0; i < count; i++) {
            this.bgDots.push({
                u: Math.random(),
                v: Math.random(),
                r: 0.6 + Math.random() * 1.6,
                phase: Math.random() * Math.PI * 2,
                speed: 0.35 + Math.random() * 0.9,
                hue: 210 + Math.random() * 90
            });
        }
    }

    setMode(mode) {
        this.mode = mode === 'random' ? 'random' : 'entangled';
        this.updateUI();
    }

    setDeltaDeg(deg) {
        this.deltaDeg = this.clampInt(deg, 0, 90);
        this.updateUI();
    }

    reset() {
        this.playing = false;
        this.emitAccumulator = 0;

        this.pairs = 0;
        this.samePairs = 0;
        this.aliceOnes = 0;
        this.bobOnes = 0;
        this.last = null;
        this.pulses = [];

        this.updateUI({ resetRoundText: true });
    }

    togglePlay() {
        this.playing = !this.playing;
        this.updateUI();
    }

    expectedSameProbability() {
        if (this.mode === 'random') return 0.5;
        const rad = (this.deltaDeg * Math.PI) / 180;
        const c = Math.cos(rad);
        return c * c;
    }

    emitPair() {
        const pSame = this.expectedSameProbability();

        const aBit = Math.random() < 0.5 ? 0 : 1;
        const isSame = Math.random() < pSame;
        const bBit = isSame ? aBit : 1 - aBit;

        this.pairs += 1;
        if (isSame) this.samePairs += 1;
        if (aBit === 1) this.aliceOnes += 1;
        if (bBit === 1) this.bobOnes += 1;

        this.last = { aBit, bBit, isSame };
        this.pulses.push({ t0: performance.now(), aBit, bBit });

        this.updateUI();
    }

    animate(ts) {
        if (this.lastFrameTs == null) this.lastFrameTs = ts;
        const dt = Math.min(0.05, Math.max(0, (ts - this.lastFrameTs) / 1000));
        this.lastFrameTs = ts;

        this.time += dt;

        if (this.playing) {
            this.emitAccumulator += dt * this.emitRate;
            while (this.emitAccumulator >= 1) {
                this.emitAccumulator -= 1;
                this.emitPair();
            }
        }

        this.render(ts);
        requestAnimationFrame((t2) => this.animate(t2));
    }

    render(ts) {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.drawBackground();

        const y = this.height * 0.5;
        const leftX = this.width * 0.25;
        const rightX = this.width * 0.75;
        const centerX = this.width * 0.5;

        this.drawLink(leftX, rightX, y);
        this.drawStation(centerX, y, '源', { fill: 'rgba(168, 85, 247, 0.22)', stroke: 'rgba(168, 85, 247, 0.8)' });
        this.drawStation(leftX, y, 'Alice', { fill: 'rgba(34, 211, 238, 0.12)', stroke: 'rgba(34, 211, 238, 0.65)' });
        this.drawStation(rightX, y, 'Bob', { fill: 'rgba(244, 114, 182, 0.12)', stroke: 'rgba(244, 114, 182, 0.65)' });

        this.drawPulses(ts, { centerX, leftX, rightX, y });
        this.drawLastOutcome({ leftX, rightX, y });
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
        g.addColorStop(0, 'rgba(168, 85, 247, 0.10)');
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

    drawLink(x1, x2, y) {
        const midX = (x1 + x2) / 2;
        const amp = 10 + 3 * Math.sin(this.time * 1.4);

        this.ctx.save();
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = this.mode === 'entangled' ? 'rgba(168, 85, 247, 0.55)' : 'rgba(148, 163, 184, 0.35)';

        this.ctx.beginPath();
        this.ctx.moveTo(x1, y);
        this.ctx.bezierCurveTo(midX - 80, y - amp, midX + 80, y + amp, x2, y);
        this.ctx.stroke();

        // subtle glow
        this.ctx.lineWidth = 10;
        this.ctx.strokeStyle = this.mode === 'entangled' ? 'rgba(168, 85, 247, 0.08)' : 'rgba(148, 163, 184, 0.05)';
        this.ctx.stroke();
        this.ctx.restore();
    }

    drawStation(x, y, label, { fill, stroke }) {
        const r = 26;
        this.ctx.save();
        this.ctx.fillStyle = fill;
        this.ctx.strokeStyle = stroke;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(x, y, r, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
        this.ctx.font = '12px Inter';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(label, x, y + r + 8);
        this.ctx.restore();
    }

    drawPulses(ts, { centerX, leftX, rightX, y }) {
        const duration = 650; // ms
        const alive = [];
        for (const p of this.pulses) {
            const t = (ts - p.t0) / duration;
            if (t >= 1) continue;
            alive.push(p);

            const ease = this.easeOutCubic(this.clamp(t, 0, 1));
            this.drawPulseDot(centerX + (leftX - centerX) * ease, y, p.aBit, 1 - t);
            this.drawPulseDot(centerX + (rightX - centerX) * ease, y, p.bBit, 1 - t);
        }
        this.pulses = alive;
    }

    drawPulseDot(x, y, bit, alpha) {
        const color = bit === 0 ? 'rgba(34, 211, 238, ' : 'rgba(244, 114, 182, ';
        this.ctx.save();
        this.ctx.fillStyle = `${color}${0.75 * alpha})`;
        this.ctx.shadowColor = `${color}${0.85 * alpha})`;
        this.ctx.shadowBlur = 18 * alpha;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 6, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
        this.ctx.restore();
    }

    drawLastOutcome({ leftX, rightX, y }) {
        if (!this.last) return;

        const drawBadge = (x, bit) => {
            const r = 14;
            const cy = y - 40;
            const fill = bit === 0 ? 'rgba(34, 211, 238, 0.9)' : 'rgba(244, 114, 182, 0.9)';
            this.ctx.save();
            this.ctx.fillStyle = fill;
            this.ctx.beginPath();
            this.ctx.arc(x, cy, r, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            this.ctx.font = '700 14px Inter';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(String(bit), x, cy + 0.5);
            this.ctx.restore();
        };

        drawBadge(leftX, this.last.aBit);
        drawBadge(rightX, this.last.bBit);

        // Middle label
        this.ctx.save();
        this.ctx.font = '700 14px Inter';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = this.last.isSame ? 'rgba(34, 197, 94, 0.95)' : 'rgba(245, 158, 11, 0.95)';
        this.ctx.fillText(this.last.isSame ? '同步' : '相反', this.width * 0.5, y - 40);
        this.ctx.restore();
    }

    drawTopHint() {
        const pSame = this.expectedSameProbability();

        const modeText = this.mode === 'entangled' ? '纠缠（有关联）' : '独立随机（无关联）';
        const hint = `模式：${modeText}   |   预期一致率≈${this.formatPercent(pSame)}   |   Δθ=${this.deltaDeg}°`;

        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        this.roundRect(14, 14, Math.min(this.width - 28, 520), 34, 10);
        this.ctx.fill();

        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        this.ctx.font = '12px Inter';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(hint, 26, 31);
        this.ctx.restore();
    }

    updateUI({ resetRoundText } = {}) {
        const modeBadge = this.mode === 'entangled' ? '纠缠' : '独立随机';
        if (this.ui.modeBadge) this.ui.modeBadge.textContent = modeBadge;

        const angleText = `${this.deltaDeg}°`;
        if (this.ui.angleValue) this.ui.angleValue.textContent = angleText;
        if (this.ui.angleBadge) this.ui.angleBadge.textContent = angleText;
        if (this.ui.angleSlider) this.ui.angleSlider.value = String(this.deltaDeg);

        if (this.ui.autoBtn) this.ui.autoBtn.textContent = this.playing ? '暂停' : '自动运行';

        const setBit = (el, bit) => {
            if (!el) return;
            if (bit == null) {
                el.textContent = '?';
                el.className = 'particle-state';
                return;
            }
            el.textContent = String(bit);
            el.className = `particle-state ${bit === 0 ? 'bit0' : 'bit1'}`;
        };

        setBit(this.ui.stateA, this.last?.aBit ?? null);
        setBit(this.ui.stateB, this.last?.bBit ?? null);

        const pSame = this.expectedSameProbability();

        if (this.ui.pairCount) this.ui.pairCount.textContent = String(this.pairs);
        if (this.ui.expectedBadge) this.ui.expectedBadge.textContent = this.formatPercent(pSame);
        if (this.ui.expectedRate) this.ui.expectedRate.textContent = this.formatPercent(pSame);

        if (this.pairs > 0) {
            const sameRate = this.samePairs / this.pairs;
            const a1 = this.aliceOnes / this.pairs;
            const b1 = this.bobOnes / this.pairs;

            if (this.ui.sameRate) this.ui.sameRate.textContent = this.formatPercent(sameRate);
            if (this.ui.aliceOneRate) this.ui.aliceOneRate.textContent = this.formatPercent(a1);
            if (this.ui.bobOneRate) this.ui.bobOneRate.textContent = this.formatPercent(b1);

            if (this.ui.marginalA) this.ui.marginalA.textContent = `单边：1≈${this.formatPercent(a1)}`;
            if (this.ui.marginalB) this.ui.marginalB.textContent = `单边：1≈${this.formatPercent(b1)}`;
        } else {
            if (this.ui.sameRate) this.ui.sameRate.textContent = '-';
            if (this.ui.aliceOneRate) this.ui.aliceOneRate.textContent = '-';
            if (this.ui.bobOneRate) this.ui.bobOneRate.textContent = '-';

            if (this.ui.marginalA) this.ui.marginalA.textContent = '单边：—';
            if (this.ui.marginalB) this.ui.marginalB.textContent = '单边：—';
        }

        if (resetRoundText && this.ui.roundText) {
            if (this.ui.roundSymbol) this.ui.roundSymbol.textContent = '⟷';
            this.ui.roundText.textContent = '等待发射';
        } else if (this.last && this.ui.roundText) {
            if (this.ui.roundSymbol) this.ui.roundSymbol.textContent = this.last.isSame ? '≡' : '≠';
            this.ui.roundText.textContent = this.last.isSame ? '这一对：同步' : '这一对：相反';
        }
    }

    roundRect(x, y, w, h, r) {
        const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.arcTo(x + w, y, x + w, y + h, radius);
        this.ctx.arcTo(x + w, y + h, x, y + h, radius);
        this.ctx.arcTo(x, y + h, x, y, radius);
        this.ctx.arcTo(x, y, x + w, y, radius);
        this.ctx.closePath();
    }

    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

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
}

window.addEventListener('DOMContentLoaded', () => {
    new QuantumEntanglementSimple();
});

if (window.DefaultContent) {
    DefaultContent['quantum-entanglement'] = `# 量子纠缠：随机，但有关联

把它想成一对“同步硬币”：

- **单看 Alice 或 Bob**：每次都像掷硬币，0/1 各一半  
- **把两份记录对照**：会出现惊人的一致/相反，这就是“纠缠关联”

这个页面只做一件事：让你看到——**关联不是藏在某一个粒子里，而是藏在“联合统计”里。**

## 你可以怎么试玩

1. 保持 **纠缠**，把 **Δθ** 从 0° 拖到 90°：看“一致率”如何变化  
2. 切到 **独立随机**：无论 Δθ 怎么调，一致率都会回到约 50%  
3. 观察 **Alice(1比例)** 与 **Bob(1比例)**：它们始终接近 50%  

> 重要提醒：纠缠不是“超光速传信”。  
> 你可以改变关联，但不能控制对方看到的单边结果。`;
}
