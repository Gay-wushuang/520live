# Photoshop 分层设计稿准备：Layer Map

> 本文描述如何把现有真实页面重建为分层 PSD。当前目录提供原始资源和截图基线，但**没有生成 PSD，也不把 PNG 截图声称为可编辑设计源文件**。

## 1. 建议画板

| 画板 | 尺寸 | 基线参照 |
|---|---:|---|
| Monopoly / Desktop | 1440×900 px | `screenshots/desktop/MON-01.desktop.png` |
| Monopoly / Wide | 1920×1080 px（内容可高于画板） | `screenshots/desktop/MON-wide.wide.full.png` |
| Monopoly / Mobile | 390×844 px | `screenshots/mobile/MON-01.mobile.png` |
| Card Wheel / Desktop | 1440×900 px | `screenshots/desktop/CARD-02.desktop.png` |
| Card Wheel / Mobile | 390×844 px | `screenshots/mobile/CARD-02.mobile.png` |
| Overlay / Desktop | 1440×900 px | `screenshots/desktop/OVL-*.desktop.png` |

全部截图为 DPR 1、浏览器缩放 100%。PSD 推荐使用 sRGB IEC61966-2.1、8 bit，并保留 1 CSS px = 1 PSD px。

## 2. 原始资源清单

资源已从 `public/` 原样复制到 `design-source/assets/`，便于独立交接。PSD 中应以“链接/嵌入智能对象”放置，不要栅格化后反复缩放。

| 资源 | 原路径 | 尺寸/类型 | 用途 |
|---|---|---:|---|
| `大富翁棋盘.png` | `public/大富翁棋盘.png` | 1254×1254 PNG | 棋盘底图，正方形智能对象 |
| `春/夏/秋/冬-积分卡.png` | `public/*-积分卡.png` | 各 1672×941 PNG | 四季转盘与收集卡缩略图 |
| `春/夏/秋/冬-壁纸.png` | `public/*-壁纸.png` | 各 1672×941 PNG | 收集档案和壁纸奖励弹窗 |
| `电脑壁纸.png` | `public/电脑壁纸.png` | 1672×941 PNG | 终极奖励关联素材 |
| `动态壁纸.mp4` | `public/动态壁纸.mp4` | MP4，9,708,345 bytes | 终极视频层；PSD 使用代表帧 + 视频资源注释 |
| `favicon.svg` | `public/favicon.svg` | 32×32 SVG | 站点图标，不是主页面视觉组件 |

`宣传海报.png`、`梦幻蕾丝少女的心形卧室.png`、`派露壁纸.png`、`猫堡壁纸.png` 当前未被主页面组件引用，因此没有复制进设计交接资源目录；如后续 UI 重构启用，应另行加入而非误标为当前基线内容。

## 3. 字体与文字

- 页面有效字体栈：`-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif`，中文在 Windows 上通常回退到系统中文字体。
- 源码大量使用 `cute-font` class，但 `src/index.css` 未定义该 class；PSD 不应假设存在额外“可爱字体”。
- 积分卡 Canvas 标签明确使用 `YouYuan, Microsoft YaHei, sans-serif`，18 px bold；中心“抽卡”为 15 px bold。
- SVG 事件轮盘引用 `var(--cute-font)`，但当前没有定义该 CSS 变量，实际仍会回退。
- 标题：大富翁 30/36 px、积分卡 36/48 px，`font-black`（约 900）。
- 常用正文：12–14 px、700；主操作按钮：18–20 px、900。
- 所有直播文案应保留为可编辑文字层；轮盘扇区文字需按当前最多 4 行、每行 6–7 个汉字的拆行策略重建。

## 4. 共用视觉基础

### 背景组 `00_BG`

