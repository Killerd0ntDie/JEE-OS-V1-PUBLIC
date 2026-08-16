const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'src');

function walk(directory) {
  let results = [];
  const list = fs.readdirSync(directory);
  list.forEach(file => {
    const filePath = path.join(directory, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      results.push(filePath);
    }
  });
  return results;
}

const files = walk(dir);
let modifiedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // 1. Replace backdropClassName blackout
  content = content.replace(/backdropClassName=[\"']([^\"']*?)bg-black\/\d+([^\"']*?)[\"']/g, (match, p1, p2) => {
    return 'backdropClassName=\"' + p1 + 'bg-black/10' + p2 + '\"';
  });
  
  // 2. Replace fixed inset-0 blackout (for custom modals)
  content = content.replace(/className=[\"']([^\"']*?)fixed inset-0([^\"']*?)bg-black\/\d+([^\"']*?)[\"']/g, (match, p1, p2, p3) => {
    return 'className=\"' + p1 + 'fixed inset-0' + p2 + 'bg-black/10' + p3 + '\"';
  });

  // Also catch template literals like \`fixed inset-0 ... bg-black/\d+ ...\`
  content = content.replace(/className=\{`([^`]*?)fixed inset-0([^`]*?)bg-black\/\d+([^`]*?)`\}/g, (match, p1, p2, p3) => {
    return 'className={`' + p1 + 'fixed inset-0' + p2 + 'bg-black/10' + p3 + '`}';
  });

  // And `bg-black/XX backdrop-blur-sm visible` in CommandPalette
  content = content.replace(/bg-black\/\d+ backdrop-blur-sm visible/g, 'bg-black/10 backdrop-blur-sm visible');

  // 3. For Modal.tsx default backdrop
  if (file.endsWith('Modal.tsx') || file.endsWith('Drawer.tsx')) {
    content = content.replace(/backdropClassName = 'bg-black\/\d+/, "backdropClassName = 'bg-black/10");
  }
  
  // 4. Adding glass-panel to Modal components in use.
  content = content.replace(/<Modal([^>]*?)className=[\"']([^\"']*)[\"']/g, (match, p1, p2) => {
    let classes = p2.split(' ');
    // remove opaque backgrounds
    classes = classes.filter(c => !c.startsWith('bg-[#') && !c.startsWith('bg-zinc-') && !c.startsWith('bg-black'));
    if (!classes.includes('glass-panel')) {
      classes.push('glass-panel');
    }
    return '<Modal' + p1 + 'className=\"' + classes.join(' ') + '\"';
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    modifiedCount++;
    console.log('Modified: ' + file);
  }
});
console.log('Total files modified: ' + modifiedCount);
