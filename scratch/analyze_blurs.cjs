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
console.log(`Found ${files.length} source files.`);

let matchCount = 0;
const targetStr = 'bg-black/45 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10';

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes(targetStr)) {
    const count = content.split(targetStr).length - 1;
    matchCount += count;
    console.log(`${path.relative(srcDir, file)}: ${count} occurrences`);
  }
});

console.log(`Total exact matches of target string: ${matchCount}`);
