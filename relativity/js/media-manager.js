/**
 * 媒体资源管理器
 * 处理图片、视频、链接和文档的添加、删除和展示
 */

class MediaManager {
    constructor(pageId) {
        this.pageId = pageId;
        this.media = Storage.getPageMedia(pageId);
        this.lightbox = null;

        this.init();
    }

    persistMediaChanges() {
        const media = Storage.getPageMedia(this.pageId);
        Storage.persistPageMedia(this.pageId, media).catch((e) => {
            console.warn('Persist media failed:', e);
        });
    }

    init() {
        this.createLightbox();
        this.renderMediaSection();
        this.updateAdminMode();
    }

    // 创建灯箱组件
    createLightbox() {
        if (document.getElementById('media-lightbox')) return;

        const lightbox = document.createElement('div');
        lightbox.id = 'media-lightbox';
        lightbox.className = 'lightbox';
        lightbox.innerHTML = `
            <div class="lightbox-content">
                <button class="lightbox-close" id="lightbox-close">&times;</button>
                <div id="lightbox-media"></div>
                <div class="lightbox-caption" id="lightbox-caption"></div>
            </div>
        `;
        document.body.appendChild(lightbox);

        this.lightbox = lightbox;

        // 关闭事件
        lightbox.querySelector('#lightbox-close').addEventListener('click', () => this.closeLightbox());
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) this.closeLightbox();
        });

        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && lightbox.classList.contains('active')) {
                this.closeLightbox();
            }
        });
    }

    // 打开灯箱
    openLightbox(type, url, name) {
        const mediaContainer = this.lightbox.querySelector('#lightbox-media');
        const caption = this.lightbox.querySelector('#lightbox-caption');

        mediaContainer.innerHTML = '';

        if (type === 'image') {
            const img = document.createElement('img');
            img.src = url;
            img.alt = name;
            mediaContainer.appendChild(img);
        } else if (type === 'video') {
            // 检查是否是YouTube或Bilibili链接
            const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
            const biliMatch = url.match(/bilibili\.com\/video\/(BV[^/?]+)/);

            if (ytMatch) {
                const iframe = document.createElement('iframe');
                iframe.src = `https://www.youtube.com/embed/${ytMatch[1]}`;
                iframe.width = '800';
                iframe.height = '450';
                iframe.frameBorder = '0';
                iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
                iframe.allowFullscreen = true;
                mediaContainer.appendChild(iframe);
            } else if (biliMatch) {
                const iframe = document.createElement('iframe');
                iframe.src = `//player.bilibili.com/player.html?bvid=${biliMatch[1]}`;
                iframe.width = '800';
                iframe.height = '450';
                iframe.frameBorder = '0';
                iframe.allowFullscreen = true;
                mediaContainer.appendChild(iframe);
            } else {
                const video = document.createElement('video');
                video.src = url;
                video.controls = true;
                video.autoplay = true;
                mediaContainer.appendChild(video);
            }
        }

        caption.textContent = name;
        this.lightbox.classList.add('active');
    }

    // 关闭灯箱
    closeLightbox() {
        this.lightbox.classList.remove('active');
        // 停止视频播放
        const video = this.lightbox.querySelector('video');
        const iframe = this.lightbox.querySelector('iframe');
        if (video) video.pause();
        if (iframe) iframe.src = '';
    }

    // 渲染媒体展示区域
    renderMediaSection() {
        const docContent = document.getElementById('doc-content');
        if (!docContent) return;

        // 移除旧的媒体区域
        const oldSection = docContent.querySelector('.media-section');
        if (oldSection) oldSection.remove();

        // 刷新媒体数据
        this.media = Storage.getPageMedia(this.pageId);

        const hasMedia = this.media.images.length > 0 ||
            this.media.videos.length > 0 ||
            this.media.links.length > 0 ||
            this.media.documents.length > 0;

        if (!hasMedia) return;

        const section = document.createElement('div');
        section.className = 'media-section';

        let html = '';

        // 图片区域
        if (this.media.images.length > 0) {
            html += `
                <div class="media-subsection">
                    <h3 class="media-section-title">🖼️ 图片资料</h3>
                    <div class="media-grid">
                        ${this.media.images.map(img => `
                            <div class="media-item" data-type="image" data-url="${img.url}" data-name="${img.name}">
                                <img src="${img.thumbnail || img.url}" alt="${img.name}" loading="lazy">
                                <div class="media-item-overlay">
                                    <span class="media-item-name">${img.name}</span>
                                </div>
                                <button class="media-item-delete" data-id="${img.id}" data-type="image" title="删除">×</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // 视频区域
        if (this.media.videos.length > 0) {
            html += `
                <div class="media-subsection">
                    <h3 class="media-section-title">🎬 视频资料</h3>
                    <div class="media-grid">
                        ${this.media.videos.map(video => `
                            <div class="media-item" data-type="video" data-url="${video.url}" data-name="${video.name}">
                                <img src="${video.thumbnail}" alt="${video.name}" loading="lazy">
                                <div class="media-item-play">▶</div>
                                <div class="media-item-overlay">
                                    <span class="media-item-name">${video.name}</span>
                                </div>
                                <button class="media-item-delete" data-id="${video.id}" data-type="video" title="删除">×</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // 链接区域
        if (this.media.links.length > 0) {
            html += `
                <div class="media-subsection">
                    <h3 class="media-section-title">🔗 相关链接</h3>
                    <div class="resource-list">
                        ${this.media.links.map(link => `
                            <a href="${link.url}" target="_blank" class="resource-item">
                                <span class="resource-icon">🔗</span>
                                <div class="resource-info">
                                    <div class="resource-name">${link.name}</div>
                                    <div class="resource-url">${link.url}</div>
                                </div>
                                <button class="resource-delete" data-id="${link.id}" data-type="link" title="删除">×</button>
                            </a>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // 文档区域
        if (this.media.documents.length > 0) {
            html += `
                <div class="media-subsection">
                    <h3 class="media-section-title">📄 文档资料</h3>
                    <div class="resource-list">
                        ${this.media.documents.map(doc => `
                            <a href="${doc.url}" target="_blank" class="resource-item">
                                <span class="resource-icon">${this.getDocIcon(doc.type)}</span>
                                <div class="resource-info">
                                    <div class="resource-name">${doc.name}</div>
                                    <div class="resource-url">${doc.type.toUpperCase()} 文档</div>
                                </div>
                                <button class="resource-delete" data-id="${doc.id}" data-type="document" title="删除">×</button>
                            </a>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        section.innerHTML = html;
        docContent.appendChild(section);

        // 绑定事件
        this.bindMediaEvents(section);
    }

    // 获取文档图标
    getDocIcon(type) {
        const icons = {
            pdf: '📕',
            doc: '📘',
            docx: '📘',
            xls: '📗',
            xlsx: '📗',
            ppt: '📙',
            pptx: '📙',
            txt: '📄',
            md: '📝'
        };
        return icons[type.toLowerCase()] || '📄';
    }

    // 绑定媒体事件
    bindMediaEvents(section) {
        // 图片/视频点击打开灯箱
        section.querySelectorAll('.media-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('media-item-delete')) return;

                const type = item.dataset.type;
                const url = item.dataset.url;
                const name = item.dataset.name;
                this.openLightbox(type, url, name);
            });
        });

        // 删除按钮
        section.querySelectorAll('.media-item-delete, .resource-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (!confirm('确定要删除这个资源吗？')) return;

                const id = parseInt(btn.dataset.id);
                const type = btn.dataset.type;

                switch (type) {
                    case 'image':
                        Storage.removeImage(this.pageId, id);
                        break;
                    case 'video':
                        Storage.removeVideo(this.pageId, id);
                        break;
                    case 'link':
                        Storage.removeLink(this.pageId, id);
                        break;
                    case 'document':
                        Storage.removeDocument(this.pageId, id);
                        break;
                }

                this.persistMediaChanges();
                this.renderMediaSection();
                this.updateAdminMode();
            });
        });
    }

    // 更新管理员模式
    updateAdminMode() {
        const docPanel = document.querySelector('.doc-panel');
        if (docPanel) {
            if (Storage.isAdmin()) {
                docPanel.classList.add('admin-mode');
            } else {
                docPanel.classList.remove('admin-mode');
            }
        }
    }

    // 添加链接
    addLink(name, url) {
        if (!name || !url) {
            alert('请填写链接名称和URL');
            return false;
        }
        Storage.addLink(this.pageId, name, url);
        this.persistMediaChanges();
        this.renderMediaSection();
        return true;
    }

    // 添加图片
    addImage(name, url) {
        if (!name || !url) {
            alert('请填写图片名称和URL');
            return false;
        }
        Storage.addImage(this.pageId, name, url);
        this.persistMediaChanges();
        this.renderMediaSection();
        return true;
    }

    // 添加视频
    addVideo(name, url) {
        if (!name || !url) {
            alert('请填写视频名称和URL');
            return false;
        }
        Storage.addVideo(this.pageId, name, url);
        this.persistMediaChanges();
        this.renderMediaSection();
        return true;
    }

    // 添加文档
    addDocument(name, url, type = 'pdf') {
        if (!name || !url) {
            alert('请填写文档名称和URL');
            return false;
        }
        Storage.addDocument(this.pageId, name, url, type);
        this.persistMediaChanges();
        this.renderMediaSection();
        return true;
    }

    inferDocumentType(fileName) {
        const ext = (fileName.split('.').pop() || '').toLowerCase();
        if (!ext) return 'pdf';
        if (['doc', 'docx'].includes(ext)) return 'doc';
        if (['ppt', 'pptx'].includes(ext)) return 'ppt';
        if (['xls', 'xlsx', 'csv'].includes(ext)) return 'xls';
        if (ext === 'md') return 'md';
        if (ext === 'txt') return 'txt';
        if (ext === 'pdf') return 'pdf';
        return ext;
    }

    // 从文件上传图片
    async uploadImage(file, name) {
        if (!file) return false;

        // 检查文件大小（限制10MB）
        if (file.size > 10 * 1024 * 1024) {
            alert('图片文件大小不能超过10MB');
            return false;
        }

        const serverReady = await Storage.checkServerAvailability();
        if (!serverReady) {
            alert('请先使用 node scripts/local-server.js 启动项目本地服务器，再上传本地文件。');
            return false;
        }

        try {
            const uploaded = await Storage.uploadFile(this.pageId, 'image', file, name || file.name);
            if (!uploaded?.url) {
                alert('图片上传失败，请检查本地服务器是否正常运行。');
                return false;
            }

            const finalName = name || file.name;
            Storage.addImage(this.pageId, finalName, uploaded.url, uploaded.thumbnail || uploaded.url);
            this.persistMediaChanges();
            this.renderMediaSection();
            return true;
        } catch (e) {
            console.error('Upload error:', e);
            alert('文件上传失败');
            return false;
        }
    }

    async uploadVideo(file, name) {
        if (!file) return false;

        // 限制120MB，避免浏览器内存压力过高
        if (file.size > 120 * 1024 * 1024) {
            alert('视频文件大小不能超过120MB');
            return false;
        }

        const serverReady = await Storage.checkServerAvailability();
        if (!serverReady) {
            alert('请先使用 node scripts/local-server.js 启动项目本地服务器，再上传本地文件。');
            return false;
        }

        try {
            const uploaded = await Storage.uploadFile(this.pageId, 'video', file, name || file.name);
            if (!uploaded?.url) {
                alert('视频上传失败，请检查本地服务器是否正常运行。');
                return false;
            }

            const finalName = name || file.name;
            Storage.addVideo(this.pageId, finalName, uploaded.url, uploaded.thumbnail || Storage.getVideoThumbnail(uploaded.url));
            this.persistMediaChanges();
            this.renderMediaSection();
            return true;
        } catch (e) {
            console.error('Upload error:', e);
            alert('视频上传失败');
            return false;
        }
    }

    async uploadDocument(file, name, forcedType = '') {
        if (!file) return false;

        // 限制80MB，文档通常远小于此上限
        if (file.size > 80 * 1024 * 1024) {
            alert('文档文件大小不能超过80MB');
            return false;
        }

        const serverReady = await Storage.checkServerAvailability();
        if (!serverReady) {
            alert('请先使用 node scripts/local-server.js 启动项目本地服务器，再上传本地文件。');
            return false;
        }

        try {
            const docType = forcedType || this.inferDocumentType(file.name);
            const uploaded = await Storage.uploadFile(this.pageId, 'document', file, name || file.name, docType);
            if (!uploaded?.url) {
                alert('文档上传失败，请检查本地服务器是否正常运行。');
                return false;
            }

            const finalName = name || file.name;
            Storage.addDocument(this.pageId, finalName, uploaded.url, uploaded.type || docType);
            this.persistMediaChanges();
            this.renderMediaSection();
            return true;
        } catch (e) {
            console.error('Upload error:', e);
            alert('文档上传失败');
            return false;
        }
    }
}

// 导出
window.MediaManager = MediaManager;
