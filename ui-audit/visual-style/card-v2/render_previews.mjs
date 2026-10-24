import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const out = join(root, 'previews');
await mkdir(out, { recursive: true });
for (const name of ['CARD-02.desktop', 'CARD-02.LOADING', 'CARD-02.SPINNING']) {
  await sharp(join(root, 'states', `${name}.svg`), { density: 72 }).png().toFile(join(out, `${name}.png`));
}
await sharp(join(root, 'concepts', 'CARD-02.tools-expanded.svg'), { density: 72 })
  .png().toFile(join(out, 'CARD-02.tools-expanded.png'));
await sharp(join(root, 'concepts', 'CARD-02.pointer-result-example.svg'), { density: 72 })
  .png().toFile(join(out, 'CARD-02.pointer-result-example.png'));
await sharp(join(root, 'concepts', 'CARD-02.error-proposal.svg'), { density: 72 })
  .png().toFile(join(out, 'CARD-02.error-proposal.png'));

const repo = resolve(root, '../../..');
const before = execFileSync('git', [
  'show',
  'b81c1d7589c535fedeb5bbe6bf364a7a23e0ba59:ui-audit/visual-style/card-v2/previews/CARD-02.desktop.png',
], { cwd: repo, maxBuffer: 2 * 1024 * 1024 });
const label = Buffer.from('<svg width="1440" height="45"><style>text{font:700 18px Microsoft YaHei, sans-serif;fill:#FCFAFF}</style><text x="22" y="29">V2 基线</text><text x="742" y="29">V2.1 精修</text></svg>');
await sharp({ create: { width: 1440, height: 570, channels: 4, background: '#111A35' } })
  .composite([
    { input: label, left: 0, top: 0 },
    { input: await sharp(before).resize(720, 525).toBuffer(), left: 0, top: 45 },
    { input: await sharp(join(out, 'CARD-02.desktop.png')).resize(720, 525).toBuffer(), left: 720, top: 45 },
  ])
  .png().toFile(join(out, 'CARD-02.V2-vs-V2.1.png'));
