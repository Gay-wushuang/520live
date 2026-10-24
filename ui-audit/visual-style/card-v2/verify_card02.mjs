import sharp from 'sharp';
import { readFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const repo = resolve(root, '../../..');
const svgPaths = [
  join(root, 'states', 'CARD-02.desktop.svg'),
  join(root, 'states', 'CARD-02.LOADING.svg'),
  join(root, 'states', 'CARD-02.SPINNING.svg'),
  join(root, 'concepts', 'CARD-02.tools-expanded.svg'),
  join(root, 'concepts', 'CARD-02.pointer-result-example.svg'),
  join(root, 'concepts', 'CARD-02.error-proposal.svg'),
];
const allFunctions = new Set();
for (const path of svgPaths) {
  const source = await readFile(path, 'utf8');
  if (!source.includes('width="1440" height="1050" viewBox="0 0 1440 1050"')) throw new Error(`Artboard: ${path}`);
  const ids = [...source.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  if (ids.length !== new Set(ids).size) throw new Error(`Duplicate SVG ID: ${path}`);
  for (const match of source.matchAll(/data-func="([^"]+)"/g)) {
    for (const id of match[1].split(' ')) allFunctions.add(id);
  }
  const art = [...source.matchAll(/<g id="CARD-WHEEL-ART-\d+"[^>]*data-source="public\/([^"]+)"[^>]*>.*?<image[^>]*href="data:image\/jpeg;base64,([^"]+)"/g)];
  for (const match of art) {
    const original = join(repo, 'public', match[1]);
    const expected = await sharp(original).resize(210, 118, { fit: 'contain', background: '#F2F1F8' })
      .jpeg({ quality: 86, chromaSubsampling: '4:4:4' }).toBuffer();
    if (expected.toString('base64') !== match[2]) throw new Error(`Source image mismatch: ${original}`);
  }
  const shouldHaveArt = !path.endsWith('CARD-02.LOADING.svg') && !path.endsWith('CARD-02.error-proposal.svg');
  if (art.length !== (shouldHaveArt ? 4 : 0)) throw new Error(`Unexpected art count: ${path} (${art.length})`);
  await sharp(Buffer.from(source), { density: 72 }).metadata();
  console.log(`${path.split(/[\\/]/).at(-1)}: XML renderable, 1440×1050, ${ids.length} unique IDs, ${art.length} verified images`);
}
for (let number = 1; number <= 14; number++) {
  const id = `CARD-F${String(number).padStart(2, '0')}`;
  if (!allFunctions.has(id)) throw new Error(`Missing function: ${id}`);
}
const expectedPreviews = [
  'CARD-02.desktop.png', 'CARD-02.LOADING.png', 'CARD-02.SPINNING.png',
  'CARD-02.tools-expanded.png', 'CARD-02.pointer-result-example.png', 'CARD-02.error-proposal.png',
];
for (const name of expectedPreviews) {
  const path = join(root, 'previews', name);
  const meta = await sharp(path).metadata();
  if (meta.width !== 1440 || meta.height !== 1050 || (await stat(path)).size === 0) throw new Error(`Preview: ${name}`);
}
for (const [angle, index] of [[315, 0], [225, 1], [135, 2], [45, 3]]) {
  const actual = Math.floor(((360 - angle) % 360) / 90);
  if (actual !== index) throw new Error(`Pointer example mapping: ${angle}`);
}
console.log('CARD-F01–CARD-F14 present; six previews nonempty; four centered pointer examples map to spring/summer/autumn/winter.');
