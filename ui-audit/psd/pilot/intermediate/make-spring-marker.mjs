// PSD Pilot v2.1 — 生成“春季卡图替换测试标记图”
//
// 用途：Phase C 验收时把它作为新内容塞进 “Card image / Spring / Smart Object”，
// 用于证明“替换 Smart Object 内容”真实生效，而不是只改了描述符/图层名。
//
// 规格：1672x941 @72dpi（与四季积分卡原始 PNG 一致的像素尺寸与分辨率），
//       底色 #FF00FF（品红），左上 1/5 宽高为黑色块、右下 1/5 宽高为绿色块。
//       品红/黑/绿三色互不接近，便于在 104x104 的合成结果里逐像素定位，
//       同时用角落颜色验证内嵌源没有被裁切/翻转。
//
// 注意：分辨率必须与源卡片一致（72dpi）。Photoshop 的 “替换 Smart Object 内容”
//       按“物理尺寸”保持不变来缩放图层：若替换图缺少 DPI（Photoshop 按 25ppi 处理），
//       图层会被放大 72/25≈2.88 倍（104x104 → 300x300）。v2.1 验收实测到该行为，
//       因此标记图显式写入 72dpi，使“尺寸/位置不变”成为可核验的断言。
//
// 用法：node make-spring-marker.mjs [输出路径]
import sharp from 'sharp';

const W = 1672;
const H = 941;
const DPI = 72;
const out = process.argv[2] || new URL('./card-spring-marker.png', import.meta.url).pathname;

const bw = Math.round(W / 5);
const bh = Math.round(H / 5);

await sharp({ create: { width: W, height: H, channels: 3, background: { r: 255, g: 0, b: 255 } } })
  .composite([
    { input: { create: { width: bw, height: bh, channels: 3, background: { r: 0, g: 0, b: 0 } } }, left: 0, top: 0 },
    { input: { create: { width: bw, height: bh, channels: 3, background: { r: 0, g: 255, b: 0 } } }, left: W - bw, top: H - bh },
  ])
  .withMetadata({ density: DPI })
  .png({ compressionLevel: 9 })
  .toFile(out);

const meta = await sharp(out).metadata();
console.log(JSON.stringify({ out, width: meta.width, height: meta.height, density: meta.density, format: meta.format }, null, 2));
