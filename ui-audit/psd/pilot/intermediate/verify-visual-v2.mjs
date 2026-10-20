// PSD Pilot v2 — 视觉证据核验（失败即中止）
//
// 1) 形状改色证据：Phase C 把 “Secondary button / Shape” 的纯色填充从白改成绿(12,200,120)。
//    这里对 Photoshop 导出的 before-edit.png / CardWheel-v2-accepted.png 做逐像素核验，
//    断言按钮填充区域确实由“近白”变为“绿”，且避开文字字形采样。
// 2) 文字改色/改内容证据：标题文字层内容由 “积分卡转盘” 改为 “积分卡转盘V2”，
//    断言标题带内的红色字形像素数在编辑后增加。
// 3) 局部误差：Photoshop 实际合成图 CardWheel-v2-composite.png 与原截图 CardWheel-Reference.png
//    的分块像素误差统计（仅信息，用于定位残余问题，不作 Gate 判定）。
//
// 用法：node verify-visual-v2.mjs [before.png] [after.png] [composite.png] [reference.png] [--out=json]
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const here = import.meta.dirname;
const pilot = path.resolve(here, '..');

const argv = process.argv.slice(2).filter(a => !a.startsWith('--'));
const outArg = process.argv.find(a => a.startsWith('--out='));
const outJson = outArg ? outArg.slice(6) : path.join(here, 'visual-check-v2.json');

// Photoshop 导出的命令行为 Windows 临时目录路径；默认使用 TEMP/accept 下的实测导出。
const tmp = process.env.TEMP || process.env.TMP || '/tmp';
const beforePng = argv[0] || path.join(tmp, 'accept/before-edit.png');
const afterPng = argv[1] || path.join(tmp, 'accept/CardWheel-v2-accepted.png');
const compositePng = argv[2] || path.join(pilot, 'intermediate/CardWheel-v2-composite.png');
const referencePng = argv[3] || path.join(pilot, 'CardWheel-Reference.png');

const failures = [];
const checks = [];
function expect(label, ok, detail) {
  checks.push({ label, ok: !!ok, detail: detail || '' });
  if (!ok) failures.push(label + ' :: ' + detail);
  console.log((ok ? 'PASS ' : 'FAIL ') + label + (detail ? ' :: ' + detail : ''));
}

async function rgba(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
}

const px = (img, x, y) => {
  const i = (y * img.width + x) * img.channels;
  return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]];
};

// 3x3 均值，降低抗锯齿/压缩噪声影响
function sample3(img, x, y) {
  let r = 0, g = 0, b = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const p = px(img, x + dx, y + dy); r += p[0]; g += p[1]; b += p[2];
  }
  return [Math.round(r / 9), Math.round(g / 9), Math.round(b / 9)];
}

const isNearWhite = ([r, g, b]) => r > 235 && g > 235 && b > 235;
const isNearGreen = ([r, g, b]) => g > 150 && r < 110 && b < 170 && g - r > 70;

// Secondary button 几何：x 747..877, y 756..810, r=27；文字字形约落在 x 789..861, y 774..792
const BUTTON_FILL_POINTS = [
  [800, 762], // 文字上方
  [800, 802], // 文字下方
  [756, 783], // 文字左侧
  [870, 783], // 文字右侧
];

// 标题带：编辑后为 “积分卡转盘V2”，红色 #f43f5e
const TITLE_BAND = { x0: 500, x1: 940, y0: 71, y1: 118 };
const isTitleRed = ([r, g, b]) => r > 200 && g < 130 && b > 90 && b < 150;

function countInBand(img, band, pred) {
  let n = 0;
  for (let y = band.y0; y < band.y1; y++) {
    for (let x = band.x0; x < band.x1; x++) {
      const p = px(img, x, y);
      if (pred([p[0], p[1], p[2]])) n++;
    }
  }
  return n;
}

