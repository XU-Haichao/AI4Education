/**
 * 标准模型展示
 * 简单的粒子卡片悬停效果和默认内容
 */

// 添加粒子卡片悬停效果
document.addEventListener('DOMContentLoaded', () => {
    const particleCards = document.querySelectorAll('.particle-card');

    particleCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            // 添加脉冲动画
            card.style.animation = 'pulse 0.5s ease';
        });

        card.addEventListener('animationend', () => {
            card.style.animation = '';
        });
    });
});

// 添加脉冲动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(style);

// 默认学习内容
if (typeof DefaultContent !== 'undefined') {
    DefaultContent['standard-model'] = `# 粒子物理标准模型

## 什么是标准模型？

**标准模型**是描述基本粒子及其相互作用的理论框架，是20世纪物理学最伟大的成就之一。它成功地统一了除引力外的三种基本相互作用：

- 电磁相互作用
- 弱相互作用  
- 强相互作用

## 基本粒子分类

### 费米子（物质粒子）

费米子是构成物质的基本粒子，自旋为1/2：

**夸克**（参与强相互作用）
| 代 | 上型 (+2/3) | 下型 (-1/3) |
|---|---|---|
| 第一代 | 上夸克 u | 下夸克 d |
| 第二代 | 粲夸克 c | 奇夸克 s |
| 第三代 | 顶夸克 t | 底夸克 b |

**轻子**（不参与强相互作用）
| 代 | 带电轻子 (-1) | 中微子 (0) |
|---|---|---|
| 第一代 | 电子 e | 电子中微子 νₑ |
| 第二代 | μ子 μ | μ中微子 νᵤ |
| 第三代 | τ子 τ | τ中微子 ν_τ |

### 玻色子（力的载体）

玻色子传递基本相互作用，自旋为整数：

| 玻色子 | 传递的力 | 质量 |
|---|---|---|
| 光子 γ | 电磁力 | 0 |
| 胶子 g (8种) | 强力 | 0 |
| W± 玻色子 | 弱力 | 80.4 GeV |
| Z 玻色子 | 弱力 | 91.2 GeV |
| 希格斯玻色子 H | 质量起源 | 125 GeV |

## 希格斯机制

为什么某些粒子有质量？答案是**希格斯机制**：

> 希格斯场弥漫整个宇宙，粒子与希格斯场相互作用获得质量。相互作用越强，质量越大。

2012年，欧洲核子研究中心(CERN)的大型强子对撞机(LHC)发现了希格斯玻色子，证实了这一机制。

## 标准模型的成功与局限

### 成功
- 预言了W、Z玻色子和希格斯玻色子，后被实验证实
- 量子电动力学的预言与实验符合到12位有效数字
- 解释了几乎所有粒子物理实验结果

### 局限
- 不包含引力
- 无法解释暗物质和暗能量
- 不能解释中微子质量的起源
- 包含19个自由参数，缺乏更深层的解释

## 超越标准模型

物理学家正在探索超越标准模型的理论：
- **超对称理论**：每个粒子都有一个"超伴子"
- **弦理论**：基本粒子是振动的弦
- **大统一理论**：将强力与电弱力统一
`;
}
