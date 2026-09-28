const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

const polyfill = `
<script>
(function() {
  window.google = window.google || {};
  window.google.script = window.google.script || {};
  
  function createRunner(successHandler, failureHandler) {
    return new Proxy({}, {
      get: function(target, prop) {
        if (prop === 'withSuccessHandler') {
          return function(fn) { return createRunner(fn, failureHandler); };
        }
        if (prop === 'withFailureHandler') {
          return function(fn) { return createRunner(successHandler, fn); };
        }
        return function(...args) {
          fetch('/api/' + prop, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ args: args })
          })
          .then(r => r.json())
          .then(res => {
            if (res.ok && successHandler) successHandler(res.data);
            else if (!res.ok && failureHandler) failureHandler(res.error || new Error('API Error'));
          })
          .catch(e => {
            if (failureHandler) failureHandler(e);
            else console.error('API Error:', e);
          });
        };
      }
    });
  }
  
  window.google.script.run = createRunner(null, null);
})();
</script>
`;

for (const file of files) {
  const filePath = path.join(publicDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Hapus polyfill lama jika ada (berjaga-jaga)
  content = content.replace(/<script>\s*\(function\(\)\s*{\s*window\.google =[\s\S]*?<\/script>\s*/g, '');
  
  // Inject polyfill di awal file (atau setelah <head>)
  if (content.includes('<head>')) {
    content = content.replace('<head>', '<head>\n' + polyfill);
  } else {
    content = polyfill + '\n' + content;
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Injected polyfill into', file);
}
