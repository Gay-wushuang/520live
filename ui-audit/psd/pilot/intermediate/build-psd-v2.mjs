// PSD Pilot v2 生成脚本
// 目的：在保留 v1 全部组名/层名/14 个可编辑文字层/隐藏 REFERENCE 的前提下，
// 把关键 UI 图形改为 ag-psd 原生矢量 Shape Layer（vectorMask + vectorFill），
// 四季卡片先以栅格占位，随后由 Photoshop 转换为原生 Smart Object。
//
// 说明：本脚本输出的 PSD 中，Shape Layer 不含像素数据，仅由矢量蒙版 + 填充构成，
// 即 Photoshop 的“填充/形状层”，不是把截图栅格化后伪装。
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { writePsdBuffer } from 'ag-psd';

const root = path.resolve(import.meta.dirname, '../../../..');
const outDir = path.join(root, 'ui-audit/psd/pilot');
const sourceDir = path.join(root, 'ui-audit/design-source/assets');
const psdPath = path.join(outDir, 'intermediate/CardWheel-v2-agsd.psd');
const compositePath = path.join(outDir, 'intermediate/CardWheel-Figma.png');
const referencePath = path.join(outDir, 'CardWheel-Reference.png');

// ---------------------------------------------------------------------------
// 几何工具：构造 PSD 贝塞尔路径（绝对文档像素坐标）
// knots.points = [前一控制点x, 前一控制点y, 锚点x, 锚点y, 后一控制点x, 后一控制点y]
// ---------------------------------------------------------------------------
const K90 = 0.5522847498307936; // 90° 圆弧的三次贝塞尔近似系数

const knot = (ax, ay, px, py, nx, ny, linked = false) => ({ linked, points: [px, py, ax, ay, nx, ny] });

function rectPath(x, y, w, h) {
  return {
    open: false,
    fillRule: 'non-zero',
    knots: [
      knot(x, y, x, y, x + w, y),
      knot(x + w, y, x, y, x + w, y + h),
      knot(x + w, y + h, x + w, y, x, y + h),
      knot(x, y + h, x + w, y + h, x, y),
    ],
  };
}

function roundedRectPath(x, y, w, h, r) {
  const k = r * K90;
  const p1 = [x + r, y], p2 = [x + w - r, y], p3 = [x + w, y + r], p4 = [x + w, y + h - r];
  const p5 = [x + w - r, y + h], p6 = [x + r, y + h], p7 = [x, y + h - r], p8 = [x, y + r];
  return {
    open: false,
    fillRule: 'non-zero',
    knots: [
      knot(p1[0], p1[1], x + r - k, y, p1[0], p1[1]),
      knot(p2[0], p2[1], p2[0], p2[1], x + w - r + k, y),
      knot(p3[0], p3[1], x + w, y + r - k, p3[0], p3[1]),
      knot(p4[0], p4[1], p4[0], p4[1], x + w, y + h - r + k),
      knot(p5[0], p5[1], x + w - r + k, y + h, p5[0], p5[1]),
      knot(p6[0], p6[1], p6[0], p6[1], x + r - k, y + h),
      knot(p7[0], p7[1], x, y + h - r + k, p7[0], p7[1]),
      knot(p8[0], p8[1], p8[0], p8[1], x, y + r - k),
    ],
  };
}

function circlePath(cx, cy, r, operation) {
  const k = r * K90;
  return {
    open: false,
    fillRule: 'non-zero',
    operation,
    knots: [
      knot(cx + r, cy, cx + r, cy - k, cx + r, cy + k, true),
      knot(cx, cy + r, cx + k, cy + r, cx - k, cy + r, true),
      knot(cx - r, cy, cx - r, cy + k, cx - r, cy - k, true),
      knot(cx, cy - r, cx - k, cy - r, cx + k, cy - r, true),
    ],
  };
}

