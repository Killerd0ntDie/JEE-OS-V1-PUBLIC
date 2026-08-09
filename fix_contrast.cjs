const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(path.join(__dirname, 'src'));
let changedCount = 0;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('text-zinc-500')) {
    const newContent = content.replace(/text-zinc-500/g, 'text-zinc-400');
    fs.writeFileSync(file, newContent, 'utf8');
    changedCount++;
  }
});

console.log(`Replaced text-zinc-500 with text-zinc-400 in ${changedCount} files.`);
