# AI for Education · 交互式物理教学平台 🌌

一个汇集四大物理主题的交互式教学网站，通过精美的 Canvas / Three.js 可视化动画，让物理概念变得直观有趣。

---

## 📚 四大教学模块

| 模块 | 目录 | 说明 | 技术 |
|------|------|------|------|
| ⚛️ **[量子探索之旅](quantum_new/)** | `quantum_new/` | 17 个交互页面：从黑体辐射到量子计算 | Canvas + Marked.js + KaTeX |
| ✦ **[相对论探索之旅](relativity/)** | `relativity/` | 10 个交互页面：狭义相对论 + 广义相对论 | Canvas + Marked.js + KaTeX |
| 🪐 **[3D 星际模拟](solar_system/)** | `solar_system/` | 太阳系及 5 个邻近恒星系统的 3D 展示 | Three.js (ESM) |
| 🌌 **[COSMOS 宇宙演化史](universe_evolution/)** | `universe_evolution/` | 从大爆炸到现代宇宙的时间轴可视化 | Three.js + WebGL Shaders |

> 每个模块均有独立的 `README.md`，详细描述教学内容、项目结构和使用方法。

---

## ✨ 核心特性

- 🎮 **交互式可视化**：每个物理概念都配有可调参数的 Canvas / 3D 动画演示
- ✏️ **内容可编辑**：管理员可使用 Markdown + LaTeX 编辑所有教学文档
- 📁 **资源管理**：支持上传图片、视频、文档等多媒体教学资源
- 💾 **数据持久化**：编辑内容保存至 `admin_uploads/` 目录，支持跨设备迁移
- 🌙 **现代设计**：深色宇宙主题、流畅动画、响应式布局

---

## 🚀 快速开始

### 推荐方式：本地服务器

```bash
# 进入项目目录
cd AI4Education

# 量子力学 / 相对论（含内置 Node.js 服务器）
cd quantum_new  # 或 cd relativity
node scripts/local-server.js
# 访问 http://localhost:8000

# 太阳系 / 宇宙演化（使用 Python HTTP 服务器）
cd solar_system  # 或 cd universe_evolution
python -m http.server 8000
# 访问 http://localhost:8000
```

### 快速浏览
也可直接打开根目录的 `index.html` 作为总入口，导航至各子模块。

### 管理员登录
- 点击各模块页面右上角的 ⚙️ 图标
- 输入密码：`zjuphy`

---

## 📁 项目结构

```
AI4Education/
├── index.html              # 🏠 总入口（四大模块导航页）
├── README.md               # 📖 项目总说明（本文件）
│
├── quantum_new/            # ⚛️ 量子力学教学模块
│   ├── index.html          #     模块主页
│   ├── pages/              #     17 个教学页面
│   ├── js/simulations/     #     交互模拟脚本
│   └── README.md
│
├── relativity/             # ✦ 相对论教学模块
│   ├── index.html          #     模块主页
│   ├── pages/              #     10 个教学页面
│   ├── js/simulations/     #     交互模拟脚本
│   └── README.md
│
├── solar_system/           # 🪐 3D 星系模拟模块
│   ├── system.html         #     模块入口
│   ├── scripts/systems/    #     各星系模拟脚本
│   ├── data/systems/       #     天体数据 JSON
│   └── README.md
│
└── universe_evolution/     # 🌌 宇宙演化可视化模块
    ├── index.html          #     模块入口
    ├── js/stages/          #     各演化阶段可视化
    └── README.md
```

---

## 🛠️ 技术栈

| 技术 | 用途 |
|------|------|
| HTML5 / CSS3 / JavaScript (ES6+) | 核心前端技术 |
| Canvas API | 2D 物理模拟（量子力学、相对论） |
| [Three.js](https://threejs.org/) | 3D 场景渲染（太阳系、宇宙演化） |
| WebGL / GLSL | 自定义着色器特效 |
| [Marked.js](https://marked.js.org/) | Markdown 渲染 |
| [KaTeX](https://katex.org/) | LaTeX 数学公式渲染 |
| Node.js | 内置本地服务器（内容持久化、文件上传） |

---

## 📄 许可证

MIT License

---

<p align="center">
  <i>让每一个物理概念都变得生动有趣 ✨</i>
</p>
