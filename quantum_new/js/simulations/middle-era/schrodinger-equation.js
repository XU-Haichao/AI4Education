/**
 * 薛定谔方程交互模拟
 * 支持两种模式:
 * 1. 定态模式 (势阱/谐振子): 展示能级和定态波函数的时间演化
 * 2. 波包模式 (自由/势垒): 展示波包的时间演化
 */

class SchrodingerSimulation {
    constructor() {
        this.waveCanvas = document.getElementById('wave-canvas');
        this.probCanvas = document.getElementById('probability-canvas');
        this.waveCtx = this.waveCanvas?.getContext('2d');
        this.probCtx = this.probCanvas?.getContext('2d');

        if (!this.waveCanvas || !this.probCanvas) return;

        // Simulation parameters
        this.N = 512;
        this.L = 100.0;
        this.dx = this.L / this.N;
        this.dt = 0.025;
        this.hbar = 1.0;
        this.mass = 1.0;

        // Wave function arrays
        this.psiReal = new Float64Array(this.N);
        this.psiImag = new Float64Array(this.N);
        this.potentialArr = new Float64Array(this.N);

        // Evolution operators (for wave packet mode)
        this.U_pot_Real = new Float64Array(this.N);
        this.U_pot_Imag = new Float64Array(this.N);
        this.U_kin_Real = new Float64Array(this.N);
        this.U_kin_Imag = new Float64Array(this.N);

        // State variables
        this.mode = 'stationary'; // 'stationary'
        this.potentialType = 'well';
        this.energyLevel = 1;
        this.time = 0;
        this.isPaused = false;
        this.momentum = 2.0;
        this.width = 3; // Fixed to 'Medium'

        // Physical Constants (scaled)
        this.hbar = 1.0;
        this.mass = 1.0;

        // Energy level colors
        this.levelColors = [
            '#22d3ee', // n=1 cyan
            '#a855f7', // n=2 purple
            '#f97316', // n=3 orange
            '#22c55e', // n=4 green
            '#ec4899'  // n=5 pink
        ];

        this.init();
    }

    init() {
        this.resizeCanvases();
        this.bindEvents();

        // Sync potential name text with the initially active button
        const activeBtn = document.querySelector('.preset-btn[data-potential].active');
        if (activeBtn) {
            document.getElementById('potential-name').textContent = activeBtn.textContent;
            this.potentialType = activeBtn.dataset.potential;
        }

        this.precomputeKineticOperator();
        this.setPotential(this.potentialType);
        this.updateMode();
        this.animate();
    }

    resizeCanvases() {
        const resize = (canvas) => {
            const rect = canvas.parentElement.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            canvas.style.width = rect.width + 'px';
            canvas.style.height = rect.height + 'px';
            canvas.getContext('2d').scale(dpr, dpr);
        };
        resize(this.waveCanvas);
        resize(this.probCanvas);

        this.widthPx = this.waveCanvas.parentElement.getBoundingClientRect().width;
        this.heightPx = this.waveCanvas.parentElement.getBoundingClientRect().height;

        window.addEventListener('resize', () => {
            resize(this.waveCanvas);
            resize(this.probCanvas);
            this.widthPx = this.waveCanvas.parentElement.getBoundingClientRect().width;
            this.heightPx = this.waveCanvas.parentElement.getBoundingClientRect().height;
        });
    }

