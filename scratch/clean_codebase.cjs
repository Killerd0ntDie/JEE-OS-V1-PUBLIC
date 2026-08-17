const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = walk(srcDir);
const targetStr = 'bg-black/45 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10';

let modifiedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace exact target string with leading or trailing spaces cleanly
  if (content.includes(targetStr)) {
    // 1. targetStr followed by space
    content = content.replaceAll(targetStr + ' ', '');
    // 2. space followed by targetStr
    content = content.replaceAll(' ' + targetStr, '');
    // 3. exact targetStr
    content = content.replaceAll(targetStr, '');
  }

  // Remove duplicate backdrop-blur-2xl or backdrop-blur-xl if duplicated
  content = content.replaceAll('backdrop-blur-2xl backdrop-blur-2xl', 'backdrop-blur-2xl');
  content = content.replaceAll('backdrop-blur-xl backdrop-blur-xl', 'backdrop-blur-xl');
  content = content.replaceAll('border border-white/10 border border-white/10', 'border border-white/10');
  content = content.replaceAll('border border-white/15 border border-white/15', 'border border-white/15');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    modifiedFiles++;
    console.log(`Cleaned: ${path.relative(srcDir, file)}`);
  }
});

console.log(`\nSuccessfully cleaned ${modifiedFiles} files.`);
