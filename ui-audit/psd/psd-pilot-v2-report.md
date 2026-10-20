# PSD Pilot v2 — Phase B/C 报告与验收 Gate

**仓库**：`https://github.com/Gay-wushuang/520live`
**基线 commit**：`e63ea89f0aa23720e674edc4ec65ea0fd95595e6`
**试点产物 commit**：`a835c59f665dbb354d434935e57d4d9a78ac8284`
**验收对象**：`ui-audit/psd/pilot/CardWheel-Editable-v2.psd`
**验收环境**：Windows + Adobe Photoshop **25.11.0**（COM / ExtendScript 自动化，真实进程）
**最终 Gate**：`PSD_PILOT_ACCEPTED`（判定依据见 §7）

---

## 1. 约束遵守核对

| 约束 | 结果 | 证据 |
|---|---|---|
| 不修改 `src/**` | ✅ 遵守 | `git status` 无 `src/` 变更 |
| 不修改奖励概率/状态机/存档/抽卡逻辑 | ✅ 遵守 | 同上 |
| 不覆盖既有截图基线与 manifest | ✅ 遵守 | 无已跟踪文件被修改；新增强均为新增文件 |
| 不批量生成其他页面 PSD | ✅ 遵守 | 仅 `CardWheel` 试点 |
| 不删除 Figma 中间产物 | ✅ 遵守 | `CardWheel-Figma.{png,svg,pdf}` 原样保留 |
| 仅在真实验证后更新 Gate | ✅ 遵守 | Gate 仅在 Photoshop 实测 20/20 后给出 |

---

## 2. Phase B — 定点改进内容

### 2.1 关键 UI 图形 → ag-psd 原生 Shape Layer（20 个）

