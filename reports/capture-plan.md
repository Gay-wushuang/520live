# 截图采集计划（capture-plan.md）

- 目标：为 UI 重构建立**可复现**的全量界面截图基线，供 Codex 直接执行。
- 基线提交：`8dcf2151799088d97d6c53f5751a86b1b9a347dc`
- 前置事实：本项目为纯前端 SPA，所有状态落在 `localStorage`，两个键名：
  - `monopoly-audience-state`（version 1，[monopolyStore.ts L1017-L1028](file:///e:/ERE/Documents/Work/直播轮盘/src/stores/monopolyStore.ts#L1017-L1028)）
  - `season-wheel-game-state`（version 2，[gameStore.ts L637-L654](file:///e:/ERE/Documents/Work/直播轮盘/src/stores/gameStore.ts#L637-L654)）
- 关键约束：`addCard` 会在**同一时刻**设置 `pendingReward` 与 `showVideoReward`，而 `normalizePersistedState` 会把 `pendingReward` 重置为 `null`、`showVideoReward` 重置为 `false`（[gameStore.ts L253-L267](file:///e:/ERE/Documents/Work/直播轮盘/src/stores/gameStore.ts#L253-L267)）。**因此奖励类覆盖层无法靠预置 localStorage 直接渲染，必须通过真实抽卡交互到达。**

---

## 1. 采集环境

- 运行方式：Playwright（Chromium，headless）+ `npm run dev`（`http://localhost:5173`）。也可改用 `npm run build && npm run preview`，但 dev 模式保留 `react-dev-locator`，便于定位元素。
- 依赖：`npm i -D @playwright/test`（建议）；拼图依赖 `sharp` 或系统 ImageMagick（二选一）。
- **每次采集前先清空并重建临时 profile**，仅使用本计划指定的隔离 profile（见 §4.3）。

### 1.1 视口（viewport）统一规范

| 代号 | 尺寸 | deviceScaleFactor | 用途 |
|---|---|---|---|
| `desktop` | 1440 × 900 | 1 | **默认/主基线** |
| `wide` | 1920 × 1080 | 1 | 仅用于 MON 整体版面、Board 对齐核对 |
| `tablet` | 834 × 1112 | 1 | `md` 断点（单列 + 侧栏后置）风险验证 |
| `mobile` | 390 × 844 | 1 | 溢出、触控目标、字号验证 |

- 固定 `deviceScaleFactor: 1`（保证像素可比较）；如需高清版，额外产出 `@2x` 副本，不覆盖基线。
- 固定 `locale: 'zh-CN'`、`timezoneId: 'Asia/Shanghai'`、`colorScheme: 'light'`、`reducedMotion: 'reduce'`（关键：`reduce` 可让 CSS transition/动画**立即到位**，消除时序抖动；代价是失去"旋转中"帧，见 §6）。

### 1.2 关闭随机性（否则截图不可复现）

`ResultModal` 在 **JSX 内直接调用 `Math.random()`** 生成撒花坐标（[ResultModal.tsx L94-L105](file:///e:/ERE/Documents/Work/直播轮盘/src/components/ResultModal.tsx#L94-L105)），`WallpaperRewardModal`/`VideoRewardPlayer` 用随机光点，`rollDice`、`EventWheel`、`generateChaosWheel` 全部依赖随机源。必须在页面脚本执行前覆写随机源。

---

## 2. 目录与文件命名规范

```
screenshots/
├── raw/                  # 每张截图一个文件（唯一真实产物）
├── overview/             # 拼接总览图（由 raw 派生）
├── fixtures/             # 预置 localStorage 的 JSON 种子
├── manifest.json         # 全量索引（见 §7.2）
├── .profile/             # 一次性浏览器 profile（采集后删除，勿提交）
└── .report/              # 采集日志（成功/失败/跳过原因）
```

- **文件名规则**：`<ID>.<viewport>.png`
  - 例：`MON-01.desktop.png`、`MON-01.mobile.png`、`OVL-WALL-01.desktop.png`
  - `<ID>` 采用 `ui-inventory.md` §3 的稳定 ID，**不得新增未登记 ID**（保证后续重构可逐张 diff）。
  - 需要多张同状态时追加序号：`MON-04.desktop.2.png`（如多玩家版本）。
- 覆盖层（Modal/全屏）统一在 `desktop` 视口下采集，另对 `mobile` 单独采集一遍用于溢出检查。
- 全页截图统一 `fullPage: false`（固定视口），仅 `MON-wide` 允许 `fullPage: true`。

---

## 3. 状态 → 截图引出方式（三类）

- **`auto`**：仅需点击/等待，无需预置数据。
- **`data`**：需注入 `fixtures/*.json` 后刷新页面。
- **`blocked`**：当前源码不可达 → 记录为 skipped，附原因。

**统一操作原语**（供 Codex 实现为 helper）：

| 原语 | 说明 |
|---|---|
| `gotoMonopoly()` | `goto('/')`，等待 `text=大富翁互动系统` |
| `gotoCardWheel()` | `goto('/card-wheel')`，等待 `text=积分卡转盘` |
| `seedCard(fixture)` | `addInitScript` 写入 `season-wheel-game-state`（§4.2），随后 `reload` |
| `seedMonopoly(fixture)` | 同上写入 `monopoly-audience-state` |
| `spinCard()` | 点击 `text=抽取积分卡`，等待按钮恢复且 `canvas` 稳定 |
| `rollDice()` | 点击 `text=掷骰子前进`，等待 `text=触发事件：…` 或棋盘高亮出现 |
| `clickTrigger()` | 点击 `text=触发事件：` 按钮 |
| `waitWheelSettle()` | 等待覆盖层内出现"抽中事件"或"获得"结果卡 |
| `shot(id, viewport)` | 截图并按 §2 命名 + 写入 manifest |

---

## 4. 数据隔离与确定性 Harness

### 4.1 随机源覆写（`page.addInitScript`，在任何业务脚本之前执行）

```js
// 由每个 shot 在采集前设置 window.__CAPTURE__ = { die:1, unit:[0.75, 0.0], plain:0.5 }
(() => {
  const cfg = () => window.__CAPTURE__ || { die: 1, unit: [0.75, 0.0], plain: 0.5 };

  // 骰子 / EventWheel / generateChaosWheel / extraRotations 使用 Math.random
  let queue = [];
  Math.random = () => {
    const c = cfg();
    if (queue.length) return queue.shift();
    return c.plain;
  };
  window.__feedRandom = (arr) => { queue = arr.slice(); };

  // 积分卡角度 getRandomUnit 使用 crypto.getRandomValues
  const orig = crypto.getRandomValues.bind(crypto);
  crypto.getRandomValues = (arr) => {
    const c = cfg();
    const vals = c.unit;
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor((vals[i % vals.length] ?? c.plain) * 0x100000000);
    }
    return arr;
  };
})();
```

确定性骰子取值：`rollSingleDie = Math.floor(random*6)+1`，令 `random = (die - 0.5) / 6` 即得 `die`。
确定性积分卡季节：`createRandomAngle` 依次调用 `random()` 两次（[useProbabilityEngine.ts L17-L22](file:///e:/ERE/Documents/Work/直播轮盘/src/hooks/useProbabilityEngine.ts#L17-L22)）。**以下为推导值，必须由 Harness 断言验证，不得当作结论**：

| 目标季节 | `unit` 序列 | 推导 |
|---|---|---|
| spring (index 0) | `[0.75, 0.0]` | segment=3 → targetAngle=275 → adjusted=85 → index 0 |
| summer (index 1) | `[0.00, 0.0]` | segment=0 → targetAngle=5 → adjusted=355 → index 3 ❌ 不成立 |

需求：Harness **不要硬信此表**。实现 `spinUntilSeason(season)`：每次抽卡后读取 `useGameStore.getState().lastSpin.season`，命中即锁定该 `unit` 序列并写入 fixture，未命中则换种子重试（最多 N 次）。这样既确定性又无需人工推导。

### 4.2 状态种子（`localStorage` 必须包一层 `{state, version}`）

Zustand `persist` 的存储格式为 `{ "state": {...}, "version": n }`，写成裸对象**不会生效**。

`fixtures/card.spring1.json`（春季 1 张、未解锁壁纸 → 抽中春季即出壁纸奖励）：

```json
{
  "state": {
    "currentArchiveId": "capture-card-1",
    "archiveSlots": [{
      "id": "capture-card-1",
      "name": "截图存档",
      "userProfile": { "id": "capture-user", "nickname": "截图用户", "createdAt": "2026-01-01T00:00:00.000Z", "updatedAt": "2026-01-01T00:00:00.000Z" },
      "cardCollection": { "spring": 1, "summer": 0, "autumn": 0, "winter": 0 },
      "wallpaperCollection": { "spring": false, "summer": false, "autumn": false, "winter": false },
      "totalSpins": 1,
      "cardSpins": 1,
      "spinHistory": [],
      "lastSpin": null,
      "auditLogs": [],
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    }],
    "userProfile": { "id": "capture-user", "nickname": "截图用户", "createdAt": "2026-01-01T00:00:00.000Z", "updatedAt": "2026-01-01T00:00:00.000Z" }
  },
  "version": 2
}
```

其余 fixture 变体（同结构，只改字段）：
`card.spring1.wallpaper.json`（`wallpaperCollection.spring: true` → 抽中春季即出**终极奖励 + 视频**）、`card.spring2.json`（`cardCollection.spring: 2` → 直接呈现 CS-05 待领态）、`card.allUnlocked.json`、`card.history.json`（带 `spinHistory`/`auditLogs`）。

`fixtures/monopoly.base.json`（棋盘 + 观众，`players[0].position` 用 §4.3 表决定）：

```json
{
  "state": {
    "currentArchiveId": "capture-monopoly-1",
    "archiveSlots": [{
      "id": "capture-monopoly-1",
      "name": "截图观众档案",
      "players": [{ "id": "p1", "name": "观众A", "position": 0, "diceCount": 1, "moveDirection": 1, "isMoving": false, "activeEffects": [] }],
      "currentPlayerIndex": 0,
      "currentTurn": 0,
      "logs": [],
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    }],
    "players": [{ "id": "p1", "name": "观众A", "position": 0, "diceCount": 1, "moveDirection": 1, "isMoving": false, "activeEffects": [] }],
    "currentPlayerIndex": 0,
    "currentTurn": 0,
    "logs": []
  },
  "version": 1
}
```

**注意**：`pendingEvent` **不在** `partialize` 白名单内（[monopolyStore.ts L1021-L1028](file:///e:/ERE/Documents/Work/直播轮盘/src/stores/monopolyStore.ts#L1021-L1028)），无法预置 → 事件类状态只能靠"掷骰 → 触发"真实操作到达。

### 4.3 落格定位表（配合 `die = 1`）

将 `players[0].position` 设为下表"起点"，再掷骰（强制 `die=1`）即可稳定落到目标格：

| 目标事件 | 目标格 index | 起点 position |
|---|---|---|
| lottery 积分 | 0 | 27 |
| misfortune 厄运 | 1 | 0 |
| adventure 冒险 | 2 | 1 |
| truth 真心话 | 3 | 2 |
| special 特殊效果 | 4 | 3 |
| figure 周边 | 5 | 4 |
| chaos 混乱 | 6 | 5 |

（`position` 由 `normalizeBoardIndex` 取模 28，越界安全；`die=1` 时 `getMovementPath` 仅跨 1 格。）

### 4.4 **绝不动用户真实存档**

1. 使用 `chromium.launchPersistentContext('screenshots/.profile')`——**专用一次性 profile 目录**；**严禁**指向用户日常 Chrome/Edge 的 `User Data`。
2. 采集脚本启动时断言 `context` 由本项目创建（如检查自定义 profile 目录存在标记文件），避免误连已有 profile。
3. 所有 `localStorage` 写入只发生在该临时 profile 的 `localhost:5173` origin 内。
4. 采集结束：先 `context.close()`，再删除 `screenshots/.profile/`；`fixtures/` 只保留 JSON 文本，不含任何真实用户数据。
5. 页面内出现的昵称/观众名一律使用中性占位（"观众A"、"截图用户"），**不要**使用任何真实昵称。
6. 不要触发真实的 CSV 下载后留存文件到用户目录——导出类操作只在 `blocked/skip` 中登记，或设置 `acceptDownloads` 后落到临时 `screenshots/.report/downloads/`。

---

## 5. 截图矩阵（逐个 shot 定义）

分类列：`A` 自动可达 / `D` 需要测试数据 / `B` 不可达(blocked)。

### 5.1 MON — 大富翁（路由 `/`）

| ID | 视口 | 触发操作 | 预期状态 | 类 |
|---|---|---|---|---|
| MON-01 | desktop/mobile/tablet | `gotoMonopoly()` | 初始态：1 观众、0 日志空态、掷骰按钮**可用** | A |
| MON-02 | desktop | `gotoMonopoly()` → `rollDice()` 后 **300ms 内**截 | `掷骰中...` 禁用态 + DiceBox 提示胶囊 | A |
| MON-03 | desktop | 掷骰后逐格移动窗口内截 | 棋子位移中、按钮禁用 | A |
| MON-04 | desktop | `seedMonopoly(position=0)` → `rollDice()` → `waitWheelSettle`前的 300ms | `触发事件：厄运事件轮盘` 按钮出现、棋盘该格高亮 | D |
| MON-05 | desktop | 走完 MON-04 的事件并关闭轮盘 | `上次事件：…` 绿色横幅 | D |
| MON-06 | desktop | `seedMonopoly(position=3)` → 掷骰 → 触发 `special` → 命中"再 +1 骰子" | `系统提示` 青色横幅 + 效果 chips | D |
| MON-07 | desktop | 同 MON-06（命中任意效果） | 当前观众 chips 区出现效果胶囊 | D |
| MON-08 | desktop | `special` 命中"选择移动方向" | `前进/后退` 选择器出现，当前项高亮 | D |
| MON-09 | desktop | `gotoMonopoly()` → 填写昵称 → 回车添加 3 位观众 | 观众列表 3 条、当前项高亮、`×` 各一 | A |
| MON-10 | desktop | `gotoMonopoly()` | 侧栏②日志面板空态虚线框 + "暂无日志…" | A |
| MON-11 | desktop | `gotoMonopoly()` → `rollDice()` | 日志面板出现条目（含时间/类型/观众） | A |
| MON-12 | desktop | `gotoMonopoly()` → 点击 `新档案` | 档案下拉出现 2 项 | A |
| MON-13 | desktop | 依次点击 `读取` / `复制`（空日志） | `archiveMessage` = "已读取本地观众档案 …" / "暂无大富翁日志可复制" | A |
| MON-13b | desktop | 拒绝剪贴板权限后点 `复制`（日志非空） | "复制失败，请检查浏览器剪贴板权限" | A |
| MON-14 | desktop | `gotoMonopoly()` | 侧栏③轮盘说明 7 行色块图例 | A |
| MON-15 | wide | 同 MON-04 | 棋盘目标格 `ring-4 ring-yellow-200` 高亮 | D |
| MON-16 | desktop | 导入 ≥2 观众 | 棋盘出现 P1、P2 棋子 | A |
| MON-17 | desktop | `gotoMonopoly()` → 点击唯一观众的 `×` | `系统提示：至少需要保留一位观众`；列表不变 | A |
| MON-wide | wide(fullPage) | 完成 MON-06 状态后截全页 | 整体版面（含两栏 + 棋盘 + 横幅） | D |

### 5.2 CARD / CS — 积分卡（路由 `/card-wheel`）

| ID | 视口 | 触发操作 | 预期状态 | 类 |
|---|---|---|---|---|
| CARD-01 | desktop/mobile | `gotoCardWheel()` 后**立即**截（图片未完成） | 虚线圆 + spinner +「加载积分卡...」（含 500×500 固定尺寸） | A |
| CARD-02 | desktop/mobile | `gotoCardWheel()` 等 `canvas` 出现 | 转盘就绪、`抽取积分卡` 可用 | A |
| CARD-03 | desktop | `spinCard()` 后 1.5s 内截 | `抽取中...` 禁用态 | A |
| CARD-04 | desktop | `seedCard(card.spring1)` → `spinCard()` | 顶部命中横幅 + `ResultModal` | D |
| CARD-05 | mobile | `gotoCardWheel()` | 小屏整体（检查 500px 占位溢出） | A |
| CS-01 | desktop | `gotoCardWheel()` | 档案头（`当前：存档 1 · ID …`） | A |
| CS-02 | desktop | `gotoCardWheel()` 与抽卡后各一张 | `总抽取 0` / `>0` 两种 | A |
| CS-03 | desktop | `gotoCardWheel()` | 四季卡灰显、`0/2`、进度条 0% | A |
| CS-04 | desktop | `seedCard(card.spring1)` | 春季 `1/2`、进度条 50% | D |
| CS-05 | desktop | `seedCard(card.spring2)` | 春季 `2/2`、橙色边框、`✓` 未出现（未领取） | D |
| CS-06 | desktop | `seedCard(card.allUnlocked)` | 四季黄底 + `✓`、目标文案变为"终极奖励" | D |
| CS-07 | desktop | `seedCard(card.history)` | 历史 chips（≤4 条，含"解锁壁纸/终极奖励"后缀） | D |
| CS-08 | desktop | `gotoCardWheel()` | 日志空态虚线框 | A |
| CS-09 | desktop | `seedCard(card.history)` | 日志列表（≤10 条） | D |
| CS-10 | desktop | 点击 `新建存档` | 存档下拉 2 项 | A |

### 5.3 覆盖层

| ID | 视口 | 触发操作 | 预期状态 | 类 |
|---|---|---|---|---|
| OVL-EVT-01 | desktop | `seedMonopoly(position=0)` → `rollDice()` → `clickTrigger()` 后 400ms 内 | 厄运轮盘，转盘旋转中（指针 + 6 扇区） | D |
| OVL-EVT-02 | desktop | 同上 → `waitWheelSettle()` | 结果卡"抽中事件 N"+ 事件文案 | D |
| OVL-EVT-03 | desktop | `position=1` 同流程 | 冒险事件轮盘结果 | D |
| OVL-EVT-04 | desktop | `position=2` | 真心话轮盘结果（含长文案，验证截断） | D |
| OVL-EVT-05 | desktop | `position=3` | 特殊效果轮盘结果 | D |
| OVL-EVT-06 | desktop | `position=5` | 混乱轮盘（8 动态扇区） | D |
| OVL-FIG-01 | desktop | `position=4` → 掷骰 → 触发 | `实体周边抽取轮盘`，`抽取周边中...` | D |
| OVL-FIG-02 | desktop | 同上等 3.3s | 结果卡"获得 … · 实体周边" | D |
| OVL-RES-01 | desktop | `seedCard(card.zero)` → `spinCard()`（未配对） | 抽卡结果弹窗（标题"指针命中：X积分卡"+ 描述 + 撒花） | D |
| OVL-WALL-01 | desktop | `seedCard(card.spring1)` → `spinCard()` 命中春季 | 壁纸奖励弹窗（深色，单图，"领取壁纸"） | D |
| OVL-WALL-02 | desktop | — | **不可达**（`isUltimate` 分支与页面条件互斥，见 §6） | B |
| OVL-VID-01 | desktop | `seedCard(card.spring1.wallpaper)` → `spinCard()` 命中春季 | 终极视频全屏播放层 | D |
| OVL-VID-02 | desktop | 同 OVL-VID-01 但截 `isPlaying=false` 瞬间 | 视频中央 spinner 遮罩 | D |

> OVL-VID-01/02 依赖 `动态壁纸.mp4` 可播放；若 CSP/编解码受限则为 `blocked` 并在 manifest 记录原因（见 §6 / N9）。

**shot 总数**：MON 18 + CARD/CS 15 + 覆盖层 11（OVL-WALL-02 为 blocked）= **44 张**（每张 × 所需视口，MON-01 与 CARD-01/02/05 各多视口 → 实际文件数约 50）。

---

## 6. 无法自动进入 / 无法由静态分析确认

**不可达（blocked，登记不采集）**

1. `OVL-WALL-02` 终极分支壁纸弹窗：页面渲染条件为 `pendingReward && !showVideoReward`（[CardWheelPage.tsx L203-L205](file:///e:/ERE/Documents/Work/直播轮盘/src/pages/CardWheelPage.tsx#L203-L205)），而 `addCard` 在 `isUltimate` 时同时把 `showVideoReward` 置 `true`（[gameStore.ts L444-L455](file:///e:/ERE/Documents/Work/直播轮盘/src/stores/gameStore.ts#L444-L455)）→ 该分支**永远不渲染**。
2. `gamePhase === 'completed'`：无赋值点。
3. 两个 Store 的 `pendingReward`/`showVideoReward` 无法预置（rehydrate 时被重置，见 §3 前置事实）。

**需人工介入（manual）**

4. 观感类判断：深浅遮罩切换是否突兀、撒花/光点是否噪点化、字体回退后的风格差距。截图只是证据，结论需人工看图。
5. 若 `prefers-reduced-motion: reduce` 使"旋转中"帧消失，MON-02/03、CARD-03、OVL-EVT-01、OVL-FIG-01 需**改用 `reduce: 'no-preference'` + 精确毫秒定时**单独采集（时序敏感，建议单独跑一轮，不与其他 shot 混跑）。

**无法确认（只能标注，不作断言）**

6. 棋盘坐标与底图对齐、移动端真实溢出、深色面板对比度、长文案截断、骰子 canvas 是否绘制、视频能否播放（详见 `ui-issues.md` §3 的 N1–N11）。
7. 转盘"旋转中"属于**瞬时中间态**，不保证每次落点一致；此类 shot 只作为视觉参考，不用于像素 diff。

---

## 7. 总览拼图与 manifest.json

### 7.1 总览拼图（overview）

两级：

- **分组拼图**：按区域各出一张 → `overview/MON.png`、`overview/CARD.png`、`overview/OVERLAY.png`、`overview/MOBILE.png`。
- **总览大拼图**：全部 `desktop` 基线 → `overview/ALL.png`（3–4 列网格）。

**方案 A：ImageMagick（简单）**

```powershell
magick montage screenshots/raw/MON-*.desktop.png `
  -tile 3x -geometry 480x+8+8 -background "#f5f5f5" `
  screenshots/overview/MON.png
```

**方案 B：sharp（无外部依赖，推荐 CI 用）**

```js
// screenshots/tools/mosaic.mjs
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
const manifest = JSON.parse(readFileSync('screenshots/manifest.json', 'utf8'));
const shots = manifest.shots.filter(s => s.viewport === 'desktop' && s.status === 'ok');
const THUMB_W = 480;
const COLS = 3, GAP = 8;
// 逐张 resize 后 composite 到 canvas（高度取该列累计），此处省略逐行排版细节
```

**方案 C：HTML 画廊**：生成 `overview/gallery.html`（图片网格 + ID 标签 + 状态标签），再用 Playwright `page.screenshot({ fullPage: true })` 导出——最易实现、标签最清晰，推荐首选。

### 7.2 manifest.json 结构

```json
{
  "meta": {
    "commit": "8dcf2151799088d97d6c53f5751a86b1b9a347dc",
    "capturedAt": "2026-10-20T00:00:00+08:00",
    "baseUrl": "http://localhost:5173",
    "playwright": "1.x",
    "deviceScaleFactor": 1,
    "colorScheme": "light",
    "reducedMotion": "no-preference",
    "seeded": true
  },
  "shots": [
    {
      "id": "MON-01",
      "area": "monopoly",
      "route": "/",
      "action": "gotoMonopoly()",
      "expected": "初始态：1观众/0日志/按钮可用",
      "class": "auto",
      "viewport": "desktop",
      "viewportSize": [1440, 900],
      "file": "raw/MON-01.desktop.png",
      "seed": null,
      "status": "ok",
      "hash": "sha256:…",
      "capturedAt": "…"
    },
    {
      "id": "OVL-WALL-02",
      "area": "overlay",
      "route": "/card-wheel",
      "action": "—",
      "expected": "终极奖励弹窗（isUltimate）",
      "class": "blocked",
      "status": "skipped",
      "reason": "渲染条件 pendingReward && !showVideoReward 与 addCard 设置 showVideoReward=true 互斥，源码不可达"
    }
  ]
}
```

字段要求：`id` 必须存在于 `ui-inventory.md` §3；`class` ∈ `auto|data|blocked`；`status` ∈ `ok|skipped|error`；`blocked/error` 必须有 `reason`；`hash` 供重构前后逐张 diff。

---

## 8. 执行顺序建议（Codex 落地）

1. 建 `screenshots/tools/`：`seed.mjs`（生成 fixtures）、`capture.mjs`（Playwright 主流程）、`mosaic.mjs`（拼图+manifest）。
2. 先跑 **`auto` 组**（约 12 shot）验证环境与命名规则。
3. 跑 **`data` 组**：先用 `spinUntilSeason` 标定每季的 `unit` 种子并写入 fixtures，再采集。
4. 单独跑 **时序敏感组**（MON-02/03、CARD-03、OVL-EVT-01、OVL-FIG-01、OVL-VID-02）：`reducedMotion: 'no-preference'` + 显式 `waitForTimeout`。
5. 生成 `overview/*` 与 `manifest.json`，人工核对 blocked 项。
6. 清理 `screenshots/.profile/`；确认未写入任何用户真实 profile 或业务数据。
7. **本阶段不改动 `src/` 下任何业务代码**（含 `App.tsx`、stores、data、既有 UI）；仅新增 `screenshots/` 与 `reports/` 下的采集工具与产物。

---

## 9. 验收标准

- `manifest.json` 中登记 shot 数 = 44（不含各视口副本）且 `id` 与 `ui-inventory.md` §3 **一一对应**。
- 每个 `status=ok` 的文件可按 `id + viewport` 唯一定位，且重复执行两次得到**相同**画面（随机源已被固定）。
- `blocked` 项均有 `reason` 与源码出处。
- 采集前后，用户日常浏览器 profile 与真实存档**零改动**。