1. `BG / Base radial`：`#FFF7ED` → `#FDF2F8`（42%）→ `#EEF6FF`。
2. `BG / Grid H`：28 px 间距、1 px、`rgba(251,191,36,0.18)`，整体 35% opacity。
3. `BG / Grid V`：28 px 间距、1 px、`rgba(244,114,182,0.14)`，整体 35% opacity。
4. 页面 padding：大富翁 16 px 水平 / 20 px 垂直；积分卡 16 px。
5. 主内容最大宽度：大富翁 1280 px；积分卡 1152 px。

### 卡片组 `CARD_STYLE`

- 常用圆角：8、12、16、28/32/36 px。
- 浅色卡片：白色 70–90% opacity，1–2 px amber/cyan 边框，轻度背景模糊。
- 大卡阴影：近似 `0 22px 50px rgba(180,83,9,0.14)`。
- 主按钮渐变：amber-400 → rose-400 → violet-400；白字，12 px 圆角。
- 事件色：积分 `#F59E0B`、厄运 `#B91C1C`、冒险 `#EA580C`、真心 `#DB2777`、特殊 `#0891B2`、周边 `#7C3AED`、混乱 `#4338CA`。

### 内联矢量与装饰

- 积分卡指针：40×92 SVG；主形 `#DC2626`，高光 `#F87171`，中心 `#7F1D1D`，白色 3 px 描边。
- 事件/周边轮盘指针：34×76 SVG；红色 `#EF4444`，白色 3 px 描边。
- 事件轮盘、周边轮盘均由运行时 SVG path 生成；应在 PSD 中重建为 Shape Layers，而不是从截图抠图。
- 四季图标是 emoji（🌸 ☀️ 🍁 ❄️）；事件和周边中心图标是文字字形（厄/冒/真/效/混、海/扇/枕），不是独立 SVG 文件。

## 5. 大富翁页面图层树

```text
MONOPOLY
├─ 00_BG
│  ├─ Base radial
│  ├─ Grid H
│  └─ Grid V
├─ 01_HEADER
│  ├─ Title gradient
│  ├─ Subtitle
│  ├─ Button / 打开积分抽奖
│  └─ Button / 重置棋盘
├─ 02_SIDEBAR (desktop 320 px; gap 20 px)
│  ├─ Audience Archive Card
│  │  ├─ Current User
│  │  ├─ Active Effect Chips
│  │  ├─ Direction Selector
│  │  ├─ Archive Controls
│  │  ├─ Viewer List
│  │  └─ Import Controls
│  ├─ Audit Log Card
│  └─ Wheel Legend Card
├─ 03_GAME_PANEL
│  ├─ Dice Card (wide breakpoint约 260 px)
│  ├─ Status / Current / Position / Next Move
│  ├─ Primary Roll Button
│  ├─ Board Frame (round 28 px)
│  │  ├─ Board Gradient Wash
│  │  ├─ Board Smart Object / 大富翁棋盘.png
│  │  ├─ 28 Hotspot Groups (label + number + optional highlight ring)
│  │  └─ Player Pieces P1…Pn (36/44 px circles + shadow)
│  ├─ Seven-item Legend
│  ├─ Pending Event Button
│  ├─ Last Event Banner
│  └─ System Message Banner
└─ 90_OVERLAYS
```

桌面主栅格为 `320 px + 20 px gap + remaining width`，小于 `lg` 时变为单栏，游戏面板在视觉顺序上先出现、侧栏后出现。棋盘容器为 1:1，最大 896 px；底图 `object-contain`。

## 6. 积分卡页面图层树

