/**
 * 量子力学探索之旅 - 本地存储管理
 */

const Storage = {
    // 存储键名前缀
    PREFIX: 'quantum_',

    // 管理员密码
    ADMIN_PASSWORD: 'zjuphy',

    // 本地服务器 API 前缀（由 scripts/local-server.js 提供）
    API_PREFIX: '/api',

    // 缓存服务器可用性，避免频繁探测
    _serverAvailable: null,

    // 页面同步中的 Promise，避免并发重复请求
    _syncTasks: {},

    // 获取完整键名
    getKey(key) {
        return this.PREFIX + key;
    },

    // 保存数据
    set(key, value) {
        try {
            localStorage.setItem(this.getKey(key), JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage.set error:', e);
            if (e.name === 'QuotaExceededError') {
                alert('存储空间不足，请清理一些数据后重试。');
            }
            return false;
        }
    },

    // 读取数据
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(this.getKey(key));
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Storage.get error:', e);
            return defaultValue;
        }
    },

    // 删除数据
    remove(key) {
        localStorage.removeItem(this.getKey(key));
    },

    // 清空所有数据
    clear() {
        Object.keys(localStorage)
            .filter(key => key.startsWith(this.PREFIX))
            .forEach(key => localStorage.removeItem(key));
    },

    // 管理员状态
    isAdmin() {
        return this.get('isAdmin', false);
    },

    setAdmin(value) {
        this.set('isAdmin', value);
    },

    // 验证管理员密码
    verifyPassword(password) {
        return password === this.ADMIN_PASSWORD;
    },

    // 页面内容管理
    getPageContent(pageId) {
        return this.get(`content_${pageId}`, null);
    },

    setPageContent(pageId, content) {
        return this.set(`content_${pageId}`, content);
    },

    // ======== 媒体资源管理 ========

    createEmptyMedia() {
        return {
            links: [],
            images: [],
            videos: [],
            documents: []
        };
    },

    normalizeMedia(media) {
        const safeMedia = media && typeof media === 'object' ? media : {};
        return {
            links: Array.isArray(safeMedia.links) ? safeMedia.links : [],
            images: Array.isArray(safeMedia.images) ? safeMedia.images : [],
            videos: Array.isArray(safeMedia.videos) ? safeMedia.videos : [],
            documents: Array.isArray(safeMedia.documents) ? safeMedia.documents : []
        };
    },

    getPageMedia(pageId) {
        return this.normalizeMedia(this.get(`media_${pageId}`, this.createEmptyMedia()));
    },

    setPageMedia(pageId, media) {
        return this.set(`media_${pageId}`, this.normalizeMedia(media));
    },

    addLink(pageId, name, url) {
        const media = this.getPageMedia(pageId);
        media.links.push({ name, url, id: Date.now() + Math.floor(Math.random() * 1000) });
        return this.setPageMedia(pageId, media);
    },

    removeLink(pageId, id) {
        const media = this.getPageMedia(pageId);
        media.links = media.links.filter(l => l.id !== id);
        return this.setPageMedia(pageId, media);
    },

    addImage(pageId, name, url, thumbnail = null) {
        const media = this.getPageMedia(pageId);
        media.images.push({
            name,
            url,
            thumbnail: thumbnail || url,
            id: Date.now() + Math.floor(Math.random() * 1000)
        });
        return this.setPageMedia(pageId, media);
    },

    removeImage(pageId, id) {
        const media = this.getPageMedia(pageId);
        media.images = media.images.filter(i => i.id !== id);
        return this.setPageMedia(pageId, media);
    },

    addVideo(pageId, name, url, thumbnail = null) {
        const media = this.getPageMedia(pageId);
        media.videos.push({
            name,
            url,
            thumbnail: thumbnail || this.getVideoThumbnail(url),
            id: Date.now() + Math.floor(Math.random() * 1000)
        });
        return this.setPageMedia(pageId, media);
    },

    getVideoThumbnail(url) {
        const fallbackSvg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">
                <defs>
                    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
                        <stop offset="0%" stop-color="#1f2937"/>
                        <stop offset="100%" stop-color="#111827"/>
                    </linearGradient>
                </defs>
                <rect width="320" height="180" fill="url(#g)"/>
                <polygon points="136,90 136,64 188,90 136,116" fill="#22d3ee"/>
                <text x="160" y="150" text-anchor="middle" fill="#9ca3af" font-size="16" font-family="Arial">Video</text>
            </svg>
        `;
        const fallbackUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(fallbackSvg)}`;

        const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
        if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`;

        return fallbackUrl;
    },

    removeVideo(pageId, id) {
        const media = this.getPageMedia(pageId);
        media.videos = media.videos.filter(v => v.id !== id);
        return this.setPageMedia(pageId, media);
    },

    addDocument(pageId, name, url, type = 'pdf') {
        const media = this.getPageMedia(pageId);
        media.documents.push({ name, url, type, id: Date.now() + Math.floor(Math.random() * 1000) });
        return this.setPageMedia(pageId, media);
    },

    removeDocument(pageId, id) {
        const media = this.getPageMedia(pageId);
        media.documents = media.documents.filter(d => d.id !== id);
        return this.setPageMedia(pageId, media);
    },

    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    },

    async checkServerAvailability(forceRefresh = false) {
        if (!forceRefresh && this._serverAvailable === true) {
            return this._serverAvailable;
        }

        try {
            const response = await fetch(`${this.API_PREFIX}/health`, {
                method: 'GET',
                cache: 'no-store'
            });
            this._serverAvailable = response.ok;
        } catch (_) {
            this._serverAvailable = false;
        }

        return this._serverAvailable;
    },

    async requestJson(path, options = {}) {
        const response = await fetch(`${this.API_PREFIX}${path}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            }
        });

        if (!response.ok) {
            let message = `HTTP ${response.status}`;
            try {
                const errorData = await response.json();
                if (errorData?.error) message = errorData.error;
            } catch (_) {
                // ignore
            }
            throw new Error(message);
        }

        if (response.status === 204) return null;
        return response.json();
    },

    async syncPageData(pageId) {
        const serverReady = await this.checkServerAvailability();
        if (!serverReady) return false;

        if (this._syncTasks[pageId]) return this._syncTasks[pageId];

        this._syncTasks[pageId] = (async () => {
            try {
                const data = await this.requestJson(`/page/${encodeURIComponent(pageId)}`);
                if (data?.exists === true && typeof data?.content === 'string') {
                    this.setPageContent(pageId, data.content);
                }
                if (data?.exists === true && data?.media) {
                    this.setPageMedia(pageId, data.media);
                }
                return true;
            } catch (e) {
                console.warn('Storage.syncPageData error:', e);
                return false;
            } finally {
                delete this._syncTasks[pageId];
            }
        })();

        return this._syncTasks[pageId];
    },

    async persistPageContent(pageId, content) {
        this.setPageContent(pageId, content);

        const serverReady = await this.checkServerAvailability();
        if (!serverReady) return false;

        try {
            await this.requestJson(`/page/${encodeURIComponent(pageId)}/content`, {
                method: 'PUT',
                body: JSON.stringify({ content })
            });
            return true;
        } catch (e) {
            console.warn('Storage.persistPageContent error:', e);
            return false;
        }
    },

    async persistPageMedia(pageId, media) {
        const normalized = this.normalizeMedia(media);
        this.setPageMedia(pageId, normalized);

        const serverReady = await this.checkServerAvailability();
        if (!serverReady) return false;

        try {
            await this.requestJson(`/page/${encodeURIComponent(pageId)}/media`, {
                method: 'PUT',
                body: JSON.stringify({ media: normalized })
            });
            return true;
        } catch (e) {
            console.warn('Storage.persistPageMedia error:', e);
            return false;
        }
    },

    async uploadFile(pageId, category, file, displayName, docType = '') {
        if (!file) return null;

        const serverReady = await this.checkServerAvailability();
        if (!serverReady) return null;

        const dataUrl = await this.fileToBase64(file);
        return this.requestJson('/upload', {
            method: 'POST',
            body: JSON.stringify({
                pageId,
                category,
                displayName: displayName || file.name,
                originalName: file.name,
                docType,
                dataUrl
            })
        });
    },

    // 导出所有数据
    exportData() {
        const data = {};
        Object.keys(localStorage)
            .filter(key => key.startsWith(this.PREFIX))
            .forEach(key => {
                const shortKey = key.replace(this.PREFIX, '');
                data[shortKey] = this.get(shortKey);
            });
        return data;
    },

    // 导入数据
    importData(data) {
        try {
            Object.entries(data).forEach(([key, value]) => {
                if (key !== 'isAdmin') {
                    this.set(key, value);
                }
            });
            return true;
        } catch (e) {
            console.error('Storage.importData error:', e);
            return false;
        }
    }
};

