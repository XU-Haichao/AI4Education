# 相对论交互式教学网站 - 实现计划

## 项目目标

创建一个交互式的相对论教学网站，让学习者通过可视化的方式理解狭义相对论和广义相对论的核心概念。

---

## 技术方案

### 技术栈选择
| 技术 | 用途 |
|------|------|
| HTML5 | 页面结构和语义化标签 |
| CSS3 | 样式、动画、响应式布局 |
| JavaScript (ES6+) | 交互逻辑、Canvas 动画 |
| Canvas API | 物理模拟和可视化 |
| Marked.js (CDN) | Markdown 渲染 |
| KaTeX (CDN) | LaTeX 数学公式渲染 |
| LocalStorage | 内容持久化存储 |

### 设计理念
- **深色宇宙主题**：呼应天体物理学背景
- **渐变色点缀**：紫色 (#6366f1) 和青色 (#22d3ee) 为主
- **玻璃态效果**：现代卡片设计
- **动态星空**：沉浸式背景体验

---

## 项目结构

```
relativity/
├── index.html                 # 主页入口
├── README.md                  # 项目说明
├── docs/
│   ├── TASK.md               # 任务清单
│   └── IMPLEMENTATION.md     # 实现计划（本文档）
├── css/
│   ├── main.css              # 设计系统（变量、基础样式、组件）
│   ├── animations.css        # 关键帧动画库
│   ├── home.css              # 主页专用样式
│   └── page.css              # 内容页通用样式
├── js/
│   ├── app.js                # 主应用逻辑
│   ├── storage.js            # LocalStorage 封装
│   ├── stars.js              # 星空背景动画
│   └── simulations/          # 各页面交互演示
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
└── pages/
    ├── special-relativity/   # 狭义相对论
    │   ├── speed-of-light.html
    │   ├── time-dilation.html
    │   ├── length-contraction.html
    │   ├── mass-energy.html
    │   └── twin-paradox.html
    └── general-relativity/   # 广义相对论
        ├── equivalence.html
        ├── spacetime-curvature.html
        ├── gravitational-lensing.html
        ├── black-holes.html
        └── gravitational-waves.html
```

---

## 页面设计

### 主页 (index.html)
- Hero 区域：标题 + 副标题 + CTA 按钮
- 简介区域：相对论概述
- 课程卡片网格：10个教学主题入口
- 动态星空背景
- 响应式导航栏

### 内容页面布局
```
┌─────────────────────────────────────────────┐
│  导航栏（固定在顶部）                         │
├─────────────────────────────────────────────┤
│  ┌─────────────┐  ┌───────────────────────┐ │
│  │ 文档面板    │  │ 演示画布              │ │
│  │ (Markdown)  │  │ (Canvas 动画)         │ │
│  │             │  │                       │ │
│  │ [编辑按钮]  │  ├───────────────────────┤ │
│  │             │  │ 控制面板              │ │
│  │             │  │ (滑块、按钮)          │ │
│  │             │  ├───────────────────────┤ │
│  │             │  │ 结果面板              │ │
│  │             │  │ (计算结果显示)        │ │
│  └─────────────┘  └───────────────────────┘ │
├─────────────────────────────────────────────┤
│  页面导航（上一页 / 下一页）                  │
└─────────────────────────────────────────────┘
```

---

## 功能模块

### 1. 本地存储模块 (storage.js)
```javascript
const Storage = {
    PREFIX: 'relativity_',
    ADMIN_PASSWORD: 'admin123',
    
    set(key, value) { ... },
    get(key, defaultValue) { ... },
    isAdmin() { ... },
    setAdmin(value) { ... },
    getPageContent(pageId) { ... },
    setPageContent(pageId, content) { ... },
    exportData() { ... },
    importData(data) { ... }
};
```

### 2. 星空背景 (stars.js)
- 200+ 闪烁的星星
- 随机流星效果
- Canvas 全屏渲染
- 响应式自适应

### 3. 交互演示类
每个页面的演示类遵循相同的结构：
```javascript
class SimulationName {
    constructor() {
        // 初始化 Canvas
        // 绑定控件事件
        // 加载内容
        // 开始动画循环
    }
    
    resize() { ... }           // 响应式调整
    initControls() { ... }     // 控件绑定
    initEditor() { ... }       // 编辑器初始化
    loadContent() { ... }      // 加载 Markdown 内容
    draw() { ... }             // 主绘制函数
    animate() { ... }          // 动画循环
}
```

---

## 交互演示详情

### 狭义相对论

| 页面 | 演示内容 | 可调参数 |
|------|----------|----------|
| 光速不变原理 | 火车+光线实验 | 参考系切换 |
| 时间膨胀 | 地球/飞船双时钟 | 速度 (0-99.9% c) |
| 长度收缩 | 飞船收缩对比 | 速度 (0-99.9% c) |
| 质能方程 | 能量粒子爆发 | 质量 (10⁻⁶ - 10³ kg) |
| 双生子佯谬 | 星际旅行模拟 | 速度、距离 |

### 广义相对论

| 页面 | 演示内容 | 可调参数 |
|------|----------|----------|
| 等效原理 | 电梯思想实验 | 场景切换、释放小球 |
| 时空弯曲 | 弯曲网格+粒子 | 中心质量、添加粒子 |
| 引力透镜 | 光线弯曲效果 | 透镜质量 |
| 黑洞 | 吸积盘+物质落入 | 黑洞质量 |
| 引力波 | 双星合并波纹 | 速度、强度、触发合并 |

---

## 管理员功能

### 登录流程
1. 点击导航栏⚙️图标
2. 输入密码（默认：`admin123`）
3. 登录后显示管理员模式指示器
4. 所有页面显示"编辑"按钮

### 内容编辑
- 左右分栏：Markdown 编辑器 + 实时预览
- 支持 GitHub Flavored Markdown
- 支持 LaTeX 公式（KaTeX 渲染）
- 保存到 LocalStorage

---

## 数学公式示例

### 时间膨胀
$$\Delta t = \gamma \cdot \Delta t_0 = \frac{\Delta t_0}{\sqrt{1 - \frac{v^2}{c^2}}}$$

### 长度收缩
$$L = L_0 \sqrt{1 - \frac{v^2}{c^2}} = \frac{L_0}{\gamma}$$

### 质能方程
$$E = mc^2$$

### 洛伦兹因子
$$\gamma = \frac{1}{\sqrt{1 - \frac{v^2}{c^2}}}$$

### 史瓦西半径
$$r_s = \frac{2GM}{c^2}$$

---

## 响应式设计

| 断点 | 布局调整 |
|------|----------|
| > 1200px | 文档面板 400px，演示面板自适应 |
| 1024-1200px | 文档面板 350px |
| < 1024px | 单列布局，文档在上，演示在下 |
| < 768px | 紧凑布局，简化控件 |

---

## 验证检查

- [x] 所有页面链接正确
- [x] 导航菜单功能正常
- [x] 交互演示运行流畅
- [x] 管理员登录/登出正常
- [x] 内容编辑和保存正常
- [x] 数学公式渲染正确
- [x] 响应式布局适配
- [x] 星空背景动画流畅

---

## 后续优化建议

1. **PWA 支持**：添加 Service Worker 实现完全离线使用
2. **多语言**：添加英文版本
3. **更多演示**：添加闵可夫斯基时空图、多普勒效应等
4. **音频解说**：配合动画的语音讲解
5. **练习题**：添加互动测验功能