// 分块误差统计（仅信息）
function blockDiff(a, b, blocksX = 6, blocksY = 6) {
  const rows = [];
  let sumAll = 0, nAll = 0, overAll = 0;
  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      const x0 = Math.floor((bx * a.width) / blocksX), x1 = Math.floor(((bx + 1) * a.width) / blocksX);
      const y0 = Math.floor((by * a.height) / blocksY), y1 = Math.floor(((by + 1) * a.height) / blocksY);
      let sum = 0, n = 0, over = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const pa = px(a, x, y), pb = px(b, x, y);
        const d = (Math.abs(pa[0] - pb[0]) + Math.abs(pa[1] - pb[1]) + Math.abs(pa[2] - pb[2])) / 3;
        sum += d; n++; if (d > 32) over++;
        sumAll += d; nAll++; if (d > 32) overAll++;
      }
      rows.push({ block: `r${by}c${bx}`, region: [x0, y0, x1, y1], meanAbsDiff: +(sum / n).toFixed(2), pctOver32: +((100 * over) / n).toFixed(1) });
    }
  }
  return {
    globalMeanAbsDiff: +(sumAll / nAll).toFixed(2),
    globalPctOver32: +((100 * overAll) / nAll).toFixed(1),
    worstBlocks: rows.slice().sort((u, v) => v.meanAbsDiff - u.meanAbsDiff).slice(0, 8),
    blocks: rows,
  };
}

const report = { beforePng, afterPng, compositePng, referencePng };

try {
  const before = await rgba(beforePng);
  const after = await rgba(afterPng);
  expect('SIZE-MATCH', before.width === after.width && before.height === after.height,
    `${before.width}x${before.height} vs ${after.width}x${after.height}`);

  // ---- 1) 按钮填充改色证据 ----
  const btnBefore = BUTTON_FILL_POINTS.map(([x, y]) => ({ p: [x, y], rgb: sample3(before, x, y) }));
  const btnAfter = BUTTON_FILL_POINTS.map(([x, y]) => ({ p: [x, y], rgb: sample3(after, x, y) }));
  report.buttonFill = { before: btnBefore, after: btnAfter };

  const allWhiteBefore = btnBefore.every(s => isNearWhite(s.rgb));
  const allGreenAfter = btnAfter.every(s => isNearGreen(s.rgb));
  expect('BUTTON-FILL-WHITE-BEFORE', allWhiteBefore,
    btnBefore.map(s => `(${s.p})=${s.rgb}`).join(' '));
  expect('BUTTON-FILL-GREEN-AFTER', allGreenAfter,
    btnAfter.map(s => `(${s.p})=${s.rgb}`).join(' '));

  // 整块统计（含文字字形）作为补充
  const greenCountBefore = (() => { let n = 0; for (let y = 756; y < 810; y++) for (let x = 747; x < 877; x++) if (isNearGreen(px(before, x, y))) n++; return n; })();
  const greenCountAfter = (() => { let n = 0; for (let y = 756; y < 810; y++) for (let x = 747; x < 877; x++) if (isNearGreen(px(after, x, y))) n++; return n; })();
  report.buttonGreenPixels = { before: greenCountBefore, after: greenCountAfter };
  expect('BUTTON-GREEN-PIXEL-GROWTH', greenCountAfter > 4000 && greenCountBefore === 0,
    `before=${greenCountBefore} after=${greenCountAfter} (of ${130 * 54})`);

  // ---- 2) 标题文字内容变更证据 ----
  const titleRedBefore = countInBand(before, TITLE_BAND, isTitleRed);
  const titleRedAfter = countInBand(after, TITLE_BAND, isTitleRed);
  report.titleRedPixels = { before: titleRedBefore, after: titleRedAfter };
  expect('TITLE-RED-PIXEL-GROWTH', titleRedAfter > titleRedBefore + 200,
    `before=${titleRedBefore} after=${titleRedAfter}`);

  // ---- 3) 局部误差（信息） ----
  const composite = await rgba(compositePng);
  const reference = await rgba(referencePng);
  expect('COMPOSITE-SIZE-MATCH', composite.width === reference.width && composite.height === reference.height,
    `${composite.width}x${composite.height} vs ${reference.width}x${reference.height}`);
  report.localDiff = blockDiff(composite, reference);

  // 合成图 vs 编辑前导出（仅验证“未编辑交付稿”的自洽渲染）
  const compositeVsBefore = blockDiff(composite, before);
  report.compositeVsBeforeEdit = { globalMeanAbsDiff: compositeVsBefore.globalMeanAbsDiff, globalPctOver32: compositeVsBefore.globalPctOver32 };
} catch (e) {
  failures.push('SCRIPT-EXCEPTION :: ' + e.message);
  console.log('FAIL SCRIPT-EXCEPTION :: ' + e.message);
}

report.result = failures.length === 0 ? 'PASS' : 'FAIL';
report.failures = failures;
await fs.writeFile(outJson, JSON.stringify(report, null, 2));
console.log('=== SUMMARY: ' + checks.filter(c => c.ok).length + '/' + checks.length + ' passed, failures=' + failures.length);
console.log('report -> ' + outJson);
process.exit(failures.length ? 1 : 0);