// 默认内容配置
const DefaultContent = {
    'home-intro': `量子力学是20世纪物理学最伟大的成就之一，它彻底改变了我们对微观世界的理解。

从1900年普朗克提出量子假说，到1927年索尔维会议确立量子力学的基本框架，再到今天的量子计算和量子通信，量子力学走过了一个多世纪的辉煌历程。

本网站将带你探索这段激动人心的科学革命，通过交互式可视化，直观理解量子世界的奇妙规律。`,

    'thomson-model': `# 汤姆孙原子模型

1897年，英国物理学家J.J.汤姆孙通过阴极射线实验发现了电子，这是人类首次发现亚原子粒子。

## 阴极射线实验

汤姆孙利用电场和磁场来偏转阴极射线，通过测量偏转程度计算出了电子的荷质比：
$$\\frac{e}{m} = 1.76 \\times 10^{11} \\text{ C/kg}$$

## 葡萄干布丁模型

基于电子的发现，汤姆孙于1904年提出了第一个原子结构模型：
- 原子是一个均匀带正电的球体（"布丁"）
- 电子像"葡萄干"一样嵌入其中
- 电子在平衡位置附近振动`,

    'blackbody-radiation': `# 黑体辐射

黑体辐射问题是量子力学诞生的导火索。

## 斯特凡-玻尔兹曼定律

黑体辐射的总功率与温度的四次方成正比：
$$P = \\sigma T^4$$

## 维恩位移定律

辐射峰值波长与温度成反比：
$$\\lambda_{max} = \\frac{b}{T}$$

## 紫外灾难

经典物理预言在短波长处辐射强度趋向无穷大，与实验严重矛盾。1900年，普朗克通过引入能量量子化假设成功解决了这一问题。`
};

window.Storage = Storage;
window.DefaultContent = DefaultContent;
