# UI 清单与现状基线（ui-inventory.md）

- 仓库：`https://github.com/Gay-wushuang/520live`
- 基线提交：`8dcf2151799088d97d6c53f5751a86b1b9a347dc`（本地 HEAD 与之完全一致）
- 分析方式：**仅静态源码阅读**，未运行、未渲染、未截图。
- 重要声明：本文只描述"源码中存在的界面入口与条件分支"。是否真正渲染正确、视觉是否可读、布局是否溢出，**无法由静态分析证实**，需要截图阶段验证（见 `capture-plan.md`）。

---

## 0. 分析方法与"什么才算一个界面"

本清单不是按文件名计数。判定一个"界面"的依据是**渲染路径**：

1. `src/App.tsx` 的路由定义 → 页面级界面；
2. 组件被挂载的位置（`<Modal>`/`fixed inset-0` 全屏覆盖层 → 独立界面）；
3. 组件内部 `if / && / ? :` 条件渲染分支 → 同一界面的**不同状态**；
4. Store 中的业务数据字段（`logs`、`activeEffects`、`pendingReward` …）→ 决定状态何时出现。

本轮共识别：
- **2 个页面级界面**（映射到 4 条路由）
- **8 个覆盖层界面**（Modal / 全屏遮罩，含 5+2+1 个变体）
- **44 个可独立截图的状态**（见 §3）

---

## 1. 路由与页面级界面

