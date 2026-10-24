# CARD-02 功能映射

依据冻结 FSVG、`FUNCTION-MATRIX.json`、`STATE-MATRIX.json` 与当前 `CardWheelPage.tsx` / `CollectionStatus.tsx` 核对。`CARD-02` 为 ready 状态。图层的 `data-func` 是设计映射，不代表 SVG 可以点击；展开稿中的可见控件是明确承载，不是隐藏占位。

| 功能 | 正式画板承载 | 展开稿／后续状态承载 | 语义边界 |
|---|---|---|---|
| CARD-F01 / F02 轮盘与四季视觉 | `CARD-WHEEL`、四个 `CARD-SECTOR-*`、210×118 真实素材层与待抽取指针 | 结果停靠另见非运行时示例 | 静态图形；真实抽奖仍由 Canvas 与原逻辑执行 |
| CARD-F03 抽取 | 突出的 `CARD-ACTION-SPIN`、一行 `CARD-SPIN-ELIGIBILITY` | LOADING / SPINNING 为禁用示例 | 不新增消耗规则或重复触发入口 |
| CARD-F04 结果反馈 | `CARD-RESULT-FEEDBACK` 紧邻主按钮显示当前阶段 | 抽取结果继续使用现有结果弹窗；停靠稿只是设计示例 | 不将就绪文案伪装成抽中结果 |
| CARD-F05 返回 / 重置 | `CARD-BACK`、`CARD-RESET` 独立控件 | SPINNING 重置禁用 | 两者不可合并 |
| CARD-F06 存档操作 | `CARD-PLAYER-SUMMARY` 和“档案”入口 | `CARD-PROFILE-SELECT/SAVE/LOAD/NEW/DELETE` | 现有档案管理行为，不加路由 |
| CARD-F07 昵称 | 当前档案摘要 | `CARD-PLAYER-NAME`、`CARD-PLAYER-SAVE` | 编辑与保存明确分离 |
| CARD-F08 统计 | 低频工具入口 | `CARD-STATS` 与统计数值 | 设计示例为零值 |
| CARD-F09 / F10 / F13 收集与奖励 | 底部只保留“0 张”摘要和查看收集入口 | `CARD-COLLECTION` 与四季行 | 收集进度不等于领取资格；领取由现有弹窗处理 |
| CARD-F11 历史与日志 | 左侧“记录”工具入口 | `CARD-HISTORY`、`CARD-LOGS` | 空态为示例，不在底部重复历史入口 |
| CARD-F12 日志导出 | “记录”入口 | `CARD-LOG-COPY`、`CARD-LOG-CSV` | 保留复制与 CSV 的独立操作 |
| CARD-F14 目标 | 底部进度摘要 | `CARD-GOAL` | 不替代实际奖励规则 |

风险：正式画板没有常驻展示全部低频功能；若进入 React 实现阶段，抽屉必须提供可发现入口、键盘关闭和状态反馈。当前仅是设计承载方案，功能映射不能视作运行时验收。`CARD-02.error-proposal` 为未实现错误态，不能列为当前运行时覆盖。真实旋转可能停在扇区边界附近，详见设计说明。
