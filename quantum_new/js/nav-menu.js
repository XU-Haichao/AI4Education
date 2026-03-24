/**
 * 导航菜单组件
 * 为所有页面提供统一的下拉导航菜单
 */

class NavigationMenu {
    constructor() {
        this.init();
    }

    init() {
        this.injectMenu();
        this.bindEvents();
    }

    getBasePath() {
        const path = window.location.pathname;
        if (path.includes('/pages/early-era/atom-track/') ||
            path.includes('/pages/early-era/light-track/') ||
            path.includes('/pages/modern-era/theory-track/') ||
            path.includes('/pages/modern-era/app-track/')) {
            return '../../../';
        } else if (path.includes('/pages/middle-era/') ||
            path.includes('/pages/early-era/') ||
            path.includes('/pages/modern-era/')) {
            return '../../';
        }
        return '';
    }

    injectMenu() {
        const navActions = document.querySelector('.nav-actions');
        if (!navActions) return;

        const basePath = this.getBasePath();

        const menuHTML = `
            <div class="nav-dropdown menu-dropdown">
                <button class="menu-toggle-btn" title="课程目录">
                    <span class="menu-icon">☰</span>
                </button>
                <div class="dropdown-menu mega-menu">
                    <!-- 第一阶段 -->
                    <div class="menu-section">
                        <div class="section-header">
                            <span class="section-badge">1890s-1913</span>
                            <span class="section-title">早期准备</span>
                        </div>
                        <div class="section-content">
                            <div class="menu-group">
                                <span class="group-label">⚛️ 原子结构</span>
                                <a href="${basePath}pages/early-era/atom-track/thomson-model.html" class="menu-item">
                                    <span class="item-icon">🧪</span>汤姆孙模型
                                </a>
                                <a href="${basePath}pages/early-era/atom-track/rutherford-scattering.html" class="menu-item">
                                    <span class="item-icon">💫</span>卢瑟福模型
                                </a>
                                <a href="${basePath}pages/early-era/atom-track/bohr-model.html" class="menu-item">
                                    <span class="item-icon">⚛️</span>玻尔模型
                                </a>
                            </div>
                            <div class="menu-group">
                                <span class="group-label">💡 光的本质</span>
                                <a href="${basePath}pages/early-era/light-track/blackbody-radiation.html" class="menu-item">
                                    <span class="item-icon">🔥</span>黑体辐射
                                </a>
                                <a href="${basePath}pages/early-era/light-track/photoelectric-effect.html" class="menu-item">
                                    <span class="item-icon">💡</span>光电效应
                                </a>
                                <a href="${basePath}pages/early-era/light-track/compton-scattering.html" class="menu-item">
                                    <span class="item-icon">✨</span>康普顿散射
                                </a>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 第二阶段 -->
                    <div class="menu-section">
                        <div class="section-header">
                            <span class="section-badge">1920s-1927</span>
                            <span class="section-title">理论建立</span>
                        </div>
                        <div class="section-content">
                            <div class="menu-group single">
                                <a href="${basePath}pages/middle-era/de-broglie-wave.html" class="menu-item">
                                    <span class="item-icon">🌊</span>德布罗意波
                                </a>
                                <a href="${basePath}pages/middle-era/double-slit.html" class="menu-item">
                                    <span class="item-icon">🎯</span>双缝干涉
                                </a>
                                <a href="${basePath}pages/middle-era/schrodinger-equation.html" class="menu-item">
                                    <span class="item-icon">📐</span>薛定谔方程
                                </a>
                                <a href="${basePath}pages/middle-era/uncertainty-principle.html" class="menu-item">
                                    <span class="item-icon">🎲</span>不确定性原理
                                </a>
                                <a href="${basePath}pages/middle-era/solvay-conference.html" class="menu-item">
                                    <span class="item-icon">👥</span>索尔维会议
                                </a>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 第三阶段 -->
                    <div class="menu-section">
                        <div class="section-header">
                            <span class="section-badge">1930s-今</span>
                            <span class="section-title">深化与应用</span>
                        </div>
                        <div class="section-content">
                            <div class="menu-group">
                                <span class="group-label">📚 理论深化</span>
                                <a href="${basePath}pages/modern-era/theory-track/path-integral.html" class="menu-item">
                                    <span class="item-icon">🛤️</span>路径积分
                                </a>
                                <a href="${basePath}pages/modern-era/theory-track/quantum-field-theory.html" class="menu-item">
                                    <span class="item-icon">🌌</span>量子场论
                                </a>
                                <a href="${basePath}pages/modern-era/theory-track/feynman-diagrams.html" class="menu-item">
                                    <span class="item-icon">✏️</span>费曼图
                                </a>
                                <a href="${basePath}pages/modern-era/theory-track/standard-model.html" class="menu-item">
                                    <span class="item-icon">🔬</span>标准模型
                                </a>
                            </div>
                            <div class="menu-group">
                                <span class="group-label">🔬 量子应用</span>
                                <a href="${basePath}pages/modern-era/app-track/quantum-tunneling.html" class="menu-item">
                                    <span class="item-icon">🚇</span>量子隧穿
                                </a>
                                <a href="${basePath}pages/modern-era/app-track/quantum-entanglement.html" class="menu-item">
                                    <span class="item-icon">🔗</span>量子纠缠
                                </a>
                                <a href="${basePath}pages/modern-era/app-track/quantum-computing.html" class="menu-item">
                                    <span class="item-icon">💻</span>量子计算
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 在nav-actions末尾添加菜单
        navActions.insertAdjacentHTML('beforeend', menuHTML);

        // 添加样式
        this.injectStyles();
    }

    injectStyles() {
        if (document.getElementById('nav-menu-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'nav-menu-styles';
        styles.textContent = `
            .menu-dropdown {
                position: relative;
            }
            
            .menu-toggle-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 40px;
                height: 40px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-lg);
                cursor: pointer;
                transition: all var(--transition-fast);
            }
            
            .menu-toggle-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                border-color: var(--color-primary);
            }
            
            .menu-toggle-btn .menu-icon {
                font-size: var(--text-lg);
                color: var(--color-text-primary);
            }
            
            .menu-dropdown .mega-menu {
                position: absolute;
                top: 100%;
                right: 0;
                left: auto;
                transform: translateY(10px);
                min-width: 580px;
                max-width: 650px;
                padding: var(--spacing-4);
                background: rgba(18, 18, 31, 0.98);
                backdrop-filter: blur(20px);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-xl);
                box-shadow: var(--shadow-xl);
                opacity: 0;
                visibility: hidden;
                transition: all var(--transition-fast);
                z-index: var(--z-dropdown);
            }
            
            .menu-dropdown:hover .mega-menu,
            .menu-dropdown.active .mega-menu {
                opacity: 1;
                visibility: visible;
                transform: translateY(5px);
            }
            
            .menu-section {
                margin-bottom: var(--spacing-4);
                padding-bottom: var(--spacing-4);
                border-bottom: 1px solid var(--color-border);
            }
            
            .menu-section:last-child {
                margin-bottom: 0;
                padding-bottom: 0;
                border-bottom: none;
            }
            
            .section-header {
                display: flex;
                align-items: center;
                gap: var(--spacing-3);
                margin-bottom: var(--spacing-3);
            }
            
            .section-badge {
                padding: 2px 8px;
                background: var(--gradient-quantum);
                border-radius: var(--radius-full);
                font-size: var(--text-xs);
                font-weight: 600;
                color: white;
            }
            
            .section-title {
                font-size: var(--text-base);
                font-weight: 600;
                color: var(--color-text-primary);
            }
            
            .section-content {
                display: flex;
                gap: var(--spacing-6);
            }
            
            .menu-group {
                flex: 1;
            }
            
            .menu-group.single {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: var(--spacing-1);
            }
            
            .group-label {
                display: block;
                font-size: var(--text-xs);
                font-weight: 600;
                color: var(--color-text-muted);
                margin-bottom: var(--spacing-2);
                padding-left: var(--spacing-2);
            }
            
            .menu-item {
                display: flex;
                align-items: center;
                gap: var(--spacing-2);
                padding: var(--spacing-2) var(--spacing-3);
                color: var(--color-text-secondary);
                font-size: var(--text-sm);
                border-radius: var(--radius-md);
                transition: all var(--transition-fast);
                white-space: nowrap;
            }
            
            .menu-item:hover {
                background: rgba(168, 85, 247, 0.15);
                color: var(--color-text-primary);
            }
            
            .menu-item .item-icon {
                font-size: var(--text-base);
            }
            
            @media (max-width: 768px) {
                .menu-dropdown .mega-menu {
                    position: fixed;
                    top: var(--navbar-height);
                    left: 0;
                    right: 0;
                    min-width: 100%;
                    max-width: 100%;
                    max-height: calc(100vh - var(--navbar-height));
                    overflow-y: auto;
                    border-radius: 0;
                    transform: translateY(-10px);
                }
                
                .menu-dropdown:hover .mega-menu,
                .menu-dropdown.active .mega-menu {
                    transform: translateY(0);
                }
                
                .section-content {
                    flex-direction: column;
                    gap: var(--spacing-3);
                }
                
                .menu-group.single {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    bindEvents() {
        document.querySelectorAll('.menu-dropdown').forEach(dropdown => {
            const toggle = dropdown.querySelector('.menu-toggle-btn');

            if (!toggle) return;

            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = dropdown.classList.contains('active');

                document.querySelectorAll('.menu-dropdown').forEach(d => d.classList.remove('active'));

                if (!isOpen) {
                    dropdown.classList.add('active');
                }
            });
        });

        document.addEventListener('click', () => {
            document.querySelectorAll('.menu-dropdown').forEach(d => d.classList.remove('active'));
        });

        // 防止点击菜单内部时关闭
        document.querySelectorAll('.mega-menu').forEach(menu => {
            menu.addEventListener('click', (e) => {
                if (e.target.tagName !== 'A') {
                    e.stopPropagation();
                }
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new NavigationMenu();
});
