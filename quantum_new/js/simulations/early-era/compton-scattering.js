/**
 * 康普顿散射交互模拟 - Premium Version
 * 
 * Update 2026: 
 * - Wave packet visualization for photons
 * - Quantum cloud visualization for electrons
 * - Advanced graphing
 */

class ComptonSimulation {
    constructor() {
        // 碰撞画布
        this.collisionCanvas = document.getElementById('collision-canvas');
        this.collisionCtx = this.collisionCanvas?.getContext('2d');

        // 波长图画布
        this.wavelengthCanvas = document.getElementById('wavelength-canvas');
        this.wavelengthCtx = this.wavelengthCanvas?.getContext('2d');

        if (!this.collisionCanvas || !this.wavelengthCanvas) return;

        // 参数
        this.scatterAngle = 90;      // 度
        this.photonEnergy = 50;      // keV (User adjustable)

        // 物理常数
        this.comptonWavelength = 2.426;  // pm (此为常数)
        this.electronMass = 511;         // keV/c²
        this.hc = 1.24;                  // keV·nm

        // 动画状态
        this.animationState = 'idle';  // idle, incoming, collision, scattered
        this.particles = [];
        this.effects = []; // For explosions, flashes

        // 样式配置
        this.colors = {
            photonIn: '#00f3ff',     // Cyan
            photonOut: '#bc13fe',    // Purple
            electron: '#ffffff',     // White
            grid: 'rgba(255, 255, 255, 0.1)',
            text: 'rgba(255, 255, 255, 0.7)'
        };

        this.init();
    }

    init() {
        this.resizeCanvases();
        this.bindEvents();
        this.updateCalculations();
        this.startLoop();

        // Initial setup
        this.resetSimulation();
    }

    resizeCanvases() {
        const resize = (canvas) => {
            const rect = canvas.parentElement.getBoundingClientRect();
            // Scaling for High DPI displays
            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;

            const ctx = canvas.getContext('2d');
            ctx.scale(dpr, dpr);
            return { width: rect.width, height: rect.height };
        };

        this.collisionDims = resize(this.collisionCanvas);
        this.wavelengthDims = resize(this.wavelengthCanvas);

        window.addEventListener('resize', () => {
            this.collisionDims = resize(this.collisionCanvas);
            this.wavelengthDims = resize(this.wavelengthCanvas);
            this.drawEnergyPlot(); // Redraw static plot on resize
        });
    }

    bindEvents() {
        // 角度滑块
        const angleSlider = document.getElementById('angle-slider');
        const angleValue = document.getElementById('angle-value');
        const angleFill = document.getElementById('angle-fill');

        if (angleSlider) {
            angleSlider.addEventListener('input', () => {
                this.scatterAngle = parseInt(angleSlider.value);
                angleValue.textContent = `${this.scatterAngle}°`;
                if (angleFill) angleFill.style.width = `${(this.scatterAngle / 180) * 100}%`;
                this.updateCalculations();
            });
        }

        // 能量滑块
        const energySlider = document.getElementById('energy-slider');
        const energyValue = document.getElementById('energy-value');
        const energyFill = document.getElementById('energy-fill');

        if (energySlider) {
            energySlider.addEventListener('input', () => {
                this.photonEnergy = parseInt(energySlider.value);
                energyValue.textContent = `${this.photonEnergy} keV`;
                // Map 10-500 to 0-100%
                const percent = ((this.photonEnergy - 10) / 490) * 100;
                if (energyFill) energyFill.style.width = `${percent}%`;
                this.updateCalculations();
            });
        }

        // 按钮


        document.getElementById('scatter-btn')?.addEventListener('click', () => {
            if (this.animationState !== 'idle') {
                this.resetSimulation();
                setTimeout(() => this.startScattering(), 100);
            } else {
                this.startScattering();
            }
        });
    }

