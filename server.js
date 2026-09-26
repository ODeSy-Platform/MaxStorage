const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Melayani file statis frontend (HTML, CSS, JS) dari folder public
app.use(express.static(path.join(__dirname, 'public')));

const { Worker } = require('worker_threads');

// Routing API Placeholder
app.post('/api/:method', (req, res) => {
  const method = req.params.method;
  const args = (req.body && req.body.args) || [];
  const lokasiId = req.body && req.body.lokasiId;
  
  const worker = new Worker(path.join(__dirname, 'backend', 'apiWorker.js'), {
    workerData: { method, args, lokasiId }
  });
  
  worker.on('message', (msg) => {
    if (msg.success) {
      res.json({ ok: true, data: msg.data });
    } else {
      res.status(500).json({ ok: false, error: msg.error, stack: msg.stack });
    }
  });
  
  worker.on('error', (err) => {
    res.status(500).json({ ok: false, error: err.message });
  });
});

// Route utama untuk serve aplikasi
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'po_lokasi.html'));
});

// FLASH CACHE BACKGROUND (Pre-warm data gudang)
setInterval(() => {
  const { Worker } = require('worker_threads');
  const path = require('path');
  console.log('[Flash Cache] Memperbarui data gudang di latar belakang...');
  
  const tasks = ['getInitData', 'getPoDraftsAndSent', 'warmUpAllCaches'];
  tasks.forEach(t => {
    new Worker(path.join(__dirname, 'backend', 'apiWorker.js'), {
      workerData: { method: t, args: [], lokasiId: null, env: { BYPASS_CACHE: 'true' } }
    });
  });
}, 30000); // 30 detik

// Menjalankan server
app.listen(PORT, () => {
  console.log(`[ODeSy Web] Server is running on port ${PORT}`);
});
