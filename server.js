const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { Worker } = require('worker_threads');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// =============================
// IN-MEMORY CACHE
// =============================
const API_CACHE = new Map();
const CACHE_TTL_MS = 55000; // 55 detik

const CACHEABLE = new Set([
  'getDashboardData', 'getInitData',
  'getKodeLkhOptions', 'getPemesanOptions',
  'getPeruntukanOptions', 'getLokasiOptions', 'getKeteranganOptions',
  'getNamaTokoOptions', 'getKaryawanPenerimaOptions', 'getDataLuarOptions',
  'getPoDraftsAndSent'
]);

function getCacheKey(lokasiId, method, args) {
  return (lokasiId || 'default') + ':' + method;
}

// Worker pool: max 4 concurrent workers
let activeWorkers = 0;
const MAX_WORKERS = 4;
const workerQueue = [];

function spawnWorker(method, args, lokasiId) {
  return new Promise((resolve, reject) => {
    const run = () => {
      activeWorkers++;
      const worker = new Worker(path.join(__dirname, 'backend', 'apiWorker.js'), {
        workerData: { method, args: args || [], lokasiId }
      });
      worker.on('message', (msg) => {
        activeWorkers--;
        processQueue();
        if (msg.success) resolve(msg.data);
        else reject(new Error(msg.error || 'Worker error'));
      });
      worker.on('error', (err) => {
        activeWorkers--;
        processQueue();
        reject(err);
      });
    };

    if (activeWorkers < MAX_WORKERS) {
      run();
    } else {
      workerQueue.push(run);
    }
  });
}

function processQueue() {
  if (workerQueue.length > 0 && activeWorkers < MAX_WORKERS) {
    const next = workerQueue.shift();
    next();
  }
}

function workerCall(method, args, lokasiId, bypassCache) {
  const cacheKey = getCacheKey(lokasiId, method, args);

  if (!bypassCache && CACHEABLE.has(method)) {
    const cached = API_CACHE.get(cacheKey);
    if (cached && (Date.now() - cached.ts) < CACHE_TTL_MS) {
      return Promise.resolve(cached.data);
    }
  }

  return spawnWorker(method, args, lokasiId).then(data => {
    if (CACHEABLE.has(method)) {
      API_CACHE.set(cacheKey, { data, ts: Date.now() });
    }
    return data;
  });
}

// =============================
// API ROUTE
// =============================
app.post('/api/:method', async (req, res) => {
  const method = req.params.method;
  const args = (req.body && req.body.args) || [];
  const lokasiId = req.body && req.body.lokasiId;

  try {
    const data = await workerCall(method, args, lokasiId, false);
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Route utama
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'po_lokasi.html'));
});

// =============================
// PRE-WARM BACKGROUND (sequential, bukan semua sekaligus)
// =============================
const MASTER_PATH = path.join(__dirname, 'backend', 'master_lokasi.json');

async function preWarmSequential() {
  console.log('[Flash Cache] Pre-warming dimulai...');
  let lokasiIds = ['ALFA'];
  try {
    if (fs.existsSync(MASTER_PATH)) {
      lokasiIds = Object.keys(JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8')));
    }
  } catch(e) {}

  const warmMethods = [
    'getDashboardData', 'getPoDraftsAndSent',
    'getKaryawanPenerimaOptions', 'getKodeLkhOptions',
    'getPemesanOptions', 'getNamaTokoOptions'
  ];

  for (const lokasiId of lokasiIds) {
    for (const method of warmMethods) {
      try {
        await workerCall(method, [], lokasiId, true);
        console.log('[Flash Cache] OK:', lokasiId + ':' + method);
      } catch(e) {
        console.error('[Flash Cache] ERR:', lokasiId + ':' + method, e.message);
      }
    }
  }
  console.log('[Flash Cache] Pre-warm selesai.');
}

// Pre-warm 10 detik setelah start
setTimeout(preWarmSequential, 10000);
// Pre-warm ulang setiap 60 detik
setInterval(preWarmSequential, 60000);

app.listen(PORT, () => {
  console.log('[ODeSy Web] Server running on port ' + PORT + ' | Cache AKTIF | Max workers: ' + MAX_WORKERS);
});
