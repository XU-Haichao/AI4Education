/**
 * 相对论探索之旅 - 本地存储管理
 */

const Storage = {
    // 存储键名前缀
    PREFIX: 'relativity_',

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
            // 存储空间不足时的处理
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
            links: [],      // { name, url }
            images: [],     // { name, url, thumbnail }
            videos: [],     // { name, url, thumbnail }
            documents: []   // { name, url, type }
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

    // 获取页面的所有媒体资源
    getPageMedia(pageId) {
        return this.normalizeMedia(this.get(`media_${pageId}`, this.createEmptyMedia()));
    },

    // 保存页面的媒体资源
    setPageMedia(pageId, media) {
        return this.set(`media_${pageId}`, this.normalizeMedia(media));
    },

    // 添加链接
    addLink(pageId, name, url) {
        const media = this.getPageMedia(pageId);
        media.links.push({ name, url, id: Date.now() + Math.floor(Math.random() * 1000) });
        return this.setPageMedia(pageId, media);
    },

    // 删除链接
    removeLink(pageId, id) {
        const media = this.getPageMedia(pageId);
        media.links = media.links.filter(l => l.id !== id);
        return this.setPageMedia(pageId, media);
    },

    // 添加图片
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

    // 删除图片
    removeImage(pageId, id) {
        const media = this.getPageMedia(pageId);
        media.images = media.images.filter(i => i.id !== id);
        return this.setPageMedia(pageId, media);
    },

    // 添加视频
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

    // 获取视频缩略图（支持YouTube和Bilibili）
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

        // YouTube
        const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
        if (ytMatch) {
            return `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`;
        }
        // Bilibili
        const biliMatch = url.match(/bilibili\.com\/video\/(BV[^/?]+)/);
        if (biliMatch) {
            return fallbackUrl;
        }
        return fallbackUrl;
    },

    // 删除视频
    removeVideo(pageId, id) {
        const media = this.getPageMedia(pageId);
        media.videos = media.videos.filter(v => v.id !== id);
        return this.setPageMedia(pageId, media);
    },

    // 添加文档
    addDocument(pageId, name, url, type = 'pdf') {
        const media = this.getPageMedia(pageId);
        media.documents.push({ name, url, type, id: Date.now() + Math.floor(Math.random() * 1000) });
        return this.setPageMedia(pageId, media);
    },

    // 删除文档
    removeDocument(pageId, id) {
        const media = this.getPageMedia(pageId);
        media.documents = media.documents.filter(d => d.id !== id);
        return this.setPageMedia(pageId, media);
    },

    // 将文件转为Base64（用于本地文件上传）
    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    },

    async checkServerAvailability(forceRefresh = false) {
        // 只缓存“可用”状态，避免服务启动前的失败结果被长期缓存
        if (!forceRefresh && this._serverAvailable === true) {
            return this._serverAvailable;
        }

        try {
            const response = await fetch(`${this.API_PREFIX}/health`, {
                method: 'GET',
                cache: 'no-store'
            });
            this._serverAvailable = response.ok;
        } catch (e) {
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
                // Ignore JSON parse failures for non-JSON error responses.
            }
            throw new Error(message);
        }

        if (response.status === 204) return null;
        return response.json();
    },

    async syncPageData(pageId) {
        const serverReady = await this.checkServerAvailability();
        if (!serverReady) return false;

        if (this._syncTasks[pageId]) {
            return this._syncTasks[pageId];
        }

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
                if (key !== 'isAdmin') { // 不导入管理员状态
                    this.set(key, value);
                }
            });
            return true;
        } catch (e) {
            console.error('Storage.importData error:', e);
            return false;
        }
    },

    // 下载数据为JSON文件
    downloadData() {
        const data = this.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relativity_backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
};

