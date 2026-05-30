import fs from 'fs';
import path from 'path';

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(dirPath);
  });
}

function processFiles() {
  const dirs = ['./app', './components'];
  dirs.forEach(dir => {
    walk(dir, (filePath) => {
      if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
      let content = fs.readFileSync(filePath, 'utf8');
      let originalContent = content;

      if (content.includes('@thesvg/react')) {
         content = content.replace(/import\s+{\s*([^}]+)\s*}\s+from\s+["']@thesvg\/react["']/g, (match, p1) => {
             const tokens = p1.split(',').map(t => t.trim()).filter(Boolean);
             let replacements = [];
             for (let t of tokens) {
                 if (t === 'GoogleDrive2026') replacements.push('import { GoogleDriveIcon } from "@/components/icons/google-drive"');
                 if (t === 'GoogleSheets2026') replacements.push('import { GoogleSheetsIcon } from "@/components/icons/google-sheets"');
                 if (t === 'Google') replacements.push('import { GoogleIcon } from "@/components/icons/google-logo"');
             }
             return replacements.join('\n');
         });

         content = content.replace(/<GoogleDrive2026/g, '<GoogleDriveIcon');
         content = content.replace(/<GoogleSheets2026/g, '<GoogleSheetsIcon');
         content = content.replace(/<Google\b/g, '<GoogleIcon');
         content = content.replace(/<\/Google>/g, '</GoogleIcon>');
      }

      if (content !== originalContent) {
          fs.writeFileSync(filePath, content);
          console.log('Updated ' + filePath);
      }
    });
  });
}

processFiles();
