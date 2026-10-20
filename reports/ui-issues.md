# UI/UX 静态审计与重构优先级（ui-issues.md）

- 基线提交：`8dcf2151799088d97d6c53f5751a86b1b9a347dc`
- 方法：**纯静态源码审计**。
- 标记约定：
  - **[源码证实]** — 结论可由代码文本直接证明（如类名未定义、层级魔数、重复实现），无需运行。
  - **[待截图确认]** — 属于观感/布局/可读性判断，静态分析无法验证，必须由截图阶段取证。

---

## 1. 结论摘要

| 维度 | 判定 | 依据类型 |
|---|---|---|
| 视觉设计语言一致性 | **差**：同一产品内存在"浅色清新"与"深色炫光"两套语言 | 源码证实 |
| 配色/字体/间距/圆角 | **散落硬编码，无令牌体系** | 源码证实 |
| 布局层级与信息密度 | 大富翁侧栏信息密度高、字号偏小；积分卡页偏松 | 源码 + 待截图 |
| 组件重复与样式分散 | 关闭按钮 ×4、档案管理 ×2、日志复制导出 ×2、背景网格 ×2 | 源码证实 |
| 操作反馈 | 单条文本充当全局状态提示，成功/失败混用同一位 | 源码证实 |
| 响应式风险 | 积分卡加载占位固定 500×500、canvas 固定尺寸 | 源码证实（溢出后果待截图） |
| UI 与业务状态耦合 | 高：文案即逻辑（字符串包含匹配驱动效果/事件判定） | 源码证实 |

---

## 2. [源码证实] 问题清单

