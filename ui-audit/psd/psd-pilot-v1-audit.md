# PSD Pilot v1 — Phase A 只读审计报告

- 仓库：`https://github.com/Gay-wushuang/520live`
- 基线提交：`e63ea89f0aa23720e674edc4ec65ea0fd95595e6`
- 审计方式：只读。未修改任何既有文件；本报告为新增文件。
- 审计时点 Gate：**`PSD_PILOT_UNVERIFIED`**（维持不变，理由见 §7）

---

## 1. HEAD / 工作树 / 真实 Diff

| 项 | 实测结果 |
|---|---|
| `git rev-parse HEAD` | `e63ea89f0aa23720e674edc4ec65ea0fd95595e6` —— **与工单基线完全一致** |
| 分支 | `main` |
| 工作树 | **干净**：`git status --short` 无任何输出（无修改、无暂存、无未跟踪） |
| 未提交 Diff | **不存在**。Phase A 的"真实 Diff"为空集 |

`e63ea89` 相对父提交 `8dcf215` 的实际内容：**92 files changed, 4895 insertions(+), 0 deletions(-)**，全部为新增。可归为四类：

1. `ui-audit/**`：manifest、截图基线（desktop/mobile/overview）、`tools/capture.mjs`、`design-source/**`、`psd/**`；
2. `reports/**`：上一阶段的三份 UI 审计报告（`ui-inventory.md` / `ui-issues.md` / `capture-plan.md`）；
3. `package.json` / `package-lock.json`：新增 Playwright / Sharp 与 `capture:ui` 脚本；
4. 4 张原本未跟踪的 `public/*.png` 也被一并提交。

**关键校验：`git diff --name-only HEAD~1 HEAD | grep '^src/'` 为空 —— `src/**` 在本阶段与上一阶段均未被改动。** 与工单约束一致。

---

## 2. 已读取的产物与脚本

| 文件 | 性质 | 读取结论 |
|---|---|---|
| `ui-audit/psd/conversion-report.md` | 人工报告 | 结论 `PSD_PILOT_UNVERIFIED`；已如实记录无 Photoshop |
| `ui-audit/psd/psd-layer-audit.md` | 人工报告 | 明确 Shape Layer=0、Smart Object=0，未伪装成功 |
| `ui-audit/psd/pilot/intermediate/validation.json` | 机器输出 | 结构统计 + 像素误差，**全部为统计量** |
| `ui-audit/psd/pilot/intermediate/validate-psd.mjs` | 验证脚本（Node/ag-psd） | **仅 1 处真实断言**，见 §4 |
| `ui-audit/psd/pilot/intermediate/validate_psd.py` | 验证脚本（Python/psd-tools） | **0 处断言**，且当前**不可运行**，见 §4/§6 |
| `ui-audit/psd/pilot/intermediate/build-psd.mjs` | 生成脚本 | **0 处断言**；用 ag-psd 写入 |
| `ui-audit/design-source/layer-map.md` | 设计规范 | 明确要求"图片全部置为 Smart Object；按钮/圆角卡片/扇区使用 Shape Layer"——当前 PSD **未满足** |

---

## 3. PSD 结构独立复核（本机实测，非引用既有报告）

用 `ag-psd@31.0.3` 只读读取 `ui-audit/psd/pilot/CardWheel-Editable.psd`，**未使用**既有 `validation.json` 的数值：

| 指标 | 实测 | 与报告是否一致 |
|---|---|---|
| SHA-256 | `7e6a62489d07567948bb4c8a4ce8c3f87ac07b06eb19c2810bc7172674e8fd12` | ✅ 一致 |
| 字节数 | 5,760,177 | ✅ |
| 尺寸 | 1440 × 900 | ✅ |
| 色彩模式 | RGB（colorMode=3） | ✅ |
| 分组 / 文字 / 栅格 / 合计 | 7 / 14 / 18 / 39 | ✅ |
| 隐藏参考图 | `REFERENCE / CARD-02.desktop.png / LOCK MANUALLY`，`hidden=true` | ✅ |
| **Shape Layer（vectorMask）数量** | **0** | ✅ 与报告一致 |
| **Smart Object（placedLayer）数量** | **0** | ✅ 与报告一致 |

参照图哈希复核：`CardWheel-Reference.png` 与 `screenshots/desktop/CARD-02.desktop.png` **同为** `5cf7692c9ed66b6385e71d2d486b054e54951edfa4720817e9f77e290822412e` —— 报告声明属实。

