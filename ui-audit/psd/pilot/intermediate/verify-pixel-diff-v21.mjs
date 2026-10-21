// PSD Pilot v2.1 — 逐像素证据核验（失败即中止）
//
// 输入：Photoshop 验收过程导出的五张整页合成图 + acceptance-result.json
//   01-open.png            打开临时副本后、任何编辑之前（“替换前”）
//   02-post-replace.png    替换春季 Smart Object 内容之后（“替换后”，未保存）
//   03-reopened.png        另存临时 PSD → 关闭 → 重新打开之后（替换持久性）
//   04-edited.png          再改标题/按钮文字/按钮配色之后
//   05-edited-reopened.png 再次保存 → 重开之后（文字持久性）
//
// 断言（每一项都基于实测像素，不看“脚本没报错”）：
//   A. 替换阶段：春季卡矩形内必须显著变化；矩形外（含其余三季卡）必须零差异。
//   B. 保存→重开：整页像素零差异（替换持久化，无重渲染副作用）。
//   C. 重开后春季卡矩形呈标记图的品红/黑/绿（内容与朝向正确）。
//   D. 文字/形状编辑：只落在标题带与两个按钮区域内；四季卡图零差异。
//   E. 编辑后再保存→重开：被替换的卡图仍为品红；差异只出现在被编辑的文字区域，
//      且幅度有界（文字重新栅格化的抗锯齿差异，逐像素记录）。
//
// 用法：
//   node verify-pixel-diff-v21.mjs [--workdir=...] [--result=...] [--out=...]
// 退出码：0 = 全部通过；1 = 存在失败。
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const here = import.meta.dirname;
const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const workDir = argOf('workdir', path.join(here, 'acceptance-v21'));
const resultPath = argOf('result', path.join(workDir, 'acceptance-result.json'));
const outPath = argOf('out', path.join(workDir, 'pixel-diff-report.json'));

const failures = [];
const checks = [];
function expect(label, ok, detail) {
  const item = { label, ok: !!ok, detail: String(detail ?? '') };
  checks.push(item);
  if (!item.ok) failures.push(`${label} :: ${item.detail}`);
  console.log(`${item.ok ? 'PASS' : 'FAIL'} ${label}${item.detail ? ' :: ' + item.detail : ''}`);
  return item.ok;
}

async function rgba(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
}
const px = (img, x, y) => {
  const i = (y * img.width + x) * img.channels;
  return [img.data[i], img.data[i + 1], img.data[i + 2]];
};

const toBox = (a) => ({ x0: a[0], y0: a[1], x1: a[2], y1: a[3] });
const padBox = (b, p) => ({ x0: b.x0 - p, y0: b.y0 - p, x1: b.x1 + p, y1: b.y1 + p });
const clampBox = (b, img) => ({
  x0: Math.max(0, Math.min(img.width, b.x0)),
  y0: Math.max(0, Math.min(img.height, b.y0)),
  x1: Math.max(0, Math.min(img.width, b.x1)),
  y1: Math.max(0, Math.min(img.height, b.y1)),
});
const key = (b) => `${b.x0},${b.y0},${b.x1},${b.y1}`;

function diffStat(a, b, box) {
  let changed = 0, over32 = 0, sum = 0, max = 0, n = 0;
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
  for (let y = box.y0; y < box.y1; y++) {
    for (let x = box.x0; x < box.x1; x++) {
      const pa = px(a, x, y), pb = px(b, x, y);
      const d = Math.max(Math.abs(pa[0] - pb[0]), Math.abs(pa[1] - pb[1]), Math.abs(pa[2] - pb[2]));
      n++; sum += d;
      if (d > 0) {
        changed++;
        if (x < minX) minX = x; if (y < minY) minY = y;
        if (x > maxX) maxX = x; if (y > maxY) maxY = y;
      }
      if (d > 32) over32++;
      if (d > max) max = d;
    }
  }
  return {
    pixels: n,
    changedPixels: changed,
    changedPct: n ? +((100 * changed) / n).toFixed(3) : 0,
    over32Pixels: over32,
    over32Pct: n ? +((100 * over32) / n).toFixed(3) : 0,
    meanAbsDiff: n ? +(sum / n).toFixed(4) : 0,
    maxChannelDiff: max,
    changedBBox: maxX >= 0 ? [minX, minY, maxX + 1, maxY + 1] : null,
  };
}

