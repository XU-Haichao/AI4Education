/**
 * 路径积分模拟 - QED光子反射实验
 * 基于费曼《QED: 光和物质的奇妙理论》中的经典解释
 * 展示光为何看起来只走直线（反射角=入射角），以及如何利用路径积分原理制造衍射光栅
 */

class PathIntegralSimulation {
    constructor() {
        this.setupCanvas = document.getElementById('setup-canvas');
        this.phasorCanvas = document.getElementById('phasor-canvas');

        if (!this.setupCanvas || !this.phasorCanvas) {
            console.error('Canvas elements not found');
            return;
        }

        this.setupCtx = this.setupCanvas.getContext('2d');
        this.phasorCtx = this.phasorCanvas.getContext('2d');

        // State
        this.wavelength = 500; // nm
        this.detectorYRatio = 0.7; // 0 to 1
        this.mirrorSegments = []; // Array of booleans (true = reflective, false = blocked)
        this.segmentCount = 120; // Number of paths/mirror pieces

        // Geometry
        this.sourcePos = { x: 0.1, y: 0.3 }; // relative coordinates
        this.mirrorY = 0.9;
        this.mirrorStart = 0.1;
        this.mirrorEnd = 0.9;

        // Interaction
        this.isDragging = false;
        this.eraseMode = true; // true = block, false = restore

        this.init();
    }

    init() {
        // Initialize mirror segments (all reflective by default)
        for (let i = 0; i < this.segmentCount; i++) {
            this.mirrorSegments.push(true);
        }

        this.resizeCanvases();
        this.bindEvents();
        this.updateAndDraw();

        window.addEventListener('resize', () => {
            this.resizeCanvases();
            this.updateAndDraw();
        });
    }

    resizeCanvases() {
        const resize = (canvas) => {
            const container = canvas.parentElement;
            const rect = container.getBoundingClientRect();
            // Safety check for zero size
            const w = rect.width || 800;
            const h = rect.height || 300;
            canvas.width = w;
            canvas.height = h;
            return { w, h };
        };

        const s = resize(this.setupCanvas);
        this.setupW = s.w;
        this.setupH = s.h;

        const p = resize(this.phasorCanvas);
        this.phasorW = p.w;
        this.phasorH = p.h;
    }