function ellipsePath(cx, cy, rx, ry, operation) {
  const kx = rx * K90, ky = ry * K90;
  return {
    open: false,
    fillRule: 'non-zero',
    operation,
    knots: [
      knot(cx + rx, cy, cx + rx, cy - ky, cx + rx, cy + ky, true),
      knot(cx, cy + ry, cx + kx, cy + ry, cx - kx, cy + ry, true),
      knot(cx - rx, cy, cx - rx, cy + ky, cx - rx, cy - ky, true),
      knot(cx, cy - ry, cx - kx, cy - ry, cx + kx, cy - ry, true),
    ],
  };
}

const rad = (deg) => (deg * Math.PI) / 180;

function piePath(cx, cy, r, a0Deg, a1Deg) {
  const a0 = rad(a0Deg), a1 = rad(a1Deg);
  const start = [cx + r * Math.cos(a0), cy + r * Math.sin(a0)];
  const end = [cx + r * Math.cos(a1), cy + r * Math.sin(a1)];
  const t = (a) => [-Math.sin(a), Math.cos(a)];
  const k = r * K90 * ((a1Deg - a0Deg) / 90);
  const c1 = [start[0] + k * t(a0)[0], start[1] + k * t(a0)[1]];
  const c2 = [end[0] - k * t(a1)[0], end[1] - k * t(a1)[1]];
  return {
    open: false,
    fillRule: 'non-zero',
    knots: [
      knot(cx, cy, cx, cy, start[0], start[1]),
      knot(start[0], start[1], cx, cy, c1[0], c1[1]),
      knot(end[0], end[1], c2[0], c2[1], cx, cy),
    ],
  };
}

// 通用多断面折线/曲线形状（点序列给出锚点，控制点用同一数组的可选字段）
function polylinePath(points, operation) {
  const knots = points.map((p, i) => {
    const prev = p.prev || (i === 0 ? points[points.length - 1].a : points[i - 1].a);
    const next = p.next || (i === points.length - 1 ? points[0].a : points[i + 1].a);
    return knot(p.a[0], p.a[1], prev[0], prev[1], next[0], next[1], !!p.linked);
  });
  return { open: false, fillRule: 'non-zero', operation, knots };
}

// ---------------------------------------------------------------------------
// 填充构造
// ---------------------------------------------------------------------------
const rgb = (r, g, b) => ({ r, g, b });
const colorFill = (c) => ({ type: 'color', color: c });

const gradientFill = (stops, style, opts = {}) => ({
  type: 'solid',
  name: opts.name || 'grad',
  smoothness: 1,
  style,
  angle: opts.angle,
  scale: 1,
  reverse: !!opts.reverse,
  offset: opts.offset,
  colorStops: stops.map(([hex, location], i) => ({
    color: rgb(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)),
    location,
    midpoint: 0.5,
  })),
  opacityStops: stops.map(([, location], i) => ({ opacity: opts.stopOpacity?.[i] ?? 1, location, midpoint: 0.5 })),
});

// ---------------------------------------------------------------------------
// 图层构造
// ---------------------------------------------------------------------------
function shapeLayer(name, { paths, fill, bounds, opacity = 1, hidden = false }) {
  return {
    name,
    hidden,
    opacity,
    left: Math.round(bounds[0]),
    top: Math.round(bounds[1]),
    right: Math.round(bounds[2]),
    bottom: Math.round(bounds[3]),
    vectorMask: { paths },
    vectorFill: fill,
  };
}

function textLayer(name, text, x, y, size, colorHex, weight = 'regular', width = 500, align = 'left') {
  const c = rgb(parseInt(colorHex.slice(1, 3), 16), parseInt(colorHex.slice(3, 5), 16), parseInt(colorHex.slice(5, 7), 16));
  const fontName = weight === 'regular' ? 'MicrosoftYaHei' : 'MicrosoftYaHei-Bold';
  return {
    name,
    text: {
      text,
      transform: [1, 0, 0, 1, x, y],
      shapeType: 'box',
      boxBounds: [0, 0, width, Math.round(size * 1.8)],
      style: { font: { name: fontName }, fontSize: size, fillColor: c },
      paragraphStyle: { justification: align },
    },
  };
}