```text
CARD_WHEEL
├─ 00_BG (与大富翁共用)
├─ 01_HEADER
│  ├─ Back pill
│  ├─ Title gradient
│  └─ Subtitle
├─ 02_WHEEL_STAGE (max 768 px, round 36 px)
│  ├─ Ambient Glow
│  ├─ Hit Result Pill
│  ├─ Pointer SVG
│  ├─ Wheel Canvas 500×500
│  │  ├─ 4 radial-gradient sectors
│  │  ├─ 4 card-image smart objects
│  │  ├─ labels
│  │  ├─ multicolor border rings
│  │  └─ center hub
│  └─ Loading State (500×500 dashed circle + spinner)
├─ 03_ACTIONS
│  ├─ 抽取积分卡
│  └─ 重置游戏
├─ 04_COLLECTION (round 16 px, padding 24 px)
│  ├─ Archive Header + Controls
│  ├─ Stats / Total + Card Spins
│  ├─ Season Grid (1 / 2 / 4 columns by breakpoint)
│  │  └─ Season Card ×4
│  │     ├─ Emoji + labels
│  │     ├─ Card thumbnail
│  │     ├─ Wallpaper thumbnail
│  │     ├─ 0/2 progress
│  │     ├─ Goal pill
│  │     └─ Unlock check badge
│  ├─ History Chips
│  └─ Audit Logs
└─ 90_OVERLAYS
```

Canvas 几何：500×500；中心 (250,250)；扇区半径 220；卡图约半径的 46%；外圈线宽 14 px + 白色外环 6 px；中心圆半径 38。

## 7. 覆盖层 PSD 分组

```text
90_OVERLAYS
├─ Result Modal / OVL-RES-01
│  ├─ Black scrim 70% + blur
│  ├─ Panel max 448 px, round 24 px, padding 32 px
│  ├─ Close button 36 px
│  ├─ Title glow
│  ├─ Reward image 256 px high
│  └─ Confetti particles
├─ Event Wheel / OVL-EVT-*
│  ├─ Violet scrim 65% + blur
│  ├─ Panel max 672 px, round 28 px, padding 24 px
│  ├─ Pointer
│  ├─ SVG Wheel 430 px max
│  └─ Result card
├─ Figure Wheel / OVL-FIG-*
│  ├─ Violet scrim 70% + blur
│  ├─ Panel max 576 px
│  ├─ Pointer
│  ├─ SVG Wheel 320 px
│  └─ Result card
├─ Wallpaper Reward / OVL-WALL-01
│  ├─ #090714 scrim 88% + radial lights
│  ├─ Panel max 768 px, round 32 px
│  ├─ Wallpaper smart object 240/288 px high
│  ├─ Image label
│  ├─ Claim button
│  └─ Light particles
└─ Ultimate Video / OVL-VID-*
   ├─ #070712 base + radial lights + stage lines
   ├─ Aura / rings / particles
   ├─ Panel max 1024 px, round 32 px
   ├─ Header + close/claim button
   ├─ Video representative frame (16:9)
   ├─ Scan + vignette overlays
   ├─ Reward package footer
   └─ Loading spinner variant
```

`OVL-WALL-02` 的终极双图分支为源码不可达状态，不应在“当前实现”PSD 中伪造为已验证画面；如设计师需要表达意图，应放在单独的 `CONCEPT / UNREACHABLE` 组，并明确标注非运行基线。

## 8. Photoshop 命名与组合规则

- 组名使用 `NN_AREA / STATE`，可重复组件用 `COMP / Name / Variant`。
- 图片全部置为 Smart Object；棋盘热点、轮盘扇区、进度条、按钮与圆角卡片使用 Shape Layer。
- 每个交互状态只切换可见性，不复制整页：`STATE / Default`、`STATE / Rolling`、`STATE / Pending`、`STATE / Result`。
- 动画采用注释图层记录 duration/easing：骰子 1600 ms；棋子 260 ms/格；事件轮盘 3600 ms；周边轮盘 3300 ms；积分卡转盘 5000 ms。
- 动态视频用代表帧智能对象，并在同组放置 `SOURCE: 动态壁纸.mp4` 文本注释；加载 spinner 单独一组。
- 建议把 `screenshots/overview/ALL.png` 置于最上方 `REFERENCE` 组并锁定，逐画板用 Difference blend mode 做对照。
