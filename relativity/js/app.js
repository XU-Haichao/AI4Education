/**
 * 相对论探索之旅 - 主应用逻辑
 */

document.addEventListener('DOMContentLoaded', () => {
    // 初始化各模块
    initNavbar();
    initAdminModal();
    initScrollAnimations();
    checkAdminStatus();
});

/**
 * 导航栏功能
 */
function initNavbar() {
    const navbar = document.getElementById('navbar');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const navMenu = document.getElementById('nav-menu');
    const dropdowns = document.querySelectorAll('.nav-dropdown');

    // 滚动时改变导航栏样式
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // 移动端菜单切换
    if (mobileMenuBtn && navMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            mobileMenuBtn.classList.toggle('active');
        });
    }

    // 移动端下拉菜单
    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        if (toggle) {
            toggle.addEventListener('click', (e) => {
                if (window.innerWidth <= 1024) {
                    e.preventDefault();
                    dropdown.classList.toggle('active');
                }
            });
        }
    });

    // 点击外部关闭菜单
    document.addEventListener('click', (e) => {
        if (!navMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
            navMenu.classList.remove('active');
            mobileMenuBtn.classList.remove('active');
        }
    });
}

/**
 * 管理员模态框
 */
function initAdminModal() {
    const adminBtn = document.getElementById('admin-btn');
    const modal = document.getElementById('admin-modal');
    const modalClose = document.getElementById('modal-close');
    const overlay = modal?.querySelector('.modal-overlay');
    const loginForm = document.getElementById('admin-login-form');
    const statusEl = document.getElementById('admin-status');

    if (!adminBtn || !modal) return;

    // 打开模态框
    adminBtn.addEventListener('click', () => {
        if (Storage.isAdmin()) {
            // 已登录，直接登出
            Storage.setAdmin(false);
            updateAdminUI(false);
            showStatus(statusEl, '已退出管理员模式', 'success');
        } else {
            modal.classList.add('active');
        }
    });

    // 关闭模态框
    const closeModal = () => {
        modal.classList.remove('active');
        if (loginForm) loginForm.reset();
        if (statusEl) statusEl.textContent = '';
    };

    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (overlay) overlay.addEventListener('click', closeModal);

    // ESC 键关闭
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });

    // 登录表单提交
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const password = document.getElementById('admin-password').value;

            if (Storage.verifyPassword(password)) {
                Storage.setAdmin(true);
                updateAdminUI(true);
                showStatus(statusEl, '登录成功！', 'success');
                setTimeout(closeModal, 1000);
            } else {
                showStatus(statusEl, '密码错误，请重试', 'error');
            }
        });
    }
}

/**
 * 检查管理员状态
 */
function checkAdminStatus() {
    updateAdminUI(Storage.isAdmin());
}

/**
 * 更新管理员 UI
 */
function updateAdminUI(isAdmin) {
    const adminBtn = document.getElementById('admin-btn');
    const existingIndicator = document.querySelector('.admin-mode-indicator');

    if (adminBtn) {
        adminBtn.classList.toggle('active', isAdmin);
    }

    // 移除现有指示器
    if (existingIndicator) {
        existingIndicator.remove();
    }

    // 添加管理员模式指示器
    if (isAdmin) {
        const indicator = document.createElement('div');
        indicator.className = 'admin-mode-indicator';
        indicator.innerHTML = `
            <span>🔧 管理员模式</span>
            <button class="logout-btn" onclick="logoutAdmin()">退出</button>
        `;
        document.body.appendChild(indicator);

        // 显示编辑按钮
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.style.display = 'inline-flex';
        });
    } else {
        // 隐藏编辑按钮
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.style.display = 'none';
        });
    }
}

/**
 * 退出管理员模式
 */
function logoutAdmin() {
    Storage.setAdmin(false);
    updateAdminUI(false);
}

/**
 * 显示状态消息
 */
function showStatus(element, message, type) {
    if (!element) return;
    element.textContent = message;
    element.className = `admin-status ${type}`;
}

/**
 * 滚动动画
 */
function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.scroll-animate');

    if (animatedElements.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    animatedElements.forEach(el => observer.observe(el));
}

/**
 * 渲染 Markdown 内容
 */
function renderMarkdown(content, container) {
    if (!content || !container) return;

    // 配置 marked
    if (typeof marked !== 'undefined') {
        marked.setOptions({
            breaks: true,
            gfm: true
        });

        container.innerHTML = marked.parse(content);

        // 渲染数学公式
        if (typeof renderMathInElement !== 'undefined') {
            renderMathInElement(container, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\[', right: '\\]', display: true },
                    { left: '\\(', right: '\\)', display: false }
                ],
                throwOnError: false
            });
        }
    }
}

/**
 * 加载页面内容
 */
function loadPageContent(pageId, container) {
    // 先尝试从 localStorage 获取
    let content = Storage.getPageContent(pageId);

    // 如果没有内容或只有空白，使用默认内容
    const hasMeaningfulContent = typeof content === 'string' && content.trim().length > 0;
    if (!hasMeaningfulContent && DefaultContent[pageId]) {
        content = DefaultContent[pageId];
    }

    if (!container) return;

    container.innerHTML = '';

    if (typeof content === 'string' && content.trim()) {
        renderMarkdown(content, container);
    }
}

// 暴露全局函数
window.logoutAdmin = logoutAdmin;
window.renderMarkdown = renderMarkdown;
window.loadPageContent = loadPageContent;
window.updateAdminUI = updateAdminUI;