async function pixelData(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8ClampedArray(data), width: info.width, height: info.height };
}

async function rasterLayer(name, file, left, top, width, height) {
  const imageData = await pixelData(await sharp(file).resize(width, height, { fit: 'cover' }).png().toBuffer());
  return { name, left, top, right: left + width, bottom: top + height, imageData };
}

// ---------------------------------------------------------------------------
// 组装
// ---------------------------------------------------------------------------
const GRID = 28, W = 1440, H = 900;

function gridPaths(axis) {
  const paths = [];
  if (axis === 'h') for (let y = 0; y < H; y += GRID) paths.push(rectPath(0, y, W, 1));
  else for (let x = 0; x < W; x += GRID) paths.push(rectPath(x, 0, 1, H));
  return paths;
}

const bgBase = shapeLayer('BG / Base radial', {
  paths: [rectPath(0, 0, W, H)],
  fill: gradientFill([['#fff7ed', 0], ['#fdf2f8', 0.42], ['#eef6ff', 1]], 'radial', { name: 'bg', offset: { x: 0, y: -0.5 } }),
  bounds: [0, 0, W, H],
});
const bgGridV = shapeLayer('BG / Grid V', { paths: gridPaths('v'), fill: colorFill(rgb(246, 166, 186)), bounds: [0, 0, W, H], opacity: 0.18 });
const bgGridH = shapeLayer('BG / Grid H', { paths: gridPaths('h'), fill: colorFill(rgb(246, 166, 186)), bounds: [0, 0, W, H], opacity: 0.18 });

const backPill = shapeLayer('Back pill / Shape', {
  paths: [roundedRectPath(649, 16, 142, 38, 19)],
  fill: colorFill(rgb(255, 255, 255)),
  bounds: [649, 16, 791, 54],
  opacity: 0.8,
});
const titleText = textLayer('Title / 积分卡转盘', '积分卡转盘', 370, 75, 48, '#f43f5e', 'bold', 700, 'center');
const subtitleText = textLayer('Subtitle', '红色指针停在哪一格，就记录对应季节积分卡', 370, 132, 14, '#b45309', 'bold', 700, 'center');
const backText = textLayer('Back text', '← 返回棋盘首页', 668, 28, 14, '#92400e', 'bold', 120, 'center');

const stagePanel = shapeLayer('Stage / Glass panel', {
  paths: [roundedRectPath(336, 167, 768, 565, 36)],
  fill: colorFill(rgb(255, 255, 255)),
  bounds: [336, 167, 1104, 732],
  opacity: 0.72,
});
const stageGlow = shapeLayer('Stage / Glow', {
  paths: [ellipsePath(720, 342, 250, 135)],
  fill: gradientFill([['#fde68a', 0], ['#fbcfe8', 0.5], ['#bae6fd', 1]], 'radial', {
    name: 'glow',
    stopOpacity: [0.3, 0.25, 0.3],
  }),
  bounds: [470, 207, 970, 477],
  opacity: 0.75,
});

const CX = 720, CY = 445, R = 220;
const sectorDefs = [
  ['Sector / Spring', -90, 0, '#fff1f2', '#fecdd3'],
  ['Sector / Summer', 0, 90, '#ecfeff', '#bae6fd'],
  ['Sector / Autumn', 90, 180, '#f0fdf4', '#bbf7d0'],
  ['Sector / Winter', 180, 270, '#fffbeb', '#fde68a'],
];
const sectors = sectorDefs.map(([name, a0, a1, c1, c2]) =>
  shapeLayer(name, {
    paths: [piePath(CX, CY, R, a0, a1)],
    fill: gradientFill([[c1, 0], [c2, 1]], 'radial', { name: 'sector' }),
    bounds: [CX - R, CY - R, CX + R, CY + R],
  }),
);