    bindEvents() {
        // Sliders
        const wlSlider = document.getElementById('wavelength-slider');
        const detSlider = document.getElementById('detector-slider');

        wlSlider?.addEventListener('input', (e) => {
            this.wavelength = parseInt(e.target.value);
            document.getElementById('wavelength-value').textContent = this.wavelength + ' nm';
            this.updateAndDraw();
        });

        detSlider?.addEventListener('input', (e) => {
            // Map 0-100 to y position (0.1 to 0.6)
            // Warning: Avoid y too low or it hits mirror
            const val = parseInt(e.target.value);
            // Source is at y=0.3. Let's make detector move vertically roughly aligned or offset
            // Let's interpret slider as Y pos relative to some range
            // We'll fix X at right side (0.9)
            this.detectorYRatio = 0.1 + (val / 100) * 0.5;
            this.updateAndDraw();
        });

        // Buttons
        document.getElementById('reset-mirror-btn')?.addEventListener('click', () => {
            this.mirrorSegments.fill(true);
            this.updateAndDraw();
        });

        document.getElementById('block-center-btn')?.addEventListener('click', () => {
            // Block the "classical" reflection point roughly in middle
            // Actually, physics says reflection point depends on geometry.
            // S=(0.1, 0.3), P=(0.9, y). Mirror at 0.9.
            // Classical point x_c minimizes distance. 
            // Simple geometry: x_c is where ray travels.
            // Let's just block the geometric middle of the current active area for simplicity,
            // or calculate the stationary phase point.
            // Better: Create a grating pattern!
            for (let i = 0; i < this.segmentCount; i++) {
                // Block periodic segments to make a grating
                // This creates interference colors/patterns
                this.mirrorSegments[i] = (i % 6) < 3;
            }
            this.updateAndDraw();
        });

        // Canvas Interaction (Painting on mirror)
        const getSegmentIndex = (e) => {
            const rect = this.setupCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            // Mirror spans mirrorStart * W to mirrorEnd * W
            const mStart = this.mirrorStart * this.setupW;
            const mEnd = this.mirrorEnd * this.setupW;
            const mWidth = mEnd - mStart;

            if (x < mStart || x > mEnd) return -1;

            const relX = (x - mStart) / mWidth;
            return Math.floor(relX * this.segmentCount);
        };

        this.setupCanvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            const idx = getSegmentIndex(e);
            if (idx >= 0 && idx < this.segmentCount) {
                // Toggle mode based on first click state
                this.eraseMode = this.mirrorSegments[idx];
                this.mirrorSegments[idx] = !this.eraseMode;
                this.updateAndDraw();
            }
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        this.setupCanvas.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            const idx = getSegmentIndex(e);
            if (idx >= 0 && idx < this.segmentCount) {
                this.mirrorSegments[idx] = !this.eraseMode;
                this.updateAndDraw();
            }
        });
    }

    calculatePhysics() {
        const paths = [];
        let totalPhasor = { x: 0, y: 0 };
        let activePathsCount = 0;

        // Coordinates in pixels
        const Sx = this.sourcePos.x * this.setupW;
        const Sy = this.sourcePos.y * this.setupH;

        const Px = 0.9 * this.setupW;
        const Py = this.detectorYRatio * this.setupH;

        const My = this.mirrorY * this.setupH;
        const mStart = this.mirrorStart * this.setupW;
        const mStep = (this.mirrorEnd - this.mirrorStart) * this.setupW / this.segmentCount;

        for (let i = 0; i < this.segmentCount; i++) {
            const Mx = mStart + (i + 0.5) * mStep; // Center of segment

            // Path Length L = SM + MP
            const d1 = Math.hypot(Mx - Sx, My - Sy);
            const d2 = Math.hypot(Px - Mx, Py - My);
            const L = d1 + d2;

            // Phase phi = (L / lambda) * 2PI
            // Scale geometry to physics units? 
            // Let's say screen width ~ 100 micron for realistic-ish interference?
            // Actually, we just need the relative phases to spin fast enough.
            // L is in pixels (~800). Wavelength is 500nm.
            // We need a scaling factor to make phase rotate many times across the mirror.
            const scaleFactor = 20.0; // Tuning parameter for visual swirl
            const phi = (L / this.wavelength) * scaleFactor * Math.PI * 2;

            const isActive = this.mirrorSegments[i];

            if (isActive) {
                const px = Math.cos(phi);
                const py = Math.sin(phi);
                totalPhasor.x += px;
                totalPhasor.y += py;
                activePathsCount++;
            }

            paths.push({
                idx: i,
                Mx, My,
                L,
                phi,
                active: isActive
            });
        }

        return { paths, totalPhasor, activePathsCount, Sx, Sy, Px, Py };
    }

    updateAndDraw() {
        const data = this.calculatePhysics();
        this.data = data; // Store for render

        this.drawSetup(data);
        this.drawPhasors(data);
        this.updateUI(data);
    }

    drawSetup(data) {
        const ctx = this.setupCtx;
        const w = this.setupW;
        const h = this.setupH;

        ctx.clearRect(0, 0, w, h);

        // Background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);

        // Mirror Base
        const mirrorY = data.paths[0].My;
        const mStart = data.paths[0].Mx - (data.paths[1].Mx - data.paths[0].Mx) / 2;
        const mEnd = data.paths[data.paths.length - 1].Mx + (data.paths[1].Mx - data.paths[0].Mx) / 2;

        ctx.fillStyle = '#334155';
        ctx.fillRect(mStart, mirrorY, mEnd - mStart, 5);

        // Draw Segments (Mirror pieces)
        const segWidth = (mEnd - mStart) / this.segmentCount;
        for (let i = 0; i < this.segmentCount; i++) {
            if (this.mirrorSegments[i]) {
                ctx.fillStyle = '#cbd5e1'; // Reflective silver
                ctx.fillRect(mStart + i * segWidth, mirrorY, segWidth - 1, 4);

                // Active Ray (faint)
                ctx.strokeStyle = `hsla(${this.wavelength / 2}, 70%, 70%, 0.1)`;
                ctx.beginPath();
                ctx.moveTo(data.Sx, data.Sy);
                const Mx = data.paths[i].Mx;
                ctx.lineTo(Mx, mirrorY);
                ctx.lineTo(data.Px, data.Py);
                ctx.stroke();
            } else {
                // Draw "Black Cloth" (improved visual)
                ctx.fillStyle = '#020617';
                // Draw a rectangle with a slight "hanging" effect
                const blockHeight = 10;
                ctx.fillRect(mStart + i * segWidth - 1, mirrorY - 5, segWidth + 1, blockHeight);

                // Texture for "cloth"
                ctx.strokeStyle = '#1e293b';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(mStart + i * segWidth + 2, mirrorY - 5);
                ctx.lineTo(mStart + i * segWidth + 2, mirrorY + 5);
                ctx.stroke();
            }
        }

        // Draw Source
        ctx.beginPath();
        ctx.arc(data.Sx, data.Sy, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#fbbf24'; // Yellow Sun
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '12px Inter';
        ctx.fillText('光源 S', data.Sx - 20, data.Sy - 15);

        // Draw Detector
        ctx.beginPath();
        ctx.arc(data.Px, data.Py, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#22d3ee'; // Cyan Detector
        ctx.fill();
        ctx.fillText('探测器 P', data.Px - 20, data.Py - 15);

        // Draw Hint Text
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.textAlign = 'center';
        ctx.fillText('点击并在镜面上拖动可遮挡/恢复光路', w / 2, h - 10);
        ctx.textAlign = 'left';

        // Highlight Classical Path
        const h1 = Math.abs(data.Sy - mirrorY);
        const h2 = Math.abs(data.Py - mirrorY);
        const D = data.Px - data.Sx;
        const Xc = data.Sx + D * (h1 / (h1 + h2));

        ctx.beginPath();
        ctx.moveTo(data.Sx, data.Sy);
        ctx.lineTo(Xc, mirrorY);
        ctx.lineTo(data.Px, data.Py);
        ctx.strokeStyle = 'rgba(255, 200, 50, 0.8)'; // Gold color
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label for Classical Path
        ctx.fillStyle = 'rgba(255, 200, 50, 1)';
        ctx.font = 'bold 12px Inter';
        ctx.fillText('经典光路 (Fermat点)', Xc - 40, mirrorY - 15);
    }

    drawPhasors(data) {
        const ctx = this.phasorCtx;
        const w = this.phasorW;
        const h = this.phasorH;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);

        // Step 1: Calculate raw points of the phasor chain (unit scale)
        const points = [{ x: 0, y: 0 }];
        let currX = 0;
        let currY = 0;
        for (let p of data.paths) {
            if (p.active) {
                currX += Math.cos(p.phi);
                currY += Math.sin(p.phi);
                points.push({ x: currX, y: currY });
            }
        }

        if (points.length < 2) return;

        // Step 2: Find bounding box
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (let p of points) {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        }

        const bW = maxX - minX || 1;
        const bH = maxY - minY || 1;

        // Step 3: Calculate optimal scale to fit while keeping START at Center
        // To maintain physical meaning and fill height, we scale based on the maximum radius needed
        const maxExtentX = Math.max(Math.abs(minX), Math.abs(maxX));
        const maxExtentY = Math.max(Math.abs(minY), Math.abs(maxY));
        const maxRadius = Math.sqrt(maxExtentX ** 2 + maxExtentY ** 2) || 1;

        // Scale such that the maximum radius fits within 90% of the available height (from center to edge)
        // Since it's a square, h is the limiting dimension.
        const scale = (h * 0.45) / maxRadius;

        // Start point is fixed at center
        const offsetX = w * 0.5;
        const offsetY = h * 0.5;

        // Step 4: Draw the chain
        ctx.lineWidth = 2;
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];

            // Map index back to original path index for color (approximate if gaps exist)
            // But we can just use the loop index for rainbow
            const colorProgress = i / points.length;
            ctx.strokeStyle = `hsl(${colorProgress * 360}, 70%, 65%)`;

            ctx.beginPath();
            ctx.moveTo(p1.x * scale + offsetX, p1.y * scale + offsetY);
            ctx.lineTo(p2.x * scale + offsetX, p2.y * scale + offsetY);
            ctx.stroke();
        }

        // Draw Resultant Vector (Start to End)
        const start = points[0];
        const end = points[points.length - 1];

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(start.x * scale + offsetX, start.y * scale + offsetY);
        ctx.lineTo(end.x * scale + offsetX, end.y * scale + offsetY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Arrowhead on resultant
        const headX = end.x * scale + offsetX;
        const headY = end.y * scale + offsetY;
        const angle = Math.atan2((end.y - start.y), (end.x - start.x));
        const headLen = 12;
        ctx.beginPath();
        ctx.moveTo(headX, headY);
        ctx.lineTo(headX - headLen * Math.cos(angle - Math.PI / 6), headY - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(headX - headLen * Math.cos(angle + Math.PI / 6), headY - headLen * Math.sin(angle + Math.PI / 6));
        ctx.fillStyle = '#fff';
        ctx.fill();

        // Label - Bottom right to avoid overlap
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '12px Inter';
        ctx.textAlign = 'right';
        ctx.fillText('总概率幅 (相量之和)', w - 15, h - 15);
        ctx.textAlign = 'left';
    }

    updateUI(data) {
        // Prob = Length squared of resultant
        const R2 = data.totalPhasor.x ** 2 + data.totalPhasor.y ** 2;
        // Max possible R2 is (activeCount)^2
        const maxR2 = this.segmentCount ** 2; // Normalize against theoretical max if mirror was perfect phase match? 
        // No, normalize against "flat mirror classical max"?
        // Just normalize to a reasonable constant for UX
        const normalizedProb = Math.min((R2 / (this.segmentCount * 10)) * 100, 100);

        document.getElementById('probability-value').textContent = R2.toFixed(1);
        document.getElementById('active-paths-value').textContent = data.activePathsCount;

        const bar = document.getElementById('prob-bar');
        if (bar) bar.style.width = Math.min(normalizedProb, 100) + '%';

        // Dynamic explanation
        const expl = (R2 < 10 && data.activePathsCount > 50)
            ? "⚠️ 现在的路径虽然多，但相位互相抵消了！(相消干涉)"
            : "✨ 能量成功传输到了探测器！";
        // Maybe update text somewhere? kept simple for now.
    }
}