    updateCalculations() {
        const theta = this.scatterAngle * Math.PI / 180;

        // 入射波长 λ = hc/E
        const incidentWavelength = this.hc / this.photonEnergy * 1000;  // pm (conversion nm -> pm)

        // 康普顿公式: Δλ = λc(1 - cosθ)
        const wavelengthShift = this.comptonWavelength * (1 - Math.cos(theta));

        // 散射波长
        const scatteredWavelength = incidentWavelength + wavelengthShift;

        // 散射光子能量
        const scatteredEnergy = (this.hc * 1000) / scatteredWavelength;  // keV

        // 反冲电子能量 (Conservation of Energy)
        const electronEnergy = this.photonEnergy - scatteredEnergy;

        // Update DOM
        this.updateText('incident-wavelength', incidentWavelength.toFixed(1));
        this.updateText('scattered-wavelength', scatteredWavelength.toFixed(1));
        this.updateText('wavelength-shift', wavelengthShift.toFixed(2));
        this.updateText('electron-energy', electronEnergy.toFixed(1));

        // Store for logic
        this.data = {
            lambdaIn: incidentWavelength,
            lambdaOut: scatteredWavelength,
            shift: wavelengthShift,
            energyElec: electronEnergy
        };

        // Redraw graph immediately to reflect slider changes
        this.drawEnergyPlot();
    }

    updateText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    updateStatus(status, type = 'neutral') {
        const indicator = document.getElementById('status-indicator');
        if (!indicator) return;

        const dot = indicator.querySelector('.status-dot');
        const text = indicator.querySelector('.status-text');

        if (dot && text) {
            text.textContent = status;
            indicator.className = 'status-indicator active';

            if (type === 'active') dot.style.background = '#0aff0a';
            else if (type === 'busy') dot.style.background = '#bc13fe';
            else dot.style.background = '#444';
        } else {
            indicator.textContent = status;
            indicator.style.color = type === 'active' ? '#22c55e' : (type === 'busy' ? '#a855f7' : '#64748b');
        }
    }

    resetSimulation() {
        this.animationState = 'idle';
        this.particles = [];
        this.effects = [];
        this.updateStatus('就绪 Ready', 'neutral');

        const w = this.collisionDims.width;
        const h = this.collisionDims.height;

        // Add static electron
        this.electron = {
            type: 'electron',
            x: w / 2,
            y: h / 2,
            vx: 0,
            vy: 0,
            radius: 8,
            visible: true
        };
    }

    // Helper: Map wavelength/energy to color
    getPhotonColor(wavelength) {
        const energy = 1240 / wavelength;
        // Map 10 keV (Red) -> 500 keV (Blue/Violet)
        // Hue: 0 -> 260
        let hue = ((energy - 10) / 490) * 260;
        hue = Math.max(0, Math.min(260, hue));
        return `hsl(${hue}, 100%, 60%)`;
    }

    startScattering() {
        this.resetSimulation();
        this.animationState = 'incoming';
        this.updateStatus('模拟中 Simulating...', 'busy');

        const w = this.collisionDims.width;
        const h = this.collisionDims.height;

        // Create incoming photon packet
        const photon = {
            type: 'photon',
            subtype: 'incoming',
            x: -50,
            y: h / 2,
            targetX: w / 2,
            targetY: h / 2,
            wavelength: this.data.lambdaIn, // Used for drawing freq
            speed: 4, // Visualization speed (reduced)
            phase: 0
        };

        this.particles.push(photon);
    }

    startLoop() {
        const loop = (timestamp) => {
            this.update(timestamp);
            this.drawCollision();
            this.drawEnergyPlot(); // Usually static, but good to redraw for cursor interactions if we add them
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    update(timestamp) {
        if (this.animationState === 'idle') return;

        const w = this.collisionDims.width;
        const h = this.collisionDims.height;
        const centerX = w / 2;
        const centerY = h / 2;

        // Update Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            if (p.type === 'photon') {
                // Move photon
                const dx = p.targetX - p.x;
                const dy = p.targetY - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (p.subtype === 'incoming') {
                    // Constant speed towards target
                    if (dist < p.speed) {
                        // HIT!
                        this.handleCollision();
                        this.particles.splice(i, 1); // Remove incoming
                    } else {
                        const angle = Math.atan2(dy, dx);
                        p.x += Math.cos(angle) * p.speed;
                        p.y += Math.sin(angle) * p.speed;
                        p.phase += 0.25; // Oscillate
                    }
                } else if (p.subtype === 'scattered') {
                    // Move away
                    p.x += p.vx;
                    p.y += p.vy;
                    p.phase += 0.1; // Slower oscillation for lower energy
                    p.life -= 0.01;
                    if (p.life <= 0) this.particles.splice(i, 1);
                }
            } else if (p.type === 'electron') {
                if (p.isRecoil) {
                    p.x += p.vx;
                    p.y += p.vy;
                    // Prevent fading, only remove when off-screen
                    if (p.x < -50 || p.x > w + 50 || p.y < -50 || p.y > h + 50) {
                        this.particles.splice(i, 1);
                    }
                }
            }
        }

        // Update Effects
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const e = this.effects[i];
            e.life -= 0.05;
            e.radius += 2;
            if (e.life <= 0) this.effects.splice(i, 1);
        }

