const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Create a simple blue square icon with "SP" text
async function generateIcons() {
  const iconDir = path.join(__dirname, '..', 'public', 'icons');
  
  // Create a simple SVG as the base
  const svgIcon = `
    <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" rx="64" fill="#0066cc"/>
      <text x="256" y="320" font-family="Arial, sans-serif" font-size="200" font-weight="bold" fill="white" text-anchor="middle">SP</text>
    </svg>
  `;

  try {
    // Generate 192x192 icon
    await sharp(Buffer.from(svgIcon))
      .resize(192, 192)
      .png()
      .toFile(path.join(iconDir, 'icon-192.png'));
    console.log('✅ Generated icon-192.png');

    // Generate 512x512 icon
    await sharp(Buffer.from(svgIcon))
      .resize(512, 512)
      .png()
      .toFile(path.join(iconDir, 'icon-512.png'));
    console.log('✅ Generated icon-512.png');

    console.log('\nDone! Icons generated successfully.');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons();
