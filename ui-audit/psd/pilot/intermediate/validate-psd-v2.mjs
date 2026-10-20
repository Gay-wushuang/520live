// PSD Pilot v2 结构验证（失败即中止）
// 用法：node validate-psd-v2.mjs <psd路径> [--expect-so=<最小数量>] [--out=<json路径>]
// 任何关键断言不满足即以非零退出码中止，避免“解析成功即视为通过”。
import fs from 'node:fs/promises';
import path from 'node:path';
import { readPsd } from 'ag-psd';

const args = process.argv.slice(2);
const psdArg = args.find((a) => !a.startsWith('--')) || 'ui-audit/psd/pilot/intermediate/CardWheel-v2-agsd.psd';
const root = path.resolve(import.meta.dirname, '../../../..');
const psdPath = path.isAbsolute(psdArg) ? psdArg : path.join(root, psdArg);
const expectSoArg = args.find((a) => a.startsWith('--expect-so='));
const expectSo = expectSoArg ? Number(expectSoArg.split('=')[1]) : 0;
const outArg = args.find((a) => a.startsWith('--out='));
const outPath = outArg ? path.join(root, outArg.split('=')[1]) : path.join(path.dirname(psdPath), 'validation-v2.json');

// 注意：readPsd 返回的子层数组顺序为“从下到上”（PSD 栈顺序），
// 与图层面板自上而下相反，因此这里期望值是栈顺序。
const EXPECTED_GROUPS = [
  '00_BG',
  '01_HEADER',
  '02_WHEEL_STAGE',
  '03_ACTIONS',
  '04_COLLECTION / Visible top',
  'REFERENCE / Hidden',
];
const EXPECTED_TEXTS = [
  'Title / 积分卡转盘', 'Subtitle', 'Back text',
  'Hub / 抽卡', 'Label / 春季', 'Label / 夏季', 'Label / 秋季', 'Label / 冬季',
  'Button label / 抽取积分卡', 'Button label / 重置游戏',
  'Collection title', 'Archive status', 'Archive selector text', 'Name input text',
];
const EXPECTED_CARDS = ['Spring', 'Summer', 'Autumn', 'Winter'];
const MIN_SHAPE_LAYERS = 18;

const failures = [];
const missingFill = [];
function check(cond, msg) {
  if (!cond) failures.push(msg);
}

const data = await fs.readFile(psdPath);
const psd = readPsd(data, { skipLayerImageData: true, skipCompositeImageData: true, skipThumbnail: true });

const info = {
  file: path.relative(root, psdPath).replace(/\\/g, '/'),
  bytes: data.length,
  width: psd.width,
  height: psd.height,
  colorMode: psd.colorMode,
  counts: { groups: 0, text: 0, shape: 0, smartObject: 0, raster: 0, hiddenReference: 0, total: 0 },
  groupNames: [],
  textNames: [],
  shapeNames: [],
  smartObjectNames: [],
  rasterNames: [],
  offCanvas: [],
  emptyTextLayers: [],
  fullCanvasVisibleRaster: [],
  tree: [],
};

// 判定填充层：存在 vectorMask；判定 Smart Object：存在 placedLayer。
function walk(children = [], depth = 0) {
  for (const layer of children) {
    const name = layer.name || '';
    info.counts.total++;
    let kind;
    if (layer.children) {
      info.counts.groups++;
      kind = 'GROUP';
      if (depth === 0) info.groupNames.push(name);
      info.tree.push(`${'  '.repeat(depth)}- ${name} [GROUP]`);
      walk(layer.children, depth + 1);
      continue;
    } else if (layer.text) {
      info.counts.text++;
      info.textNames.push(name);
      kind = 'TEXT';
      if (!layer.text.text || !layer.text.text.trim()) info.emptyTextLayers.push(name);
    } else if (layer.placedLayer) {
      info.counts.smartObject++;
      info.smartObjectNames.push(name);
      kind = 'SMART_OBJECT';
    } else if (layer.vectorMask) {
      info.counts.shape++;
      info.shapeNames.push(name);
      if (!layer.vectorFill) missingFill.push(name);
      kind = 'SHAPE';
    } else {
      info.counts.raster++;
      info.rasterNames.push(name);
      kind = 'RASTER';
    }

    const b = [layer.left, layer.top, layer.right, layer.bottom];
    if (layer.hidden && /REFERENCE/.test(name)) info.counts.hiddenReference++;
    if (b.every((v) => typeof v === 'number') && (b[0] < 0 || b[1] < 0 || b[2] > psd.width || b[3] > psd.height)) {
      info.offCanvas.push({ name, bounds: b });
    }
    if (kind === 'RASTER' && !layer.hidden) {
      const area = Math.max(0, (b[2] - b[0]) * (b[3] - b[1]));
      if (area >= 0.5 * psd.width * psd.height) info.fullCanvasVisibleRaster.push({ name, bounds: b });
    }
    info.tree.push(`${'  '.repeat(depth)}- ${name} [${kind}]`);
  }
}
walk(psd.children);

// ---- 断言 ----
check(psd.width === 1440 && psd.height === 900, `画布尺寸必须为 1440x900，实际 ${psd.width}x${psd.height}`);
check(psd.colorMode === 3, `色彩模式必须为 RGB(3)，实际 ${psd.colorMode}`);
check(JSON.stringify(info.groupNames) === JSON.stringify(EXPECTED_GROUPS), `顶层分组必须为 ${EXPECTED_GROUPS.join(' | ')}，实际 ${info.groupNames.join(' | ')}`);
check(info.counts.text === EXPECTED_TEXTS.length, `文字层数量必须为 ${EXPECTED_TEXTS.length}，实际 ${info.counts.text}`);
for (const n of EXPECTED_TEXTS) check(info.textNames.includes(n), `缺少文字层：${n}`);
check(info.emptyTextLayers.length === 0, `存在空文字层：${info.emptyTextLayers.join(', ')}`);
check(info.counts.shape >= MIN_SHAPE_LAYERS, `原生 Shape Layer 数量必须 >= ${MIN_SHAPE_LAYERS}，实际 ${info.counts.shape}`);
check(missingFill.length === 0, `存在缺少矢量填充的 Shape Layer：${missingFill.join(', ')}`);
check(info.counts.hiddenReference === 1, `必须存在且仅存在 1 个隐藏 REFERENCE 层，实际 ${info.counts.hiddenReference}`);
for (const c of EXPECTED_CARDS) {
  const ok = info.smartObjectNames.some((n) => n.includes(c)) || info.rasterNames.some((n) => n.includes(c));
  check(ok, `缺少四季卡片层：${c}`);
}
check(info.counts.smartObject >= expectSo, `Smart Object 数量必须 >= ${expectSo}，实际 ${info.counts.smartObject}`);
check(info.fullCanvasVisibleRaster.length === 0, `存在可见的整页栅格层（疑似用平面截图冒充）：${info.fullCanvasVisibleRaster.map((r) => r.name).join(', ')}`);

info.result = failures.length === 0 ? 'PASS' : 'FAIL';
info.failures = failures;

await fs.mkdir(path.dirname(outPath), { recursive: true });
await fs.writeFile(outPath, JSON.stringify(info, null, 2));
console.log(JSON.stringify({ result: info.result, counts: info.counts, failures, offCanvas: info.offCanvas, out: path.relative(root, outPath) }, null, 2));
if (failures.length) process.exit(1);