### S1 · 关键样式类未定义，设计意图落空 —— P0
- `cute-font` 类被 6 个文件大量使用（[MonopolyGame.tsx](file:///e:/ERE/Documents/Work/直播轮盘/src/pages/MonopolyGame.tsx#L349)、[CardWheelPage.tsx](file:///e:/ERE/Documents/Work/直播轮盘/src/pages/CardWheelPage.tsx#L79)、`EventWheel`、`FigureWheel`、`GameBoard`、`DiceBox`、`ResultModal`、`VideoRewardPlayer`），但 **`src/index.css` 与 `tailwind.config.js` 中均无 `.cute-font` 定义**，Tailwind 也未 `extend.fontFamily` → 该类**完全不生效**。
- CSS 变量 `--cute-font` 被 6 处以 `fontFamily: 'var(--cute-font)'` 引用（SVG `<text>`），但**从未定义**（[EventWheel.tsx L163](file:///e:/ERE/Documents/Work/直播轮盘/src/components/EventWheel.tsx#L163)、[FigureWheel.tsx L92](file:///e:/ERE/Documents/Work/直播轮盘/src/components/FigureWheel.tsx#L92)）→ SVG 文字使用浏览器默认字体。
- `piece-hop` 类在 [GameBoard.tsx L98](file:///e:/ERE/Documents/Work/直播轮盘/src/components/GameBoard.tsx#L98) 按 `isMoving` 追加，但**该动画未在任何 CSS 中定义** → "棋子跳跃"动效不存在，仅剩 `transition-[left,top]` 平移。
- 影响：所谓"可爱字体/跳跃棋子"的产品标识全部缺失，且属于**全局生效**问题（一次修复收益最大）。
- 佐证不一致：[AGENTS.md](file:///e:/ERE/Documents/Work/直播轮盘/AGENTS.md) 明确宣称 `font-family: var(--cute-font)` 与 `piece-hop` 动效，文档与实现已偏离。

### S2 · 两套视觉语言在同一流程内切换 —— P0（待截图确认严重程度）
- 浅色系：`radial-gradient(circle_at_top,#fff7ed…,#eef6ff)` + 白卡 + amber/rose/violet（两个页面主体）。
- 深色系：`bg-[#090714]/[0.88]`、`bg-[#070712]`、黑色玻璃拟态（[WallpaperRewardModal L48](file:///e:/ERE/Documents/Work/直播轮盘/src/components/WallpaperRewardModal.tsx#L48)、[VideoRewardPlayer L78](file:///e:/ERE/Documents/Work/直播轮盘/src/components/VideoRewardPlayer.tsx#L78)）。
- 过渡：`EventWheel`/`ResultModal`/`FigureWheel` 用 `bg-violet-950/65`、`bg-black/70` 半透遮罩，又是第三种。
- 结果：同一次"抽卡 → 中奖 → 领奖"交互里，界面在 浅→中灰→纯黑 之间跳变。
- **[待截图确认]**：实际是否造成突兀感、深色面板上浅色文字的对比度是否达标。

### S3 · 无设计令牌，颜色/圆角/字号硬编码散落 —— P0
- 颜色：事件色在 [monopolyStore.ts L48-L115](file:///e:/ERE/Documents/Work/直播轮盘/src/stores/monopolyStore.ts#L48-L115) 定义，但 UI 层另有大量任意色（`bg-[#090714]`、`bg-[#070712]`、`from-amber-400 via-rose-400 to-violet-400`、`shadow-[0_22px_50px_rgba(180,83,9,0.14)]`）。
- 圆角：`rounded-[28px]`（MonopolyGame 主区、EventWheel、FigureWheel）、`rounded-[32px]`（WallpaperRewardModal、VideoRewardPlayer）、`rounded-[36px]`（CardWheelPage 转盘容器）、`rounded-3xl`。四种"大圆角"并存，无规则。
- 字号：`text-[9px]`、`text-[11px]`、`text-[8px]`、`text-[6.5px]`（[FigureWheel L98](file:///e:/ERE/Documents/Work/直播轮盘/src/components/FigureWheel.tsx#L98)、[GameBoard L66-L82](file:///e:/ERE/Documents/Work/直播轮盘/src/components/GameBoard.tsx#L66-L82)）。
- 颜色透明度以字符串拼接实现：`fill={`${color}c9`}`、`borderColor: `${color}55``（[EventWheel L110/L151](file:///e:/ERE/Documents/Work/直播轮盘/src/components/EventWheel.tsx#L110-L151)）→ 隐含"颜色必为 6 位 hex"的脆弱假设。
- 建议方向：抽出 design tokens（`--event-*`、`--radius-*`、`--font-*`），并统一 `cute-font` 的真实字体栈。

### S4 · 组件与样式重复实现 —— P1
- **关闭按钮**：4 套近似 JSX（`h-9 w-9 rounded-full border`），仅边框/文字色不同：[EventWheel L111-L118](file:///e:/ERE/Documents/Work/直播轮盘/src/components/EventWheel.tsx#L111-L118)、[FigureWheel L46-L53](file:///e:/ERE/Documents/Work/直播轮盘/src/components/FigureWheel.tsx#L46-L53)、[ResultModal L54-L61](file:///e:/ERE/Documents/Work/直播轮盘/src/components/ResultModal.tsx#L54-L61)、`WallpaperRewardModal` 无关闭按钮（仅领取）。
- **档案管理 UI 两套**：`MonopolyGame` 侧栏（保存/读取/新档案 + `archiveMessage`）与 `CollectionStatus`（保存名称/保存存档/读取存档/新建/删除）功能重叠、文案与控件不一致，且**分属两个互不同步的 Store**（`monopoly-audience-state` vs `season-wheel-game-state`）。
- **日志复制/导出两套**：[MonopolyGame L311-L334](file:///e:/ERE/Documents/Work/直播轮盘/src/pages/MonopolyGame.tsx#L311-L334) 与 [CollectionStatus L103-L126](file:///e:/ERE/Documents/Work/直播轮盘/src/components/CollectionStatus.tsx#L103-L126) 逻辑近似（复制文本 + 调用 `exportAuditCsvFiles`）。
- **背景装饰重复**：两页的 `radial-gradient` 背景 + 28px 网格叠加几乎逐字重复（[MonopolyGame L349-L357](file:///e:/ERE/Documents/Work/直播轮盘/src/pages/MonopolyGame.tsx#L349-L357) vs [CardWheelPage L79-L87](file:///e:/ERE/Documents/Work/直播轮盘/src/pages/CardWheelPage.tsx#L79-L87)）。
- **底栏排版模板重复**：两页都是"胶囊按钮 + 白卡 + 阴影"结构。

### S5 · 渲染期随机数 —— P1
- [ResultModal L94-L105](file:///e:/ERE/Documents/Work/直播轮盘/src/components/ResultModal.tsx#L94-L105)：撒花圆点的 `top/left/animationDelay/animationDuration` 在 **JSX 内直接 `Math.random()`**，每次重渲染都会重新随机（弹窗抖动/闪烁风险）。
- [WallpaperRewardModal L11-L24](file:///e:/ERE/Documents/Work/直播轮盘/src/components/WallpaperRewardModal.tsx#L11-L24)、[VideoRewardPlayer L22-L36](file:///e:/ERE/Documents/Work/直播轮盘/src/components/VideoRewardPlayer.tsx#L22-L36) 用 `useMemo` 包裹（较好），但依赖项为布尔值，仍会在需要时重算。
- 附带影响：**截图不可复现**（同一状态每次渲染不同），给截图计划增加不确定性，需要 Harness 注入随机源（见 `capture-plan.md` §4）。

### S6 · 内联 `<style>` 注入 keyframes，命名与实现不统一 —— P2
- [WallpaperRewardModal L154-L171](file:///e:/ERE/Documents/Work/直播轮盘/src/components/WallpaperRewardModal.tsx#L154-L171) 注入 `rewardLightFloat`；[VideoRewardPlayer L174-L265](file:///e:/ERE/Documents/Work/直播轮盘/src/components/VideoRewardPlayer.tsx#L174-L265) 注入 6 组 `ultimate*`。关键帧散落组件内、每次挂载重新注入 `<style>`，无法被统一主题/动效系统管理。

### S7 · 无障碍与可读性缺口 —— P1
- **无对话框语义**：5 个覆盖层均无 `role="dialog"` / `aria-modal` / `aria-labelledby`（grep 全仓无命中）。
- **无键盘关闭**：仅 2 处 `onKeyDown`（Enter 提交），**无 Escape 关闭、无焦点捕获/归还**。
- **尺寸过小文本**：棋盘格 `text-[9px]`、编号 `text-[8px]`（[GameBoard L66-L82](file:///e:/ERE/Documents/Work/直播轮盘/src/components/GameBoard.tsx#L66-L82)）、`FigureWheel` 扇形标签 `text-[6.5px]`。
- **仅颜色区分**：轮盘图例（[MonopolyGame L594-L605](file:///e:/ERE/Documents/Work/直播轮盘/src/pages/MonopolyGame.tsx#L594-L605)、[GameBoard L114-L122](file:///e:/ERE/Documents/Work/直播轮盘/src/components/GameBoard.tsx#L114-L122)）只有色块 + 名称，7 种事件色中 `special #0891B2` 与 `chaos #4338CA` 对色弱用户区分度低。
- **可点击目标**：棋盘 28 格按钮尺寸由百分比决定，移动端可能小于 44×44 触控标准。
- **[待截图确认]**：棋盘文字压在底图上的实际对比度。

### S8 · 响应式风险 —— P1（后果需截图确认）
- 积分卡加载占位为 **固定 `w-[500px] h-[500px]`**（[CardWheelPage L118](file:///e:/ERE/Documents/Work/直播轮盘/src/pages/CardWheelPage.tsx#L118)），容器 `max-w-3xl` + `px-4`；在 390px 视口下会**横向溢出**。
- 就绪态 canvas `width/height=500` + `style maxWidth:100%`（[CardWheelRenderer L146-L157](file:///e:/ERE/Documents/Work/直播轮盘/src/components/CardWheelRenderer.tsx#L146-L157)）本身可缩放，但加载态与就绪态尺寸策略不一致 → 加载完成瞬间布局跳动。
- `DiceBox` 容器固定 `h-48 / sm:h-56`，其内部 canvas 通过 `container.clientHeight` 自适应，高度写死导致不同断点观感差异被锁死。
- `MonopolyGame` 主栅格在 `lg` 才分栏，`md`（768–1023）区间为单列但侧栏 `order-2` 被推到棋盘之后 → 平板用户体验割裂。
- **[待截图确认]**：375/390/768/1024/1440 各断点的真实溢出与换行。

### S9 · 操作反馈机制薄弱 —— P1
- 两个页面各有一个 `archiveMessage` / `archiveMessage` 字符串，**同一行文本承载成功、失败、进行中三类语义**（如"已保存 X" / "读取失败，请检查浏览器本地存储权限" / "读取中..."），位置固定在侧栏小字或卡片说明下方。
- 失败信息（`读取失败`/`复制失败`/`切换失败`/`至少需要保留一位观众`）**无颜色区分**，与成功提示同一样式 → 用户难以察觉失败。
- 没有独立 Toast/Dialog/Alert 组件；`handleExportCsv` 完成后也只改这一行文本。
- 覆盖层结果反馈（EventWheel 结果块）与页面横幅（`上次事件`）**信息重复但格式不同**。

### S10 · UI 与业务状态强耦合 —— P0（架构层面）
- **文案即逻辑**：`getEffectFromText`（[MonopolyGame L85-L127](file:///e:/ERE/Documents/Work/直播轮盘/src/pages/MonopolyGame.tsx#L85-L127)）与 `isSpecialEffectText`（L129-L131）对 `SPECIAL_EFFECTS` 文案做 **`includes` 字符串匹配**；`handleEventComplete` 里还有硬编码 `event.includes('直接前进 3 格')`。
  - 后果：任何一次 UI 文案微调（例如把"再 +1 骰子"改成"骰子 +1"）都会**静默破坏游戏逻辑**。重构 UI 必须先抽离该映射。
- **事件数据与逻辑同源**：[eventConfigs.ts](file:///e:/ERE/Documents/Work/直播轮盘/src/data/eventConfigs.ts) 既是展示文案又是逻辑判断依据。
- **UI 局部状态承载流程**：`activeEventModal`、`activeEventResolved`、`continueTurnAfterEvent`、`lastEventResult` 全在 [MonopolyGame](file:///e:/ERE/Documents/Work/直播轮盘/src/pages/MonopolyGame.tsx#L141-L144) 组件内，而回合推进在 Store → 状态分散在两处，重构 Modal 时极易漏掉回合语义。

### S11 · 术语与文档不一致 —— P2
- 同一实体四种叫法：`EVENT_CONFIGS.figure.name = "实体周边抽取轮盘"`、`BOARD_LABELS.figure = "周边"`、`EVENT_WHEEL_PROPS` 无 figure、页面上按钮写"触发事件：实体周边抽取轮盘"、`FigureWheel` 内标题写"实体周边抽取轮盘"、`data/eventConfigs FIGURE_OPTIONS.rarity = "实体周边"`。
- [AGENTS.md](file:///e:/ERE/Documents/Work/直播轮盘/AGENTS.md) 与代码多处不符：文档称 `FIGURE_OPTIONS` 为 SSR/SR 稀有度（维什戴尔/凯尔希/阿米娅），代码实为 3 个实体周边（活动海报/夏秋双面折扇/春冬双面抱枕）；文档称 `MISFORTUNE_EVENTS` 7 个，代码为 6 个；文档称 `ADVENTURE_EVENTS`/`TRUTH_EVENTS` 6 个与代码一致但内容不同。
- 页脚文案"季节积分卡收集 · 壁纸和终极奖励共用同一进度"与文档描述一致，但 CS 季节卡同时展示"积分卡进度 + 壁纸状态"两套语义，措辞易误解。

### S12 · 动效实现不一致、魔法数分散 —— P2
- `EventWheel` 用 `requestAnimationFrame` + `easeOutQuart` + 3600ms（[L69-L98](file:///e:/ERE/Documents/Work/直播轮盘/src/components/EventWheel.tsx#L69-L98)）；`FigureWheel` 用 CSS `transition 3s cubic-bezier(0.16,1,0.3,1)` + `setTimeout 3300`（[L26-L35](file:///e:/ERE/Documents/Work/直播轮盘/src/components/FigureWheel.tsx#L26-L35)）；`CardWheelPage` 用 `useSpinController` 5000ms（[useSpinController L46](file:///e:/ERE/Documents/Work/直播轮盘/src/hooks/useSpinController.ts#L46)）。三种转盘三套实现。
- 魔法数：1600（骰子）、260/180（移动）、3600 / 3300 / 5000（转盘）散落在 4 个文件，无配置中心。

### S13 · 层级（z-index）魔数不统一 —— P2
- `z-50`（EventWheel / ResultModal / WallpaperRewardModal）、`z-[100]`（FigureWheel / VideoRewardPlayer）、页面内 `z-10 / z-20 / z-30 / z-40`。覆盖层同层却用不同魔数，新增覆盖层时极易压错层级。

### S14 · 死代码与未接线资产 —— P2
- [Empty.tsx](file:///e:/ERE/Documents/Work/直播轮盘/src/components/Empty.tsx)：无引用。
- [useTheme.ts](file:///e:/ERE/Documents/Work/直播轮盘/src/hooks/useTheme.ts)：无引用；Tailwind 配了 `darkMode:'class'` 但**全仓无任何 `dark:` 工具类** → `prefers-color-scheme: dark` 下界面完全不变（[index.css](file:///e:/ERE/Documents/Work/直播轮盘/src/index.css) 亦无 dark 规则）。
- `gamePhase: 'completed'`：不可达（见 inventory §2.1）。
- **`WallpaperRewardModal` 的 `isUltimate` 分支为死路径**：页面条件 `pendingReward && !showVideoReward` 与 `addCard` 设置 `showVideoReward=true` 互斥 → 弹窗永远只以 `type:'wallpaper'` 渲染，其内部双图网格、"领取终极奖励"按钮、`isUltimate` 对应的深色描边全为死代码（[CardWheelPage L203-L205](file:///e:/ERE/Documents/Work/直播轮盘/src/pages/CardWheelPage.tsx#L203-L205) + [gameStore L444-L455](file:///e:/ERE/Documents/Work/直播轮盘/src/stores/gameStore.ts#L444-L455)）。重构时应明确"终极奖励只走视频层"这一设计事实。
- `public/` 中 4 张**未跟踪**图片（`宣传海报.png`、`梦幻蕾丝少女的心形卧室.png`、`派露壁纸.png`、`猫堡壁纸.png`）不被任何代码引用；`src/assets/react.svg` 同样未引用。

### S15 · 表现力落差：有图 vs 无图转盘 —— P2
- 积分卡转盘为 canvas 绘制的**图片扇区 + 渐变描边 + 中心徽标**（[CardWheelRenderer](file:///e:/ERE/Documents/Work/直播轮盘/src/components/CardWheelRenderer.tsx#L33-L143)）。
- `FigureWheel` 为纯 SVG **色块 + 文字**（[L72-L108](file:///e:/ERE/Documents/Work/直播轮盘/src/components/FigureWheel.tsx#L72-L108)），无图片资源。
- 两者观感断层明显，且 `FIGURE_OPTIONS` 没有 image 字段（数据结构本身不支持）。

---

## 3. 待截图确认（静态分析无法证明）

| ID | 待确认项 | 为什么静态分析不足 |
|---|---|---|
| N1 | 棋盘 28 格文字与底图 `大富翁棋盘.png` 的对齐与可读性 | 坐标是百分比（[BOARD_SLOTS](file:///e:/ERE/Documents/Work/直播轮盘/src/stores/monopolyStore.ts#L17-L46)），是否与底图格子吻合必须看渲染 |
| N2 | 390/375px 下积分卡加载态与整体横向溢出 | 需真实布局引擎 |
| N3 | 浅色→深色遮罩切换的突兀程度 | 主观 + 实测 |
| N4 | 深色面板上 `text-slate-300/400`、`bg-white/10` 的实际对比度 | 需采样像素 |
| N5 | 长事件文案在扇形中的截断（`splitWheelLabel` 每行 6–7 字、最多 4 行，超出直接丢弃） | 需看实际渲染，注意 [TRUTH_EVENTS](file:///e:/ERE/Documents/Work/直播轮盘/src/data/eventConfigs.ts#L19-L26) 中存在 20+ 字条目 |
| N6 | 命中横幅（`absolute top-3`）与转盘顶部指针（`-translate-y-7`）是否重叠 | 需实测 stacking |
| N7 | DiceBox canvas 是否正常绘制、容器高度是否匹配 | 依赖运行时 `clientHeight` |
| N8 | 撒花 20 / 光点 24–46 / 粒子 84 的视觉噪点与帧率 | 需运行时 |
| N9 | `动态壁纸.mp4` 在 CSP（`default-src 'self'`）下能否播放 | 需实测；理论上 `media-src 'self'` 允许 |
| N10 | `cute-font` 缺失后实际回退字体与设计预期差距 | 需实测 OS 字体可用性 |
| N11 | 多玩家（≥5）时棋盘棋子重叠 | 位置由坐标决定，重叠需渲染验证 |

---

## 4. 重构优先级

### P0（先行，影响面最大且相互牵连）
1. **S1 定义 `cute-font` / `--cute-font` / `piece-hop`**（或明确弃用并清理引用，避免文档与实现继续背离）。
2. **S10 解耦"文案 = 逻辑"**：把 `SPECIAL_EFFECTS` 从字符串数组升级为 `{id, label, effect}` 结构，`getEffectFromText` 改为按 id 匹配。**这是 UI 文案可自由重构的前置条件**。
3. **S2/S3 建立视觉令牌与统一主题策略**：先决定奖励类覆盖层是"保持深色炫光"还是"统一为浅色卡"，再抽 `--radius/--font/--event-color`。

### P1（主体重构）
4. **S4 抽出共享组件**：`Modal`（含关闭按钮 + 遮罩 + z-index 规范）、`ArchivePanel`（合并两处档案 UI，或明确定义两者边界）、`LogPanel`（复制/导出/列表/空态）、`PageBackground`（背景 + 网格）。
5. **S9 引入统一反馈组件**（Toast/InlineAlert），把 `archiveMessage` 的三种语义拆分。
6. **S7 无障碍补齐**：`role="dialog"` + `aria-modal` + Esc 关闭 + 焦点管理；棋盘字号提升；图例补充非颜色编码。
7. **S8 响应式**：加载占位改 `aspect-square w-full max-w-[500px]`；统一 `DiceBox` 高度策略；重排 `md` 断点布局。

### P2（收尾）
8. S6 keyframes 收敛到全局样式；S12 转盘统一为一套实现 + 动效常量集中；S13 z-index 令牌化；S5 随机装饰改用固定种子或 `useMemo` + 稳定 key；S11 术语统一；S14 清理死代码；S15 `FIGURE_OPTIONS` 增加图片字段以对齐表现力。
