const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.PORT || 8000);
const ROOT_DIR = path.resolve(__dirname, '..');
const UPLOAD_ROOT = path.join(ROOT_DIR, 'admin_uploads');
const FILES_ROOT = path.join(UPLOAD_ROOT, 'files');
const DATA_FILE = path.join(UPLOAD_ROOT, 'content-data.json');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8',
    '.pdf': 'application/pdf',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'audio/ogg',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav'
};

function createEmptyMedia() {
    return {
        links: [],
        images: [],
        videos: [],
        documents: []
    };
}

function normalizeMedia(media) {
    const safeMedia = media && typeof media === 'object' ? media : {};
    return {
        links: Array.isArray(safeMedia.links) ? safeMedia.links : [],
        images: Array.isArray(safeMedia.images) ? safeMedia.images : [],
        videos: Array.isArray(safeMedia.videos) ? safeMedia.videos : [],
        documents: Array.isArray(safeMedia.documents) ? safeMedia.documents : []
    };
}

function createEmptyStore() {
    return {
        updatedAt: new Date().toISOString(),
        pages: {}
    };
}

function ensureStoreShape(data) {
    const safeData = data && typeof data === 'object' ? data : {};
    const pages = safeData.pages && typeof safeData.pages === 'object' ? safeData.pages : {};
    const normalizedPages = {};

    for (const [pageId, pageValue] of Object.entries(pages)) {
        normalizedPages[pageId] = {
            content: typeof pageValue?.content === 'string' ? pageValue.content : '',
            media: normalizeMedia(pageValue?.media)
        };
    }

    return {
        updatedAt: typeof safeData.updatedAt === 'string' ? safeData.updatedAt : new Date().toISOString(),
        pages: normalizedPages
    };
}

function sanitizePageId(pageId) {
    const safeId = String(pageId || '').trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
    if (!safeId) return null;
    return safeId;
}

function sanitizeBaseName(name) {
    return String(name || '')
        .trim()
        .replace(/[^a-zA-Z0-9\-_\.()\u4e00-\u9fa5]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^\.+/, '')
        .slice(0, 80) || 'file';
}

function inferDocType(fileName, fallback = 'pdf') {
    const ext = path.extname(fileName || '').toLowerCase().replace('.', '');
    if (!ext) return fallback;
    if (['doc', 'docx'].includes(ext)) return 'doc';
    if (['ppt', 'pptx'].includes(ext)) return 'ppt';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'xls';
    if (ext === 'md') return 'md';
    if (ext === 'txt') return 'txt';
    if (ext === 'pdf') return 'pdf';
    return ext;
}

function getCategoryInfo(category) {
    if (category === 'image') return { folder: 'images', kind: 'images' };
    if (category === 'video') return { folder: 'videos', kind: 'videos' };
    if (category === 'document') return { folder: 'documents', kind: 'documents' };
    return null;
}

function getExtensionFromMime(mimeType) {
    const mime = (mimeType || '').toLowerCase();
    const map = {
        'image/png': '.png',
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'video/mp4': '.mp4',
        'video/webm': '.webm',
        'video/ogg': '.ogv',
        'application/pdf': '.pdf',
        'text/plain': '.txt',
        'text/markdown': '.md',
        'application/msword': '.doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
        'application/vnd.ms-powerpoint': '.ppt',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
        'application/vnd.ms-excel': '.xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx'
    };
    return map[mime] || '';
}

function parseDataUrl(dataUrl) {
    const match = String(dataUrl || '').match(/^data:([^;,]+)?;base64,(.+)$/);
    if (!match) return null;

    const mimeType = match[1] || 'application/octet-stream';
    const base64Content = match[2];
    const buffer = Buffer.from(base64Content, 'base64');

    return { mimeType, buffer };
}

function sendJson(res, statusCode, payload) {
    const body = JSON.stringify(payload, null, 2);
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(body);
}

function sendText(res, statusCode, message) {
    res.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(message);
}

function readJsonBody(req, maxBytes = 300 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let total = 0;

        req.on('data', (chunk) => {
            total += chunk.length;
            if (total > maxBytes) {
                reject(new Error('Request body too large.'));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });

        req.on('end', () => {
            try {
                const raw = Buffer.concat(chunks).toString('utf8');
                resolve(raw ? JSON.parse(raw) : {});
            } catch (e) {
                reject(new Error('Invalid JSON body.'));
            }
        });

        req.on('error', (e) => reject(e));
    });
}

async function ensureStorageReady() {
    await fs.promises.mkdir(FILES_ROOT, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) {
        await fs.promises.writeFile(DATA_FILE, JSON.stringify(createEmptyStore(), null, 2), 'utf8');
    }
}

async function readStore() {
    try {
        const raw = await fs.promises.readFile(DATA_FILE, 'utf8');
        return ensureStoreShape(JSON.parse(raw));
    } catch (_) {
        const fallback = createEmptyStore();
        await writeStore(fallback);
        return fallback;
    }
}

async function writeStore(data) {
    const safeData = ensureStoreShape(data);
    safeData.updatedAt = new Date().toISOString();
    await fs.promises.writeFile(DATA_FILE, JSON.stringify(safeData, null, 2), 'utf8');
}

function getOrCreatePage(store, pageId) {
    if (!store.pages[pageId]) {
        store.pages[pageId] = { content: '', media: createEmptyMedia() };
    }

    if (typeof store.pages[pageId].content !== 'string') {
        store.pages[pageId].content = '';
    }

    store.pages[pageId].media = normalizeMedia(store.pages[pageId].media);
    return store.pages[pageId];
}

