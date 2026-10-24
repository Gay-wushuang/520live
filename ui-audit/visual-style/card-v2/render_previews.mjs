import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const out = join(root, 'previews');
await mkdir(out, { recursive: true });
for (const name of ['CARD-02.desktop', 'CARD-02.LOADING', 'CARD-02.SPINNING']) {
  await sharp(join(root, 'states', `${name}.svg`), { density: 72 }).png().toFile(join(out, `${name}.png`));
}
await sharp(join(root, 'concepts', 'CARD-02.tools-expanded.svg'), { density: 72 })
  .png().toFile(join(out, 'CARD-02.tools-expanded.png'));