`build-psd.mjs` 的产出机制（已逐行确认）：
- 所有形状（背景、舞台、4 扇区、外环、中心轴、指针、2 按钮、返回胶囊、收集面板）均经 `sharp` 把 SVG 栅格化为 `imageData` → **纯像素层，非原生 Shape Layer**（`svgLayer()`，L18-L21）。
- 四季卡图经 `sharp().resize(104,104)` 栅格化 → **纯像素层，非 Smart Object**（`imageLayer()`，L23-L26）。
- 文字层用 `textLayer()` 写入 `text` 属性 → **原生 Type Layer**，但同时被 `renderEditableTextFallbacks()` 附上 `Microsoft YaHei` 栅格回退（L128-L148）。
- 末尾 `toPsdStackOrder()` 反转每个 group 的子层顺序（L152-L156）。
- 写入调用：`writePsdBuffer(psd, { invalidateTextLayers: true })`（L158）。

---

## 4. 断言 vs 统计——这是本次审计最关键的发现

### `validate-psd.mjs`

- **真实断言：仅 1 处** —— L34：`if (ref.info.width !== figma.info.width || ...) throw`（参照图与 Figma 导出的宽高一致性）。
- 其余全部是**统计量**，只写入 JSON、**不产生任何失败**：
  - `psd.width` / `psd.height` / `bytes`：打印但**未断言**必须为 1440×900；
  - `counts`（groups/text/raster/hiddenReference/total）：**未断言**必须为 7/14/18/1/39；
  - `comparison.*.meanAbsoluteRgbError`、`changedPixelRatioOver12PerChannel`：**未设阈值、未断言**；
  - `tree`：仅字符串快照。
- **更重要的缺陷**：该脚本比较的是 `intermediate/CardWheel-PSD-Composite.png`（一个**既有的、由外部 `psd_tools` 预先渲染的 PNG 文件**），**不是**在脚本运行时从 PSD 自身重新合成。因此"PSD 合成预览 vs 原截图"这一指标实际度量的是**一张陈旧外部 PNG**，与 PSD 当前内容无强绑定 —— 名实不符。
- 该脚本以 `skipLayerImageData/skipCompositeImageData` 读取，**不验证 PSD 内部像素/合成**。

### `validate_psd.py`

- **真实断言：0 处**。脚本只统计图层种类与数量、调用 `psd.composite(force=True)` 存一张 PNG，然后 `print(json.dumps(...))`。无任何 `assert`、无退出码控制 → **不可能失败**。
- 且 `psd_tools` **在本机未安装**（`python -m pip list` 无匹配；`import psd_tools` → `ModuleNotFoundError`），仓库内也无 venv → **该脚本当前不可复现**。报告中"psd-tools 读取成功"的结论**无法在本机重新验证**。

### `build-psd.mjs`

- **0 处断言**。构建失败只会因文件读写异常抛出，不会因"结构不符合规格"而中止。例如若不慎退化为单张平面截图，脚本不会报错。

**结论：现有三件套不存在"失败即中止"的结构性门禁。** 这直接对应工单 Phase B 的"为关键结构指标增加失败即中止的自动验证"。

---

## 5. Photoshop 环境检查（结论：本机**可用**）

