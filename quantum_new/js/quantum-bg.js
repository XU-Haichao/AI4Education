/**
 * 量子力学探索之旅 - 量子主题背景动画
 * 展示漂浮的量子粒子、波动效果和粒子连线
 */

class QuantumBackground {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.connections = [];
        this.waves = [];
        this.mouse = { x: null, y: null };

        // 配置
        this.config = {
            particleCount: 60,
            particleMinSize: 1,
            particleMaxSize: 4,
            particleSpeed: 0.3,
            connectionDistance: 150,
            connectionOpacity: 0.15,
            waveCount: 3,
            colors: {
                electron: '#22d3ee',    // 青色 - 电子
                photon: '#ec4899',      // 粉色 - 光子
                quark: '#a855f7',       // 紫色 - 夸克
                wave: 'rgba(99, 102, 241, 0.1)'  // 波动
            }
        };

        this.init();
    }

    init() {
        this.resize();
        this.createParticles();
        this.createWaves();
        this.bindEvents();
        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createParticles() {
        const types = ['electron', 'photon', 'quark'];

        for (let i = 0; i < this.config.particleCount; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: this.config.particleMinSize + Math.random() * (this.config.particleMaxSize - this.config.particleMinSize),
                vx: (Math.random() - 0.5) * this.config.particleSpeed,
                vy: (Math.random() - 0.5) * this.config.particleSpeed,
                type: type,
                color: this.config.colors[type],
                alpha: 0.3 + Math.random() * 0.7,
                pulsePhase: Math.random() * Math.PI * 2
            });
        }
    }

    createWaves() {
        for (let i = 0; i < this.config.waveCount; i++) {
            this.waves.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                radius: 0,
                maxRadius: 200 + Math.random() * 200,
                speed: 0.5 + Math.random() * 0.5,
                alpha: 0.3
            });
        }
    }

    bindEvents() {
        window.addEventListener('resize', () => this.resize());

        this.canvas.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.mouse.x = null;
            this.mouse.y = null;
        });
    }

    updateParticles() {
        this.particles.forEach(p => {
            // 移动
            p.x += p.vx;
            p.y += p.vy;

            // 边界处理 - 环绕
            if (p.x < -10) p.x = this.canvas.width + 10;
            if (p.x > this.canvas.width + 10) p.x = -10;
            if (p.y < -10) p.y = this.canvas.height + 10;
            if (p.y > this.canvas.height + 10) p.y = -10;

            // 脉冲效果
            p.pulsePhase += 0.02;

            // 鼠标交互 - 轻微吸引
            if (this.mouse.x !== null && this.mouse.y !== null) {
                const dx = this.mouse.x - p.x;
                const dy = this.mouse.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 200) {
                    const force = (200 - dist) / 200 * 0.01;
                    p.vx += dx * force;
                    p.vy += dy * force;

                    // 速度限制
                    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                    if (speed > 2) {
                        p.vx = (p.vx / speed) * 2;
                        p.vy = (p.vy / speed) * 2;
                    }
                }
            }
        });
    }

    updateWaves() {
        this.waves.forEach(w => {
            w.radius += w.speed;
            w.alpha = 0.3 * (1 - w.radius / w.maxRadius);

            if (w.radius > w.maxRadius) {
                w.x = Math.random() * this.canvas.width;
                w.y = Math.random() * this.canvas.height;
                w.radius = 0;
                w.alpha = 0.3;
            }
        });
    }

    drawParticles() {
        this.particles.forEach(p => {
            const pulseSize = p.size + Math.sin(p.pulsePhase) * 0.5;
            const glowSize = pulseSize * 3;

            // 发光效果
            const gradient = this.ctx.createRadialGradient(
                p.x, p.y, 0,
                p.x, p.y, glowSize
            );
            gradient.addColorStop(0, p.color);
            gradient.addColorStop(0.4, p.color + '40');
            gradient.addColorStop(1, 'transparent');

            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
            this.ctx.fillStyle = gradient;
            this.ctx.fill();

            // 核心
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, pulseSize, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.alpha;
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
        });
    }

    drawConnections() {
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const p1 = this.particles[i];
                const p2 = this.particles[j];
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < this.config.connectionDistance) {
                    const opacity = (1 - dist / this.config.connectionDistance) * this.config.connectionOpacity;

                    // 使用渐变连线
                    const gradient = this.ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
                    gradient.addColorStop(0, p1.color + Math.floor(opacity * 255).toString(16).padStart(2, '0'));
                    gradient.addColorStop(1, p2.color + Math.floor(opacity * 255).toString(16).padStart(2, '0'));

                    this.ctx.beginPath();
                    this.ctx.moveTo(p1.x, p1.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    this.ctx.strokeStyle = gradient;
                    this.ctx.lineWidth = 0.5;
                    this.ctx.stroke();
                }
            }
        }
    }

    drawWaves() {
        this.waves.forEach(w => {
            if (w.alpha > 0) {
                this.ctx.beginPath();
                this.ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
                this.ctx.strokeStyle = `rgba(99, 102, 241, ${w.alpha})`;
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }
        });
    }

    animate() {
        // 清空画布 - 使用渐变背景
        const bgGradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        bgGradient.addColorStop(0, '#0a0a14');
        bgGradient.addColorStop(1, '#12121f');
        this.ctx.fillStyle = bgGradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 更新和绘制
        this.updateWaves();
        this.drawWaves();

        this.updateParticles();
        this.drawConnections();
        this.drawParticles();

        requestAnimationFrame(() => this.animate());
    }
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    new QuantumBackground('quantum-canvas');
});

// 暴露到全局
window.QuantumBackground = QuantumBackground;
