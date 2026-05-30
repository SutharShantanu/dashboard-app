const fs = require('fs');
const path = require('path');

function processIcon(inputFile, outputFile, prefix, exportName) {
  let code = fs.readFileSync(inputFile, 'utf8');
  
  // Replace IDs to be unique
  code = code.replace(/"id":"([a-zA-Z0-9_-]+)"/g, `"id":"${prefix}-$1"`);
  code = code.replace(/"url\(#([a-zA-Z0-9_-]+)\)"/g, `"url(#${prefix}-$1)"`);
  code = code.replace(/"href":"#([a-zA-Z0-9_-]+)"/g, `"href":"#${prefix}-$1"`);
  
  // Replace export
  code = code.replace(/export default ([a-zA-Z0-9_]+);/, `export { $1 as ${exportName} };`);
  
  fs.writeFileSync(outputFile, code);
  console.log(`Processed ${inputFile} -> ${outputFile}`);
}

const iconsDir = path.join(__dirname, 'components', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

processIcon(
  'node_modules/@thesvg/react/dist/google-sheets-2026.js',
  'components/icons/google-sheets.tsx',
  'gs2026',
  'GoogleSheetsIcon'
);

processIcon(
  'node_modules/@thesvg/react/dist/google.js',
  'components/icons/google-logo.tsx',
  'google',
  'GoogleIcon'
);
