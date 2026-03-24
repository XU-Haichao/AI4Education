/**
 * 量子隧穿模拟
 * 使用严格的散射态时间演化算法可视化波函数穿越势垒的过程
 */

class QuantumTunnelingSimulation {
    constructor() {
        this.canvas = document.getElementById('tunneling-canvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');

        // Simulation parameters
        this.N = 512;
        this.L = 35.0;
        this.dx = this.L / this.N;
        this.dt = 0.025;
        this.hbar = 1.0;
        this.mass = 1.0;
        this.time = 0;

        // Wave function arrays
        this.psiReal = new Float64Array(this.N);
        this.psiImag = new Float64Array(this.N);

        // User-adjustable parameters
        this.barrierHeightRatio = 1.5;  // V/E ratio
        this.barrierWidthLevel = 3;     // 1-5 scale
        this.energyLevel = 1.0;

        // Derived parameters
        this.baseEnergy = 5.0;
        this.momentum = 3.0;
        this.isAnimating = false;
        this.spectralData = null;

        this.init();
    }

    init() {
        this.resizeCanvas();
        this.bindEvents();
        this.initWavepacket();
        this.render();

        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.render();
        });

        // Start animation
        this.animate();
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';

        this.ctx.scale(dpr, dpr);
        this.width = rect.width;
        this.height = rect.height;
    }

    bindEvents() {
        // Barrier height slider
        const heightSlider = document.getElementById('barrier-height-slider');
        if (heightSlider) {
            heightSlider.addEventListener('input', (e) => {
                this.barrierHeightRatio = parseFloat(e.target.value);
                document.getElementById('barrier-height-value').textContent =
                    this.barrierHeightRatio.toFixed(1) + ' E';
                this.calculateTransmission();
            });
            heightSlider.addEventListener('change', () => this.initWavepacket());
        }

        // Barrier width slider
        const widthSlider = document.getElementById('barrier-width-slider');
        if (widthSlider) {
            widthSlider.addEventListener('input', (e) => {
                this.barrierWidthLevel = parseInt(e.target.value);
                const labels = ['很窄', '较窄', '中等', '较宽', '很宽'];
                document.getElementById('barrier-width-value').textContent =
                    labels[this.barrierWidthLevel - 1];
                this.calculateTransmission();
            });
            widthSlider.addEventListener('change', () => this.initWavepacket());
        }

        // Energy slider
        const energySlider = document.getElementById('energy-slider');
        if (energySlider) {
            energySlider.addEventListener('input', (e) => {
                this.energyLevel = parseFloat(e.target.value);
                document.getElementById('energy-value').textContent =
                    this.energyLevel.toFixed(1);
                this.calculateTransmission();
            });
            energySlider.addEventListener('change', () => this.initWavepacket());
        }

        // Reset button
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.reset());
        }

        // Send button
        const sendBtn = document.getElementById('send-btn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.initWavepacket());
        }
    }

    getBarrierParams() {
        // Convert UI parameters to physical values
        const energy = this.baseEnergy * this.energyLevel;
        const barrierV = energy * this.barrierHeightRatio;
        const barrierWidth = 0.3 + this.barrierWidthLevel * 0.4;  // Range: 0.7 to 2.3
        const barrierA = (this.L - barrierWidth) / 2;  // Center the barrier
        return { energy, barrierV, barrierWidth, barrierA };
    }

    calculateTransmission() {
        const { energy, barrierV, barrierWidth } = this.getBarrierParams();

        // Calculate transmission coefficient
        // Calculate exact transmission coefficient for rectangular barrier
        let transmission;
        const k = Math.sqrt(2 * this.mass * energy) / this.hbar;

        if (energy < barrierV) {
            // Tunneling regime: E < V
            const kappa = Math.sqrt(2 * this.mass * (barrierV - energy)) / this.hbar;
            const sinhKL = Math.sinh(kappa * barrierWidth);
            // T = 1 / (1 + (V0^2 * sinh^2(kappa*a)) / (4*E*(V0-E)))
            const denom = 1 + (barrierV * barrierV * sinhKL * sinhKL) / (4 * energy * (barrierV - energy));
            transmission = 1.0 / denom;
        } else if (energy > barrierV) {
            // Propagating regime: E > V
            const q = Math.sqrt(2 * this.mass * (energy - barrierV)) / this.hbar;
            const sinQL = Math.sin(q * barrierWidth);
            // T = 1 / (1 + (V0^2 * sin^2(q*a)) / (4*E*(E-V0)))
            const denom = 1 + (barrierV * barrierV * sinQL * sinQL) / (4 * energy * (energy - barrierV));
            transmission = 1.0 / denom;
        } else {
            // Critical case: E = V
            // T = 1 / (1 + (m*V0*a^2)/(2*hbar^2))  (Limit as E->V)
            const term = (this.mass * barrierV * barrierWidth * barrierWidth) / (2 * this.hbar * this.hbar);
            transmission = 1.0 / (1 + term);
        }

        const reflection = 1 - transmission;
        const decayConst = energy < barrierV ?
            Math.sqrt(2 * this.mass * (barrierV - energy)) / this.hbar : 0;

        // Update UI
        document.getElementById('transmission-value').textContent = transmission.toFixed(3);
        document.getElementById('reflection-value').textContent = reflection.toFixed(3);
        document.getElementById('decay-value').textContent = decayConst.toFixed(2);
        document.getElementById('probability-value').textContent =
            (transmission * 100).toFixed(1) + '%';
    }

    initWavepacket() {
        const { energy, barrierV, barrierWidth, barrierA } = this.getBarrierParams();

        // Calculate momentum from energy
        const k0 = Math.sqrt(2 * this.mass * energy) / this.hbar;
        this.momentum = k0 * this.hbar;

        // Initialize Gaussian wave packet
        const x0 = 5.0;  // Start position
        const sigma = 1.5;  // Width

        let normSq = 0;
        for (let i = 0; i < this.N; i++) {
            const x = i * this.dx;
            const dist = x - x0;
            const envelope = Math.exp(-dist * dist / (2 * sigma * sigma));
            this.psiReal[i] = envelope * Math.cos(k0 * x);
            this.psiImag[i] = envelope * Math.sin(k0 * x);
            normSq += this.psiReal[i] ** 2 + this.psiImag[i] ** 2;
        }

        // Normalize
        const factor = 1.0 / Math.sqrt(normSq * this.dx);
        for (let i = 0; i < this.N; i++) {
            this.psiReal[i] *= factor;
            this.psiImag[i] *= factor;
        }

        // Calculate and store max amplitude for FIXED visual scaling
        this.maxAmp = 0;
        for (let i = 0; i < this.N; i++) {
            const amp = Math.sqrt(this.psiReal[i] ** 2 + this.psiImag[i] ** 2);
            if (amp > this.maxAmp) this.maxAmp = amp;
        }

        this.time = 0;
        this.initBarrierSpectra(barrierV, barrierA, barrierWidth, k0, sigma);
        this.calculateTransmission();
    }

    initBarrierSpectra(barrierV, barrierA, barrierLb, k0, sigma) {
        const hbar = this.hbar, m = this.mass;
        const sigmaK = 1.0 / (2.0 * sigma);

        const numK = 200;
        const kMin = Math.max(0.1, k0 - 6 * sigmaK);
        const kMax = k0 + 6 * sigmaK;
        const dk = (kMax - kMin) / (numK - 1);
        const kGrid = [];
        for (let i = 0; i < numK; i++) kGrid.push(kMin + i * dk);

        const cL = [], cR = [], statesL = [], statesR = [];

        // Store initial wave function
        const initialPsi = [];
        for (let i = 0; i < this.N; i++) {
            initialPsi.push({ re: this.psiReal[i], im: this.psiImag[i] });
        }

        // Compute scattering states and project
        for (const k of kGrid) {
            const uL = this.computeScatteringState(k, barrierV, barrierA, barrierLb, 'L');
            const uR = this.computeScatteringState(k, barrierV, barrierA, barrierLb, 'R');

            let sumLRe = 0, sumLIm = 0, sumRRe = 0, sumRIm = 0;
            for (let i = 0; i < this.N; i++) {
                const reL = uL[i].re * initialPsi[i].re + uL[i].im * initialPsi[i].im;
                const imL = uL[i].re * initialPsi[i].im - uL[i].im * initialPsi[i].re;
                sumLRe += reL; sumLIm += imL;

                const reR = uR[i].re * initialPsi[i].re + uR[i].im * initialPsi[i].im;
                const imR = uR[i].re * initialPsi[i].im - uR[i].im * initialPsi[i].re;
                sumRRe += reR; sumRIm += imR;
            }
            cL.push({ re: sumLRe * this.dx, im: sumLIm * this.dx });
            cR.push({ re: sumRRe * this.dx, im: sumRIm * this.dx });
            statesL.push(uL);
            statesR.push(uR);
        }

        this.spectralData = { kGrid, cL, cR, statesL, statesR };
    }

    computeScatteringState(k, V, a, Lb, side) {
        const m = this.mass, hbar = this.hbar;
        const kV2 = (2 * m * V) / (hbar * hbar);
        const qSq = k * k - kV2;

        let qReal = 0, qImag = 0;
        if (qSq >= 0) {
            qReal = Math.sqrt(qSq);
        } else {
            qImag = Math.sqrt(-qSq);
        }
        const isTunneling = qSq < 0;

        // Calculate D(k)
        let D_re, D_im;
        if (!isTunneling) {
            D_re = Math.cos(qReal * Lb);
            D_im = -((k * k + qReal * qReal) / (2 * k * qReal)) * Math.sin(qReal * Lb);
        } else {
            D_re = Math.cosh(qImag * Lb);
            const kappaSq = qImag * qImag;
            D_im = -((k * k - kappaSq) / (2 * k * qImag)) * Math.sinh(qImag * Lb);
        }

        const Dmag2 = D_re * D_re + D_im * D_im;
        const expMinusIkL_re = Math.cos(k * Lb);
        const expMinusIkL_im = -Math.sin(k * Lb);
        const t = {
            re: (expMinusIkL_re * D_re + expMinusIkL_im * D_im) / Dmag2,
            im: (expMinusIkL_im * D_re - expMinusIkL_re * D_im) / Dmag2
        };

        // Calculate r(k)
        let rFactor_re, rFactor_im;
        if (!isTunneling) {
            const sinQL = Math.sin(qReal * Lb);
            const coeff = ((k * k - qReal * qReal) / (2 * k * qReal)) * sinQL;
            rFactor_re = -coeff * D_im / Dmag2;
            rFactor_im = -coeff * D_re / Dmag2;
        } else {
            const sinhKL = Math.sinh(qImag * Lb);
            const kappaSq = qImag * qImag;
            const coeff = ((k * k + kappaSq) / (2 * k * qImag)) * sinhKL;
            rFactor_re = -coeff * D_im / Dmag2;
            rFactor_im = -coeff * D_re / Dmag2;
        }

        const exp2ika_re = Math.cos(2 * k * a);
        const exp2ika_im = Math.sin(2 * k * a);
        const r = {
            re: exp2ika_re * rFactor_re - exp2ika_im * rFactor_im,
            im: exp2ika_re * rFactor_im + exp2ika_im * rFactor_re
        };

        const norm = 1.0 / Math.sqrt(2 * Math.PI);
        const state = [];
        const b = a + Lb;

        if (side === 'L') {
            for (let i = 0; i < this.N; i++) {
                const x = i * this.dx;
                let val_re, val_im;

                if (x < a) {
                    const eikx_re = Math.cos(k * x), eikx_im = Math.sin(k * x);
                    const emikx_re = Math.cos(k * x), emikx_im = -Math.sin(k * x);
                    val_re = eikx_re + (r.re * emikx_re - r.im * emikx_im);
                    val_im = eikx_im + (r.re * emikx_im + r.im * emikx_re);
                } else if (x > b) {
                    const eikx_re = Math.cos(k * x), eikx_im = Math.sin(k * x);
                    val_re = t.re * eikx_re - t.im * eikx_im;
                    val_im = t.re * eikx_im + t.im * eikx_re;
                } else {
                    // Stable backward propagation from transmitted side
                    const dx = b - x;
                    const eikb_re = Math.cos(k * b), eikb_im = Math.sin(k * b);
                    const psi_b_re = t.re * eikb_re - t.im * eikb_im;
                    const psi_b_im = t.re * eikb_im + t.im * eikb_re;

                    if (!isTunneling) {
                        const cosQ = Math.cos(qReal * dx), sinQ = Math.sin(qReal * dx);
                        const fac_re = cosQ;
                        const fac_im = -(k / qReal) * sinQ;
                        val_re = psi_b_re * fac_re - psi_b_im * fac_im;
                        val_im = psi_b_re * fac_im + psi_b_im * fac_re;
                    } else {
                        const coshK = Math.cosh(qImag * dx), sinhK = Math.sinh(qImag * dx);
                        const fac_re = coshK;
                        const fac_im = -(k / qImag) * sinhK;
                        val_re = psi_b_re * fac_re - psi_b_im * fac_im;
                        val_im = psi_b_re * fac_im + psi_b_im * fac_re;
                    }
                }
                state.push({ re: val_re * norm, im: val_im * norm });
            }
        } else {
            for (let i = 0; i < this.N; i++) {
                const x = i * this.dx;
                let val_re, val_im;

                if (x > b) {
                    const emikx_re = Math.cos(k * x), emikx_im = -Math.sin(k * x);
                    const eikx_re = Math.cos(k * x), eikx_im = Math.sin(k * x);
                    const rR = {
                        re: r.re * Math.cos(2 * k * Lb) + r.im * Math.sin(2 * k * Lb),
                        im: -r.re * Math.sin(2 * k * Lb) + r.im * Math.cos(2 * k * Lb)
                    };
                    val_re = emikx_re + (rR.re * eikx_re - rR.im * eikx_im);
                    val_im = emikx_im + (rR.re * eikx_im + rR.im * eikx_re);
                } else if (x < a) {
                    const emikx_re = Math.cos(k * x), emikx_im = -Math.sin(k * x);
                    val_re = t.re * emikx_re - t.im * emikx_im;
                    val_im = t.re * emikx_im + t.im * emikx_re;
                } else {
                    const dx = x - a;
                    const emika_re = Math.cos(k * a), emika_im = -Math.sin(k * a);
                    const psi_a_re = t.re * emika_re - t.im * emika_im;
                    const psi_a_im = t.re * emika_im + t.im * emika_re;

                    if (!isTunneling) {
                        const cosQ = Math.cos(qReal * dx), sinQ = Math.sin(qReal * dx);
                        const fac_re = cosQ;
                        const fac_im = (k / qReal) * sinQ;
                        val_re = psi_a_re * fac_re - psi_a_im * fac_im;
                        val_im = psi_a_re * fac_im + psi_a_im * fac_re;
                    } else {
                        const coshK = Math.cosh(qImag * dx), sinhK = Math.sinh(qImag * dx);
                        const fac_re = coshK;
                        const fac_im = (k / qImag) * sinhK;
                        val_re = psi_a_re * fac_re - psi_a_im * fac_im;
                        val_im = psi_a_re * fac_im + psi_a_im * fac_re;
                    }
                }
                state.push({ re: val_re * norm, im: val_im * norm });
            }
        }
        return state;
    }

    stepAnalytical() {
        this.time += this.dt;
        if (!this.spectralData) return;

        // Reset psi
        for (let i = 0; i < this.N; i++) {
            this.psiReal[i] = 0;
            this.psiImag[i] = 0;
        }

        const { kGrid, cL, cR, statesL, statesR } = this.spectralData;
        const hbar = this.hbar;
        const dk = kGrid[1] - kGrid[0];

        for (let j = 0; j < kGrid.length; j++) {
            const k = kGrid[j];
            const Ek = (hbar * hbar * k * k) / (2 * this.mass);
            const phase = -Ek * this.time / hbar;
            const cosP = Math.cos(phase), sinP = Math.sin(phase);

            const evolvedCLR = cL[j].re * cosP - cL[j].im * sinP;
            const evolvedCLI = cL[j].re * sinP + cL[j].im * cosP;
            const evolvedCRR = cR[j].re * cosP - cR[j].im * sinP;
            const evolvedCRI = cR[j].re * sinP + cR[j].im * cosP;

            const uL = statesL[j], uR = statesR[j];
            for (let i = 0; i < this.N; i++) {
                this.psiReal[i] += (evolvedCLR * uL[i].re - evolvedCLI * uL[i].im) * dk;
                this.psiImag[i] += (evolvedCLR * uL[i].im + evolvedCLI * uL[i].re) * dk;
                this.psiReal[i] += (evolvedCRR * uR[i].re - evolvedCRI * uR[i].im) * dk;
                this.psiImag[i] += (evolvedCRR * uR[i].im + evolvedCRI * uR[i].re) * dk;
            }
        }
    }

    checkReset() {
        let normSq = 0;
        for (let i = 0; i < this.N; i++) {
            normSq += this.psiReal[i] ** 2 + this.psiImag[i] ** 2;
        }
        const norm = normSq * this.dx;

        // Reset when norm < 0.01 (wave packet left the domain)
        if (this.time > 1 && norm < 0.01) {
            this.initWavepacket();
        }
    }

    reset() {
        this.barrierHeightRatio = 1.5;
        this.barrierWidthLevel = 3;
        this.energyLevel = 1.0;

        document.getElementById('barrier-height-slider').value = 1.5;
        document.getElementById('barrier-height-value').textContent = '1.5 E';
        document.getElementById('barrier-width-slider').value = 3;
        document.getElementById('barrier-width-value').textContent = '中等';
        document.getElementById('energy-slider').value = 1;
        document.getElementById('energy-value').textContent = '1.0';

        this.initWavepacket();
    }

    animate() {
        this.stepAnalytical();
        this.checkReset();
        this.render();
        requestAnimationFrame(() => this.animate());
    }

    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.drawBackground();
        this.drawBarrier();
        this.drawWaveFunction();
        this.drawLabels();
    }

    drawBackground() {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, 'rgba(15, 23, 42, 0.9)');
        gradient.addColorStop(1, 'rgba(30, 41, 59, 0.9)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    drawBarrier() {
        const margin = { left: 50, right: 30, top: 30, bottom: 50 };
        const chartW = this.width - margin.left - margin.right;
        const chartH = this.height - margin.top - margin.bottom;

        const { barrierA, barrierWidth } = this.getBarrierParams();
        const barrierB = barrierA + barrierWidth;

        const barrierLeft = margin.left + (barrierA / this.L) * chartW;
        const barrierRight = margin.left + (barrierB / this.L) * chartW;

        // Draw barrier region
        const gradient = this.ctx.createLinearGradient(barrierLeft, margin.top, barrierLeft, margin.top + chartH);
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.3)');
        gradient.addColorStop(1, 'rgba(239, 68, 68, 0.1)');

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(barrierLeft, margin.top, barrierRight - barrierLeft, chartH);

        this.ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(barrierLeft, margin.top, barrierRight - barrierLeft, chartH);

        // Label
        this.ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
        this.ctx.font = 'bold 14px Inter';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('势垒 V₀', (barrierLeft + barrierRight) / 2, margin.top + 20);
    }

    drawWaveFunction() {
        const margin = { left: 50, right: 30, top: 30, bottom: 50 };
        const chartW = this.width - margin.left - margin.right;
        const chartH = this.height - margin.top - margin.bottom;
        const cy = margin.top + chartH / 2;

        // Use fixed scaling based on initial wave packet max amplitude
        // This prevents "zooming in" on noise when the wave packet leaves the screen
        const maxAmp = this.maxAmp || 1.0;
        const scale = (chartH * 0.35) / maxAmp;

        // Draw probability density (|ψ|²)
        this.ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
        this.ctx.beginPath();
        this.ctx.moveTo(margin.left, cy);
        for (let i = 0; i < this.N; i++) {
            const xPx = margin.left + (i / this.N) * chartW;
            const prob = this.psiReal[i] ** 2 + this.psiImag[i] ** 2;
            // Visually scale up probability density by 2.4x as requested
            const yPx = cy - prob * scale * maxAmp * 2.4;
            this.ctx.lineTo(xPx, yPx);
        }
        this.ctx.lineTo(margin.left + chartW, cy);
        this.ctx.closePath();
        this.ctx.fill();

        // Draw real part
        this.ctx.strokeStyle = '#22d3ee';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        for (let i = 0; i < this.N; i++) {
            const xPx = margin.left + (i / this.N) * chartW;
            const yPx = cy - this.psiReal[i] * scale;
            if (i === 0) this.ctx.moveTo(xPx, yPx);
            else this.ctx.lineTo(xPx, yPx);
        }
        this.ctx.stroke();

        // Draw imaginary part
        this.ctx.strokeStyle = '#ec4899';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        for (let i = 0; i < this.N; i++) {
            const xPx = margin.left + (i / this.N) * chartW;
            const yPx = cy - this.psiImag[i] * scale;
            if (i === 0) this.ctx.moveTo(xPx, yPx);
            else this.ctx.lineTo(xPx, yPx);
        }
        this.ctx.stroke();
    }

    drawLabels() {
        const margin = { left: 50, right: 30, top: 30, bottom: 50 };
        const chartW = this.width - margin.left - margin.right;

        // Legend
        this.ctx.font = '12px Inter';
        this.ctx.textAlign = 'left';
        this.ctx.fillStyle = '#22d3ee';
        this.ctx.fillText('Re(ψ) 实部', margin.left + 10, margin.top + 50);
        this.ctx.fillStyle = '#ec4899';
        this.ctx.fillText('Im(ψ) 虚部', margin.left + 100, margin.top + 50);
        this.ctx.fillStyle = 'rgba(168, 85, 247, 0.8)';
        this.ctx.fillText('|ψ|² 概率密度', margin.left + 190, margin.top + 50);

        // Time display
        this.ctx.fillStyle = 'rgba(255,255,255,0.6)';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`t = ${this.time.toFixed(2)}`, margin.left + chartW - 10, margin.top + 50);

        // Axis labels
        this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('位置 x', this.width / 2, this.height - 15);
    }
}