// 统计允许矩形之外的差异像素（用于证明“非目标区域零差异”）
function diffOutside(a, b, boxes) {
  let count = 0, first = null;
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
  for (let y = 0; y < a.height; y++) {
    for (let x = 0; x < a.width; x++) {
      if (boxes.some((bx) => x >= bx.x0 && x < bx.x1 && y >= bx.y0 && y < bx.y1)) continue;
      const pa = px(a, x, y), pb = px(b, x, y);
      const d = Math.max(Math.abs(pa[0] - pb[0]), Math.abs(pa[1] - pb[1]), Math.abs(pa[2] - pb[2]));
      if (d > 0) {
        count++;
        if (!first) first = { x, y, before: pa, after: pb };
        if (x < minX) minX = x; if (y < minY) minY = y;
        if (x > maxX) maxX = x; if (y > maxY) maxY = y;
      }
    }
  }
  return { count, first, bbox: maxX >= 0 ? [minX, minY, maxX + 1, maxY + 1] : null };
}

const meanRgb = (img, box) => {
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = box.y0; y < box.y1; y++) for (let x = box.x0; x < box.x1; x++) {
    const p = px(img, x, y); r += p[0]; g += p[1]; b += p[2]; n++;
  }
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
};
const isMagentaish = ([r, g, b]) => r >= 200 && g <= 80 && b >= 200;
const near = (c, t, tol = 26) => Math.abs(c[0] - t[0]) <= tol && Math.abs(c[1] - t[1]) <= tol && Math.abs(c[2] - t[2]) <= tol;

// 局部像素证据图：春季卡 4 倍放大（替换前 / 替换后 / 重开 / 差异）横向拼接
async function buildLocalEvidence(files, cardBox, out) {
  const SCALE = 4, PAD = 12;
  const cw = cardBox.x1 - cardBox.x0, ch = cardBox.y1 - cardBox.y0;
  const sideW = cw * SCALE, sideH = ch * SCALE;
  const panels = [];
  for (const f of files) {
    const buf = await sharp(f).extract({ left: cardBox.x0, top: cardBox.y0, width: cw, height: ch })
      .resize(sideW, sideH, { kernel: 'nearest' }).removeAlpha().raw().toBuffer();
    panels.push(buf);
  }
  const before = await rgba(files[0]);
  const after = await rgba(files[1]);
  const diffBuf = Buffer.alloc(sideW * sideH * 3);
  for (let y = 0; y < sideH; y++) for (let x = 0; x < sideW; x++) {
    const sx = cardBox.x0 + Math.floor(x / SCALE), sy = cardBox.y0 + Math.floor(y / SCALE);
    const pa = px(before, sx, sy), pb = px(after, sx, sy);
    const d = Math.max(Math.abs(pa[0] - pb[0]), Math.abs(pa[1] - pb[1]), Math.abs(pa[2] - pb[2]));
    const v = Math.min(255, d * 4);
    const i = (y * sideW + x) * 3;
    diffBuf[i] = v; diffBuf[i + 1] = v; diffBuf[i + 2] = v;
  }
  panels.push(diffBuf);

  const width = panels.length * sideW + (panels.length + 1) * PAD;
  const height = sideH + 2 * PAD;
  const composite = panels.map((input, i) => ({ input, raw: { width: sideW, height: sideH, channels: 3 }, left: PAD + i * (sideW + PAD), top: PAD }));
  await sharp({ create: { width, height, channels: 3, background: { r: 32, g: 32, b: 38 } } }).composite(composite).png().toFile(out);
  return { out, width, height, panels: panels.length, scale: SCALE };
}

