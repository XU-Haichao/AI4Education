/**
 * 玻尔原子模型交互模拟
 * 
 * 左侧：玻尔原子模型 - 量子化轨道上的电子
 * 右侧：能级图与氢原子光谱 - 能级跃迁与光子发射
 */

class BohrModelSimulation {
    constructor() {
        // 原子模型画布
        this.atomCanvas = document.getElementById('bohr-atom-canvas');
        this.atomCtx = this.atomCanvas?.getContext('2d');

        // 能级图画布
        this.energyCanvas = document.getElementById('energy-level-canvas');
        this.energyCtx = this.energyCanvas?.getContext('2d');

        if (!this.atomCanvas || !this.energyCanvas) return;

        // 能级参数
        this.initialLevel = 3;
        this.finalLevel = 1;
        this.currentLevel = 3;

        // 电子参数
        this.electronPhase = 0;
        this.electronSpeed = 0.03;

        // 跃迁动画
        this.isTransitioning = false;
        this.transitionProgress = 0;
        this.photons = [];

        // 光谱线记录
        this.spectralLines = [];

        // Hover state (energy panel)
        this.pointer = { x: 0, y: 0 };
        this.hoveredEnergyLevel = null; // n
        this.hoveredSpectralLine = null; // line object from this.spectralLines

        // 物理常数
        this.rydbergEnergy = 13.6;  // eV
        this.planckConstant = 4.136e-15;  // eV·s
        this.speedOfLight = 3e8;  // m/s

        this.init();
    }

    updatePresetButtons() {
        const finalToSeries = {
            1: 'lyman',
            2: 'balmer',
            3: 'paschen'
        };
        const activeSeries = finalToSeries[this.finalLevel] ?? null;

        document.querySelectorAll('.preset-btn').forEach(btn => {
            const shouldBeActive = !!activeSeries && btn.dataset.series === activeSeries;
            btn.classList.toggle('active', shouldBeActive);
        });
    }

    init() {
        this.resizeCanvases();
        this.bindEvents();
        this.bindHoverEvents();
        this.updateCalculations();
        this.updatePresetButtons();
        this.animate();
    }

    layoutLabelsVertical(labels, { top, bottom, minGap }) {
        if (!labels.length) return labels;

        const sorted = [...labels].sort((a, b) => a.y - b.y);
        sorted[0].y = Math.max(top, Math.min(bottom, sorted[0].y));
        for (let i = 1; i < sorted.length; i++) {
            sorted[i].y = Math.max(sorted[i].y, sorted[i - 1].y + minGap);
        }

        const overflow = sorted[sorted.length - 1].y - bottom;
        if (overflow > 0) {
            for (let i = sorted.length - 1; i >= 0; i--) {
                sorted[i].y = Math.max(top, sorted[i].y - overflow);
                if (i > 0) {
                    sorted[i - 1].y = Math.min(sorted[i - 1].y, sorted[i].y - minGap);
                }
            }
        }

        // Clamp again after backward adjustments
        sorted[0].y = Math.max(top, sorted[0].y);
        for (let i = 1; i < sorted.length; i++) {
            sorted[i].y = Math.max(sorted[i].y, sorted[i - 1].y + minGap);
        }
        return sorted;
    }

    resizeCanvases() {
        const resizeCanvas = (canvas) => {
            const rect = canvas.parentElement.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
        };

        resizeCanvas(this.atomCanvas);
        resizeCanvas(this.energyCanvas);

        window.addEventListener('resize', () => {
            resizeCanvas(this.atomCanvas);
            resizeCanvas(this.energyCanvas);
        });
    }

