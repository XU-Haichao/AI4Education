/**
 * 通用编辑器辅助函数
 * 为所有页面提供统一的编辑器和媒体管理功能
 */

class PageEditorHelper {
    constructor(pageId) {
        this.pageId = pageId;
        this.mediaManager = null;
        this.hasInitialSync = false;

        // 确保编辑器已注入
        if (window.EditorInjector) {
            EditorInjector.inject();
        }
    }

    /**
     * 初始化编辑器
     */
    initEditor() {
        const editBtn = document.getElementById('edit-doc-btn');
        const editorModal = document.getElementById('editor-modal');
        const editorTextarea = document.getElementById('editor-textarea');
        const editorPreview = document.getElementById('editor-preview');
        const editorSave = document.getElementById('editor-save');
        const editorCancel = document.getElementById('editor-cancel');
        const editorClose = document.getElementById('editor-close');
        const editorOverlay = document.getElementById('editor-overlay');

        if (!editBtn || !editorModal) return;

        // 初始化媒体管理器
        this.mediaManager = new MediaManager(this.pageId);

        // 标签页切换
        const tabs = editorModal.querySelectorAll('.editor-tab');
        const tabContents = editorModal.querySelectorAll('.editor-tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;

                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));

                tab.classList.add('active');
                editorModal.querySelector(`.editor-tab-content[data-tab="${targetTab}"]`)?.classList.add('active');

