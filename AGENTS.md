# 🎮 AGENTS.md - 直播互动娱乐系统开发指南

> **项目名称**: 直播互动娱乐系统（大富翁棋盘 + 积分卡转盘）
>
> **最后更新**: 2026-05-20
>
> **适用对象**: AI 助手、开发者、维护者

---

## 📖 目录

1. [项目概述](#项目概述)
2. [技术栈](#技术栈)
3. [项目结构](#项目结构)
4. [核心功能模块](#核心功能模块)
5. [状态管理架构](#状态管理架构)
6. [数据流与交互逻辑](#数据流与交互逻辑)
7. [游戏规则详解](#游戏规则详解)
8. [开发规范](#开发规范)
9. [常用命令](#常用命令)
10. [部署指南](#部署指南)

---

## 🎯 项目概述

### 产品定位
这是一个**直播互动娱乐系统**，专为虚拟主播/直播场景设计，包含两大核心玩法：

1. **🎲 大富翁棋盘系统** - 28格互动棋盘，7种事件类型轮盘
2. **🃏 积分卡收集系统** - 四季积分卡配对奖励机制

### 核心特性
- ✅ **多维度互动**: 惩罚、表演、问答、增益、收集五大类事件
- ✅ **统一经济系统**: 所有奖励汇聚为"掷骰次数"，形成闭环
- ✅ **深度养成机制**: 积分卡收集 + 配对解锁壁纸
- ✅ **主播参与感**: 冒险事件让主播成为游戏一部分
- ✅ **数据持久化**: LocalStorage 多存档支持
- ✅ **完全响应式**: 适配桌面和移动端

### 目标用户
- 👥 **主播**: 通过互动活动增加观众粘性
- 👥 **观众**: 参与游戏获得奖励和娱乐体验

---

## 💻 技术栈

### 前端框架
```json
{
  "framework": "React 18.3.1",
  "language": "TypeScript ~5.8.3",
  "build_tool": "Vite 6.3.5",
  "styling": "Tailwind CSS 3.4.17",
  "routing": "React Router DOM 7.3.0"
}
```

### 状态管理
```json
{
  "state_management": "Zustand 5.0.3",
  "persistence": "zustand/middleware (localStorage)",
  "utilities": ["clsx 2.1.1", "tailwind-merge 3.0.2", "lucide-react 0.511.0"]
}
```

### 第三方库
- **dice-box-threejs**: 3D 骰子物理动画引擎
- **crypto API**: 安全随机数生成

---

## 📁 项目结构

```
直播/
├── public/                          # 静态资源
│   ├── 大富翁棋盘.png              # 棋盘背景图 (28格布局)
│   ├── 春/夏/秋/冬-积分卡.png      # 季节积分卡图片
│   ├── 春/夏/秋/冬-壁纸.png        # 季节壁纸奖励
│   ├── 电脑壁纸.png                # 终极奖励
│   ├── 动态壁纸.mp4                # 终极动态视频
│   └── favicon.svg                 # 网站图标
│
├── src/
│   ├── components/                 # React 组件
│   │   ├── GameBoard.tsx          # 棋盘渲染组件 (28格位置显示)
│   │   ├── EventWheel.tsx         # 通用事件轮盘组件 (SVG绘制)
│   │   ├── FigureWheel.tsx        # 手办抽取专用轮盘
│   │   ├── CardWheelRenderer.tsx  # 积分卡转盘渲染器
│   │   ├── DiceBox.tsx            # 3D骰子组件封装
│   │   ├── ResultModal.tsx        # 结果展示弹窗
│   │   ├── WallpaperRewardModal.tsx # 壁纸奖励弹窗
│   │   ├── VideoRewardPlayer.tsx  # 终极视频播放器
│   │   ├── CollectionStatus.tsx   # 收集进度展示
│   │   └── Empty.tsx              # 空状态组件
│   │
│   ├── pages/                      # 页面组件
│   │   ├── MonopolyGame.tsx       # 大富翁主页面 (核心页面)
│   │   └── CardWheelPage.tsx      # 积分卡独立页面
│   │
│   ├── stores/                     # Zustand 状态管理
│   │   ├── gameStore.ts           # 积分卡游戏状态 (季节收集)
│   │   └── monopolyStore.ts       # 大富翁游戏状态 (棋盘逻辑)
│   │
│   ├── data/                       # 配置数据
│   │   ├── eventConfigs.ts        # 轮盘事件配置 (28个事件定义)
│   │   └── seasons.ts             # 季节配置 (春夏秋冬四季数据)
│   │
│   ├── hooks/                      # 自定义 Hooks
│   │   ├── useSpinController.ts   # 转盘旋转控制逻辑
│   │   ├── useProbabilityEngine.ts # 概率引擎 (随机角度计算)
│   │   ├── useImageLoader.ts      # 图片预加载工具
│   │   └── useTheme.ts            # 主题切换 Hook
│   │
│   ├── types/                      # TypeScript 类型定义
│   │   ├── wheel.ts               # 转盘相关类型
│   │   └── monopoly.ts            # 大富翁相关类型
│   │
│   ├── lib/                        # 工具库
│   │   ├── dice-box-wrapper.ts    # dice-box 库封装
│   │   └── utils.ts               # 通用工具函数
│   │
│   ├── App.tsx                     # 路由配置 (3个路由)
│   ├── main.tsx                    # 应用入口
│   └── index.css                   # 全局样式 (cute-font 字体)
│
├── dice-box-threejs-main/          # 3D骰子第三方库源码
│   └── dice-box-threejs-main/
│       ├── src/
│       │   ├── DiceBox.js         # 核心3D骰子类
│       │   ├── DiceFactory.js     # 骰子工厂
│       │   └── ...               # 其他辅助模块
│       └── public/
│           ├── sounds/            # 骰子音效 (金属/塑料/木质/硬币)
│           └── textures/          # 骰子材质纹理
│
├── .trae/documents/                # 项目文档
│   ├── PRD.md                     # 产品需求文档
│   └── technical-architecture.md  # 技术架构文档
│
├── package.json                    # 项目依赖配置
├── vite.config.ts                  # Vite 构建配置
├── tailwind.config.js              # Tailwind CSS 配置
├── tsconfig.json                   # TypeScript 编译配置
├── eslint.config.js                # ESLint 代码规范
└── index.html                      # HTML 入口文件
```

---

## 🧩 核心功能模块

### 1️⃣ 大富翁棋盘系统 (`MonopolyGame`)

**文件位置**: [MonopolyGame.tsx](src/pages/MonopolyGame.tsx)

#### 功能描述
28 格环形棋盘，7 种事件类型各占 4 格，中心对称分布。

#### 棋盘布局 (28格)
```
位置 0, 7, 14, 21 → 🟡 积分抽奖格 (lottery)
位置 1, 8, 15, 22 → 🔴 厄运事件格 (misfortune)
位置 2, 9, 16, 23 → 🟠 冒险事件格 (adventure)
位置 3, 10, 17, 24 → 🩷 真心话格 (truth)
位置 4, 11, 18, 25 → 🔵 特殊效果格 (special)
位置 5, 12, 19, 26 → 🟣 手办抽取格 (figure)
位置 6, 13, 20, 27 → 🔵 混乱事件格 (chaos)
```

#### 核心流程
```
掷骰子 → 自动移动 → 触发事件按钮 → 打开对应轮盘 → 执行结果 → 下一回合
```

#### 关键组件
- **[GameBoard.tsx](src/components/GameBoard.tsx)**: 棋盘渲染，显示玩家位置标记
- **[DiceBox.tsx](src/components/DiceBox.tsx)**: 3D 骰子动画展示
- **[EventWheel.tsx](src/components/EventWheel.tsx)**: 5种事件轮盘共用组件
- **[FigureWheel.tsx](src/components/FigureWheel.tsx)**: 手办抽取专属轮盘

---

### 2️⃣ 积分卡收集系统 (`CardWheelPage`)

**文件位置**: [CardWheelPage.tsx](src/pages/CardWheelPage.tsx)

#### 功能描述
四等分转盘，抽取春/夏/秋/冬四季积分卡，集齐 2 张同季卡片可兑换奖励。

#### 奖励体系
| 收集进度 | 奖励内容 |
|---------|---------|
| 同季 2 张 (首次) | 🖼️ 解锁该季节壁纸 |
| 同季 2 张 (再次) | 🖥️ 终极奖励：壁纸 + 电脑壁纸 + 动态视频 |

#### 季节数据 ([seasons.ts](src/data/seasons.ts))
```typescript
Season = 'spring' | 'summer' | 'autumn' | 'winter'

SEASON_INFO = {
  spring: { name: '春季', emoji: '🌸', cardLabel: '春季积分卡' },
  summer: { name: '夏季', emoji: '☀️', cardLabel: '夏季积分卡' },
  autumn: { name: '秋季', emoji: '🍁', cardLabel: '秋季积分卡' },
  winter: { name: '冬季', emoji: '❄️', cardLabel: '冬季积分卡' }
}
```

---

### 3️⃣ 七大轮盘事件系统 ([eventConfigs.ts](src/data/eventConfigs.ts))

#### 📋 事件分类总览 (共 28 个基础事件)

##### 💀 厄运事件 (MISFORTUNE_EVENTS) - 7个
**目标**: 观众 | **性质**: 惩罚性趣味挑战

| 序号 | 事件内容 |
|------|---------|
| 1 | 发送一段学猪叫的语音 |
| 2 | 画一张自己抽象版的肖像画 |
| 3 | 用方言念一段绕口令 |
| 4 | 即兴跳一段舞 |
| 5 | 做鬼脸 30 秒 |
| 6 | 模仿一位明星说话 |

##### ⚔️ 冒险事件 (ADVENTURE_EVENTS) - 6个
**目标**: 主播 | **性质**: 才艺表演展示

| 序号 | 事件内容 |
|------|---------|
| 1 | 即兴唱一首歌 |
| 2 | 接下来 10 分钟扮演观众指定角色 |
| 3 | 讲一个冷笑话 |
| 4 | 表演一个魔术 |
| 5 | 接受一个挑战任务 |
| 6 | 来一段 Rap |

##### 💬 真心话事件 (TRUTH_EVENTS) - 6个
**目标**: 观众 | **性质**: 问答互动调查

| 序号 | 事件内容 |
|------|---------|
| 1 | 你最喜欢的虚拟主播是？ |
| 2 | 你最讨厌主播哪一点？ |
| 3 | 你愿意为直播花多少钱？ |
| 4 | 给主播打分（1-10）|
| 5 | 最想看主播做什么内容？ |
| 6 | 对主播说一句真心话 |

##### ✨ 特殊效果 (SPECIAL_EFFECTS) - 6个
**目标**: 观众 | **性质**: 游戏增益 Buff

| 效果名称 | 游戏影响 | 效果类型标识 |
|---------|---------|-------------|
| 再 +1 骰子（下次掷骰）| 下次掷骰时多投1颗 | `extra_dice` |
| 经过积分抽奖格自动抽奖 | 途经积分格触发抽奖 | `auto_lottery` |
| 直接前进 3 格 | 立即前进3格 | `move_forward_3` |
| 再次掷骰子 | 本回合结束后再掷一次 | `reroll` |
| 免疫下一次厄运 | 下次厄运事件无效 | `misfortune_immunity` |
| 选择移动方向 | 可选择前进或后退 | `choose_direction` |

##### 🎮 手办抽取 (FIGURE_OPTIONS) - 3个
**目标**: 观众 | **性质**: 稀有度收藏

| 名称 | 图标 | 稀有度 |
|------|------|--------|
| 维什戴尔 Q版3D模型 | W | **SSR** |
| 凯尔希 Q版3D模型 | K | **SR** |
| 阿米娅 Q版3D模型 | A | **SR** |

##### 🌀 混乱轮盘 (Chaos Wheel)
- **生成方式**: 从上述 5 类事件中随机抽取 8 个
- **调用函数**: `generateChaosWheel()` in [eventConfigs.ts:56-58](src/data/eventConfigs.ts#L56-L58)
- **特点**: 每次转盘内容不同，极致随机性

---

## 🗄️ 状态管理架构

### 双 Store 设计模式

项目采用 **Zustand** 进行全局状态管理，分为两个独立的 Store：

#### Store 1: `useGameStore` (积分卡系统)

**文件**: [gameStore.ts](src/stores/gameStore.ts)

**持久化键名**: `season-wheel-game-state` (version: 2)

**核心状态**:
```typescript
interface GameState {
  // 用户档案
  userProfile: UserProfile;
  archiveSlots: SaveArchive[];
  currentArchiveId: string;

  // 收集进度
  cardCollection: CardCollection;      // { spring: n, summer: n, ... }
  wallpaperCollection: WallpaperCollection; // { spring: bool, ... }

  // 游戏统计
  totalSpins: number;
  cardSpins: number;
  spinHistory: SpinHistoryEntry[];
  lastSpin: SpinHistoryEntry | null;

  // 待领取奖励
  pendingReward: GameReward | null;     // 壁纸/终极奖励
  showVideoReward: boolean;             // 是否显示视频
}
```

**核心方法**:
- `addCard(season)`: 添加积分卡，返回奖励结果
- `claimWallpaper(season)`: 领取季节壁纸
- `claimUltimateReward()`: 领取终极奖励
- `createArchive(name)`: 创建新存档
- `switchArchive(archiveId)`: 切换存档

---

#### Store 2: `useMonopolyStore` (大富翁系统)

**文件**: [monopolyStore.ts](src/stores/monopolyStore.ts)

**持久化键名**: `monopoly-audience-state` (version: 1)

**核心状态**:
```typescript
interface GameState {
  // 档案系统
  archiveSlots: MonopolyArchive[];
  currentArchiveId: string;

  // 玩家状态
  players: PlayerState[];
  currentPlayerIndex: number;
  currentTurn: number;

  // 游戏进程
  gamePhase: 'waiting' | 'rolling' | 'moving' | 'event' | 'completed';
  isRollingDice: boolean;
  lastDiceResult: number | null;
  pendingEvent: PendingEvent | null;

  // 棋盘数据
  boardPositions: BoardPosition[];  // 28格位置配置

  // 日志系统
  logs: MonopolyLogEntry[];
  lastEffectMessage: string;
}
```

**玩家状态结构**:
```typescript
interface PlayerState {
  id: string;
  name: string;
  position: number;              // 当前格子位置 (0-27)
  diceCount: number;             // 下次掷骰数量 (1-4)
  moveDirection: 1 | -1;         // 移动方向 (前进/后退)
  isMoving: boolean;             // 是否正在移动
  activeEffects: ActiveEffect[]; // 激活的增益效果列表
}
```

**增益效果类型**:
```typescript
type ActiveEffect = {
  type: 'extra_dice' | 'auto_lottery' | 'reroll' | 'misfortune_immunity' | 'choose_direction';
  remainingUses: number;  // 剩余使用次数
  description: string;    // 显示文本
};
```

**核心方法**:

| 方法名 | 功能说明 |
|-------|---------|
| `rollDice(): Promise<number>` | 掷骰子，返回总点数 (1-24) |
| `movePlayer(steps: number)` | 移动玩家，触发途经事件 |
| `movePlayerByEffect(steps: number)` | 效果触发的强制移动 |
| `triggerEvent(position)` | 触发格子事件 (检查免疫等) |
| `applyEffect(effect)` | 为当前玩家添加增益效果 |
| `setMoveDirection(direction)` | 设置移动方向 (1/-1) |
| `nextTurn()` | 切换到下一位玩家 |
| `continueCurrentTurn()` | 重掷效果：继续当前玩家回合 |
| `addPlayer(name)` / `removePlayer(id)` | 玩家管理 |
| `importPlayers(names[])` | 批量导入观众名单 |
| `createArchive() / switchArchive() / saveCurrentArchive()` | 存档管理 |
| `resetGame()` | 重置棋盘 (保留玩家) |

---

## 🔄 数据流与交互逻辑

### 页面路由结构 ([App.tsx](src/App.tsx))

```
/ (根路径)          → <MonopolyGame />     (大富翁主页面)
/card-wheel         → <CardWheelPage />    (积分卡独立页面)
/monopoly           → <MonopolyGame />     (大富翁主页面)
* (其他路径)        → <MonopolyGame />     (兜底到大富翁)
```

### 大富翁完整交互流程

```
1. 【等待阶段】gamePhase = 'waiting'
   ↓ 用户点击"掷骰子前进"
   
2. 【掷骰阶段】gamePhase = 'rolling'
   → rollDice() 生成随机点数 (1-6 per die × diceCount)
   → 等待 1600ms 动画延迟
   → 更新 lastDiceResult, lastDiceValues
   
3. 【移动阶段】gamePhase = 'moving'
   → movePlayer(result) 计算移动路径
   → 每 260ms 更新一次位置 (逐格移动动画)
   → 检查 auto_lottery 效果 (途经积分格自动触发)
   → 到达目标格子后调用 triggerEvent()
   
4. 【事件阶段】gamePhase = 'event'
   → 设置 pendingEvent
   → 显示"触发事件"按钮
   ↓ 用户点击"触发事件"按钮
   
5a.【积分抽奖】type = 'lottery'
    → nextTurn() 结束回合
    → navigate('/card-wheel?from=monopoly') 跳转到积分卡页面
    
5b.【手办抽取】type = 'figure'
    → 打开 <FigureWheel /> 弹窗
    → 3秒旋转动画后显示结果
    
5c.【其他事件】type in ['misfortune','adventure','truth','special','chaos']
    → 打开 <EventWheel /> 弹窗
    → 3600ms 旋转动画 (6-8圈)
    → 显示抽中的事件
    
6. 【事件完成回调】handleEventComplete(event)
    → 特殊效果解析: getEffectFromText()
       ├─ "直接前进 3 格" → movePlayerByEffect(3)
       ├─ 其他效果 → applyEffect(effect)
       └─ 普通事件 → 仅记录结果
   
7. 【关闭轮盘】handleWheelClose()
    → 判断是否需要继续回合 (reroll效果)
       ├─ continueCurrentTurn() → 回到 waiting 阶段
       └─ nextTurn() → 切换到下一位玩家
```

### 积分卡交互流程

```
1. 进入 /card-wheel 页面
2. 加载四季积分卡图片 (useImageLoader)
3. 用户点击"抽取积分卡"
4. startSpin() → useSpinController 启动旋转
   - 随机角度: getRandomAngle() (crypto 安全随机)
   - 旋转动画: 5000ms, easeOutQuart 缓动
   - 5-8 圈 + 随机偏移
5. 旋转结束 → onSpinComplete(result)
   - result.winningIndex (0-3 对应四季)
   - addCard(season) 更新收集进度
   - 检查是否达成配对条件 (count >= 2)
6. 显示结果弹窗 <ResultModal />
7. 如果有奖励:
   - 首次配对 → <WallpaperRewardModal />
   - 再次配对 → <VideoRewardPlayer /> (终极视频)
```

---

## 🎲 游戏规则详解

### 掷骰规则
- **默认骰子数**: 1 颗六面骰 (1-6)
- **最大骰子数**: 4 颗 (extra_dice 效果叠加上限)
- **点数范围**: 1-24 (4×6)
- **移动方向**: 默认前进 (可选择后退)

### 移动规则
- **棋盘大小**: 28 格 (环形)
- **移动方式**: 顺时针/逆时针 (由 direction 决定)
- **越界处理**: 自动循环 (position % 28)
- **动画时长**: 每格 260ms

### 事件触发规则
- **触发时机**: 移动结束后立即触发
- **免疫机制**: misfortune_immunity 效果可抵消厄运事件
- **自动抽奖**: auto_lottery 效果在途经积分格时触发
- **事件优先级**: 目标格子事件 > 途经格子的 auto_lottery

### 回合结束规则
- **正常情况**: 事件执行完毕后 → nextTurn()
- **重掷情况**: 获得 reroll 效果 → continueCurrentTurn()
- **免疫情况**: 厄运被免疫 → 直接 nextTurn()

### 奖励规则 (积分卡系统)
- **收集单位**: 季节积分卡 (春/夏/秋/冬)
- **配对条件**: 同一季节积满 2 张
- **首次奖励**: 该季节壁纸图片
- **再次奖励**: 终极大礼包 (壁纸+电脑壁纸+动态视频)
- **重置机制**: 领取奖励后该季节计数归零

---

## 📐 开发规范

### 代码风格
- **语言**: TypeScript (严格模式)
- **命名规范**:
  - 组件: PascalCase (`EventWheel.tsx`)
  - 函数/变量: camelCase (`handleDiceRoll`)
  - 常量: UPPER_SNAKE_CASE (`BOARD_SIZE`, `EVENT_CONFIGS`)
  - 类型接口: PascalCase (`PlayerState`, `BoardPosition`)
- **注释**: 中文注释 (匹配用户语言)

### 组件设计原则
- **单一职责**: 每个组件只负责一个功能
- **Props 最小化**: 只传递必要的数据
- **状态提升**: 全局状态放 Store，局部状态用 useState
- **Hook 封装**: 复杂逻辑抽取为自定义 Hook

### 文件组织规范
```
src/
├── components/    # 纯 UI 组件 (无业务逻辑)
├── pages/         # 页面级组件 (组装业务逻辑)
├── stores/        # Zustand Store (状态 + 方法)
├── data/          # 静态配置数据 (事件、季节)
├── hooks/         # 自定义 Hooks (复用逻辑)
├── types/         # TypeScript 类型定义
└── lib/           # 工具函数和第三方封装
```

### Git 提交规范 (建议)
```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 重构代码
perf: 性能优化
test: 测试相关
chore: 构建/工具链
```

---

## 🛠️ 常用命令

### 开发环境
```bash
# 安装依赖
npm install

# 启动开发服务器 (http://localhost:5173)
npm run dev

# 代码检查
npm run lint

# 类型检查
npm run check (等同于 tsc -b --noEmit)

# 完整测试 (lint + typecheck + build)
npm run test
```

### 生产构建
```bash
# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

### VS Code 快捷操作
- **格式化文档**: `Shift + Alt + F`
- **快速修复**: `Ctrl + .`
- **转到定义**: `F12`
- **终端**: `Ctrl + ` (反引号)

---

## 🚀 部署指南

### 构建产物
```bash
npm run build
# 输出目录: dist/
```

### 静态部署
本项目为纯前端应用，可部署至任何静态托管服务：

**推荐平台**:
- Vercel (推荐，零配置)
- Netlify
- GitHub Pages
- Cloudflare Pages

**部署步骤 (以 Vercel 为例)**:
1. 导入 Git 仓库
2. Build Command: `npm run build`
3. Output Directory: `dist`
4. Deploy!

### 环境变量
当前无需环境变量，所有配置均为客户端本地存储。

### 浏览器兼容性
- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ⚠️ 需要支持 WebGL (3D 骰子)
- ⚠️ 需要 LocalStorage API

---

## 📊 关键指标与监控

### 性能指标
- **首屏加载**: < 2s (含图片预加载)
- **转盘动画**: 3600ms (事件轮盘) / 5000ms (积分卡轮盘)
- **骰子动画**: 1600ms
- **移动动画**: 260ms/格

### 数据存储容量
- **LocalStorage 限制**: 5-10MB (浏览器限制)
- **单存档大小**: ~2-5KB (取决于日志数量)
- **最大存档数**: 无硬性限制 (建议 < 20 个)
- **日志保留**: 最新 600 条 (大富翁) / 30 条 (积分卡)

---

## 🔧 故障排查

### 常见问题

#### Q1: 转盘不旋转？
**可能原因**:
- `isSpinning` 状态未正确重置
- 事件数组为空
- animationFrame 未清理

**解决方法**:
```typescript
// 检查 events 数组
console.log('Events:', events.length);

// 清理 animationRef
useEffect(() => {
  return () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  };
}, []);
```

#### Q2: 状态未持久化？
**可能原因**:
- LocalStorage 被禁用
- 存储空间已满
- persist 中间件版本冲突

**解决方法**:
```javascript
// 检查 localStorage
console.log('LS:', localStorage.getItem('monopoly-audience-state'));

// 手动触发 rehydrate
await useMonopolyStore.persist.rehydrate();
```

#### Q3: 3D 骰子不显示？
**可能原因**:
- WebGL 不支持
- dice-box 资源路径错误
- 材质纹理加载失败

**解决方法**:
```bash
# 检查浏览器控制台是否有 WebGL 错误
# 确认 public/ 资源目录完整
```

---

## 📚 扩展开发指南

### 如何添加新的事件类型？

**步骤 1**: 在 [eventConfigs.ts](src/data/eventConfigs.ts) 添加事件数组
```typescript
export const NEW_EVENTS = [
  '新事件 1',
  '新事件 2',
];
```

**步骤 2**: 在 [monopoly.ts](src/types/monopoly.ts) 扩展 BoardEventType
```typescript
export type BoardEventType =
  | ...existing types
  | 'new_type';  // 新增类型
```

**步骤 3**: 在 [monopolyStore.ts](src/stores/monopolyStore.ts) 配置 EVENT_CONFIGS
```typescript
new_type: {
  name: '新事件轮盘',
  icon: '新',
  color: '#XXXXXX',
  target: 'audience',
  positions: [X, X, X, X],  // 4个格子位置
  summary: '新事件描述',
},
```

**步骤 4**: 在 [MonopolyGame.tsx](src/pages/MonopolyGame.tsx) 添加轮盘配置
```typescript
const EVENT_WHEEL_PROPS = {
  ...existing,
  new_type: {
    title: '新事件轮盘',
    icon: '新',
    events: NEW_EVENTS,
    color: EVENT_CONFIGS.new_type.color,
  },
};
```

### 如何添加新的增益效果？

**步骤 1**: 在 [monopoly.ts](src/types/monopoly.ts) 扩展 ActiveEffect.type
```typescript
type: 'extra_dice' | ... | 'new_effect';
```

**步骤 2**: 在 [MonopolyGame.tsx](src/pages/MonopolyGame.tsx) 的 getEffectFromText() 添加解析逻辑
```typescript
if (effect.includes('新效果关键词')) {
  return {
    type: 'new_effect',
    remainingUses: 1,
    description: '新效果描述',
  };
}
```

**步骤 3**: 在 [monopolyStore.ts](src/stores/monopolyStore.ts) 的 applyEffect() 或相应方法中处理逻辑

---

## 🎨 视觉设计规范

### 色彩系统
```css
/* 主色调 */
--primary-purple: #8B5CF6;      /* 主紫色 */
--primary-gold: #FBBF24;        /* 金黄色 */
--accent-pink: #EC4899;         /* 强调粉 */

/* 事件颜色 */
--lottery: #F59E0B;             /* 积分 - 琥珀色 */
--misfortune: #B91C1C;          /* 厄运 - 红色 */
--adventure: #EA580C;           /* 冒险 - 橙色 */
--truth: #DB2777;               /* 真心话 - 粉红 */
--special: #0891B2;             /* 特效 - 青色 */
--figure: #7C3AED;              /* 手办 - 紫色 */
--chaos: #4338CA;               /* 混乱 - 靛蓝 */

/* 背景色 */
--bg-dark: slate-950;           /* 深色背景 */
--bg-gradient: linear-gradient(...); /* 渐变背景 */
```

### 字体系统
```css
/* 主字体 */
font-family: var(--cute-font);  /* 可爱风格字体 */

/* 字重 */
font-weight: 700 (bold);         /* 常规加粗 */
font-weight: 800 (extrabold);    /* 标题 */
font-weight: 900 (black);        /* 重点强调 */
```

### 圆角规范
```css
rounded-lg:   0.5rem;   /* 小元素 */
rounded-xl:   0.75rem;  /* 卡片 */
rounded-2xl:  1rem;     /* 大卡片 */
rounded-[28px]: 1.75rem;/* 弹窗 */
rounded-full: 9999px;   /* 圆形/胶囊 */
```

---

## 📞 联系与支持

### 相关文档
- [PRD.md](.trae/documents/PRD.md) - 产品需求文档
- [technical-architecture.md](.trae/documents/technical-architecture.md) - 技术架构文档
- [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - 项目总结 & 活动方案
- [POSTER_PROMPTS.md](POSTER_PROMPTS.md) - 海报生成提示词

### 问题反馈
如遇到问题，请检查：
1. 浏览器控制台错误信息
2. Network 面板请求状态
3. LocalStorage 数据完整性
4. TypeScript 类型检查结果

---

## 📝 版本历史

### v1.0.0 (2026-05-19)
- ✅ 初始版本发布
- ✅ 大富翁棋盘系统 (28格, 7类事件)
- ✅ 积分卡收集系统 (四季配对)
- ✅ 3D 骰子系统
- ✅ 多存档持久化
- ✅ 完全响应式设计

### v1.1.0 (2026-05-20)
- 📝 完善 AGENTS.md 开发文档
- 🔧 优化事件轮盘动画性能
- 🐛 修复若干边界 case

---

## 📄 许可证

本项目仅供学习和内部使用。

---

**文档维护者**: AI Assistant  
**最后审核**: 2026-05-20  
**文档版本**: v1.0.0  
**总字数**: ~15,000 字
