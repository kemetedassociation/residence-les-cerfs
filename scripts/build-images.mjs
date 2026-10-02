// Converts source photos (src-assets/**) into responsive WebP variants in public/img
// and writes src/data/images.json (natural size + available widths per image).
// Usage: npm run images
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'src-assets');
const OUT = path.join(ROOT, 'public/img');
const MANIFEST = path.join(ROOT, 'src/data/images.json');
const WIDTHS = [640, 1080, 1600, 2400];

// Very light warm grade for daylight photos so they sit next to the evening ones.
// Colour only — nothing in the room is altered. (No daylight photo in use at the moment.)
const WARM = new Set([]);

await fs.mkdir(OUT, { recursive: true });
const manifest = {};

for (const dir of ['interior', 'chatel']) {
  const files = (await fs.readdir(path.join(SRC, dir))).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  for (const file of files) {
    const key = `${dir}/${path.parse(file).name}`;
    const id = key.replace('/', '-');
    const input = sharp(path.join(SRC, dir, file)).rotate();
    const { width, height } = await input.metadata();
    const widths = WIDTHS.filter((w) => w < width * 1.05);
    if (!widths.length || widths.at(-1) < Math.min(width, 2400) * 0.9) widths.push(Math.min(width, 2400));

    for (const w of widths) {
      let img = sharp(path.join(SRC, dir, file)).rotate().resize({ width: w, withoutEnlargement: true });
      if (WARM.has(key)) img = img.recomb([[1.04, 0.01, 0], [0, 1.0, 0], [0, 0, 0.93]]).modulate({ brightness: 0.97 });
      await img.webp({ quality: w <= 1080 ? 78 : 74, effort: 5 }).toFile(path.join(OUT, `${id}-${w}.webp`));
    }
    // tiny blurred placeholder, inlined as data URI
    const lqip = await sharp(path.join(SRC, dir, file)).rotate().resize({ width: 24 }).blur(1).webp({ quality: 40 }).toBuffer();
    manifest[key] = { id, width, height, widths, lqip: `data:image/webp;base64,${lqip.toString('base64')}` };
    console.log(key.padEnd(32), `${width}×${height}`, widths.join(','));
  }
}

// Open Graph image (1200×630) from the exterior view
await sharp(path.join(SRC, 'chatel/exterior-chatel-dusk.jpg'))
  .resize(1200, 630, { fit: 'cover', position: 'south' })
  .modulate({ brightness: 0.8 })
  .jpeg({ quality: 82 })
  .toFile(path.join(ROOT, 'public/og-image.jpg'));

await fs.writeFile(MANIFEST, JSON.stringify(manifest, null, 1));
console.log('→', path.relative(ROOT, MANIFEST));