路由全部集中在 [App.tsx](file:///e:/ERE/Documents/Work/直播轮盘/src/App.tsx)。

| 路由 | 渲染组件 | 说明 |
|---|---|---|
| `/` | `MonopolyGame` | 根路径即大富翁 |
| `/monopoly` | `MonopolyGame` | 与 `/` 同一组件（重复入口） |
| `/card-wheel` | `CardWheelPage` | 积分卡转盘；被 `/` 通过 `navigate('/card-wheel?from=monopoly')` 跳转 |
| `*` | `MonopolyGame` | 兜底路由，任意未知路径进入大富翁 |

页面 → 组件挂载关系：

- `MonopolyGame` 挂载：`DiceBox`、`EventWheel`、`FigureWheel`、`GameBoard`（[MonopolyGame.tsx](file:///e:/ERE/Documents/Work/直播轮盘/src/pages/MonopolyGame.tsx#L684-L700)）
- `CardWheelPage` 挂载：`CardWheelRenderer`、`ResultModal`、`CollectionStatus`、`WallpaperRewardModal`、`VideoRewardPlayer`（[CardWheelPage.tsx](file:///e:/ERE/Documents/Work/直播轮盘/src/pages/CardWheelPage.tsx#L186-L207)）

**文件清单（10 个组件）**：`CardWheelRenderer`、`CollectionStatus`、`DiceBox`、`Empty`、`EventWheel`、`FigureWheel`、`GameBoard`、`ResultModal`、`VideoRewardPlayer`、`WallpaperRewardModal`。
其中 `Empty.tsx` 无任何引用（死代码），不计入界面。

---

## 2. 逐界面结构拆解

### 2.1 MON — 大富翁主页面（`/`、`/monopoly`、`*`）

源码：[MonopolyGame.tsx](file:///e:/ERE/Documents/Work/直播轮盘/src/pages/MonopolyGame.tsx)

页面为两栏栅格 `lg:grid-cols-[320px_1fr]`，移动端把侧栏 `order-2`、主区 `order-1`（[L384](file:///e:/ERE/Documents/Work/直播轮盘/src/pages/MonopolyGame.tsx#L384)、[L385](file:///e:/ERE/Documents/Work/直播轮盘/src/pages/MonopolyGame.tsx#L385)、[L608](file:///e:/ERE/Documents/Work/直播轮盘/src/pages/MonopolyGame.tsx#L608)）。

| 区块 | 位置 | 内部子功能 | 条件渲染入口 |
|---|---|---|---|
| 顶部 Header | L360-L382 | 标题、`打开积分抽奖` 链接、`重置棋盘` 按钮 | 常驻 |
| 观众档案（侧栏①） | L386-L549 | 当前观众改名输入、回合/位置/骰数/方向只读信息 | 常驻 |
| ├ 增益效果 chips | L412-L420 | 展示 `activeEffects` | `activeEffects.length > 0` |
| ├ 方向选择器 | L422-L443 | `前进/后退` 双按钮 | `canChooseDirection`（存在 `choose_direction` 效果） |
| ├ 档案下拉 + 保存/读取/新档案 | L445-L482 | 三个按钮 + `archiveMessage` 文本 | 常驻；消息文本随操作变化 |
| ├ 观众列表 | L484-L510 | 点击切换当前观众、`×` 删除 | 常驻（列表长度 ≥ 1） |
| ├ 新增观众 | L512-L532 | 输入 + `添加`（支持 Enter） | 常驻 |
| ├ 批量导入 | L534-L547 | textarea + `导入观众名单` | 常驻 |
| 下播核对日志（侧栏②） | L551-L592 | `复制`、`导出CSV`、日志列表 | 常驻；列表空/非空分支 |
| 轮盘说明（侧栏③） | L594-L605 | 7 类事件色块图例 | 常驻 |
| 骰子面板 | L610-L620 | `DiceBox` 画布 + `点数 N` 徽标 | 徽标：`lastDiceResult !== null` |
| 状态卡三联 | L623-L638 | 当前观众/位置/下次移动 | 常驻 |
| 掷骰按钮 | L640-L651 | 文本与禁用态 | `isRollingDice \|\| gamePhase !== 'waiting'` |
| 棋盘 | L655 | `GameBoard` | 常驻 |
| 触发事件按钮 | L657-L667 | `触发事件：<名称>` | `pendingEvent && gamePhase==='event' && !activeEventModal` |
| 上次事件横幅 | L669-L673 | `上次事件：…` | `lastEventResult` 非空 |
| 系统提示横幅 | L675-L679 | `系统提示：…` | `lastEffectMessage` 非空 |

内嵌组件：

- `GameBoard`（[GameBoard.tsx](file:///e:/ERE/Documents/Work/直播轮盘/src/components/GameBoard.tsx)）：背景图 `/大富翁棋盘.png` + 28 个绝对定位按钮 + 玩家棋子 + 底部 7 类计数图例。高亮格由 `pendingEvent?.position.id === position.id` 决定（[L58](file:///e:/ERE/Documents/Work/直播轮盘/src/components/GameBoard.tsx#L58)）。棋子用 `transition-[left,top]`，`isMoving` 时追加 `piece-hop` 类（[L97-L99](file:///e:/ERE/Documents/Work/直播轮盘/src/components/GameBoard.tsx#L97-L99)）。
- `DiceBox`（[DiceBox.tsx](file:///e:/ERE/Documents/Work/直播轮盘/src/components/DiceBox.tsx)）：canvas 骰子，`isRolling` 时叠加"掷骰中..."胶囊（[L63-L69](file:///e:/ERE/Documents/Work/直播轮盘/src/components/DiceBox.tsx#L63-L69)）。初始化无 Loading UI，异步 `init()` 失败仅 `console.error`。

状态机（`gamePhase`）：`waiting → rolling → moving → event → waiting`。定义见 [monopoly.ts L83](file:///e:/ERE/Documents/Work/直播轮盘/src/types/monopoly.ts#L83)。**`'completed'` 在全部源码中从未被赋值 → 不可达状态**（已 grep 确认，仅出现在类型定义）。

### 2.2 CARD — 积分卡转盘页（`/card-wheel`）

源码：[CardWheelPage.tsx](file:///e:/ERE/Documents/Work/直播轮盘/src/pages/CardWheelPage.tsx)

| 区块 | 位置 | 说明 |
|---|---|---|
| 返回链接 + 标题 | L90-L105 | 返回棋盘首页 |
| 转盘容器 | L107-L153 | 内发光背景 + 命中横幅 + 转盘/加载占位 + 红色指针 SVG |
| ├ 加载态 | L117-L123 | 500×500 虚线圆 + spinner +「加载积分卡...」 |
| ├ 就绪态 | L124-L126 | `CardWheelRenderer` canvas（`size: 500`） |
| ├ 命中横幅 | L110-L115 | `结果缓冲区：指针命中：<cardLabel> · <desc>`，`resultSeason` 非空时 |
| 操作按钮 | L155-L184 | `抽取积分卡` / `重置游戏`，均由 `isSpinning`\|`isLoading` 控制禁用 |
| 收集档案 | L186 | `CollectionStatus` |
| 底部固定文案 | L211-L213 | `季节积分卡收集 · 壁纸和终极奖励共用同一进度` |

### 2.3 CS — 玩家收集档案（内嵌于 CARD）

源码：[CollectionStatus.tsx](file:///e:/ERE/Documents/Work/直播轮盘/src/components/CollectionStatus.tsx)

| 区块 | 位置 | 子功能 |
|---|---|---|
| 档案头 | L130-L137 | 当前档案名、ID 前 18 位、`archiveMessage` |
| 档案操作 | L139-L197 | 存档下拉、昵称输入（Enter/blur 保存）、`保存名称`、`保存当前存档`、`读取本地存档`、`新建存档`、`删除当前存档` |
| 统计 | L200-L209 | `总抽取`、`积分卡轮盘` |
| 季节卡 ×4 | L211-L291 | 灰显/1张/2张/已解锁 四种视觉；进度条宽度 `cardCount*50%`；`✓` 角标 |
| 历史 chips | L293-L308 | `spinHistory.slice(0,4)`，仅 `length > 0` 时渲染 |
| 核对日志 | L310-L351 | `复制日志`、`导出CSV`、日志列表（空态 L335-L338 / 列表 L340-L349） |

### 2.4 覆盖层界面（全部 `/` 或 `/card-wheel` 内）

| ID | 组件 | 触发条件 | 变体 | z-index |
|---|---|---|---|---|
| OVL-EVT | [EventWheel.tsx](file:///e:/ERE/Documents/Work/直播轮盘/src/components/EventWheel.tsx) | `activeEventConfig` 非空（除 lottery/figure 外的事件格） | misfortune / adventure / truth / special / chaos（5） | `z-50` |
| OVL-FIG | [FigureWheel.tsx](file:///e:/ERE/Documents/Work/直播轮盘/src/components/FigureWheel.tsx) | `activeEventModal === 'figure'` | 1 个 | `z-[100]` |
| OVL-RES | [ResultModal.tsx](file:///e:/ERE/Documents/Work/直播轮盘/src/components/ResultModal.tsx) | `result && resultSeason && !pendingReward && !showVideoReward` | 1 个 | `z-50` |
| OVL-WALL | [WallpaperRewardModal.tsx](file:///e:/ERE/Documents/Work/直播轮盘/src/components/WallpaperRewardModal.tsx) | `pendingReward && !showVideoReward` | wallpaper / ultimate（2） | `z-50` |
| OVL-VID | [VideoRewardPlayer.tsx](file:///e:/ERE/Documents/Work/直播轮盘/src/components/VideoRewardPlayer.tsx) | `showVideoReward` | 播放 / loading（2） | `z-[100]` |

每个覆盖层内部状态：

- `EventWheel`：`isSpinning`（3600ms 旋转）→ `selectedEvent` 结果卡（[L182-L190](file:///e:/ERE/Documents/Work/直播轮盘/src/components/EventWheel.tsx#L182-L190)）。关闭按钮常驻。
- `FigureWheel`：`isSpinning`"抽取周边中..." → `selectedFigure`（[L113-L127](file:///e:/ERE/Documents/Work/直播轮盘/src/components/FigureWheel.tsx#L113-L127)）。
- `ResultModal`：入场过渡 `isVisible`（100ms 后显现），附带 20 个随机位置 `animate-ping` 圆点（[L93-L106](file:///e:/ERE/Documents/Work/直播轮盘/src/components/ResultModal.tsx#L93-L106)）。
- `WallpaperRewardModal`：24 / 46 个随机光点（[L11-L24](file:///e:/ERE/Documents/Work/直播轮盘/src/components/WallpaperRewardModal.tsx#L11-L24)），`领取壁纸` / `领取终极奖励` 按钮。
- `VideoRewardPlayer`：`isPlaying` 为 false 时显示 spinner 遮罩（[L164-L168](file:///e:/ERE/Documents/Work/直播轮盘/src/components/VideoRewardPlayer.tsx#L164-L168)）。

---

## 3. 状态清单（截图目标矩阵）

标记：`A` = 自动可达（点击/等待即可）；`D` = 需要预置测试数据；`S` = 需要注入随机数才能确定性到达；`X` = 当前源码不可达 / 无法由静态分析确认。

### MON（大富翁）

| ID | 状态 | 触发 | 依赖 | 类别 |
|---|---|---|---|---|
| MON-01 | 初始态（1 观众、0 日志、按钮可点） | 直接进入 `/` | 无 | A |
| MON-02 | 掷骰中（按钮禁用"掷骰中..."） | 点击掷骰后 1600ms 窗口 | 时序 | S |
| MON-03 | 移动中（棋子位移、按钮禁用） | 掷骰后逐格移动 | 时序 | S |
| MON-04 | 事件待触发按钮出现 | 落到事件格且 `gamePhase==='event'` | 需落到事件格 | S |
| MON-05 | `上次事件` 横幅 | 完成任一事件后 | 需先完成事件 | S |
| MON-06 | `系统提示` 横幅 | `applyEffect` / 移动方向 / 提示 | 需触发效果 | S |
| MON-07 | 增益效果 chips | 抽到特殊效果格 | 需落到 `special` 格 | S |
| MON-08 | 前进/后退方向选择器 | 抽到 `选择移动方向` | 需 `choose_direction` | S |
| MON-09 | 多观众列表 + 当前高亮 + 删除 | 添加/导入观众 | 无 | A |
| MON-10 | 日志面板空态 | 初始 | 无 | A |
| MON-11 | 日志面板有数据（最新 8 条） | 掷骰一次 | 无 | A |
| MON-12 | 档案下拉多存档 | 点击 `新档案` | 无 | A |
| MON-13 | `archiveMessage` 文本变体（已读取/读取中/读取失败/复制失败/切换失败/至少保留一位） | 各按钮 | 失败态需拦截权限 | A / D |
| MON-14 | 轮盘说明图例 | 常驻 | 无 | A |
| MON-15 | 棋盘高亮格（`ring` 高亮） | `pendingEvent` 存在 | 同 MON-04 | S |
| MON-16 | 棋盘多棋子（P1…Pn） | 导入 ≥2 观众 | 无 | A |
| MON-17 | 删除唯一观众被拒（"至少需要保留一位观众"） | 初始态点 `×` | 无 | A |

### CARD / CS（积分卡）

| ID | 状态 | 触发 | 依赖 | 类别 |
|---|---|---|---|---|
| CARD-01 | 图片加载中 spinner | 首帧 | 时序 | A |
| CARD-02 | 就绪未抽卡 | 加载完成 | 无 | A |
| CARD-03 | 抽取中（5000ms，"抽取中..."） | 点击抽取 | 时序 | S |
| CARD-04 | 命中横幅 | 抽卡结束 | 无 | A |
| CARD-05 | 收集进度 0/2 全灰 | 初始 | 无 | A |
| CS-01 | 单存档档案头 | 初始 | 无 | A |
| CS-02 | 统计 0 / 非 0 | 抽卡前后 | 无 | A |
| CS-03 | 季节卡 0/2（灰显卡片图） | 初始 | 无 | A |
| CS-04 | 季节卡 1/2 | 抽中 1 张 | 无 | A |
| CS-05 | 季节卡 2/2 待领（orange 边框） | 同季抽中 2 张 | 需配对 | S |
| CS-06 | 季节卡已解锁壁纸（黄底 + ✓，目标变"终极奖励"） | 领取壁纸后 | 需先配对并领取 | D |
| CS-07 | 历史 chips | `spinHistory>0` | 无 | A |
| CS-08 | 日志空态 | 初始 | 无 | A |
| CS-09 | 日志有数据（最新 10 条） | 抽卡后 | 无 | A |
| CS-10 | 存档下拉多存档 | 新建存档 | 无 | A |

### 覆盖层

| ID | 状态 | 触发 | 依赖 | 类别 |
|---|---|---|---|---|
| OVL-EVT-01 | 厄运轮盘·旋转中 | 落到 misfortune 格并触发 | S | S |
| OVL-EVT-02 | 厄运轮盘·结果 | 旋转结束 | S | S |
| OVL-EVT-03 | 冒险轮盘·结果 | 落到 adventure | S | S |
| OVL-EVT-04 | 真心话轮盘·结果 | 落到 truth | S | S |
| OVL-EVT-05 | 特殊效果轮盘·结果 | 落到 special | S | S |
| OVL-EVT-06 | 混乱轮盘（8 项动态生成） | 落到 chaos | S | S |
| OVL-FIG-01 | 周边轮盘·旋转中 | 落到 figure 格并触发 | S | S |
| OVL-FIG-02 | 周边轮盘·结果 | 3300ms 后 | S | S |
| OVL-RES-01 | 抽卡结果弹窗 | 抽卡结束且无待领奖励 | S | S |
| OVL-WALL-01 | 壁纸奖励弹窗（单图） | 首次配对 | D | D |
| OVL-WALL-02 | 终极奖励弹窗（双图） | 再次配对 | 条件互斥，**不可达**（见 §6） | X |
| OVL-VID-01 | 终极视频播放 | `showVideoReward` | D | D |
| OVL-VID-02 | 视频 padding spinner | 视频未开始播放 | 时序 | D |

**合计 44 个状态**（MON 17 + CARD/CS 15 + 覆盖层 13，其中 OVL-EVT-01/02 等按变体展开计入）。

---

## 4. 需要特定业务数据 / 操作序列才出现的界面

1. **奖励类覆盖层（OVL-WALL / OVL-VID）**：需同一季节累计 2 张，且区分"首次配对"(wallpaper) 与"已解锁后再配对"(ultimate)。判定逻辑在 [gameStore.ts L430-L455](file:///e:/ERE/Documents/Work/直播轮盘/src/stores/gameStore.ts#L430-L455)。
2. **增益效果类（MON-06/07/08）**：需先抽到 `special` 格并命中对应文案，且 `getEffectFromText` 用**字符串包含匹配**解析（[MonopolyGame.tsx L85-L131](file:///e:/ERE/Documents/Work/直播轮盘/src/pages/MonopolyGame.tsx#L85-L131)）——文案与逻辑强耦合。
3. **厄运免疫分支**：`misfortune_immunity` + 落到 misfortune，会走"直接结束回合"分支（[monopolyStore.ts L591-L629](file:///e:/ERE/Documents/Work/直播轮盘/src/stores/monopolyStore.ts#L591-L629)），UI 表现与普通厄运不同。
4. **`auto_lottery` 途经抽奖**：移动路径中若途经 `lottery` 格，`triggerEvent` 目标改为该格（[monopolyStore.ts L469-L527](file:///e:/ERE/Documents/Work/直播轮盘/src/stores/monopolyStore.ts#L469-L527)）。
5. **reroll 继续回合**：事件结束后 `continueCurrentTurn` 而非 `nextTurn`（[MonopolyGame.tsx L245-L260](file:///e:/ERE/Documents/Work/直播轮盘/src/pages/MonopolyGame.tsx#L245-L260)）。

---

## 5. 依赖状态字段索引（UI ↔ Store）

| 字段 | Store | 影响的 UI |
|---|---|---|
| `gamePhase`, `isRollingDice`, `pendingEvent` | monopolyStore | 掷骰按钮禁用、触发事件按钮、棋盘高亮 |
| `players[].activeEffects / moveDirection / diceCount / isMoving` | monopolyStore | chips、方向选择器、状态卡、棋子动画 |
| `logs` | monopolyStore | 侧栏②列表 |
| `archiveSlots / currentArchiveId` | 两个 Store 各自维护 | 两处档案下拉（互不共享） |
| `cardCollection / wallpaperCollection` | gameStore | CS 季节卡四种视觉 |
| `pendingReward / showVideoReward` | gameStore | OVL-WALL / OVL-VID |
| `spinHistory / auditLogs` | gameStore | CS chips / 日志 |
| `theme`（localStorage） | useTheme（未被调用） | 无 |

---

## 6. 明确不可达 / 无法由静态分析确认

- `gamePhase === 'completed'`：**源码中无任何赋值点，不可达**。
- **`WallpaperRewardModal` 的 `isUltimate` 分支不可达**：页面只在 `pendingReward && !showVideoReward` 时渲染该弹窗（[CardWheelPage.tsx L203-L205](file:///e:/ERE/Documents/Work/直播轮盘/src/pages/CardWheelPage.tsx#L203-L205)），而 `addCard` 在 `isUltimate` 时**同时**把 `showVideoReward` 置为 `true`（[gameStore.ts L444-L455](file:///e:/ERE/Documents/Work/直播轮盘/src/stores/gameStore.ts#L444-L455)）→ 终极分支永不渲染（其内部双图布局与"领取终极奖励"按钮为死代码路径）。
- `pendingReward` / `showVideoReward` **无法通过 `localStorage` 预置**：`normalizePersistedState` 在 rehydrate 时用 `buildArchiveState` 强制重置为 `null` / `false`（[gameStore.ts L253-L267](file:///e:/ERE/Documents/Work/直播轮盘/src/stores/gameStore.ts#L253-L267)）。
- `useTheme`（[useTheme.ts](file:///e:/ERE/Documents/Work/直播轮盘/src/hooks/useTheme.ts)）与 `Empty`（[Empty.tsx](file:///e:/ERE/Documents/Work/直播轮盘/src/components/Empty.tsx)）**无引用，属于未接线代码**；Tailwind 已配 `darkMode: 'class'` 但整套 UI 无 `dark:` 分支，故 **dark 主题不存在**。
- 所有"实际渲染长什么样"（字体是否加载、棋盘坐标是否对齐底图、移动端是否溢出、对比度是否达标、长文案是否溢出扇形）**均需截图确认**，本清单不作断言。
