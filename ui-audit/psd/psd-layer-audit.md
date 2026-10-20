# PSD Pilot v0 — 图层审计

## Gate

`PSD_PILOT_UNVERIFIED`

已实际生成并用两个独立解析器读取 `pilot/CardWheel-Editable.psd`，但当前主机未检测到 Adobe Photoshop，无法完成 Photoshop 打开、文字回写、保存后的实际验收，因此不得标记 `PSD_PILOT_ACCEPTED`。

## 基准

- 截图 ID：`CARD-02`
- 状态：转盘就绪、抽取按钮可用
- 画布：1440×900 px，DPR 1
- 原截图：`../screenshots/desktop/CARD-02.desktop.png`
- 交付参照：`pilot/CardWheel-Reference.png`
- 两者 SHA-256 均为 `5cf7692c9ed66b6385e71d2d486b054e54951edfa4720817e9f77e290822412e`

## PSD 结构统计

| 类型 | 数量 | 说明 |
|---|---:|---|
| 分组 | 7 | 含背景、页头、轮盘舞台、轮盘子组、操作区、收集区、隐藏参考组 |
| 原生可编辑文字层 | 14 | 中文标题、说明、按钮、四季标签、中心文字与收集区文字 |
| Photoshop Shape Layer | 0 | 本地 PSD 写入器未生成 Photoshop 原生 Shape 记录 |
| 智能对象 | 0 | 四季原图在 PSD 内为独立像素层；原始大图另存于 design-source |
| 栅格层 | 18 | 4 张卡图、13 个独立 UI/轮盘元素、1 张隐藏参考图 |
| 总图层/组节点 | 39 | 不含 PSD 根节点 |

PSD 为 RGB、8 bit、1440×900 px，文件大小 5,760,177 bytes。PSD 中不存在用单一可见截图伪装源文件的情况；整张参考截图仅位于隐藏的 `REFERENCE / Hidden` 组。

## 主要图层树

```text
00_BG
└─ BG / Base radial + grid [RASTER]
01_HEADER
├─ Back pill / Shape [RASTER]
├─ Back text [TEXT]
├─ Title / 积分卡转盘 [TEXT]
└─ Subtitle [TEXT]
02_WHEEL_STAGE
├─ Stage / Glass panel [RASTER]
├─ Wheel / Editable parts
│  ├─ Sector / Spring|Summer|Autumn|Winter [4 RASTER]
│  ├─ Wheel / Border rings [RASTER]
│  ├─ Card image / Spring|Summer|Autumn|Winter [4 RASTER]
│  ├─ Label / 春季|夏季|秋季|冬季 [4 TEXT]
│  ├─ Wheel / Center hub [RASTER]
│  └─ Hub / 抽卡 [TEXT]
└─ Pointer / Main + highlight + pin [RASTER]
03_ACTIONS
├─ Primary button / Shape [RASTER]
├─ Button label / 抽取积分卡 [TEXT]
├─ Secondary button / Shape [RASTER]
└─ Button label / 重置游戏 [TEXT]
04_COLLECTION / Visible top
├─ Collection / Visible panel top [RASTER]
└─ 4 editable text layers
REFERENCE / Hidden
└─ CARD-02.desktop.png [HIDDEN RASTER]
```

## 可编辑性结论

- 关键中文文字均被两个解析器识别为 Type Layer，共 14 层。
- 四个扇区、边框、中心轴、指针、两枚按钮和舞台背景均拆为独立层；PSD 内为独立像素层，不是单一合成图。
- 四季卡图各为独立像素层，图层名保留源码季节语义；对应 1672×941 原图仍位于 `../design-source/assets/`。
- Figma 中间稿保留更多原生结构：14 个文字节点、95 个矢量/线条节点、4 个独立图片填充节点、126 个子节点。
- Figma 文件：<https://www.figma.com/design/h8fXc30u5ysk5r2kWL20XS>

## 独立检查

1. `ag-psd` 读取成功：尺寸、分组、文字层和栅格层计数均符合预期。
2. `psd-tools` 读取成功：识别 7 个组、14 个 Type Layer、18 个 Pixel Layer，且可合成 1440×900 PNG。
3. 合成预览：`pilot/intermediate/CardWheel-PSD-Composite.png`。
4. PSD SHA-256：`7e6a62489d07567948bb4c8a4ce8c3f87ac07b06eb19c2810bc7172674e8fd12`。

## 未验证项

- Adobe Photoshop 实际打开、字体替换提示、中文文字修改与另存回写。
- Photoshop 原生 Shape Layer / Smart Object 转换。
- 在安装了 `Noto Sans SC` 的 Photoshop 环境中确认字重与行高；PSD 包含文字像素回退预览，但文字对象仍使用 `NotoSansSC-*` 名称。