async function handleApiRequest(req, res, pathname) {
    if (req.method === 'GET' && pathname === '/api/health') {
        sendJson(res, 200, {
            ok: true,
            storage: 'admin_uploads',
            dataFile: 'admin_uploads/content-data.json'
        });
        return true;
    }

    const pageRoute = pathname.match(/^\/api\/page\/([^/]+)$/);
    if (pageRoute && req.method === 'GET') {
        const pageId = sanitizePageId(decodeURIComponent(pageRoute[1]));
        if (!pageId) {
            sendJson(res, 400, { error: 'Invalid pageId.' });
            return true;
        }

        const store = await readStore();
        const pageExists = Boolean(store.pages[pageId]);
        const page = pageExists
            ? getOrCreatePage(store, pageId)
            : { content: '', media: createEmptyMedia() };
        sendJson(res, 200, {
            pageId,
            exists: pageExists,
            content: page.content,
            media: page.media
        });
        return true;
    }

    const contentRoute = pathname.match(/^\/api\/page\/([^/]+)\/content$/);
    if (contentRoute && req.method === 'PUT') {
        const pageId = sanitizePageId(decodeURIComponent(contentRoute[1]));
        if (!pageId) {
            sendJson(res, 400, { error: 'Invalid pageId.' });
            return true;
        }

        const body = await readJsonBody(req);
        const content = typeof body.content === 'string' ? body.content : '';

        const store = await readStore();
        const page = getOrCreatePage(store, pageId);
        page.content = content;
        await writeStore(store);

        sendJson(res, 200, { ok: true });
        return true;
    }

    const mediaRoute = pathname.match(/^\/api\/page\/([^/]+)\/media$/);
    if (mediaRoute && req.method === 'PUT') {
        const pageId = sanitizePageId(decodeURIComponent(mediaRoute[1]));
        if (!pageId) {
            sendJson(res, 400, { error: 'Invalid pageId.' });
            return true;
        }

        const body = await readJsonBody(req);
        const media = normalizeMedia(body.media);

        const store = await readStore();
        const page = getOrCreatePage(store, pageId);
        page.media = media;
        await writeStore(store);

        sendJson(res, 200, { ok: true });
        return true;
    }

    if (req.method === 'POST' && pathname === '/api/upload') {
        const body = await readJsonBody(req);
        const pageId = sanitizePageId(body.pageId);
        const categoryInfo = getCategoryInfo(body.category);
        const uploaded = parseDataUrl(body.dataUrl);

        if (!pageId || !categoryInfo || !uploaded) {
            sendJson(res, 400, { error: 'Invalid upload payload.' });
            return true;
        }

        const safeOriginalName = sanitizeBaseName(body.originalName || body.displayName || 'file');
        const extFromOriginal = path.extname(safeOriginalName).toLowerCase();
        const extFromMime = getExtensionFromMime(uploaded.mimeType);
        const extension = extFromOriginal || extFromMime || '.bin';
        const baseName = sanitizeBaseName(path.basename(safeOriginalName, extFromOriginal || path.extname(safeOriginalName)));
        const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${baseName}${extension}`;

        const pageFolder = path.join(FILES_ROOT, pageId, categoryInfo.folder);
        await fs.promises.mkdir(pageFolder, { recursive: true });

        const targetPath = path.join(pageFolder, uniqueName);
        await fs.promises.writeFile(targetPath, uploaded.buffer);

        const relativeUrl = `/${path.relative(ROOT_DIR, targetPath).split(path.sep).join('/')}`;
        const docType = categoryInfo.kind === 'documents'
            ? inferDocType(uniqueName, body.docType || 'pdf')
            : '';

        sendJson(res, 200, {
            ok: true,
            url: relativeUrl,
            type: docType || undefined
        });
        return true;
    }

    return false;
}

async function serveStaticFile(req, res, pathname) {
    let requestPath;
    try {
        requestPath = decodeURIComponent(pathname || '/');
    } catch (_) {
        sendText(res, 400, 'Bad request path.');
        return;
    }

    if (requestPath === '/') {
        requestPath = '/index.html';
    }

    const absolutePath = path.normalize(path.join(ROOT_DIR, requestPath));
    if (!absolutePath.startsWith(ROOT_DIR)) {
        sendText(res, 403, 'Forbidden.');
        return;
    }

    let finalPath = absolutePath;
    try {
        const stats = await fs.promises.stat(finalPath);
        if (stats.isDirectory()) {
            finalPath = path.join(finalPath, 'index.html');
        }
    } catch (_) {
        sendText(res, 404, 'Not found.');
        return;
    }

    if (!fs.existsSync(finalPath)) {
        sendText(res, 404, 'Not found.');
        return;
    }

    const ext = path.extname(finalPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(finalPath).pipe(res);
}

async function start() {
    await ensureStorageReady();

    const server = http.createServer(async (req, res) => {
        const requestUrl = new URL(req.url, `http://${req.headers.host || `localhost:${PORT}`}`);
        const pathname = requestUrl.pathname;

        try {
            if (pathname.startsWith('/api/')) {
                const handled = await handleApiRequest(req, res, pathname);
                if (!handled) {
                    sendJson(res, 404, { error: 'API route not found.' });
                }
                return;
            }

            await serveStaticFile(req, res, pathname);
        } catch (e) {
            console.error('[server error]', e);
            sendJson(res, 500, { error: 'Internal server error.' });
        }
    });

    server.listen(PORT, () => {
        console.log(`Relativity local server running at http://localhost:${PORT}`);
        console.log('Admin uploads are stored in ./admin_uploads/');
    });
}

start().catch((e) => {
    console.error('Failed to start local server:', e);
    process.exit(1);
});
