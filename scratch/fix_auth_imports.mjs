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

  // Replace import ... from '@/context/AuthContext' with import ... from '@/features/auth'
  if (content.includes('@/context/AuthContext') || content.includes('../../context/AuthContext')) {
    content = content.replace(/['"]@\/context\/AuthContext['"]/g, "'@/features/auth'");
    content = content.replace(/['"]\.\.\/\.\.\/context\/AuthContext['"]/g, "'@/features/auth'");
    changed = true;
  }
  // Replace import { useAuth } from '@/hooks/useAuth' with import { useAuth } from '@/features/auth'
  if (content.includes('@/hooks/useAuth')) {
    content = content.replace(/['"]@\/hooks\/useAuth['"]/g, "'@/features/auth'");
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated Auth imports in: ${path.relative(srcDir, filePath)}`);
  }
}

walkDir(srcDir, processFile);
console.log("Auth import rewrite complete.");
