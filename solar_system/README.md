# 星际迷航 3D 星系展示项目 🚀

一个基于 Three.js 的交互式 3D 天文教学网站，展示太阳系及邻近恒星系统（半人马座α、比邻星、天狼星、TRAPPIST-1、天鹅座61），支持管理员模式下的内容编辑与资源管理。

---

## ✨ 功能特点

### 🎓 教学内容

| 恒星系统 | 包含天体 |
|---------|----------|
| ☀️ 太阳系（内侧） | 太阳、水星、金星、地球（月球）、火星（火卫一/二）、小行星带、谷神星、灶神星 |
| ☀️ 太阳系（外侧） | 木星（木卫一/二/三/四）、土星（土卫六/二）、天王星、海王星、冥王星、柯伊伯带、奥尔特云、哈雷彗星、海尔-波普彗星 |
| ⭐ 半人马座α | α星 A、α星 B |
| ⭐ 比邻星 | 比邻星、比邻星 b/c/d |
| ⭐ 天狼星 | 天狼星 A、天狼星 B |
| ⭐ TRAPPIST-1 | TRAPPIST-1 及 7 颗行星（b–h） |
| ⭐ 天鹅座 61 | 61 Cyg A/B 及行星 |

### 🎮 交互功能
- 🖱️ **3D 轨道控制**：鼠标拖拽旋转、滚轮缩放、右键平移
- 🏷️ **天体标签**：点击天体名称查看详细介绍
- 🔄 **轨道动画**：实时模拟天体公转运动
- 💫 **恒星光效**：恒星附带点光源与辉光精灵

### ✏️ 管理员编辑
- 🔐 管理员模式：编辑每个天体的描述、链接和媒体资源
- 📁 拖拽上传：支持图片、视频、音频、文档，自动分目录保存
- 💾 数据持久化至各天体的 JSON 数据文件

### 🎨 设计特色
- 🌑 全屏沉浸式深空 3D 场景
- ⭐ 动态星空背景
- 🪐 真实比例轨道与天体可视化
- 📱 响应式 UI 布局

---

## 🚀 快速开始

### 运行方式
```bash
# 使用 Python HTTP 服务器
python -m http.server 8000

# 访问 http://localhost:8000/system.html
```

> ⚠️ 需通过 HTTP 服务器访问，避免浏览器对本地文件的 `fetch`/ESM 限制。

### 管理员模式
1. 点击页面上的管理员入口
2. 首次使用需授权 File System Access API 以写入本地文件
3. 编辑描述、上传附件、添加链接后点击保存

> 如浏览器不支持 File System Access API，将自动导出 JSON 文件供手动替换。

## 目录结构

```
星际迷航/
├── assets/
│   ├── audio/
│   ├── documents/
│   ├── images/
│   └── videos/
├── data/
│   ├── celestial-index.json
│   └── systems/
│       ├── solar/
│       │   ├── system.json
│       │   ├── inner/
│       │   └── outer/
│       ├── alpha-centauri/
│       ├── proxima-centauri/
│       ├── sirius/
│       ├── trappist-1/
│       └── cygni/
├── scripts/
│   ├── app.js
│   └── systems/
│       ├── index.js
│       ├── solar/
│       │   ├── index.js
│       │   ├── inner/
│       │   └── outer/
│       ├── alpha-centauri/
│       ├── proxima-centauri/
│       ├── sirius/
│       ├── trappist-1/
│       └── cygni/
├── styles/
│   └── main.css
├── system.html
└── README.md
```

