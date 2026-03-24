# `scripts/app.js` 模块说明

本文件是项目的核心脚本，负责创建 3D 场景、渲染流程、天体构建、管理员交互与数据持久化。以下根据功能模块进行拆解。

## 1. 全局常量与状态
- **场景基础**：创建 `THREE.Scene`、`PerspectiveCamera`、`WebGLRenderer`、`OrbitControls` 等；添加雾效与全局光照。
- **运行状态**：`timeScale`、`isPaused`、`isAdmin` 控制动画节奏与模式；`celestialBodies`、`labelElements` 存储动态对象与对应标签。
- **文件句柄缓存**：`projectDirectoryHandle`、`assetsDirectoryHandle`、`dataFileHandle` 等辅助 File System Access API 的访问。
- **默认数据**：`defaultCelestialData` 与 `celestialData`、`customCelestialCache` 管理天体说明/媒体信息。

## 2. 数据加载与管理员工作流
- `loadCelestialData()`：从 `data/celestial-data.json` 拉取最新数据并与默认内容合并。
- `getData()`：在展示或编辑时检索指定天体信息，必要时创建默认条目。
- 管理员模式相关函数：
  - `openLogin()`、`closeLogin()`、`checkLogin()` 控制登录弹窗与状态切换。
  - `showInfo()` 根据模式选择展示视图或编辑视图。
  - `renderViewMode()`、`renderEditView()` 构建详情展示或编辑 UI。
  - `setupDragAndDrop()`、`handleFiles()` 支持拖拽上传并写入 `assets/` 文件夹；`saveFileToAssets()` 按文件类型分类保存。
  - `saveChanges()` 将编辑结果写入 `celestialData` 并调用 `persistCustomData()`。
- 数据持久化：
  - `ensureProjectDirectory()`、`ensureAssetsDirectory()`、`ensureDataFileHandle()` 请求并缓存目录句柄。
  - `writeDataSnapshotToHandle()`、`downloadDataSnapshot()`、`persistCustomData()` 实现 JSON 写入或导出。

## 3. 纹理与视觉资源
- `initSunTexture()`、`createRingTexture()`、`createTexture()` 等函数动态生成恒星、行星、行星环等纹理。
- `textures` 对象整理所有天体所需纹理。
- `createGlow()` 构造恒星辉光；`createCircularPointTexture()` 生成奥尔特云粒子贴图。

## 4. 场景构建工具
- `createOrbit()`、`createBarycenter()`、`addOrbitLabel()`、`addSystemLabel()` 等函数用于绘制轨道线、质心标记与系统标签。
- `createSolidBelt()`、`createOortCloud()`、`createComet()` 构建小行星带、奥尔特云、彗星等特殊结构。
- `createEccentricPlanet()`、`createGenericMoon()`、`createBody()` 负责生成行星/卫星/恒星并设定轨道逻辑。其中：
  - 恒星 `createBody()` 会附加点光源和辉光，使多恒星系统的光照更加真实。

## 5. 标签与动画
- `addSystemLabel()` 等函数为每个系统/天体创建 DOM 标签，`labelElements` 记忆 mesh 与标签对应关系。
- `updateLabels()` 在每帧渲染时将 3D 坐标投影到屏幕坐标，控制标签显隐。
- `animate()` 主循环：驱动天体更新、太阳表面动画、轨道渲染，并调用渲染器输出。
- `updateSunSurface()` 模拟太阳黑子/耀斑。

## 6. 事件绑定
- `focusSystem()`、`resetView()` 响应 UI 按钮，实现快速跳转视角。
- `window.addEventListener('resize', ...)` 维持窗口尺寸变化时的相机与画布调整。
- 滑条速度控制：监听 `speedRange` 的 `input` 事件调节 `timeScale`。

## 7. 系统初始化
- 设置相机初始位置并集中视角。
- 使用上述工具函数依次创建太阳系、柯伊伯带、奥尔特云、近邻恒星系统（半人马座 α、比邻星、天狼星、TRAPPIST-1、天鹅座16 等）。
- 为各系统添加标签与说明，使管理员和普通模式均可交互查看。

## 8. 导出接口
- 将 `openLogin()`、`closeLogin()`、`saveChanges()`、`focusSystem()`、`resetView()` 等函数暴露到 `window`，供 HTML 中的按钮或事件调用。

---
通过该脚本，项目实现了富交互性的 3D 天文展示，并支持本地化编辑与资源管理。开发者可按模块查找、扩展对应逻辑：例如新增恒星系统时复用建模函数、在数据结构中补充说明信息、或在管理员模式里扩展表单字段。