// 默认内容配置
const DefaultContent = {
    'home-intro': `相对论是阿尔伯特·爱因斯坦在20世纪初提出的革命性物理理论，彻底改变了我们对时间、空间、物质和能量的理解。

**狭义相对论**（1905年）揭示了高速运动时时间和空间的奇妙变化，以及著名的质能方程 E=mc²。

**广义相对论**（1915年）则将引力重新诠释为时空的弯曲，预言了黑洞、引力波等现象。`,

    'speed-of-light': `# 光速不变原理

光速不变原理是狭义相对论的两个基本假设之一。它指出：**在所有惯性参考系中，真空中的光速都是相同的，与光源和观察者的运动状态无关。**

## 核心概念

光在真空中的速度是一个宇宙常数：
$$c = 299,792,458 \\text{ m/s}$$

这个速度是宇宙中信息传递的最高速度。

## 历史背景

19世纪末，物理学家们试图探测"以太"——一种假想的介质，被认为是光波传播的媒介。然而，迈克尔逊-莫雷实验的结果表明，无论地球相对于假想的以太如何运动，光速都保持不变。

这个看似矛盾的结果最终被爱因斯坦的狭义相对论所解释。`,

    'time-dilation': `# 时间膨胀

时间膨胀是狭义相对论最令人惊奇的预言之一：**运动的时钟比静止的时钟走得慢。**

## 洛伦兹因子

时间膨胀的程度由洛伦兹因子γ决定：
$$\\gamma = \\frac{1}{\\sqrt{1 - \\frac{v^2}{c^2}}}$$

其中v是物体的运动速度，c是光速。

## 时间膨胀公式

如果一个静止的时钟测量经过的时间为Δt₀，那么一个以速度v运动的观察者测量到的时间为：
$$\\Delta t = \\gamma \\cdot \\Delta t_0$$

## 实验验证

- **μ子寿命实验**：宇宙射线产生的μ子因高速运动而"活"得更久
- **原子钟实验**：放在飞机上的原子钟比地面上的慢
- **GPS卫星**：必须考虑时间膨胀效应才能准确定位`,

    'length-contraction': `# 长度收缩

长度收缩是狭义相对论的核心结论之一：**当物体以接近光速运动时，在运动方向上的长度会变短。**

## 基本公式

若物体静止长度为 $L_0$，以速度 $v$ 运动时测得长度为：
$$L = L_0\\sqrt{1-\\frac{v^2}{c^2}} = \\frac{L_0}{\\gamma}$$

其中 $\\gamma$ 是洛伦兹因子。

## 关键理解

- 收缩只发生在**运动方向**上
- 对物体自身参考系而言，它并不会感觉自己变短
- 这是时空结构变化导致的测量结果，而非物体被“挤压”`,

    'mass-energy': `# 质能方程

爱因斯坦著名方程：
$$E = mc^2$$
揭示了质量和能量本质上是同一种物理量的不同表现。

## 物理意义

- 少量质量可转化为巨大能量（因为 $c^2$ 非常大）
- 能量也可以反过来形成粒子质量
- 现代核能、粒子物理都建立在这一关系上

## 应用示例

- 太阳发光：核聚变将质量差转化为辐射能
- 核电站：核裂变释放结合能
- 粒子对撞机：高能碰撞中产生新粒子`,

    'twin-paradox': `# 双生子佯谬

双生子佯谬描述了时间膨胀的一个经典思想实验：  
一对双胞胎中，一个留在地球，另一个高速往返太空。返回后，太空旅行者更年轻。

## 为什么不矛盾

看似双方都可认为对方在运动，但关键在于：

- 太空旅行者经历了加速、转向、减速，参考系发生变化
- 地球上的双胞胎近似处于同一惯性系

因此两人世界线不同，累计固有时不同，结论并不对称。

## 现实意义

高速航天、卫星导航和高精度计时系统中，都必须考虑类似效应。`,

    'equivalence': `# 等效原理

等效原理是广义相对论的出发点：**局部范围内，引力效应与加速度效应不可区分。**

## 思想实验

在一个密闭电梯中：

- 若电梯在太空中向上加速，你会感觉“向下”的压力
- 若电梯静止在有引力星球表面，也会感到同样压力

仅靠局部实验，很难区分这两种情形。

## 意义

等效原理将“引力”与“时空几何”连接起来，最终导向“质量使时空弯曲”的观点。`,

    'spacetime-curvature': `# 时空弯曲

广义相对论认为：**引力不是传统意义上的力，而是质量和能量导致的时空弯曲。**

## 核心图像

- 大质量天体改变周围时空几何
- 其他物体沿弯曲时空中的“最短路径”（测地线）运动
- 这在宏观上表现为轨道运动和引力吸引

## 典型现象

- 行星绕恒星公转
- 光线在强引力场附近偏折
- 引力时间延缓（靠近大质量体时间变慢）`,

    'gravitational-lensing': `# 引力透镜

当光线经过大质量天体附近时，会因时空弯曲而偏折，这一现象称为引力透镜。

## 常见观测结果

- 背景天体位置发生偏移
- 出现拉长的弧形像
- 极端情况下形成“爱因斯坦环”

## 科学价值

- 用于估算透镜天体质量
- 探测暗物质分布
- 放大遥远暗弱天体，帮助观测早期宇宙`,

    'black-holes': `# 黑洞

黑洞是时空弯曲极端强烈的天体，其事件视界内连光都无法逃逸。

## 关键概念

- **事件视界**：不可返回边界
- **史瓦西半径**：非旋转黑洞的特征尺度
- **吸积盘**：落入黑洞前的高温旋转物质盘

## 形成方式

- 大质量恒星演化末期引力坍缩
- 双黑洞并合可形成更大质量黑洞

黑洞并非“宇宙吸尘器”，远处物体仍按引力规律稳定运行。`,

    'gravitational-waves': `# 引力波

引力波是时空结构的涟漪，由大质量天体的加速运动产生并以光速传播。

## 来源

- 双黑洞并合
- 双中子星并合
- 超新星爆发等剧烈天体事件

## 观测里程碑

2015 年，LIGO 首次直接探测到引力波，验证了广义相对论的重要预言。

## 研究意义

引力波天文学为我们提供了“看见宇宙”的新方式，可直接研究传统电磁波难以揭示的天体过程。`
};

window.Storage = Storage;
window.DefaultContent = DefaultContent;
