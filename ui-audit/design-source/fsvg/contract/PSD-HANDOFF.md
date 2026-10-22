# SVG → Photoshop PSD handoff / 功能源分层规范

**状态：准备就绪（结构），Photoshop 原生层验收未执行。**

## 一、图层分组

一个独立 SVG 文件对应一个 PSD 主画板。导出 PSD 后，顶层统一命名：

- `00-ARTBOARD`：画布与底色。
- `10-LAYOUT`：布局容器、分栏、网格。
- `20-CONTENT`：可编辑文字、描述、统计与资产插槽。
- `30-CONTROLS`：Button / Field / Select / Dice Action。
- `40-STATUS`：状态标签、位置、高亮、进度、Token。
- `50-OVERLAYS`：模态框、结果面板、遮罩。

保留所有含 `data-func` 的 `g` 节点名称作为 Photoshop 组名；所有 `MON-CELL-xx`、`CARD-WHEEL-ART-xx`、`CARD-COLLECTION-ART-xx` 为不可合并的独立资产节点。

## 二、原生对象映射

| SVG | PSD 建议实现 | 注意 |
|---|---|---|
| `rect`, `circle`, `path` | 原生 Shape Layer / 向量蒙版 | 不能仅以栅格预览充当矢量层 |
| `text` | 可编辑 Type Layer | 转换字体缺失时要显式告警；不自动转曲 |
| `g[data-component]` / `g[data-func]` | Photoshop Group | 完整保留 ID、语义和层级 |
| `CARD-WHEEL-ART-*`, `CARD-COLLECTION-ART-*` | 嵌入 Smart Object | 等待后续真实季节素材，不在功能稿嵌入伪资源 |
| `OVERLAY-VIDEO-ASSET` | 智能对象或明确视频预览占位 | PSD 不等于可交互播放器 |

## 三、一致性规则

1. 更改功能型样式只允许通过 `DESIGN-TOKENS.json` 或定义明确的组件属性进行。
2. 各状态截图的相同按钮、输入框、卡片和弹窗必须指向同一组件定义，不能各自临摹。
3. 不允许为装饰性目的使用无法解释的信息符号；灰阶稿不包含美术纹样。
4. 转 PSD 之前冻结 `FUNCTION-MATRIX.json`、`STATE-MATRIX.json` 和组件母版；未来新增组件必须更新这些映射。
5. Photoshop 实测须核对 Type Layer、Shape Layer、Smart Object 真实数量；完成编辑→保存→重开→核验，方可宣布 PSD Gate。

## 四、禁止的错误声明

- 把整张 SVG 导入为一个 Photoshop Smart Object，不能声称“每个控件可编辑”。
- 嵌入一张完整截图作为背景，不能声称“功能型源已完成”。
- 静态 SVG/PSD 只是设计表达，不能代替 React 源码逻辑与端到端测试。

## 五、未完成项

- 现有设计已映射 46/46 截图候选以及 50/50 截图变体（v1.1，含 OVL-WALL-02 终极双图弹窗），但 **源码函数/状态分支的完整审计尚未执行**。
- `OVL-WALL-02` 在 v1 曾保留 BLOCKED；新基线已可达并补齐 `states/OVL-WALL-02.desktop.svg`，说明见 `BLOCKED-OVL-WALL-02.md`。
- FSVG 套件整体转 PSD 待后续开展；CardWheel 单页试点已在 `ui-audit/psd/` 完成 Photoshop 实机验收。
