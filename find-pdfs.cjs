const fs = require('fs');
const path = require('path');

function findPdfs(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    if (filePath.includes('node_modules') || filePath.includes('.git') || filePath.includes('dist')) {
      return;
    }
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findPdfs(filePath));
    } else if (filePath.endsWith('.pdf')) {
      results.push(filePath);
    }
  });
  return results;
}

console.log("PDF files found in workspace:", findPdfs("."));
