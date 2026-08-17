const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(dirPath);
  });
}

function processFiles() {
  const dirs = ['./src/components', './src/features'];
  
  dirs.forEach(dir => {
    walk(dir, function(filePath) {
      if (filePath.endsWith('.tsx') && !filePath.includes('test')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let originalContent = content;

        // Pattern: onChange={(e) => setTotal(Math.max(1, parseInt(e.target.value) || 1))}
        // We want to remove the Math.max(1, ...) and || 1 bounds during typing
        
        // Let's replace parseInt(e.target.value) || X with parseInt(e.target.value) || 0
        // Exception: if it's already || 0, leave it.
        content = content.replace(/parseInt\(e\.target\.value\)\s*\|\|\s*\d+/g, 'parseInt(e.target.value) || 0');

        // Math.max bounds that force it to 1 when empty
        // e.g. Math.max(1, parseInt(...) || 0) -> Math.max(0, parseInt(...) || 0)
        content = content.replace(/Math\.max\([1-9]\d*,\s*(parseInt[^)]+)\)/g, 'Math.max(0, $1)');

        // If the value is value={something}, change to value={something || ''}
        // ONLY for inputs that have type="number"
        let parts = content.split('<input');
        for (let i = 1; i < parts.length; i++) {
          let endIdx = parts[i].indexOf('>');
          if (endIdx === -1) continue;
          
          let tag = parts[i].substring(0, endIdx);
          if (tag.includes('type="number"')) {
            // Find value={...}
            let valMatch = tag.match(/value=\{([^}]+)\}/);
            if (valMatch) {
              let inner = valMatch[1];
              // If it's already got || '' or ? : skip
              if (!inner.includes("|| ''") && !inner.includes("?")) {
                 let newTag = tag.replace(`value={${inner}}`, `value={${inner} === 0 ? '' : ${inner}} placeholder="0"`);
                 parts[i] = newTag + parts[i].substring(endIdx);
              }
            }
          }
        }
        content = parts.join('<input');

        if (content !== originalContent) {
          fs.writeFileSync(filePath, content, 'utf8');
          console.log('Updated ' + filePath);
        }
      }
    });
  });
}

processFiles();