- `assets/`：管理员上传的媒体文件归档目录，按照类型自动分类至 `images/`、`videos/`、`audio/` 与 `documents/`。
- `data/celestial-index.json`：天体名称 → 数据文件路径（JSON）的索引清单。
- `data/systems/**`：各恒星系/天体的初始数据文件（每个天体一个 JSON）。太阳系数据进一步拆分为 `inner/`（小行星带及以内）与 `outer/`（小行星带以外）。
- `scripts/app.js`：Three.js 场景初始化、通用天体构造函数、标签管理、管理员逻辑与数据读写等核心脚本（ESM 模块入口）。
- `scripts/systems/**`：各恒星系的模拟脚本目录（每个天体一个 JS）。太阳系模拟进一步拆分为 `inner/` 与 `outer/`。
- `styles/main.css`：页面 UI、弹窗、标签等样式定义，`system.html` 仅保留结构。
- `system.html`：项目入口文件，挂载 Three.js CDN、加载外部脚本与样式，提供 UI 框架与管理员入口。

## 核心模块说明

### Three.js 场景 (`scripts/app.js`)
- **初始化与渲染**：创建场景、相机、渲染器及轨道控制器，设置星空背景与动画循环。
- **天体构建**：封装 `createBody`、`createEccentricPlanet`、`createSolidBelt` 等通用函数；具体恒星系与天体的创建逻辑拆分在 `scripts/systems/**` 中。
- **标签与光照**：为每个天体或系统写入 DOM 标签，并在渲染循环中同步屏幕位置；恒星附带点光源和辉光精灵。
- **管理员模式**：支持登录切换、拖拽上传媒体、编辑描述与链接，并将更改写入对应天体的数据 JSON（或在不支持 File System Access API 时导出下载）。
- **文件系统访问**：使用 File System Access API 请求项目目录句柄，确保资产与数据写入本地文件夹；若缺少权限，回退到下载导出。

### 样式 (`styles/main.css`)
- 定义页面布局、侧栏、按钮、滑条等 UI 元素样式。
- 控制信息弹窗、登录弹窗与管理员编辑区的视觉风格。
- 为标签、质心、轨道提示等叠加元素提供外观与交互效果。

### 数据文件（`data/celestial-index.json` + `data/systems/**`）
- `data/celestial-index.json` 维护“天体名称 → 数据文件路径”的映射。
- `data/systems/**/<body>.json` 存放该天体的 `desc / media / links`。
- 页面加载时按索引逐个读取 JSON；管理员保存时写回对应的单个 JSON 文件。

## 新增/修改天体与恒星系（维护建议）

1. **新增天体模拟**：在 `scripts/systems/<system>/...` 下新增该天体的 JS 文件，并在对应的 `index.js` 中引入并调用。
2. **新增天体数据**：在 `data/systems/<system>/...` 下新增该天体的 JSON 文件，并在 `data/celestial-index.json` 中加入“天体名称 → 路径”的映射。
3. **太阳系分区**：小行星带及以内放入 `solar/inner/`，小行星带以外放入 `solar/outer/`（脚本与数据均遵循此规则）。

## 运行与编辑说明

1. 建议通过本地 HTTP 服务器（如 `python -m http.server`）访问 `system.html`，避免浏览器 `fetch`/ESM 对本地文件的限制。
2. 首次进入管理员模式时需授权访问项目目录，以便写入 `assets/` 与 `data/`。
3. 拖入的媒体文件将自动分类存储；保存时会写入当前天体对应的 `data/systems/**` JSON 文件。
4. 如浏览器不支持 File System Access API，将自动导出该天体的 JSON 文件，需手动替换 `data/systems/**` 内对应文件。

## 依赖

- [Three.js r128](https://threejs.org/)（通过 CDN 加载）
- 浏览器需支持 ES6、File System Access API（用于完整管理员体验）

## 🎯 教学目标

本网站面向天文爱好者和中小学学生，旨在通过 3D 可视化帮助理解：

- 太阳系天体的空间分布与轨道运动
- 恒星系统的多样性（双星、行星系统、矮星）
- 天体物理的基本概念（轨道、质量、引力）

---

## 📄 许可证

MIT License

---

<p align="center">
  <i>在浩瀚星海中探索宇宙的壮丽 ✨</i>
</p>