    bindHoverEvents() {
        const canvas = this.energyCanvas;
        if (!canvas) return;

        const getCanvasPoint = (evt) => {
            const rect = canvas.getBoundingClientRect();
            const isTouch = 'touches' in evt;
            const clientX = isTouch ? evt.touches[0]?.clientX : evt.clientX;
            const clientY = isTouch ? evt.touches[0]?.clientY : evt.clientY;
            if (typeof clientX !== 'number' || typeof clientY !== 'number') return null;
            const x = ((clientX - rect.left) * canvas.width) / rect.width;
            const y = ((clientY - rect.top) * canvas.height) / rect.height;
            return { x, y };
        };

        const onMove = (evt) => {
            const pt = getCanvasPoint(evt);
            if (!pt) return;
            this.pointer = pt;
            this.updateHoverState(pt);
        };

        const onLeave = () => {
            this.hoveredEnergyLevel = null;
            this.hoveredSpectralLine = null;
        };

        canvas.addEventListener('mousemove', onMove);
        canvas.addEventListener('mouseleave', onLeave);
        canvas.addEventListener('touchmove', onMove, { passive: true });
        canvas.addEventListener('touchend', onLeave);
    }

    updateHoverState({ x, y }) {
        const w = this.energyCanvas.width;
        const h = this.energyCanvas.height;

        const leftMargin = 50;
        const rightMargin = w * 0.45;
        const topMargin = 40;
        const bottomMargin = 80;
        const chartHeight = h - topMargin - bottomMargin;

        // Energy chart hover (nearest level line)
        const minEnergy = -14;
        const maxEnergy = 0;
        const getY = (E) => topMargin + (1 - (E - minEnergy) / (maxEnergy - minEnergy)) * chartHeight;

        this.hoveredEnergyLevel = null;
        const inChart =
            x >= leftMargin - 30 &&
            x <= rightMargin + 30 &&
            y >= topMargin - 10 &&
            y <= topMargin + chartHeight + 10;

        if (inChart) {
            let bestN = null;
            let bestDist = Infinity;
            for (let n = 1; n <= 6; n++) {
                const yy = getY(this.getEnergy(n));
                const d = Math.abs(y - yy);
                if (d < bestDist) {
                    bestDist = d;
                    bestN = n;
                }
            }
            if (bestDist <= 10) this.hoveredEnergyLevel = bestN;
        }

        // Spectrum hover (nearest spectral line)
        this.hoveredSpectralLine = null;
        const spectrumTop = h - 60;
        const spectrumHeight = 40;
        const spectrumLeft = leftMargin;
        const spectrumRight = w - 20;

        const inSpectrum =
            x >= spectrumLeft &&
            x <= spectrumRight &&
            y >= spectrumTop - 18 &&
            y <= spectrumTop + spectrumHeight + 6;

        if (inSpectrum && this.spectralLines.length) {
            const minWL = 100;
            const maxWL = 800;
            const spectrumWidth = spectrumRight - spectrumLeft;
            let bestLine = null;
            let bestDist = Infinity;
            for (const line of this.spectralLines) {
                const xx = spectrumLeft + ((line.wavelength - minWL) / (maxWL - minWL)) * spectrumWidth;
                const d = Math.abs(x - xx);
                if (d < bestDist) {
                    bestDist = d;
                    bestLine = line;
                }
            }
            if (bestDist <= 10) this.hoveredSpectralLine = bestLine;
        }
    }

    drawTooltip(ctx, { x, y, text, color }) {
        ctx.save();
        ctx.font = '11px Inter, sans-serif';
        const paddingX = 8;
        const paddingY = 6;
        const textW = ctx.measureText(text).width;
        const boxW = textW + paddingX * 2;
        const boxH = 22;

        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        const clampedX = Math.max(8, Math.min(w - boxW - 8, x));
        const clampedY = Math.max(8, Math.min(h - boxH - 8, y));

        const r = 8;
        ctx.beginPath();
        ctx.moveTo(clampedX + r, clampedY);
        ctx.arcTo(clampedX + boxW, clampedY, clampedX + boxW, clampedY + boxH, r);
        ctx.arcTo(clampedX + boxW, clampedY + boxH, clampedX, clampedY + boxH, r);
        ctx.arcTo(clampedX, clampedY + boxH, clampedX, clampedY, r);
        ctx.arcTo(clampedX, clampedY, clampedX + boxW, clampedY, r);
        ctx.closePath();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fill();
        ctx.strokeStyle = color ?? 'rgba(255, 255, 255, 0.22)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillText(text, clampedX + paddingX, clampedY + boxH / 2);
        ctx.restore();
    }

