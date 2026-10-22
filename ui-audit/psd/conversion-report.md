# PSD Pilot v0 — 转换报告

## 结论

`PSD_PILOT_ACCEPTED`

试点 PSD 已由 Adobe Photoshop 2024（25.11.0）实际打开并检查。Photoshop 识别 7 个分组、14 个文字层与 18 个独立像素层；在最终版的验收副本上修改中文标题、保存、重新打开确认修改，再还原标题并再次保存重开，全部通过。Photoshop 还从最终原件导出 1440×900 PNG，用于视觉检查。该 Gate 表示试点达到可编辑 PSD 的验收要求，不代表像素级还原或已将栅格层升级为原生 Shape/智能对象。

桌面窗口捕获仍超时；本次通过 Photoshop 自身的脚本接口完成应用内验收。先前尝试把 RDP 会话接到本机控制台时，Windows 返回 `Access is denied`（错误 5）。此后用户已切换到本机控制台；在 `console` 会话中，文件管理器与 Photoshop 的画面捕获仍分别报 `FrameArrived timed out` / `window capture timed out`，刷新 Photoshop 窗口后复测也失败。因此 RDP 不是该故障的唯一条件。

## 产物

```text
ui-audit/psd/
├─ pilot/
│  ├─ CardWheel-Editable.psd
│  ├─ CardWheel-Reference.png
│  ├─ CardWheel-Photoshop-QA-v3.psd
│  └─ intermediate/
│     ├─ CardWheel-Figma.svg
│     ├─ CardWheel-Figma.pdf
│     ├─ CardWheel-Figma.png
│     ├─ CardWheel-PSD-Composite.png
│     ├─ CardWheel-Photoshop-Render-v3.png
│     ├─ build-psd.mjs
│     ├─ validate-psd.mjs
│     ├─ photoshop-audit.jsx
│     ├─ photoshop-text-qa.jsx
│     ├─ photoshop-render-qa.jsx
│     ├─ validate_psd.py
│     └─ validation.json
├─ psd-layer-audit.md
└─ conversion-report.md
```

Figma 可编辑中间稿：<https://www.figma.com/design/h8fXc30u5ysk5r2kWL20XS>

## 转换过程

1. 在制作试点时核对 Git Diff；本次续验发现工作树此后又有业务代码、截图工具、manifest 与截图变更，均未由本次续验修改或覆盖。
2. 从 manifest 选择真实存在且成功的 `CARD-02.desktop` 作为视觉基准。
3. 读取 `CardWheelPage.tsx`、`CardWheelRenderer.tsx`、`seasons.ts`、全局字体栈和 layer map，提取 500×500 Canvas 几何、4 个扇区颜色、图片、指针 SVG、按钮和舞台参数。
4. 新建专用 Figma Design 文件；搜索现有库，未复用与当前品牌匹配的组件。
5. DOM/CSS 自动捕获尝试：在本地页面临时注入官方捕获脚本，并分别在隔离内置浏览器与 Edge 标签页打开捕获 URL。连续轮询 10 次仍为 `pending`；运行时未注册 `window.figma.captureForDesign`。临时脚本已撤销，`index.html` 无剩余 diff。
6. Figma 语义化重建：使用源码尺寸与原始四季卡图建立 1440×900 可编辑稿；没有把完整截图作为可见交付层。
7. 导出 Figma SVG/PDF/PNG 中间稿，再以分组、独立像素层和可编辑 Type Layer 写入 PSD。
8. 初版用 `ag-psd` 与 `psd-tools` 解析。最终版经 `ag-psd` 及 Photoshop 2024 独立读取；Photoshop 还完成文字回写、保存、重开和 PNG 导出。
9. 根据 Photoshop 实际渲染修复标题、副标题重叠、左侧标签偏位与四季图片顺序/位置；将文字层字体指定为本机 Photoshop 已安装的 `MicrosoftYaHei` / `MicrosoftYaHei-Bold`。

## 视觉误差

对 1440×900 全画布逐像素比较：

| 比较 | RGB 平均绝对误差 | 单像素平均通道误差 > 12 的比例 |
|---|---:|---:|
| Figma 中间稿 vs 原始 CARD-02 | 9.36 / 255 | 11.37% |
| Photoshop 最终导出 vs 冻结的 CARD-02 参照 | 7.19 / 255 | 11.22% |

剩余误差主要来自卡图裁切和圆角、季节标签描边、轮盘外圈与舞台环境光、截图底部仅露出的收集档案区域，以及 PSD 中将矢量视觉拆为独立像素层。参照 PNG 未被修改。

## 验证结果

- PSD 实际存在且非空：5,760,725 bytes；SHA-256 `286a1da94192bfc2135bbd12b2181d044890ab2b5e49aba77ac93483ab02c1bc`。
- PSD 尺寸：1440×900，RGB，8 bit。
- Photoshop 2024 实际打开：7 组、14 文字层、18 栅格层；文字字体在 Photoshop 中确认为微软雅黑。
- 最终验收副本：中文标题修改、保存、重开确认、还原、再次保存重开，均成功。
- Photoshop 导出预览：1440×900，可查看，主要组件未裁切；左侧季节标签与图片仍有局部接触，见剩余误差。
- 交付参照图保持原先 SHA-256：`5cf7692c9ed66b6385e71d2d486b054e54951edfa4720817e9f77e290822412e`。
- 当前 manifest 的 `CARD-02.desktop` 已更新为 2026-10-21 的截图，SHA-256 为 `7e4e3d4bbc08ce61b64e0a190a6656b49a80cc3c591f980635877cf29035acbd`。上述视觉误差仅针对试点冻结的参照图，不适用于更新后的截图基线。
- Figma 结构检查：14 文字、95 矢量/线条、4 图片填充、126 子节点。
- `npm run test` 通过（lint、TypeScript 检查、生产构建）；`git diff --check` 通过。
- 本次没有改动 `src/`、奖励规则、抽奖状态机、现有截图或 manifest。

## 后续改进

1. 若课程要求更高的原生矢量可编辑性，将 4 个扇区、按钮、舞台和指针从独立像素层升级为 Photoshop Shape Layer；把四季卡图转为智能对象。
2. 继续校正卡图裁切、圆角、标签描边、轮盘外圈与环境光。当前验收针对冻结的参照图；如果改以 2026-10-21 重新采集的 `CARD-02` 为基准，需重新评估误差。
3. 桌面窗口画面捕获在 RDP 与本机控制台均超时。2026-10-22 电脑重启后，新的 ChatGPT 与捕获辅助进程已启动；在本机控制台对文件管理器首次捕获及刷新重试仍分别报 `FrameArrived timed out` / `window capture timed out`。需单独排查捕获接口或 Windows 图形捕获链路；不妨碍已完成的 Photoshop 应用内 PSD 验收。

## Git Diff 摘要

- 更新：`CardWheel-Editable.psd`、生成/验证脚本、验证数据与两份报告。
- 新增：Photoshop 验收副本、Photoshop 实际导出预览与应用脚本。此前的 QA 副本及预览保留为修复前对照。
- 本次续验未修改：`src/**`、`ui-audit/manifest.json`、`ui-audit/screenshots/**`。这些路径当前已有其他工作树变更，须独立审查。
