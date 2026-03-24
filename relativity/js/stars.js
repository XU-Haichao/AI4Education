/**
 * 相对论探索之旅 - 星空背景动画
 */

class StarField {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.stars = [];
        this.shootingStars = [];
        this.numStars = 200;
        this.maxShootingStars = 3;
        
        this.resize();
        this.init();
        this.animate();
        
        window.addEventListener('resize', () => this.resize());
    }
    
    resize() {
        this.width = this.canvas.width = window.innerWidth;
        this.height = this.canvas.height = window.innerHeight;
    }
    
    init() {
        // 创建静态星星
        this.stars = [];
        for (let i = 0; i < this.numStars; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                radius: Math.random() * 1.5 + 0.5,
                opacity: Math.random() * 0.5 + 0.3,
                twinkleSpeed: Math.random() * 0.02 + 0.01,
                twinklePhase: Math.random() * Math.PI * 2
            });
        }
    }
    
    createShootingStar() {
        if (this.shootingStars.length >= this.maxShootingStars) return;
        if (Math.random() > 0.002) return; // 稀有事件
        
        this.shootingStars.push({
            x: Math.random() * this.width * 0.7,
            y: Math.random() * this.height * 0.5,
            length: Math.random() * 80 + 50,
            speed: Math.random() * 10 + 8,
            angle: Math.PI / 4 + (Math.random() - 0.5) * 0.3,
            opacity: 1,
            trail: []
        });
    }
    
    updateShootingStars() {
        this.shootingStars = this.shootingStars.filter(star => {
            star.x += Math.cos(star.angle) * star.speed;
            star.y += Math.sin(star.angle) * star.speed;
            star.opacity -= 0.01;
            
            return star.opacity > 0 && star.x < this.width && star.y < this.height;
        });
    }
    
    draw() {
        // 清空画布
        this.ctx.fillStyle = 'rgba(10, 10, 20, 0.1)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        const time = Date.now() * 0.001;
        
        // 绘制星星
        this.stars.forEach(star => {
            const twinkle = Math.sin(time * star.twinkleSpeed + star.twinklePhase);
            const opacity = star.opacity + twinkle * 0.2;
            
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.1, opacity)})`;
            this.ctx.fill();
            
            // 部分星星添加发光效果
            if (star.radius > 1) {
                this.ctx.beginPath();
                this.ctx.arc(star.x, star.y, star.radius * 2, 0, Math.PI * 2);
                const gradient = this.ctx.createRadialGradient(
                    star.x, star.y, 0,
                    star.x, star.y, star.radius * 3
                );
                gradient.addColorStop(0, `rgba(99, 102, 241, ${opacity * 0.3})`);
                gradient.addColorStop(1, 'transparent');
                this.ctx.fillStyle = gradient;
                this.ctx.fill();
            }
        });
        
        // 绘制流星
        this.shootingStars.forEach(star => {
            const gradient = this.ctx.createLinearGradient(
                star.x, star.y,
                star.x - Math.cos(star.angle) * star.length,
                star.y - Math.sin(star.angle) * star.length
            );
            gradient.addColorStop(0, `rgba(255, 255, 255, ${star.opacity})`);
            gradient.addColorStop(1, 'transparent');
            
            this.ctx.beginPath();
            this.ctx.moveTo(star.x, star.y);
            this.ctx.lineTo(
                star.x - Math.cos(star.angle) * star.length,
                star.y - Math.sin(star.angle) * star.length
            );
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        });
    }
    
    animate() {
        this.createShootingStar();
        this.updateShootingStars();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

// 初始化星空
document.addEventListener('DOMContentLoaded', () => {
    new StarField('stars-canvas');
});
