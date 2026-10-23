# MON-01 功能映射核对

依据冻结 `states/MON-01.desktop.svg`、`FUNCTION-MATRIX.json`、`src/pages/MonopolyGame.tsx` 与 `src/stores/monopolyStore.ts`。主状态为 `states/MON-01.desktop.svg`；“工具区展开”是 `concepts/MON-01.tools-expanded.svg`，不是已实现页面。下列映射表示**设计承载位置**，不是代码功能验收。

| 功能 ID | 新版可见位置与 SVG ID | 语义与实现注意 |
|---|---|---|
| MON-F01 | 主状态 `MON-HEADER`, `MON-NAV-CARD` | 积分抽奖仍指向现有 `/card-wheel`。 |
| MON-F02 | 主状态 `MON-HEADER`, `MON-RESET` | 棋盘重置保留危险样式；不等于删除存档。 |
| MON-F03 | 展开稿 `MON-PROFILE-SELECT/SAVE/LOAD/NEW` | 档案切换、保存、读取、新建仍需真实可达面板。 |
| MON-F04 | 展开稿 `MON-AUDIENCE-EDIT` | 修改当前观众昵称。 |
| MON-F05 | 展开稿 `MON-USER-COUNT/SELECT/INPUT/ADD/BULK/IMPORT/DELETE` | 观众选择、添加、批量导入与删除。 |
| MON-F06 | 展开稿 `MON-USER-DELETE` | 最后一位观众不可删除；反馈状态另属 `MON-17`。 |
| MON-F07 | 主状态 `MON-TURN-CONTROLS`, `MON-DICE-RESULT`；结果样板 `MON-CENTER-FEEDBACK` | READY 无点数；ROLL_RESULT 与 EVENT_PENDING 的点数均标为设计示例。 |
| MON-F08 | 主状态与三张状态样板 `MON-ACTION-ROLL`, `MON-DIRECTION` | ROLLING、ROLL_RESULT、EVENT_PENDING 显示禁用样式；方向在初始态仅是状态，只有效果允许时可切换。旧 `MON-NEXT-TURN` 常驻假按钮仍不采用。 |
| MON-F09 | 主状态 `MON-BOARD`, `MON-CELL-01`～`28`, `MON-BOARD-STATUS` | 格号和环形次序必须保持。 |
| MON-F10 | 主状态 `MON-PLAYER-TOKEN-1`, `MON-BOARD-STATUS` | P1 显示在索引 0 的 #01；P2 由专属状态表示。 |
| MON-F11 | 主状态 `MON-ACTION-ROLL`, `MON-BOARD`, `MON-LAST-EVENT`；EVENT_PENDING 样板 `MON-ACTION-TRIGGER-EVENT` | 默认空中心；事件待触发态的动作对应运行时已有的 `handlePendingEvent`，不是新功能。 |
| MON-F12 | 主状态 `MON-DIRECTION`; 展开稿 `MON-EFFECTS` | 默认无激活效果；方向效果另态。 |
| MON-F13 | 主状态 `MON-LAST-EVENT`; 展开稿 `MON-LOGS`, `MON-FEEDBACK` | 提示和记录按真实状态展示。 |
| MON-F14 | 展开稿 `MON-LOG-COPY`, `MON-LOG-CSV` | 真实日志复制与 CSV 导出，不能仅折叠后丢失。 |
| MON-F15 | 展开稿 `MON-LEGEND`；主状态七类棋格直接可辨 | 图例在说明区可见，七类标签仍在主棋盘。 |

**设计/交互边界：** 主状态的 `MON-TOOL-*` 与展开稿 `MON-DRAWER-TAB-*` 标为 `data-role="conceptual-disclosure"`，没有 `data-func`，不冒充现成 React 按钮。正式实现前需确认展开策略与可访问性；不会新增路由或虚构业务操作。
