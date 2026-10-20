# PSD Pilot v0 — 转换报告

## 结论

`PSD_PILOT_UNVERIFIED`

试点 PSD 已产生并完成结构、尺寸、图层类型与合成预览检查；由于当前环境没有 Adobe Photoshop，无法完成最终应用内验收。没有批量转换其他页面，也没有进行 UI 重构。

## 产物

```text
ui-audit/psd/
├─ pilot/
│  ├─ CardWheel-Editable.psd
│  ├─ CardWheel-Reference.png
│  └─ intermediate/
│     ├─ CardWheel-Figma.svg
│     ├─ CardWheel-Figma.pdf
│     ├─ CardWheel-Figma.png
│     ├─ CardWheel-PSD-Composite.png
│     ├─ build-psd.mjs
│     ├─ validate-psd.mjs
│     ├─ validate_psd.py
│     └─ validation.json
├─ psd-layer-audit.md
└─ conversion-report.md
```

Figma 可编辑中间稿：<https://www.figma.com/design/h8fXc30u5ysk5r2kWL20XS>

## 转换过程

1. 核对 Git Diff：仅保留上一阶段截图工具需要的 `package.json` / `package-lock.json` 变更；`src/` 无修改。4 个既有未跟踪 public 图片与 `reports/` 未被覆盖。
2. 从 manifest 选择真实存在且成功的 `CARD-02.desktop` 作为视觉基准。
3. 读取 `CardWheelPage.tsx`、`CardWheelRenderer.tsx`、`seasons.ts`、全局字体栈和 layer map，提取 500×500 Canvas 几何、4 个扇区颜色、图片、指针 SVG、按钮和舞台参数。
4. 新建专用 Figma Design 文件；搜索现有库，未复用与当前品牌匹配的组件。
5. DOM/CSS 自动捕获尝试：在本地页面临时注入官方捕获脚本，并分别在隔离内置浏览器与 Edge 标签页打开捕获 URL。连续轮询 10 次仍为 `pending`；运行时未注册 `window.figma.captureForDesign`。临时脚本已撤销，`index.html` 无剩余 diff。
6. Figma 语义化重建：使用源码尺寸与原始四季卡图建立 1440×900 可编辑稿；没有把完整截图作为可见交付层。
7. 导出 Figma SVG/PDF/PNG 中间稿，再以分组、独立像素层和可编辑 Type Layer 写入 PSD。
8. 使用 `ag-psd` 与 `psd-tools` 两套解析器独立检查；后者成功合成预览 PNG。

## 视觉误差

对 1440×900 全画布逐像素比较：

| 比较 | RGB 平均绝对误差 | 单像素平均通道误差 > 12 的比例 |
|---|---:|---:|
| Figma 中间稿 vs 原始 CARD-02 | 9.36 / 255 | 11.37% |
| PSD 图层合成预览 vs 原始 CARD-02 | 8.39 / 255 | 12.28% |

误差主要来自：浏览器与 Figma/Sharp 的字体渲染差异、Canvas 卡图裁切方式、舞台环境光、截图底部仅露出的收集档案区域，以及 PSD 中将矢量视觉拆为独立像素层。原始 PNG 未被修改。

## 验证结果

- PSD 实际存在且非空：5,760,177 bytes。
- PSD 尺寸：1440×900，RGB，8 bit。
- 解析器识别：7 组、14 文字层、18 栅格层。
- 合成预览：1440×900，可查看，主要组件未裁切。
- 参照图复制前后 SHA-256 一致。
- Figma 结构检查：14 文字、95 矢量/线条、4 图片填充、126 子节点。
- 本次没有改动 `src/`、奖励规则、抽奖状态机、现有截图或 manifest。

## 当前阻断与后续验收

1. 在装有 Adobe Photoshop 的机器上打开 `CardWheel-Editable.psd`。
2. 检查并替换缺失的 `Noto Sans SC` 字体，逐一编辑标题、按钮、四季标签与中心“抽卡”文字。
3. 将 4 个扇区、按钮、舞台和指针从独立像素层升级为 Photoshop Shape Layer；把四季卡图转为嵌入或链接智能对象。
4. 与 `CardWheel-Reference.png` 以 Difference 模式比对，重点校正 Canvas 图片裁切、标签位置与环境光。
5. Photoshop 保存并重新打开无错误后，才可把 Gate 改为 `PSD_PILOT_ACCEPTED`。

## Git Diff 摘要

- 新增：`ui-audit/psd/**` 试点 PSD、参考图、Figma 中间导出、生成/验证脚本与报告。
- 既有上一阶段变更：`package.json` / `package-lock.json` 中 Playwright、Sharp 和 `capture:ui`。
- 未修改：`src/**`、`ui-audit/manifest.json`、`ui-audit/screenshots/**`。
- 未覆盖：用户已有未跟踪 `public/宣传海报.png`、`public/梦幻蕾丝少女的心形卧室.png`、`public/派露壁纸.png`、`public/猫堡壁纸.png` 与 `reports/`。