                // 刷新资源列表
                if (targetTab !== 'text') {
                    this.refreshResourceList(targetTab);
                }
            });
        });

        editBtn.addEventListener('click', async () => {
            await Storage.syncPageData(this.pageId);

            const content = Storage.getPageContent(this.pageId) || DefaultContent[this.pageId] || '';
            editorTextarea.value = content;
            renderMarkdown(content, editorPreview);

            // 重置到文本标签页
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            tabs[0].classList.add('active');
            tabContents[0].classList.add('active');

            editorModal.classList.add('active');
        });

        // 实时预览
        editorTextarea?.addEventListener('input', () => {
            renderMarkdown(editorTextarea.value, editorPreview);
        });

        const closeEditor = () => {
            editorModal.classList.remove('active');
            this.mediaManager.renderMediaSection();
            this.mediaManager.updateAdminMode();
        };

        editorCancel?.addEventListener('click', closeEditor);
        editorClose?.addEventListener('click', closeEditor);
        editorOverlay?.addEventListener('click', closeEditor);

        editorSave?.addEventListener('click', async () => {
            await Storage.persistPageContent(this.pageId, editorTextarea.value);
            this.loadContent();
            closeEditor();
        });

        // 添加资源按钮事件
        this.initResourceButtons();
    }

    /**
     * 初始化资源管理按钮
     */
    initResourceButtons() {
        // 添加链接
        document.getElementById('add-link-btn')?.addEventListener('click', () => {
            const name = document.getElementById('link-name').value.trim();
            const url = document.getElementById('link-url').value.trim();
            if (this.mediaManager.addLink(name, url)) {
                document.getElementById('link-name').value = '';
                document.getElementById('link-url').value = '';
                this.refreshResourceList('links');
            }
        });

        // 添加图片
        document.getElementById('add-image-btn')?.addEventListener('click', async () => {
            const name = document.getElementById('image-name').value.trim();
            const url = document.getElementById('image-url').value.trim();
            const fileInput = document.getElementById('image-file');

            if (fileInput && fileInput.files.length > 0) {
                await this.mediaManager.uploadImage(fileInput.files[0], name || fileInput.files[0].name);
                fileInput.value = '';
            } else if (url) {
                this.mediaManager.addImage(name || 'Image', url);
            }

            document.getElementById('image-name').value = '';
            document.getElementById('image-url').value = '';
            this.refreshResourceList('images');
        });

        // 添加视频
        document.getElementById('add-video-btn')?.addEventListener('click', async () => {
            const name = document.getElementById('video-name').value.trim();
            const url = document.getElementById('video-url').value.trim();
            const fileInput = document.getElementById('video-file');

            let added = false;
            if (fileInput && fileInput.files.length > 0) {
                added = await this.mediaManager.uploadVideo(fileInput.files[0], name || fileInput.files[0].name);
                fileInput.value = '';
            } else if (url) {
                added = this.mediaManager.addVideo(name || 'Video', url);
            }

            if (added) {
                document.getElementById('video-name').value = '';
                document.getElementById('video-url').value = '';
                this.refreshResourceList('videos');
            }
        });

        // 添加文档
        document.getElementById('add-doc-btn')?.addEventListener('click', async () => {
            const name = document.getElementById('doc-name').value.trim();
            const url = document.getElementById('doc-url').value.trim();
            const type = document.getElementById('doc-type').value;
            const fileInput = document.getElementById('doc-file');

            let added = false;
            if (fileInput && fileInput.files.length > 0) {
                added = await this.mediaManager.uploadDocument(fileInput.files[0], name || fileInput.files[0].name, type);
                fileInput.value = '';
            } else if (url) {
                added = this.mediaManager.addDocument(name || 'Document', url, type);
            }

            if (added) {
                document.getElementById('doc-name').value = '';
                document.getElementById('doc-url').value = '';
                this.refreshResourceList('docs');
            }
        });
    }

    /**
     * 刷新资源列表
     */
    refreshResourceList(tab) {
        const media = Storage.getPageMedia(this.pageId);
        let listContainer, items, type;

        switch (tab) {
            case 'links':
                listContainer = document.getElementById('links-list');
                items = media.links;
                type = 'link';
                break;
            case 'images':
                listContainer = document.getElementById('images-list');
                items = media.images;
                type = 'image';
                break;
            case 'videos':
                listContainer = document.getElementById('videos-list');
                items = media.videos;
                type = 'video';
                break;
            case 'docs':
                listContainer = document.getElementById('docs-list');
                items = media.documents;
                type = 'document';
                break;
        }

        if (!listContainer) return;

        if (items.length === 0) {
            listContainer.innerHTML = '<div class="resource-list-empty">暂无资源</div>';
            return;
        }

        const icons = { link: '🔗', image: '🖼️', video: '🎬', document: '📄' };

        listContainer.innerHTML = `
            <div class="resource-list-title">已添加的资源 (${items.length})</div>
            <div class="resource-list">
                ${items.map(item => `
                    <div class="resource-item">
                        <span class="resource-icon">${icons[type]}</span>
                        <div class="resource-info">
                            <div class="resource-name">${item.name}</div>
                            <div class="resource-url">${item.url?.substring(0, 50)}${item.url?.length > 50 ? '...' : ''}</div>
                        </div>
                        <button class="resource-delete" data-id="${item.id}" data-type="${type}" style="display:flex;">×</button>
                    </div>
                `).join('')}
            </div>
        `;

        // 绑定删除事件
        listContainer.querySelectorAll('.resource-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!confirm('确定要删除这个资源吗？')) return;

                const id = parseInt(btn.dataset.id);
                const itemType = btn.dataset.type;

                switch (itemType) {
                    case 'link': Storage.removeLink(this.pageId, id); break;
                    case 'image': Storage.removeImage(this.pageId, id); break;
                    case 'video': Storage.removeVideo(this.pageId, id); break;
                    case 'document': Storage.removeDocument(this.pageId, id); break;
                }

                this.mediaManager?.persistMediaChanges();
                this.refreshResourceList(tab);
            });
        });
    }

    /**
     * 加载页面内容
     */
    loadContent() {
        if (!this.hasInitialSync) {
            this.hasInitialSync = true;
            Storage.syncPageData(this.pageId)
                .catch((e) => console.warn('Initial page sync failed:', e))
                .finally(() => this.renderLocalContent());
            return;
        }

        this.renderLocalContent();
    }

    renderLocalContent() {
        const docContent = document.getElementById('doc-content');
        if (docContent) {
            loadPageContent(this.pageId, docContent);
        }

        // 检查管理员状态
        if (Storage.isAdmin()) {
            const editBtn = document.getElementById('edit-doc-btn');
            if (editBtn) editBtn.style.display = 'inline-flex';
        }

        // 渲染媒体资源
        if (this.mediaManager) {
            this.mediaManager.renderMediaSection();
            this.mediaManager.updateAdminMode();
        }
    }
}

// 导出
window.PageEditorHelper = PageEditorHelper;
