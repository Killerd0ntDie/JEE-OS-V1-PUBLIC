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
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = walk(srcDir);
let changedCount = 0;

// Files where backdrop-blur on top-level overlays is expected and kept:
const preservedFiles = [
  'Topbar.tsx',
  'Modal.tsx',
  'Drawer.tsx'
];

files.forEach(file => {
  const base = path.basename(file);
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Clean remaining stray injected tokens
  content = content.replaceAll('backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10', '');
  content = content.replaceAll('bg-zinc-950/95 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10', 'bg-zinc-950/98 border border-zinc-800');
  
  if (!preservedFiles.includes(base)) {
    // Replace card-level heavy 40px gaussian blurs with smooth high-opacity dark card styles
    content = content.replaceAll('bg-zinc-900/70 backdrop-blur-2xl', 'bg-zinc-900/90');
    content = content.replaceAll('bg-zinc-900/80 backdrop-blur-2xl', 'bg-zinc-900/90');
    content = content.replaceAll('bg-zinc-900/60 backdrop-blur-2xl', 'bg-zinc-900/90');
    content = content.replaceAll('bg-zinc-950/95 backdrop-blur-2xl', 'bg-zinc-950/98');
    content = content.replaceAll('bg-zinc-950/85 backdrop-blur-2xl', 'bg-zinc-950/95');
    content = content.replaceAll('bg-zinc-950/90 backdrop-blur-2xl', 'bg-zinc-950/95');
    content = content.replaceAll('bg-zinc-950/80 backdrop-blur-2xl', 'bg-zinc-950/95');
    content = content.replaceAll('bg-zinc-950/70 backdrop-blur-2xl', 'bg-zinc-950/95');
    content = content.replaceAll('bg-zinc-950/60 backdrop-blur-2xl', 'bg-zinc-950/95');
    content = content.replaceAll('bg-zinc-950/40 backdrop-blur-xl', 'bg-zinc-950/90');
    content = content.replaceAll('bg-zinc-950/60 backdrop-blur-xl', 'bg-zinc-950/90');
    content = content.replaceAll('bg-zinc-950/70 backdrop-blur-xl', 'bg-zinc-950/90');
    content = content.replaceAll('bg-zinc-900/70 backdrop-blur-xl', 'bg-zinc-900/90');
    content = content.replaceAll('backdrop-blur-2xl border border-white/20', 'bg-zinc-950/98 border border-zinc-800');
    content = content.replaceAll('backdrop-blur-2xl border border-white/15', 'bg-zinc-950/98 border border-zinc-800');
    content = content.replaceAll('backdrop-blur-2xl border border-white/10', 'bg-zinc-950/98 border border-zinc-800');
    content = content.replaceAll('backdrop-blur-2xl border border-indigo-500/20', 'bg-zinc-900/90 border border-indigo-500/20');
    content = content.replaceAll('backdrop-blur-2xl border border-amber-500/20', 'bg-zinc-900/90 border border-amber-500/20');
    content = content.replaceAll('backdrop-blur-2xl', '');
  }

  // Clean any double spaces in classNames
  content = content.replace(/className=(["'`])(.*?)\1/g, (match, quote, classNames) => {
    const cleaned = classNames.replace(/\s+/g, ' ').trim();
    return `className=${quote}${cleaned}${quote}`;
  });

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changedCount++;
    console.log(`Optimized: ${path.relative(srcDir, file)}`);
  }
});

console.log(`\nCleaned and optimized ${changedCount} files.`);
