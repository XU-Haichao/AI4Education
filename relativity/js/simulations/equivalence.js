/**
 * 等效原理交互演示
 */

class EquivalenceSimulation {
    constructor() {
        this.canvas = document.getElementById('demo-canvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.scene = 'gravity'; // gravity | rocket
        this.balls = [];
        this.g = 9.8;

        this.resize();
        this.initControls();
        this.initEditor();
        this.loadContent();
        this.animate();

        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
    }

    initControls() {
        const gravityBtn = document.getElementById('scene-gravity');
        const rocketBtn = document.getElementById('scene-rocket');
        const dropBtn = document.getElementById('drop-ball');

        gravityBtn?.addEventListener('click', () => {
            this.scene = 'gravity';
            gravityBtn.classList.add('active');
            rocketBtn.classList.remove('active');
            document.getElementById('scene-display').textContent = '引力场';
            this.balls = [];
        });

        rocketBtn?.addEventListener('click', () => {
            this.scene = 'rocket';
            rocketBtn.classList.add('active');
            gravityBtn.classList.remove('active');
            document.getElementById('scene-display').textContent = '加速火箭';
            this.balls = [];
        });

        dropBtn?.addEventListener('click', () => this.dropBall());
    }

    dropBall() {
        const boxCenterX = this.width / 2;
        const boxTop = this.height * 0.2;

        this.balls.push({
            x: boxCenterX + (Math.random() - 0.5) * 80,
            y: boxTop + 40,
            vy: 0,
            radius: 12,
            color: `hsl(${Math.random() * 60}, 80%, 50%)`
        });

        if (this.balls.length > 5) {
            this.balls.shift();
        }
    }

    initEditor() {
        // 使用通用编辑器辅助类
        this.editorHelper = new PageEditorHelper('equivalence');
        this.editorHelper.initEditor();
    }

    loadContent() {
        if (this.editorHelper) {
            this.editorHelper.loadContent();
        }
    }

    draw() {
        const ctx = this.ctx;
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(0, 0, this.width, this.height);

        const centerX = this.width / 2;
        const boxWidth = 200;
        const boxHeight = 300;
        const boxTop = this.height * 0.2;
        const boxBottom = boxTop + boxHeight;

        // 绘制场景
        if (this.scene === 'gravity') {
            this.drawGravityScene(centerX, boxTop, boxWidth, boxHeight);
        } else {
            this.drawRocketScene(centerX, boxTop, boxWidth, boxHeight);
        }

        // 更新和绘制小球
        this.balls.forEach(ball => {
            // 物理更新
            ball.vy += 0.3; // 模拟加速度
            ball.y += ball.vy;

            // 碰撞检测
            if (ball.y + ball.radius > boxBottom - 30) {
                ball.y = boxBottom - 30 - ball.radius;
                ball.vy *= -0.6; // 弹跳
                if (Math.abs(ball.vy) < 1) ball.vy = 0;
            }

            // 绘制小球
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            ctx.fillStyle = ball.color;
            ctx.fill();

            // 阴影
            ctx.beginPath();
            ctx.ellipse(ball.x, boxBottom - 28, ball.radius * 0.8, ball.radius * 0.3, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fill();
        });

        // 绘制人物
        this.drawPerson(centerX, boxBottom - 80);

        // 绘制箭头指示
        this.drawForceArrow(centerX, boxBottom + 50);
    }

    drawGravityScene(cx, top, w, h) {
        const ctx = this.ctx;

        // 电梯
        ctx.strokeStyle = '#4f46e5';
        ctx.lineWidth = 3;
        ctx.strokeRect(cx - w / 2, top, w, h);

        // 地板
        ctx.fillStyle = '#374151';
        ctx.fillRect(cx - w / 2, top + h - 30, w, 30);

        // 天花板
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(cx - w / 2, top, w, 20);

        // 地球
        const earthY = this.height - 50;
        const gradient = ctx.createRadialGradient(cx, earthY + 200, 0, cx, earthY + 200, 250);
        gradient.addColorStop(0, '#22d3ee');
        gradient.addColorStop(0.5, '#3b82f6');
        gradient.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(cx, earthY + 200, 250, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // 标签
        ctx.font = '16px "Noto Sans SC"';
        ctx.fillStyle = '#e2e8f0';
        ctx.textAlign = 'center';
        ctx.fillText('🌍 地球引力场', cx, top - 20);
        ctx.font = '12px "JetBrains Mono"';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('g = 9.8 m/s² ↓', cx, top - 5);

        // 公式
        ctx.font = 'italic 18px "JetBrains Mono"';
        ctx.fillStyle = '#22d3ee';
        ctx.fillText('重力 = mg', cx, top + 50);
    }

    drawRocketScene(cx, top, w, h) {
        const ctx = this.ctx;
        const time = Date.now() * 0.01;

        // 火箭外壳
        ctx.fillStyle = '#374151';
        ctx.beginPath();
        ctx.moveTo(cx, top - 40);
        ctx.lineTo(cx - w / 2 - 20, top + 50);
        ctx.lineTo(cx - w / 2, top);
        ctx.lineTo(cx - w / 2, top + h);
        ctx.lineTo(cx + w / 2, top + h);
        ctx.lineTo(cx + w / 2, top);
        ctx.lineTo(cx + w / 2 + 20, top + 50);
        ctx.closePath();
        ctx.fill();

        // 内部空间
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(cx - w / 2 + 5, top + 5, w - 10, h - 10);

        // 地板
        ctx.fillStyle = '#374151';
        ctx.fillRect(cx - w / 2 + 5, top + h - 35, w - 10, 30);

        // 引擎火焰
        for (let i = 0; i < 3; i++) {
            const flameX = cx - 40 + i * 40;
            const flameHeight = 50 + Math.sin(time + i) * 20;

            const flameGradient = ctx.createLinearGradient(flameX, top + h, flameX, top + h + flameHeight);
            flameGradient.addColorStop(0, '#f59e0b');
            flameGradient.addColorStop(0.5, '#ef4444');
            flameGradient.addColorStop(1, 'transparent');

            ctx.beginPath();
            ctx.moveTo(flameX - 15, top + h);
            ctx.quadraticCurveTo(flameX, top + h + flameHeight, flameX + 15, top + h);
            ctx.fillStyle = flameGradient;
            ctx.fill();
        }

        // 标签
        ctx.font = '16px "Noto Sans SC"';
        ctx.fillStyle = '#e2e8f0';
        ctx.textAlign = 'center';
        ctx.fillText('🚀 加速的火箭', cx, top - 60);
        ctx.font = '12px "JetBrains Mono"';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('a = 9.8 m/s² ↑', cx, top - 45);

        // 公式
        ctx.font = 'italic 18px "JetBrains Mono"';
        ctx.fillStyle = '#f59e0b';
        ctx.fillText('F = ma', cx, top + 50);
    }

    drawPerson(x, y) {
        const ctx = this.ctx;

        // 根据场景选择不同的人物形象
        // 引力场使用地面观察者（与光速不变原理页面一致）
        // 加速火箭使用宇航员（与双生子佯谬页面一致）
        const emoji = this.scene === 'gravity' ? '🧑‍🔬' : '👨‍🚀';

        ctx.font = '40px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(emoji, x, y);
    }

    drawForceArrow(x, y) {
        const ctx = this.ctx;
        const arrowLen = 25;

        // 箭头
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y - arrowLen);
        ctx.lineTo(x, y + arrowLen);
        ctx.stroke();

        // 箭头头部
        ctx.beginPath();
        ctx.moveTo(x, y + arrowLen);
        ctx.lineTo(x - 10, y + arrowLen - 15);
        ctx.moveTo(x, y + arrowLen);
        ctx.lineTo(x + 10, y + arrowLen - 15);
        ctx.stroke();

        // 标签
        ctx.font = '12px "JetBrains Mono"';
        ctx.fillStyle = '#f59e0b';
        ctx.textAlign = 'center';
        ctx.fillText(this.scene === 'gravity' ? '重力 g' : '惯性力 = ma', x, y + arrowLen + 20);
    }

    animate() {
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new EquivalenceSimulation();
});