        // Check if done
        if (this.animationState === 'scattered' && this.particles.length === 0) {
            this.animationState = 'idle';
            this.updateStatus('完成 Finished', 'active');
            // Restore static electron
            this.resetSimulation();
        }
    }

    handleCollision() {
        this.animationState = 'scattered';
        const w = this.collisionDims.width;
        const h = this.collisionDims.height;
        const centerX = w / 2;
        const centerY = h / 2;

        // 1. Create Collision Flash
        this.effects.push({
            x: centerX,
            y: centerY,
            radius: 5,
            life: 1.0,
            color: '#ffffff'
        });

        const thetaRad = this.scatterAngle * Math.PI / 180;

        // 2. Spawn Scattered Photon
        this.particles.push({
            type: 'photon',
            subtype: 'scattered',
            x: centerX,
            y: centerY,
            vx: Math.cos(thetaRad) * 3, // Slower (was 6)
            vy: -Math.sin(thetaRad) * 3, // Invert Y for canvas coord system
            wavelength: this.data.lambdaOut,
            phase: 0,
            life: 2.0
        });

        // 3. Spawn Recoil Electron
        // Calculate recoil angle phi
        // cot(phi) = (1 + hf/mc^2) * tan(theta/2)
        // This is complex, let's use conservation momentum vector math or simple approximation
        // Conservation: p_in = p_out + p_e => p_e = p_in - p_out
        // p = E/c
        const p_in = this.photonEnergy; // assume c=1 direction (1, 0)
        const p_out = (this.hc * 1000 / this.data.lambdaOut);

        const p_out_x = p_out * Math.cos(thetaRad);
        const p_out_y = p_out * Math.sin(thetaRad); // Math Y is inverted in Logic? No, standard trig first

        // Electron momentum components
        const pe_x = p_in - p_out_x;
        const pe_y = 0 - p_out_y;

        const phi = Math.atan2(pe_y, pe_x); // Standard math angle
        const pe_mag = Math.sqrt(pe_x * pe_x + pe_y * pe_y);
        const speed = Math.min(pe_mag / 20, 4); // Scale for visual (reduced)

        this.particles.push({
            type: 'electron',
            isRecoil: true,
            x: centerX,
            y: centerY,
            vx: Math.cos(phi) * speed,
            vy: -Math.sin(phi) * speed, // Flip Y for canvas
            radius: 8,
            life: 2.0
        });

        // Hide static electron
        this.electron.visible = false;
    }

    // --- Drawing Helpers ---

    drawCollision() {
        const ctx = this.collisionCtx;
        const w = this.collisionDims.width;
        const h = this.collisionDims.height;
        const centerX = w / 2;
        const centerY = h / 2;

        // Clear
        ctx.clearRect(0, 0, w, h);

        // 1. Draw Angle Guide
        if (this.animationState !== 'scattering') {
            const thetaRad = this.scatterAngle * Math.PI / 180;
            const r = 100;

            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.setLineDash([5, 5]);
            // Incoming line
            ctx.moveTo(0, centerY);
            ctx.lineTo(centerX, centerY);
            // Outgoing guide
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(centerX + Math.cos(thetaRad) * r, centerY - Math.sin(thetaRad) * r);
            ctx.stroke();

            // Angle Arc
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.arc(centerX, centerY, 40, 0, -thetaRad, true); // Canvas Y inverted
            const outColor = this.getPhotonColor(this.data.lambdaOut);
            ctx.strokeStyle = outColor;
            ctx.stroke();

            // Text
            ctx.fillStyle = this.colors.text;
            ctx.font = '12px JetBrains Mono';
            ctx.fillText(`${this.scatterAngle}°`, centerX + 50, centerY - 20);
        }

        // 2. Draw Static Electron
        if (this.electron && this.electron.visible) {
            this.drawElectron(ctx, this.electron.x, this.electron.y, 1);
        }

        // 3. Draw Active Particles
        this.particles.forEach(p => {
            if (p.type === 'photon') {
                this.drawWavePacket(ctx, p.x, p.y, p.subtype === 'incoming' ? 0 : -this.scatterAngle * Math.PI / 180, p.wavelength, p.phase, p.life || 1);
            } else if (p.type === 'electron') {
                this.drawElectron(ctx, p.x, p.y, p.life || 1);
            }
        });

        // 4. Draw Effects
        this.effects.forEach(e => {
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${e.life})`;
            ctx.fill();
        });
    }

    drawElectron(ctx, x, y, alpha) {
        // Glow
        const grad = ctx.createRadialGradient(x, y, 0, x, y, 20);
        grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        grad.addColorStop(0.3, `rgba(0, 200, 255, ${alpha * 0.5})`);
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    drawWavePacket(ctx, x, y, angle, wavelength, phase, alpha) {
        ctx.save();
        ctx.translate(x, y);
        // If angle is 0 (incoming), we are moving right.
        // If angle is scattered, we rotated.
        // HOWEVER, my angle logic passed in might be simpler to just rotate ctx
        // Angle passed is 0 for incoming (moving right +x)
        // For scattered it is -theta (moving up-right in canvas coords)

        // If it's incoming, angle is 0. 
        // We draw along X axis.

        // WAIT: My update logic for scattered uses vx, vy for position.
        // So x, y is correct position.
        // I just need to rotate the wave drawing to align with velocity vector?
        // Actually, easier: draw wave along local X, then rotate context to match movement direction?
        // But incoming moves +X, scattered moves angled.

        // Let's compute rotation from velocity if available, else use angle
        let rotation = angle;
        // Ideally should align with velocity

        ctx.rotate(rotation);

        const length = 40; // Pixel length of packet
        const amplitude = 6;

        // Frequency proportional to Energy (Inverse Wavelength)
        // Physics: E = 1240/wavelength
        // We map Energy (10-500 keV) to a Visual Frequency (0.2 - 2.0)
        // This avoids aliasing at high energy while keeping low energy distinct
        const energy = 1240 / wavelength;
        // Normalized 0-1
        const t = Math.max(0, Math.min(1, (energy - 10) / 490));
        // Map to visual range
        const freq = 0.2 + (t * 1.8);

        ctx.beginPath();
        for (let i = -length; i <= length; i += 1) {
            // Gaussian envelope
            const env = Math.exp(- (i * i) / (length * length * 0.3));

            // Sine wave
            const sin = Math.sin((i * freq * 0.5) - phase);

            const yOffset = sin * env * amplitude;

            if (i === -length) ctx.moveTo(i, yOffset);
            else ctx.lineTo(i, yOffset);
        }

        const color = this.getPhotonColor(wavelength);
        ctx.strokeStyle = color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
    }

    // Renamed logic: Energy Distribution instead of Wavelength Shift
    drawEnergyPlot() {
        const ctx = this.wavelengthCtx;
        const w = this.wavelengthDims.width;
        const h = this.wavelengthDims.height;

        ctx.clearRect(0, 0, w, h);

        const margin = { left: 40, right: 30, top: 20, bottom: 30 }; // Adjusted margins
        const graphW = w - margin.left - margin.right;
        const graphH = h - margin.top - margin.bottom;

        // Draw Axes
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Y axis
        ctx.moveTo(margin.left, margin.top);
        ctx.lineTo(margin.left, margin.top + graphH);
        // X axis
        ctx.lineTo(margin.left + graphW, margin.top + graphH);
        ctx.stroke();

        // Labels
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '10px Inter';

        // X Axis Labels
        ctx.textAlign = 'center';
        ctx.fillText('0°', margin.left, h - 10);
        ctx.fillText('90°', margin.left + graphW / 2, h - 10);
        ctx.fillText('180°', margin.left + graphW, h - 10);

        // Y Axis Labels (Max is Ein)
        ctx.textAlign = 'right';
        ctx.fillText(`${this.photonEnergy}`, margin.left - 5, margin.top + 10);
        ctx.fillText('0', margin.left - 5, margin.top + graphH);

        ctx.save();
        ctx.translate(15, margin.top + graphH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText('keV', 0, 0);
        ctx.restore();

        // Data Functions
        const getX = (ang) => margin.left + (ang / 180) * graphW;
        // Scale Y based on E_in (max energy in system)
        // User request: Y-axis max is 1.2 * Ein
        const yMax = this.photonEnergy * 1.2;
        const getY = (energy) => (margin.top + graphH) - (energy / yMax) * graphH;

        // 1. Draw E_in (Constant)
        ctx.beginPath();
        ctx.strokeStyle = this.colors.photonIn; // Cyan
        ctx.lineWidth = 1;
        // Solid line (removed dash)
        ctx.moveTo(getX(0), getY(this.photonEnergy));
        ctx.lineTo(getX(180), getY(this.photonEnergy));
        ctx.stroke();

        // 2. Draw E_out (Scattered Photon Energy)
        // E_out = E_in / (1 + (E_in/mc^2)*(1-cos(theta)))
        ctx.beginPath();
        ctx.strokeStyle = this.colors.photonOut; // Purple
        ctx.lineWidth = 2;

        for (let ang = 0; ang <= 180; ang += 2) {
            const rad = ang * Math.PI / 180;
            const alpha = this.photonEnergy / this.electronMass;
            const eOut = this.photonEnergy / (1 + alpha * (1 - Math.cos(rad)));

            if (ang === 0) ctx.moveTo(getX(ang), getY(eOut));
            else ctx.lineTo(getX(ang), getY(eOut));
        }
        ctx.stroke();

        // 3. Draw K_e (Electron Kinetic Energy)
        // K_e = E_in - E_out
        ctx.beginPath();
        ctx.strokeStyle = '#fbbf24'; // Amber/Yellow for Electron Energy
        ctx.lineWidth = 2;

        for (let ang = 0; ang <= 180; ang += 2) {
            const rad = ang * Math.PI / 180;
            const alpha = this.photonEnergy / this.electronMass;
            const eOut = this.photonEnergy / (1 + alpha * (1 - Math.cos(rad)));
            const ke = this.photonEnergy - eOut;

            if (ang === 0) ctx.moveTo(getX(ang), getY(ke));
            else ctx.lineTo(getX(ang), getY(ke));
        }
        ctx.stroke();

        // 4. Current State Points
        const rad = this.scatterAngle * Math.PI / 180;
        const eOutCurrent = (this.hc * 1000) / this.data.lambdaOut; // Calculated in updateCalculations accurately
        const keCurrent = this.photonEnergy - eOutCurrent;

        // Point showing Ke
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(getX(this.scatterAngle), getY(keCurrent), 4, 0, Math.PI * 2);
        ctx.fill();

        // Point showing Eout
        ctx.fillStyle = this.colors.photonOut;
        ctx.beginPath();
        ctx.arc(getX(this.scatterAngle), getY(eOutCurrent), 4, 0, Math.PI * 2);
        ctx.fill();

        // Legend
        const lx = margin.left + 20;
        const ly = margin.top + graphH - 40;
        const lh = 15;

        ctx.font = '10px Inter';
        ctx.textAlign = 'left';

        // Ein Legend
        ctx.fillStyle = this.colors.photonIn;
        ctx.fillRect(lx, ly - lh, 10, 2);
        ctx.fillText('Ein (Incident)', lx + 15, ly - lh + 4);

        // Ke Legend
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(lx, ly, 10, 2);
        ctx.fillText('Ke (Elec)', lx + 15, ly + 4);

        // Eout Legend
        ctx.fillStyle = this.colors.photonOut;
        ctx.fillRect(lx, ly + lh, 10, 2);
        ctx.fillText("E' (Phot)", lx + 15, ly + lh + 4);
    }
}

// 扩展默认内容
if (typeof DefaultContent !== 'undefined') {
    DefaultContent['compton-scattering'] = `# 康普顿散射 Compton Scattering
    
**康普顿效应 (Compton Effect)** 是光子与电子发生弹性碰撞的现象。

## 🔬 核心发现

1923年，Arthur Compton 发现 X 射线被物质散射后，散射光中不仅包含原波长的光，还包含**波长变长**的光。

这一现象无法用经典电磁波理论解释，只能将光视为具有能量和动量的**粒子（光子）**。

## 📐 康普顿公式

光子与电子的弹性碰撞遵循能量守恒和动量守恒：

$$ \\Delta\\lambda = \\lambda' - \\lambda = \\lambda_c (1 - \\cos\\theta) $$

- **$\\lambda_c$**: 电子的康普顿波长 (≈ 2.426 pm)
- **$\\theta$**: 散射角度
- **$\\Delta\\lambda$**: 波长偏移量

> 💡 **现象直觉**：
> 散射角度越大，光子损失的能量越多，波长变长越明显（红移）。
`;
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    new ComptonSimulation();
});
