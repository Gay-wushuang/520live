import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { readPsd } from 'ag-psd';

const root = path.resolve(import.meta.dirname, '../../../..');
const psdPath = path.join(root, 'ui-audit/psd/pilot/CardWheel-Editable.psd');
const referencePath = path.join(root, 'ui-audit/psd/pilot/CardWheel-Reference.png');
const figmaPath = path.join(root, 'ui-audit/psd/pilot/intermediate/CardWheel-Figma.png');
const data = await fs.readFile(psdPath);
const psd = readPsd(data, { skipLayerImageData: true, skipCompositeImageData: true, skipThumbnail: true });

const counts = { groups: 0, text: 0, raster: 0, hiddenReference: 0, total: 0 };
const tree = [];
function walk(children = [], depth = 0) {
  for (const layer of children) {
    counts.total++;
    if (layer.children) counts.groups++;
    else if (layer.text) counts.text++;
    else counts.raster++;
    if (layer.hidden && /REFERENCE/.test(layer.name || '')) counts.hiddenReference++;
    tree.push(`${'  '.repeat(depth)}- ${layer.name}${layer.text ? ' [TEXT]' : layer.children ? ' [GROUP]' : ' [RASTER]'}`);
    if (layer.children) walk(layer.children, depth + 1);
  }
}
walk(psd.children);

const psdPreviewPath = path.join(root, 'ui-audit/psd/pilot/intermediate/CardWheel-Photoshop-Render-v3.png');
const [ref, figma, psdPreview] = await Promise.all([
  sharp(referencePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  sharp(figmaPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  sharp(psdPreviewPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
]);
if (ref.info.width !== figma.info.width || ref.info.height !== figma.info.height) throw new Error('Reference dimensions do not match Figma export');
const pixels = ref.info.width * ref.info.height;
function compare(a, b) {
  let sum = 0;
  let changed = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    const d = Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]);
    sum += d / 3;
    if (d > 36) changed++;
  }
  return { meanAbsoluteRgbError: Number((sum / pixels).toFixed(2)), changedPixelRatioOver12PerChannel: Number((changed / pixels).toFixed(4)) };
}
const result = {
  psd: { width: psd.width, height: psd.height, bytes: data.length, counts },
  comparison: {
    dimensions: [ref.info.width, ref.info.height],
    figmaVsReference: compare(ref, figma),
    photoshopRenderVsReference: compare(ref, psdPreview),
    note: 'Photoshop 2024 PNG export vs frozen CARD-02 reference; full-page pixel difference includes card crop, label styles, stage lighting, and partial collection simplification.'
  },
  tree,
};
await fs.writeFile(path.join(root, 'ui-audit/psd/pilot/intermediate/validation.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