    bindEvents() {
        const get = id => document.getElementById(id);

        // Potential type buttons
        document.querySelectorAll('.preset-btn[data-potential]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.preset-btn[data-potential]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.potentialType = btn.dataset.potential;
                get('potential-name').textContent = btn.textContent;
                this.setPotential(this.potentialType);
                this.time = 0;
                this.updateMode();
            });
        });

        // Energy level buttons
        document.querySelectorAll('.preset-btn[data-level]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.preset-btn[data-level]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.energyLevel = parseInt(btn.dataset.level);
                get('level-value').textContent = this.energyLevel;
                this.time = 0;
                this.updateStationaryState();
            });
        });

        // Momentum slider
        const momSlider = get('momentum-slider');
        if (momSlider) {
            momSlider.addEventListener('input', () => {
                this.momentum = parseFloat(momSlider.value);
                get('momentum-value').textContent = this.momentum.toFixed(1);
            });
            momSlider.addEventListener('change', () => this.initWavepacket());
        }

        // Width slider removed from HTML, width fixed to 3
        /* 
        const widthSlider = get('width-slider');
        const widthLabels = ['极窄', '窄', '中等', '宽', '极宽'];
        if (widthSlider) {
            widthSlider.addEventListener('input', () => {
                this.width = parseInt(widthSlider.value);
                get('width-value').textContent = widthLabels[this.width - 1];
            });
            widthSlider.addEventListener('change', () => this.initWavepacket());
        }
        */

        // Control buttons
        get('reset-btn')?.addEventListener('click', () => {
            this.time = 0;
            this.updateMode();
        });

        const pauseBtn = get('pause-btn');
        pauseBtn?.addEventListener('click', () => {
            this.isPaused = !this.isPaused;
            pauseBtn.textContent = this.isPaused ? '继续' : '暂停';
        });
    }

    updateMode() {
        const stationaryControls = document.getElementById('stationary-controls');
        const wavepacketControls = document.getElementById('wavepacket-controls');
        const rightPanelTitle = document.getElementById('right-panel-title');

        if (this.potentialType === 'well' || this.potentialType === 'harmonic') {
            this.mode = 'stationary';
            stationaryControls.style.display = 'block';
            wavepacketControls.style.display = 'none';
            rightPanelTitle.textContent = '能级图 & 概率密度';
            this.updateStationaryState();
        } else {
            this.mode = 'wavepacket';
            stationaryControls.style.display = 'none';
            wavepacketControls.style.display = 'block';
            rightPanelTitle.textContent = '概率密度 |ψ|²';
            this.initWavepacket();
        }
    }

    // --- Stationary State Functions ---

    updateStationaryState() {
        const n = this.energyLevel;
        const stateNames = ['基态', '第一激发态', '第二激发态', '第三激发态', '第四激发态'];

        document.getElementById('quantum-number').textContent = `n=${n}`;
        document.getElementById('state-desc').textContent = stateNames[n - 1];

        if (this.potentialType === 'well') {
            document.getElementById('energy-value').textContent = `E${this.toSubscript(n)}`;
            document.getElementById('energy-unit').textContent = `∝ ${n}²`;
        } else if (this.potentialType === 'harmonic') {
            document.getElementById('energy-value').textContent = `E${this.toSubscript(n)}`;
            document.getElementById('energy-unit').textContent = `= (${n}-½)ℏω`;
        }

        document.getElementById('norm-value').textContent = '1.000';
    }

    toSubscript(n) {
        const subscripts = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
        return String(n).split('').map(d => subscripts[parseInt(d)]).join('');
    }

    // Get energy for stationary state (scaled for visible oscillation)
    // Using smaller values so the oscillation is slow enough to observe
    // Adjusted for dt=0.025 (was 0.03/0.1 for dt=0.05)
    getEnergy(n) {
        if (this.potentialType === 'well') {
            // E_n ∝ n² for infinite well, scaled down for visibility
            return n * n * 0.06;
        } else {
            // E_n = (n - 1/2)ℏω for harmonic oscillator, scaled down
            return (n - 0.5) * 0.2;
        }
    }

    // Infinite square well wave functions
    wellWaveFunction(n, x, wellLeft, wellRight) {
        const L = wellRight - wellLeft;
        if (x < wellLeft || x > wellRight) return 0;
        const xRel = x - wellLeft;
        return Math.sqrt(2 / L) * Math.sin(n * Math.PI * xRel / L);
    }

    // Hermite polynomials for harmonic oscillator
    hermite(n, x) {
        if (n === 0) return 1;
        if (n === 1) return 2 * x;
        if (n === 2) return 4 * x * x - 2;
        if (n === 3) return 8 * x * x * x - 12 * x;
        if (n === 4) return 16 * x * x * x * x - 48 * x * x + 12;
        if (n === 5) return 32 * Math.pow(x, 5) - 160 * Math.pow(x, 3) + 120 * x;
        return 0;
    }

    // Harmonic oscillator wave functions
    harmonicWaveFunction(n, x, center, omega) {
        const alpha = Math.sqrt(this.mass * omega / this.hbar);
        const xi = alpha * (x - center);
        const normFactor = Math.pow(alpha / Math.PI, 0.25) / Math.sqrt(Math.pow(2, n - 1) * this.factorial(n - 1));
        return normFactor * this.hermite(n - 1, xi) * Math.exp(-xi * xi / 2);
    }

    factorial(n) {
        if (n <= 1) return 1;
        let result = 1;
        for (let i = 2; i <= n; i++) result *= i;
        return result;
    }

    // Get time-dependent wave function components
    // ψ(x,t) = ψ_n(x) * e^(-iE_n*t/ℏ)
    // Re(ψ) = ψ_n(x) * cos(E_n*t/ℏ)
    // Im(ψ) = -ψ_n(x) * sin(E_n*t/ℏ)
    getStationaryWaveFunction(n, x, t) {
        const center = this.L / 2;
        let psi0 = 0;

        if (this.potentialType === 'well') {
            const wellLeft = center - 20;
            const wellRight = center + 20;
            psi0 = this.wellWaveFunction(n, x, wellLeft, wellRight);
        } else if (this.potentialType === 'harmonic') {
            psi0 = this.harmonicWaveFunction(n, x, center, 0.1);
        }

        const E = this.getEnergy(n);
        const phase = -E * t / this.hbar;

        return {
            real: psi0 * Math.cos(phase),
            imag: psi0 * Math.sin(phase),
            psi0: psi0
        };
    }

    // --- Wave Packet Functions ---

    precomputeKineticOperator() {
        const dk = 2 * Math.PI / this.L;
        for (let i = 0; i < this.N; i++) {
            let k_idx = i >= this.N / 2 ? i - this.N : i;
            const k = k_idx * dk;
            const energyK = 0.5 * this.hbar * k * k / this.mass;
            const theta = -energyK * this.dt / this.hbar;
            this.U_kin_Real[i] = Math.cos(theta);
            this.U_kin_Imag[i] = Math.sin(theta);
        }
    }

    setPotential(type) {
        this.potentialType = type;
        const center = this.L / 2;

        for (let i = 0; i < this.N; i++) {
            const x = i * this.dx;
            let V = 0;

            switch (type) {
                case 'well':
                    const wellWidth = 40;
                    if (Math.abs(x - center) > wellWidth / 2) V = 100.0;
                    break;
                case 'harmonic':
                    V = 0.05 * Math.pow(x - center, 2);
                    break;
                case 'barrier':
                    if (Math.abs(x - center) < 3.0) V = 15.0;
                    break;
                case 'free':
                default:
                    V = 0;
            }
            this.potentialArr[i] = V;
        }

        // Precompute potential operator with Absorbing Boundary Conditions (ABC)
        // Reduce boundary width for barrier mode to allow wave packet to start properly
        const boundaryWidth = this.potentialType === 'barrier' ? 20 : 40;
        const maxAbsorb = this.potentialType === 'barrier' ? 1.0 : 2.0;

        for (let i = 0; i < this.N; i++) {
            const V = this.potentialArr[i];

            // Calculate imaginary potential V_abs for absorption at edges
            let V_abs = 0;
            // Only apply absorbing boundaries if NOT in free particle mode (which uses infinite space wrapping)
            if (this.potentialType !== 'free') {
                if (i < boundaryWidth) {
                    const dist = (boundaryWidth - i) / boundaryWidth;
                    V_abs = maxAbsorb * dist * dist;
                } else if (i >= this.N - boundaryWidth) {
                    const dist = (i - (this.N - boundaryWidth)) / boundaryWidth;
                    V_abs = maxAbsorb * dist * dist;
                }
            }

            // Operator: exp(-i(V - iV_abs)dt / 2hbar)
            // = exp(-V_abs * dt / 2hbar) * exp(-iV * dt / 2hbar)
            const decay = Math.exp(-V_abs * this.dt / (2 * this.hbar));
            const theta = -V * this.dt / (2 * this.hbar);

            this.U_pot_Real[i] = decay * Math.cos(theta);
            this.U_pot_Imag[i] = decay * Math.sin(theta);
        }
    }

    initWavepacket() {
        // Barrier mode: specific domain [0, 35] with wave packet at x=0
        if (this.potentialType === 'barrier') {
            // For barrier mode, use a smaller domain
            this.barrierL = 35.0;  // Simulation domain for barrier mode
            this.barrierDx = this.barrierL / this.N;

            // Adjust start position to x=5.0 to be safely inside domain (sigma=1.5 => 3sigma=4.5)
            const x0 = 5.0;
            const sigma = 1.5;  // Slightly narrower to fit better
            const k0 = this.momentum * 2.0;

            let normSq = 0;
            for (let i = 0; i < this.N; i++) {
                const x = i * this.barrierDx;
                const dist = x - x0;
                const envelope = Math.exp(-dist * dist / (2 * sigma * sigma));
                this.psiReal[i] = envelope * Math.cos(k0 * x);
                this.psiImag[i] = envelope * Math.sin(k0 * x);
                normSq += this.psiReal[i] ** 2 + this.psiImag[i] ** 2;
            }

            const factor = 1.0 / Math.sqrt(normSq * this.barrierDx);
            for (let i = 0; i < this.N; i++) {
                this.psiReal[i] *= factor;
                this.psiImag[i] *= factor;
            }

            this.time = 0;
            this.initBarrierSpectra();
            this.updateWavepacketStats();
            return;
        }

        // Default wave packet initialization for other modes
        const x0 = this.L * 0.25;
        const sigma = 1.0 + this.width * 1.5;
        const k0 = this.momentum * 2.0;

        let normSq = 0;
        for (let i = 0; i < this.N; i++) {
            const x = i * this.dx;
            const dist = x - x0;
            const envelope = Math.exp(-dist * dist / (2 * sigma * sigma));
            this.psiReal[i] = envelope * Math.cos(k0 * x);
            this.psiImag[i] = envelope * Math.sin(k0 * x);
            normSq += this.psiReal[i] ** 2 + this.psiImag[i] ** 2;
        }

        const factor = 1.0 / Math.sqrt(normSq * this.dx);
        for (let i = 0; i < this.N; i++) {
            this.psiReal[i] *= factor;
            this.psiImag[i] *= factor;
        }

        this.time = 0;
        this.updateWavepacketStats();
    }

    updateWavepacketStats() {
        const effectiveDx = this.potentialType === 'barrier' ? this.barrierDx : this.dx;

        let probSum = 0, xExpect = 0;
        for (let i = 0; i < this.N; i++) {
            const prob = this.psiReal[i] ** 2 + this.psiImag[i] ** 2;
            probSum += prob;
            xExpect += (i * effectiveDx) * prob * effectiveDx;
        }
        const norm = probSum * effectiveDx;

        // For barrier mode: reset when norm < 0.01
        if (this.potentialType === 'barrier' && this.time > 1 && norm < 0.01) {
            this.initWavepacket();
            return;
        } else if (this.potentialType !== 'free' && this.potentialType !== 'barrier' && norm < 0.1) {
            // Other modes: reset based on norm decay
            this.initWavepacket();
            return;
        }

        document.getElementById('norm-value').textContent = norm.toFixed(3);
        document.getElementById('quantum-number').textContent = '波包';
        document.getElementById('state-desc').textContent = '非定态';

        const k0 = this.momentum * 2.0;
        // Display value as square of initial momentum (k^2), unit is ℏ²/2m
        document.getElementById('energy-value').textContent = (this.momentum * this.momentum).toFixed(2);
        document.getElementById('energy-unit').textContent = 'ℏ²/2m';
    }

    // FFT implementation
    fft(re, im, inverse = false) {
        const n = re.length;
        const bits = Math.log2(n);

        for (let i = 0; i < n; i++) {
            let rev = 0, x = i;
            for (let j = 0; j < bits; j++) {
                rev = (rev << 1) | (x & 1);
                x >>= 1;
            }
            if (rev > i) {
                [re[i], re[rev]] = [re[rev], re[i]];
                [im[i], im[rev]] = [im[rev], im[i]];
            }
        }

        for (let len = 2; len <= n; len <<= 1) {
            const halfLen = len >> 1;
            const angle = (2 * Math.PI) / len * (inverse ? -1 : 1);
            const wLenRe = Math.cos(angle);
            const wLenIm = Math.sin(angle);

            for (let i = 0; i < n; i += len) {
                let wRe = 1, wIm = 0;
                for (let j = 0; j < halfLen; j++) {
                    const uRe = re[i + j];
                    const uIm = im[i + j];
                    const vRe = re[i + j + halfLen] * wRe - im[i + j + halfLen] * wIm;
                    const vIm = re[i + j + halfLen] * wIm + im[i + j + halfLen] * wRe;

                    re[i + j] = uRe + vRe;
                    im[i + j] = uIm + vIm;
                    re[i + j + halfLen] = uRe - vRe;
                    im[i + j + halfLen] = uIm - vIm;

                    const nextWRe = wRe * wLenRe - wIm * wLenIm;
                    wIm = wRe * wLenIm + wIm * wLenRe;
                    wRe = nextWRe;
                }
            }
        }

        if (inverse) {
            const invN = 1 / n;
            for (let i = 0; i < n; i++) {
                re[i] *= invN;
                im[i] *= invN;
            }
        }
    }

    step() {
        if (this.potentialType === 'free') {
            this.stepAnalytical();
        } else if (this.potentialType === 'barrier') {
            this.stepAnalyticalBarrier();
        } else {
            this.stepFFT();
        }
    }

    stepAnalytical() {
        this.time += this.dt;

        // Analytical solution parameters
        const x0 = this.L * 0.25; // Initial center
        const p0 = this.momentum * 2.0;
        const m = this.mass;
        const hbar = this.hbar;

        // Initial width sigma0
        // We need to match the sigma used in initWavepacket: sigma = 1.0 + this.width * 1.5
        const sigma0 = 1.0 + this.width * 1.5;

        // Current width sigma(t)
        // sigma(t) = sigma0 * sqrt(1 + (hbar*t / (2*m*sigma0^2))^2)
        const term = (hbar * this.time) / (2 * m * sigma0 * sigma0);
        const sigmaT = sigma0 * Math.sqrt(1 + term * term);

        // Center position moving with group velocity v = p0/m
        // To simulate infinite space with wrapping, we calculate distance on circle
        const v = p0 / m;
        const xc = x0 + v * this.time;
        // xc grows indefinitely for "infinite space", we wrap it only for display relative calculation

        const E0 = (p0 * p0) / (2 * m); // Approximate energy for phase

        for (let i = 0; i < this.N; i++) {
            const x = i * this.dx;

            // Shortest distance to center on the periodic domain (infinite space wrapping)
            // effective x - xc
            let dx = x - xc;
            // Wrap dx into [-L/2, L/2] to simulate the packet entering from other side
            // This makes the left boundary the extension of the right boundary
            dx = dx - this.L * Math.round(dx / this.L);

            // Phase terms
            // Note: The user provided a simplified formula. 
            // We implement: (1/sqrt(sigmaT)) * exp(-(x-xc)^2 / 2sigmaT^2) * Phase
            // Phase component: i*p0*x/hbar - i*E0*t/hbar
            // But 'x' in phase should likely track the wrapping or be consistent with dx?
            // If we use 'dx' in the gaussian, we get the shape. 1/sqrt(sigmaT) ensures norm.

            const envelope = (1.0 / Math.sqrt(sigmaT)) * Math.exp(-(dx * dx) / (2 * sigmaT * sigmaT));

            // Phase: The user asked for exp( ... + i*p0*x/hbar - i*E0*t/hbar )
            // If we strictly use 'x' (grid position), the phase will jump at boundary.
            // But for a free particle, the phase should be continuous.
            // However, periodic boundary condition usually implies k must be discrete (2pi/L * integer).
            // Our p0 might not perfectly match grid periodicity, but let's follow the formula.
            // We use the continuous 'x' for phase? Or 'dx + xc'?
            // If we use 'dx', it's continuous across the wrap if we view it as a local window.
            // Let's use the user's formula form but careful with valid wrapping.

            // Actually, if we want strict continuity for "infinite space" display on a ring:
            // p0 must be quantized or we accept phase jump.
            // But physically, if it's "infinite space", we are just viewing a window.
            // "Left boundary as extension of right" implies the window pan is equivalent to wrapping.

            // Let's use the provided phase terms as requested.
            // x is grid position.
            const phase = (p0 * x / hbar) - (E0 * this.time / hbar);

            // We need to normalize correctly. The formula has 1/sqrt(sigma).
            // But we discrete sum. 
            // The Gaussian integral of exp(-x^2/(2s^2))^2 is sqrt(pi)*s.
            // So we need factor relative to dx.
            // Let's stick to the shape magnitude and normalize numerically later if needed,
            // or trust the analytical norm factor (psi has unit 1/sqrt(L)).
            // The user's 1/sqrt(sigma) is proportional.
            // Actually 1/sqrt(sigmaT) * conversion constants.
            // Let's rely on the formula provided primarily.

            this.psiReal[i] = envelope * Math.cos(phase);
            this.psiImag[i] = envelope * Math.sin(phase);
        }

        // Re-normalize to ensure numerical stability/display consistency
        // (Though analytical should conserve norm, discrete sampling might vary slightly)
        this.normalizePsi();
    }

    stepAnalyticalBarrier() {
        this.time += this.dt;
        if (!this.spectralData) return;

        // Reset psi to rebuild from spectral components
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

            // Time evolve coefficients: c(t) = c(0) * exp(-iE*t/hbar)
            const evolvedCLR = cL[j].re * cosP - cL[j].im * sinP;
            const evolvedCLI = cL[j].re * sinP + cL[j].im * cosP;
            const evolvedCRR = cR[j].re * cosP - cR[j].im * sinP;
            const evolvedCRI = cR[j].re * sinP + cR[j].im * cosP;

            const uL = statesL[j], uR = statesR[j];
            for (let i = 0; i < this.N; i++) {
                // psi += (cL*uL + cR*uR) * exp(-iEt/h) * dk
                this.psiReal[i] += (evolvedCLR * uL[i].re - evolvedCLI * uL[i].im) * dk;
                this.psiImag[i] += (evolvedCLR * uL[i].im + evolvedCLI * uL[i].re) * dk;
                this.psiReal[i] += (evolvedCRR * uR[i].re - evolvedCRI * uR[i].im) * dk;
                this.psiImag[i] += (evolvedCRR * uR[i].im + evolvedCRI * uR[i].re) * dk;
            }
        }
    }

    normalizePsi() {
        let normSq = 0;
        for (let i = 0; i < this.N; i++) normSq += this.psiReal[i] ** 2 + this.psiImag[i] ** 2;
        if (normSq > 0) {
            const factor = 1.0 / Math.sqrt(normSq * this.dx);
            for (let i = 0; i < this.N; i++) {
                this.psiReal[i] *= factor;
                this.psiImag[i] *= factor;
            }
        }
    }

    // Precompute spectral projection for barrier mode
    // Domain: [0, 35], Barrier: [15, 20], Wave packet starts at x=0
    initBarrierSpectra() {
        const hbar = this.hbar, m = this.mass;
        const p0 = this.momentum * 2.0;
        const k0 = p0 / hbar;
        const sigma = 1.5;  // Same as in initWavepacket
        const sigmaK = 1.0 / (2.0 * sigma);

        // Sampling in k-space - more samples for better accuracy
        const numK = 200;
        const kMin = Math.max(0.1, k0 - 6 * sigmaK);
        const kMax = k0 + 6 * sigmaK;
        const dk = (kMax - kMin) / (numK - 1);
        const kGrid = [];
        for (let i = 0; i < numK; i++) kGrid.push(kMin + i * dk);

        // Barrier parameters: from x=17.5 to x=18
        // Using thinner barrier to make tunneling visible (T ~ exp(-2*kappa*L))
        const barrierwidth = 0.5;
        const barrierA = 17.5;      // Barrier start
        const barrierLb = barrierwidth; // Barrier width
        const barrierV = 15.0;      // Barrier height

        const cL = [], cR = [], statesL = [], statesR = [];

        // Use the actual initial wave function from psiReal/psiImag
        const initialPsi = [];
        for (let i = 0; i < this.N; i++) {
            initialPsi.push({ re: this.psiReal[i], im: this.psiImag[i] });
        }

        // For each k, construct scattering states and project
        for (const k of kGrid) {
            const uL = this.computeScatteringState(k, barrierV, barrierA, barrierLb, 'L');
            const uR = this.computeScatteringState(k, barrierV, barrierA, barrierLb, 'R');

            // Projection Cl = <uL|psi(0)>, Cr = <uR|psi(0)>
            let sumLRe = 0, sumLIm = 0, sumRRe = 0, sumRIm = 0;
            for (let i = 0; i < this.N; i++) {
                // inner product: sum( u* * psi ) * dx
                const reL = uL[i].re * initialPsi[i].re + uL[i].im * initialPsi[i].im;
                const imL = uL[i].re * initialPsi[i].im - uL[i].im * initialPsi[i].re;
                sumLRe += reL; sumLIm += imL;

                const reR = uR[i].re * initialPsi[i].re + uR[i].im * initialPsi[i].im;
                const imR = uR[i].re * initialPsi[i].im - uR[i].im * initialPsi[i].re;
                sumRRe += reR; sumRIm += imR;
            }
            cL.push({ re: sumLRe * this.barrierDx, im: sumLIm * this.barrierDx });
            cR.push({ re: sumRRe * this.barrierDx, im: sumRIm * this.barrierDx });
            statesL.push(uL);
            statesR.push(uR);
        }

        this.spectralData = { kGrid, cL, cR, statesL, statesR };
    }

    /**
     * Compute scattering state for wave number k
     * Left incidence: incident from -∞, transmitted to +∞
     * Right incidence: incident from +∞, transmitted to -∞
     * 
     * Based on the physics documentation (势垒隧穿.md)
     */
    computeScatteringState(k, V, a, Lb, side) {
        const m = this.mass, hbar = this.hbar;
        const kV2 = (2 * m * V) / (hbar * hbar);
        const qSq = k * k - kV2;

        // q can be real (E > V, propagating) or imaginary (E < V, tunneling)
        let qReal = 0, qImag = 0;
        if (qSq >= 0) {
            qReal = Math.sqrt(qSq);
        } else {
            qImag = Math.sqrt(-qSq); // kappa
        }
        const isTunneling = qSq < 0;

        // Calculate D(k) = cos(qL) - i*(k²+q²)/(2kq)*sin(qL)
        let D_re, D_im;
        if (!isTunneling) {
            D_re = Math.cos(qReal * Lb);
            D_im = -((k * k + qReal * qReal) / (2 * k * qReal)) * Math.sin(qReal * Lb);
        } else {
            // For tunneling: q = iκ, so cos(qL) = cosh(κL), sin(qL) = i*sinh(κL)
            D_re = Math.cosh(qImag * Lb);
            // D_im = -((k^2 - kappa^2) / (2*k*kappa)) * sinh(kappa*L)
            // (Note: qSq = -kappa^2, so k^2 - kappa^2 = k^2 + qSq)
            const kappaSq = qImag * qImag;
            D_im = -((k * k - kappaSq) / (2 * k * qImag)) * Math.sinh(qImag * Lb);
        }

        // t(k) = e^{-ikL} / D(k)
        const Dmag2 = D_re * D_re + D_im * D_im;
        const expMinusIkL_re = Math.cos(k * Lb);
        const expMinusIkL_im = -Math.sin(k * Lb);
        // t = (expMinusIkL) * conj(D) / |D|²
        const t = {
            re: (expMinusIkL_re * D_re + expMinusIkL_im * D_im) / Dmag2,
            im: (expMinusIkL_im * D_re - expMinusIkL_re * D_im) / Dmag2
        };

        // r(k) = e^{2ika} * [-i*(k²-q²)/(2kq)*sin(qL)] / D(k)
        let rFactor_re, rFactor_im;
        if (!isTunneling) {
            const sinQL = Math.sin(qReal * Lb);
            const coeff = ((k * k - qReal * qReal) / (2 * k * qReal)) * sinQL;
            // -i * coeff / D = -i * coeff * conj(D) / |D|²
            rFactor_re = -coeff * D_im / Dmag2;
            rFactor_im = -coeff * D_re / Dmag2;
        } else {
            const sinhKL = Math.sinh(qImag * Lb);
            // coeff = ((k^2 + kappa^2)/(2k*kappa)) * sinh
            const kappaSq = qImag * qImag;
            const coeff = ((k * k + kappaSq) / (2 * k * qImag)) * sinhKL;
            // rFactor for tunneling follows same structure as propagating: -i * coeff / D
            rFactor_re = -coeff * D_im / Dmag2;
            rFactor_im = -coeff * D_re / Dmag2;
        }
        // r = e^{2ika} * rFactor
        const exp2ika_re = Math.cos(2 * k * a);
        const exp2ika_im = Math.sin(2 * k * a);
        const r = {
            re: exp2ika_re * rFactor_re - exp2ika_im * rFactor_im,
            im: exp2ika_re * rFactor_im + exp2ika_im * rFactor_re
        };

        const norm = 1.0 / Math.sqrt(2 * Math.PI);
        const state = [];
        const b = a + Lb; // Right edge of barrier

        if (side === 'L') {
            // Left incidence: u_k^L(x)
            for (let i = 0; i < this.N; i++) {
                const x = i * this.barrierDx;
                let val_re, val_im;

                if (x < a) {
                    // Region I: e^{ikx} + r*e^{-ikx}
                    const eikx_re = Math.cos(k * x), eikx_im = Math.sin(k * x);
                    const emikx_re = Math.cos(k * x), emikx_im = -Math.sin(k * x);
                    val_re = eikx_re + (r.re * emikx_re - r.im * emikx_im);
                    val_im = eikx_im + (r.re * emikx_im + r.im * emikx_re);
                } else if (x > b) {
                    // Region III: t*e^{ikx}
                    const eikx_re = Math.cos(k * x), eikx_im = Math.sin(k * x);
                    val_re = t.re * eikx_re - t.im * eikx_im;
                    val_im = t.re * eikx_im + t.im * eikx_re;
                } else {
                    // Region II (inside barrier): use STABLE propagation from transmitted side
                    // This avoids exponential blow-up of errors when propagating from incident side
                    const dx = b - x; // Distance from right edge
                    // Value and derivative at x=b (Region III boundary)
                    // psi(b) = t * e^{ikb}
                    const eikb_re = Math.cos(k * b), eikb_im = Math.sin(k * b);
                    const psi_b_re = t.re * eikb_re - t.im * eikb_im;
                    const psi_b_im = t.re * eikb_im + t.im * eikb_re;

                    if (!isTunneling) {
                        // q is real
                        const cosQ = Math.cos(qReal * dx), sinQ = Math.sin(qReal * dx);
                        // psi(x) = psi(b)*cos(q*dx) - psi'(b)/q*sin(q*dx)
                        // psi'(b) = ik * psi(b)
                        // term2 = ik/q * psi(b) * sin = (i * k/q * sin) * psi(b)
                        // factor = cos - i(k/q)sin
                        const fac_re = cosQ;
                        const fac_im = -(k / qReal) * sinQ;
                        val_re = psi_b_re * fac_re - psi_b_im * fac_im;
                        val_im = psi_b_re * fac_im + psi_b_im * fac_re;
                    } else {
                        // Tunneling: q = i*kappa
                        // psi(x) = psi(b) [ cosh(k*dx) - i(k/kappa)sinh(k*dx) ]
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
            // Right incidence: u_k^R(x)
            for (let i = 0; i < this.N; i++) {
                const x = i * this.barrierDx;
                let val_re, val_im;

                if (x > b) {
                    // Region III: e^{-ikx} + r_R*e^{ikx}
                    const emikx_re = Math.cos(k * x), emikx_im = -Math.sin(k * x);
                    const eikx_re = Math.cos(k * x), eikx_im = Math.sin(k * x);
                    // r_R calculation...
                    const rR = {
                        re: r.re * Math.cos(2 * k * Lb) + r.im * Math.sin(2 * k * Lb),
                        im: -r.re * Math.sin(2 * k * Lb) + r.im * Math.cos(2 * k * Lb)
                    };
                    val_re = emikx_re + (rR.re * eikx_re - rR.im * eikx_im);
                    val_im = emikx_im + (rR.re * eikx_im + rR.im * eikx_re);
                } else if (x < a) {
                    // Region I: t*e^{-ikx}
                    const emikx_re = Math.cos(k * x), emikx_im = -Math.sin(k * x);
                    val_re = t.re * emikx_re - t.im * emikx_im;
                    val_im = t.re * emikx_im + t.im * emikx_re;
                } else {
                    // Region II: Stable propagation from Left (transmitted side for Right incidence)
                    // At x=a: psi(a) = t * e^{-ika}
                    const dx = x - a;
                    const emika_re = Math.cos(k * a), emika_im = -Math.sin(k * a);
                    const psi_a_re = t.re * emika_re - t.im * emika_im;
                    const psi_a_im = t.re * emika_im + t.im * emika_re;

                    if (!isTunneling) {
                        const cosQ = Math.cos(qReal * dx), sinQ = Math.sin(qReal * dx);
                        // psi(x) = psi(a)*cos - psi'(a)/q*sin
                        // psi'(a) = -ik * psi(a)
                        // term2 = (-ik/q)*psi(a)*sin = -i(k/q)sin * psi(a)
                        // factor = cos - (-i k/q sin) = cos + i(k/q)sin
                        const fac_re = cosQ;
                        const fac_im = (k / qReal) * sinQ;
                        val_re = psi_a_re * fac_re - psi_a_im * fac_im;
                        val_im = psi_a_re * fac_im + psi_a_im * fac_re;
                    } else {
                        // Tunneling: q=i*kappa
                        // fac = cosh + i(k/kappa)sinh  (Note sign flip compared to Left case)
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

    stepFFT() {
        // Split-Operator method
        for (let i = 0; i < this.N; i++) {
            const re = this.psiReal[i], im = this.psiImag[i];
            const ur = this.U_pot_Real[i], ui = this.U_pot_Imag[i];
            this.psiReal[i] = re * ur - im * ui;
            this.psiImag[i] = re * ui + im * ur;
        }

        this.fft(this.psiReal, this.psiImag, false);

        for (let i = 0; i < this.N; i++) {
            const re = this.psiReal[i], im = this.psiImag[i];
            const ur = this.U_kin_Real[i], ui = this.U_kin_Imag[i];
            this.psiReal[i] = re * ur - im * ui;
            this.psiImag[i] = re * ui + im * ur;
        }

        this.fft(this.psiReal, this.psiImag, true);

        for (let i = 0; i < this.N; i++) {
            const re = this.psiReal[i], im = this.psiImag[i];
            const ur = this.U_pot_Real[i], ui = this.U_pot_Imag[i];
            this.psiReal[i] = re * ur - im * ui;
            this.psiImag[i] = re * ui + im * ur;
        }

        this.time += this.dt;
    }

    // --- Drawing Functions ---

    drawStationaryWaveFunction() {
        const ctx = this.waveCtx;
        const w = this.widthPx;
        const h = this.heightPx;
        const margin = { left: 50, right: 20, top: 30, bottom: 40 };

        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(0, 0, w, h);

        const chartW = w - margin.left - margin.right;
        const chartH = h - margin.top - margin.bottom;
        const cy = margin.top + chartH / 2;

        const center = this.L / 2;

        // Define display range based on potential type (zoom in on relevant region)
        let xMin, xMax;
        if (this.potentialType === 'well') {
            // For infinite well: show well region with small padding
            xMin = center - 25;  // well is from center-20 to center+20
            xMax = center + 25;
        } else {
            // For harmonic oscillator: show central region (tighter zoom)
            xMin = center - 18;
            xMax = center + 18;
        }
        const xRange = xMax - xMin;

        // Draw potential shape first (background)
        this.drawPotentialShapeZoomed(ctx, margin, chartW, chartH, cy, xMin, xMax);

        // Draw baseline
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(margin.left, cy);
        ctx.lineTo(margin.left + chartW, cy);
        ctx.stroke();
        ctx.setLineDash([]);

        const n = this.energyLevel;
        const scale = chartH * 0.38;
        const points = 300;

        // Draw REAL part (solid line)
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2.5;
        ctx.beginPath();

        for (let i = 0; i <= points; i++) {
            const x = xMin + (i / points) * xRange;
            const xPx = margin.left + (i / points) * chartW;
            const wf = this.getStationaryWaveFunction(n, x, this.time);
            const yPx = cy - wf.real * scale;

            if (i === 0) ctx.moveTo(xPx, yPx);
            else ctx.lineTo(xPx, yPx);
        }
        ctx.stroke();

        // Draw IMAGINARY part (dashed line)
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();

        for (let i = 0; i <= points; i++) {
            const x = xMin + (i / points) * xRange;
            const xPx = margin.left + (i / points) * chartW;
            const wf = this.getStationaryWaveFunction(n, x, this.time);
            const yPx = cy - wf.imag * scale;

            if (i === 0) ctx.moveTo(xPx, yPx);
            else ctx.lineTo(xPx, yPx);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Legend
        ctx.font = '12px Inter, sans-serif';
        ctx.fillStyle = '#22d3ee';
        ctx.fillText(`Re(ψ${this.toSubscript(n)}) 实部`, margin.left + 10, margin.top + 20);
        ctx.fillStyle = '#ec4899';
        ctx.fillText(`Im(ψ${this.toSubscript(n)}) 虚部`, margin.left + 120, margin.top + 20);

        // Time display
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.textAlign = 'right';
        ctx.fillText(`t = ${this.time.toFixed(2)}`, margin.left + chartW - 10, margin.top + 20);
        ctx.textAlign = 'left';

        // Phase indicator (circular)
        this.drawPhaseIndicator(ctx, margin.left + chartW - 50, margin.top + 55, 25, n);
    }

    drawPotentialShapeZoomed(ctx, margin, chartW, chartH, cy, xMin, xMax) {
        const center = this.L / 2;
        const xRange = xMax - xMin;

        if (this.potentialType === 'well') {
            // Draw infinite walls at well boundaries
            const wellLeft = center - 20;
            const wellRight = center + 20;

            const wellLeftPx = margin.left + ((wellLeft - xMin) / xRange) * chartW;
            const wellRightPx = margin.left + ((wellRight - xMin) / xRange) * chartW;

            ctx.strokeStyle = 'rgba(255,255,255,0.6)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(wellLeftPx, margin.top);
            ctx.lineTo(wellLeftPx, margin.top + chartH);
            ctx.moveTo(wellRightPx, margin.top);
            ctx.lineTo(wellRightPx, margin.top + chartH);
            ctx.stroke();

            // Shaded forbidden regions
            ctx.fillStyle = 'rgba(255,100,100,0.15)';
            ctx.fillRect(margin.left, margin.top, wellLeftPx - margin.left, chartH);
            ctx.fillRect(wellRightPx, margin.top, margin.left + chartW - wellRightPx, chartH);

            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.font = '11px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('V=∞', (margin.left + wellLeftPx) / 2, cy);
            ctx.fillText('V=∞', (wellRightPx + margin.left + chartW) / 2, cy);

        } else if (this.potentialType === 'harmonic') {
            // Draw parabolic potential (opening upward)
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();

            const baseY = margin.top + chartH;  // Bottom of chart
            const potentialScale = 8;  // Scale factor for visibility
            const points = 200;

            for (let i = 0; i <= points; i++) {
                const x = xMin + (i / points) * xRange;
                const xPx = margin.left + (i / points) * chartW;
                const V = 0.05 * Math.pow(x - center, 2);
                // V increases upward (subtract from baseY)
                const yPx = baseY - V * potentialScale;

                if (i === 0) ctx.moveTo(xPx, yPx);
                else ctx.lineTo(xPx, yPx);
            }
            ctx.stroke();

            // Add label at the bottom center
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.font = '10px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('V(x) = ½mω²x²', margin.left + chartW / 2, baseY - 5);
        }
    }

    drawPhaseIndicator(ctx, cx, cy, r, n) {
        const E = this.getEnergy(n);
        const phase = -E * this.time / this.hbar;

        // Draw circle
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        ctx.stroke();

        // Draw phase vector
        const endX = cx + r * Math.cos(phase);
        const endY = cy - r * Math.sin(phase);

        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Draw point at end
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.arc(endX, endY, 4, 0, 2 * Math.PI);
        ctx.fill();

        // Label
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '10px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('相位', cx, cy + r + 15);
    }

    // Note: old drawPotentialShape removed, using drawPotentialShapeZoomed instead

    drawEnergyLevelDiagram() {
        const ctx = this.probCtx;
        const w = this.widthPx;
        const h = this.heightPx;
        const margin = { left: 60, right: 40, top: 30, bottom: 40 };

        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(0, 0, w, h);

        const chartW = w - margin.left - margin.right;
        const chartH = h - margin.top - margin.bottom;

        // Draw energy axis
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(margin.left, margin.top);
        ctx.lineTo(margin.left, margin.top + chartH);
        ctx.stroke();

        // Increased maxEnergy to give ample room at top for n=5 level vs title
        const maxEnergy = this.potentialType === 'well' ? 35 : 6.0;
        const n = this.energyLevel;

        for (let level = 1; level <= 5; level++) {
            // ... (loop content technically unchanged but I can't skip lines in replace_file_content easily without matching)
            // Actually I should target the block containing maxEnergy and the title drawing usage
            // But title drawing is later.
            // Let's split into two ReplaceChunks if possible, or one if contiguous?
            // They are not contiguous. maxEnergy is line 686. Title is line 728.
            // I recall "MultiReplaceFileContent" should be used for non-contiguous.
            // Or I can use ReplaceFileContent for the label and another for maxEnergy?
            // User wants "more detailed adjustment".
            // I will use MultiReplaceFileContent.
            let E;
            if (this.potentialType === 'well') {
                E = level * level;
            } else {
                E = level - 0.5;
            }

            const yPos = margin.top + chartH * (1 - E / maxEnergy);
            const color = this.levelColors[level - 1];
            const isSelected = level === n;

            // Draw energy level line
            ctx.strokeStyle = color;
            ctx.lineWidth = isSelected ? 3 : 1.5;
            ctx.globalAlpha = isSelected ? 1.0 : 0.4;
            ctx.beginPath();
            ctx.moveTo(margin.left + 10, yPos);
            ctx.lineTo(margin.left + chartW * 0.3, yPos);
            ctx.stroke();

            // Draw level label
            ctx.fillStyle = color;
            ctx.font = isSelected ? 'bold 12px Inter' : '11px Inter';
            ctx.textAlign = 'right';
            ctx.fillText(`n=${level}`, margin.left - 5, yPos + 4);

            // Draw probability density preview
            if (isSelected) {
                this.drawProbabilityDensityPreview(ctx, margin.left + chartW * 0.35, yPos - 30, chartW * 0.6, 60, level);
            }
        }

        ctx.globalAlpha = 1.0;

        // Title
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '12px Inter';
        ctx.textAlign = 'left';
        // Move label inside the chart, further down as requested
        ctx.fillText('能量 E ↑', margin.left + 10, margin.top + 35);

        // Note about probability density being constant
        ctx.fillStyle = '#a855f7';
        ctx.textAlign = 'center';
        ctx.font = '11px Inter';
        ctx.fillText('|ψ|² 不随时间变化', margin.left + chartW * 0.65, h - 15);
    }

    drawProbabilityDensityPreview(ctx, x, y, w, h, n) {
        const center = this.L / 2;
        const points = 150;

        // Define zoomed range (same as main display)
        let xMin, xMax;
        if (this.potentialType === 'well') {
            xMin = center - 25;
            xMax = center + 25;
        } else {
            xMin = center - 18;
            xMax = center + 18;
        }
        const xRange = xMax - xMin;

        // Background
        ctx.fillStyle = 'rgba(168, 85, 247, 0.1)';
        ctx.fillRect(x, y, w, h);

        // Border
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);

        // Calculate max for scaling
        let maxProb = 0;
        for (let i = 0; i <= points; i++) {
            const xVal = xMin + (i / points) * xRange;
            let psi = 0;
            if (this.potentialType === 'well') {
                psi = this.wellWaveFunction(n, xVal, center - 20, center + 20);
            } else {
                psi = this.harmonicWaveFunction(n, xVal, center, 0.1);
            }
            const prob = psi * psi;
            if (prob > maxProb) maxProb = prob;
        }

        // Draw filled probability density
        const gradient = ctx.createLinearGradient(x, y, x, y + h);
        gradient.addColorStop(0, 'rgba(168, 85, 247, 0.7)');
        gradient.addColorStop(1, 'rgba(168, 85, 247, 0.1)');
        ctx.fillStyle = gradient;

        ctx.beginPath();
        ctx.moveTo(x, y + h);

        for (let i = 0; i <= points; i++) {
            const xVal = xMin + (i / points) * xRange;
            let psi = 0;
            if (this.potentialType === 'well') {
                psi = this.wellWaveFunction(n, xVal, center - 20, center + 20);
            } else {
                psi = this.harmonicWaveFunction(n, xVal, center, 0.1);
            }

            const prob = psi * psi;
            const xPx = x + (i / points) * w;
            const yPx = y + h - (prob / maxProb) * h * 0.9;
            ctx.lineTo(xPx, yPx);
        }

        ctx.lineTo(x + w, y + h);
        ctx.closePath();
        ctx.fill();

        // Draw outline
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 1.5;
        ctx.beginPath();

        for (let i = 0; i <= points; i++) {
            const xVal = xMin + (i / points) * xRange;  // Same as fill loop
            let psi = 0;
            if (this.potentialType === 'well') {
                psi = this.wellWaveFunction(n, xVal, center - 20, center + 20);
            } else {
                psi = this.harmonicWaveFunction(n, xVal, center, 0.1);
            }

            const prob = psi * psi;
            const xPx = x + (i / points) * w;
            const yPx = y + h - (prob / maxProb) * h * 0.9;
            if (i === 0) ctx.moveTo(xPx, yPx);
            else ctx.lineTo(xPx, yPx);
        }
        ctx.stroke();

        // Label
        ctx.fillStyle = '#a855f7';
        ctx.font = '10px Inter';
        ctx.textAlign = 'left';
        ctx.fillText(`|ψ${this.toSubscript(n)}|²`, x + 5, y + 12);
    }

    drawWavepacketWaveFunction() {
        const ctx = this.waveCtx;
        const w = this.widthPx;
        const h = this.heightPx;
        const margin = { left: 40, right: 20, top: 30, bottom: 40 };

        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(0, 0, w, h);

        const chartW = w - margin.left - margin.right;
        const chartH = h - margin.top - margin.bottom;
        const cy = margin.top + chartH / 2;

        // Draw potential background
        if (this.potentialType === 'barrier') {
            this.drawBarrierBackground(ctx, margin, chartW, chartH);
        }

        // Draw baseline
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(margin.left, cy);
        ctx.lineTo(margin.left + chartW, cy);
        ctx.stroke();
        ctx.setLineDash([]);

        // Calculate max amplitude
        let maxAmp = 0;
        for (let i = 0; i < this.N; i++) {
            const amp = Math.sqrt(this.psiReal[i] ** 2 + this.psiImag[i] ** 2);
            if (amp > maxAmp) maxAmp = amp;
        }
        const scale = (chartH * 0.4) / (maxAmp || 1);

        // Draw real part
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < this.N; i++) {
            const xPx = margin.left + (i / this.N) * chartW;
            const yPx = cy - this.psiReal[i] * scale;
            if (i === 0) ctx.moveTo(xPx, yPx);
            else ctx.lineTo(xPx, yPx);
        }
        ctx.stroke();

        // Draw imaginary part
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < this.N; i++) {
            const xPx = margin.left + (i / this.N) * chartW;
            const yPx = cy - this.psiImag[i] * scale;
            if (i === 0) ctx.moveTo(xPx, yPx);
            else ctx.lineTo(xPx, yPx);
        }
        ctx.stroke();

        // Legend
        ctx.font = '12px Inter';
        ctx.fillStyle = '#22d3ee';
        ctx.fillText('Re(ψ) 实部', margin.left + 10, margin.top + 20);
        ctx.fillStyle = '#ec4899';
        ctx.fillText('Im(ψ) 虚部', margin.left + 100, margin.top + 20);

        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.textAlign = 'right';
        ctx.fillText(`t = ${this.time.toFixed(2)}`, margin.left + chartW - 10, margin.top + 20);
        ctx.textAlign = 'left';
    }

    drawBarrierBackground(ctx, margin, chartW, chartH) {
        // Barrier from x=17.5 to x=18.0 in domain [0, 35]
        const barrierA = 17.5;
        const barrierB = 18.0;
        const domainL = this.barrierL || 35.0;

        const barrierLeft = margin.left + (barrierA / domainL) * chartW;
        const barrierRight = margin.left + (barrierB / domainL) * chartW;

        ctx.fillStyle = 'rgba(255, 100, 100, 0.2)';
        ctx.fillRect(barrierLeft, margin.top, barrierRight - barrierLeft, chartH);

        ctx.strokeStyle = 'rgba(255, 100, 100, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(barrierLeft, margin.top, barrierRight - barrierLeft, chartH);

        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '11px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('势垒 V₀', (barrierLeft + barrierRight) / 2, margin.top + chartH / 2);
    }

    drawWavepacketProbability() {
        const ctx = this.probCtx;
        const w = this.widthPx;
        const h = this.heightPx;
        const margin = { left: 40, right: 20, top: 30, bottom: 40 };

        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(0, 0, w, h);

        const chartW = w - margin.left - margin.right;
        const chartH = h - margin.top - margin.bottom;
        const baseY = margin.top + chartH;

        // Draw barrier background
        if (this.potentialType === 'barrier') {
            this.drawBarrierBackground(ctx, margin, chartW, chartH);
        }

        // Calculate probability density
        const prob = new Float64Array(this.N);
        let maxProb = 0;
        for (let i = 0; i < this.N; i++) {
            prob[i] = this.psiReal[i] ** 2 + this.psiImag[i] ** 2;
            if (prob[i] > maxProb) maxProb = prob[i];
        }
        const scale = (chartH * 0.85) / (maxProb || 1);

        // Draw filled area
        const gradient = ctx.createLinearGradient(0, baseY - chartH * 0.8, 0, baseY);
        gradient.addColorStop(0, 'rgba(168, 85, 247, 0.8)');
        gradient.addColorStop(1, 'rgba(168, 85, 247, 0.1)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(margin.left, baseY);
        for (let i = 0; i < this.N; i++) {
            const xPx = margin.left + (i / this.N) * chartW;
            const yPx = baseY - prob[i] * scale;
            ctx.lineTo(xPx, yPx);
        }
        ctx.lineTo(margin.left + chartW, baseY);
        ctx.closePath();
        ctx.fill();

        // Draw outline
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < this.N; i++) {
            const xPx = margin.left + (i / this.N) * chartW;
            const yPx = baseY - prob[i] * scale;
            if (i === 0) ctx.moveTo(xPx, yPx);
            else ctx.lineTo(xPx, yPx);
        }
        ctx.stroke();

        // Legend
        ctx.font = '12px Inter';
        ctx.fillStyle = '#a855f7';
        ctx.fillText('|ψ(x,t)|²', margin.left + 10, margin.top + 20);

        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.textAlign = 'center';
        ctx.fillText('x →', margin.left + chartW / 2, baseY + 25);
    }

    animate() {
        if (!this.isPaused) {
            if (this.mode === 'stationary') {
                // Update time for phase rotation
                this.time += this.dt * 3;
            } else {
                // Wave packet evolution
                this.step();
                this.step();
                this.step();
                this.updateWavepacketStats();
            }
        }

        if (this.mode === 'stationary') {
            this.drawStationaryWaveFunction();
            this.drawEnergyLevelDiagram();
        } else {
            this.drawWavepacketWaveFunction();
            this.drawWavepacketProbability();
        }

        requestAnimationFrame(() => this.animate());
    }
}

// Default content
if (typeof DefaultContent !== 'undefined') {
    DefaultContent['schrodinger-equation'] = `# 薛定谔方程

1926年，奥地利物理学家埃尔温·薛定谔建立了量子力学的核心方程。

## 定态与时间演化

定态波函数随时间的演化:

$$\\psi_n(x,t) = \\psi_n(x) \\cdot e^{-iE_nt/\\hbar}$$

- **实部**: $\\text{Re}(\\psi) = \\psi_n(x)\\cos(E_nt/\\hbar)$
- **虚部**: $\\text{Im}(\\psi) = -\\psi_n(x)\\sin(E_nt/\\hbar)$

虽然波函数的实部和虚部在振荡，但**概率密度 $|\\psi|^2$ 保持不变**！

## 无限深势阱

$$E_n = \\frac{n^2\\pi^2\\hbar^2}{2mL^2}, \\quad \\psi_n = \\sqrt{\\frac{2}{L}}\\sin\\left(\\frac{n\\pi x}{L}\\right)$$

## 量子谐振子

$$E_n = \\left(n-\\frac{1}{2}\\right)\\hbar\\omega$$

> 💡 **观察要点**
> - 左侧画布: 观察波函数**实部**(青色)和**虚部**(粉色)的周期振荡
> - 右上角的**相位指示器**显示复数相位的旋转
> - 虽然波函数在振荡，但右侧的**概率密度**始终不变
> - 能级 n 越高，振荡频率越快（能量越高）`;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new SchrodingerSimulation();
});
