const fs = require('fs');
let html = fs.readFileSync('public/Index.html', 'utf8');

function processIncludes(text) {
  return text.replace(/<\?\!=\s*include\(['"]([^'"]+)['"]\);\s*\?>/g, (match, p1) => {
    let filename = p1.replace('Frontend/', '') + '.html';
    try {
      let content = fs.readFileSync('public/' + filename, 'utf8');
      // recursive include for nested includes
      return processIncludes(content);
    } catch (e) {
      return '<!-- ERROR ' + filename + ' -->';
    }
  });
}

html = processIncludes(html);
console.log(html.length);
fs.writeFileSync('public/Index_Rendered.html', html);
