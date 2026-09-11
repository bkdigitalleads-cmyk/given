const sharp = require('sharp');

// Given icon: deep plum field, a coral-pink gift box with a cream ribbon
// and a small heart on the tag — generous, festive, tax-season neutral.
const svg = `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2E1A24"/>
      <stop offset="1" stop-color="#160C11"/>
    </linearGradient>
    <linearGradient id="box" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FF7FA1"/>
      <stop offset="1" stop-color="#D9365F"/>
    </linearGradient>
    <linearGradient id="lid" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FF9BB6"/>
      <stop offset="1" stop-color="#EE5F82"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.45" r="0.55">
      <stop offset="0" stop-color="#F06A8C" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#F06A8C" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <circle cx="512" cy="500" r="360" fill="url(#glow)"/>
  <!-- box body -->
  <rect x="232" y="470" width="560" height="380" rx="36" fill="url(#box)"/>
  <!-- lid -->
  <rect x="192" y="360" width="640" height="150" rx="34" fill="url(#lid)"/>
  <rect x="192" y="360" width="640" height="150" rx="34" fill="none" stroke="#160C11" stroke-opacity="0.18" stroke-width="10"/>
  <!-- vertical ribbon -->
  <rect x="470" y="360" width="84" height="490" fill="#FFF1E6"/>
  <rect x="470" y="360" width="84" height="150" fill="#FFF7F0"/>
  <!-- bow -->
  <path d="M 512 360 C 430 300 330 250 356 330 C 372 380 450 372 512 360 Z" fill="#FFF1E6"/>
  <path d="M 512 360 C 594 300 694 250 668 330 C 652 380 574 372 512 360 Z" fill="#FFF1E6"/>
  <path d="M 512 360 C 452 316 380 290 396 336 C 406 366 462 364 512 360 Z" fill="#F6D9C8" opacity="0.9"/>
  <path d="M 512 360 C 572 316 644 290 628 336 C 618 366 562 364 512 360 Z" fill="#F6D9C8" opacity="0.9"/>
  <circle cx="512" cy="360" r="34" fill="#FFF7F0"/>
  <!-- heart -->
  <path d="M 512 760 C 480 730 440 710 440 672 C 440 646 460 632 480 632 C 496 632 506 642 512 652 C 518 642 528 632 544 632 C 564 632 584 646 584 672 C 584 710 544 730 512 760 Z" fill="#FFF1E6" opacity="0.95"/>
</svg>`;

(async () => {
  const buf = Buffer.from(svg);
  await sharp(buf).resize(1024, 1024).png().toFile('../assets/icon.png');
  await sharp(buf).resize(1024, 1024).png().toFile('../assets/android-icon-foreground.png');
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: '#1A1215' } })
    .png().toFile('../assets/android-icon-background.png');
  await sharp(buf).resize(1024, 1024).grayscale().png().toFile('../assets/android-icon-monochrome.png');
  await sharp(buf).resize(48, 48).png().toFile('../assets/favicon.png');
  await sharp(buf).resize(512, 512).png().toFile('../assets/splash-icon.png');
  console.log('icons written');
})();
