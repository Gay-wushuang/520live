# OVL-WALL-02 — RESOLVED（v1.1）

文件名保留 BLOCKED 字样仅为追溯 v1 记录；该候选在新基线（82c5160 修复后）已可达。

v1 记载的阻塞原因：CardWheelPage 仅在 `pendingReward && !showVideoReward` 时渲染 WallpaperRewardModal，而 ultimate 奖励曾由 gameStore.addCard 同步置 `showVideoReward=true`。

新基线流程（82c5160 起）：addCard(ultimate) 先只置 pendingReward，展示双图弹窗（本套件 states/OVL-WALL-02.desktop.svg），用户点击「领取终极奖励」→ claimUltimateReward 置 showVideoReward=true 进入视频层（OVL-VID-01/02）→ 关闭结束。

可达性已由 ui-audit/manifest.json（OVL-WALL-02，status=ok，screenshots/desktop/OVL-WALL-02.desktop.png）证实。
