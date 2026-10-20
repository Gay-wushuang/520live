# 520live UI 截图基线采集报告

## 结论

- 审计基线：`8dcf2151799088d97d6c53f5751a86b1b9a347dc`（采集开始时 HEAD 与基线一致）。
- 报告宣称候选状态为 44 个，但 `reports/capture-plan.md` 的正式 ID 逐行枚举为 **46 个**；若把计划中额外出现的 `MON-13b` 也算独立 ID，则为 47 个。此次不删除条目凑数，采集了 46 个正式 ID，并把 `MON-13b` 作为 `MON-13` 的反馈文本变体验证。
- 46 个正式 ID 中：**45 个真实 UI 状态成功、1 个 blocked、0 个运行失败**。
- 共生成 **49 张状态 PNG**（同一 ID 的多视口变体计为不同文件）和 **5 张 contact-sheet**。
- 未修改 `src/` 下页面、组件、状态机、概率或奖励规则；未生成或声称生成 PSD。

机器可读的逐文件尺寸、SHA-256、视口、状态与错误信息见 [`manifest.json`](manifest.json)。

## 环境与隔离

| 项目 | 实际值 |
|---|---|
| 包管理 | npm + `package-lock.json` |
| 应用启动 | `npm run dev -- --host 127.0.0.1` |
| 截图执行 | `npm run capture:ui` |
| 浏览器 | Playwright Chromium 156（Playwright 1.64.1） |
| Browser context | 每次执行新建临时、非持久化 context |
| 用户资料 | 未连接 Chrome/Edge 用户资料；未使用用户 profile 路径 |
| LocalStorage | 只在隔离 context 的 `127.0.0.1:5173` origin 写入测试 fixture |
| 测试身份 | `截图用户`、`观众A/B/C`，不含真实昵称 |
| DPR / 缩放 | 1 / 100% |
| 动效偏好 | `no-preference` |
| 色彩模式 | light |
| 视口 | desktop 1440×900、mobile 390×844、tablet 768×1024、wide 1920×1080 |

脚本每个状态都重新写入隔离测试数据，并通过页面按钮、输入框和等待真实 DOM 状态完成操作。截图加载态通过延迟真实积分卡图片请求稳定复现，未替换页面或伪造截图。随机源仅在测试页面初始化脚本中固定；生产源码未改动。

## 覆盖结果

| 区域 | 正式 ID | 成功 | Blocked | 产出 PNG |
|---|---:|---:|---:|---:|
| 大富翁（MON） | 18 | 18 | 0 | 20（`MON-01` 含 3 视口） |
| 积分卡/收集档案（CARD/CS） | 15 | 15 | 0 | 17（`CARD-01/02` 含双视口） |
| 覆盖层（OVL） | 13 | 12 | 1 | 12 |
| 合计 | 46 | 45 | 1 | 49 |

成功截图位置：

- `screenshots/desktop/`：45 张
- `screenshots/mobile/`：4 张
- `screenshots/overview/`：`MON.png`、`CARD.png`、`OVERLAY.png`、`MOBILE.png`、`ALL.png`

## Blocked 与计划校正

### Blocked

- `OVL-WALL-02`：终极奖励双图版 `WallpaperRewardModal` 不可达。页面只在 `pendingReward && !showVideoReward` 时渲染该弹窗，而 `gameStore.addCard` 在终极奖励分支同时设置 `showVideoReward=true`，因此实际 UI 会直接进入视频层。未为此修改生产状态机，也未制作替代图。

### 审计计划中的实际差异

- 数量口径：计划标题与合计写 44，逐行正式 ID 实际为 46；`MON-13b` 另作为非正式附加 ID 出现。
- `CARD-04`：计划写 `card.spring1` 后应显示 `ResultModal`，但第 2 张同季卡会触发 `WallpaperRewardModal`。实际采集用零进度 fixture，经真实抽卡后获得“命中横幅 + ResultModal”。
- `CARD-05`：`ui-inventory.md` 定义为收集进度 0/2，`capture-plan.md` 改写为移动端整体。此次用移动端初始状态同时保留两层语义；`CS-03` 另提供桌面 0/2 细节。
- `MON-13b`：剪贴板拒绝态没有作为正式候选新增，以免进一步扩大已经不一致的候选计数；`MON-13` 实际验证了“读取成功”和“空日志无法复制”两种反馈。

