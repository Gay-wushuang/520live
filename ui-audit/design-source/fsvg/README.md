# 520live 功能型 SVG 设计套件 — v1.1

**此版本为灰阶功能设计稿，不是 PSD，也不是已经实现的交互系统。**

## 文件
- `pages/`: 大富翁、积分卡各自的 Desktop/Wide/Tablet/Mobile 基础布局。
- `states/`: 50 张基线截图逐张对应的状态 SVG（含 v1.1 新增的 OVL-WALL-02 终极双图弹窗）。状态图由共享模板生成，不是 50 套互不相干的设计组件。
- `overlays/`: 事件、周边、抽卡结果、壁纸、终极视频及移动端弹层设计。
- `components/`: 中性组件总览与 7 个独立可编辑组件母版。
- `contract/FUNCTION-MATRIX.json`: 38 项功能 ID 的 SVG 存在性映射，**非完整业务实现证明**。
- `contract/STATE-MATRIX.json`: 46 个成功候选的设计去向（v1.1 起 OVL-WALL-02 已可达并映射）。
- `contract/SVG-MANIFEST.json`: 图片与 SVG 一一对应索引。
- `contract/DESIGN-TOKENS.json`: 全局视觉令牌。
- `contract/BLOCKED-OVL-WALL-02.md`: v1 时代 blocked 记录的已解决说明（文件名保留可追溯）。
- `tools/build_svg.py`: 共享源生成器。
- `tools/validate_svg.py`: SVG/ID/功能覆盖验证。

## PSD 设计交接
保留图层分组 ID 和 `data-func`，每个按钮、输入框、进度、棋盘格均是独立原生 SVG 对象。
CardWheel PSD 试点已在 `ui-audit/psd/` 完成 Photoshop 实机验收；FSVG 套件整体转 PSD 仍待后续开展。
不要把导入的整个 SVG 作为唯一 Smart Object 就声称全部可编辑。
当前生成器没有内嵌外部图片；有艺术资源的位置均为清楚标注的占位矩形。

## 重要限制
截图 Manifest 和上传契约并不等于对所有源码路径的完整审计。
这里的 **截图状态设计映射率** 可以达到 46/46，**代码功能覆盖率** 仍标记 Pending，不得称为已通过。
移动端 SVG 是完整滚动页，标记首屏视口 390×844；不可把超过 844 的页面内容误认作裁切。

## 重生成
```bash
py -3 tools/build_svg.py
py -3 tools/validate_svg.py
```
源模板在 `tools/build_svg.py`，在生成的 SVG 中手动修改后再次构建将覆盖修改；定稿后建议复制到冻结的设计源目录，再转 PSD。