// Initialize simulation
document.addEventListener('DOMContentLoaded', () => {
    new QuantumTunnelingSimulation();
});

// Default learning content
if (typeof DefaultContent !== 'undefined') {
    DefaultContent['quantum-tunneling'] = `# 量子隧穿

## 穿越不可能的障碍

在经典物理中，一个球不可能穿过比它能量更高的山丘——它会被弹回来。但在量子力学中，**粒子有一定概率穿越能量高于自身的势垒**，这就是**量子隧穿效应**。

## 物理原理

波函数不会在势垒边界突然变为零，而是指数衰减地延伸到势垒内部。如果势垒足够薄，波函数在另一侧仍有非零振幅。

透射系数近似为：
$$T \\approx e^{-2\\kappa a}$$

其中：
- $\\kappa = \\sqrt{2m(V_0-E)}/\\hbar$ 是衰减常数
- $a$ 是势垒宽度
- $V_0$ 是势垒高度，$E$ 是粒子能量

## 隧穿概率的影响因素

1. **势垒高度**：势垒越高，$\\kappa$ 越大，透射概率越小
2. **势垒宽度**：势垒越宽，透射概率指数下降
3. **粒子质量**：质量越大，隧穿越困难（这就是为什么宏观物体不会隧穿）
4. **粒子能量**：能量越接近势垒高度，隧穿概率越大

## 实际应用

### α衰变
放射性原子核中的α粒子通过隧穿逃离核内的势阱，导致α衰变。

### 扫描隧道显微镜（STM）
利用电子隧穿电流对样品表面成像，分辨率可达原子级别。

### 太阳核聚变
太阳核心的氢核通过隧穿克服库仑斥力势垒，发生核聚变反应。没有量子隧穿，太阳根本无法发光！

## 尝试模拟

调节势垒参数，观察：
- 势垒越高，透射波越弱
- 势垒越宽，穿透概率急剧下降
- 波包在势垒内部指数衰减
`;
}
