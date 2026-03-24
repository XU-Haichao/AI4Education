/**
 * 相对论导航菜单组件
 * 为所有页面提供统一的下拉导航菜单
 */

class NavigationMenu {
    constructor() {
        this.init();
    }

    init() {
        this.replaceExistingMenu();
        this.bindEvents();
    }

    getBasePath() {
        const path = window.location.pathname;
        if (path.includes('/pages/special-relativity/') ||
            path.includes('/pages/general-relativity/')) {
            return '../../';
        }
        return '';
    }

    replaceExistingMenu() {
        const navActions = document.querySelector('.nav-actions');
        const existingNavMenu = document.querySelector('.nav-menu');

        if (!navActions) return;

        // 移除现有的nav-menu
        if (existingNavMenu) {
            existingNavMenu.remove();
        }

        const basePath = this.getBasePath();

        const menuHTML = `
            <div class="nav-dropdown menu-dropdown">
                <button class="menu-toggle-btn" title="课程目录">
                    <span class="menu-icon">☰</span>
                </button>
                <div class="dropdown-menu mega-menu">
                    <!-- 狭义相对论 -->
                    <div class="menu-section">
                        <div class="section-header">
                            <span class="section-badge">1905</span>
                            <span class="section-title">狭义相对论</span>
                        </div>
                        <div class="section-content">
                            <div class="menu-group single">
                                <a href="${basePath}pages/special-relativity/speed-of-light.html" class="menu-item">
                                    <span class="item-icon">💡</span>光速不变原理
                                </a>
                                <a href="${basePath}pages/special-relativity/time-dilation.html" class="menu-item">
                                    <span class="item-icon">⏱️</span>时间膨胀
                                </a>
                                <a href="${basePath}pages/special-relativity/length-contraction.html" class="menu-item">
                                    <span class="item-icon">📏</span>长度收缩
                                </a>
                                <a href="${basePath}pages/special-relativity/mass-energy.html" class="menu-item">
                                    <span class="item-icon">⚡</span>质能方程
                                </a>
                                <a href="${basePath}pages/special-relativity/twin-paradox.html" class="menu-item">
                                    <span class="item-icon">👥</span>双生子佯谬
                                </a>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 广义相对论 -->
                    <div class="menu-section">
                        <div class="section-header">
                            <span class="section-badge">1915</span>
                            <span class="section-title">广义相对论</span>
                        </div>
                        <div class="section-content">
                            <div class="menu-group single">
                                <a href="${basePath}pages/general-relativity/equivalence.html" class="menu-item">
                                    <span class="item-icon">⚖️</span>等效原理
                                </a>
                                <a href="${basePath}pages/general-relativity/spacetime-curvature.html" class="menu-item">
                                    <span class="item-icon">🌀</span>时空弯曲
                                </a>
                                <a href="${basePath}pages/general-relativity/gravitational-lensing.html" class="menu-item">
                                    <span class="item-icon">🔭</span>引力透镜
                                </a>
                                <a href="${basePath}pages/general-relativity/black-holes.html" class="menu-item">
                                    <span class="item-icon">🕳️</span>黑洞
                                </a>
                                <a href="${basePath}pages/general-relativity/gravitational-waves.html" class="menu-item">
                                    <span class="item-icon">🌊</span>引力波
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
                min-width: 480px;
                max-width: 520px;
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
                background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
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