// Initial Launch
if (typeof DefaultContent !== 'undefined') {
    DefaultContent['path-integral'] = `# 费曼的量子镜子
你是否想过，为什么光在镜子上反射时，**入射角等于反射角**？

### 经典解释
只是告诉你“就是这样”。

### 费曼的 QED 解释
**光实际上照到了镜子的每一个角落！**
但是在大部分区域，光走的路径长度变化很快，导致相位疯狂旋转（看下方的螺旋线），箭头方向各异，互相抵消。
只有在“经典反射点”附近，路径长度变化很慢（极值点），箭头方向几乎一致，叠加出了巨大的合振幅。

### 动手实验
1. **挡住中心**：点击下方按钮或手动涂黑镜子中间。你会发现——光消失了！因为你挡住了唯一“有效”贡献的区域。
2. **量子光栅**：试着把镜子涂成黑白相间的条纹（或点击“挡住中心”按钮生成光栅），你会惊讶地发现，被挡住大部分反而可能让光更亮！这是因为你挡住了那些“捣乱”（反相消）的路径。
3. **逐条恢复**：尝试遮挡所有光路，然后一条一条地恢复不同位置的光路，观察右侧相量螺旋是如何逐渐构建或抵消的。
`;
}

document.addEventListener('DOMContentLoaded', () => {
    new PathIntegralSimulation();
});
