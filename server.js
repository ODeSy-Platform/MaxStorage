const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Worker } = require('worker_threads');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

app.post('/api/:func', (req, res) => {
  if (req.params.func === 'getLogoChunksCount') return res.json({ok: true, data: 0});
  if (req.params.func === 'getLogoChunk') return res.json({ok: true, data: ''});
  const func = req.params.func;
  const { args } = req.body;
  console.log(`[API POST] function: ${func}`);
  const worker = new Worker(path.join(__dirname, 'backend', 'apiWorker.js'));
  
  worker.postMessage({ func, args });
  
  worker.on('message', (msg) => {
    console.log(`[API POST] ${func} success: ${msg.success}`);
    if (msg.success) {
      res.json({ ok: true, data: msg.data });
    } else {
      console.error(`[API POST] ${func} error:`, msg.error);
      res.status(500).json({ ok: false, error: msg.error, stack: msg.stack });
    }
  });
  
  worker.on('error', (err) => {
    console.error(`[API POST] ${func} worker error:`, err);
    res.status(500).json({ ok: false, error: err.message });
  });
});

function processIncludes(text) {
  return text.replace(/<\?\!=\s*include\(['"]([^'"]+)['"]\);\s*\?>/g, (match, p1) => {
    let filename = p1.replace('Frontend/', '') + '.html';
    try {
      let content = fs.readFileSync(path.join(__dirname, 'public', filename), 'utf8');
      return processIncludes(content); // recursive
    } catch (e) {
      console.error('Include error:', e.message);
      return `<!-- Error including ${filename} -->`;
    }
  });
}

app.get('/', (req, res) => {
  let html = fs.readFileSync(path.join(__dirname, 'public', 'Index.html'), 'utf8');
  html = processIncludes(html);

  // Inject variables manually to HTML (these were originally injected by GAS template)
  html = html.replace('<?= appTitle ?>', 'ODeSy - Portal');
  html = html.replace('<?= buildVersion ?>', '1.0.0');
  
  res.send(html);
});

app.listen(PORT, () => {
  console.log(`[ODeSy Portal] Server is running on port ${PORT}`);
});
