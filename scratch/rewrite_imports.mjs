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

  // Regex to match imports and exports from relative paths
  const importRegex = /(import|export)\s+(.*?)\s+from\s+['"]((?:\.\.\/|\.\/)[^'"]+)['"]/g;

  const newContent = content.replace(importRegex, (match, type, imports, relativePath) => {
    // Resolve the absolute path of the imported file
    const absoluteImportPath = path.resolve(path.dirname(filePath), relativePath);
    
    // Check if the imported file is inside the src directory
    if (absoluteImportPath.startsWith(srcDir)) {
      // Create the alias path
      const aliasPath = '@/' + path.relative(srcDir, absoluteImportPath).replace(/\\/g, '/');
      
      // We'll replace it if it's going outside the current directory's parent (../../)
      // or if it's explicitly pulling from a cross-boundary like features/ or components/
      // To enforce clean architecture, we can just replace ALL relative imports that resolve inside src
      // with the @/ alias, EXCEPT very local ones (like ./ChildComponent) if desired.
      // But using @/ everywhere is also perfectly valid and clean.
      // Let's replace any import that contains '../' to be safe and enforce absolute paths for anything traversing up.
      if (relativePath.includes('../')) {
        changed = true;
        return `${type} ${imports} from '${aliasPath}'`;
      }
    }
    return match;
  });

  if (changed) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log(`Updated: ${path.relative(srcDir, filePath)}`);
  }
}

walkDir(srcDir, processFile);
console.log("Import rewrite complete.");
