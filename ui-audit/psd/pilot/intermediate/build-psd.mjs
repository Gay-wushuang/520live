import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { writePsdBuffer } from 'ag-psd';

const root = path.resolve(import.meta.dirname, '../../../..');
const outDir = path.join(root, 'ui-audit/psd/pilot');
const sourceDir = path.join(root, 'ui-audit/design-source/assets');
const psdPath = path.join(outDir, 'CardWheel-Editable.psd');
const compositePath = path.join(outDir, 'intermediate/CardWheel-Figma.png');
const referencePath = path.join(outDir, 'CardWheel-Reference.png');

async function pixelData(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8ClampedArray(data), width: info.width, height: info.height };
}

async function svgLayer(name, left, top, width, height, body, opacity = 255) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
  return { name, left, top, right: left + width, bottom: top + height, opacity, imageData: await pixelData(Buffer.from(svg)) };
}

async function imageLayer(name, file, left, top, width, height) {
  const imageData = await pixelData(await sharp(file).resize(width, height, { fit: 'cover' }).png().toBuffer());
  return { name, left, top, right: left + width, bottom: top + height, imageData };
}

function textLayer(name, text, x, y, size, color, style = 'Bold', width = 500, align = 'left') {
  return {
    name,
    text: {
      text,
      transform: [1, 0, 0, 1, x, y],
      shapeType: 'box',
      boxBounds: [0, 0, width, size * 1.8],
      style: {
        font: { name: `NotoSansSC-${style}` },
        fontSize: size,
        fillColor: color,
      },
      paragraphStyle: { justification: align },
    },
  };
}

const background = await svgLayer('BG / Base radial + grid', 0, 0, 1440, 900, `
  <defs>
    <radialGradient id="bg" cx="50%" cy="0%" r="105%"><stop offset="0" stop-color="#fff7ed"/><stop offset=".42" stop-color="#fdf2f8"/><stop offset="1" stop-color="#eef6ff"/></radialGradient>
    <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="#f6a6ba" stroke-opacity=".18" stroke-width="1"/></pattern>
  </defs><rect width="1440" height="900" fill="url(#bg)"/><rect width="1440" height="900" fill="url(#grid)"/>`);

const stageBase = await svgLayer('Stage / Glass panel', 336, 167, 768, 565, `
  <defs><filter id="s" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="22" stdDeviation="25" flood-color="#b45309" flood-opacity=".14"/></filter>
  <radialGradient id="g"><stop stop-color="#fde68a" stop-opacity=".3"/><stop offset=".5" stop-color="#fbcfe8" stop-opacity=".25"/><stop offset="1" stop-color="#bae6fd" stop-opacity=".3"/></radialGradient></defs>
  <rect x="0.5" y="0.5" width="767" height="564" rx="36" fill="#fff" fill-opacity=".72" stroke="#fff" stroke-opacity=".8" filter="url(#s)"/>
  <ellipse cx="384" cy="175" rx="250" ry="135" fill="url(#g)" opacity=".75"/>`);