const ringGradient = shapeLayer('Wheel / Border rings', {
  paths: [circlePath(CX, CY, 233), circlePath(CX, CY, 219, 'subtract')],
  fill: gradientFill([['#f9a8d4', 0], ['#fcd34d', 0.35], ['#93c5fd', 0.7], ['#c4b5fd', 1]], 'linear', { name: 'rings', angle: 45 }),
  bounds: [CX - 233, CY - 233, CX + 233, CY + 233],
});
const ringWhite = shapeLayer('Wheel / Border rings highlight', {
  paths: [circlePath(CX, CY, 237), circlePath(CX, CY, 231, 'subtract')],
  fill: colorFill(rgb(255, 255, 255)),
  bounds: [CX - 237, CY - 237, CX + 237, CY + 237],
  opacity: 0.86,
});
const hub = shapeLayer('Wheel / Center hub', {
  paths: [circlePath(CX, CY, 35.5)],
  fill: gradientFill([['#ffffff', 0], ['#fff7ed', 0.68], ['#fde68a', 1]], 'radial', { name: 'hub', offset: { x: -0.15, y: -0.15 } }),
  bounds: [CX - 36, CY - 36, CX + 36, CY + 36],
});
const hubRing = shapeLayer('Wheel / Center hub ring', {
  paths: [circlePath(CX, CY, 38), circlePath(CX, CY, 33, 'subtract')],
  fill: colorFill(rgb(245, 158, 11)),
  bounds: [CX - 38, CY - 38, CX + 38, CY + 38],
});

const pointerMain = shapeLayer('Pointer / Main', {
  paths: [polylinePath([
    { a: [720, 230], next: [720, 230] },
    { a: [710, 170], prev: [720, 230], next: [708, 157] },
    { a: [720, 143], prev: [711, 148], next: [729, 148], linked: true },
    { a: [730, 170], prev: [732, 157], next: [720, 230] },
  ])],
  fill: colorFill(rgb(220, 38, 38)),
  bounds: [708, 143, 732, 230],
});
const pointerHighlight = shapeLayer('Pointer / Highlight', {
  paths: [polylinePath([
    { a: [720, 222], next: [720, 222] },
    { a: [714, 171], prev: [720, 222], next: [713, 162] },
    { a: [720, 150], prev: [715, 155], next: [725, 155], linked: true },
    { a: [726, 171], prev: [727, 162], next: [720, 222] },
  ])],
  fill: colorFill(rgb(248, 113, 113)),
  bounds: [713, 150, 727, 222],
  opacity: 0.85,
});
const pointerPin = shapeLayer('Pointer / Pin', {
  paths: [circlePath(720, 164, 5)],
  fill: colorFill(rgb(127, 29, 29)),
  bounds: [715, 159, 725, 169],
});

const primaryButton = shapeLayer('Primary button / Shape', {
  paths: [roundedRectPath(563, 756, 172, 54, 27)],
  fill: gradientFill([['#fbbf24', 0], ['#fb7185', 0.5], ['#a855f7', 1]], 'linear', { name: 'primary', angle: 45 }),
  bounds: [563, 756, 735, 810],
});
const secondaryButton = shapeLayer('Secondary button / Shape', {
  paths: [roundedRectPath(747, 756, 130, 54, 27)],
  fill: colorFill(rgb(255, 255, 255)),
  bounds: [747, 756, 877, 810],
  opacity: 0.92,
});
const primaryLabel = textLayer('Button label / 抽取积分卡', '抽取积分卡', 582, 772, 18, '#ffffff', 'bold', 135, 'center');
const secondaryLabel = textLayer('Button label / 重置游戏', '重置游戏', 775, 772, 18, '#92400e', 'bold', 100, 'center');