由 [build-psd-v2.mjs](file:///e:/ERE/Documents/Work/直播轮盘/ui-audit/psd/pilot/intermediate/build-psd-v2.mjs) 生成，每层仅含 `vectorMask`（贝塞尔路径）+ `vectorFill`（纯色/渐变），**不含像素数据**：

`BG / Base radial`、`BG / Grid H`、`BG / Grid V`、`Back pill / Shape`、`Stage / Glass panel`、`Stage / Glow`、`Sector / Spring|Summer|Autumn|Winter`、`Wheel / Border rings`、`Wheel / Border rings highlight`、`Wheel / Center hub`、`Wheel / Center hub ring`、`Pointer / Main|Highlight|Pin`、`Primary button / Shape`、`Secondary button / Shape`、`Collection / Visible panel top`

Photoshop 将其识别为 `LayerKind.SOLIDFILL` / `LayerKind.GRADIENTFILL`（矢量形状层），**非**栅格截图冒充。

### 2.2 四季卡片 → 原生 Smart Object（4 个）

ag-psd **无法**生成 Smart Object（工具链限制，已如实记录，非伪造）。该步骤由 [pilot-to-smart-objects.jsx](file:///e:/ERE/Documents/Work/直播轮盘/ui-audit/psd/pilot/intermediate/pilot-to-smart-objects.jsx) 在 **真实 Photoshop** 中完成：
- 将源卡片 PNG（全分辨率）复制进文档 → `newPlacedLayer` 转为嵌入型 Smart Object → 非破坏性缩放至 104×104 → 移入 `Wheel / Editable parts` 并置于外环之上、季节标签之下 → 删除原栅格占位层。
- 结果：`Card image / Spring|Summer|Autumn|Winter / Smart Object`，`LayerKind.SMARTOBJECT`。

### 2.3 保留项

- **14 个可编辑文字层**全部保留（名称与 v1 一致）。
- **8 个分组**与隐藏参考组 `REFERENCE / Hidden` 结构保留。
- 原始截图（`CardWheel-Reference.png`）与 Figma 中间稿未改动。
- 无任何“单一平面截图冒充可编辑 PSD”：整页可见栅格层 = **0**（唯一栅格层是隐藏的 REFERENCE）。

### 2.4 文字层可渲染性修复

ag-psd 写出的文字层首次打开时 bounds 为 0×0（引擎数据未重排）。交付流水线在 Photoshop 中对每个文字层执行 `textItem.contents` 自赋值触发重排后再另存，因此**交付文件中的文字在打开即正常渲染**。

---

## 3. 结构统计与失败即中止验证

脚本：[validate-psd-v2.mjs](file:///e:/ERE/Documents/Work/直播轮盘/ui-audit/psd/pilot/intermediate/validate-psd-v2.mjs)（任一断言失败 `process.exit(1)`）
输出：[validation-v2.json](file:///e:/ERE/Documents/Work/直播轮盘/ui-audit/psd/pilot/validation-v2.json)

```
result: PASS
counts:  groups=8  text=14  shape=20  smartObject=4  raster=1  hiddenReference=1  total=47
```

**真断言（失败即中止）**：
尺寸 1440×900、colorMode=RGB(3)、顶层分组顺序（栈序 `00_BG…REFERENCE / Hidden`）、文字层 ==14 且名称齐全且非空、Shape Layer ≥18 且**每层均有 vectorFill**、隐藏 REFERENCE ==1、四季卡片层存在、Smart Object ≥4、**无可见整页栅格层**。

**仅统计/信息（不做 Gate 判定）**：`offCanvas` 仅记录（`BG / Base radial` −1..1441、`Collection` 面板 142..1297/832..901、`Archive status` 892..905 —— 有意超出画布的装饰层，Photoshop 正常处理）。

> 与 v1 的 [validate-psd.mjs](file:///e:/ERE/Documents/Work/直播轮盘/ui-audit/psd/pilot/intermediate/validate-psd.mjs) 相比：v1 仅 1 处真断言（且比较已陈旧的外部 PNG），其余均为打印统计；v2 已把关键结构指标全部改为断言。

---

## 4. Phase C — Photoshop 实测验收（20/20 PASS）

脚本：[pilot-phaseC-acceptance.jsx](file:///e:/ERE/Documents/Work/直播轮盘/ui-audit/psd/pilot/intermediate/pilot-phaseC-acceptance.jsx)，在**临时副本**上操作，绝不改动交付文件。
日志摘录（真实运行输出）：

```
PASS PS-OPEN :: 1440x900
PASS STRUCTURE-COUNTS :: text=14 so=4
PASS TITLE-LAYER-FOUND :: Title / 积分卡转盘
PASS TITLE-EDIT-VISIBLE :: bounds=568 px,71 px,869 px,118 px
PASS BUTTON-LABEL-FOUND :: Button label / 抽取积分卡
PASS BUTTON-EDIT-VISIBLE :: bounds=613 px,771 px,686 px,789 px
PASS SHAPE-LAYER-FOUND :: Secondary button / Shape
PASS SHAPE-EDIT
PASS SHAPE-FILL-VISIBLE :: 30,204,131 30,204,131 30,203,130 30,204,131
PASS SHAPE-EDIT-NO-STRUCTURE-CHANGE :: before=47 after=47
PASS SMART-OBJECT-FOUND :: Card image / Spring / Smart Object
PASS SMART-OBJECT-REPLACE
PASS REPLACE-NO-STRUCTURE-CHANGE :: before=47 after=47
PASS SAVE :: .../accept/CardWheel-v2-accepted.psd
PASS REOPEN :: CardWheel-v2-accepted.psd
PASS TEXT-PERSIST-AFTER-REOPEN :: contents=积分卡转盘V2
PASS TEXT-COUNT-AFTER-REOPEN :: text=14
PASS STRUCTURE-AFTER-REOPEN :: so=4 shapes=20
PASS COMPOSITE-EXPORT :: png exported
=== SUMMARY: 20/20 passed, failures=0
```

与工单 Phase C 五项要求逐条对应：

| 工单要求 | 结果 | 证据 |
|---|---|---|
| ① Photoshop 能正常打开 | ✅ | `PS-OPEN :: 1440x900` |
| ② 中文标题与按钮文字可修改 | ✅ | `TITLE-EDIT-VISIBLE`、`BUTTON-EDIT-VISIBLE` |
| ③ 编辑后可保存/关闭/重新打开 | ✅ | `SAVE`/`REOPEN`/`TEXT-PERSIST-AFTER-REOPEN` |
| ④ 修改形状或替换图片不破坏其他组件 | ✅ | `SHAPE-EDIT`+`SHAPE-FILL-VISIBLE`、`SMART-OBJECT-REPLACE`，两侧 `...-NO-STRUCTURE-CHANGE` 均 47→47 |
| ⑤ 图层结构与合成预览正确 | ✅ | `STRUCTURE-AFTER-REOPEN :: so=4 shapes=20`、`COMPOSITE-EXPORT` |

**独立像素证据**（对 Photoshop 导出的 PNG 逐像素核验）：[verify-visual-v2.mjs](file:///e:/ERE/Documents/Work/直播轮盘/ui-audit/psd/pilot/intermediate/verify-visual-v2.mjs) → `6/6 PASS`
- 形状填充改色：编辑前 `254,254,255`（近白）→ 编辑后 `30,204,131`（即目标绿 `12,200,120` 在 92% 层不透明度下与底色的合成值），按钮内绿色像素 **0 → 5555**（共 7020）。
- 文字内容变更：标题带红色字形像素 **5141 → 6127**（“积分卡转盘”→ “积分卡转盘V2”）。
- 自洽性：交付 PSD 内嵌合成图 vs Photoshop 打开即导出的 `before-edit.png`，全局平均绝对差 **0.06**、超 32 像素占比 **0%** —— 说明存储的合成预览与 Photoshop 实际渲染一致。

证据文件：`intermediate/CardWheel-v2-composite.png`（打开即渲染）、`intermediate/CardWheel-v2-accepted.png`（改字/改色/换图并重开后的渲染）。

---

## 5. 视觉差异与残余问题

**局部误差**（`CardWheel-v2-composite.png` vs 原截图 `CardWheel-Reference.png`，6×6 分块）：

- 全局平均绝对差 **11.13**，超 32 的像素占比 **6.3%**。
- 误差集中在**转盘中心区**：`r3c2`(480–720,450–600) 41.83、`r2c2`(480–720,300–450) 35.83、`r2c3/r3c3`(720–960,300–600) ≈22–25；四周与页眉区（cell 0/4/5 列）≤8、超 32 占比多为 0%。
- 成因：扇区/光晕渐变为“停靠点+角度”近似、中心 hub 与指针几何近似、季节标签位置/字号近似。

**残余问题（如实列出，未掩盖）**：
1. **字体替代**：Figma 使用的 NotoSansSC 本机缺失，改用 `MicrosoftYaHei` / `MicrosoftYaHei-Bold`，字形度量与设计稿存在偏差。
2. **渐变近似**：颜色停靠点/角度为近似值，未逐点还原 Figma 渐变节点。
3. **图层效果缺失**：Figma 的投影/内阴影/描边未以 Photoshop 图层样式重建，部分视觉层次变淡。
4. **网格背景**：以 1px 矢量矩形（28px 网格）近似原始网格纹理。
5. **文字层重排依赖**：仅运行 `build-psd-v2.mjs` 得到的中间 PSD，其文字层在 Photoshop 中需一次 `contents` 自赋值才会渲染；交付文件已包含该处理，此依赖已固化在流水线中并如实记录。
6. **形状改色的正确调用形式**：Photoshop 25.11 下，改 shape 纯色填充**仅** `contentLayer / ordinal / targetEnum` + `putObject('to','solidColorLayer',{color:{RGBColor:{red,grain,blue}}})` 形式生效；已废弃的 `Prpr/solidColor` 形式会被拒绝或**静默无效果**（本次已用像素证据捕获该“假通过”，并最终采用有效形式）。
7. **off-canvas 装饰层**：若干形状层有意超出画布，Photoshop 正常，但其它解析器读取时边界为负值/超界（已列为信息而非失败）。

---

## 6. 工具链限制（明确记录，未伪造）

- **ag-psd 可生成**：原生 Shape Layer（vectorMask+vectorFill，已被 Photoshop 识别为矢量形状层）、文字层、栅格层、隐藏层。
- **ag-psd 不能生成**：Smart Object。该步骤**必须**由 Photoshop 完成；本次已在 Photoshop 25.11 中真实执行（`duplicate` + `newPlacedLayer` + 非破坏性缩放），并将结果嵌入交付文件。
- 结论：**技术阻断不成立**（Photoshop 可用），但 Smart Object 生成依赖 Photoshop 这一事实已如实记录。

---

## 7. 实际 Diff / 测试结果 / commit SHA

- **基线**：`e63ea89f0aa23720e674edc4ec65ea0fd95595e6`
- **交付 commit**：`a835c59f665dbb354d434935e57d4d9a78ac8284` — `feat(ui-audit): PSD Pilot v2 可编辑性改进与 Photoshop 实测验收`
- **Diff 范围**：12 个新增文件，**全部位于 `ui-audit/psd/`**；无 `src/**`、无既有基线与 manifest 变更。
- **交付文件指纹**：`ui-audit/psd/pilot/CardWheel-Editable-v2.psd` — 23,579,934 bytes，SHA256 `7583EEEFF1BC29796C42EA822532553BA45EF7D24115E378193696A6182D198A`
- **测试结果**：
  - 结构验证 `validate-psd-v2.mjs` → **PASS**（shape=20, SO=4, text=14）
  - Photoshop 验收 `pilot-phaseC-acceptance.jsx` → **20/20 PASS**
  - 像素证据 `verify-visual-v2.mjs` → **6/6 PASS**

---

## 8. 复现步骤

```bash
# 1) 生成含原生 Shape Layer 的中间 PSD（无 Smart Object）
node ui-audit/psd/pilot/intermediate/build-psd-v2.mjs

# 2) 在 Photoshop 中：文字层重排 + 四季卡片转 Smart Object + 另存交付文件
#    运行 ui-audit/psd/pilot/intermediate/pilot-to-smart-objects.jsx
#    （依赖 Photoshop；输出 CardWheel-Editable-v2.psd 与 CardWheel-v2-composite.png）

# 3) 结构验证（失败即中止）
node ui-audit/psd/pilot/intermediate/validate-psd-v2.mjs \
  "ui-audit/psd/pilot/CardWheel-Editable-v2.psd" --expect-so=4 \
  --out="ui-audit/psd/pilot/validation-v2.json"

# 4) Photoshop 实测验收（需 Photoshop + COM/ExtendScript）
#    运行 ui-audit/psd/pilot/intermediate/pilot-phaseC-acceptance.jsx

# 5) 像素证据核验
node ui-audit/psd/pilot/intermediate/verify-visual-v2.mjs
```

---

## 9. Gate 判定

工单要求的五项 Photoshop 实际验收**全部通过**，且均有真实进程/像素级证据支撑；未发现文件损坏、编辑失败或结构性缺陷（Shape Layer 与 Smart Object 均为原生对象，无平面截图冒充）。

> **`PSD_PILOT_ACCEPTED`**

残余问题（§5）为**还原度层面的已知偏差**（字体/渐变/图层效果近似），不构成可编辑性或结构完整性缺陷，已如实记录并留给后续迭代。
