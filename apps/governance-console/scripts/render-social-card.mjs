// Rebuild the tracked social PNG from its editable SVG using the locked Next dependency.
import sharp from 'sharp';

await sharp(new URL('../public/social-card.svg', import.meta.url).pathname)
  .png()
  .toFile(new URL('../public/social-card.png', import.meta.url).pathname);