const collectionPanel = shapeLayer('Collection / Visible panel top', {
  paths: [roundedRectPath(144, 834, 1152, 66, 16)],
  fill: colorFill(rgb(255, 255, 255)),
  bounds: [144, 834, 1296, 900],
  opacity: 0.82,
});
const collectionTitle = textLayer('Collection title', '📊 玩家收集档案', 172, 865, 20, '#92400e', 'bold', 300, 'left');
const archiveStatus = textLayer('Archive status', '当前：存档 1 · ID user-ca356a63-a98b', 172, 894, 12, '#a16207', 'regular', 380, 'left');
const archiveSelector = textLayer('Archive selector text', '存档 1 · 0 抽', 766, 872, 14, '#92400e', 'bold', 180, 'left');
const nameInput = textLayer('Name input text', '截图用户', 1032, 872, 14, '#92400e', 'regular', 180, 'left');

const imagePositions = [[596, 307], [726, 307], [596, 417], [726, 417]];
const imageFiles = ['春-积分卡.png', '夏-积分卡.png', '秋-积分卡.png', '冬-积分卡.png'];
const imageNames = ['Spring', 'Summer', 'Autumn', 'Winter'];
const cardImages = [];
for (let i = 0; i < 4; i++) {
  cardImages.push(await rasterLayer(`Card image / ${imageNames[i]} / source PNG`, path.join(sourceDir, imageFiles[i]), ...imagePositions[i], 104, 104));
}

const reference = {
  name: 'REFERENCE / CARD-02.desktop.png / LOCK MANUALLY',
  hidden: true,
  left: 0, top: 0, right: W, bottom: H,
  imageData: await pixelData(referencePath),
};

const psd = {
  width: W,
  height: H,
  imageData: await pixelData(compositePath),
  children: [
    { name: 'REFERENCE / Hidden', opened: false, children: [reference] },
    { name: '04_COLLECTION / Visible top', opened: true, children: [
      collectionTitle, archiveStatus, archiveSelector, nameInput, collectionPanel,
    ] },
    { name: '03_ACTIONS', opened: true, children: [
      secondaryLabel, secondaryButton, primaryLabel, primaryButton,
    ] },
    { name: '02_WHEEL_STAGE', opened: true, children: [
      { name: 'Pointer / Vectors', opened: true, children: [pointerPin, pointerHighlight, pointerMain] },
      { name: 'Wheel / Editable parts', opened: true, children: [
        textLayer('Hub / 抽卡', '抽卡', 682, 433, 15, '#b45309', 'bold', 76, 'center'),
        hubRing, hub,
        textLayer('Label / 夏季', '夏季', 808, 536, 18, '#7c2d12', 'bold', 60, 'left'),
        textLayer('Label / 秋季', '秋季', 464, 536, 18, '#7c2d12', 'bold', 60, 'left'),
        textLayer('Label / 春季', '春季', 808, 326, 18, '#7c2d12', 'bold', 60, 'left'),
        textLayer('Label / 冬季', '冬季', 464, 326, 18, '#7c2d12', 'bold', 60, 'left'),
        ...cardImages,
        ringWhite, ringGradient,
        ...sectors,
      ] },
      stageGlow, stagePanel,
    ] },
    { name: '01_HEADER', opened: true, children: [subtitleText, titleText, backText, backPill] },
    { name: '00_BG', opened: false, children: [bgGridV, bgGridH, bgBase] },
  ],
};

// ag-psd 以“从下到上”保存子层；声明顺序是图层面板自上而下，因此每组反转一次。
function toPsdStackOrder(children = []) {
  for (const layer of children) if (layer.children) toPsdStackOrder(layer.children);
  children.reverse();
}
toPsdStackOrder(psd.children);

await fs.writeFile(psdPath, writePsdBuffer(psd, { invalidateTextLayers: true }));
console.log(JSON.stringify({ psdPath, bytes: (await fs.stat(psdPath)).size, groups: psd.children.length }, null, 2));