const sectorDefs = [
  ['Sector / Spring', 0, '#fff1f2', '#fecdd3'],
  ['Sector / Summer', 90, '#ecfeff', '#bae6fd'],
  ['Sector / Autumn', 180, '#f0fdf4', '#bbf7d0'],
  ['Sector / Winter', 270, '#fffbeb', '#fde68a'],
];
const sectors = [];
for (const [name, rotation, c1, c2] of sectorDefs) {
  sectors.push(await svgLayer(name, 500, 225, 440, 440, `<defs><radialGradient id="r"><stop stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient></defs><path d="M220 220 L220 0 A220 220 0 0 1 440 220 Z" transform="rotate(${rotation} 220 220)" fill="url(#r)" stroke="#fff" stroke-width="5"/>`));
}
const wheelRings = await svgLayer('Wheel / Border rings', 484, 209, 472, 472, `<defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f9a8d4"/><stop offset=".35" stop-color="#fcd34d"/><stop offset=".7" stop-color="#93c5fd"/><stop offset="1" stop-color="#c4b5fd"/></linearGradient></defs><circle cx="236" cy="236" r="226" fill="none" stroke="url(#b)" stroke-width="14"/><circle cx="236" cy="236" r="234" fill="none" stroke="#fff" stroke-opacity=".86" stroke-width="6"/>`);
const hub = await svgLayer('Wheel / Center hub', 682, 407, 76, 76, `<defs><radialGradient id="h" cx="35%" cy="35%"><stop stop-color="#fff"/><stop offset=".68" stop-color="#fff7ed"/><stop offset="1" stop-color="#fde68a"/></radialGradient></defs><circle cx="38" cy="38" r="35.5" fill="url(#h)" stroke="#f59e0b" stroke-width="5"/>`);
const pointer = await svgLayer('Pointer / Main + highlight + pin', 700, 140, 40, 92, `<defs><filter id="p" x="-80%" y="-30%" width="260%" height="180%"><feDropShadow dx="0" dy="8" stdDeviation="7" flood-color="#b91c1c" flood-opacity=".45"/></filter></defs><g filter="url(#p)"><path d="M20 90L10 30C8 17 11 8 20 3C29 8 32 17 30 30Z" fill="#dc2626" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><path d="M20 82L14 31C13 22 15 15 20 10C25 15 27 22 26 31Z" fill="#f87171" opacity=".85"/><circle cx="20" cy="24" r="5" fill="#7f1d1d"/></g>`);

const imagePositions = [[596,307],[726,307],[596,417],[726,417]];
const imageFiles = ['春-积分卡.png','夏-积分卡.png','秋-积分卡.png','冬-积分卡.png'];
const imageNames = ['Spring','Summer','Autumn','Winter'];
const cardImages = [];
for (let i = 0; i < 4; i++) cardImages.push(await imageLayer(`Card image / ${imageNames[i]} / source PNG`, path.join(sourceDir, imageFiles[i]), ...imagePositions[i], 104, 104));

const backPill = await svgLayer('Back pill / Shape', 649, 16, 142, 38, `<rect x=".5" y=".5" width="141" height="37" rx="19" fill="#fff" fill-opacity=".8" stroke="#fcd34d"/>`);
const primaryButton = await svgLayer('Primary button / Shape', 563, 756, 172, 54, `<defs><linearGradient id="a"><stop stop-color="#fbbf24"/><stop offset=".5" stop-color="#fb7185"/><stop offset="1" stop-color="#a855f7"/></linearGradient></defs><rect width="172" height="54" rx="27" fill="url(#a)"/>`);
const secondaryButton = await svgLayer('Secondary button / Shape', 747, 756, 130, 54, `<rect x=".5" y=".5" width="129" height="53" rx="27" fill="#fff" fill-opacity=".92" stroke="#fcd34d"/>`);
const collectionBase = await svgLayer('Collection / Visible panel top', 144, 834, 1152, 66, `<rect x=".5" y=".5" width="1151" height="120" rx="16" fill="#fff" fill-opacity=".82" stroke="#fcd34d"/>`);