    bindEvents() {
        // 初始能级
        const initialSlider = document.getElementById('initial-level-slider');
        const initialValue = document.getElementById('initial-level-value');
        if (initialSlider) {
            initialSlider.addEventListener('input', () => {
                this.initialLevel = parseInt(initialSlider.value);
                initialValue.textContent = this.initialLevel;

                // 确保初始能级大于终态能级
                if (this.initialLevel <= this.finalLevel) {
                    this.finalLevel = this.initialLevel - 1;
                    document.getElementById('final-level-slider').value = this.finalLevel;
                    document.getElementById('final-level-value').textContent = this.finalLevel;
                }

                this.currentLevel = this.initialLevel;
                this.updateCalculations();
                this.updatePresetButtons();
            });
        }

        // 终态能级
        const finalSlider = document.getElementById('final-level-slider');
        const finalValue = document.getElementById('final-level-value');
        if (finalSlider) {
            finalSlider.addEventListener('input', () => {
                this.finalLevel = parseInt(finalSlider.value);
                finalValue.textContent = this.finalLevel;

                // 确保终态能级小于初始能级
                let initialAdjusted = false;
                if (this.finalLevel >= this.initialLevel) {
                    this.initialLevel = this.finalLevel + 1;
                    initialAdjusted = true;
                    document.getElementById('initial-level-slider').value = this.initialLevel;
                    document.getElementById('initial-level-value').textContent = this.initialLevel;
                }

                // 若初态因约束被自动调整，同步当前显示能级（左侧原子模型）
                if (initialAdjusted && !this.isTransitioning) {
                    this.currentLevel = this.initialLevel;
                }

                this.updateCalculations();
                this.updatePresetButtons();
            });
        }

        // 光谱系列预设
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const series = btn.dataset.series;
                switch (series) {
                    case 'lyman':
                        this.finalLevel = 1;
                        this.initialLevel = 3;
                        break;
                    case 'balmer':
                        this.finalLevel = 2;
                        this.initialLevel = 4;
                        break;
                    case 'paschen':
                        this.finalLevel = 3;
                        this.initialLevel = 5;
                        break;
                }

                document.getElementById('initial-level-slider').value = this.initialLevel;
                document.getElementById('initial-level-value').textContent = this.initialLevel;
                document.getElementById('final-level-slider').value = this.finalLevel;
                document.getElementById('final-level-value').textContent = this.finalLevel;

                this.currentLevel = this.initialLevel;
                this.updateCalculations();
                this.updatePresetButtons();
            });
        });

        // 重置按钮
        document.getElementById('reset-btn')?.addEventListener('click', () => {
            this.currentLevel = this.initialLevel;
            this.spectralLines = [];
            this.photons = [];
            this.isTransitioning = false;
            this.updatePresetButtons();
        });

        // 触发跃迁
        document.getElementById('transition-btn')?.addEventListener('click', () => {
            if (!this.isTransitioning) {
                this.triggerTransition();
            }
        });
    }

    // 计算能级能量
    getEnergy(n) {
        return -this.rydbergEnergy / (n * n);
    }

    // 计算轨道半径（可视化用）
    getOrbitRadius(n, maxRadius) {
        return 25 + n * n * (maxRadius - 25) / 36;  // n² 比例
    }

    updateCalculations() {
        const E_initial = this.getEnergy(this.initialLevel);
        const E_final = this.getEnergy(this.finalLevel);
        const deltaE = E_initial - E_final;  // 发射时为正

        // 波长 (nm)
        const wavelength = (this.planckConstant * this.speedOfLight / deltaE) * 1e9;

        // 频率 (Hz)
        const frequency = deltaE / this.planckConstant;

        // 更新显示
        document.getElementById('energy-diff').textContent = Math.abs(deltaE).toFixed(2);
        document.getElementById('wavelength').textContent = wavelength.toFixed(1);
        document.getElementById('frequency').textContent = (frequency / 1e15).toFixed(2);

        // 确定光谱类型
        let spectrumType = '';
        let spectrumColor = '';
        if (wavelength < 400) {
            spectrumType = '紫外线';
            spectrumColor = '#a855f7';
        } else if (wavelength < 450) {
            spectrumType = '紫光';
            spectrumColor = '#7c3aed';
        } else if (wavelength < 495) {
            spectrumType = '蓝光';
            spectrumColor = '#3b82f6';
        } else if (wavelength < 570) {
            spectrumType = '绿光';
            spectrumColor = '#22c55e';
        } else if (wavelength < 590) {
            spectrumType = '黄光';
            spectrumColor = '#eab308';
        } else if (wavelength < 620) {
            spectrumType = '橙光';
            spectrumColor = '#f97316';
        } else if (wavelength < 750) {
            spectrumType = '红光';
            spectrumColor = '#ef4444';
        } else {
            spectrumType = '红外线';
            spectrumColor = '#991b1b';
        }

        document.getElementById('spectrum-type').textContent = spectrumType;
        document.getElementById('spectrum-type').style.color = spectrumColor;

        this.currentWavelength = wavelength;
        this.currentColor = spectrumColor;
    }

    triggerTransition() {
        if (this.currentLevel === this.finalLevel) {
            this.currentLevel = this.initialLevel;
        }

        this.isTransitioning = true;
        this.transitionProgress = 0;
        this.transitionStartLevel = this.currentLevel;
        this.transitionEndLevel = this.finalLevel;
    }

    updateTransition() {
        if (!this.isTransitioning) return;

        this.transitionProgress += 0.02;

        if (this.transitionProgress >= 1) {
            this.isTransitioning = false;
            this.currentLevel = this.transitionEndLevel;

            // 发射光子
            const w = this.atomCanvas.width;
            const h = this.atomCanvas.height;
            const centerX = w / 2;
            const centerY = h / 2;

            const angle = this.electronPhase;
            const radius = this.getOrbitRadius(this.currentLevel, Math.min(w, h) * 0.4);

            this.photons.push({
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius,
                vx: Math.cos(angle) * 3,
                vy: Math.sin(angle) * 3,
                color: this.currentColor,
                wavelength: this.currentWavelength,
                alpha: 1
            });

            // 添加到光谱
            if (!this.spectralLines.find(l => Math.abs(l.wavelength - this.currentWavelength) < 1)) {
                this.spectralLines.push({
                    wavelength: this.currentWavelength,
                    color: this.currentColor,
                    intensity: 1
                });
            }
        }
    }

    drawAtomModel() {
        const ctx = this.atomCtx;
        const w = this.atomCanvas.width;
        const h = this.atomCanvas.height;
        const centerX = w / 2;
        const centerY = h / 2;
        const maxRadius = Math.min(w, h) * 0.4;

        // 清空画布
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(0, 0, w, h);

        // 绘制轨道（n=1到6）
        const orbitLabelAngle = -Math.PI / 6; // guide-line anchor (upper-right)
        const orbitLabelX = Math.max(8, Math.min(w - 42, centerX + maxRadius + 28));
        const orbitLabels = [];
        for (let n = 1; n <= 6; n++) {
            const radius = this.getOrbitRadius(n, maxRadius);
            const isCurrentLevel = n === Math.round(this.currentLevel);
            const isInTransition = this.isTransitioning &&
                (n === this.transitionStartLevel || n === this.transitionEndLevel);

            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);

            if (isCurrentLevel || isInTransition) {
                ctx.strokeStyle = 'rgba(99, 102, 241, 0.6)';
                ctx.lineWidth = 2;
            } else {
                ctx.strokeStyle = 'rgba(99, 102, 241, 0.2)';
                ctx.lineWidth = 1;
            }
            ctx.stroke();

            const anchorX = centerX + Math.cos(orbitLabelAngle) * radius;
            const anchorY = centerY + Math.sin(orbitLabelAngle) * radius;
            orbitLabels.push({
                n,
                text: `n=${n}`,
                anchorX,
                anchorY,
                x: orbitLabelX,
                y: anchorY,
                isCurrentLevel
            });
        }

        // Orbit labels: right-side list with leader lines (avoid overlap)
        const laidOut = this.layoutLabelsVertical(orbitLabels, {
            top: 18,
            bottom: h - 18,
            minGap: 14
        });

        ctx.save();
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        laidOut.forEach(l => {
            const color = l.isCurrentLevel ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.45)';
            ctx.strokeStyle = l.isCurrentLevel ? 'rgba(255, 255, 255, 0.30)' : 'rgba(255, 255, 255, 0.16)';
            ctx.lineWidth = 1;

            const elbowX = l.x - 10;
            ctx.beginPath();
            ctx.moveTo(l.anchorX, l.anchorY);
            ctx.lineTo(elbowX, l.y);
            ctx.lineTo(l.x - 2, l.y);
            ctx.stroke();

            ctx.fillStyle = color;
            ctx.fillText(l.text, l.x, l.y);
        });
        ctx.restore();

        // 绘制原子核
        const nucleusGradient = ctx.createRadialGradient(
            centerX - 3, centerY - 3, 0,
            centerX, centerY, 15
        );
        nucleusGradient.addColorStop(0, '#ef4444');
        nucleusGradient.addColorStop(0.5, '#dc2626');
        nucleusGradient.addColorStop(1, '#991b1b');

        ctx.beginPath();
        ctx.arc(centerX, centerY, 12, 0, Math.PI * 2);
        ctx.fillStyle = nucleusGradient;
        ctx.fill();

        ctx.fillStyle = 'white';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+', centerX, centerY);

        // 计算电子位置
        let electronRadius;
        if (this.isTransitioning) {
            // 跃迁时插值
            const startRadius = this.getOrbitRadius(this.transitionStartLevel, maxRadius);
            const endRadius = this.getOrbitRadius(this.transitionEndLevel, maxRadius);
            electronRadius = startRadius + (endRadius - startRadius) * this.transitionProgress;
        } else {
            electronRadius = this.getOrbitRadius(this.currentLevel, maxRadius);
        }

        const electronX = centerX + Math.cos(this.electronPhase) * electronRadius;
        const electronY = centerY + Math.sin(this.electronPhase) * electronRadius;

        // 跃迁时的发光效果
        if (this.isTransitioning) {
            const glowGradient = ctx.createRadialGradient(
                electronX, electronY, 0,
                electronX, electronY, 30
            );
            glowGradient.addColorStop(0, this.currentColor + 'cc');
            glowGradient.addColorStop(0.5, this.currentColor + '40');
            glowGradient.addColorStop(1, 'transparent');

            ctx.beginPath();
            ctx.arc(electronX, electronY, 30, 0, Math.PI * 2);
            ctx.fillStyle = glowGradient;
            ctx.fill();
        }

        // 绘制电子
        const electronGradient = ctx.createRadialGradient(
            electronX, electronY, 0,
            electronX, electronY, 15
        );
        electronGradient.addColorStop(0, 'rgba(34, 211, 238, 0.9)');
        electronGradient.addColorStop(0.5, 'rgba(34, 211, 238, 0.4)');
        electronGradient.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(electronX, electronY, 15, 0, Math.PI * 2);
        ctx.fillStyle = electronGradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(electronX, electronY, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#22d3ee';
        ctx.fill();

        ctx.fillStyle = '#0a0a14';
        ctx.font = 'bold 8px Arial';
        ctx.fillText('−', electronX, electronY);

        // 绘制光子
        for (let i = this.photons.length - 1; i >= 0; i--) {
            const p = this.photons[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= 0.01;

            if (p.alpha <= 0 || p.x < 0 || p.x > w || p.y < 0 || p.y > h) {
                this.photons.splice(i, 1);
                continue;
            }

            // 波浪效果
            const waveOffset = Math.sin(Date.now() * 0.01 + i) * 3;

            // 光子发光
            const photonGradient = ctx.createRadialGradient(
                p.x, p.y + waveOffset, 0,
                p.x, p.y + waveOffset, 20
            );
            photonGradient.addColorStop(0, p.color + Math.floor(p.alpha * 255).toString(16).padStart(2, '0'));
            photonGradient.addColorStop(1, 'transparent');

            ctx.beginPath();
            ctx.arc(p.x, p.y + waveOffset, 20, 0, Math.PI * 2);
            ctx.fillStyle = photonGradient;
            ctx.fill();

            // 光子符号
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('γ', p.x, p.y + waveOffset + 5);
            ctx.globalAlpha = 1;
        }
    }

    drawEnergyLevels() {
        const ctx = this.energyCtx;
        const w = this.energyCanvas.width;
        const h = this.energyCanvas.height;

        // 清空画布
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(0, 0, w, h);

        const leftMargin = 50;
        const rightMargin = w * 0.45;
        const topMargin = 40;
        const bottomMargin = 80;

        const chartHeight = h - topMargin - bottomMargin;
        const chartWidth = rightMargin - leftMargin;

        // 能量范围
        const minEnergy = -14;  // eV
        const maxEnergy = 0;

        const getY = (E) => {
            return topMargin + (1 - (E - minEnergy) / (maxEnergy - minEnergy)) * chartHeight;
        };

        // 绘制能级标尺
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(leftMargin - 10, topMargin);
        ctx.lineTo(leftMargin - 10, topMargin + chartHeight);
        ctx.stroke();

        const levels = [];
        for (let n = 1; n <= 6; n++) {
            const E = this.getEnergy(n);
            const y = getY(E);
            const isActive =
                n === this.currentLevel ||
                (this.isTransitioning && (n === this.transitionStartLevel || n === this.transitionEndLevel));
            levels.push({ n, E, y, isActive });
        }

        // Draw level lines first
        levels.forEach(lvl => {
            ctx.strokeStyle = lvl.isActive ? '#6366f1' : 'rgba(99, 102, 241, 0.4)';
            ctx.lineWidth = lvl.isActive ? 3 : 1;
            ctx.beginPath();
            ctx.moveTo(leftMargin, lvl.y);
            ctx.lineTo(rightMargin - 20, lvl.y);
            ctx.stroke();
        });

        // Labels: hide when too dense, show on hover (and always keep current visible)
        const minLabelGapY = 14;
        const currentN = Math.round(this.currentLevel);
        const hoveredN = this.hoveredEnergyLevel;
        const isMustShow = (n) => n === currentN || n === hoveredN;

        const sorted = [...levels].sort((a, b) => a.y - b.y);
        const selected = [];
        for (const lvl of sorted) {
            if (!selected.length) {
                selected.push(lvl);
                continue;
            }
            const last = selected[selected.length - 1];
            const tooClose = lvl.y - last.y < minLabelGapY;
            if (!tooClose) {
                selected.push(lvl);
                continue;
            }
            if (isMustShow(lvl.n) && !isMustShow(last.n)) {
                selected[selected.length - 1] = lvl;
            }
        }

        // If current/hover label got skipped due to ordering, ensure it shows (replace nearest)
        for (const mustN of [currentN, hoveredN]) {
            if (!mustN) continue;
            if (selected.some(s => s.n === mustN)) continue;
            const target = levels.find(l => l.n === mustN);
            if (!target) continue;
            let bestIdx = 0;
            let bestDist = Infinity;
            for (let i = 0; i < selected.length; i++) {
                const d = Math.abs(selected[i].y - target.y);
                if (d < bestDist) {
                    bestDist = d;
                    bestIdx = i;
                }
            }
            selected[bestIdx] = target;
        }

        selected.sort((a, b) => a.y - b.y);

        selected.forEach(lvl => {
            const isEmphasis = lvl.n === currentN || lvl.n === hoveredN;
            ctx.fillStyle = isEmphasis ? 'white' : 'rgba(255, 255, 255, 0.6)';
            ctx.font = isEmphasis ? 'bold 12px Inter, sans-serif' : '11px Inter, sans-serif';

            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(`n=${lvl.n}`, leftMargin - 15, lvl.y);

            ctx.textAlign = 'left';
            ctx.fillText(`${lvl.E.toFixed(2)} eV`, rightMargin - 15, lvl.y);
        });

        // 绘制跃迁箭头
        if (this.transitionStartLevel && this.transitionEndLevel) {
            const y1 = getY(this.getEnergy(this.transitionStartLevel));
            const y2 = getY(this.getEnergy(this.transitionEndLevel));
            const arrowX = (leftMargin + rightMargin) / 2;

            // 箭头
            ctx.strokeStyle = this.currentColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(arrowX, y1);
            ctx.lineTo(arrowX, y2);
            ctx.stroke();

            // 箭头头部
            const arrowSize = 8;
            const direction = y2 > y1 ? 1 : -1;
            ctx.fillStyle = this.currentColor;
            ctx.beginPath();
            ctx.moveTo(arrowX, y2);
            ctx.lineTo(arrowX - arrowSize, y2 - direction * arrowSize * 1.5);
            ctx.lineTo(arrowX + arrowSize, y2 - direction * arrowSize * 1.5);
            ctx.closePath();
            ctx.fill();

            // 光子符号
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('γ', arrowX + 20, (y1 + y2) / 2 + 5);
        }

        // 绘制光谱区域
        const spectrumTop = h - 60;
        const spectrumHeight = 40;

        // 光谱背景（可见光谱）
        const spectrumGradient = ctx.createLinearGradient(leftMargin, 0, w - 20, 0);
        spectrumGradient.addColorStop(0, '#7c3aed');    // 紫
        spectrumGradient.addColorStop(0.15, '#3b82f6');  // 蓝
        spectrumGradient.addColorStop(0.35, '#22c55e');  // 绿
        spectrumGradient.addColorStop(0.5, '#eab308');   // 黄
        spectrumGradient.addColorStop(0.65, '#f97316'); // 橙
        spectrumGradient.addColorStop(0.85, '#ef4444'); // 红
        spectrumGradient.addColorStop(1, '#991b1b');     // 深红

        ctx.fillStyle = spectrumGradient;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(leftMargin, spectrumTop, w - leftMargin - 20, spectrumHeight);
        ctx.globalAlpha = 1;

        // 绘制光谱线
        const minWL = 100;
        const maxWL = 800;
        const spectrumWidth = w - leftMargin - 20;

        const spectralPoints = this.spectralLines
            .map(line => ({
                line,
                x: leftMargin + ((line.wavelength - minWL) / (maxWL - minWL)) * spectrumWidth
            }))
            .filter(p => p.x >= leftMargin && p.x <= w - 20)
            .sort((a, b) => a.x - b.x);

        spectralPoints.forEach(p => {
            ctx.strokeStyle = p.line.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(p.x, spectrumTop);
            ctx.lineTo(p.x, spectrumTop + spectrumHeight);
            ctx.stroke();
        });

        // Labels: hide when dense; show on hover tooltip
        const densityPx = spectralPoints.length ? spectrumWidth / spectralPoints.length : Infinity;
        const tooDense = densityPx < 28;

        const hoveredLine = this.hoveredSpectralLine;
        if (!tooDense) {
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'alphabetic';

            const chosen = [];
            let lastRightEdge = -Infinity;
            for (const p of spectralPoints) {
                const text = `${p.line.wavelength.toFixed(0)}nm`;
                const halfW = ctx.measureText(text).width / 2;
                const leftEdge = p.x - halfW;
                const rightEdge = p.x + halfW;
                const padding = 8;
                const isHovered = hoveredLine && p.line === hoveredLine;

                if (isHovered || leftEdge - padding > lastRightEdge) {
                    chosen.push({ ...p, text, halfW });
                    lastRightEdge = rightEdge + padding;
                }
            }

            chosen.forEach(p => {
                ctx.fillStyle = p.line.color;
                ctx.fillText(p.text, p.x, spectrumTop - 5);
            });
        }

        // Hover tooltips (energy levels + spectrum)
        if (this.hoveredEnergyLevel) {
            const n = this.hoveredEnergyLevel;
            const E = this.getEnergy(n);
            this.drawTooltip(ctx, {
                x: this.pointer.x + 10,
                y: this.pointer.y - 28,
                text: `n=${n}  ${E.toFixed(2)} eV`,
                color: 'rgba(99, 102, 241, 0.70)'
            });
        }

        if (this.hoveredSpectralLine) {
            const line = this.hoveredSpectralLine;
            const x = leftMargin + ((line.wavelength - minWL) / (maxWL - minWL)) * spectrumWidth;
            this.drawTooltip(ctx, {
                x: x - 30,
                y: spectrumTop - 40,
                text: `${line.wavelength.toFixed(1)} nm`,
                color: line.color
            });
        }

        // 光谱标签
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('UV', leftMargin + 20, spectrumTop + spectrumHeight + 15);
        ctx.fillText('可见光', w / 2, spectrumTop + spectrumHeight + 15);
        ctx.fillText('IR', w - 40, spectrumTop + spectrumHeight + 15);
    }

    animate() {
        // 更新电子相位
        this.electronPhase += this.electronSpeed;

        // 更新跃迁
        this.updateTransition();

        // 绘制
        this.drawAtomModel();
        this.drawEnergyLevels();

        requestAnimationFrame(() => this.animate());
    }
}