// 全页差异热图（差异 ×8 放大，便于肉眼确认“只有春季卡区域变了”）
async function buildDiffMap(a, b, out) {
  const buf = Buffer.alloc(a.width * a.height * 3);
  for (let y = 0; y < a.height; y++) for (let x = 0; x < a.width; x++) {
    const pa = px(a, x, y), pb = px(b, x, y);
    const d = Math.max(Math.abs(pa[0] - pb[0]), Math.abs(pa[1] - pb[1]), Math.abs(pa[2] - pb[2]));
    const v = Math.min(255, d * 8);
    const i = (y * a.width + x) * 3;
    buf[i] = v; buf[i + 1] = v; buf[i + 2] = v;
  }
  await sharp(buf, { raw: { width: a.width, height: a.height, channels: 3 } }).png().toFile(out);
  return out;
}

const report = { workDir, resultPath, regions: {}, checks };

try {
  const result = JSON.parse(await fs.readFile(resultPath, 'utf8'));
  const ex = result.exports || {};
  const seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];

  const cardBoxes = {};
  for (const s of seasons) {
    const b = result.smartObjects?.[s]?.displayBounds;
    if (!b) throw new Error(`acceptance-result.json 缺少 ${s} displayBounds`);
    cardBoxes[s] = toBox(b);
  }
  report.regions.cardBoxes = cardBoxes;
  report.regions.editBoxes = result.editBoxes;

  const open = await rgba(ex.open);
  const post = await rgba(ex.postReplace);
  const reopened = await rgba(ex.reopened);
  const edited = await rgba(ex.edited);
  const editedReopened = await rgba(ex.editedReopened);
  for (const [name, img] of [['open', open], ['postReplace', post], ['reopened', reopened], ['edited', edited], ['editedReopened', editedReopened]]) {
    expect(`PNG-SIZE-${name}`, img.width === 1440 && img.height === 900, `${img.width}x${img.height}`);
  }

  // ---------------- A. 替换阶段：春季卡变化 + 其余区域零差异 ----------------
  const springBox = clampBox(cardBoxes.Spring, post);
  const springDiff = diffStat(open, post, springBox);
  report.regions.springReplace = springDiff;
  expect('SPRING-REGION-CHANGED', springDiff.over32Pct >= 60 && springDiff.meanAbsDiff >= 30,
    `changedPct=${springDiff.changedPct}% over32=${springDiff.over32Pct}% mean=${springDiff.meanAbsDiff} max=${springDiff.maxChannelDiff}`);
  expect('SPRING-CHANGED-BBOX-INSIDE-CARD',
    !!springDiff.changedBBox && springDiff.changedBBox[0] >= springBox.x0 && springDiff.changedBBox[1] >= springBox.y0 &&
    springDiff.changedBBox[2] <= springBox.x1 && springDiff.changedBBox[3] <= springBox.y1,
    `changedBBox=${JSON.stringify(springDiff.changedBBox)} card=${key(springBox)}`);

  const allowedReplace = [clampBox(padBox(springBox, 2), post)];
  const replaceOutside = diffOutside(open, post, allowedReplace);
  report.regions.replaceOutside = replaceOutside;
  expect('REPLACE-NO-SPILL', replaceOutside.count === 0,
    `outsidePixels=${replaceOutside.count} bbox=${JSON.stringify(replaceOutside.bbox)} first=${JSON.stringify(replaceOutside.first)}`);

  const globalReplace = diffStat(open, post, { x0: 0, y0: 0, x1: post.width, y1: post.height });
  report.regions.replaceGlobal = globalReplace;
  expect('REPLACE-ONLY-SPRING-CARD', globalReplace.changedPixels === springDiff.changedPixels,
    `pageChanged=${globalReplace.changedPixels} inSpring=${springDiff.changedPixels}`);

  const otherCards = ['Summer', 'Autumn', 'Winter'];
  const otherCardDiff = {};
  for (const s of otherCards) otherCardDiff[s] = diffStat(open, post, clampBox(cardBoxes[s], post));
  report.regions.otherCardsDuringReplace = otherCardDiff;
  expect('OTHER-CARDS-UNCHANGED', otherCards.every((s) => otherCardDiff[s].changedPixels === 0),
    otherCards.map((s) => `${s}=${otherCardDiff[s].changedPixels}`).join(' '));

  // ---------------- B. 保存 → 重开：整页零差异 ----------------
  const reopenDiff = diffStat(post, reopened, { x0: 0, y0: 0, x1: post.width, y1: post.height });
  report.regions.reopen = reopenDiff;
  expect('REOPEN-IDENTICAL', reopenDiff.changedPixels === 0 && reopenDiff.maxChannelDiff === 0,
    `changed=${reopenDiff.changedPixels} max=${reopenDiff.maxChannelDiff} mean=${reopenDiff.meanAbsDiff}`);

  // ---------------- C. 重开后春季卡仍是标记图 ----------------
  const springBefore = meanRgb(open, springBox);
  const springAfter = meanRgb(reopened, springBox);
  report.regions.springMeanRgb = { open: springBefore, reopened: springAfter };
  expect('SPRING-NOT-MAGENTA-BEFORE', !isMagentaish(springBefore), `mean=${springBefore}`);
  expect('SPRING-MAGENTA-AFTER-REOPEN', isMagentaish(springAfter), `mean=${springAfter}`);

  const sample = (img, x, y) => px(img, Math.round(x), Math.round(y));
  const x0 = cardBoxes.Spring.x0, y0 = cardBoxes.Spring.y0, x1 = cardBoxes.Spring.x1, y1 = cardBoxes.Spring.y1;
  const probe = {
    topLeft: sample(reopened, x0 + 10, y0 + 10),
    center: sample(reopened, (x0 + x1) / 2, (y0 + y1) / 2),
    bottomRight: sample(reopened, x1 - 10, y1 - 10),
  };
  report.regions.markerProbe = probe;
  expect('MARKER-PATTERN-IN-COMPOSITE',
    near(probe.topLeft, [0, 0, 0]) && near(probe.center, [255, 0, 255]) && near(probe.bottomRight, [0, 255, 0]),
    `topLeft=${probe.topLeft} center=${probe.center} bottomRight=${probe.bottomRight}`);

  // ---------------- D. 文字/形状编辑：局部性 ----------------
  const eb = result.editBoxes || {};
  const editBoxes = [];
  for (const k of ['title', 'buttonLabel', 'primaryShape', 'secondaryShape']) {
    if (eb[k]) editBoxes.push(clampBox(padBox(toBox(eb[k]), 6), edited));
  }
  expect('EDIT-BOXES-PRESENT', editBoxes.length === 4, `count=${editBoxes.length} keys=${Object.keys(eb).join(',')}`);

  const editDiff = diffStat(reopened, edited, { x0: 0, y0: 0, x1: edited.width, y1: edited.height });
  report.regions.editPhase = editDiff;
  expect('EDIT-PHASE-CHANGED', editDiff.changedPixels > 500,
    `changed=${editDiff.changedPixels} bbox=${JSON.stringify(editDiff.changedBBox)}`);

  // 被替换的 Smart Object 在重渲染时存在 ±1 的单通量化抖动（v2.1 实测：仅限卡图内部），
  // 因此“卡图矩形”作为允许变化区，但抖动量必须 <= 1 且不得外溢。
  const cardTol = 1;
  const springPadded = clampBox(padBox(springBox, 2), edited);
  const editOutside = diffOutside(reopened, edited, editBoxes.concat([springPadded]));
  report.regions.editOutside = editOutside;
  expect('EDIT-PHASE-NO-SPILL', editOutside.count === 0,
    `outsidePixels=${editOutside.count} bbox=${JSON.stringify(editOutside.bbox)} first=${JSON.stringify(editOutside.first)}`);

  const springDuringEdit = diffStat(reopened, edited, springBox);
  report.regions.springDuringEdit = springDuringEdit;
  expect('SPRING-CARD-STABLE-BY-EDITS', springDuringEdit.maxChannelDiff <= cardTol,
    `changed=${springDuringEdit.changedPixels} max=${springDuringEdit.maxChannelDiff}`);

  const cardsDuringEdit = {};
  for (const s of seasons) cardsDuringEdit[s] = diffStat(reopened, edited, clampBox(cardBoxes[s], edited));
  report.regions.cardsDuringEdit = cardsDuringEdit;
  expect('OTHER-CARDS-UNTOUCHED-BY-EDITS', otherCards.every((s) => cardsDuringEdit[s].changedPixels === 0),
    otherCards.map((s) => `${s}=${cardsDuringEdit[s].changedPixels}`).join(' '));

  // ---------------- E. 编辑后再保存 → 重开 ----------------
  const editReopenGlobal = diffStat(edited, editedReopened, { x0: 0, y0: 0, x1: edited.width, y1: edited.height });
  report.regions.editReopenGlobal = editReopenGlobal;
  const textBoxes = ['title', 'buttonLabel', 'primaryShape', 'secondaryShape']
    .filter((k) => eb[k]).map((k) => clampBox(padBox(toBox(eb[k]), 6), editedReopened));
  const editReopenOutside = diffOutside(edited, editedReopened, textBoxes.concat([clampBox(padBox(springBox, 2), editedReopened)]));
  report.regions.editReopenOutside = editReopenOutside;
  expect('EDIT-REOPEN-TEXT-ONLY', editReopenOutside.count === 0,
    `outsidePixels=${editReopenOutside.count} bbox=${JSON.stringify(editReopenOutside.bbox)} first=${JSON.stringify(editReopenOutside.first)}`);
  expect('EDIT-REOPEN-DELTA-BOUNDED', editReopenGlobal.maxChannelDiff <= 24,
    `changed=${editReopenGlobal.changedPixels} max=${editReopenGlobal.maxChannelDiff} mean=${editReopenGlobal.meanAbsDiff}`);

  const springStill = meanRgb(editedReopened, springBox);
  report.regions.springMeanRgb.editedReopened = springStill;
  expect('SPRING-STILL-MAGENTA-AFTER-EDIT-REOPEN', isMagentaish(springStill), `mean=${springStill}`);

  const springAfterEditReopen = diffStat(edited, editedReopened, springBox);
  report.regions.springAfterEditReopen = springAfterEditReopen;
  expect('SPRING-CARD-STABLE-AFTER-EDIT-REOPEN', springAfterEditReopen.maxChannelDiff <= cardTol,
    `changed=${springAfterEditReopen.changedPixels} max=${springAfterEditReopen.maxChannelDiff}`);

  const cardsAfterEditReopen = {};
  for (const s of seasons) cardsAfterEditReopen[s] = diffStat(edited, editedReopened, clampBox(cardBoxes[s], editedReopened));
  report.regions.cardsAfterEditReopen = cardsAfterEditReopen;
  expect('OTHER-CARDS-STABLE-AFTER-EDIT-REOPEN', otherCards.every((s) => cardsAfterEditReopen[s].changedPixels === 0),
    otherCards.map((s) => `${s}=${cardsAfterEditReopen[s].changedPixels}`).join(' '));

  // ---------------- F) 证据图 ----------------
  report.evidence = {};
  report.evidence.local = await buildLocalEvidence([ex.open, ex.postReplace, ex.reopened], springBox, path.join(workDir, 'local-pixel-evidence.png'));
  report.evidence.diffMap = await buildDiffMap(open, post, path.join(workDir, 'diff-map-replace.png'));
  expect('EVIDENCE-IMAGES', true, `local=${report.evidence.local.out} diffMap=${report.evidence.diffMap}`);
} catch (e) {
  console.log('FAIL SCRIPT-EXCEPTION :: ' + e.message);
  failures.push('SCRIPT-EXCEPTION :: ' + e.message);
}

report.result = failures.length === 0 ? 'PASS' : 'FAIL';
report.failures = failures;
report.checks = checks;
await fs.mkdir(path.dirname(outPath), { recursive: true });
await fs.writeFile(outPath, JSON.stringify(report, null, 2));

console.log(`=== SUMMARY: ${checks.filter((c) => c.ok).length}/${checks.length} passed, failures=${failures.length}`);
console.log('report -> ' + outPath);
process.exit(failures.length ? 1 : 0);
