const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

walk('./src/components', function(filePath) {
  if (filePath.endsWith('.tsx') && filePath.includes('Modal')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Replace zIndex={50} and zIndex={100} with zIndex={999}
    if (content.match(/zIndex=\{50\}/)) {
      content = content.replace(/zIndex=\{50\}/g, 'zIndex={999}');
      modified = true;
    }
    if (content.match(/zIndex=\{100\}/)) {
      content = content.replace(/zIndex=\{100\}/g, 'zIndex={999}');
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated ' + filePath);
    }
  }
});
