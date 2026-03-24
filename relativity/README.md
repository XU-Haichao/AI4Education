# 相对论探索之旅 🌌

一个交互式的相对论教学网站，通过 Canvas 动画模拟从光速不变到引力波的 10 个核心概念，前端页面 + 本地 Node.js 服务器协同运行，支持管理员内容持久化。

> 📚 **项目文档**：查看 [TASK.md](docs/TASK.md) 了解开发任务清单，查看 [IMPLEMENTATION.md](docs/IMPLEMENTATION.md) 了解详细实现计划。

---

## ✨ 功能特点

### 🎓 教学内容
**狭义相对论（5个交互式页面）**
| 主题 | 说明 | 交互演示 |
|------|------|----------|
| 💡 光速不变原理 | 相对论的基本假设 | 火车+光线参考系实验 |
| ⏱️ 时间膨胀 | 运动时钟变慢 | 地球/飞船双时钟对比 |
| 📏 长度收缩 | 运动物体变短 | 飞船收缩可视化 |
| ⚡ 质能方程 | E=mc² | 能量粒子爆发动画 |
| 👥 双生子佯谬 | 时间膨胀的惊人结果 | 星际旅行模拟 |

**广义相对论（5个交互式页面）**
| 主题 | 说明 | 交互演示 |
|------|------|----------|
| ⚖️ 等效原理 | 引力与加速度等价 | 电梯思想实验 |
| 🌀 时空弯曲 | 质量弯曲时空 | 弯曲网格+粒子轨道 |
| 🔭 引力透镜 | 光线被弯曲 | 爱因斯坦环效果 |
| 🕳️ 黑洞 | 时空的极致弯曲 | 吸积盘+物质落入 |
| 🌊 引力波 | 时空的涟漪 | 双星合并波纹 |

### 🎮 交互式演示
每个概念都配有 Canvas 动画演示：
- 🎛️ 可调节参数（速度、质量、距离等）
- 📊 实时计算物理量（洛伦兹因子、能量等）
- 👁️ 直观的可视化效果

### ✏️ 可编辑内容
- 🔐 管理员可编辑所有页面内容
- 📝 支持 Markdown 格式
- 🔢 支持 LaTeX 数学公式
- 📁 管理员上传的图片/视频/文档保存到项目目录 `admin_uploads/`
- 💾 页面文本与资源元数据保存到 `admin_uploads/content-data.json`

### 🎨 现代设计
- 🌙 深色宇宙主题
- ⭐ 动态星空背景（含流星效果）
- 💫 流畅的悬停动画
- 📱 响应式布局（支持移动端）

---

## 🚀 快速开始

### 方法一：本地服务器（推荐，支持管理员上传与跨电脑迁移）
```bash
# 启动项目内置本地服务器
node scripts/local-server.js

# 然后访问 http://localhost:8000
```

### 方法二：静态浏览（仅查看，不支持管理员本地文件上传）
双击 `index.html` 或使用 `python -m http.server 8000` 也可浏览页面，但管理员上传本地文件无法落盘保存。

### 管理员登录
1. 点击右上角的 ⚙️ 图标
2. 输入密码：`zjuphy`
3. 登录后可编辑所有页面内容

### 编辑内容
1. 以管理员身份登录
2. 进入任意教学页面
3. 点击"✏️ 编辑"按钮
4. 使用 Markdown 编辑内容
5. 支持 LaTeX 公式：`$E=mc^2$` 或 `$$E=mc^2$$`
6. 点击"保存"，内容会写入 `admin_uploads/content-data.json`

### 迁移到另一台电脑
1. 复制整个项目目录（务必包含 `admin_uploads/`）
2. 在新电脑运行：`node scripts/local-server.js`
3. 用本地服务器地址打开页面，管理员编辑内容和已上传文件会正常显示

---

## 📁 项目结构

```
relativity/
├── index.html                 # 🏠 主页入口
├── README.md                  # 📖 项目说明（本文件）
│
├── admin_uploads/             # 📁 管理员上传文件与持久化数据
│   ├── files/                 # 图片/视频/文档实际文件
│   └── content-data.json      # 各页面文本与资源元数据
│
├── docs/                      # 📚 项目文档
│   ├── TASK.md               # ✅ 开发任务清单
│   └── IMPLEMENTATION.md     # 📋 详细实现计划
│
├── css/                       # 🎨 样式文件
│   ├── main.css              # 设计系统（变量、组件）
│   ├── animations.css        # 关键帧动画库
│   ├── home.css              # 主页专用样式
│   └── page.css              # 内容页通用样式
│
├── js/                        # ⚙️ JavaScript
│   ├── app.js                # 主应用逻辑
│   ├── storage.js            # 本地存储封装
│   ├── stars.js              # 星空背景动画
│   └── simulations/          # 🎮 交互演示（10个）
│       ├── speed-of-light.js
│       ├── time-dilation.js
│       ├── length-contraction.js
│       ├── mass-energy.js
│       ├── twin-paradox.js
│       ├── equivalence.js
│       ├── spacetime-curvature.js
│       ├── gravitational-lensing.js
│       ├── black-holes.js
│       └── gravitational-waves.js
│
├── scripts/
│   └── local-server.js        # 本地服务器（静态资源 + 上传 + 数据API）
│
└── pages/                     # 📄 教学页面
    ├── special-relativity/   # 狭义相对论（5页）
    │   ├── speed-of-light.html
    │   ├── time-dilation.html
    │   ├── length-contraction.html
    │   ├── mass-energy.html
    │   └── twin-paradox.html
    └── general-relativity/   # 广义相对论（5页）
        ├── equivalence.html
        ├── spacetime-curvature.html
        ├── gravitational-lensing.html
        ├── black-holes.html
        └── gravitational-waves.html
```

---

## 🛠️ 技术栈

| 技术 | 用途 |
|------|------|
| HTML5 | 页面结构、语义化标签 |
| CSS3 | 样式、动画、响应式布局 |
| JavaScript (ES6+) | 交互逻辑、Canvas 动画 |
| Canvas API | 物理模拟和可视化 |
| [Marked.js](https://marked.js.org/) | Markdown 渲染 |
| [KaTeX](https://katex.org/) | LaTeX 数学公式渲染 |
| LocalStorage | 本地缓存/离线兜底 |
| Node.js HTTP Server | 管理员内容持久化、文件上传与静态服务 |

---

## 🎯 教学目标

本网站面向物理爱好者和本科低年级学生，旨在通过交互式可视化帮助理解：

- 狭义相对论中的时空效应（时间膨胀、长度收缩、质能等价）
- 广义相对论中的时空弯曲现象（引力透镜、黑洞、引力波）
- 相对论思想实验的直观含义（光速不变、等效原理、双生子佯谬）

---

## 🔮 后续优化建议

- [ ] 添加 PWA 支持（Service Worker）实现完全离线使用
- [ ] 添加英文版本
- [ ] 添加更多演示（闵可夫斯基时空图、相对论多普勒效应）
- [ ] 添加语音解说
- [ ] 添加互动测验功能

---

## 📄 许可证

MIT License

---

<p align="center">
  <i>探索宇宙的奥秘，理解时空的本质 ✨</i>
</p>
