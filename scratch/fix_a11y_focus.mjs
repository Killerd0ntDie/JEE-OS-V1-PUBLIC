import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else if (dirPath.endsWith('.ts') || dirPath.endsWith('.tsx')) {
      callback(dirPath);
    }
  });
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;

  // Replace 'focus:outline-none' that don't have 'focus-visible:ring' already
  const regex = /focus:outline-none(?!\s+focus-visible:ring)/g;
  
  if (regex.test(content)) {
    // Check if the file is an icon or svg component (they usually don't need focus rings)
    // Actually, any interactive element with outline-none should have focus-visible.
    content = content.replace(regex, 'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50');
    changed = true;
  }

  // Also replace '<div onClick=' with '<button onClick=' if it looks like a card/button that was used as a div
  // But this might be too aggressive for a regex, so we'll stick to focus rings for the script.

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated focus rings in: ${path.relative(srcDir, filePath)}`);
  }
}

walkDir(srcDir, processFile);
console.log("Focus indicator sweep complete.");
