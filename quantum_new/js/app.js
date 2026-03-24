/**
 * 量子力学探索之旅 - 主应用逻辑
 */

const QuantumEditor = {
    pageId: null,
    isBound: false,
    modal: null,

    inferPageId() {
        const path = window.location.pathname || '';
        const fileName = path.split('/').pop() || '';
        if (!fileName.endsWith('.html')) return null;
        return fileName.replace('.html', '');
    },

    ensureEditorUI() {
        if (document.getElementById('quantum-editor-modal')) return;

        const style = document.createElement('style');
        style.textContent = `
            .q-editor-modal { position: fixed; inset: 0; z-index: 2000; display: none; }
            .q-editor-modal.active { display: block; }
            .q-editor-overlay { position: absolute; inset: 0; background: rgba(0,0,0,.6); backdrop-filter: blur(4px); }
            .q-editor-panel { position: relative; width: min(1000px, 92vw); max-height: 90vh; margin: 4vh auto; background: #0f172a; border: 1px solid rgba(148,163,184,.25); border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; }
            .q-editor-head { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid rgba(148,163,184,.2); }
            .q-editor-tabs { display: flex; gap: 8px; padding: 10px 16px; border-bottom: 1px solid rgba(148,163,184,.2); overflow-x: auto; }
            .q-tab { border: 1px solid rgba(148,163,184,.25); background: rgba(30,41,59,.7); color: #e2e8f0; border-radius: 10px; padding: 6px 10px; cursor: pointer; white-space: nowrap; }
            .q-tab.active { border-color: #a855f7; box-shadow: 0 0 0 1px rgba(168,85,247,.4) inset; }
            .q-editor-body { padding: 16px; overflow: auto; display: none; }
            .q-editor-body.active { display: block; }
            .q-editor-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .q-editor-text { width: 100%; min-height: 250px; background: #020617; color: #e2e8f0; border: 1px solid rgba(148,163,184,.25); border-radius: 10px; padding: 10px; font-family: ui-monospace, "JetBrains Mono", monospace; }
            .q-preview { min-height: 250px; background: #020617; border: 1px solid rgba(148,163,184,.25); border-radius: 10px; padding: 10px; overflow: auto; }
            .q-row { display: grid; gap: 8px; margin-bottom: 10px; }
            .q-input, .q-select { width: 100%; background: #020617; color: #e2e8f0; border: 1px solid rgba(148,163,184,.25); border-radius: 10px; padding: 8px; }
            .q-actions { display: flex; gap: 8px; justify-content: flex-end; padding: 12px 16px; border-top: 1px solid rgba(148,163,184,.2); }
            .q-btn { border: 1px solid rgba(148,163,184,.25); background: rgba(30,41,59,.7); color: #e2e8f0; border-radius: 10px; padding: 8px 12px; cursor: pointer; }
            .q-btn.primary { border-color: #a855f7; background: rgba(168,85,247,.2); }
            .q-list { margin-top: 8px; display: grid; gap: 8px; }
            .q-item { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; padding: 8px; border: 1px solid rgba(148,163,184,.2); border-radius: 10px; }
            .q-item-title { color: #e2e8f0; font-size: 13px; }
            .q-item-url { color: #94a3b8; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 420px; }
            @media (max-width: 900px) { .q-editor-grid { grid-template-columns: 1fr; } }
        `;
        document.head.appendChild(style);

        const modal = document.createElement('div');
        modal.className = 'q-editor-modal';
        modal.id = 'quantum-editor-modal';
        modal.innerHTML = `
            <div class="q-editor-overlay" id="q-editor-overlay"></div>
            <div class="q-editor-panel">
                <div class="q-editor-head">
                    <strong>内容与资源编辑器</strong>
                    <button class="q-btn" id="q-editor-close">关闭</button>
                </div>
                <div class="q-editor-tabs">
                    <button class="q-tab active" data-tab="text">文本</button>
                    <button class="q-tab" data-tab="links">链接</button>
                    <button class="q-tab" data-tab="images">图片</button>
                    <button class="q-tab" data-tab="videos">视频</button>
                    <button class="q-tab" data-tab="docs">文档</button>
                </div>
                <div class="q-editor-body active" data-tab="text">
                    <div class="q-editor-grid">
                        <textarea class="q-editor-text" id="q-editor-textarea"></textarea>
                        <div class="q-preview doc-content" id="q-editor-preview"></div>
                    </div>
                </div>
                <div class="q-editor-body" data-tab="links">
                    <div class="q-row"><input class="q-input" id="q-link-name" placeholder="链接名称"></div>
                    <div class="q-row"><input class="q-input" id="q-link-url" placeholder="https://example.com"></div>
                    <button class="q-btn primary" id="q-add-link">添加链接</button>
                    <div class="q-list" id="q-links-list"></div>
                </div>
                <div class="q-editor-body" data-tab="images">
                    <div class="q-row"><input class="q-input" id="q-image-name" placeholder="图片名称"></div>
                    <div class="q-row"><input class="q-input" id="q-image-url" placeholder="图片URL（可选）"></div>
                    <div class="q-row"><input class="q-input" id="q-image-file" type="file" accept="image/*"></div>
                    <button class="q-btn primary" id="q-add-image">添加图片</button>
                    <div class="q-list" id="q-images-list"></div>
                </div>
                <div class="q-editor-body" data-tab="videos">
                    <div class="q-row"><input class="q-input" id="q-video-name" placeholder="视频名称"></div>
                    <div class="q-row"><input class="q-input" id="q-video-url" placeholder="视频URL（可选）"></div>
                    <div class="q-row"><input class="q-input" id="q-video-file" type="file" accept="video/*"></div>
                    <button class="q-btn primary" id="q-add-video">添加视频</button>
                    <div class="q-list" id="q-videos-list"></div>
                </div>
                <div class="q-editor-body" data-tab="docs">
                    <div class="q-row"><input class="q-input" id="q-doc-name" placeholder="文档名称"></div>
                    <div class="q-row"><input class="q-input" id="q-doc-url" placeholder="文档URL（可选）"></div>
                    <div class="q-row"><input class="q-input" id="q-doc-file" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.csv,.zip,.rar,.7z"></div>
                    <div class="q-row">
                        <select class="q-select" id="q-doc-type">
                            <option value="pdf">PDF</option>
                            <option value="doc">Word</option>
                            <option value="ppt">PowerPoint</option>
                            <option value="xls">Excel</option>
                            <option value="txt">TXT</option>
                            <option value="md">Markdown</option>
                        </select>
                    </div>
                    <button class="q-btn primary" id="q-add-doc">添加文档</button>
                    <div class="q-list" id="q-docs-list"></div>
                </div>
                <div class="q-actions">
                    <button class="q-btn" id="q-editor-cancel">取消</button>
                    <button class="q-btn primary" id="q-editor-save">保存文本</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        this.modal = modal;
    },

    closeEditor() {
        if (this.modal) {
            this.modal.classList.remove('active');
        }
        this.renderMediaSection();
    },

    openEditor() {
        if (!this.pageId || !this.modal) return;

        const textarea = document.getElementById('q-editor-textarea');
        const preview = document.getElementById('q-editor-preview');
        const content = Storage.getPageContent(this.pageId) || DefaultContent[this.pageId] || '';
        if (textarea) textarea.value = content;
        if (preview) renderMarkdown(content, preview);
        this.refreshAllLists();
        this.modal.classList.add('active');
    },

    refreshTab(tab) {
        const media = Storage.getPageMedia(this.pageId);
        const tabMap = {
            links: { id: 'q-links-list', items: media.links, type: 'link' },
            images: { id: 'q-images-list', items: media.images, type: 'image' },
            videos: { id: 'q-videos-list', items: media.videos, type: 'video' },
            docs: { id: 'q-docs-list', items: media.documents, type: 'document' }
        };
        const info = tabMap[tab];
        if (!info) return;

        const el = document.getElementById(info.id);
        if (!el) return;

        if (!info.items.length) {
            el.innerHTML = '<div class="q-item-title">暂无资源</div>';
            return;
        }

        el.innerHTML = info.items.map(item => `
            <div class="q-item">
                <div>
                    <div class="q-item-title">${item.name || '未命名'}</div>
                    <div class="q-item-url">${item.url || ''}</div>
                </div>
                <button class="q-btn" data-delete-type="${info.type}" data-delete-id="${item.id}">删除</button>
            </div>
        `).join('');
    },

    refreshAllLists() {
        this.refreshTab('links');
        this.refreshTab('images');
        this.refreshTab('videos');
        this.refreshTab('docs');
    },

    inferDocType(fileName) {
        const ext = (fileName.split('.').pop() || '').toLowerCase();
        if (['doc', 'docx'].includes(ext)) return 'doc';
        if (['ppt', 'pptx'].includes(ext)) return 'ppt';
        if (['xls', 'xlsx', 'csv'].includes(ext)) return 'xls';
        if (ext === 'txt') return 'txt';
        if (ext === 'md') return 'md';
        if (ext === 'pdf') return 'pdf';
        return 'pdf';
    },

    docIcon(type) {
        const icons = { pdf: '📕', doc: '📘', ppt: '📙', xls: '📗', txt: '📄', md: '📝' };
        return icons[(type || '').toLowerCase()] || '📄';
    },

    renderMediaSection() {
        if (!this.pageId) return;
        const docContent = document.getElementById('doc-content');
        if (!docContent) return;

        const old = docContent.querySelector('.media-section');
        if (old) old.remove();

        const media = Storage.getPageMedia(this.pageId);
        const hasMedia = media.links.length || media.images.length || media.videos.length || media.documents.length;
        if (!hasMedia) return;

        const section = document.createElement('div');
        section.className = 'media-section';
        let html = '';

        if (media.images.length) {
            html += `
                <div class="media-subsection">
                    <h3 class="media-section-title">🖼️ 图片资料</h3>
                    <div class="media-grid">
                        ${media.images.map(img => `
                            <a class="media-item" href="${img.url}" target="_blank">
                                <img src="${img.thumbnail || img.url}" alt="${img.name}" loading="lazy">
                                <div class="media-item-overlay"><span class="media-item-name">${img.name}</span></div>
                            </a>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        if (media.videos.length) {
            html += `
                <div class="media-subsection">
                    <h3 class="media-section-title">🎬 视频资料</h3>
                    <div class="resource-list">
                        ${media.videos.map(video => `
                            <a href="${video.url}" target="_blank" class="resource-item">
                                <span class="resource-icon">🎬</span>
                                <div class="resource-info">
                                    <div class="resource-name">${video.name}</div>
                                    <div class="resource-url">${video.url}</div>
                                </div>
                            </a>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        if (media.links.length) {
            html += `
                <div class="media-subsection">
                    <h3 class="media-section-title">🔗 相关链接</h3>
                    <div class="resource-list">
                        ${media.links.map(link => `
                            <a href="${link.url}" target="_blank" class="resource-item">
                                <span class="resource-icon">🔗</span>
                                <div class="resource-info">
                                    <div class="resource-name">${link.name}</div>
                                    <div class="resource-url">${link.url}</div>
                                </div>
                            </a>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        if (media.documents.length) {
            html += `
                <div class="media-subsection">
                    <h3 class="media-section-title">📄 文档资料</h3>
                    <div class="resource-list">
                        ${media.documents.map(doc => `
                            <a href="${doc.url}" target="_blank" class="resource-item">
                                <span class="resource-icon">${this.docIcon(doc.type)}</span>
                                <div class="resource-info">
                                    <div class="resource-name">${doc.name}</div>
                                    <div class="resource-url">${(doc.type || 'file').toUpperCase()} 文档</div>
                                </div>
                            </a>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        section.innerHTML = html;
        docContent.appendChild(section);
    },

    bindEditorEvents() {
        if (this.isBound || !this.modal) return;
        this.isBound = true;

        this.modal.querySelectorAll('.q-tab').forEach(tabBtn => {
            tabBtn.addEventListener('click', () => {
                const target = tabBtn.dataset.tab;
                this.modal.querySelectorAll('.q-tab').forEach(t => t.classList.remove('active'));
                this.modal.querySelectorAll('.q-editor-body').forEach(b => b.classList.remove('active'));
                tabBtn.classList.add('active');
                this.modal.querySelector(`.q-editor-body[data-tab="${target}"]`)?.classList.add('active');
                if (target !== 'text') this.refreshTab(target);
            });
        });

        const textarea = document.getElementById('q-editor-textarea');
        const preview = document.getElementById('q-editor-preview');
        textarea?.addEventListener('input', () => renderMarkdown(textarea.value, preview));

        document.getElementById('q-editor-close')?.addEventListener('click', () => this.closeEditor());
        document.getElementById('q-editor-cancel')?.addEventListener('click', () => this.closeEditor());
        document.getElementById('q-editor-overlay')?.addEventListener('click', () => this.closeEditor());

        document.getElementById('q-editor-save')?.addEventListener('click', async () => {
            if (!this.pageId || !textarea) return;
            await Storage.persistPageContent(this.pageId, textarea.value);
            loadPageContent(this.pageId, document.getElementById('doc-content'));
            this.closeEditor();
        });

        document.getElementById('q-add-link')?.addEventListener('click', async () => {
            const name = document.getElementById('q-link-name')?.value.trim();
            const url = document.getElementById('q-link-url')?.value.trim();
            if (!name || !url || !this.pageId) return;
            Storage.addLink(this.pageId, name, url);
            await Storage.persistPageMedia(this.pageId, Storage.getPageMedia(this.pageId));
            document.getElementById('q-link-name').value = '';
            document.getElementById('q-link-url').value = '';
            this.refreshTab('links');
            this.renderMediaSection();
        });

        document.getElementById('q-add-image')?.addEventListener('click', async () => {
            if (!this.pageId) return;
            const name = document.getElementById('q-image-name')?.value.trim();
            const url = document.getElementById('q-image-url')?.value.trim();
            const fileInput = document.getElementById('q-image-file');

            if (fileInput?.files?.length) {
                const file = fileInput.files[0];
                const uploaded = await Storage.uploadFile(this.pageId, 'image', file, name || file.name);
                if (uploaded?.url) Storage.addImage(this.pageId, name || file.name, uploaded.url, uploaded.url);
                fileInput.value = '';
            } else if (url) {
                Storage.addImage(this.pageId, name || 'Image', url);
            } else {
                return;
            }

            await Storage.persistPageMedia(this.pageId, Storage.getPageMedia(this.pageId));
            document.getElementById('q-image-name').value = '';
            document.getElementById('q-image-url').value = '';
            this.refreshTab('images');
            this.renderMediaSection();
        });

        document.getElementById('q-add-video')?.addEventListener('click', async () => {
            if (!this.pageId) return;
            const name = document.getElementById('q-video-name')?.value.trim();
            const url = document.getElementById('q-video-url')?.value.trim();
            const fileInput = document.getElementById('q-video-file');

            if (fileInput?.files?.length) {
                const file = fileInput.files[0];
                const uploaded = await Storage.uploadFile(this.pageId, 'video', file, name || file.name);
                if (uploaded?.url) Storage.addVideo(this.pageId, name || file.name, uploaded.url, Storage.getVideoThumbnail(uploaded.url));
                fileInput.value = '';
            } else if (url) {
                Storage.addVideo(this.pageId, name || 'Video', url);
            } else {
                return;
            }

            await Storage.persistPageMedia(this.pageId, Storage.getPageMedia(this.pageId));
            document.getElementById('q-video-name').value = '';
            document.getElementById('q-video-url').value = '';
            this.refreshTab('videos');
            this.renderMediaSection();
        });

        document.getElementById('q-add-doc')?.addEventListener('click', async () => {
            if (!this.pageId) return;
            const name = document.getElementById('q-doc-name')?.value.trim();
            const url = document.getElementById('q-doc-url')?.value.trim();
            const type = document.getElementById('q-doc-type')?.value || 'pdf';
            const fileInput = document.getElementById('q-doc-file');

            if (fileInput?.files?.length) {
                const file = fileInput.files[0];
                const docType = type || this.inferDocType(file.name);
                const uploaded = await Storage.uploadFile(this.pageId, 'document', file, name || file.name, docType);
                if (uploaded?.url) Storage.addDocument(this.pageId, name || file.name, uploaded.url, uploaded.type || docType);
                fileInput.value = '';
            } else if (url) {
                Storage.addDocument(this.pageId, name || 'Document', url, type);
            } else {
                return;
            }

            await Storage.persistPageMedia(this.pageId, Storage.getPageMedia(this.pageId));
            document.getElementById('q-doc-name').value = '';
            document.getElementById('q-doc-url').value = '';
            this.refreshTab('docs');
            this.renderMediaSection();
        });

        this.modal.addEventListener('click', async (e) => {
            const target = e.target;
            if (!(target instanceof HTMLElement)) return;
            if (!target.dataset.deleteType || !target.dataset.deleteId || !this.pageId) return;

            const id = Number(target.dataset.deleteId);
            const type = target.dataset.deleteType;
            if (type === 'link') Storage.removeLink(this.pageId, id);
            if (type === 'image') Storage.removeImage(this.pageId, id);
            if (type === 'video') Storage.removeVideo(this.pageId, id);
            if (type === 'document') Storage.removeDocument(this.pageId, id);

            await Storage.persistPageMedia(this.pageId, Storage.getPageMedia(this.pageId));
            this.refreshAllLists();
            this.renderMediaSection();
        });
    },

    async init() {
        const docContent = document.getElementById('doc-content');
        if (!docContent) return;

        this.pageId = this.inferPageId();
        if (!this.pageId) return;

        await Storage.syncPageData(this.pageId);
        loadPageContent(this.pageId, docContent);
        this.renderMediaSection();

        this.ensureEditorUI();
        this.bindEditorEvents();

        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                await Storage.syncPageData(this.pageId);
                this.openEditor();
            });
        });
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    initNavbar();
    initAdminModal();
    initScrollAnimations();
    initPhysicistImageZoom();
    checkAdminStatus();
    await QuantumEditor.init();
});

function initNavbar() {
    const navbar = document.getElementById('navbar');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const navMenu = document.getElementById('nav-menu');
    const dropdowns = document.querySelectorAll('.nav-dropdown');

    window.addEventListener('scroll', () => {
        if (!navbar) return;
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    });

    if (mobileMenuBtn && navMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            mobileMenuBtn.classList.toggle('active');
        });
    }

    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        if (!toggle) return;
        toggle.addEventListener('click', (e) => {
            if (window.innerWidth <= 1024) {
                e.preventDefault();
                dropdown.classList.toggle('active');
            }
        });
    });

    document.addEventListener('click', (e) => {
        if (navMenu && mobileMenuBtn && !navMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
            navMenu.classList.remove('active');
            mobileMenuBtn.classList.remove('active');
        }
    });
}

function initAdminModal() {
    const adminBtn = document.getElementById('admin-btn');
    const modal = document.getElementById('admin-modal');
    const modalClose = document.getElementById('modal-close');
    const overlay = modal?.querySelector('.modal-overlay');
    const loginForm = document.getElementById('admin-login-form');
    const statusEl = document.getElementById('admin-status');

    if (!adminBtn || !modal) return;

    adminBtn.addEventListener('click', () => {
        if (Storage.isAdmin()) {
            Storage.setAdmin(false);
            updateAdminUI(false);
            showStatus(statusEl, '已退出管理员模式', 'success');
        } else {
            modal.classList.add('active');
        }
    });

    const closeModal = () => {
        modal.classList.remove('active');
        if (loginForm) loginForm.reset();
        if (statusEl) statusEl.textContent = '';
    };

    modalClose?.addEventListener('click', closeModal);
    overlay?.addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
    });

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

function checkAdminStatus() {
    updateAdminUI(Storage.isAdmin());
}

function updateAdminUI(isAdmin) {
    const adminBtn = document.getElementById('admin-btn');
    const existingIndicator = document.querySelector('.admin-mode-indicator');
    if (adminBtn) adminBtn.classList.toggle('active', isAdmin);
    existingIndicator?.remove();

    if (isAdmin) {
        const indicator = document.createElement('div');
        indicator.className = 'admin-mode-indicator';
        indicator.innerHTML = `<span>🔧 管理员模式</span><button class="logout-btn" onclick="logoutAdmin()">退出</button>`;
        document.body.appendChild(indicator);
        document.querySelectorAll('.edit-btn').forEach(btn => { btn.style.display = 'inline-flex'; });
    } else {
        document.querySelectorAll('.edit-btn').forEach(btn => { btn.style.display = 'none'; });
    }
}

function logoutAdmin() {
    Storage.setAdmin(false);
    updateAdminUI(false);
}

function showStatus(element, message, type) {
    if (!element) return;
    element.textContent = message;
    element.className = `admin-status ${type}`;
}

function initPhysicistImageZoom() {
    const images = Array.from(document.querySelectorAll('.physicist-card .physicist-image'));
    if (!images.length) return;

    images.forEach((img, index) => {
        img.style.cursor = 'zoom-in';
        if (!img.hasAttribute('tabindex')) img.setAttribute('tabindex', '0');
        img.setAttribute('role', 'button');

        if (!img.getAttribute('aria-label')) {
            const alt = img.getAttribute('alt') || `科学家图片${index + 1}`;
            img.setAttribute('aria-label', `点击放大查看：${alt}`);
        }
    });

    if (!document.getElementById('physicist-zoom-style')) {
        const style = document.createElement('style');
        style.id = 'physicist-zoom-style';
        style.textContent = `
            .physicist-zoom-modal { position: fixed; inset: 0; z-index: 2200; display: none; align-items: center; justify-content: center; }
            .physicist-zoom-modal.active { display: flex; }
            .physicist-zoom-overlay { position: absolute; inset: 0; background: rgba(2, 6, 23, 0.85); backdrop-filter: blur(3px); }
            .physicist-zoom-dialog { position: relative; z-index: 1; width: min(92vw, 920px); max-height: 92vh; display: flex; flex-direction: column; gap: 10px; }
            .physicist-zoom-image-wrap { background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(148, 163, 184, 0.25); border-radius: 12px; padding: 10px; }
            .physicist-zoom-image { width: 100%; max-height: calc(92vh - 84px); object-fit: contain; border-radius: 8px; display: block; }
            .physicist-zoom-caption { color: #e2e8f0; font-size: 14px; text-align: center; }
            .physicist-zoom-close { position: absolute; top: -44px; right: 0; width: 36px; height: 36px; border: 1px solid rgba(148, 163, 184, 0.35); border-radius: 999px; background: rgba(15, 23, 42, 0.9); color: #e2e8f0; cursor: pointer; font-size: 22px; line-height: 1; }
            body.physicist-zoom-open { overflow: hidden; }
            @media (max-width: 768px) { .physicist-zoom-close { top: -40px; } }
        `;
        document.head.appendChild(style);
    }

    let modal = document.getElementById('physicist-zoom-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'physicist-zoom-modal';
        modal.className = 'physicist-zoom-modal';
        modal.innerHTML = `
            <div class="physicist-zoom-overlay" id="physicist-zoom-overlay"></div>
            <div class="physicist-zoom-dialog" role="dialog" aria-modal="true" aria-label="科学家图片放大预览">
                <button type="button" class="physicist-zoom-close" id="physicist-zoom-close" aria-label="关闭">×</button>
                <div class="physicist-zoom-image-wrap">
                    <img class="physicist-zoom-image" id="physicist-zoom-image" alt="">
                </div>
                <div class="physicist-zoom-caption" id="physicist-zoom-caption"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    const modalImage = document.getElementById('physicist-zoom-image');
    const modalCaption = document.getElementById('physicist-zoom-caption');
    const overlay = document.getElementById('physicist-zoom-overlay');
    const closeBtn = document.getElementById('physicist-zoom-close');
    if (!modalImage || !modalCaption || !overlay || !closeBtn) return;

    let lastTrigger = null;
    const openModal = (img) => {
        lastTrigger = img;
        modalImage.src = img.currentSrc || img.src;
        modalImage.alt = img.alt || '科学家图片';
        modalCaption.textContent = img.alt || '';
        modal.classList.add('active');
        document.body.classList.add('physicist-zoom-open');
    };

    const closeModal = () => {
        modal.classList.remove('active');
        modalImage.removeAttribute('src');
        modalCaption.textContent = '';
        document.body.classList.remove('physicist-zoom-open');
        if (lastTrigger instanceof HTMLElement) lastTrigger.focus();
    };

    images.forEach(img => {
        if (img.dataset.zoomBound === '1') return;
        img.dataset.zoomBound = '1';

        img.addEventListener('click', () => openModal(img));
        img.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openModal(img);
            }
        });
    });

    if (modal.dataset.bound !== '1') {
        modal.dataset.bound = '1';
        overlay.addEventListener('click', closeModal);
        closeBtn.addEventListener('click', closeModal);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
        });
    }
}

function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.scroll-animate');
    if (!animatedElements.length) return;
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    animatedElements.forEach(el => observer.observe(el));
}

function renderMarkdown(content, container) {
    if (!content || !container) return;
    if (typeof marked !== 'undefined') {
        marked.setOptions({ breaks: true, gfm: true });
        container.innerHTML = marked.parse(content);
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

function loadPageContent(pageId, container) {
    let content = Storage.getPageContent(pageId);
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

window.logoutAdmin = logoutAdmin;
window.renderMarkdown = renderMarkdown;
window.loadPageContent = loadPageContent;
window.updateAdminUI = updateAdminUI;
