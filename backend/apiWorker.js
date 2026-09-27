const { parentPort, workerData } = require('worker_threads');
const GasPolyfill = require('./GasPolyfill');

const { google } = require('googleapis');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

try {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oAuth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

  // Initialize Polyfill
  const gas = new GasPolyfill(oAuth2Client);
  
  // Expose Google Apps Script global objects
  global.SpreadsheetApp = gas.SpreadsheetApp;
  global.DriveApp = gas.DriveApp;
  global.Utilities = gas.Utilities;
  global.CacheService = gas.CacheService;
  global.Session = gas.Session;
  global.Logger = { log: console.log };
  
  const { method, args, lokasiId, env } = workerData;
  if (env) Object.assign(process.env, env);
  
  // Load config based on lokasiId
  if (lokasiId) {
    const fs = require('fs');
    const masterPath = require('path').join(__dirname, 'master_lokasi.json');
    if (fs.existsSync(masterPath)) {
      const masterData = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
      const config = masterData[lokasiId];
      if (config) {
        if (config.SS_ID) process.env.SS_ID = config.SS_ID;
        if (config.SS_REKAP_ID) process.env.SS_REKAP_ID = config.SS_REKAP_ID;
        if (config.KARYAWAN_SS_ID) process.env.KARYAWAN_SS_ID = config.KARYAWAN_SS_ID;
        if (config.PO_ID_PREFIX) process.env.PO_ID_PREFIX = config.PO_ID_PREFIX;
        if (config.PO_GROUP_ID) process.env.PO_GROUP_ID = config.PO_GROUP_ID;
        if (config.PO_DRAFT_GROUP_ID) process.env.PO_DRAFT_GROUP_ID = config.PO_DRAFT_GROUP_ID;
        if (config.GUDANG_SHEETS) process.env.GUDANG_SHEETS = JSON.stringify(config.GUDANG_SHEETS);
        if (config.PHOTO_FOLDER_BY_GUDANG) process.env.PHOTO_FOLDER_BY_GUDANG = JSON.stringify(config.PHOTO_FOLDER_BY_GUDANG);
        if (config.PHOTO_FOLDER_NAME_BY_GUDANG) process.env.PHOTO_FOLDER_NAME_BY_GUDANG = JSON.stringify(config.PHOTO_FOLDER_NAME_BY_GUDANG);

        if (config.PASS_MASTER) process.env.PASS_MASTER = config.PASS_MASTER;
        if (config.PASS_KIRIM_PO) process.env.PASS_KIRIM_PO = config.PASS_KIRIM_PO;
        if (config.PASS_INPUT) process.env.PASS_INPUT = config.PASS_INPUT;
        if (config.PDF_FOLDER_ID) process.env.PDF_FOLDER_ID = config.PDF_FOLDER_ID;
        if (config.TEMPLATE_SS_ID) process.env.TEMPLATE_SS_ID = config.TEMPLATE_SS_ID;
        if (config.WAHA_API_KEY) process.env.WAHA_API_KEY = config.WAHA_API_KEY;
      }
    }
  }

  // Load Dashboard Logic (MUST be done AFTER process.env is set)
  const Dashboard = require('./Dashboard');
  
  if (typeof Dashboard[method] !== 'function') {
    throw new Error(`Function ${method} is not defined in Dashboard.js`);
  }
  
  // Execute function synchronously
  const result = Dashboard[method].apply(null, args);
  
  parentPort.postMessage({ success: true, data: result });
} catch (e) {
  parentPort.postMessage({ success: false, error: e.message, stack: e.stack });
}
