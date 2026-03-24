# 第三阶段理论深化页面创建计划

创建理论深化部分的四个页面：路径积分、量子场论、费曼图、标准模型。

## Proposed Changes

### 页面结构说明

每个页面需要：
1. HTML 页面文件（位于 `pages/modern-era/theory-track/`）
2. 模拟 JS 文件（位于 `js/simulations/modern-era/`），包含交互式演示逻辑和默认内容

---

### 路径积分 (Path Integral)

#### [NEW] [path-integral.html](file:///c:/Users/epiphyllum/OneDrive/Projects/ai4teaching/quantum_new/pages/modern-era/theory-track/path-integral.html)
- 费曼路径积分的可视化演示
- 展示粒子"走遍所有可能路径"的概念

#### [NEW] [path-integral.js](file:///c:/Users/epiphyllum/OneDrive/Projects/ai4teaching/quantum_new/js/simulations/modern-era/path-integral.js)
- 路径可视化动画
- 相位叠加演示

---

### 量子场论 (Quantum Field Theory)

#### [NEW] [quantum-field-theory.html](file:///c:/Users/epiphyllum/OneDrive/Projects/ai4teaching/quantum_new/pages/modern-era/theory-track/quantum-field-theory.html)
- 场的量子化概念
- 粒子的产生与湮灭演示

#### [NEW] [quantum-field-theory.js](file:///c:/Users/epiphyllum/OneDrive/Projects/ai4teaching/quantum_new/js/simulations/modern-era/quantum-field-theory.js)
- 场振动模式动画
- 粒子创建/湮灭可视化

---

### 费曼图 (Feynman Diagrams)

#### [NEW] [feynman-diagrams.html](file:///c:/Users/epiphyllum/OneDrive/Projects/ai4teaching/quantum_new/pages/modern-era/theory-track/feynman-diagrams.html)
- 费曼图的绘制与解读
- 基本粒子相互作用图示

#### [NEW] [feynman-diagrams.js](file:///c:/Users/epiphyllum/OneDrive/Projects/ai4teaching/quantum_new/js/simulations/modern-era/feynman-diagrams.js)
- 交互式费曼图绘制
- 常见相互作用过程动画

---

### 标准模型 (Standard Model)

#### [NEW] [standard-model.html](file:///c:/Users/epiphyllum/OneDrive/Projects/ai4teaching/quantum_new/pages/modern-era/theory-track/standard-model.html)
- 基本粒子分类展示
- 四种基本相互作用

#### [NEW] [standard-model.js](file:///c:/Users/epiphyllum/OneDrive/Projects/ai4teaching/quantum_new/js/simulations/modern-era/standard-model.js)
- 交互式粒子周期表
- 粒子属性查看器

---

## Verification Plan

### 浏览器测试
- 访问每个新建页面，确认页面正常加载
- 测试交互式演示功能
- 验证页面导航链接正确

### 导航一致性
- 确认下拉菜单链接有效
- 确认页面间导航流畅