// 扩展默认内容
if (typeof DefaultContent !== 'undefined') {
    DefaultContent['bohr-model'] = `# 玻尔原子模型

1913年，丹麦物理学家尼尔斯·玻尔提出了革命性的原子模型，成功解释了氢原子光谱的离散谱线。

## 玻尔假说

1. **定态假说**：电子只能在特定的"允许轨道"上运动，不辐射能量
2. **量子化条件**：角动量只能是 ℏ 的整数倍
   $$L = n\\hbar, \\quad n = 1, 2, 3, ...$$
3. **跃迁假说**：电子在轨道间跃迁时，发射或吸收光子

## 氢原子能级

氢原子第 n 能级的能量：
$$E_n = -\\frac{13.6 \\text{ eV}}{n^2}$$

> 💡 **试试看**：调整能级，点击"触发跃迁"观察光子发射！

## 光谱系列

| 系列 | 终态能级 | 波长范围 |
|------|---------|---------|
| 莱曼系 | n=1 | 紫外线 |
| 巴尔末系 | n=2 | 可见光 |
| 帕邢系 | n=3 | 红外线 |

## 里德伯公式

$$\\frac{1}{\\lambda} = R_H \\left( \\frac{1}{n_f^2} - \\frac{1}{n_i^2} \\right)$$

其中 $R_H = 1.097 \\times 10^7 \\text{ m}^{-1}$ 是里德伯常数。`;
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    new BohrModelSimulation();
});