const reference = { name: 'REFERENCE / CARD-02.desktop.png / LOCK MANUALLY', hidden: true, left: 0, top: 0, right: 1440, bottom: 900, imageData: await pixelData(referencePath) };
const psd = {
  width: 1440,
  height: 900,
  imageData: await pixelData(compositePath),
  children: [
    { name: 'REFERENCE / Hidden', opened: false, children: [reference] },
    { name: '04_COLLECTION / Visible top', opened: true, children: [
      textLayer('Name input text', '截图用户', 1032, 872, 14, {r:146,g:64,b:14}, 'Regular', 180),
      textLayer('Archive selector text', '存档 1 · 0 抽', 766, 872, 14, {r:146,g:64,b:14}, 'Bold', 180),
      textLayer('Archive status', '当前：存档 1 · ID user-ca356a63-a98b', 172, 894, 12, {r:161,g:98,b:7}, 'Regular', 380),
      textLayer('Collection title', '📊 玩家收集档案', 172, 865, 20, {r:146,g:64,b:14}, 'Black', 300),
      collectionBase,
    ]},
    { name: '03_ACTIONS', opened: true, children: [
      textLayer('Button label / 重置游戏', '重置游戏', 775, 772, 18, {r:146,g:64,b:14}, 'Bold', 100, 'center'),
      secondaryButton,
      textLayer('Button label / 抽取积分卡', '抽取积分卡', 582, 772, 18, {r:255,g:255,b:255}, 'Bold', 135, 'center'),
      primaryButton,
    ]},
    { name: '02_WHEEL_STAGE', opened: true, children: [
      pointer,
      { name: 'Wheel / Editable parts', opened: true, children: [
        textLayer('Hub / 抽卡', '抽卡', 682, 433, 15, {r:180,g:83,b:9}, 'Bold', 76, 'center'),
        hub,
        textLayer('Label / 夏季', '夏季', 808, 536, 18, {r:124,g:45,b:18}, 'Bold', 60),
        textLayer('Label / 秋季', '秋季', 464, 536, 18, {r:124,g:45,b:18}, 'Bold', 60),
        textLayer('Label / 春季', '春季', 808, 326, 18, {r:124,g:45,b:18}, 'Bold', 60),
        textLayer('Label / 冬季', '冬季', 464, 326, 18, {r:124,g:45,b:18}, 'Bold', 60),
        ...cardImages,
        wheelRings,
        ...sectors,
      ]},
      stageBase,
    ]},
    { name: '01_HEADER', opened: true, children: [
      textLayer('Subtitle', '红色指针停在哪一格，就记录对应季节积分卡', 370, 132, 14, {r:180,g:83,b:9}, 'Bold', 700, 'center'),
      textLayer('Title / 积分卡转盘', '积分卡转盘', 370, 75, 48, {r:244,g:63,b:94}, 'Black', 700, 'center'),
      textLayer('Back text', '← 返回棋盘首页', 668, 28, 14, {r:146,g:64,b:14}, 'Bold', 120, 'center'),
      backPill,
    ]},
    { name: '00_BG', opened: false, children: [background] },
  ],
};

async function renderEditableTextFallbacks(children = []) {
  for (const layer of children) {
    if (layer.children) await renderEditableTextFallbacks(layer.children);
    if (!layer.text) continue;
    const [,,, , x, y] = layer.text.transform;
    const width = layer.text.boxBounds?.[2] || 500;
    const size = layer.text.style?.fontSize || 16;
    const height = Math.ceil(size * 1.8);
    const c = layer.text.style?.fillColor || { r: 0, g: 0, b: 0 };
    const align = layer.text.paragraphStyle?.justification || 'left';
    const anchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start';
    const tx = align === 'center' ? width / 2 : align === 'right' ? width : 0;
    const family = layer.text.style?.font?.name?.includes('Black') ? 'Microsoft YaHei' : 'Microsoft YaHei';
    const weight = layer.text.style?.font?.name?.includes('Regular') ? 400 : 700;
    const escaped = layer.text.text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><text x="${tx}" y="${size * 1.32}" text-anchor="${anchor}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="rgb(${c.r},${c.g},${c.b})">${escaped}</text></svg>`;
    layer.left = x; layer.top = y; layer.right = x + width; layer.bottom = y + height;
    layer.imageData = await pixelData(Buffer.from(svg));
  }
}
await renderEditableTextFallbacks(psd.children);

// ag-psd stores children from bottom to top. The declarations above are written
// in human layer-panel order (top to bottom), so reverse every group once.
function toPsdStackOrder(children = []) {
  for (const layer of children) if (layer.children) toPsdStackOrder(layer.children);
  children.reverse();
}
toPsdStackOrder(psd.children);

await fs.writeFile(psdPath, writePsdBuffer(psd, { invalidateTextLayers: true }));
console.log(JSON.stringify({ psdPath, bytes: (await fs.stat(psdPath)).size, groups: psd.children.length }, null, 2));
