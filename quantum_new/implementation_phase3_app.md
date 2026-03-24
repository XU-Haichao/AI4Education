# 第三阶段量子应用页面创建计划

创建应用层面的三个页面：量子隧穿、量子纠缠、量子计算。

## Proposed Changes

### 页面结构说明

每个页面需要：
1. HTML 页面文件（位于 `pages/modern-era/app-track/`）
2. 模拟 JS 文件（位于 `js/simulations/modern-era/`），包含交互式演示逻辑和默认内容

---

### 量子隧穿 (Quantum Tunneling)

#### [NEW] [quantum-tunneling.html](file:///c:/Users/epiphyllum/OneDrive/Projects/ai4teaching/quantum_new/pages/modern-era/app-track/quantum-tunneling.html)

**交互功能：**
- 可视化波函数穿越势垒的过程
- 可调节势垒高度和宽度
- 展示透射概率与能量的关系
- 隧穿应用实例：α衰变、扫描隧道显微镜

#### [NEW] [quantum-tunneling.js](file:///c:/Users/epiphyllum/OneDrive/Projects/ai4teaching/quantum_new/js/simulations/modern-era/quantum-tunneling.js)

---

### 量子纠缠 (Quantum Entanglement)

#### [NEW] [quantum-entanglement.html](file:///c:/Users/epiphyllum/OneDrive/Projects/ai4teaching/quantum_new/pages/modern-era/app-track/quantum-entanglement.html)

**交互功能：**
- 纠缠态的可视化
- 贝尔不等式实验演示
- 测量关联性展示
- 量子通信/量子密钥分发概念

#### [NEW] [quantum-entanglement.js](file:///c:/Users/epiphyllum/OneDrive/Projects/ai4teaching/quantum_new/js/simulations/modern-era/quantum-entanglement.js)

---

### 量子计算 (Quantum Computing)

#### [NEW] [quantum-computing.html](file:///c:/Users/epiphyllum/OneDrive/Projects/ai4teaching/quantum_new/pages/modern-era/app-track/quantum-computing.html)

**交互功能：**
- Bloch球可视化量子比特状态
- 基本量子门操作（H门、X门、Z门、CNOT门）
- 量子叠加态演示
- 简单量子电路示例

#### [NEW] [quantum-computing.js](file:///c:/Users/epiphyllum/OneDrive/Projects/ai4teaching/quantum_new/js/simulations/modern-era/quantum-computing.js)

---

## Verification Plan

### 浏览器测试
- 访问每个新建页面，确认页面正常加载
- 测试交互式演示功能
- 验证页面导航链接正确

### 导航一致性
- 确认下拉菜单链接有效
- 确认页面间导航流畅
