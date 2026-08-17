const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

walk('./src', function(filePath) {
  if (filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Replace bg-black/10 with bg-black/60 within backdropClassName
    if (content.match(/backdropClassName=["'][^"']*?bg-black\/10/)) {
      content = content.replace(/(backdropClassName=["'][^"']*?)bg-black\/10/g, '$1bg-black/60');
      modified = true;
    }
    
    // Fix ConfirmDeleteModal explicitly
    if (filePath.includes('ConfirmDeleteModal.tsx')) {
      if (content.includes('backdropClassName="p-4"')) {
        content = content.replace('backdropClassName="p-4"', 'backdropClassName="p-4 bg-black/60 backdrop-blur-sm"');
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated ' + filePath);
    }
  }
});
