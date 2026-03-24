import { systemBuilders } from './systems/index.js';

        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x000000, 0.0001); 

        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 200000); 
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(renderer.domElement);

        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxDistance = 60000; 

        let timeScale = 1.0; 
        let isPaused = false; 
        let isAdmin = false; 
        const celestialBodies = []; 
        const labelElements = [];   
        let projectDirectoryHandle = null;
        let projectDirectoryPrompted = false;
        let assetsDirectoryHandle = null;
        let dataDirectoryHandle = null;
        let dataFilePrompted = false;
        const assetFolderMap = {
            image: 'images',
            video: 'videos',
            audio: 'audio',
            document: 'documents'
        };
        const CELESTIAL_INDEX_PATH = 'data/celestial-index.json';
        const LEGACY_CELESTIAL_DATA_PATH = 'data/celestial-data.json';

        // ==========================================
        // 1. UI：导航面板可收起（小屏默认收起）
        // ==========================================
        const uiContainer = document.getElementById('ui-container');
        const uiCollapseBtn = document.getElementById('ui-collapse-btn');

        function isSmallScreen() {
            if (window.matchMedia) {
                return window.matchMedia('(max-width: 768px)').matches || window.matchMedia('(max-height: 640px)').matches;
            }
            return window.innerWidth <= 768 || window.innerHeight <= 640;
        }

        function setUiCollapsed(collapsed, persist = true) {
            if (!uiContainer || !uiCollapseBtn) return;
            uiContainer.classList.toggle('collapsed', collapsed);
            uiCollapseBtn.textContent = collapsed ? "展开" : "收起";
            uiCollapseBtn.setAttribute('aria-expanded', String(!collapsed));

            if (!persist) return;
            try {
                localStorage.setItem('uiCollapsed', collapsed ? '1' : '0');
            } catch (_) { /* ignore */ }
        }

        function initUiCollapse() {
            if (!uiContainer || !uiCollapseBtn) return;

            uiCollapseBtn.addEventListener('click', () => {
                setUiCollapsed(!uiContainer.classList.contains('collapsed'));
            });

            let saved = null;
            try {
                saved = localStorage.getItem('uiCollapsed');
            } catch (_) { /* ignore */ }

            if (saved === '1') {
                setUiCollapsed(true, false);
            } else if (saved === '0') {
                setUiCollapsed(false, false);
            } else if (isSmallScreen()) {
                setUiCollapsed(true, false);
            }
        }

        initUiCollapse();

        function deepClone(obj) {
            return JSON.parse(JSON.stringify(obj));
        }

        // ==========================================
        // 2. 数据与交互逻辑
        // ==========================================
        const defaultText = "暂无详细介绍。";
        let celestialIndex = {};
        let celestialData = {};

        function normalizeCelestialRecord(raw) {
            const record = raw && typeof raw === 'object' ? raw : {};
            return {
                desc: typeof record.desc === 'string' && record.desc.trim() ? record.desc : defaultText,
                media: Array.isArray(record.media) ? record.media : [],
                links: Array.isArray(record.links) ? record.links : []
            };
        }

        async function loadCelestialData() {
            try {
                const response = await fetch(`${CELESTIAL_INDEX_PATH}?t=${Date.now()}`, { cache: 'no-store' });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                const json = await response.json();
                const bodyMap = json && typeof json === 'object' && json.bodies && typeof json.bodies === 'object' ? json.bodies : {};
                celestialIndex = bodyMap;

                const entries = await Promise.all(Object.entries(bodyMap).map(async ([name, path]) => {
                    try {
                        const r = await fetch(`${path}?t=${Date.now()}`, { cache: 'no-store' });
                        if (!r.ok) {
                            throw new Error(`HTTP ${r.status}`);
                        }
                        const bodyJson = await r.json();
                        return [name, normalizeCelestialRecord(bodyJson)];
                    } catch (err) {
                        console.warn(`加载天体数据失败：${name}`, err);
                        return [name, { desc: defaultText, media: [], links: [] }];
                    }
                }));

	                celestialData = {};
	                entries.forEach(([name, record]) => {
	                    celestialData[name] = record;
	                });

	                // 兼容旧版：若存在 data/celestial-data.json，则作为覆盖层合并（不强依赖）
	                try {
	                    const legacyResponse = await fetch(`${LEGACY_CELESTIAL_DATA_PATH}?t=${Date.now()}`, { cache: 'no-store' });
	                    if (legacyResponse.ok) {
	                        const legacyJson = await legacyResponse.json();
	                        if (legacyJson && typeof legacyJson === 'object') {
	                            Object.entries(legacyJson).forEach(([name, value]) => {
	                                const existing = celestialData[name] || {};
	                                celestialData[name] = { ...existing, ...normalizeCelestialRecord(value) };
	                            });
	                        }
	                    }
	                } catch (err) {
	                    // ignore
	                }
	            } catch (err) {
	                console.warn('加载天体数据索引失败，将使用空数据集。', err);
	                celestialIndex = {};
	                celestialData = {};

	                // 仅旧版数据可用时的兜底
	                try {
	                    const legacyResponse = await fetch(`${LEGACY_CELESTIAL_DATA_PATH}?t=${Date.now()}`, { cache: 'no-store' });
	                    if (legacyResponse.ok) {
	                        const legacyJson = await legacyResponse.json();
	                        if (legacyJson && typeof legacyJson === 'object') {
	                            Object.entries(legacyJson).forEach(([name, value]) => {
	                                celestialData[name] = normalizeCelestialRecord(value);
	                            });
	                        }
	                    }
	                } catch (legacyErr) {
	                    // ignore
	                }
	            }
	        }

        loadCelestialData();

        function getData(name) {
            const cleanName = name.split('<')[0].trim();
            if (!celestialData[cleanName]) {
                const fallback = { desc: defaultText, media: [], links: [] };
                celestialData[cleanName] = fallback;
            }
            return celestialData[cleanName];
        }

        function openLogin() {
            if (isAdmin) {
                isAdmin = false;
                document.getElementById('admin-btn').textContent = "🔒 管理员登录";
                document.getElementById('admin-btn').style.color = "#888";
                document.getElementById('admin-btn').style.borderColor = "#666";
                alert("已退出管理员模式");
                return;
            }
            isPaused = true;
            document.getElementById('login-modal').style.display = 'block';
            document.getElementById('blur-overlay').style.display = 'block';
            requestAnimationFrame(() => document.getElementById('blur-overlay').style.opacity = '1');
        }

        function closeLogin() {
            document.getElementById('login-modal').style.display = 'none';
            window.closeInfo(); 
        }

        function checkLogin() {
            const pwd = document.getElementById('admin-pwd').value;
            if (pwd === "zjuphy") {
                isAdmin = true;
                document.getElementById('admin-btn').textContent = "🔓 已登录 (点击退出)";
                document.getElementById('admin-btn').style.color = "#00ff00";
                document.getElementById('admin-btn').style.borderColor = "#00ff00";
                closeLogin();
                alert("管理员登录成功！点击任意天体即可编辑。");
            } else {
                alert("密码错误");
            }
        }

        // 模块脚本下需显式暴露给 HTML onclick 调用
        window.openLogin = openLogin;
        window.closeLogin = closeLogin;
        window.checkLogin = checkLogin;

        let currentEditingName = "";

        function showInfo(name) {
            isPaused = true;
            const cleanName = name.split('<')[0].trim();
            currentEditingName = cleanName;
            
            const data = getData(cleanName);
            const title = document.getElementById('modal-title');
            const body = document.getElementById('modal-body');

            title.innerHTML = cleanName + (isAdmin ? ` <span class="admin-badge">编辑模式</span>` : "");
            
            if (isAdmin) {
                renderEditView(body, data);
            } else {
                renderViewMode(body, data);
            }

            const overlay = document.getElementById('blur-overlay');
            const modal = document.getElementById('info-modal');
            overlay.style.display = 'block';
            modal.style.display = 'block';
            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
                modal.classList.add('active');
            });
        }

        function renderViewMode(container, data) {
            let html = `<div class="content">${data.desc}</div>`;
            const docLinks = [];
            if (data.media.length > 0) {
                let mediaHtml = `<div class="view-media">`;
                let hasInlineMedia = false;
                data.media.forEach(m => {
                    const mimeType = m.mimeType || m.type || '';
                    const category = m.mediaType || detectAssetCategory(mimeType);
                    const mediaUrl = m.assetPath || m.url;
                    if (category === 'video') {
                        mediaHtml += `<video src="${mediaUrl}" controls style="width:100%"></video>`;
                        hasInlineMedia = true;
                    } else if (category === 'audio') {
                        mediaHtml += `<audio src="${mediaUrl}" controls style="width:100%"></audio>`;
                        hasInlineMedia = true;
                    } else if (category === 'document') {
                        const fileName = m.fileName || m.name || mediaUrl.split('/').pop();
                        docLinks.push({ url: mediaUrl, name: fileName });
                    } else {
                        mediaHtml += `<img src="${mediaUrl}" alt="media">`;
                        hasInlineMedia = true;
                    }
                });
                mediaHtml += `</div>`;
                if (hasInlineMedia) {
                    html += mediaHtml;
                }
            }
            if (docLinks.length > 0) {
                html += `<div class="view-links" style="margin-top:15px; border-top:1px solid #333; padding-top:10px;"><strong>上传文件：</strong>`;
                docLinks.forEach(doc => {
                    html += `<a href="${doc.url}" target="_blank">📄 ${doc.name}</a>`;
                });
                html += `</div>`;
            }
            if (data.links.length > 0) {
                html += `<div class="view-links" style="margin-top:15px; border-top:1px solid #333; padding-top:10px;"><strong>相关链接：</strong>`;
                data.links.forEach(l => {
                    html += `<a href="${l.url}" target="_blank">🔗 ${l.name}</a>`;
                });
                html += `</div>`;
            }
            container.innerHTML = html;
        }

        function renderEditView(container, data) {
            container.innerHTML = `
                <div class="edit-mode">
                    <p style="color:#888; font-size:0.8rem;">简介文本:</p>
                    <textarea id="edit-desc-input">${data.desc}</textarea>
                    
                    <p style="color:#888; font-size:0.8rem;">媒体资源 (拖入文件):</p>
                    <div id="drop-zone" class="drop-zone">将图片、视频或文档拖放到此处</div>
                    <div id="media-preview-list" class="media-preview"></div>
                    
                    <p style="color:#888; font-size:0.8rem; margin-top:10px;">拓展链接:</p>
                    <div id="links-list"></div>
                    <button onclick="addLinkInput()" style="background:#444; color:#fff; font-size:0.8rem; padding:2px 8px; margin-bottom:10px;">+ 添加链接</button>

                    <button onclick="saveChanges()" style="width:100%; margin-top:20px; padding:10px; background:#00d2ff; color:#000; font-weight:bold; border:none; cursor:pointer;">保存更改</button>
                </div>
            `;
            const previewList = document.getElementById('media-preview-list');
            data.media.forEach(m => {
                const displayUrl = m.assetPath || m.url;
                const meta = {
                    mimeType: m.mimeType || m.type,
                    assetPath: m.assetPath || '',
                    displayUrl: displayUrl,
                    fileName: m.fileName || m.name || ''
                };
                const el = createMediaElement(displayUrl, m.mimeType || m.type, meta, m.mediaType || null);
                previewList.appendChild(el);
            });
            const linksList = document.getElementById('links-list');
            data.links.forEach(l => {
                window.addLinkInput(l.name, l.url);
            });
            setupDragAndDrop();
        }

        function detectAssetCategory(mimeType) {
            if (!mimeType) return 'document';
            if (mimeType.startsWith('image/')) return 'image';
            if (mimeType.startsWith('video/')) return 'video';
            if (mimeType.startsWith('audio/')) return 'audio';
            return 'document';
        }

        function sanitizeFileName(name) {
            return name.replace(/[^a-zA-Z0-9._-]/g, '_');
        }

        function generateAssetFileName(originalName) {
            const safeName = sanitizeFileName(originalName || 'asset');
            const dotIndex = safeName.lastIndexOf('.');
            const timestamp = Date.now();
            if (dotIndex > 0) {
                const base = safeName.slice(0, dotIndex);
                const ext = safeName.slice(dotIndex);
                return `${base}_${timestamp}${ext}`;
            }
            return `${safeName}_${timestamp}`;
        }

        async function ensureProjectDirectory() {
            if (!('showDirectoryPicker' in window)) {
                return null;
            }
            if (projectDirectoryHandle) {
                return projectDirectoryHandle;
            }
            try {
                if (!projectDirectoryPrompted) {
                    alert('首次使用请定位到项目根目录（需包含 assets 与 data 文件夹）。');
                    projectDirectoryPrompted = true;
                }
                const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
                projectDirectoryHandle = handle;
                return handle;
            } catch (err) {
                console.warn('无法访问项目目录，已退回为内联存储。', err);
                return null;
            }
        }

        async function ensureAssetsDirectory() {
            const projectHandle = await ensureProjectDirectory();
            if (!projectHandle) {
                return null;
            }
            try {
                if (!assetsDirectoryHandle) {
                    assetsDirectoryHandle = await projectHandle.getDirectoryHandle('assets', { create: true });
                }
                return assetsDirectoryHandle;
            } catch (err) {
                console.warn('无法访问 assets 目录，已退回为内联存储。', err);
                return null;
            }
        }

        async function ensureDataDirectory() {
            if (!('showDirectoryPicker' in window)) {
                return null;
            }
            const projectHandle = await ensureProjectDirectory();
            if (!projectHandle) {
                return null;
            }
            try {
                if (!dataDirectoryHandle) {
                    dataDirectoryHandle = await projectHandle.getDirectoryHandle('data', { create: true });
                }
                return dataDirectoryHandle;
            } catch (err) {
                console.warn('无法访问 data 目录，已退回为下载导出。', err);
                return null;
            }
        }

        function splitDataPath(path) {
            const normalized = String(path || '').replace(/\\/g, '/');
            const trimmed = normalized.startsWith('data/') ? normalized.slice('data/'.length) : normalized;
            const parts = trimmed.split('/').filter(Boolean);
            if (parts.length === 0) return null;
            const fileName = parts.pop();
            return { dirs: parts, fileName };
        }

        async function ensureBodyDataFileHandle(bodyName) {
            if (!('showDirectoryPicker' in window)) {
                return null;
            }

            const dataPath = celestialIndex && typeof celestialIndex === 'object' ? celestialIndex[bodyName] : null;
            if (!dataPath) {
                console.warn(`未在 celestial-index.json 中找到天体数据路径：${bodyName}`);
                return null;
            }

            const dataRoot = await ensureDataDirectory();
            if (!dataRoot) {
                return null;
            }

            try {
                if (!dataFilePrompted) {
                    alert('将修改写入 data/systems/.../*.json，以便同步到其他设备。');
                    dataFilePrompted = true;
                }

                const split = splitDataPath(dataPath);
                if (!split) {
                    console.warn(`天体数据路径非法：${dataPath}`);
                    return null;
                }

                let dirHandle = dataRoot;
                for (const part of split.dirs) {
                    dirHandle = await dirHandle.getDirectoryHandle(part, { create: true });
                }
                return await dirHandle.getFileHandle(split.fileName, { create: true });
            } catch (err) {
                console.warn(`无法访问 ${dataPath}，已退回为下载导出。`, err);
                return null;
            }
        }

        async function writeDataSnapshotToHandle(handle, snapshot) {
            const writable = await handle.createWritable();
            await writable.write(JSON.stringify(snapshot, null, 2));
            await writable.close();
        }

        function downloadDataSnapshot(snapshot, fileName = 'celestial.json') {
            const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }

        function getDownloadFileNameForBody(bodyName) {
            const dataPath = celestialIndex && typeof celestialIndex === 'object' ? celestialIndex[bodyName] : null;
            if (typeof dataPath === 'string' && dataPath.includes('/')) {
                return dataPath.split('/').pop();
            }
            return `${sanitizeFileName(bodyName)}.json`;
        }

        async function persistBodyData(bodyName) {
            const snapshot = deepClone(celestialData[bodyName] || { desc: defaultText, media: [], links: [] });
            try {
                const handle = await ensureBodyDataFileHandle(bodyName);
                if (handle) {
                    await writeDataSnapshotToHandle(handle, snapshot);
                    return { ok: true, path: celestialIndex[bodyName] };
                }
            } catch (err) {
                console.warn('写入 JSON 文件失败，将改为下载导出。', err);
            }
            const fileName = getDownloadFileNameForBody(bodyName);
            downloadDataSnapshot(snapshot, fileName);
            return { ok: false, fileName };
        }

        function readFileAsDataURL(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }

        async function saveFileToAssets(file) {
            const mimeType = file.type || '';
            const category = detectAssetCategory(mimeType);
            const subDir = assetFolderMap[category] || 'documents';
            try {
                const rootHandle = await ensureAssetsDirectory();
                if (rootHandle) {
                    const subDirHandle = await rootHandle.getDirectoryHandle(subDir, { create: true });
                    const fileName = generateAssetFileName(file.name || `${category}.bin`);
                    const fileHandle = await subDirHandle.getFileHandle(fileName, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(file);
                    await writable.close();
                    const relativePath = `assets/${subDir}/${fileName}`;
                    return {
                        url: relativePath,
                        category,
                        mimeType,
                        assetPath: relativePath,
                        fileName
                    };
                }
            } catch (err) {
                console.warn('写入静态资源目录失败，已退回为内联存储。', err);
            }

            const dataUrl = await readFileAsDataURL(file);
            return {
                url: dataUrl,
                category,
                mimeType,
                assetPath: '',
                fileName: file.name || '未命名文件'
            };
        }

        function createMediaElement(url, type, meta = {}, explicitCategory = null) {
            const category = explicitCategory || detectAssetCategory(type || meta.mimeType || '');
            const div = document.createElement('div');
            div.style.position = 'relative';
            div.style.display = 'inline-block';
            let el;
            if (category === 'video') {
                el = document.createElement('video');
                el.src = url;
                el.className = 'media-item';
                el.controls = true;
            } else if (category === 'audio') {
                el = document.createElement('audio');
                el.src = url;
                el.controls = true;
                el.className = 'audio-item';
            } else if (category === 'document') {
                el = document.createElement('a');
                el.href = url;
                el.target = '_blank';
                el.rel = 'noopener';
                el.className = 'document-item';
                el.textContent = meta.fileName || '文档';
            } else {
                el = document.createElement('img');
                el.src = url;
                el.className = 'media-item';
            }
            const delBtn = document.createElement('span');
            delBtn.innerHTML = '&times;';
            delBtn.style.position = 'absolute';
            delBtn.style.top = '-5px';
            delBtn.style.right = '-5px';
            delBtn.style.background = 'red';
            delBtn.style.color = 'white';
            delBtn.style.borderRadius = '50%';
            delBtn.style.width = '16px';
            delBtn.style.height = '16px';
            delBtn.style.textAlign = 'center';
            delBtn.style.lineHeight = '14px';
            delBtn.style.cursor = 'pointer';
            delBtn.style.fontSize = '12px';
            delBtn.onclick = function() { div.remove(); };
            div.appendChild(el);
            div.appendChild(delBtn);
            div.dataset.mediaType = category;
            if (meta.mimeType) div.dataset.mimeType = meta.mimeType;
            if (meta.assetPath) div.dataset.assetPath = meta.assetPath;
            if (meta.displayUrl) div.dataset.displayUrl = meta.displayUrl;
            if (meta.fileName) div.dataset.fileName = meta.fileName;
            div.dataset.sourceType = meta.assetPath ? 'asset' : 'inline';
            return div;
        }

        window.addLinkInput = function(nameVal = '', urlVal = '') {
            const div = document.createElement('div');
            div.className = 'link-input-group';
            div.innerHTML = `
                <input type="text" placeholder="链接名称" value="${nameVal}" class="link-name">
                <input type="text" placeholder="URL (http://...)" value="${urlVal}" class="link-url">
                <button onclick="this.parentElement.remove()" style="background:#444; border:none; color:#fff;">&times;</button>
            `;
            document.getElementById('links-list').appendChild(div);
        }

        function setupDragAndDrop() {
            const zone = document.getElementById('drop-zone');
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.classList.add('dragover');
            });
            zone.addEventListener('dragleave', () => {
                zone.classList.remove('dragover');
            });
            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.classList.remove('dragover');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    handleFiles(files).catch(err => {
                        console.error('处理拖拽文件时出错:', err);
                        alert('上传文件时出现问题，请重试或检查浏览器权限。');
                    });
                }
            });
        }

        async function handleFiles(files) {
            const previewList = document.getElementById('media-preview-list');
            for (const file of Array.from(files)) {
                const stored = await saveFileToAssets(file);
                const meta = {
                    mimeType: stored.mimeType,
                    assetPath: stored.assetPath,
                    displayUrl: stored.url,
                    fileName: stored.fileName || file.name,
                };
                const el = createMediaElement(stored.url, stored.mimeType, meta, stored.category);
                previewList.appendChild(el);
            }
        }

        window.saveChanges = async function() {
            const data = celestialData[currentEditingName];
            data.desc = document.getElementById('edit-desc-input').value;
            data.media = [];
            const mediaDivs = document.getElementById('media-preview-list').children;
            for (let div of mediaDivs) {
                const child = div.querySelector('img, video, audio, a');
                let resolvedUrl = div.dataset.assetPath || div.dataset.displayUrl;
                if (!resolvedUrl && child) {
                    resolvedUrl = child.tagName === 'A' ? child.href : child.src;
                }
                if (!resolvedUrl) {
                    continue;
                }
                const mimeType = div.dataset.mimeType || (child && child.tagName === 'VIDEO' ? 'video/mp4' : '');
                const mediaType = div.dataset.mediaType || detectAssetCategory(mimeType);
                data.media.push({
                    url: resolvedUrl,
                    type: mimeType || mediaType,
                    mimeType: mimeType,
                    mediaType: mediaType,
                    assetPath: div.dataset.assetPath || '',
                    fileName: div.dataset.fileName || '',
                    name: div.dataset.fileName || ''
                });
            }
            data.links = [];
            const linkGroups = document.getElementsByClassName('link-input-group');
	            for (let group of linkGroups) {
	                const name = group.querySelector('.link-name').value;
	                const url = group.querySelector('.link-url').value;
	                if (name && url) {
	                    data.links.push({ name, url });
	                }
	            }
	            try {
	                const result = await persistBodyData(currentEditingName);
	                if (result.ok) {
	                    alert(`保存成功！更改已写入 ${result.path}。`);
	                } else {
	                    alert(`已导出 ${result.fileName}，请手动替换 data 目录中的对应文件以完成同步。`);
	                }
	            } catch (err) {
	                console.error('保存自定义天体数据时发生错误:', err);
	                alert('保存过程中出现问题，已尝试导出 JSON，请检查控制台。');
	            }
	            window.closeInfo();
	        }

        window.closeInfo = function() { 
            const overlay = document.getElementById('blur-overlay');
            const modal = document.getElementById('info-modal');
            overlay.style.opacity = '0';
            modal.classList.remove('active');
            setTimeout(() => {
                overlay.style.display = 'none';
                modal.style.display = 'none';
                isPaused = false; 
            }, 300);
        };

        // ==========================================
        // 3. 纹理生成 (已前置变量定义)
        // ==========================================
        
        // 定义变量 (关键修正：在 initSunTexture 之前定义)
        let sunTexture, sunContext, sunBaseCanvas;
        const sunFeatures = [];
        const SUN_textureSize = 512;

        function initSunTexture() {
            sunBaseCanvas = document.createElement('canvas');
            sunBaseCanvas.width = SUN_textureSize;
            sunBaseCanvas.height = SUN_textureSize;
            const ctx = sunBaseCanvas.getContext('2d');
            const grd = ctx.createRadialGradient(SUN_textureSize/2, SUN_textureSize/2, SUN_textureSize/10, SUN_textureSize/2, SUN_textureSize/2, SUN_textureSize/2);
            grd.addColorStop(0, '#ffffff');
            grd.addColorStop(0.2, '#ffaa00');
            grd.addColorStop(0.8, '#ff4400');
            grd.addColorStop(1, '#ffaa00');
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, SUN_textureSize, SUN_textureSize);
            for (let i = 0; i < 4000; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#ffcc00' : '#ff8800';
                ctx.globalAlpha = 0.15; 
                ctx.beginPath();
                ctx.arc(Math.random() * SUN_textureSize, Math.random() * SUN_textureSize, Math.random() * 8 + 2, 0, Math.PI * 2);
                ctx.fill();
            }
            const dynamicCanvas = document.createElement('canvas');
            dynamicCanvas.width = SUN_textureSize;
            dynamicCanvas.height = SUN_textureSize;
            sunContext = dynamicCanvas.getContext('2d');
            sunContext.drawImage(sunBaseCanvas, 0, 0);
            sunTexture = new THREE.CanvasTexture(dynamicCanvas);
            return sunTexture;
        }

        function createRingTexture() {
            const size = 512;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            const center = size / 2;
            const innerRadiusRatio = 1.4 / 2.2; 
            const innerR = center * innerRadiusRatio;
            const outerR = center;
            ctx.clearRect(0, 0, size, size);
            for (let r = innerR; r < outerR; r += 0.5) {
                const norm = (r - innerR) / (outerR - innerR);
                let alpha = 0.8;
                let color = "200, 180, 150"; 
                if (norm < 0.15) { alpha = 0.2; } 
                else if (norm < 0.6) { alpha = 0.8 + Math.random() * 0.1; }
                else if (norm >= 0.6 && norm < 0.68) { alpha = 0.02; }
                else {
                    alpha = 0.6 + Math.random() * 0.2;
                    if (norm > 0.85 && norm < 0.87) { alpha = 0.05; }
                }
                ctx.beginPath();
                ctx.arc(center, center, r, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(${color}, ${alpha})`;
                ctx.stroke();
            }
            return new THREE.CanvasTexture(canvas);
        }

        function createTexture(type, colorBase, colorSec) {
            const size = 512;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = colorBase;
            ctx.fillRect(0, 0, size, size);
            if (type === 'star') {
                const grd = ctx.createRadialGradient(size/2, size/2, size/10, size/2, size/2, size/2);
                grd.addColorStop(0, '#ffffff');
                grd.addColorStop(0.2, colorBase);
                grd.addColorStop(0.8, colorSec);
                grd.addColorStop(1, colorBase);
                ctx.fillStyle = grd;
                ctx.fillRect(0, 0, size, size);
            } else if (type === 'gas' || type === 'atmosphere') {
                for (let i = 0; i < size; i += 10) {
                    ctx.fillStyle = Math.random() > 0.5 ? colorBase : colorSec;
                    ctx.globalAlpha = 0.4;
                    ctx.fillRect(0, i, size, Math.random() * 20);
                }
                ctx.globalAlpha = 0.1;
                ctx.fillStyle = '#fff';
                ctx.fillRect(0,0,size,size);
                if(type === 'atmosphere') {
                    const grd = ctx.createRadialGradient(size/2, size/2, size/3, size/2, size/2, size/2);
                    grd.addColorStop(0, 'rgba(255,255,255,0)');
                    grd.addColorStop(1, colorSec);
                    ctx.fillStyle = grd;
                    ctx.fillRect(0,0,size,size);
                }
            } else if (type === 'terrestrial' || type === 'rock' || type === 'ice') {
                for (let i = 0; i < 400; i++) {
                    ctx.beginPath();
                    ctx.arc(Math.random() * size, Math.random() * size, Math.random() * 50, 0, Math.PI * 2);
                    ctx.fillStyle = colorSec;
                    ctx.globalAlpha = 0.3;
                    ctx.fill();
                }
                if (type === 'rock') {
                    for(let i=0; i<1000; i++) {
                        ctx.fillStyle = Math.random() > 0.5 ? '#222' : '#555';
                        ctx.fillRect(Math.random()*size, Math.random()*size, 2, 2);
                    }
                }
                if (type === 'ice') {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                    ctx.fillRect(0, 0, size, size);
                }
            } else if (type === 'earth') {
                ctx.fillStyle = '#001144'; 
                ctx.fillRect(0, 0, size, size);
                for (let i = 0; i < 500; i++) {
                    ctx.beginPath();
                    ctx.arc(Math.random() * size, Math.random() * size, Math.random() * 60, 0, Math.PI * 2);
                    ctx.fillStyle = Math.random() > 0.6 ? '#228822' : '#ffffff'; 
                    ctx.globalAlpha = 0.4;
                    ctx.fill();
                }
                ctx.globalAlpha = 0.2;
                ctx.fillStyle = '#0044ff';
                ctx.fillRect(0, 0, size, size);
            } else if (type === 'volcanic') {
                for (let i = 0; i < 200; i++) {
                    ctx.beginPath();
                    ctx.arc(Math.random() * size, Math.random() * size, Math.random() * 30, 0, Math.PI * 2);
                    ctx.fillStyle = Math.random() > 0.7 ? '#ff3300' : '#cccc00';
                    ctx.globalAlpha = 0.6;
                    ctx.fill();
                }
            } else if (type === 'ice_cracks') {
                ctx.strokeStyle = '#aaccff';
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.5;
                for (let i = 0; i < 50; i++) {
                    ctx.beginPath();
                    ctx.moveTo(Math.random() * size, Math.random() * size);
                    ctx.lineTo(Math.random() * size, Math.random() * size);
                    ctx.stroke();
                }
            }
            const texture = new THREE.CanvasTexture(canvas);
            return texture;
        }

        const textures = {
            sun: initSunTexture(), 
            mercury: createTexture('terrestrial', '#aaaaaa', '#777777'),
            venus: createTexture('gas', '#eebb66', '#aa8833'),
            earth: createTexture('earth', '#000000', '#000000'), 
            moon: createTexture('terrestrial', '#eeeeee', '#999999'), 
            mars: createTexture('terrestrial', '#cc4422', '#883311'),
            jupiter: createTexture('gas', '#dca', '#a87'),
            saturn: createTexture('gas', '#eec', '#cc9'),
            saturnRing: createRingTexture(),
            uranus: createTexture('gas', '#88ccff', '#66aaff'),
            neptune: createTexture('gas', '#3355ff', '#2233aa'),
            pluto: createTexture('terrestrial', '#ccaa88', '#553322'),
            asteroid: createTexture('terrestrial', '#dddddd', '#ffffff'), 
            phobos: createTexture('rock', '#555555', '#333333'),
            deimos: createTexture('rock', '#666666', '#444444'),
            io: createTexture('volcanic', '#ffff00', '#ff8800'),
            europa: createTexture('ice_cracks', '#ffffff', '#ccddff'),
            ganymede: createTexture('terrestrial', '#776655', '#554433'),
            callisto: createTexture('rock', '#333333', '#666666'),
            titan: createTexture('atmosphere', '#ffcc00', '#cc8800'), 
            enceladus: createTexture('terrestrial', '#ffffff', '#eeeeff'), 
            ice: createTexture('ice', '#aaddff', '#ffffff'), 
            alphaA: createTexture('star', '#fff8e7', '#ffddaa'),
            alphaB: createTexture('star', '#ffcc99', '#ffaa66'),
            proxima: createTexture('star', '#ff5544', '#cc2211'),
            siriusA: createTexture('star', '#aaddff', '#ffffff'),
            siriusB: createTexture('star', '#ffffff', '#aaaaaa'),
            trappist: createTexture('star', '#ff4422', '#550000'),
            cygniA: createTexture('star', '#ffffee', '#ffeeaa'), 
            cygniB: createTexture('star', '#ffeecc', '#ffcc88'), 
            cygniBb: createTexture('gas', '#ddbb99', '#aa8866'), 
            cygniC: createTexture('star', '#ff7755', '#aa2211'),
        };

        // ==========================================
        // 4. 构建宇宙组件
        // ==========================================

        function createGlow(color, size) {
            const canvas = document.createElement('canvas');
            canvas.width = 64; canvas.height = 64;
            const context = canvas.getContext('2d');
            const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
            gradient.addColorStop(0, color);
            gradient.addColorStop(0.2, color);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            context.fillStyle = gradient;
            context.fillRect(0, 0, 64, 64);
            
            const spriteMaterial = new THREE.SpriteMaterial({ 
                map: new THREE.CanvasTexture(canvas), 
                transparent: true,
                blending: THREE.AdditiveBlending
            });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.scale.set(size * 2.8, size * 2.8, 1);
            return sprite;
        }

        function createCircularPointTexture() {
            const size = 64;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
            gradient.addColorStop(0.0, 'rgba(255, 255, 255, 1)');
            gradient.addColorStop(0.4, 'rgba(200, 230, 255, 0.6)');
            gradient.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, size, size);
            return new THREE.CanvasTexture(canvas);
        }

        const oortParticleTexture = createCircularPointTexture();

        function createOrbit(radius, centerPos, xScale = 1, zScale = 1, rotationZ = 0, opacity = 0.15) {
            const points = [];
            for (let i = 0; i <= 128; i++) {
                const angle = (i / 128) * Math.PI * 2;
                points.push(new THREE.Vector3(Math.cos(angle) * radius * xScale, 0, Math.sin(angle) * radius * zScale));
            }
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: opacity });
            const line = new THREE.Line(geometry, material);
            line.position.copy(centerPos);
            line.rotation.z = rotationZ;
            scene.add(line);
            return line;
        }

        function createBarycenter(pos, name) {
            const material = new THREE.LineBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 });
            const geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-3, 0, 0), new THREE.Vector3(3, 0, 0),
                new THREE.Vector3(0, -3, 0), new THREE.Vector3(0, 3, 0),
                new THREE.Vector3(0, 0, -3), new THREE.Vector3(0, 0, 3)
            ]);
            const cross = new THREE.LineSegments(geometry, material);
            cross.position.copy(pos);
            scene.add(cross);

            const div = document.createElement('div');
            div.className = 'barycenter-label';
            div.textContent = name + " 质心";
            document.getElementById('labels-container').appendChild(div);

            labelElements.push({ div: div, mesh: cross, isStatic: true });
        }

        function addOrbitLabel(text, radius, centerPos, angleOffset = 0) {
            const dummyGeo = new THREE.BufferGeometry();
            dummyGeo.setAttribute('position', new THREE.Float32BufferAttribute([0,0,0], 3));
            const dummy = new THREE.Points(dummyGeo, new THREE.PointsMaterial({ size: 0, visible: false }));
            
            const angle = angleOffset;
            dummy.position.set(
                centerPos.x + Math.cos(angle) * radius,
                centerPos.y,
                centerPos.z + Math.sin(angle) * radius
            );
            scene.add(dummy);

            const div = document.createElement('div');
            div.className = 'orbit-label';
            div.textContent = text;
            document.getElementById('labels-container').appendChild(div);

            labelElements.push({ div: div, mesh: dummy, isStatic: true });
        }

        function addSystemLabel(name, distanceStr, centerPos) {
            const dummyGeo = new THREE.BufferGeometry();
            dummyGeo.setAttribute('position', new THREE.Float32BufferAttribute([0,0,0], 3));
            const dummy = new THREE.Points(dummyGeo, new THREE.PointsMaterial({ size: 0, visible: false }));
            dummy.position.copy(centerPos);
            scene.add(dummy);

            const div = document.createElement('div');
            div.className = 'system-label';
            if (distanceStr) {
                div.innerHTML = `${name}<span class="system-sub">距太阳: ${distanceStr}</span>`;
            } else {
                div.innerHTML = `${name}`;
                div.style.padding = '6px 10px'; 
            }
            div.onclick = () => showInfo(name);
            
            document.getElementById('labels-container').appendChild(div);

            labelElements.push({ div: div, mesh: dummy, isSystemLabel: true });
        }

        function createSolidBelt(innerRadius, outerRadius, centerPos, count, color, verticalSpread = 10, labelName = "", customSpeed = 0, emissiveIntensity = 0) {
            createOrbit(innerRadius, centerPos, 1, 1, 0, 0.05); 
            createOrbit(outerRadius, centerPos, 1, 1, 0, 0.05);

            const geometry = new THREE.IcosahedronGeometry(0.3, 0); 
            const materialConfig = { 
                color: color, 
                roughness: 0.8, 
                metalness: 0.1 
            };
            if (emissiveIntensity > 0) {
                materialConfig.emissive = new THREE.Color(color);
                materialConfig.emissiveIntensity = emissiveIntensity;
            }
            const material = new THREE.MeshStandardMaterial(materialConfig);

            const mesh = new THREE.InstancedMesh(geometry, material, count);
            const dummy = new THREE.Object3D();

            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const r = innerRadius + Math.random() * (outerRadius - innerRadius);
                
                dummy.position.set(
                    Math.cos(angle) * r,
                    (Math.random() - 0.5) * verticalSpread,
                    Math.sin(angle) * r
                );
                dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
                const scale = 0.5 + Math.random();
                dummy.scale.set(scale, scale, scale);

                dummy.updateMatrix();
                mesh.setMatrixAt(i, dummy.matrix);
            }

            mesh.position.copy(centerPos);
            scene.add(mesh);

            if (labelName) {
                const avgRadius = (innerRadius + outerRadius) / 2;
                const labelAngle = -Math.PI / 4; 
                
                const labelDummy = new THREE.Object3D();
                labelDummy.position.set(
                    centerPos.x + Math.cos(labelAngle) * avgRadius,
                    centerPos.y,
                    centerPos.z + Math.sin(labelAngle) * avgRadius
                );
                scene.add(labelDummy);

                const div = document.createElement('div');
                div.className = 'planet-label';
                div.textContent = labelName;
                div.style.color = "#aaaaff";
                div.style.fontSize = "11px";
                div.onclick = () => showInfo(labelName);
                
                document.getElementById('labels-container').appendChild(div);

                labelElements.push({ div: div, mesh: labelDummy, isStatic: true });
            }

            const rotSpeed = customSpeed !== 0 ? customSpeed : 0.015 * (60 / innerRadius);

            const beltObj = {
                mesh: mesh,
                speed: rotSpeed,
                update: function() {
                    if (!isPaused) {
                        this.mesh.rotation.y += this.speed * timeScale;
                    }
                }
            };
            celestialBodies.push(beltObj);
        }
        
        function createOortCloud(radius, count) {
            const geometry = new THREE.BufferGeometry();
            const positions = [];
            const sizes = [];
            for (let i = 0; i < count; i++) {
                const r = radius + (Math.random() - 0.5) * 400; 
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                
                const x = r * Math.sin(phi) * Math.cos(theta);
                const y = r * Math.sin(phi) * Math.sin(theta);
                const z = r * Math.cos(phi);
                positions.push(x, y, z);
                sizes.push(3 + Math.random() * 1);
            }
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1)); 
            
            const material = new THREE.PointsMaterial({ 
                color: 0xaaccff, 
                size: 10.0, 
                map: oortParticleTexture,
                transparent: true, 
                opacity: 0.6, 
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const points = new THREE.Points(geometry, material);
            
             const cloudObj = {
                mesh: points,
                speed: 0.00002,
                update: function() {
                    if (!isPaused) {
                        this.mesh.rotation.y += this.speed * timeScale;
                    }
                }
            };
            celestialBodies.push(cloudObj);
            scene.add(points);

            const labelDiv = document.createElement('div');
            labelDiv.className = 'planet-label';
            labelDiv.textContent = "奥尔特云 (Oort Cloud)";
            labelDiv.style.color = '#88ccff';
            labelDiv.style.fontSize = '14px';
            labelDiv.onclick = () => showInfo("奥尔特云 (Oort Cloud)");
            document.getElementById('labels-container').appendChild(labelDiv);
            
            const labelAnchor = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshBasicMaterial({visible:false}));
            labelAnchor.position.set(0, radius * 0.95, 0); 
            scene.add(labelAnchor);
            
            labelElements.push({ div: labelDiv, mesh: labelAnchor });
        }

        function createComet(name, perihelion, aphelion, speed, parentPos, color) {
             const size = 0.8;
             const geometry = new THREE.SphereGeometry(size, 8, 8);
             const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
             const mesh = new THREE.Mesh(geometry, material);
             scene.add(mesh);
             
             const glow = createGlow(color, size * 3);
             mesh.add(glow);

             const tailLength = 25; 
             const tailGeo = new THREE.ConeGeometry(size * 0.15, tailLength, 32, 1, true); 
             tailGeo.translate(0, tailLength / 2, 0); 
             tailGeo.rotateX(Math.PI / 2);

             const tailMat = new THREE.MeshBasicMaterial({ 
                 color: color, 
                 transparent: true, 
                 opacity: 0.4,
                 side: THREE.DoubleSide, 
                 depthWrite: false,
                 blending: THREE.AdditiveBlending
             });
             const tail = new THREE.Mesh(tailGeo, tailMat);
             scene.add(tail);

             const a = (perihelion + aphelion) / 2;
             const c = a - perihelion;
             const b = Math.sqrt(a*a - c*c);
             const centerX = c; 

             const orbitCurve = new THREE.EllipseCurve(centerX, 0, a, b, 0,  2 * Math.PI, false, 0);
             const orbitPoints = orbitCurve.getPoints(100);
             const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
             const orbitMat = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.1, transparent: true });
             const orbitLine = new THREE.Line(orbitGeo, orbitMat);
             orbitLine.rotation.x = Math.PI / 2;
             
             const orbitGroup = new THREE.Group();
             orbitGroup.add(orbitLine);
             orbitGroup.position.copy(parentPos);
             
             const tiltX = (Math.random() - 0.5) * 1.0; 
             const tiltY = (Math.random() - 0.5) * 2.0; 
             orbitGroup.rotation.set(tiltX, tiltY, 0);
             scene.add(orbitGroup);

             const div = document.createElement('div');
             div.className = 'planet-label';
             div.textContent = name;
             div.style.color = '#aaddff';
             div.onclick = () => showInfo(name);
             document.getElementById('labels-container').appendChild(div);
             labelElements.push({ div: div, mesh: mesh });

             const comet = {
                 name: name,
                 mesh: mesh,
                 tail: tail,
                 a: a, 
                 b: b,
                 centerX: centerX,
                 angle: Math.random() * Math.PI * 2,
                 baseSpeed: speed,
                 parentPos: parentPos,
                 orbitGroup: orbitGroup, 
                 lastPos: new THREE.Vector3(), 
                 update: function() {
                     if (isPaused) return;

                     this.lastPos.copy(this.mesh.position);
                     const r = this.mesh.position.distanceTo(this.parentPos);
                     const currentSpeed = this.baseSpeed * (500 / (r + 10)) * timeScale; 
                     
                     this.angle -= currentSpeed;
                     
                     const localX = this.centerX + this.a * Math.cos(this.angle);
                     const localY = this.b * Math.sin(this.angle);
                     const rawPos = new THREE.Vector3(localX, 0, localY);
                     rawPos.applyEuler(this.orbitGroup.rotation);
                     this.mesh.position.copy(this.parentPos).add(rawPos);
                     
                     this.tail.position.copy(this.mesh.position);
                     
                     const velocity = new THREE.Vector3().subVectors(this.mesh.position, this.lastPos);
                     if (velocity.lengthSq() > 0.000001) {
                         const targetPos = new THREE.Vector3().subVectors(this.mesh.position, velocity);
                         this.tail.lookAt(targetPos);
                     } else {
                        const sunPos = this.parentPos;
                        const targetPos = new THREE.Vector3().subVectors(this.mesh.position, sunPos).add(this.mesh.position);
                        this.tail.lookAt(targetPos);
                     }
                     
                     const dist = this.mesh.position.distanceTo(this.parentPos);
                     const intensity = Math.max(0, 1 - (dist - 30) / 400); 
                     
                     const scale = 1 + intensity * 6; 
                     this.tail.scale.set(1 + intensity, scale, 1 + intensity);
                     this.tail.material.opacity = Math.max(0.1, intensity * 0.8);
                 }
             };
             celestialBodies.push(comet);
             return comet;
        }
        
        function createEccentricPlanet(name, a, e, speed, parentPos, texture, size, color, realAString) {
             const geometry = new THREE.SphereGeometry(size, 32, 32);
             const material = new THREE.MeshStandardMaterial({ 
                 map: texture, 
                 roughness: 0.8,
                 metalness: 0.2
             });
             if(color) material.color = new THREE.Color(color);

             const mesh = new THREE.Mesh(geometry, material);
             scene.add(mesh);
             
             const c = a * e; 
             const b = a * Math.sqrt(1 - e*e); 
             const centerX = c; 

             const orbitCurve = new THREE.EllipseCurve(centerX, 0, a, b, 0, 2 * Math.PI, false, 0);
             const orbitPoints = orbitCurve.getPoints(128);
             const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
             const orbitMat = new THREE.LineBasicMaterial({ color: 0x88ccff, opacity: 0.4, transparent: true });
             const orbitLine = new THREE.Line(orbitGeo, orbitMat);
             orbitLine.rotation.x = Math.PI / 2;
             
             const orbitGroup = new THREE.Group();
             orbitGroup.add(orbitLine);
             orbitGroup.position.copy(parentPos);
             scene.add(orbitGroup);

             const div = document.createElement('div');
             div.className = 'planet-label';
             const aText = realAString ? `a=${realAString}` : `a=${a}`;
             div.innerHTML = `${name}<br><span style="font-size:0.85em;color:#aaddff">${aText}, e=${e}</span>`;
             // 绑定点击事件
             div.onclick = () => showInfo(name);
             document.getElementById('labels-container').appendChild(div);
             labelElements.push({ div: div, mesh: mesh });

             const labelAnchorGeo = new THREE.BufferGeometry();
             labelAnchorGeo.setAttribute('position', new THREE.Float32BufferAttribute([0,0,0], 3));
             const labelAnchor = new THREE.Points(labelAnchorGeo, new THREE.PointsMaterial({ size: 0, visible: false }));
             
             labelAnchor.position.set(a * (1 + e) + 10, 0, 0); 
             orbitGroup.add(labelAnchor); 

             const orbitDiv = document.createElement('div');
             orbitDiv.className = 'orbit-label';
             const orbitLabelText = realAString ? `Orbit: a=${realAString}, e=${e}` : `e=${e}`;
             orbitDiv.textContent = orbitLabelText;
             orbitDiv.style.color = "#88ccff";
             orbitDiv.style.fontSize = "11px";
             document.getElementById('labels-container').appendChild(orbitDiv);

             labelElements.push({ div: orbitDiv, mesh: labelAnchor, isStatic: false }); 

             const planet = {
                 name: name,
                 mesh: mesh,
                 a: a, 
                 b: b,
                 centerX: centerX,
                 angle: Math.random() * Math.PI * 2,
                 baseSpeed: speed,
                 parentPos: parentPos,
                 orbitGroup: orbitGroup,
                 update: function() {
                     // 即使暂停，轨道的相对位置更新也最好保持（防止父级移动时错位）
                     this.orbitGroup.position.copy(this.parentPos);

                     if (isPaused) return;

                     const r = this.mesh.position.distanceTo(this.parentPos);
                     const currentSpeed = this.baseSpeed * (a*2 / (r + 1)) * timeScale; 
                     
                     this.angle -= currentSpeed;
                     
                     const localX = this.centerX + this.a * Math.cos(this.angle);
                     const localY = this.b * Math.sin(this.angle);
                     
                     const rawPos = new THREE.Vector3(localX, 0, localY);
                     this.mesh.position.copy(this.parentPos).add(rawPos);
                     
                     this.mesh.rotation.y += 0.02 * timeScale;
                 }
             };
             celestialBodies.push(planet);
             return planet;
        }

        function createGenericMoon(name, parent, distance, size, speed, texture, isIrregular = false) {
            let geometry;
            if (isIrregular) {
                geometry = new THREE.IcosahedronGeometry(size, 0);
            } else {
                geometry = new THREE.SphereGeometry(size, 32, 32);
            }
            
            const material = new THREE.MeshStandardMaterial({ 
                map: texture, 
                roughness: 0.8
            });
            const mesh = new THREE.Mesh(geometry, material);
            if (isIrregular) {
                mesh.scale.set(1, 0.8, 0.9);
            }
            scene.add(mesh);

            const orbitCurve = new THREE.EllipseCurve(0, 0, distance, distance, 0, 2 * Math.PI);
            const orbitPoints = orbitCurve.getPoints(64);
            const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
            const orbitMat = new THREE.LineBasicMaterial({ color: 0xaaaaaa, opacity: 0.2, transparent: true });
            const orbitLine = new THREE.Line(orbitGeo, orbitMat);
            orbitLine.rotation.x = Math.PI / 2;
            scene.add(orbitLine); 

            const div = document.createElement('div');
            div.className = 'planet-label';
            div.textContent = name;
            div.style.fontSize = '10px'; 
            // 绑定点击事件
            div.onclick = () => showInfo(name);
            document.getElementById('labels-container').appendChild(div);
            
            const labelObj = { div: div, mesh: mesh, orbitLine: orbitLine, moonMesh: mesh, isMoon: true, parentMesh: parent.mesh, visibilityThreshold: 300 };
            
            if (name === '月球') {
                const distLabelDiv = document.createElement('div');
                distLabelDiv.className = 'orbit-label';
                distLabelDiv.textContent = '384,400 km';
                document.getElementById('labels-container').appendChild(distLabelDiv);
                const distDummy = new THREE.Object3D();
                scene.add(distDummy);
                labelElements.push({ div: distLabelDiv, mesh: distDummy, isMoon: true, parentMesh: parent.mesh, visibilityThreshold: 300 });
                labelObj.distDummy = distDummy;
            }

            labelElements.push(labelObj);

            const moon = {
                mesh: mesh,
                orbitLine: orbitLine,
                distDummy: labelObj.distDummy,
                angle: Math.random() * Math.PI * 2,
                distance: distance,
                speed: speed,
                parent: parent,
                update: function() {
                    const parentPos = this.parent.mesh.position;
                    // 即使暂停，轨道跟随也必须更新
                    this.orbitLine.position.copy(parentPos);
                    
                    if (isPaused) {
                        // 暂停时仅更新位置以跟随父级，但不增加角度
                        this.mesh.position.x = parentPos.x + Math.cos(this.angle) * this.distance;
                        this.mesh.position.z = parentPos.z + Math.sin(this.angle) * this.distance;
                        this.mesh.position.y = parentPos.y;
                    } else {
                        this.angle -= this.speed * timeScale;
                        this.mesh.position.x = parentPos.x + Math.cos(this.angle) * this.distance;
                        this.mesh.position.z = parentPos.z + Math.sin(this.angle) * this.distance;
                        this.mesh.position.y = parentPos.y;
                        this.mesh.rotation.y += 0.02 * timeScale;
                    }

                    if (this.distDummy) {
                        this.distDummy.position.set(parentPos.x + this.distance + 3, parentPos.y, parentPos.z);
                    }
                }
            };
            celestialBodies.push(moon);
            return moon;
        }

        function createBody(name, type, size, texture, distance, speed, parentPos, color = 0xffffff, hasRing = false) {
            const geometry = new THREE.SphereGeometry(size, 32, 32);
            let material;
            let pointLight = null;
            let glowSprite = null;

            if (type === 'star') {
                material = new THREE.MeshBasicMaterial({ map: texture }); 
                const lightColor = 0xffffff; 
                pointLight = new THREE.PointLight(lightColor, 1.5, distance * 5 + 500);
                glowSprite = createGlow(new THREE.Color(color).getStyle(), size);
            } else {
                material = new THREE.MeshStandardMaterial({ 
                    map: texture, 
                    roughness: 0.8,
                    metalness: 0.2
                });
                
                if (color !== 0xffffff) {
                    material.color = new THREE.Color(color);
                }
            }

            const mesh = new THREE.Mesh(geometry, material);
            if (pointLight) {
                pointLight.position.set(0, 0, 0);
                mesh.add(pointLight);
            }
            if (glowSprite) {
                glowSprite.position.set(0, 0, 0);
                mesh.add(glowSprite);
            }
            
            if (hasRing) {
                const ringGeo = new THREE.RingGeometry(size * 1.4, size * 2.2, 64);
                const ringTexture = textures.saturnRing;
                const ringMat = new THREE.MeshBasicMaterial({ 
                    map: ringTexture,
                    side: THREE.DoubleSide, 
                    transparent: true, 
                    opacity: 0.9 
                });
                
                const ring = new THREE.Mesh(ringGeo, ringMat);
                ring.rotation.x = Math.PI / 2;
                mesh.add(ring);
            }

            scene.add(mesh);

            const div = document.createElement('div');
            // 行星和恒星有不同的标签类，但都应可点击
            div.className = type === 'star' ? 'planet-label star-label' : 'planet-label';
            div.textContent = name;
            // 绑定点击事件
            div.onclick = () => showInfo(name);
            document.getElementById('labels-container').appendChild(div);
            labelElements.push({ div: div, mesh: mesh });

            const body = {
                name: name,
                mesh: mesh,
                distance: distance,
                speed: speed * 0.5, 
                angle: Math.random() * Math.PI * 2, 
                parentPos: parentPos,
                type: type,
                update: function() {
                    if (isPaused) return;

                    this.angle -= this.speed * timeScale;
                    this.mesh.position.x = this.parentPos.x + Math.cos(this.angle) * this.distance;
                    this.mesh.position.z = this.parentPos.z + Math.sin(this.angle) * this.distance;
                    this.mesh.position.y = this.parentPos.y;
                    this.mesh.rotation.y += 0.01 * timeScale;
                }
            };

            if (distance > 0) {
                createOrbit(distance, parentPos);
            } else {
                mesh.position.copy(parentPos);
            }

            celestialBodies.push(body);
            return body;
        }

        const bodyRegistry = new Map();
        function registerBody(name, body) {
            bodyRegistry.set(name, body);
            return body;
        }

        function getBody(name) {
            return bodyRegistry.get(name);
        }

        const systems = {};
        systemBuilders.forEach((build) => {
            const meta = build({
                THREE,
                textures,
                createBody,
                createGenericMoon,
                createSolidBelt,
                createOortCloud,
                createComet,
                createEccentricPlanet,
                addOrbitLabel,
                addSystemLabel,
                createBarycenter,
                registerBody,
                getBody
            });
            if (meta && meta.id) {
                systems[meta.id] = meta;
            }
        });
        
        function createStarField() {
            const geometry = new THREE.BufferGeometry();
            const vertices = [];
            for (let i = 0; i < 8000; i++) {
                vertices.push(
                    THREE.MathUtils.randFloatSpread(8000),
                    THREE.MathUtils.randFloatSpread(8000),
                    THREE.MathUtils.randFloatSpread(8000)
                );
            }
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            const material = new THREE.PointsMaterial({ color: 0xFFFFFF, size: 1.5, transparent: true, opacity: 0.8 });
            const stars = new THREE.Points(geometry, material);
            scene.add(stars);
        }
        createStarField();

        camera.position.set(0, 250, 620);
        controls.target.set(0, 0, 0);

        const ambientLight = new THREE.AmbientLight(0x333333);
        scene.add(ambientLight);
        
        window.focusSystem = function(sysId) {
            const system = systems[sysId];
            if (!system) return;

            const target = system.center;
            const offset = system.focusOffset || { x: 0, y: 150, z: 250 };

            controls.target.copy(target);
            camera.position.set(target.x + offset.x, target.y + offset.y, target.z + offset.z);
            controls.update();
        };

        window.resetView = function() {
            controls.target.set(0,0,0);
            camera.position.set(0, 3000, 6000); 
            controls.update();
        }

        const speedRange = document.getElementById('speedRange');
        const speedValue = document.getElementById('speedValue');
        speedRange.addEventListener('input', (e) => {
            timeScale = parseFloat(e.target.value);
            speedValue.textContent = timeScale.toFixed(2) + "x";
        });

        document.getElementById('loading').style.opacity = 0;

        function updateSunSurface() {
            if (!sunContext || !sunBaseCanvas) return;
            // 暂停时不更新太阳表面纹理，节省资源并符合暂停逻辑
            if (isPaused) return; 

            sunContext.drawImage(sunBaseCanvas, 0, 0);
            if (Math.random() < 0.08) { 
                const type = Math.random() > 0.8 ? 'flare' : 'spot'; 
                const radius = type === 'spot' ? (Math.random() * 3 + 2) : (Math.random() * 20 + 10);

                sunFeatures.push({
                    x: Math.random() * SUN_textureSize,
                    y: Math.random() * SUN_textureSize,
                    r: radius,
                    life: 0,
                    maxLife: Math.random() * 100 + 50, 
                    type: type
                });
            }

            for (let i = sunFeatures.length - 1; i >= 0; i--) {
                const f = sunFeatures[i];
                f.life++;
                let alpha = 1;
                if (f.life < 20) alpha = f.life / 20; 
                else if (f.life > f.maxLife - 20) alpha = (f.maxLife - f.life) / 20; 

                if (f.life >= f.maxLife) {
                    sunFeatures.splice(i, 1);
                    continue;
                }

                if (f.type === 'spot') {
                    sunContext.fillStyle = `rgba(50, 10, 0, ${alpha * 0.8})`;
                    sunContext.beginPath();
                    sunContext.arc(f.x, f.y, f.r, 0, Math.PI * 2);
                    sunContext.fill();
                    sunContext.fillStyle = `rgba(0, 0, 0, ${alpha})`;
                    sunContext.beginPath();
                    sunContext.arc(f.x, f.y, f.r * 0.5, 0, Math.PI * 2); 
                    sunContext.fill();
                } else {
                    const grd = sunContext.createRadialGradient(f.x, f.y, 1, f.x, f.y, f.r);
                    grd.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
                    grd.addColorStop(0.5, `rgba(255, 255, 200, ${alpha * 0.5})`);
                    grd.addColorStop(1, `rgba(255, 200, 0, 0)`);
                    sunContext.fillStyle = grd;
                    sunContext.beginPath();
                    sunContext.arc(f.x, f.y, f.r, 0, Math.PI * 2);
                    sunContext.fill();
                }
            }
            sunTexture.needsUpdate = true;
        }

        function animate() {
            requestAnimationFrame(animate);
            
            // 只有未暂停时更新物理位置
            if (!isPaused) {
                updateSunSurface();
                celestialBodies.forEach(body => {
                    if(body.update) body.update();
                });
            }
            
            controls.update();
            renderer.render(scene, camera);
            updateLabels();
        }

        function updateLabels() {
            const tempV = new THREE.Vector3();
            labelElements.forEach(item => {
                item.mesh.getWorldPosition(tempV);
                tempV.project(camera);
                const x = (tempV.x * .5 + .5) * window.innerWidth;
                const y = (tempV.y * -.5 + .5) * window.innerHeight;

                if (Math.abs(tempV.z) < 1) {
                    item.div.style.transform = `translate(-50%, -150%)`;
                    item.div.style.left = `${x}px`;
                    item.div.style.top = `${y}px`;
                    
                    if (item.isSystemLabel) {
                        item.div.style.opacity = 1;
                        item.div.style.display = 'block';
                        return;
                    }

                    const dist = camera.position.distanceTo(item.mesh.position);
                    
                    if (item.isMoon && item.parentMesh) {
                        const distToParent = camera.position.distanceTo(item.parentMesh.position);
                        const threshold = item.visibilityThreshold || 300; 
                        
                        if (distToParent < threshold) {
                            item.div.style.display = 'block';
                            item.div.style.opacity = 0.9;
                            if(item.orbitLine) item.orbitLine.visible = true;
                            if(item.moonMesh) item.moonMesh.visible = true;
                        } else {
                            item.div.style.display = 'none';
                            if(item.orbitLine) item.orbitLine.visible = false;
                            if(item.moonMesh) item.moonMesh.visible = false; 
                        }
                        return; 
                    }

                    const fadeStart = item.isStatic ? 800 : 1500;
                    const fadeRange = item.isStatic ? 500 : 1000;

                    if (dist > fadeStart) {
                        item.div.style.opacity = Math.max(0, (item.isStatic ? 0.6 : 1) - (dist - fadeStart) / fadeRange);
                    } else {
                        item.div.style.opacity = item.isStatic ? 0.6 : 0.8;
                    }
                    item.div.style.display = item.div.style.opacity <= 0.05 ? 'none' : 'block';
                } else {
                    item.div.style.display = 'none';
                }
            });
        }

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        animate();