## 质量检查

- 49 张状态 PNG 均存在、非空，且实际像素尺寸与 manifest 一致。
- 除 `MON-wide` 的有意全页截图外，所有文件严格等于对应视口尺寸。
- 所有成功状态均无 `pageerror` 或 console error。
- 390px 移动端与 768px 平板端均无 DOM 水平溢出；主页面、转盘、结果弹窗、壁纸弹窗和视频层可查看。
- `OVL-VID-01` 验证视频进入可播放状态；`OVL-VID-02` 单独保留加载 spinner 中间态。
- `CARD-01` 在冷缓存和热缓存下都由真实图片请求延迟稳定复现。
- `OVL-WALL-02` 明确记为 `skipped/blocked`，未生成伪造 PNG。
- 未执行下载/导出动作，未在用户下载目录留下文件。

视觉总览人工检查已覆盖 `ALL.png`、`MOBILE.png`、视频播放态和视频加载态。固定视口截图按计划不使用 `fullPage`，因此页面纵向内容不一定在单张图里全部出现；收集档案状态在操作前已滚动到目标区域，属于预期构图而非意外裁切。

## 可复现命令

```powershell
npm install
npx playwright install chromium
npm run dev -- --host 127.0.0.1
npm run capture:ui
```

默认基地址为 `http://127.0.0.1:5173`；可用 `UI_AUDIT_BASE_URL` 覆盖。采集脚本位于 `ui-audit/tools/capture.mjs`。

## 验证命令与结果

| 命令 | 结果 |
|---|---|
| `npm run capture:ui` | 通过；45 成功、1 blocked、0 error，49 张状态 PNG + 5 张总览 |
| `npm run lint` | 通过；ESLint 0 error |
| `npm run check` | 通过；`tsc -b --noEmit` 0 error |
| `npm run build` | 通过；Vite 64 modules transformed，构建产物正常 |
| `npm run test` | 通过；依次重跑 lint + check + build |

逐次截图运行中的中间失败均已修正；最终运行无失败状态。

## Git Diff 摘要

本阶段预期变更范围：

- `package.json` / `package-lock.json`：加入 `@playwright/test`、`sharp` 及 `capture:ui` 脚本。
- `ui-audit/tools/capture.mjs`：确定性、隔离的截图采集与 contact-sheet 生成器。
- `ui-audit/screenshots/**`：真实渲染 PNG 基线与总览。
- `ui-audit/design-source/assets/**`：PSD 交接用原始资源副本。
- `ui-audit/design-source/layer-map.md`：Photoshop 图层组合建议。
- `ui-audit/manifest.json` 与本报告。

`ui-audit/` 当前约 78.6 MB，主要体积来自 49 张无损 PNG、5 张总览、12 个原始视觉/视频资源副本。

仓库开始时已有未跟踪的 `reports/` 和 4 张 `public/` 图片；这些视为已有用户工作，未删除或覆盖。

## 后续 PSD 转换剩余工作

1. 确定 PSD 的目标画板集合（建议桌面 1440×900、移动 390×844、覆盖层 1440×900）。
2. 将 Canvas/SVG 轮盘按 `layer-map.md` 重建为可编辑矢量形状；截图本身不能提供可编辑扇区。
3. 将棋盘 28 个热点、棋子、文字、按钮、卡片和弹窗拆为独立图层/智能对象。
4. 确认交付机上的中文字体替代策略；当前页面主要依赖系统字体，Canvas 标签优先 `YouYuan`/`Microsoft YaHei`。
5. 对阴影、模糊、渐变与发光做 Photoshop 原生图层样式重建。
6. 在 PSD 中嵌入色彩配置、命名规范和切图边界，并与本次 PNG 做像素级对照。

本阶段到此停止，等待审查；未继续 UI 重构。
