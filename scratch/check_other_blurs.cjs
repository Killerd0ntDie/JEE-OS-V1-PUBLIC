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

let nonTargetCount = 0;
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('backdrop-blur') && !line.includes(targetStr)) {
      nonTargetCount++;
      console.log(`${path.relative(srcDir, file)}:${idx + 1}: ${line.trim()}`);
    }
  });
});

console.log(`\nTotal non-target backdrop-blur lines: ${nonTargetCount}`);
