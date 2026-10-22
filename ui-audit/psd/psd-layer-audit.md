# PSD Pilot v0 — 图层审计

## Gate

`PSD_PILOT_ACCEPTED`

最终 `pilot/CardWheel-Editable.psd` 已在 Adobe Photoshop 2024（25.11.0）实际打开、检查图层并导出 PNG。在同版验收副本 `pilot/CardWheel-Photoshop-QA-v3.psd` 上，中文标题的修改、保存、重开确认、还原及再次重开均通过。桌面画面捕获仍超时，应用内验证由 Photoshop 脚本接口完成。QA 中间副本（`CardWheel-Photoshop-QA*.psd`）仅存于本机，不入库。

## 基准

- 截图 ID：`CARD-02`
- 状态：转盘就绪、抽取按钮可用
- 画布：1440×900 px，DPR 1
- 原截图：`../screenshots/desktop/CARD-02.desktop.png`
- 交付参照：`pilot/CardWheel-Reference.png`
- 交付参照图 SHA-256 为 `5cf7692c9ed66b6385e71d2d486b054e54951edfa4720817e9f77e290822412e`。当前截图基线的同 ID 文件已重新采集，SHA-256 为 `7e4e3d4bbc08ce61b64e0a190a6656b49a80cc3c591f980635877cf29035acbd`；试点仍以冻结的交付参照图为准。

## PSD 结构统计

| 类型 | 数量 | 说明 |
|---|---:|---|
| 分组 | 7 | 含背景、页头、轮盘舞台、轮盘子组、操作区、收集区、隐藏参考组 |
| 原生可编辑文字层 | 14 | 中文标题、说明、按钮、四季标签、中心文字与收集区文字 |
| Photoshop Shape Layer | 0 | 本地 PSD 写入器未生成 Photoshop 原生 Shape 记录 |
| 智能对象 | 0 | 四季原图在 PSD 内为独立像素层；原始大图另存于 design-source |
| 栅格层 | 18 | 4 张卡图、13 个独立 UI/轮盘元素、1 张隐藏参考图 |
| 总图层/组节点 | 39 | 不含 PSD 根节点 |

PSD 为 RGB、8 bit、1440×900 px，文件大小 5,760,725 bytes。PSD 中不存在用单一可见截图伪装源文件的情况；整张参考截图仅位于隐藏的 `REFERENCE / Hidden` 组。

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

- 关键中文文字均被 Photoshop 识别为可编辑 Type Layer，共 14 层；最终文字字体为 Photoshop 已安装的 `MicrosoftYaHei` / `MicrosoftYaHei-Bold`。
- 四个扇区、边框、中心轴、指针、两枚按钮和舞台背景均拆为独立层；PSD 内为独立像素层，不是单一合成图。
- 四季卡图各为独立像素层，图层名保留源码季节语义；对应 1672×941 原图仍位于 `../design-source/assets/`。
- Figma 中间稿保留更多原生结构：14 个文字节点、95 个矢量/线条节点、4 个独立图片填充节点、126 个子节点。
- Figma 文件：<https://www.figma.com/design/h8fXc30u5ysk5r2kWL20XS>

## 独立检查

1. `ag-psd` 对最终版读取成功：尺寸、分组、文字层和栅格层计数均符合预期。
2. Photoshop 2024 对最终版读取成功：7 个组、14 个 Type Layer、18 个 Pixel Layer；从该 PSD 导出 1440×900 PNG：`pilot/intermediate/CardWheel-Photoshop-Render-v3.png`。
3. 在同版验收副本中，中文标题修改、保存、重开确认、还原、再次保存重开均成功。
4. Photoshop 最终导出与冻结参照图：RGB 平均绝对误差 7.19/255；平均通道误差 >12 的像素占 11.22%。
5. PSD SHA-256：`286a1da94192bfc2135bbd12b2181d044890ab2b5e49aba77ac93483ab02c1bc`。

## 剩余限制

- Photoshop 原生 Shape Layer / Smart Object 数量仍为 0；轮盘扇区、按钮和卡图是独立栅格层。
- 与参照图仍有卡图裁切、圆角、标签描边和舞台环境光差异；本 Gate 不表示像素级一致。
- Windows 桌面窗口画面捕获在 RDP 与本机控制台均超时；最终版已通过 Photoshop 自身接口完成检查和 PNG 导出。