| 探测项 | 结果 |
|---|---|
| `HKLM\SOFTWARE\Adobe\Photoshop\180.0` | 存在，`ApplicationPath = E:\Adode\Ps\Adobe Photoshop 2024\` |
| `HKLM\SOFTWARE\Adobe\Photoshop\170.0` | 存在（`PluginPath = E:\Adode\Ps\Adobe Photoshop 2024\Plug-Ins\`） |
| 可执行文件 | **`E:\Adode\Ps\Adobe Photoshop 2024\Photoshop.exe` 实际存在** |
| 其他 | `PhotoshopPrefsManager.exe`、Adobe Creative Cloud Experience 存在 |

**与上一阶段报告相反**：`conversion-report.md` / `psd-layer-audit.md` 声称"当前环境没有 Adobe Photoshop"。经本机重新探测，**Photoshop 2024 已安装且路径可定位**（位于 `E:\Adode\Ps\`，非默认 Program Files，故此前按默认路径搜索未命中）。

因此：
- **`PHOTOSHOP_NOT_AVAILABLE` 不成立**；
- Phase C 的实机验收**具备执行条件**；
- 但**尚未执行**任何 Photoshop 打开/编辑/保存/重开动作 → 目前仍不得标记 `PSD_PILOT_ACCEPTED`。

---

## 6. 工具链能力评估（决定 Phase B 可行性）

对 `ag-psd@31.0.3` 写入能力的源码级核实：

| 能力 | 证据 | 结论 |
|---|---|---|
| 原生 Type Layer | `build-psd.mjs` 已产出，14 层 | ✅ 已具备 |
| **Vector Mask（=Shape Layer 基础）** | `additionalInfo.js` L215 `addHandler('vmsk', hasKey('vectorMask'), read, write)`；写函数 L228-L264；`psdWriter.js` L333 对 `layer.vectorMask` 置标志位 | ✅ **可写入**，但当前 PSD 未使用 |
| **Smart Object（placedLayer）** | `additionalInfo.js` L958 `addHandler('PlLd', ...)` 且 L989-L1001 存在写分支；L1959 `addHandler('SoLd', ...)`；L1930 明确要求提供链接图宽高（lnk2） | ⚠️ **存在写入路径，但需实测验证 Photoshop 是否接受**（属高风险点） |
| 纯色/渐变填充（SoCo/GdFl） | `descriptor.js` L1570 / L1576 存在序列化 | ✅ 可用于构造填充层 |
| 平面截图冒充 | 当前 PSD **无**整页可见截图层；仅隐藏 `REFERENCE` 组 | ✅ 未发生 |

**技术阻断预判**：`ag-psd` 的 Shape Layer 支持是"fill layer + `vmsk` 矢量蒙版"，**不是** Photoshop 图形工具生成的、带 `vogk`（矢量原点）的完整 Shape 记录。Photoshop 能否把这些层识别为可编辑形状而非普通蒙版层，**必须由 Phase C 实测判定**，现在不得预设成功。

---

## 7. 其他已确认问题

1. **字体名不可用**：文字层声明 `NotoSansSC-Regular/Bold/Black` 这类 **PostScript 名**，本机未见该字体族；同时栅格回退用的是 `Microsoft YaHei`（`build-psd.mjs` L140）。预期 Photoshop 打开时会提示**字体缺失并替换** → 直接影响 Phase C 第 2 项"中文文字可修改"的观感与字重。
2. **图层越出画布**：`Archive status` 边界为 `[172, 894, 552, 916]`、`Collection title` 为 `[172, 865, 472, 901]`，**bottom 超出 900 画布**（`Collection / Visible panel top` 实际被裁到 66 px 高，而 SVG 原设 120 px）。
3. **收集区为"半屏"简化**：`04_COLLECTION / Visible top` 仅重建了页面底部露出的档案条，未重建完整 CollectionStatus 组件 → 与 `layer-map.md` §6 的完整树不一致（属已知简化，需在报告中持续标注）。
4. **`OVL-WALL-02` 不可达已正确处理**：`layer-map.md` §7 明确要求该态放入 `CONCEPT / UNREACHABLE` 而非当前实现 —— 与上一阶段调查结论一致，未伪造。
5. **Figma 中间产物完整保留**：`CardWheel-Figma.svg/pdf/png` 均在，未被删除。

---

## 8. 复现性与基线完整性

- 既有截图基线 `ui-audit/screenshots/**` 与 `ui-audit/manifest.json` **在审计中未被读取修改、未被重写**。
- PSD 哈希、参照图哈希、源截图哈希三者经本机独立复算，与报告记载**逐字节一致** → 基线未被污染。
- `reports/**` 与 `ui-audit/**` 均在 `e63ea89` 中受版本控制，后续 Phase B 改动可精确 diff。

---

## 9. Phase A 结论

| 问题 | 判定 |
|---|---|
| 文件损坏？ | **否**。PSD 可被 ag-psd 完整解析，尺寸/模式/结构自洽 |
| 结构缺陷？ | **是（已知且已如实记录）**：Shape Layer=0、Smart Object=0，未满足 `layer-map.md` 规范 |
| 平面截图冒充可编辑源？ | **否**。无整页可见截图层 |
| 验证是否可信？ | **部分不可信**：无失败门禁；PSD 合成指标引用陈旧外部 PNG；psd_tools 不可复现 |
| Photoshop 可用？ | **是**（`E:\Adode\Ps\Adobe Photoshop 2024\Photoshop.exe`） |
| Phase C 可执行？ | **是**，条件具备，尚未执行 |
| 当前 Gate | **`PSD_PILOT_UNVERIFIED`** —— 维持，因 Photoshop 实测验收尚未发生 |

Phase A 为只读，未产生任何业务代码或既有文件的修改。
