const fs = require('fs');
const path = require('path');

function walk(d) {
  let r = [];
  fs.readdirSync(d).forEach(f => {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) r = r.concat(walk(p));
    else if (p.endsWith('.tsx')) r.push(p);
  });
  return r;
}

const files = walk('src');
let count = 0;

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  let orig = c;
  
  // Replace anything between <Modal and > that has className="..."
  c = c.replace(/<Modal([\s\S]*?)className=[\"']([^\"']*)[\"']([\s\S]*?)>/g, (m, p1, p2, p3) => {
    let cl = p2.split(' ').filter(x => !x.startsWith('bg-[#') && !x.startsWith('bg-zinc-') && !x.startsWith('bg-black'));
    if (!cl.includes('glass-panel')) cl.push('glass-panel');
    return '<Modal' + p1 + 'className=\"' + cl.join(' ') + '\"' + p3 + '>';
  });
  
  if (c !== orig) {
    fs.writeFileSync(f, c);
    count++;
    console.log(f);
  }
});
console.log(count);
