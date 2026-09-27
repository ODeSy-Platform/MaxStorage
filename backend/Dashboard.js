/***********************
 * SISTEM GUDANG + PO SURABAYA (FULL)
 * - Draft & Terkirim
 * - Filter tanggal & range + kalender tanggal ada data (lingkar merah)
 ***********************/

// ============================================================
// DYNAMIC CONFIG: Dibaca ulang tiap request agar multi-lokasi
// ============================================================
Object.defineProperty(global, 'SS_ID', { get: () => process.env.SS_ID || '18xmQa0cR_yppzl-eEu0rDXhSpIYfeIC7PZH9jnbL4h4', configurable: true, enumerable: true });
Object.defineProperty(global, 'SS_REKAP_ID', { get: () => process.env.SS_REKAP_ID || '1U6waJeIUpEBZq0zmOPsXgwEw-0mkMAXny55w9GCfn5k', configurable: true, enumerable: true });
Object.defineProperty(global, 'KARYAWAN_SS_ID', { get: () => process.env.KARYAWAN_SS_ID || '1T7oXtUeLv-Te4OZE0XRE1lNxnvFV7HzhtyInEGybU4k', configurable: true, enumerable: true });
Object.defineProperty(global, 'GUDANG_SHEETS', { get: () => process.env.GUDANG_SHEETS ? JSON.parse(process.env.GUDANG_SHEETS) : ['Gudang ALFA', 'Gudang BETA', 'Gudang OMEGA', 'Gudang GAMMA'], configurable: true, enumerable: true });
Object.defineProperty(global, 'PHOTO_FOLDER_BY_GUDANG', { get: () => process.env.PHOTO_FOLDER_BY_GUDANG ? JSON.parse(process.env.PHOTO_FOLDER_BY_GUDANG) : { 'Gudang ALFA': '1as2ZCz6tIXCCNmr5VNZvXcGtAYtfT42l', 'Gudang BETA': '14WJUdc0JtfjDEaqqPBhcNPdHJ-PVF1NJ', 'Gudang OMEGA': '1-hCYsK9-QgqdNKJ5mD6Zphe6gf81CbgO', 'Gudang GAMMA': '1gjVciGMLukojQ4EmtyylWIpEvwG5nwwc' }, configurable: true, enumerable: true });
Object.defineProperty(global, 'PHOTO_FOLDER_NAME_BY_GUDANG', { get: () => process.env.PHOTO_FOLDER_NAME_BY_GUDANG ? JSON.parse(process.env.PHOTO_FOLDER_NAME_BY_GUDANG) : { 'Gudang ALFA': 'Gudang Alfa - Maja', 'Gudang BETA': 'Gudang Beta - Maja', 'Gudang OMEGA': 'Gudang Omega - Maja', 'Gudang GAMMA': 'Gudang Gamma - Maja' }, configurable: true, enumerable: true });


const INPUT_SHEETS = {
  masuk: 'INPUT Barang Masuk',
  keluar: 'INPUT Barang Keluar',
  rusak: 'INPUT Barang Rusak',
  hilang: 'INPUT Barang Hilang',
  pinjam: 'INPUT Barang Pinjam',
};

const HEADER_ROW = 9;     // header ada di baris 9
const DATA_ROW_START = 10;

/***************
 * PO SURABAYA - SHEET NAMES
 ***************/
const PO_DRAFT_SHEET       = 'PO_SURABAYA_DRAFT';
const PO_DRAFT_ITEMS_SHEET = 'PO_SURABAYA_DRAFT_ITEMS';
const PO_SENT_SHEET        = 'PO_SURABAYA_SENT';
const PO_SENT_ITEMS_SHEET  = 'PO_SURABAYA_SENT_ITEMS';
const PO_INPUT_LOG_SHEET   = 'PO_SURABAYA_INPUT_LOG';
const PO_LOKASI_SENT_SHEET = 'PO_LOKASI_SENT';
const PO_LOKASI_SENT_ITEMS_SHEET = 'PO_LOKASI_SENT_ITEMS';
const PO_PINJAM_SENT_SHEET = 'PO_PINJAM_SENT';
const PO_PINJAM_SENT_ITEMS_SHEET = 'PO_PINJAM_SENT_ITEMS';
const PO_ID_PREFIX = process.env.PO_ID_PREFIX || 'Maja_PO-SBY_';
const PO_ID_START  = 304;
const WAHA_API_URL = "http://149.28.151.94:3000";
const WAHA_SESSION = "default";
const WAHA_API_KEY = "apikeybaru123";
const PO_GROUP_ID = process.env.PO_GROUP_ID || "120363407049370326@g.us";
const PO_DRAFT_GROUP_ID = process.env.PO_DRAFT_GROUP_ID || "120363423671613991@g.us";
const WAHA_SEND_TEXT_PATH = "/api/sendText";

/** ===== ROUTING PAGES ===== */
function doGet(e) {
  const api = String((e && e.parameter && e.parameter.api) || '');
  if (api === 'qr_barang') {
    const kode = String((e && e.parameter && e.parameter.kode) || '');
    return ContentService
      .createTextOutput(JSON.stringify(getPublicQrBarangData_(kode)))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const page = String((e && e.parameter && e.parameter.page) || 'home');

  const map = {
    home: 'home',
    mutasi: 'po_barang_masuk',
    po_barang_masuk: 'po_barang_masuk',
    barang_keluar: 'po_barang_masuk',
    po_surabaya: 'po_surabaya',
    po_lokasi: 'po_lokasi',
    qr_barang: 'qr_barang'
  };

  const file = map[page] || 'home';
  const t = HtmlService.createTemplateFromFile(file);

  t.BASE_URL = ScriptApp.getService().getUrl();
  t.SS_ID = SS_ID;
  t.QR_CODE = String((e && e.parameter && e.parameter.kode) || '');
  t.BK_OPTIONS = (page === 'mutasi' || page === 'barang_keluar' || page === 'po_barang_masuk')
    ? bkGetDropdownOptions()
    : {pemesan:[], peruntukan:[]};
  const viewportContent = page === 'po_lokasi'
    ? 'width=1920, minimum-scale=0.1, maximum-scale=5, user-scalable=yes, viewport-fit=cover'
    : 'width=device-width, initial-scale=1, minimum-scale=0.25, maximum-scale=5, user-scalable=yes, viewport-fit=cover';
  return t.evaluate()
    .setTitle('Sistem Gudang')
    .addMetaTag('viewport', viewportContent)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** include helper */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/** ===== API UNTUK UI ===== */
function getDashboardData() {
  return getDashboardData_();
}

function getQrBarangDetail(kode) {
  const target = String(kode || '').trim().toUpperCase();
  if (!target) return { ok:false, message:'Kode barang tidak ditemukan.' };

  const item = getDashboardData_().find(row =>
    String(row.kode || '').trim().toUpperCase() === target
  );
  if (!item) return { ok:false, message:'Barang dengan kode ' + target + ' tidak ditemukan.' };

  return { ok:true, item:item };
}

function getPublicQrBarangData_(kode) {
  const result = getQrBarangDetail(kode);
  if (!result || !result.ok) return result;

  const item = result.item || {};
  return {
    ok: true,
    item: {
      kode: String(item.kode || ''),
      nama: String(item.nama || ''),
      stok: item.stok == null ? '' : item.stok,
      sat: String(item.sat || ''),
      rak: String(item.rak || ''),
      gudang: String(item.gudang || ''),
      fotoUrl: String(item.fotoUrl || '')
    }
  };
}

function forceRefreshDashboardData() {
  CacheService.getScriptCache().remove(SS_ID + '_DASH_ITEMS_V1');
  CacheService.getScriptCache().remove(SS_ID + '_ALFA_PHOTO_MAP_V1');
  GUDANG_SHEETS.forEach(sheetName => {
    CacheService.getScriptCache().remove(getPhotoMapCacheKey_(sheetName));
  });
  return { ok:true };
}

function getInitData() {
  return {
    items: getDashboardData_(),
    sheetLinks: getSheetLinks_(),
    serverTime: new Date().toISOString(),
  };
}
function getSheetLinks() {
  return getSheetLinks_();
}

function getKodeLkhOptions() {
  
  try {
    const ss = SpreadsheetApp.openById(KARYAWAN_SS_ID);
    const sh = ss.getSheetByName("Tabel Data Kode Admin");
    if (!sh) return [];

    const lastRow = sh.getLastRow();
    if (lastRow < 2) return [];

    const values = sh.getRange(2, 1, lastRow - 1, 2).getDisplayValues();

    return values
      .map(r => ({
        kode: String(r[0] || "").trim(),
        nama: String(r[1] || "").trim()
      }))
      .filter(x => x.kode && x.kode.indexOf("#VALUE") === -1);
  } catch(e) {
    return [{kode: "Error: " + String(e), nama: ""}];
  }
}

/** ===== CORE DASHBOARD ===== */
function getDashboardData_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(SS_ID + '_DASH_ITEMS_V1');
  if (cached && process.env.BYPASS_CACHE !== 'true') {
    try { return JSON.parse(cached); } catch (e) {}
  }

  const ss = SpreadsheetApp.openById(SS_ID);
  const photoMaps = {};
  let result = [];

  GUDANG_SHEETS.forEach(sheetName => {
    const sh = ss.getSheetByName(sheetName);
    if (!sh) return;
    if (!photoMaps[sheetName]) photoMaps[sheetName] = getPhotoMapByGudang_(sheetName);

    const lastRow = sh.getLastRow();
    const lastCol = sh.getLastColumn();
    if (lastRow < HEADER_ROW) return;

    const numRows = Math.max(1, lastRow - HEADER_ROW + 1);
    const range = sh.getRange(HEADER_ROW, 1, numRows, lastCol);

    const values = range.getValues();
    const display = range.getDisplayValues();
    const formulas = range.getFormulas();

    const headerRow = values[0];
    const map = mapHeader_(headerRow);

    if (map.kode == null || map.nama == null || map.stok == null) return;

    for (let i = 1; i < values.length; i++) {
      const r = values[i];
      const d = display[i];
      const f = formulas[i];

      const kode = String(r[map.kode] || '').trim();
      if (!kode) continue;
      if (kode.toLowerCase().includes('kode')) continue;

      const nama = r[map.nama];
      const stok = toNumberSafe_(r[map.stok]);

      const barcode = (map.barcode != null) ? String(r[map.barcode] || '').trim() : '';
      const sat = (map.sat != null) ? String(r[map.sat] || '').trim() : '';
      const rak = (map.rak != null) ? String(r[map.rak] || '').trim() : '';

      let fotoUrl = (map.foto != null)
        ? extractUrlFromCell_(f[map.foto], d[map.foto])
        : '';

      if (photoMaps[sheetName][kode]) {
        fotoUrl = photoMaps[sheetName][kode];
      }

      result.push({
        gudang: sheetName,
        kode: kode,
        nama: String(nama || ''),
        stok: stok,
        sat: sat,
        rak: rak,
        barcode: barcode,
        fotoUrl: fotoUrl
      });
    }
  });

  safeCachePut_(SS_ID + '_DASH_ITEMS_V1', JSON.stringify(result), 30);
  return result;
}

function getPhotoMapByGudang_(gudang) {
  const cache = CacheService.getScriptCache();
  const cacheKey = getPhotoMapCacheKey_(gudang);
  const cached = cache.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch (e) {}
  }

  const map = {};
  if (!PHOTO_FOLDER_BY_GUDANG[gudang]) return map;

  try {
    const folder = getPhotoFolderByGudang_(gudang);
    const files = folder.getFiles();
    const newest = {};

    while (files.hasNext()) {
      const file = files.next();
      const name = file.getName();
      const m = name.match(/\(([A-Z]+-\d+)\)\.[^.]+$/i);
      if (!m) continue;

      const kode = m[1].toUpperCase();
      const updated = file.getLastUpdated().getTime();
      if (!newest[kode] || updated > newest[kode].updated) {
        newest[kode] = {
          updated: updated,
          url: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1000'
        };
      }
    }

    Object.keys(newest).forEach(kode => {
      map[kode] = newest[kode].url;
    });
  } catch (e) {
    console.error('Gagal membaca folder foto ' + gudang + ': ' + e);
    return map;
  }

  safeCachePut_(cacheKey, JSON.stringify(map), 21600);
  return map;
}

function getAlfaPhotoMap_() {
  return getPhotoMapByGudang_('Gudang ALFA');
}

function getPhotoFolderByGudang_(gudang) {
  const folderId = PHOTO_FOLDER_BY_GUDANG[gudang];
  const folderName = PHOTO_FOLDER_NAME_BY_GUDANG[gudang];

  if (folderId) {
    try {
      return DriveApp.getFolderById(folderId);
    } catch (e) {
      console.warn('Folder foto ' + gudang + ' gagal dibuka via ID, coba nama folder: ' + e);
    }
  }

  if (folderName) {
    const folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) return folders.next();
  }

  throw new Error('Folder foto tidak ditemukan untuk ' + gudang);
}

function getAlfaPhotoFolder_() {
  return getPhotoFolderByGudang_('Gudang ALFA');
}

function getPhotoMapCacheKey_(gudang) {
  return 'PHOTO_MAP_' + String(gudang || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_') + '_V1';
}

function testFolderFotoAlfa() {
  const folder = getAlfaPhotoFolder_();
  const files = folder.getFiles();
  let count = 0;
  let first = '';

  while (files.hasNext()) {
    const f = files.next();
    if (!first) first = f.getName() + ' | ' + f.getId();
    count++;
  }

  Logger.log({
    folderName: folder.getName(),
    folderId: folder.getId(),
    count: count,
    first: first,
  });
}

function testFolderFotoSemuaGudang() {
  const result = {};
  GUDANG_SHEETS.forEach(gudang => {
    try {
      const folder = getPhotoFolderByGudang_(gudang);
      const files = folder.getFiles();
      let count = 0;
      let first = '';

      while (files.hasNext()) {
        const f = files.next();
        if (!first) first = f.getName() + ' | ' + f.getId();
        count++;
      }

      result[gudang] = {
        folderName: folder.getName(),
        folderId: folder.getId(),
        count: count,
        first: first,
      };
    } catch (e) {
      result[gudang] = { error: String(e) };
    }
  });

  Logger.log(result);
  return result;
}

function uploadBarangPhoto_(gudang, kode, nama, photo) {
  if (!photo || !photo.data) return '';

  const folder = getPhotoFolderByGudang_(gudang);
  const mimeType = String(photo.mimeType || 'image/jpeg');
  const ext = getPhotoExtension_(photo.name, mimeType);
  const fileName = sanitizeFileName_(nama + ' (' + kode + ').' + ext);
  const bytes = Utilities.base64Decode(String(photo.data));
  const blob = Utilities.newBlob(bytes, mimeType, fileName);
  const file = folder.createFile(blob);

  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    console.warn('Sharing file foto dilewati: ' + e);
  }

  CacheService.getScriptCache().remove(getPhotoMapCacheKey_(gudang));
  CacheService.getScriptCache().remove(SS_ID + '_DASH_ITEMS_V1');

  return 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1000';
}

function updateBarangPhoto(payload) {
  payload = payload || {};
  const gudang = String(payload.gudang || '').trim();
  const kode = String(payload.kode || '').trim().toUpperCase();
  const nama = String(payload.nama || '').trim();
  const photo = payload.photo || null;

  if (!gudang) return { ok:false, msg:'Gudang kosong' };
  if (!kode) return { ok:false, msg:'Kode kosong' };
  if (!nama) return { ok:false, msg:'Nama kosong' };
  if (!photo || !photo.data) return { ok:false, msg:'Foto kosong' };

  deleteBarangPhotoFiles_(gudang, kode);
  const fotoUrl = uploadBarangPhoto_(gudang, kode, nama, photo);
  return { ok:true, fotoUrl: fotoUrl };
}

function deleteBarangPhoto(payload) {
  payload = payload || {};
  const gudang = String(payload.gudang || '').trim();
  const kode = String(payload.kode || '').trim().toUpperCase();

  if (!gudang) return { ok:false, msg:'Gudang kosong' };
  if (!kode) return { ok:false, msg:'Kode kosong' };

  const count = deleteBarangPhotoFiles_(gudang, kode);
  return { ok:true, count: count };
}

function deleteBarangPhotoFiles_(gudang, kode) {
  const folder = getPhotoFolderByGudang_(gudang);
  const files = folder.getFiles();
  const re = new RegExp('\\(' + kode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\)\\.[^.]+$', 'i');
  let count = 0;

  while (files.hasNext()) {
    const file = files.next();
    if (!re.test(file.getName())) continue;
    file.setTrashed(true);
    count++;
  }

  CacheService.getScriptCache().remove(getPhotoMapCacheKey_(gudang));
  CacheService.getScriptCache().remove(SS_ID + '_DASH_ITEMS_V1');
  return count;
}

function updateBarangDetail(payload) {
  payload = payload || {};
  const oldGudang = String(payload.oldGudang || '').trim();
  const oldKode = String(payload.oldKode || '').trim().toUpperCase();
  const newGudang = String(payload.gudang || '').trim();
  const newKode = String(payload.kode || '').trim().toUpperCase();
  const nama = String(payload.nama || '').trim();
  const sat = String(payload.sat || '').trim();
  const rak = String(payload.rak || '').trim();

  if (!oldGudang || !oldKode) return { ok:false, msg:'Data barang asal kosong' };
  if (!newGudang) return { ok:false, msg:'Gudang kosong' };
  if (!newKode) return { ok:false, msg:'Kode kosong' };
  if (!nama) return { ok:false, msg:'Nama kosong' };
  if (!sat) return { ok:false, msg:'Satuan kosong' };
  if (!rak) return { ok:false, msg:'Rak kosong' };

  const ss = SpreadsheetApp.openById(SS_ID);
  const oldInfo = findGudangRowByKode_(ss, oldGudang, oldKode);
  if (!oldInfo) return { ok:false, msg:'Barang asal tidak ditemukan: ' + oldKode };

  const targetInfo = findGudangRowByKode_(ss, newGudang, newKode);
  if (targetInfo && !(oldGudang === newGudang && targetInfo.row === oldInfo.row)) {
    return { ok:false, msg:'Kode barang sudah ada di ' + newGudang + ': ' + newKode };
  }

  const stok = oldInfo.map.stok != null
    ? oldInfo.sh.getRange(oldInfo.row, oldInfo.map.stok + 1).getValue()
    : 0;

  if (oldGudang === newGudang) {
    writeBarangDetailRow_(oldInfo.sh, oldInfo.row, oldInfo.map, newKode, nama, stok, sat, rak);
    sortAndRefreshGudang_(oldInfo.sh, oldInfo.map, oldInfo.extraMap, newGudang);
  } else {
    const newInfo = prepareInsertGudangRow_(ss, newGudang);
    writeBarangDetailRow_(newInfo.sh, newInfo.row, newInfo.map, newKode, nama, stok, sat, rak);
    oldInfo.sh.deleteRow(oldInfo.row);
    sortAndRefreshGudang_(newInfo.sh, newInfo.map, newInfo.extraMap, newGudang);

    const refreshedOld = ss.getSheetByName(oldGudang);
    if (refreshedOld) {
      const lastCol = refreshedOld.getLastColumn();
      const header = refreshedOld.getRange(HEADER_ROW, 1, 1, lastCol).getValues()[0];
      const oldMap = mapHeader_(header);
      const oldExtraMap = findHeaderIndexesByText_(header);
      sortAndRefreshGudang_(refreshedOld, oldMap, oldExtraMap, oldGudang);
    }
  }

  renameOrMoveBarangPhotos_(oldGudang, oldKode, newGudang, newKode, nama);
  CacheService.getScriptCache().remove(SS_ID + '_DASH_ITEMS_V1');
  CacheService.getScriptCache().remove(getPhotoMapCacheKey_(oldGudang));
  CacheService.getScriptCache().remove(getPhotoMapCacheKey_(newGudang));

  return { ok:true };
}

function checkEditKodeBarang(payload) {
  payload = payload || {};
  const gudang = String(payload.gudang || '').trim();
  const kode = String(payload.kode || '').trim().toUpperCase();
  const oldGudang = String(payload.oldGudang || '').trim();
  const oldKode = String(payload.oldKode || '').trim().toUpperCase();

  if (!gudang) return { ok:false, msg:'Gudang kosong' };
  if (!kode) return { ok:false, msg:'Kode kosong' };

  const ss = SpreadsheetApp.openById(SS_ID);
  const prefix = getGudangPrefix_(gudang);
  if (prefix && !new RegExp('^' + prefix + '-\\d+$', 'i').test(kode)) {
    return {
      ok: false,
      invalidPrefix: true,
      msg: 'Kode ' + gudang + ' harus diawali ' + prefix + '-',
      suggestion: getNextAvailableKodeBarang_(ss, gudang)
    };
  }

  const found = findGudangRowByKode_(ss, gudang, kode);
  const sameItem = found && gudang === oldGudang && kode === oldKode;
  const suggestion = getNextAvailableKodeBarang_(ss, gudang);

  if (found && !sameItem) {
    return {
      ok: false,
      duplicate: true,
      msg: 'Kode sudah ada di ' + gudang + ': ' + kode,
      suggestion: suggestion
    };
  }

  return { ok:true, duplicate:false, suggestion:suggestion };
}

function getNextAvailableKodeBarang_(ss, gudang) {
  const sh = ss.getSheetByName(gudang);
  if (!sh) return '';

  const prefix = getGudangPrefix_(gudang);
  if (!prefix) return '';

  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < HEADER_ROW) return prefix + '-001';

  const header = sh.getRange(HEADER_ROW, 1, 1, lastCol).getValues()[0];
  const map = mapHeader_(header);
  if (map.kode == null) return prefix + '-001';

  const values = sh.getRange(DATA_ROW_START, map.kode + 1, Math.max(1, lastRow - DATA_ROW_START + 1), 1).getDisplayValues().flat();
  const used = new Set();
  const re = new RegExp('^' + prefix + '-(\\d+)$', 'i');

  values.forEach(v => {
    const m = String(v || '').trim().toUpperCase().match(re);
    if (!m) return;
    const n = Number(m[1]);
    if (!isNaN(n) && n > 0) used.add(n);
  });

  let nextNo = 1;
  while (used.has(nextNo)) nextNo++;
  return prefix + '-' + String(nextNo).padStart(3, '0');
}

function findGudangRowByKode_(ss, gudang, kode) {
  const sh = ss.getSheetByName(gudang);
  if (!sh) return null;

  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < HEADER_ROW) return null;

  const header = sh.getRange(HEADER_ROW, 1, 1, lastCol).getValues()[0];
  const map = mapHeader_(header);
  const extraMap = findHeaderIndexesByText_(header);
  if (map.kode == null) return null;

  const values = sh.getRange(DATA_ROW_START, map.kode + 1, Math.max(1, lastRow - DATA_ROW_START + 1), 1).getDisplayValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0] || '').trim().toUpperCase() === kode) {
      return { sh: sh, row: DATA_ROW_START + i, map: map, extraMap: extraMap };
    }
  }
  return null;
}

function prepareInsertGudangRow_(ss, gudang) {
  const sh = ss.getSheetByName(gudang);
  if (!sh) throw new Error('Sheet gudang tidak ditemukan: ' + gudang);

  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  const header = sh.getRange(HEADER_ROW, 1, 1, lastCol).getValues()[0];
  const map = mapHeader_(header);
  const extraMap = findHeaderIndexesByText_(header);
  const lastDataRow = findGudangDataLastRow_(sh, map, gudang);
  const insertRow = Math.max(DATA_ROW_START, lastDataRow + 1);

  sh.insertRowsBefore(insertRow, 1);
  if (lastDataRow >= DATA_ROW_START) {
    sh.getRange(lastDataRow, 1, 1, lastCol).copyTo(
      sh.getRange(insertRow, 1, 1, lastCol),
      SpreadsheetApp.CopyPasteType.PASTE_FORMAT,
      false
    );
  }
  sh.getRange(insertRow, 1, 1, lastCol).clearContent();
  return { sh: sh, row: insertRow, map: map, extraMap: extraMap };
}

function writeBarangDetailRow_(sh, row, map, kode, nama, stok, sat, rak) {
  sh.getRange(row, map.kode + 1).setValue(kode);
  sh.getRange(row, map.nama + 1).setValue(nama);
  if (map.stok != null) sh.getRange(row, map.stok + 1).setValue(stok);
  if (map.sat != null) sh.getRange(row, map.sat + 1).setValue(sat);
  if (map.rak != null) sh.getRange(row, map.rak + 1).setValue(rak);
}

function sortAndRefreshGudang_(sh, map, extraMap, gudang) {
  const lastDataRow = findGudangDataLastRow_(sh, map, gudang);
  if (lastDataRow < DATA_ROW_START) return;

  sh.getRange(DATA_ROW_START, 1, lastDataRow - DATA_ROW_START + 1, sh.getLastColumn())
    .sort([{ column: map.nama + 1, ascending: true }]);
  SpreadsheetApp.flush();
  refreshGudangFormulas_(sh, map, extraMap, gudang);
}

function renameOrMoveBarangPhotos_(oldGudang, oldKode, newGudang, newKode, newNama) {
  try {
    const oldFolder = getPhotoFolderByGudang_(oldGudang);
    const newFolder = getPhotoFolderByGudang_(newGudang);
    const files = oldFolder.getFiles();
    const re = new RegExp('\\(' + oldKode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\)\\.[^.]+$', 'i');

    while (files.hasNext()) {
      const file = files.next();
      if (!re.test(file.getName())) continue;

      const ext = getPhotoExtension_(file.getName(), file.getMimeType());
      const newName = sanitizeFileName_(newNama + ' (' + newKode + ').' + ext);
      if (oldGudang === newGudang) {
        file.setName(newName);
      } else {
        const copied = file.makeCopy(newName, newFolder);
        copied.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        file.setTrashed(true);
      }
    }
  } catch (e) {
    console.warn('Rename/move foto dilewati: ' + e);
  }
}

function getPhotoExtension_(originalName, mimeType) {
  const name = String(originalName || '');
  const m = name.match(/\.([a-z0-9]{2,5})$/i);
  if (m) return m[1].toLowerCase() === 'jpg' ? 'jpeg' : m[1].toLowerCase();

  const mt = String(mimeType || '').toLowerCase();
  if (mt.includes('png')) return 'png';
  if (mt.includes('webp')) return 'webp';
  if (mt.includes('gif')) return 'gif';
  return 'jpeg';
}

function sanitizeFileName_(name) {
  return String(name || 'foto.jpeg')
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function safeCachePut_(key, value, seconds) {
  try {
    CacheService.getScriptCache().put(key, value, seconds);
  } catch (e) {
    console.warn('Cache dilewati untuk ' + key + ': ' + e);
  }
}

function mapHeader_(header) {
  const m = {};
  header.forEach((h, i) => {
    const t = String(h || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .trim();

    if ((t.includes('kode') && t.includes('barang')) || t === 'kode') m.kode = i;
    if ((t.includes('nama') && t.includes('barang')) || t === 'nama') m.nama = i;

    if (
      t === 'stok' ||
      t.startsWith('stok ') ||
      t.includes('stok akhir') ||
      (t.includes('stok') && t.includes('akhir')) ||
      t === 'sisa' ||
      t.startsWith('sisa ') ||
      t.includes('sisa stok')
    ) m.stok = i;

    if (t.startsWith('sat')) m.sat = i;
    if (t.includes('rak')) m.rak = i;
    if (t.includes('barcode')) m.barcode = i;

    if (t === 'foto' || t.includes('foto') || t.includes('gambar') || t.includes('image') || t.includes('pic') || t.includes('photo')) {
      m.foto = i;
    }
  });
  return m;
}

function extractUrlFromCell_(formula, displayValue) {
  if (formula) {
    const m = String(formula).match(/IMAGE\("([^"]+)"\)/i);
    if (m) return m[1];
  }
  const dv = String(displayValue || '');
  const m2 = dv.match(/https?:\/\/[^\s"]+/i);
  return m2 ? m2[0] : '';
}

function toNumberSafe_(v) {
  if (typeof v === 'number') return v;
  const s = String(v || '')
    .replace(/\./g, '')
    .replace(/,/g, '.')
    .replace(/[^\d.-]/g, '');
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

/** ===== TRANSAKSI MUTASI (tetap) ===== */
function transaksiMasuk(data) { return transaksiCore_('masuk', data); }
function transaksiKeluar(data) { return transaksiCore_('keluar', data); }
function transaksiRusak(data) { return transaksiCore_('rusak', data); }
function transaksiHilang(data) { return transaksiCore_('hilang', data); }

function transaksiCore_(type, data) {
  validateTransaksi_(type, data);

  const ss = SpreadsheetApp.openById(SS_ID);
  const shInput = getSheetByNameRobust_(ss, INPUT_SHEETS[type]);
  if (!shInput) throw new Error('Sheet input tidak ditemukan: ' + INPUT_SHEETS[type]);

  shInput.appendRow([
    new Date(),
    data.kode,
    data.nama,
    Number(data.jumlah),
    data.gudang,
    data.ket || ''
  ]);

  const delta = Number(data.jumlah) * (type === 'masuk' ? 1 : -1);
  updateStokGudang_(data.gudang, data.kode, delta);

  CacheService.getScriptCache().remove(SS_ID + '_DASH_ITEMS_V1');
  return true;
}

function validateTransaksi_(type, data) {
  if (!data) throw new Error('Data kosong');
  if (!data.kode) throw new Error('Kode wajib');
  if (!data.gudang) throw new Error('Gudang wajib');
  const j = Number(data.jumlah);
  if (!j || j <= 0) throw new Error('Jumlah harus > 0');
  if (!INPUT_SHEETS[type]) throw new Error('Tipe transaksi tidak dikenal: ' + type);
}

function updateStokGudang_(sheetName, kodeBarang, delta) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sh = ss.getSheetByName(sheetName);
  if (!sh) throw new Error('Sheet gudang tidak ditemukan: ' + sheetName);

  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < HEADER_ROW) throw new Error('Header tidak ditemukan di gudang: ' + sheetName);

  const values = sh.getRange(HEADER_ROW, 1, lastRow - HEADER_ROW + 1, lastCol).getValues();
  const header = values[0];
  const map = mapHeader_(header);

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (String(row[map.kode]).trim() === String(kodeBarang).trim()) {
      const rowNumber = HEADER_ROW + i;

      const stokLama = toNumberSafe_(row[map.stok]);
      const stokBaru = stokLama + Number(delta);

      sh.getRange(rowNumber, map.stok + 1).setValue(stokBaru);
      return true;
    }
  }
  throw new Error('Kode barang tidak ditemukan di gudang: ' + kodeBarang);
}

/** ===== LINK SHEET BUTTON ===== */
function getSheetLinks_() {
  const ss = SpreadsheetApp.openById(SS_ID);

  const makeUrl = (sheetName) => {
    const sh = ss.getSheetByName(sheetName);
    if (!sh) return '';
    return ss.getUrl() + '#gid=' + sh.getSheetId();
  };

  return {
    inputMasuk: makeUrl(INPUT_SHEETS.masuk),
    inputKeluar: makeUrl(INPUT_SHEETS.keluar),
    inputRusak: makeUrl(INPUT_SHEETS.rusak),
    inputHilang: makeUrl(INPUT_SHEETS.hilang),
    gudangAlfa: makeUrl('Gudang ALFA'),
    gudangBeta: makeUrl('Gudang BETA'),
    gudangOmega: makeUrl('Gudang OMEGA'),
    gudangGamma: makeUrl('Gudang GAMMA'),
  };
}

function getGudangPrefix_(gudang){
  const map = {
    "Gudang ALFA": "A",
    "Gudang BETA": "B",
    "Gudang OMEGA": "O",
    "Gudang GAMMA": "G"
  };
  return map[gudang] || "";
}

function findGudangDataLastRow_(sh, map, gudang){
  const lastRow = sh.getLastRow();
  if (lastRow < DATA_ROW_START) return DATA_ROW_START - 1;

  const prefix = getGudangPrefix_(gudang);
  if (!prefix) return DATA_ROW_START - 1;

  const numRows = lastRow - DATA_ROW_START + 1;
  const kodeValues = sh.getRange(DATA_ROW_START, map.kode + 1, numRows, 1).getDisplayValues().flat();

  const re = new RegExp("^" + prefix + "-\\d+$", "i");
  let lastDataRow = DATA_ROW_START - 1;

  for (let i = 0; i < kodeValues.length; i++) {
    const kode = String(kodeValues[i] || "").trim();
    if (re.test(kode)) {
      lastDataRow = DATA_ROW_START + i;
    }
  }

  return lastDataRow;
}

function findHeaderIndexesByText_(header){
  const result = {
    qr: null
  };

  header.forEach((h, i) => {
    const t = String(h || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

    if (t === "qr" || t.includes("qr")) {
      result.qr = i;
    }
  });

  return result;
}
/* =========================================================
 * PO SURABAYA (SERVER)
 * ========================================================= */

function ensurePoSheets_() {
  const ss = SpreadsheetApp.openById(SS_ID);

  const make = (name, headers) => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);

    if (sh.getLastRow() < 1) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
      sh.setFrozenRows(1);
    } else {
      const currentHeaders = sh.getRange(1, 1, 1, headers.length).getValues()[0];
      const same = headers.every((h, i) => String(currentHeaders[i] || "").trim() === h);

      if (!same) {
        sh.getRange(1, 1, 1, headers.length).setValues([headers]);
        sh.setFrozenRows(1);
      }
    }

    return sh;
  };

  make(PO_DRAFT_SHEET,       ['ID', 'NAMA', 'TS', 'ITEM_COUNT', 'PO_KIND']);
  make(PO_DRAFT_ITEMS_SHEET, [
  'ID', 'PEMESAN', 'KODE', 'KODE_LKH', 'NAMA', 'QTY',
  'SAT', 'MASUK_HR', 'PERUNTUKAN', 'KETERANGAN', 'HARGA'
]);
  make(PO_SENT_SHEET,        ['ID', 'NAMA', 'TS', 'ITEM_COUNT']);
 make(PO_SENT_ITEMS_SHEET, [
  'ID', 'PEMESAN', 'KODE', 'KODE_LKH', 'NAMA', 'QTY',
  'SAT', 'MASUK_HR', 'PERUNTUKAN', 'KETERANGAN', 'HARGA'
]);
  make(PO_INPUT_LOG_SHEET,   ['SENT_ID', 'TANGGAL_MASUK', 'KODE', 'NAMA', 'QTY_INPUT', 'SAT', 'TS_INPUT']);
}

function generatePoCustomId_(){
  ensurePoSheets_();

  const ss = SpreadsheetApp.openById(SS_ID);
  const heads = [];

  const shSent = ss.getSheetByName(PO_SENT_SHEET);

if (shSent && shSent.getLastRow() >= 2) {
  heads.push(...shSent.getRange(2, 1, shSent.getLastRow() - 1, 1).getValues().flat());
}

  let maxNo = PO_ID_START - 1;

  heads.forEach(v => {
    const s = String(v || '').trim();
    if (!s.startsWith(PO_ID_PREFIX)) return;

    const numPart = s.substring(PO_ID_PREFIX.length);
    const n = Number(numPart);

    if (!isNaN(n) && n > maxNo) {
      maxNo = n;
    }
  });

  const nextNo = maxNo + 1;
  return PO_ID_PREFIX + String(nextNo).padStart(4, '0');
}

function getPoDraftsAndSent() {
  ensurePoSheets_();
  const ss = SpreadsheetApp.openById(SS_ID);

  const drafts = readPoHead_(ss, PO_DRAFT_SHEET);
  const sent   = readPoHead_(ss, PO_SENT_SHEET);
  const locationSent = readPoHead_(ss, PO_LOKASI_SENT_SHEET);
  const pinjamSent = readPoHead_(ss, PO_PINJAM_SENT_SHEET);

  drafts.sort((a,b)=> b.tsMs - a.tsMs);
  sent.sort((a,b)=> b.tsMs - a.tsMs);
  locationSent.sort((a,b)=> b.tsMs - a.tsMs);
  pinjamSent.sort((a,b)=> b.tsMs - a.tsMs);

  return {
    drafts: drafts.map(x=>({
      id: x.id,
      name: x.name,
      itemCount: x.itemCount,
      ts: x.ts,
      poKind: x.poKind
    })),
    locationSent: locationSent.map(x => {
      const locationItems = readPoItems_(ss, PO_LOKASI_SENT_ITEMS_SHEET, String(x.id));
      const inputMap = getPoInputSummary_(ss, String(x.id));
      const qtyTotal = locationItems.reduce((sum, item) => sum + Number(item.qty || 0), 0);
      const qtyInput = locationItems.reduce((sum, item) => {
        const qty = Number(item.qty || 0);
        const masuk = Number(inputMap[String(item.kode || '').trim()] || 0);
        return sum + Math.min(qty, masuk);
      }, 0);
      return {
        id:x.id,
        name:x.name,
        itemCount:x.itemCount,
        ts:x.ts,
        qtyTotal:qtyTotal,
        qtyInput:qtyInput,
        inputDone:qtyTotal > 0 && qtyInput >= qtyTotal,
        hasCancel:locationItems.some(it => String(it.keterangan || '').toLowerCase().includes('cancel'))
      };
    }),
    pinjamSent: pinjamSent.map(x => {
      const pinjamItems = readPoItems_(ss, PO_PINJAM_SENT_ITEMS_SHEET, String(x.id));
      const inputMap = getPoInputSummary_(ss, String(x.id));
      const qtyTotal = pinjamItems.reduce((sum, item) => sum + Number(item.qty || 0), 0);
      const qtyInput = pinjamItems.reduce((sum, item) => {
        const qty = Number(item.qty || 0);
        const masuk = Number(inputMap[String(item.kode || '').trim()] || 0);
        return sum + Math.min(qty, masuk);
      }, 0);
      return {
        id:x.id,
        name:x.name,
        itemCount:x.itemCount,
        ts:x.ts,
        qtyTotal:qtyTotal,
        qtyInput:qtyInput,
        inputDone:qtyTotal > 0 && qtyInput >= qtyTotal,
        hasCancel:pinjamItems.some(it => String(it.keterangan || '').toLowerCase().includes('cancel'))
      };
    }),
    sent: sent.map(x=>{
      // Check if all items have been fully received
      const sentItems = readPoItems_(ss, PO_SENT_ITEMS_SHEET, String(x.id));
      const inputMap  = getPoInputSummary_(ss, String(x.id));
      const inputDone = sentItems.length > 0 && sentItems.every(it => {
        const kode = String(it.kode || '').trim();
        const qtyPo = Number(it.qty || 0);
        const sudahMasuk = Number(inputMap[kode] || 0);
        return sudahMasuk >= qtyPo;
      });
      const hasCancel = sentItems.some(it =>
        String(it.keterangan || "").trim().toLowerCase().includes("cancel")
      );
      const qtyTotal = sentItems.reduce((sum, item) => sum + Number(item.qty || 0), 0);
      const qtyInput = sentItems.reduce((sum, item) => {
        const qty = Number(item.qty || 0);
        const masuk = Number(inputMap[String(item.kode || '').trim()] || 0);
        return sum + Math.min(qty, masuk);
      }, 0);
      return {
        id: x.id,
        name: x.name,
        itemCount: x.itemCount,
        ts: x.ts,
        qtyTotal:qtyTotal,
        qtyInput:qtyInput,
        inputDone: inputDone,
        hasCancel: hasCancel
      };
    })
  };
}

function saveDraftPo(payload) {
  // khusus draft: bisa NEW atau EDIT
  return saveDraftPoCore_(payload);
}

function sendPo(payload) {
  // kalau kirim dari mode EDIT draft => pindahkan draft ke terkirim dan hapus draftnya
  return sendPoMoveDraft_(payload);
}

/**
 * Jalur khusus PO Lokasi. Data tidak diteruskan ke sheet/WhatsApp PO
 * Surabaya; rekapnya masuk ke sheet "PO Lokasi".
 */
function sendPoLokasi(payload) {
  payload = payload || {};
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!items.length) return { ok:false, msg:'Item kosong' };
  const mode = String(payload.mode || 'NONE');
  const draftId = String(payload.draftId || '').trim();

  const poKind = String(payload.poKind || "LOKASI").toUpperCase();
  const isPinjam = poKind === "PINJAM";
  const headSheetName = isPinjam ? PO_PINJAM_SENT_SHEET : PO_LOKASI_SENT_SHEET;
  const itemsSheetName = isPinjam ? PO_PINJAM_SENT_ITEMS_SHEET : PO_LOKASI_SENT_ITEMS_SHEET;

  const ss = SpreadsheetApp.openById(SS_ID);
  let shHead = ss.getSheetByName(headSheetName);
  let shItems = ss.getSheetByName(itemsSheetName);

  if (!shHead) {
    shHead = ss.insertSheet(headSheetName);
    shHead.getRange(1, 1, 1, 4).setValues([['SENT_ID', 'NAMA', 'TS', 'ITEM_COUNT']]);
    shHead.setFrozenRows(1);
  }
  if (!shItems) {
    shItems = ss.insertSheet(itemsSheetName);
    shItems.getRange(1, 1, 1, 11).setValues([[
      'SENT_ID', 'PEMESAN', 'KODE', 'KODE_LKH', 'NAMA',
      'QTY', 'SAT', 'MASUK_HR', 'PERUNTUKAN', 'KETERANGAN', 'HARGA'
    ]]);
    shItems.setFrozenRows(1);
  }
  shItems.getRange(1, 11).setValue('HARGA');

  const now = payload.clientTs ? new Date(Number(payload.clientTs)) : new Date();
  const tz = Session.getScriptTimeZone() || 'Asia/Makassar';
  const sentId = generatePoLokasiId_(poKind);
  const tsDisplay = Utilities.formatDate(now, tz, 'yyyy-MM-dd HH:mm:ss');
  
  const titlePrefix = poKind === "PINJAM" ? "PO Pinjam" : "PO Lokasi";
  const monthNames = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  const dateText = `${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`;
  const timeText = Utilities.formatDate(now, tz, 'HH:mm');
  const todayKey = Utilities.formatDate(now, tz, "yyyy-MM-dd");

  let maxN = 0;
  const last = shHead.getLastRow();
  if (last >= 2) {
    const rows = shHead.getRange(2, 2, last - 1, 2).getDisplayValues();
    rows.forEach(row => {
      const rowName = String(row[0] || "").trim();
      const rowTs = String(row[1] || "").trim();
      if (!rowTs.startsWith(todayKey)) return;
      
      const regex = new RegExp(`^${titlePrefix}\\s*(\\d+)\\s*:`, "i");
      const m = rowName.match(regex);
      if (m) maxN = Math.max(maxN, Number(m[1] || 0));
    });
  }
  const n = maxN + 1;
  const name = `${titlePrefix} ${n} : ${dateText} (${timeText})`;

  shHead.appendRow([sentId, name, tsDisplay, items.length]);
  const rows = items.map(it => ([
    sentId,
    String(it.pemesan || '').trim(),
    String(it.kode || '').trim(),
    String(it.kodeLkh || '').trim(),
    String(it.nama || '').trim(),
    Number(it.qty || 1),
    String(it.sat || '').trim(),
    String(it.masukHr || '').trim(),
    String(it.peruntukan || '').trim(),
    String(it.keterangan || '').trim(),
    Number(it.harga || 0)
  ]));
  shItems.getRange(shItems.getLastRow() + 1, 1, rows.length, 11).setValues(rows);
  applyBanding_(shHead, 4);
  applyBanding_(shItems, 11);

  // Jika dikirim dari draft, draft tersebut dipindahkan seperti alur biasa.
  if (mode === 'EDIT' && draftId) {
    const shDraftHead = ss.getSheetByName(PO_DRAFT_SHEET);
    const shDraftItem = ss.getSheetByName(PO_DRAFT_ITEMS_SHEET);
    if (shDraftHead && shDraftItem) {
      deleteItemsById_(shDraftItem, draftId);
      deleteHeadById_(shDraftHead, draftId);
      applyBanding_(shDraftHead, 4);
      applyBanding_(shDraftItem, 10);
    }
  }

  // Rekap eksternal: struktur dan rumus sama dengan PO Sby, tujuan PO Lokasi.
  try {
    
    const ssRekap = SpreadsheetApp.openById(SS_REKAP_ID);
    const rekapSheetName = isPinjam ? 'PO Pinjam' : 'PO Lokasi';
    const shRekap = ssRekap.getSheetByName(rekapSheetName);
    if (!shRekap) throw new Error('Sheet ' + rekapSheetName + ' tidak ditemukan');

    const startRow = Math.max(6, shRekap.getLastRow() + 1);
    const bulan = Utilities.formatDate(now, tz, 'MMMM');
    const tahun = Utilities.formatDate(now, tz, 'yyyy');
    const tglPO = Utilities.formatDate(now, tz, 'dd-MMM-yyyy');
    const tglInput = Utilities.formatDate(now, tz, 'd-MMM-yyyy HH:mm');
    const day = now.getDate();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const laporan = day <= 10
      ? `01-10 ${bulan} ${tahun}`
      : day <= 20
        ? `11-20 ${bulan} ${tahun}`
        : `21-${lastDay} ${bulan} ${tahun}`;
    // Ambil nomor numerik terakhir saja. Nilai error lama seperti #NUM! diabaikan.
    const existingNo = startRow > 6
      ? shRekap.getRange(6, 1, startRow - 6, 1).getDisplayValues().flat()
      : [];
    const previousNo = existingNo.reduce((max, value) => {
      const number = Number(String(value || '').replace(/[^0-9.-]/g, ''));
      return Number.isFinite(number) ? Math.max(max, number) : max;
    }, 0);

    const values = items.map((it, index) => {
      const barang = findBarangByKode_(it.kode);
      const sat = barang ? String(barang.sat || '') : '';
      const uraian = String(it.keterangan || '').trim()
        ? `${it.nama || ''}/${it.keterangan || ''}`.trim()
        : String(it.nama || '');
      return [
        previousNo + index + 1, bulan, laporan, tglInput, sentId,
        String(it.pemesan || '-'), String(it.kodeLkh || ''), uraian,
        Number(it.qty || 0), String(it.sat || sat || ''), tglPO,
        String(it.masukHr || ''), '', '', '', '', ''
      ];
    });

    shRekap.getRange(startRow, 1, values.length, 17).setValues(values);
    const totalDataRows = shRekap.getLastRow() - 5;
    shRekap.getRange(6, 1, totalDataRows, 1)
      .setValues(Array.from({ length: totalDataRows }, (_, index) => [index + 1]));
    normalizePoLokasiIds_(shRekap);
    // Isi tabel memakai tulisan normal; bold hanya untuk judul/header.
    shRekap.getRange(6, 1, totalDataRows, 17)
      .setFontWeight('normal')
      .setFontColor('#000000');
    for (let i = 0; i < values.length; i++) {
      const row = startRow + i;
      shRekap.getRange(row, 15).setFormula(`=I${row}-N${row}`);
      shRekap.getRange(row, 16).setFormula(`=MAX(0,N${row}-I${row})`);
      shRekap.getRange(row, 17).setFormula(
        `=IF(AND(ISNUMBER(M${row}),M${row}<>""), "(" & IF(M${row}-(K${row}+L${row})=0,"H", IF(M${row}-(K${row}+L${row})>0,"+"&(M${row}-(K${row}+L${row})),M${row}-(K${row}+L${row}))) & ")", "(" & IF(TODAY()-(K${row}+L${row})=0,"H", IF(TODAY()-(K${row}+L${row})>0,"+"&(TODAY()-(K${row}+L${row})),TODAY()-(K${row}+L${row}))) & ")")`
      );
    }
  } catch (err) {
    // Jangan laporkan sukses jika tujuan utama PO Lokasi gagal ditulis.
    return { ok:false, msg:'Gagal menulis ke sheet PO Lokasi: ' + String(err && err.message ? err.message : err) };
  }

  SpreadsheetApp.flush();

  return { ok:true, id:sentId, name:name, wa:{ ok:true, skipped:true, lokasi:true } };
}

function generatePoLokasiId_(poKind) {
  
  const isPinjam = String(poKind || '').toUpperCase() === 'PINJAM';
  const sheetName = isPinjam ? 'PO Pinjam' : 'PO Lokasi';
  const prefix = isPinjam ? 'Maja_PO-PJM_' : 'Maja_PO-LOK_';
  const regex = isPinjam ? /^MAJA_PO-PJM_\d+$/ : /^MAJA_PO-LOK_\d+$/;

  const sh = SpreadsheetApp.openById(SS_REKAP_ID).getSheetByName(sheetName);
  if (!sh) throw new Error('Sheet ' + sheetName + ' tidak ditemukan');

  const lastRow = sh.getLastRow();
  const ids = lastRow >= 6
    ? sh.getRange(6, 5, lastRow - 5, 1).getDisplayValues().flat()
    : [];
  const uniqueIds = new Set(
    ids.map(value => String(value || '').trim().toUpperCase())
      .filter(value => regex.test(value))
  );
  return prefix + String(uniqueIds.size + 1).padStart(3, '0');
}

function normalizePoLokasiIds_(sh) {
  const lastRow = sh.getLastRow();
  if (lastRow < 6) return;
  const range = sh.getRange(6, 5, lastRow - 5, 1);
  const values = range.getDisplayValues();
  const idMap = {};
  let sequence = 0;
  values.forEach(row => {
    const oldId = String(row[0] || '').trim();
    if (!/^MAJA_PO-LOK_\d+$/i.test(oldId)) return;
    const key = oldId.toUpperCase();
    if (!idMap[key]) {
      sequence += 1;
      idMap[key] = 'Maja_PO-LOK_' + String(sequence).padStart(3, '0');
    }
    row[0] = idMap[key];
  });
  range.setValues(values).setFontColor('#000000').setFontWeight('normal');
}

function repairPoLokasiRekap() {
  
  const sh = SpreadsheetApp.openById(SS_REKAP_ID).getSheetByName('PO Lokasi');
  if (!sh) throw new Error('Sheet PO Lokasi tidak ditemukan');
  normalizePoLokasiIds_(sh);
  if (sh.getLastRow() >= 6) {
    sh.getRange(6, 1, sh.getLastRow() - 5, 17)
      .setFontColor('#000000')
      .setFontWeight('normal');
  }
  SpreadsheetApp.flush();
  return { ok:true, rows:Math.max(0, sh.getLastRow() - 5) };
}

function sendPoMoveDraft_(payload){
  ensurePoSheets_();

  payload = payload || {};
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!items.length) return { ok:false, msg:"Item kosong" };

  const mode    = String(payload.mode || "NONE");
  const draftId = String(payload.draftId || "").trim();

  const ss = SpreadsheetApp.openById(SS_ID);

  const shSentHead = ss.getSheetByName(PO_SENT_SHEET);
  const shSentItem = ss.getSheetByName(PO_SENT_ITEMS_SHEET);
  if (!shSentHead || !shSentItem) return { ok:false, msg:"Sheet TERKIRIM belum ada" };

  const now = payload.clientTs ? new Date(Number(payload.clientTs)) : new Date();
  const tz  = Session.getScriptTimeZone() || "Asia/Jakarta";

  const sentId = generatePoCustomId_();
  const tsDisplay = Utilities.formatDate(now, tz, "yyyy-MM-dd HH:mm:ss");
  const name      = makePoLabel_(shSentHead, now, tz);

  // 1) simpan head terkirim
  shSentHead.appendRow([sentId, name, tsDisplay, items.length]);

  // 2) simpan item terkirim
  const rows = items.map(it => ([
  sentId,
  String(it.pemesan || '').trim(),
  String(it.kode || '').trim(),
  String(it.kodeLkh || '').trim(),
  String(it.nama || '').trim(),
  Number(it.qty || 1),
  String(it.sat || '').trim(),
  String(it.masukHr || '').trim(),
  String(it.peruntukan || '').trim(),
  String(it.keterangan || '').trim(),
  Number(it.harga || 0)
]));

shSentItem.getRange(shSentItem.getLastRow()+1, 1, rows.length, 11).setValues(rows);

  applyBanding_(shSentHead, 4);
  applyBanding_(shSentItem, 11);

  // 3) kalau dari draft edit, hapus draft asal
  if (mode === "EDIT") {
    if (!draftId) return { ok:false, msg:"Mode EDIT tapi draftId kosong" };

    const shDraftHead = ss.getSheetByName(PO_DRAFT_SHEET);
    const shDraftItem = ss.getSheetByName(PO_DRAFT_ITEMS_SHEET);
    if (!shDraftHead || !shDraftItem) return { ok:false, msg:"Sheet DRAFT tidak ditemukan" };

    deleteItemsById_(shDraftItem, draftId);
    deleteHeadById_(shDraftHead, draftId);

    applyBanding_(shDraftHead, 4);
    applyBanding_(shDraftItem, 10);
  }

  SpreadsheetApp.flush();

  // 4) kirim ke grup WA
  let waResult = { ok:false, skipped:true };
  try {
    const pesan = formatPoWhatsappMessage_(sentId, name, items);
    waResult = sendWahaGroupMessage_(PO_GROUP_ID, pesan);
  } catch (err) {
    waResult = {
      ok: false,
      error: String(err && err.message ? err.message : err)
    };
    Logger.log("WA kirim gagal: " + waResult.error);
  }

// ===== KIRIM KE REKAP PO (SPREADSHEET LAIN) =====
try {
  
  const ssRekap = SpreadsheetApp.openById(SS_REKAP_ID);
  const shRekap = ssRekap.getSheetByName("PO Sby");

  if (shRekap) {

    const startRow = shRekap.getLastRow() + 1;

    const now = new Date();
    const tz = Session.getScriptTimeZone();
    const tglPO = Utilities.formatDate(now, tz, "dd-MMM-yyyy");

    items.forEach((it, i) => {

      const barang = findBarangByKode_(it.kode);
      const sat = barang ? String(barang.sat || "") : "";

      const row = startRow + i;

const noSebelumnya = Number(shRekap.getRange(row - 1, 1).getValue() || 0);
const noBaru = noSebelumnya + 1;

const tglInput = Utilities.formatDate(now, tz, "d-MMM-yyyy HH:mm");
const bulan = Utilities.formatDate(now, tz, "MMMM");
const tahun = Utilities.formatDate(now, tz, "yyyy");

const day = now.getDate();
const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

let laporan = "";
if (day <= 10) {
  laporan = `01-10 ${bulan} ${tahun}`;
} else if (day <= 20) {
  laporan = `11-20 ${bulan} ${tahun}`;
} else {
  laporan = `21-${lastDay} ${bulan} ${tahun}`;
}

shRekap.getRange(row, 1).setValue(noBaru);                         // A NO
shRekap.getRange(row, 2).setValue(bulan);                          // B BULAN
shRekap.getRange(row, 3).setValue(laporan);                        // C LAPORAN
shRekap.getRange(row, 4).setValue(tglInput);                       // D TGL + JAM
shRekap.getRange(row, 5).setValue(sentId);                         // E NO LHK
shRekap.getRange(row, 6).setValue(it.pemesan || "-");
shRekap.getRange(row, 7).setValue(it.kodeLkh || "");               // G KODE
const uraianRekap = String(it.keterangan || "").trim()
  ? `${it.nama || ""}/${it.keterangan || ""}`.trim()
  : (it.nama || "");

shRekap.getRange(row, 8).setValue(uraianRekap); // H URAIAN
shRekap.getRange(row, 9).setValue(it.qty || 0);                    // I JUMLAH
shRekap.getRange(row, 10).setValue(it.sat || sat || "");           // J SAT
shRekap.getRange(row, 11).setValue(tglPO);                         // K TGL PO
// L = PERMINTAAN MASUK (hr)
shRekap.getRange(row, 12).setValue(it.masukHr || "");

// O, P, Q = KEKURANGAN, KELEBIHAN, DEVIASI TERLAMBAT (set formula secara eksplisit)
const formulaO = `=I${row}-N${row}`;
const formulaP = `=MAX(0,N${row}-I${row})`;
const formulaQ = `=IF(AND(ISNUMBER(M${row}),M${row}<>""), "(" & IF(M${row}-(K${row}+L${row})=0,"H", IF(M${row}-(K${row}+L${row})>0,"+"&(M${row}-(K${row}+L${row})),M${row}-(K${row}+L${row}))) & ")", "(" & IF(TODAY()-(K${row}+L${row})=0,"H", IF(TODAY()-(K${row}+L${row})>0,"+"&(TODAY()-(K${row}+L${row})),TODAY()-(K${row}+L${row}))) & ")")`;

shRekap.getRange(row, 15).setFormula(formulaO);
shRekap.getRange(row, 16).setFormula(formulaP);
shRekap.getRange(row, 17).setFormula(formulaQ);
    });

  }

} catch (err) {
  Logger.log("Gagal kirim ke REKAP PO: " + err);
}

  return {
    ok:true,
    id: sentId,
    name,
    wa: waResult
  };
}

function saveDraftPoCore_(payload){
  ensurePoSheets_();

  payload = payload || {};
  const mode = String(payload.mode || "NONE");  // "NEW" | "EDIT"
  const draftId = String(payload.draftId || "").trim();
  const share = !!payload.share;
  const poKind = String(payload.poKind || 'SURABAYA').toUpperCase() === 'LOKASI' ? 'LOKASI' : (String(payload.poKind || '').toUpperCase() === 'PINJAM' ? 'PINJAM' : 'SURABAYA');

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    return { ok:false, msg:'Item kosong' };
  }

  const ss = SpreadsheetApp.openById(SS_ID);
  const shHead = ss.getSheetByName(PO_DRAFT_SHEET);
  const shItem = ss.getSheetByName(PO_DRAFT_ITEMS_SHEET);
  if (!shHead || !shItem) return { ok:false, msg:'Sheet PO Draft belum dibuat' };

  const tz = Session.getScriptTimeZone() || 'Asia/Jakarta';
  const now = (payload.clientTs) ? new Date(Number(payload.clientTs)) : new Date();
  const tsDisplay = Utilities.formatDate(now, tz, 'yyyy-MM-dd HH:mm:ss');

  // =========================
  // MODE EDIT: update draft lama
  // =========================
  if (mode === "EDIT") {
    if (!draftId) return { ok:false, msg:"Mode EDIT tapi draftId kosong" };

    const last = shHead.getLastRow();
    if (last < 2) return { ok:false, msg:"Draft tidak ditemukan (sheet masih kosong)" };

    const ids = shHead.getRange(2, 1, last-1, 1).getValues().flat().map(String);
    const idx = ids.findIndex(x => String(x).trim() === draftId);
    if (idx < 0) return { ok:false, msg:"Draft tidak ditemukan untuk id: " + draftId };

    const row = idx + 2;

    const oldName = String(shHead.getRange(row, 2).getValue() || "").trim();
    const mPrefix = oldName.match(/^(PO-\d+)\s*:/i);
    const prefixPart = mPrefix ? mPrefix[1] : "PO-1";
    
    const dateText = Utilities.formatDate(now, tz, 'd MMMM yyyy');
    const timeText = Utilities.formatDate(now, tz, 'HH:mm');
    const newName = `${prefixPart} : ${dateText} (${timeText})`;
    
    const itemCount = payload.items.length;

    // update head (B newName, C tsDisplay, D itemCount)
    shHead.getRange(row, 2, 1, 3).setValues([[
      newName,
      tsDisplay,
      itemCount
    ]]);
    shHead.getRange(row, 5).setValue(poKind);

    // replace items
    deleteItemsById_(shItem, draftId);

    const rows = payload.items.map(it => ([
  draftId,
  String(it.pemesan || '').trim(),
  String(it.kode || '').trim(),
  String(it.kodeLkh || '').trim(),
  String(it.nama || '').trim(),
  Number(it.qty || 1),
  String(it.sat || '').trim(),
  String(it.masukHr || '').trim(),
  String(it.peruntukan || '').trim(),
  String(it.keterangan || '').trim(),
  Number(it.harga || 0)
]));

shItem.getRange(shItem.getLastRow()+1, 1, rows.length, 11).setValues(rows);
    applyBanding_(shHead, 5);
    applyBanding_(shItem, 11);

    let waDraft = { ok:false, skipped:true };
    if (share) {
      try {
        const pesan = formatPoDraftWhatsappMessage_(draftId, newName, payload.items);
        waDraft = sendWahaGroupMessage_(PO_DRAFT_GROUP_ID, pesan);
      } catch (err) {
        waDraft = { ok:false, error:String(err && err.message ? err.message : err) };
        Logger.log("WA draft gagal: " + waDraft.error);
      }
    }

    return { ok:true, id:draftId, name: newName, msg:"Draft ter-update", wa: waDraft };
  }

  // =========================
  // MODE NEW: bikin draft baru
  // =========================
  if (mode === "NEW") {
    const draftId = Utilities.getUuid().replace(/-/g,'').slice(0, 12); // ID internal draft
    const name = makePoLabel_(shHead, now, tz);
    const itemCount = payload.items.length;

    // simpan ID internal tetap di kolom A draft head
    shHead.appendRow([draftId, name, tsDisplay, itemCount, poKind]);

    const rows = payload.items.map(it => ([
      draftId,
      String(it.pemesan || '').trim(),
      String(it.kode || '').trim(),
      String(it.kodeLkh || '').trim(),
      String(it.nama || '').trim(),
      Number(it.qty || 1),
      String(it.sat || '').trim(),
      String(it.masukHr || '').trim(),
      String(it.peruntukan || '').trim(),
      String(it.keterangan || '').trim(),
      Number(it.harga || 0)
    ]));

    shItem.getRange(shItem.getLastRow()+1, 1, rows.length, 11).setValues(rows);

    applyBanding_(shHead, 5);
    applyBanding_(shItem, 11);

    let waDraft = { ok:false, skipped:true };
    if (share) {
      try {
        const pesan = formatPoDraftWhatsappMessage_(draftId, name, payload.items);
        waDraft = sendWahaGroupMessage_(PO_DRAFT_GROUP_ID, pesan);
      } catch (err) {
        waDraft = { ok:false, error:String(err && err.message ? err.message : err) };
        Logger.log("WA draft gagal: " + waDraft.error);
      }
    }

    return { ok:true, id:draftId, name, wa: waDraft };
  }

  return { ok:false, msg:"Mode draft tidak valid: " + mode };
}
  // hapus semua rows items dengan ID tertentu (loop dari bawah biar aman)
function deleteItemsById_(shItem, id){
  const last = shItem.getLastRow();
  if (last < 2) return;

  const vals = shItem.getRange(2, 1, last-1, 1).getValues().flat().map(String);
  for (let i = vals.length - 1; i >= 0; i--) {
    if (String(vals[i]).trim().toLowerCase() === String(id).trim().toLowerCase()) {
      shItem.deleteRow(i + 2);
    }
  }
}

function getDraftItems(draftId) {
  ensurePoSheets_();
  const ss = SpreadsheetApp.openById(SS_ID);
  return { items: readPoItems_(ss, PO_DRAFT_ITEMS_SHEET, String(draftId)) };
}
function getSentItems(sentId) {
  ensurePoSheets_();
  const ss = SpreadsheetApp.openById(SS_ID);

  const items = readPoItems_(ss, PO_SENT_ITEMS_SHEET, String(sentId));
  const inputMap = getPoInputSummary_(ss, String(sentId));

  const enriched = items.map(it => {
    const key = String(it.kode || '').trim();
    const sudahMasuk = Number(inputMap[key] || 0);
    const qtyPo = Number(it.qty || 0);
    const qtySisa = Math.max(0, qtyPo - sudahMasuk);

    const barang = findBarangByKode_(key);

    return {
      pemesan: String(it.pemesan || ''),
      kode: key,
      kodeLkh: String(it.kodeLkh || ''),
      nama: String(it.nama || ''),
      qty: qtyPo,
      sat: barang ? String(barang.sat || '') : '',
      qtyMasuk: sudahMasuk,
      qtySisa: qtySisa,
      masukHr: String(it.masukHr || '0'),
      peruntukan: String(it.peruntukan || ''),
      keterangan: String(it.keterangan || ''),
      harga: Number(it.harga || 0)
    };
  });

  return { items: enriched };
}

function getLocationSentItems(sentId) {
  ensurePoSheets_();
  const ss = SpreadsheetApp.openById(SS_ID);
  const items = readPoItems_(ss, PO_LOKASI_SENT_ITEMS_SHEET, String(sentId));
  const inputMap = getPoInputSummary_(ss, String(sentId));
  return {
    items:items.map(it => {
      const key = String(it.kode || '').trim();
      const sudahMasuk = Number(inputMap[key] || 0);
      const qtyPo = Number(it.qty || 0);
      const barang = findBarangByKode_(key);
      return {
        pemesan:String(it.pemesan || ''),
        kode:key,
        kodeLkh:String(it.kodeLkh || ''),
        nama:String(it.nama || ''),
        qty:qtyPo,
        sat:barang ? String(barang.sat || '') : String(it.sat || ''),
        qtyMasuk:sudahMasuk,
        qtySisa:Math.max(0, qtyPo - sudahMasuk),
        masukHr:String(it.masukHr || '0'),
        peruntukan:String(it.peruntukan || ''),
        keterangan:String(it.keterangan || ''),
        harga:Number(it.harga || 0)
      };
    })
  };
}

function savePoCore_(mode, payload){
  ensurePoSheets_();

  if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
    return { ok:false, msg:'Item kosong' };
  }

  const ss = SpreadsheetApp.openById(SS_ID);
  const headSheetName = (mode === 'draft') ? PO_DRAFT_SHEET : PO_SENT_SHEET;
  const itemSheetName = (mode === 'draft') ? PO_DRAFT_ITEMS_SHEET : PO_SENT_ITEMS_SHEET;

  const shHead = ss.getSheetByName(headSheetName);
  const shItem = ss.getSheetByName(itemSheetName);
  if (!shHead || !shItem) return { ok:false, msg:'Sheet PO belum dibuat' };

  // pakai jam laptop jika ada
  const now = (payload && payload.clientTs) ? new Date(Number(payload.clientTs)) : new Date();

  // timezone: ikut Script Project Timezone
  const tz = Session.getScriptTimeZone() || 'Asia/Jakarta';

  // ID pendek biar enak dilihat
  const id = Utilities.getUuid().replace(/-/g,'').slice(0, 12);

  // TS string + label pakai "now" yang sama => jam pasti sama
  const tsDisplay = Utilities.formatDate(now, tz, 'yyyy-MM-dd HH:mm:ss');
  const name = makePoLabel_(shHead, now, tz);

  // SIMPAN HEAD (HANYA SEKALI)  ✅ FIX DUPLIKAT
  shHead.appendRow([id, name, tsDisplay, payload.items.length]);

  // SIMPAN ITEMS
  const rows = payload.items.map(it => ([
    id,
    String(it.kode || '').trim(),
    String(it.nama || '').trim(),
    Number(it.qty || 1)
  ]));
  shItem.getRange(shItem.getLastRow()+1, 1, rows.length, 4).setValues(rows);

  // rapikan banding (warna selang-seling)
  applyBanding_(shHead, 4);
  applyBanding_(shItem, 4);

  return { ok:true, id, name };
}

function readPoHead_(ss, sheetName){
  const sh = ss.getSheetByName(sheetName);
  if (!sh) return [];
  const last = sh.getLastRow();
  if (last < 2) return [];

  const vals = sh.getRange(2, 1, last - 1, 5).getValues();

  const MONTHS = {
    january: 0,
    february: 1,
    march: 2,
    april: 3,
    may: 4,
    june: 5,
    july: 6,
    august: 7,
    september: 8,
    october: 9,
    november: 10,
    december: 11
  };

  return vals.map(r => {
    const id = String(r[0] || "").trim();
    const name = String(r[1] || "").trim();
    const rawTs = r[2];
    const itemCount = Number(r[3] || 0);
    const rawPoKind = String(r[4] || '').trim().toUpperCase();
    const poKind = rawPoKind === 'LOKASI' ? 'LOKASI' : (rawPoKind === 'PINJAM' ? 'PINJAM' : (rawPoKind === 'SURABAYA' ? 'SURABAYA' : ''));

    let ts = "";
    let tsMs = 0;

    // ==================================================
    // 1) PRIORITAS: PARSE DARI NAMA
    // contoh:
    // PO-4 : 5 March 2026 (20:11)
    // ==================================================
    const mName = name.match(/^PO-\d+\s*:\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\s*\((\d{2}):(\d{2})\)$/i);
    if (mName) {
      const dd = Number(mName[1]);
      const monName = String(mName[2] || "").toLowerCase();
      const yy = Number(mName[3]);
      const hh = Number(mName[4]);
      const mi = Number(mName[5]);

      const mm = MONTHS[monName];
      if (mm !== undefined) {
        const d = new Date(yy, mm, dd, hh, mi, 0, 0);
        tsMs = d.getTime();

        const yyyy = String(yy);
        const month2 = String(mm + 1).padStart(2, "0");
        const day2 = String(dd).padStart(2, "0");
        const hh2 = String(hh).padStart(2, "0");
        const mi2 = String(mi).padStart(2, "0");

        ts = `${yyyy}-${month2}-${day2} ${hh2}:${mi2}:00`;
        return { id, name, itemCount, ts, tsMs, poKind };
      }
    }

    // ==================================================
    // 2) FALLBACK: PARSE DARI KOLOM TS
    // ==================================================
    if (rawTs instanceof Date) {
      const d = rawTs;
      tsMs = d.getTime();

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const mi = String(d.getMinutes()).padStart(2, "0");
      const ss2 = String(d.getSeconds()).padStart(2, "0");

      ts = `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss2}`;
      return { id, name, itemCount, ts, tsMs, poKind };
    }

    const s = String(rawTs || "").trim();

    // format: yyyy-MM-dd HH:mm:ss
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
    if (m) {
      const d = new Date(
        Number(m[1]),
        Number(m[2]) - 1,
        Number(m[3]),
        Number(m[4]),
        Number(m[5]),
        Number(m[6])
      );
      tsMs = d.getTime();
      ts = s;
      return { id, name, itemCount, ts, tsMs, poKind };
    }

    // format: dd/MM/yyyy HH:mm:ss atau MM/dd/yyyy HH:mm:ss
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (m) {
      // anggap format lokal: dd/MM/yyyy
      const d = new Date(
        Number(m[3]),
        Number(m[2]) - 1,
        Number(m[1]),
        Number(m[4]),
        Number(m[5]),
        Number(m[6] || 0)
      );
      tsMs = d.getTime();

      const yyyy = String(d.getFullYear());
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const mi = String(d.getMinutes()).padStart(2, "0");
      const ss2 = String(d.getSeconds()).padStart(2, "0");

      ts = `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss2}`;
      return { id, name, itemCount, ts, tsMs, poKind };
    }

    // fallback terakhir
    const d = new Date(s);
    tsMs = isNaN(d) ? 0 : d.getTime();

    if (!isNaN(d)) {
      const yyyy = String(d.getFullYear());
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const mi = String(d.getMinutes()).padStart(2, "0");
      const ss2 = String(d.getSeconds()).padStart(2, "0");

      ts = `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss2}`;
    } else {
      ts = "";
    }

    return { id, name, itemCount, ts, tsMs, poKind };
  });
}

function buildSatMap_(){
  const ss = SpreadsheetApp.openById(SS_ID);
  const satMap = {};

  GUDANG_SHEETS.forEach(sheetName => {
    const sh = ss.getSheetByName(sheetName);
    if (!sh) return;

    const lastRow = sh.getLastRow();
    const lastCol = sh.getLastColumn();
    if (lastRow < HEADER_ROW) return;

    const values = sh.getRange(HEADER_ROW, 1, lastRow - HEADER_ROW + 1, lastCol).getValues();
    const header = values[0];
    const map = mapHeader_(header);

    if (map.kode == null) return;

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const kode = String(row[map.kode] || "").trim();
      if (!kode) continue;

      const sat = map.sat != null ? String(row[map.sat] || "").trim() : "";
      if (!satMap[kode]) satMap[kode] = sat;
    }
  });

  return satMap;
}

function readPoItems_(ss, itemSheetName, headId){
  const sh = ss.getSheetByName(itemSheetName);
  if (!sh) return [];

  const last = sh.getLastRow();
  if (last < 2) return [];

  const lastCol = sh.getLastColumn();
  const vals = sh.getRange(2, 1, last - 1, lastCol).getValues();
  const satMap = buildSatMap_();

  return vals
    .filter(r => String(r[0]).trim() === String(headId).trim())
    .map(r => {

      const colB = String(r[1] || '').trim();
      const colC = String(r[2] || '').trim();
      const colD = String(r[3] || '').trim();
      const colE = String(r[4] || '').trim();
      const colF = String(r[5] || '').trim();

      // FORMAT BARU:
      // A ID | B PEMESAN | C KODE | D KODE_LKH | E NAMA | F QTY
      const isFormatBaru = colC && colC.includes("-") && colF !== "";

      if (isFormatBaru) {
        const kode = colC;

        return {
          pemesan: colB,
          kode: kode,
          kodeLkh: colD,
          nama: colE,
          qty: Number(r[5] || 1),
          sat: String(r[6] || '') || satMap[kode] || '',
          masukHr: String(r[7] || ''),
          peruntukan: String(r[8] || ''),
          keterangan: String(r[9] || ''),
          harga: Number(r[10] || 0)
        };
      }

      // FORMAT LAMA:
      // A ID | B KODE | C KODE_LKH | D NAMA | E QTY
      const kode = colB;

      return {
        pemesan: '',
        kode: kode,
        po_barang_masuk: {
          file: "po_barang_masuk",
          module: "gudang"
        },  kodeLkh: colC,
        nama: colD,
        qty: Number(colE || 1),
        sat: satMap[kode] || '',
        masukHr: '',
        peruntukan: '',
        keterangan: '',
        harga: 0
      };
    });
}

function getPoInputSummary_(ss, sentId){
  const sh = ss.getSheetByName(PO_INPUT_LOG_SHEET);
  if (!sh) return {};

  const last = sh.getLastRow();
  if (last < 2) return {};

  const vals = sh.getRange(2, 1, last - 1, 7).getValues();
  const map = {};

  vals.forEach(r => {
    const rowSentId = String(r[0] || '').trim();
    const kode = String(r[2] || '').trim();
    const qtyInput = Number(r[4] || 0);

    if (rowSentId !== String(sentId).trim()) return;
    if (!kode) return;

    map[kode] = Number(map[kode] || 0) + qtyInput;
  });

  return map;
}

function getPoInputHistory(sentId, poKind){
  ensurePoSheets_();
  const cleanId = String(sentId || '').trim();
  const kind = String(poKind || '').toUpperCase() === 'LOKASI' ? 'LOKASI' : (String(poKind || '').toUpperCase() === 'PINJAM' ? 'PINJAM' : 'SURABAYA');
  if (!cleanId) return { ok:false, msg:'PO belum dipilih', rows:[] };

  const ss = SpreadsheetApp.openById(SS_ID);
  const shLog = ss.getSheetByName(PO_INPUT_LOG_SHEET);
  const itemSheet = kind === 'LOKASI' ? PO_LOKASI_SENT_ITEMS_SHEET : (kind === 'PINJAM' ? PO_PINJAM_SENT_ITEMS_SHEET : PO_SENT_ITEMS_SHEET);
  const poItems = readPoItems_(ss, itemSheet, cleanId);
  if (!shLog || shLog.getLastRow() < 2) return { ok:true, rows:[] };

  const tz = Session.getScriptTimeZone() || 'Asia/Makassar';
  const values = shLog.getRange(2, 1, shLog.getLastRow() - 1, 7).getValues();
  const rows = [];
  values.forEach((row, index) => {
    if (String(row[0] || '').trim() !== cleanId) return;
    const kode = String(row[2] || '').trim();
    const poItem = poItems.find(item => String(item.kode || '').trim() === kode);
    rows.push({
      logRow:index + 2,
      sentId:cleanId,
      tanggal:row[1] instanceof Date
        ? Utilities.formatDate(row[1], tz, 'd MMMM yyyy')
        : String(row[1] || ''),
      kode:kode,
      nama:String(row[3] || ''),
      qty:Number(row[4] || 0),
      sat:String(row[5] || ''),
      waktu:row[6] instanceof Date
        ? Utilities.formatDate(row[6], tz, 'd MMMM yyyy (HH:mm)')
        : String(row[6] || ''),
      qtyPo:Number(poItem ? poItem.qty || 0 : 0)
    });
  });
  return { ok:true, rows:rows };
}

function correctPoInputTransaction(payload){
  ensurePoSheets_();
  payload = payload || {};
  const password = String(payload.password || '');
  const sentId = String(payload.sentId || '').trim();
  const kind = String(payload.poKind || '').toUpperCase() === 'LOKASI' ? 'LOKASI' : (String(payload.poKind || '').toUpperCase() === 'PINJAM' ? 'PINJAM' : 'SURABAYA');
  const logRow = Number(payload.logRow || 0);
  const newQty = Number(payload.newQty || 0);
  const reason = String(payload.reason || '').trim();
  if (password !== 'msf.003') return { ok:false, msg:'Password koreksi salah' };
  if (!sentId || logRow < 2) return { ok:false, msg:'Transaksi koreksi tidak valid' };
  if (!Number.isFinite(newQty) || newQty <= 0) return { ok:false, msg:'Jumlah baru harus lebih dari 0' };
  if (!reason) return { ok:false, msg:'Alasan koreksi wajib diisi' };

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const ss = SpreadsheetApp.openById(SS_ID);
    const shLog = ss.getSheetByName(PO_INPUT_LOG_SHEET);
    const shInput = getSheetByNameRobust_(ss, INPUT_SHEETS.masuk);
    if (!shLog || logRow > shLog.getLastRow()) return { ok:false, msg:'Riwayat input tidak ditemukan' };
    if (!shInput) return { ok:false, msg:'Sheet INPUT Barang Masuk tidak ditemukan' };

    const logValues = shLog.getRange(logRow, 1, 1, 7).getValues()[0];
    if (String(logValues[0] || '').trim() !== sentId) return { ok:false, msg:'Riwayat bukan milik PO yang dipilih' };
    const kode = String(logValues[2] || '').trim();
    const nama = String(logValues[3] || '').trim();
    const oldQty = Number(logValues[4] || 0);
    const itemSheet = kind === 'LOKASI' ? PO_LOKASI_SENT_ITEMS_SHEET : (kind === 'PINJAM' ? PO_PINJAM_SENT_ITEMS_SHEET : PO_SENT_ITEMS_SHEET);
    const poItems = readPoItems_(ss, itemSheet, sentId);
    const poItem = poItems.find(item => String(item.kode || '').trim() === kode);
    if (!poItem) return { ok:false, msg:'Barang tidak ditemukan pada PO' };

    const currentTotal = Number(getPoInputSummary_(ss, sentId)[kode] || 0);
    const correctedTotal = currentTotal - oldQty + newQty;
    if (correctedTotal > Number(poItem.qty || 0)) {
      return { ok:false, msg:`Hasil koreksi melebihi QTY PO. Maksimal total ${Number(poItem.qty || 0)}.` };
    }

    // Tentukan transaksi keberapa untuk PO+kode ini, lalu cocokkan dengan
    // urutan baris pada sheet INPUT Barang Masuk.
    const allLog = shLog.getRange(2, 1, shLog.getLastRow() - 1, 7).getValues();
    let occurrence = 0;
    for (let i = 0; i <= logRow - 2; i++) {
      if (String(allLog[i][0] || '').trim() === sentId && String(allLog[i][2] || '').trim() === kode) occurrence++;
    }
    const inputLast = shInput.getLastRow();
    let inputRow = 0;
    if (inputLast >= 7) {
      const inputValues = shInput.getRange(7, 3, inputLast - 6, 4).getDisplayValues(); // C:F
      let found = 0;
      inputValues.forEach((row, index) => {
        if (String(row[0] || '').trim() === kode && String(row[1] || '').trim() === `PO ${sentId}`) {
          found++;
          if (found === occurrence) inputRow = index + 7;
        }
      });
    }
    if (!inputRow) return { ok:false, msg:'Baris transaksi Barang Masuk tidak ditemukan' };

    shInput.getRange(inputRow, 6).setValue(newQty);
    shLog.getRange(logRow, 5).setValue(newQty);

    const barang = findBarangByKode_(kode);
    const delta = newQty - oldQty;
    if (barang && barang.gudang && delta) updateStokGudang_(String(barang.gudang), kode, delta);

    const auditName = 'PO_INPUT_CORRECTION_LOG';
    let audit = ss.getSheetByName(auditName);
    if (!audit) {
      audit = ss.insertSheet(auditName);
      audit.appendRow(['TS_KOREKSI','SENT_ID','JENIS_PO','KODE','NAMA','QTY_LAMA','QTY_BARU','SELISIH','ALASAN','LOG_ROW','INPUT_ROW']);
      audit.setFrozenRows(1);
    }
    audit.appendRow([new Date(), sentId, kind, kode, nama, oldQty, newQty, delta, reason, logRow, inputRow]);
    audit.getRange(audit.getLastRow(), 1).setNumberFormat('dd-mmm-yyyy (HH:mm)');

    // Perbarui transaksi yang sama di rekap, lalu hitung ulang sisa berantai.
    const rekapId = '1U6waJeIUpEBZq0zmOPsXgwEw-0mkMAXny55w9GCfn5k';
    const rekapName = kind === 'LOKASI' ? 'PO Lokasi' : (kind === 'PINJAM' ? 'PO Pinjam' : 'PO Sby');
    const shRekap = SpreadsheetApp.openById(rekapId).getSheetByName(rekapName);
    if (shRekap && shRekap.getLastRow() >= 6) {
      const rekapValues = shRekap.getRange(6, 5, shRekap.getLastRow() - 5, 10).getDisplayValues(); // E:N
      const matches = [];
      rekapValues.forEach((row, index) => {
        const rowId = String(row[0] || '').trim();
        const rowNama = String(row[3] || '').split('/')[0].trim().toLowerCase();
        if (rowId === sentId && rowNama === nama.toLowerCase()) matches.push(index + 6);
      });
      if (matches[occurrence - 1]) shRekap.getRange(matches[occurrence - 1], 14).setValue(newQty);
      if (matches.length) {
        let remaining = Number(poItem.qty || 0);
        matches.forEach(rowNumber => {
          shRekap.getRange(rowNumber, 9).setValue(remaining);
          const received = Number(shRekap.getRange(rowNumber, 14).getValue() || 0);
          shRekap.getRange(rowNumber, 15).setFormula(`=I${rowNumber}-N${rowNumber}`);
          shRekap.getRange(rowNumber, 16).setFormula(`=MAX(0,N${rowNumber}-I${rowNumber})`);
          remaining = Math.max(0, remaining - received);
        });
      }
    }

    CacheService.getScriptCache().remove(SS_ID + '_DASH_ITEMS_V1');
    SpreadsheetApp.flush();
    return { ok:true, oldQty:oldQty, newQty:newQty, total:correctedTotal };
  } finally {
    lock.releaseLock();
  }
}

function findBarangByKode_(kode){
  const data = getDashboardData_();
  return data.find(x => String(x.kode || '').trim() === String(kode || '').trim()) || null;
}

function uploadFotosPenerimaan_(photos, noPenerimaan, tanggalText){
  photos = Array.isArray(photos) ? photos.filter(photo => photo && photo.data) : [];
  if (!photos.length) throw new Error("Foto penerimaan wajib diisi.");

  const bulan = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const rawTanggal = String(tanggalText || "").trim();
  let namaTanggal = rawTanggal;
  const dmy = rawTanggal.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  const ymd = rawTanggal.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (dmy) {
    namaTanggal = `${Number(dmy[1])} ${bulan[Number(dmy[2]) - 1]} ${dmy[3]}`;
  } else if (ymd) {
    namaTanggal = `${Number(ymd[3])} ${bulan[Number(ymd[2]) - 1]} ${ymd[1]}`;
  }

  const parentFolder = DriveApp.getFolderById("18tohhExRUjF93H-b5zV3jSrCN5mWcoua");
  const nomorFolder = String(noPenerimaan || "Tanpa No Penerimaan").trim();
  const folderName = `${nomorFolder} / ${namaTanggal}`;
  const existingFolders = parentFolder.getFoldersByName(folderName);
  const folder = existingFolders.hasNext() ? existingFolders.next() : parentFolder.createFolder(folderName);

  return photos.map((photo, index) => {
    const mimeType = String(photo.mimeType || "image/jpeg");
    const ext = getPhotoExtension_(photo.name, mimeType);
    const fileName = `Foto ${String(index + 1).padStart(2, "0")} - ${namaTanggal}.${ext}`;
    const bytes = Utilities.base64Decode(String(photo.data));
    const blob = Utilities.newBlob(bytes, mimeType, fileName);
    return folder.createFile(blob).getId();
  });
}

function getPenerimaanPeriod_(dateValue){
  let date = dateValue instanceof Date ? new Date(dateValue) : null;
  const text = String(dateValue || "").trim();
  const ymd = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const dmy = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (ymd) date = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
  if (dmy) date = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  if (!date || isNaN(date.getTime())) date = new Date();

  const romans = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];
  return {
    month:date.getMonth() + 1,
    year:date.getFullYear(),
    roman:romans[date.getMonth()]
  };
}

function getPenerimaanSequence_(value, period, rowDate, poKind){
  const text = String(value || "").trim();
  const modern = text.match(/^MAJA\/PO-(SBY|LOK)\/PB\/([IVX]+)\/(\d{4})\/(\d+)$/i);
  if (modern) {
    const expectedKind = String(poKind || 'SURABAYA').toUpperCase() === 'LOKASI' ? 'Lok' : (String(poKind || '').toUpperCase() === 'PINJAM' ? 'PJM' : 'SBY');
    return modern[1].toUpperCase() === expectedKind &&
      modern[2].toUpperCase() === period.roman &&
      Number(modern[3]) === period.year ? Number(modern[4]) : 0;
  }
  return 0;
}

function inputSentToBarangMasuk(payload){
  ensurePoSheets_();

  payload = payload || {};
  const password = String(payload.password || "");
  const sentId = String(payload.sentId || '').trim();
  const tanggal = String(payload.tanggal || '').trim();
  const items = Array.isArray(payload.items) ? payload.items : [];
  const poKind = String(payload.poKind || 'SURABAYA').toUpperCase() === 'LOKASI' ? 'LOKASI' : (String(payload.poKind || '').toUpperCase() === 'PINJAM' ? 'PINJAM' : 'SURABAYA');

  const noPenerimaan = String(payload.noPenerimaan || "").trim();
  const noSuratJalan = String(payload.noSuratJalan || "").trim();
  const nopolKendaraan = String(payload.nopolKendaraan || "").trim();
  const tglPenerimaan = String(payload.tglPenerimaan || "").trim();
  const namaPengirim = String(payload.namaPengirim || "").trim();
  const noKaryawan = String(payload.noKaryawan || "").trim();
  const noHpPengirim = String(payload.noHpPengirim || "").trim();
  const namaKaryawan = String(payload.namaKaryawan || "").trim();

  if (password !== "msf.003") return { ok:false, msg:'Password input salah' };
  if (!sentId) return { ok:false, msg:'sentId kosong' };
  if (!tanggal) return { ok:false, msg:'tanggal kosong' };
  if (!items.length) return { ok:false, msg:'item kosong' };

  const wajibIsi = [
    [noPenerimaan, "No. Penerimaan"],
    [noSuratJalan, poKind === 'LOKASI' ? "Nama Toko" : "No. Surat Jalan"],
    [nopolKendaraan, "Nopol Kendaraan"],
    [tglPenerimaan, "Tanggal Penerimaan"],
    [namaPengirim, "Nama Pengirim"],
    [noKaryawan, "ID Karyawan"],
    [noHpPengirim, "No. HP Pengirim"],
    [namaKaryawan, "Nama Karyawan/Penerima"]
  ];
  const belumTerisi = wajibIsi.find(x => !x[0]);
  if (belumTerisi) {
    return { ok:false, msg:belumTerisi[1] + ' belum diisi' };
  }
  const penerimaValid = getKaryawanPenerimaOptions().some(item =>
    String(item.nama || "").trim().toLowerCase() === namaKaryawan.toLowerCase() &&
    String(item.id || "").trim().toLowerCase() === noKaryawan.toLowerCase()
  );
  if (!penerimaValid) {
    return { ok:false, msg:"Nama penerima dan ID Karyawan tidak cocok dengan database." };
  }

  // Simpan bukti foto sebelum transaksi stok dijalankan agar kegagalan upload
  // tidak menghasilkan transaksi barang masuk tanpa foto yang dipilih.
  uploadFotosPenerimaan_(
    payload.photos || [],
    noPenerimaan,
    tglPenerimaan || tanggal
  );

  const ss = SpreadsheetApp.openById(SS_ID);
  const shInput = getSheetByNameRobust_(ss, INPUT_SHEETS.masuk);
  const shLog = ss.getSheetByName(PO_INPUT_LOG_SHEET);

  if (!shInput) return { ok:false, msg:'Sheet INPUT Barang tidak ditemukan' };
  if (!shLog) return { ok:false, msg:'Sheet PO log tidak ditemukan' };

  const sentItems = readPoItems_(ss, pokind === 'LOKASI' ? PO_LOKASI_SENT_ITEMS_SHEET : (kind === 'PINJAM' ? PO_PINJAM_SENT_ITEMS_SHEET : PO_SENT_ITEMS_SHEET), sentId);
  if (!sentItems.length) return { ok:false, msg:'Data PO terkirim tidak ditemukan' };

  const summary = getPoInputSummary_(ss, sentId);
  const now = new Date();

  const START_ROW = 7;
  const CHECK_COLS = 9;   // A:I
  const TEMPLATE_ROW = 7;

  // cari baris input pertama
  const maxRow = Math.max(shInput.getLastRow(), START_ROW);
  const numRows = Math.max(1, maxRow - START_ROW + 1);
  const existing = shInput.getRange(START_ROW, 1, numRows, CHECK_COLS).getDisplayValues();

  let targetRow = START_ROW;
  for (let i = existing.length - 1; i >= 0; i--) {
    const hasData = existing[i].some(v => String(v).trim() !== "");
    if (hasData) {
      targetRow = START_ROW + i + 1;
      break;
    }
  }

  // GENERATE NO PENERIMAAN AUTOMATICALLY
  let lastPenNo = 0;
  const penerimaanPeriod = getPenerimaanPeriod_(tanggal);
  const lastRowTemp = shInput.getLastRow();
  if (lastRowTemp >= 7) {
    const penRows = shInput.getRange(7, 2, lastRowTemp - 6, 10).getValues(); // B:K
    penRows.forEach(row => {
      lastPenNo = Math.max(
        lastPenNo,
        getPenerimaanSequence_(row[9], penerimaanPeriod, row[0], poKind)
      );
    });
  }
  const nextPenNo = lastPenNo + 1;
  const autoNoPenerimaan =
    `Maja/PO-${poKind === 'LOKASI' ? 'Lok' : 'Sby'}/PB/${penerimaanPeriod.roman}/${penerimaanPeriod.year}/` +
    String(nextPenNo).padStart(3, "0");

  const rowsInput = [];
  const rowsLog = [];

  items.forEach(it => {
    const kode = String(it.kode || '').trim();
    const nama = String(it.nama || '').trim();
    const qtyMasuk = Number(it.qtyMasuk || 0);

    if (!kode || qtyMasuk <= 0) return;

    const poItem = sentItems.find(x => String(x.kode || '').trim() === kode);
    if (!poItem) return;

    const qtyPo = Number(poItem.qty || 0);
    const sudahMasuk = Number(summary[kode] || 0);
    const sisa = qtyPo - sudahMasuk;

    if (qtyMasuk > sisa) {
      throw new Error(`Qty masuk melebihi sisa untuk kode ${kode}. Sisa: ${sisa}`);
    }

    const barang = findBarangByKode_(kode);
    const gudang = barang ? String(barang.gudang || '') : '';
    const sat = barang ? String(barang.sat || '') : String(it.sat || '');
    const rak = barang ? String(barang.rak || '') : '';

    rowsInput.push([
      "",                                                 // A = NO
      new Date(tanggal),                                  // B = TANGGAL
      kode,                                               // C = KODE BARANG
      `PO ${sentId}`,                                    // D = NO. LKH
      nama,                                               // E = NAMA BARANG
      qtyMasuk,                                           // F = JUMLAH MASUK
      sat,                                                // G = SAT.
      rak,                                                // H = RAK
      String(poItem.pemesan || '').trim(),                // I = PEMESAN
      String(poItem.peruntukan || '').trim(),             // J = PERUNTUKAN
      autoNoPenerimaan,                                   // K = NO. PENERIMAAN
      namaKaryawan,                                       // L = PENERIMA
      poKind === 'LOKASI' ? '' : noSuratJalan,            // M = NO SURAT JALAN (Surabaya)
      namaPengirim,                                       // N = NAMA SOPIR
      nopolKendaraan,                                     // O = PLAT NO.
      noHpPengirim,                                       // P = NO. HP
      Number(it.harga || poItem.harga || 0),              // Q = HARGA
      poKind === 'LOKASI' ? noSuratJalan : 'Surabaya',    // R = ASAL
      String(it.keterangan || poItem.keterangan || '').trim() // S = KETERANGAN
    ]);

    rowsLog.push([
      sentId,
      tanggal,
      kode,
      nama,
      qtyMasuk,
      sat,
      now
    ]);

    if (gudang) {
      updateStokGudang_(gudang, kode, qtyMasuk);
    }
  });

  if (!rowsInput.length) return { ok:false, msg:'Tidak ada qty masuk yang valid' };

  // tulis data A:S (19 kolom)
  shInput.getRange(targetRow, 1, rowsInput.length, 19).setValues(rowsInput);

  // copy format A:S dari row 7
  shInput.getRange(TEMPLATE_ROW, 1, 1, 19)
    .copyTo(
      shInput.getRange(targetRow, 1, rowsInput.length, 19),
      SpreadsheetApp.CopyPasteType.PASTE_FORMAT,
      false
    );
  const formattedLastRow = targetRow + rowsInput.length - 1;
  shInput.getRange(START_ROW, 1, formattedLastRow - START_ROW + 1, 19)
    .setFontColor("#000000");
  shInput.getRange(START_ROW, 2, formattedLastRow - START_ROW + 1, 1)
    .setNumberFormat("d mmmm yyyy");

  // isi nomor urut kolom A
  for (let i = 0; i < rowsInput.length; i++) {
    shInput.getRange(targetRow + i, 1).setValue((targetRow - START_ROW + 1) + i);
  }

  // simpan log
  shLog.getRange(shLog.getLastRow() + 1, 1, rowsLog.length, 7).setValues(rowsLog);
  if (shLog.getLastRow() >= 2) {
    shLog.getRange(2, 1, shLog.getLastRow() - 1, 7)
      .setFontColor("#000000");
    shLog.getRange(2, 7, shLog.getLastRow() - 1, 1)
      .setNumberFormat("dd-mmm-yyyy (HH:mm)");
  }

  // update REKAP PO Sby: M = TGL MASUK, N = JUMLAH MASUK, O,P,Q set rumus
try {
  updateRekapJumlahMasuk_(sentId, items, tanggal, poKind);
} catch (err) {
  Logger.log("Gagal update rekap jumlah masuk: " + err);
}

  CacheService.getScriptCache().remove(SS_ID + '_DASH_ITEMS_V1');
  SpreadsheetApp.flush();

  return { ok:true };
}

function getNextPenerimaanNumbers(tanggal, poKind){
  const ss = SpreadsheetApp.openById(SS_ID);
  const shInput = getSheetByNameRobust_(ss, INPUT_SHEETS.masuk);
  const period = getPenerimaanPeriod_(tanggal);
  const kind = String(poKind || 'SURABAYA').toUpperCase() === 'LOKASI' ? 'Lok' : (String(poKind || '').toUpperCase() === 'PINJAM' ? 'Pjm' : 'Sby');
  const prefix = `Maja/PO-${kind}/PB/${period.roman}/${period.year}/`;
  if (!shInput) return { noPenerimaan:prefix + "001", noSuratJalan:"SJ-001" };

  const lastRow = shInput.getLastRow();
  let maxPen = 0;
  let maxSj = 0;
  if (lastRow >= 7) {
    const values = shInput.getRange(7, 2, lastRow - 6, 12).getValues(); // B:M
    values.forEach(row => {
      maxPen = Math.max(maxPen, getPenerimaanSequence_(row[9], period, row[0], kind === 'LOK' ? 'LOKASI' : 'SURABAYA'));
      const sj = String(row[11] || "").trim().match(/^SJ-(\d+)$/i);
      if (sj) maxSj = Math.max(maxSj, Number(sj[1]));
    });
  }
  return {
    noPenerimaan:prefix + String(maxPen + 1).padStart(3, "0"),
    noSuratJalan:"SJ-" + String(maxSj + 1).padStart(3, "0")
  };
}

function makePoLabel_(shHead, now, tz){
  const monthNames = [
    "Januari","Februari","Maret","April","Mei","Juni",
    "Juli","Agustus","September","Oktober","November","Desember"
  ];
  const day = Number(Utilities.formatDate(now, tz, "d"));
  const month = Number(Utilities.formatDate(now, tz, "M"));
  const year = Utilities.formatDate(now, tz, "yyyy");
  const dateText = `${day} ${monthNames[month - 1]} ${year}`;
  const todayKey = Utilities.formatDate(now, tz, "yyyy-MM-dd");
  const timeText = Utilities.formatDate(now, tz, 'HH:mm');

  const last = shHead.getLastRow();
  let maxN = 0;

  if (last >= 2) {
    const rows = shHead.getRange(2, 2, last - 1, 2).getDisplayValues();
    rows.forEach(row => {
      const name = String(row[0] || "").trim();
      const timestamp = String(row[1] || "").trim();
      if (!timestamp.startsWith(todayKey)) return;
      const m = name.match(/^PO-(\d+)\s*:/i);
      if (m) maxN = Math.max(maxN, Number(m[1] || 0));
    });
  }

  const n = maxN + 1;
  return `PO-${n} : ${dateText} (${timeText})`;
}

/** banding otomatis biar warna selang-seling rapi */
function applyBanding_(sh, cols) {
  const last = sh.getLastRow();
  if (last < 1) return;

  // hapus banding lama
  sh.getBandings().forEach(b => b.remove());

  // banding baru
  const range = sh.getRange(1, 1, last, cols);
  range.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);

  // header tegas
  sh.getRange(1, 1, 1, cols)
    .setBackground('#2f5f9f')
    .setFontColor('#ffffff')
    .setFontWeight('bold');

  if (last >= 2) {
    sh.getRange(2, 1, last - 1, cols).setFontColor('#000000');
  }
}

function deleteHeadById_(shHead, id){
  const last = shHead.getLastRow();
  if (last < 2) return;

  const vals = shHead.getRange(2, 1, last-1, 1).getValues().flat().map(String);
  for (let i = vals.length - 1; i >= 0; i--) {
    if (String(vals[i]).trim().toLowerCase() === String(id).trim().toLowerCase()) {
      shHead.deleteRow(i + 2);
      return;
    }
  }
}

function deletePoByMode(payload){
  ensurePoSheets_();

  payload = payload || {};
  const id = String(payload.id || "").trim();
  const mode = String(payload.mode || "").trim();

  if (!id) return { ok:false, msg:"ID kosong" };

  const ss = SpreadsheetApp.openById(SS_ID);

  if (mode === "EDIT") {
    const shHead = ss.getSheetByName(PO_DRAFT_SHEET);
    const shItem = ss.getSheetByName(PO_DRAFT_ITEMS_SHEET);
    if (!shHead || !shItem) return { ok:false, msg:"Sheet draft tidak ditemukan" };

    deleteItemsById_(shItem, id);
    deleteHeadById_(shHead, id);

    applyBanding_(shHead, 4);
    applyBanding_(shItem, 10);

    return { ok:true };
  }

  if (mode === "VIEW_SENT") {
  const shHead = ss.getSheetByName(PO_SENT_SHEET);
  const shItem = ss.getSheetByName(PO_SENT_ITEMS_SHEET);

  deleteItemsById_(shItem, id);
  deleteHeadById_(shHead, id);

  // 🔥 TAMBAHAN INI (PENTING BANGET)
  hapusRekapBySentId_(id);

  applyBanding_(shHead, 4);
  applyBanding_(shItem, 10);

  return { ok:true };
}

  return { ok:false, msg:"Mode tidak valid untuk hapus: " + mode };
}

function getNextKodeBarang(gudang){
  if (!gudang) return { ok:false, msg:"Gudang kosong" };

  const ss = SpreadsheetApp.openById(SS_ID);
  const sh = ss.getSheetByName(gudang);
  if (!sh) return { ok:false, msg:"Sheet gudang tidak ditemukan: " + gudang };

  const prefix = getGudangPrefix_(gudang);
  if (!prefix) return { ok:false, msg:"Prefix gudang tidak dikenali: " + gudang };

  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < HEADER_ROW) return { ok:false, msg:"Header gudang tidak ditemukan" };

  const values = sh.getRange(HEADER_ROW, 1, lastRow - HEADER_ROW + 1, lastCol).getValues();
  const header = values[0];
  const map = mapHeader_(header);

  if (map.kode == null) return { ok:false, msg:"Kolom kode tidak ditemukan" };

  const lastDataRow = findGudangDataLastRow_(sh, map, gudang);
  if (lastDataRow < DATA_ROW_START) {
    return { ok:true, kode: prefix + "-001", debug:["Tabel kosong"] };
  }

  const numRows = lastDataRow - DATA_ROW_START + 1;
  const kodeValues = sh.getRange(DATA_ROW_START, map.kode + 1, numRows, 1).getDisplayValues().flat();

  const usedNumbers = new Set();
  const usedCodes = [];
  const re = new RegExp("^" + prefix + "-(\\d+)$", "i");

  for (let i = 0; i < kodeValues.length; i++) {
    const kode = String(kodeValues[i] || "").trim().toUpperCase();
    if (!kode) continue;

    const m = kode.match(re);
    if (!m) continue;

    const n = Number(m[1]);
    if (!isNaN(n) && n > 0) {
      usedNumbers.add(n);
      usedCodes.push(kode);
    }
  }

  let nextNo = 1;
  while (usedNumbers.has(nextNo)) {
    nextNo++;
  }

  Logger.log("Gudang: " + gudang);
  Logger.log("Last data row: " + lastDataRow);
  Logger.log("Used codes: " + JSON.stringify(usedCodes));
  Logger.log("Next code: " + prefix + "-" + String(nextNo).padStart(3, "0"));

  return {
    ok: true,
    kode: prefix + "-" + String(nextNo).padStart(3, "0"),
    debug: usedCodes.slice(-20)
  };
}

function addBarangBaru(payload){
  payload = payload || {};

  const gudang = String(payload.gudang || "").trim();
  const kode   = String(payload.kode || "").trim().toUpperCase();
  const nama   = String(payload.nama || "").trim();
  const sat    = String(payload.sat || "").trim();
  const rak    = String(payload.rak || "").trim();
  const photo  = payload.photo || null;

  if (!gudang) return { ok:false, msg:"Gudang kosong" };
  if (!kode)   return { ok:false, msg:"Kode kosong" };
  if (!nama)   return { ok:false, msg:"Nama kosong" };
  if (!sat)    return { ok:false, msg:"Satuan kosong" };
  if (!rak)    return { ok:false, msg:"Rak kosong" };

  const ss = SpreadsheetApp.openById(SS_ID);
  const sh = ss.getSheetByName(gudang);
  if (!sh) return { ok:false, msg:"Sheet gudang tidak ditemukan: " + gudang };

  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < HEADER_ROW) return { ok:false, msg:"Header gudang tidak ditemukan" };

  const allValues = sh.getRange(HEADER_ROW, 1, lastRow - HEADER_ROW + 1, lastCol).getValues();
  const header = allValues[0];
  const map = mapHeader_(header);
  const extraMap = findHeaderIndexesByText_(header);

  if (map.kode == null || map.nama == null || map.stok == null) {
    return { ok:false, msg:"Kolom penting (kode/nama/stok) tidak lengkap" };
  }

  // cek duplikat kode
  for (let i = 1; i < allValues.length; i++) {
    const k = String(allValues[i][map.kode] || "").trim().toUpperCase();
    if (k === kode) return { ok:false, msg:"Kode barang sudah ada: " + kode };
  }

  // cari baris terakhir data tabel yang valid
  const lastDataRow = findGudangDataLastRow_(sh, map, gudang);
  const insertRow = lastDataRow + 1;

  // sisipkan 1 baris baru tepat di bawah tabel
  sh.insertRowsBefore(insertRow, 1);

  // copy format dari baris atas data terakhir
  if (lastDataRow >= DATA_ROW_START) {
    sh.getRange(lastDataRow, 1, 1, lastCol).copyTo(
      sh.getRange(insertRow, 1, 1, lastCol),
      SpreadsheetApp.CopyPasteType.PASTE_FORMAT,
      false
    );
  }

  // kosongkan isi
  sh.getRange(insertRow, 1, 1, lastCol).clearContent();

  // isi data utama
  sh.getRange(insertRow, map.kode + 1).setValue(kode);
  sh.getRange(insertRow, map.nama + 1).setValue(nama);
  sh.getRange(insertRow, map.stok + 1).setValue(0);

  if (map.sat != null) sh.getRange(insertRow, map.sat + 1).setValue(sat);
  if (map.rak != null) sh.getRange(insertRow, map.rak + 1).setValue(rak);

  // kolom A ikut rumus dari atas
  if (insertRow > DATA_ROW_START) {
    sh.getRange(insertRow - 1, 1).copyTo(
      sh.getRange(insertRow, 1),
      SpreadsheetApp.CopyPasteType.PASTE_FORMULA,
      false
    );
  }

  SpreadsheetApp.flush();

  // sort berdasarkan nama barang
  const newLastDataRow = findGudangDataLastRow_(sh, map, gudang);
  sh.getRange(DATA_ROW_START, 1, newLastDataRow - DATA_ROW_START + 1, lastCol)
    .sort([{ column: map.nama + 1, ascending: true }]);

  SpreadsheetApp.flush();

  // setelah sort, refresh ulang kolom A & QR untuk semua baris data
  refreshGudangFormulas_(sh, map, extraMap, gudang);

  let photoUrl = "";
  let photoWarning = "";
  if (photo && photo.data) {
    try {
      photoUrl = uploadBarangPhoto_(gudang, kode, nama, photo);
    } catch (e) {
      photoWarning = "Barang tersimpan, tapi foto gagal diupload: " + e;
      console.error(photoWarning);
    }
  }

  CacheService.getScriptCache().remove(SS_ID + '_DASH_ITEMS_V1');
  CacheService.getScriptCache().remove(getPhotoMapCacheKey_(gudang));
  SpreadsheetApp.flush();

  return { ok:true, fotoUrl: photoUrl, warning: photoWarning };
}

function columnToLetter_(column) {
  let temp = "";
  let letter = "";
  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }
  return letter;
}

function refreshGudangFormulas_(sh, map, extraMap, gudang){
  // Tambahkan kolom BARANG PINJAM tepat sebelum STOK AKHIR jika belum ada.
  // Fungsi aman dijalankan berulang karena terlebih dahulu memeriksa header.
  let currentHeader = sh.getRange(HEADER_ROW, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
  let pinjamCol = findHeaderColumnByWords_(currentHeader, ['barang', 'pinjam']);
  let stokAkhirCol = findHeaderColumnByWords_(currentHeader, ['stok', 'akhir']);

  if (pinjamCol == null && stokAkhirCol != null) {
    // Jika eksekusi sebelumnya berhenti setelah insertColumnBefore, akan ada
    // satu kolom kosong tepat sebelum STOK AKHIR. Gunakan kembali kolom itu.
    const previousHeader = stokAkhirCol > 0
      ? String(currentHeader[stokAkhirCol - 1] || '').trim()
      : '';
    let insertAt;
    if (stokAkhirCol > 0 && previousHeader === '') {
      insertAt = stokAkhirCol; // nomor kolom 1-based untuk kolom kosong tersebut
    } else {
      insertAt = stokAkhirCol + 1; // indeks 0-based -> nomor kolom 1-based
      sh.insertColumnBefore(insertAt);
    }

    // Salin format mulai header tabel ke bawah saja. Baris judul di atasnya
    // mengandung merged cells dan tidak boleh menjadi target paste parsial.
    if (insertAt > 1) {
      const formatRowCount = sh.getMaxRows() - HEADER_ROW + 1;
      sh.getRange(HEADER_ROW, insertAt - 1, formatRowCount, 1).copyTo(
        sh.getRange(HEADER_ROW, insertAt, formatRowCount, 1),
        SpreadsheetApp.CopyPasteType.PASTE_FORMAT,
        false
      );
    }
    sh.getRange(HEADER_ROW, insertAt).setValue('BARANG PINJAM ( F )');

    currentHeader = sh.getRange(HEADER_ROW, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
    pinjamCol = findHeaderColumnByWords_(currentHeader, ['barang', 'pinjam']);
    stokAkhirCol = findHeaderColumnByWords_(currentHeader, ['stok', 'akhir']);
    map = mapHeader_(currentHeader);
    extraMap = findHeaderIndexesByText_(currentHeader);
  }

  const lastDataRow = findGudangDataLastRow_(sh, map, gudang);
  if (lastDataRow < DATA_ROW_START) return;

  const kodeColLetter = columnToLetter_(map.kode + 1);

  // Kolom laporan stok:
  // D = stok awal, E = masuk, F = keluar, G = rusak, H = hilang, I = stok akhir.
  // Nama sheet sumber diambil dari sheet yang benar-benar ada agar rumus tetap
  // bekerja apabila nama sheet memiliki tambahan kata (mis. "Masuk").
  const ss = sh.getParent();
  const sourceSheets = {
    masuk: getSheetByNameRobust_(ss, INPUT_SHEETS.masuk),
    keluar: getSheetByNameRobust_(ss, INPUT_SHEETS.keluar),
    rusak: getSheetByNameRobust_(ss, INPUT_SHEETS.rusak),
    hilang: getSheetByNameRobust_(ss, INPUT_SHEETS.hilang),
    pinjam: getSheetByNameRobust_(ss, INPUT_SHEETS.pinjam)
  };

  const sourceInfoCache = {};
  const sourceInfoForFormula = function(type) {
    if (Object.prototype.hasOwnProperty.call(sourceInfoCache, type)) {
      return sourceInfoCache[type];
    }
    const source = sourceSheets[type];
    if (!source) return (sourceInfoCache[type] = null);

    // Header transaksi berada di baris 6. Cari kolom berdasarkan judul agar
    // tidak bergantung pada posisi tetap (sheet Masuk saat ini: Nama=E, Jumlah=F).
    const lastCol = source.getLastColumn();
    const headers = source.getRange(6, 1, 1, lastCol).getDisplayValues()[0];
    let namaCol = null;
    let jumlahCol = null;

    headers.forEach(function(value, index) {
      const text = String(value || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
      if (text.indexOf('nama barang') !== -1) namaCol = index + 1;
      if (text.indexOf('jumlah') !== -1) jumlahCol = index + 1;
    });

    if (namaCol == null || jumlahCol == null) return (sourceInfoCache[type] = null);
    return (sourceInfoCache[type] = {
      name: "'" + source.getName().replace(/'/g, "''") + "'",
      namaLetter: columnToLetter_(namaCol),
      jumlahLetter: columnToLetter_(jumlahCol)
    });
  };

  const stockFormula = function(type, row) {
    const info = sourceInfoForFormula(type);
    if (!info) return '=0';
    // Di sheet gudang, NAMA BARANG berada di kolom C. Kolom sumber ditentukan
    // dari header tiap sheet input, bukan dikunci ke D/F.
    return '=IF($C' + row + '="","",SUMIF(' + info.name + '!$' +
      info.namaLetter + '$7:$' + info.namaLetter + ',$C' + row + ',' +
      info.name + '!$' + info.jumlahLetter + '$7:$' + info.jumlahLetter + '))';
  };

  for (let row = DATA_ROW_START; row <= lastDataRow; row++) {
    // kolom A
    sh.getRange(row, 1).setFormula(`=IF(${kodeColLetter}${row}="","",ROW()-9)`);

    // E:H mengambil jumlah dari sheet Masuk, Keluar, Rusak, dan Hilang.
    sh.getRange(row, 5).setFormula(stockFormula('masuk', row));
    sh.getRange(row, 6).setFormula(stockFormula('keluar', row));
    sh.getRange(row, 7).setFormula(stockFormula('rusak', row));
    sh.getRange(row, 8).setFormula(stockFormula('hilang', row));

    // Kolom setelah Hilang mengambil Barang Pinjam.
    const pinjamColumnNumber = pinjamCol != null ? pinjamCol + 1 : 9;
    const stokAkhirColumnNumber = stokAkhirCol != null ? stokAkhirCol + 1 : 10;
    const pinjamLetter = columnToLetter_(pinjamColumnNumber);
    sh.getRange(row, pinjamColumnNumber).setFormula(stockFormula('pinjam', row));

    // Stok akhir = awal + masuk - keluar - rusak - hilang - pinjam.
    sh.getRange(row, stokAkhirColumnNumber).setFormula(
      `=IF(${kodeColLetter}${row}="","",N(D${row})+N(E${row})-N(F${row})-N(G${row})-N(H${row})-N(${pinjamLetter}${row}))`
    );

    // kolom QR
    if (extraMap.qr != null) {
      sh.getRange(row, extraMap.qr + 1).setFormula(
        '=IMAGE("https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" & ENCODEURL("https://script.google.com/macros/s/AKfycby3tyKPcV3t0WKp2AXJEeMHPVUPlPGAbrJql4eU4xzW_26uFTi2GdBhlNJsfTKPPPOX/exec?kode=" & ' + kodeColLetter + row + '))'
      );
    }
  }
}

function findHeaderColumnByWords_(header, words) {
  for (let i = 0; i < header.length; i++) {
    const text = String(header[i] || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
    if (words.every(function(word) { return text.indexOf(word) !== -1; })) return i;
  }
  return null;
}

/**
 * Jalankan sekali dari editor Apps Script untuk memasang/menyegarkan rumus
 * stok pada seluruh sheet gudang yang sudah memiliki data.
 */
function refreshSemuaRumusStokGudang() {
  const ss = SpreadsheetApp.openById(SS_ID);
  const result = [];

  GUDANG_SHEETS.forEach(function(gudang) {
    const sh = ss.getSheetByName(gudang);
    if (!sh) {
      result.push(gudang + ': sheet tidak ditemukan');
      return;
    }

    const header = sh.getRange(HEADER_ROW, 1, 1, sh.getLastColumn()).getValues()[0];
    const map = mapHeader_(header);
    const extraMap = findHeaderIndexesByText_(header);
    refreshGudangFormulas_(sh, map, extraMap, gudang);
    result.push(gudang + ': OK');
  });

  SpreadsheetApp.flush();
  CacheService.getScriptCache().remove(SS_ID + '_DASH_ITEMS_V1');
  return result;
}

function findHeaderIndexesByText_(header){
  const result = {
    qr: null
  };

  header.forEach((h, i) => {
    const t = String(h || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

    if (t === "qr" || t.includes("qr")) {
      result.qr = i;
    }
  });

  return result;
}

function formatPoWhatsappMessage_(poId, poName, items){
  const lines = [];

  lines.push("📦 *PENGAJUAN PO SURABAYA*");
  lines.push("");
  lines.push(`🆔 *ID:* ${poId}`);
  lines.push(`📝 *Nama:* ${poName}`);
  lines.push(`📊 *Jumlah Item:* ${items.length}`);
  lines.push("");
  lines.push("*Rincian:*");

  const groups = {};
  items.forEach(it => {
    const key = String(it.pemesan || "-").trim() || "-";
    if (!groups[key]) groups[key] = [];
    groups[key].push(it);
  });

  Object.keys(groups).forEach(pemesan => {
    lines.push(`*${getPemesanLabel_(pemesan)} :*`);

    groups[pemesan].forEach((it, idx) => {
      const kode = String(it.kode || "").trim();
      const nama = String(it.nama || "").trim();
      const qty  = Number(it.qty || 0);
      const sat  = String(it.sat || "").trim();
      const peruntukan = String(it.peruntukan || "").trim();
      const ket  = String(it.keterangan || "").trim();

      const barang = findBarangByKode_(kode);
      const satuan = sat || (barang ? String(barang.sat || "").trim() : "");

      lines.push(
  `${idx + 1}. ${kode} - ${nama} | Qty: ${qty} ${satuan}${peruntukan ? " | " + peruntukan : ""}${ket ? " | " + ket : ""}`
);

if (idx < groups[pemesan].length - 1) {
  lines.push("");
}
    });

    lines.push("");
  });

  lines.push("_Maxmar Group - PT Maja Royal Vannamei_");

  return lines.join("\n");
}

function formatPoDraftWhatsappMessage_(draftId, draftName, items){
  return formatPoWhatsappMessage_(draftId, draftName, items);
}

function sendWahaGroupMessage_(groupId, text){
  if (!groupId) throw new Error("groupId kosong");
  if (!text) throw new Error("text kosong");

  Utilities.sleep(900 + Math.floor(Math.random() * 700));

  const url = WAHA_API_URL.replace(/\/$/, "") + WAHA_SEND_TEXT_PATH;

  const payload = {
    session: WAHA_SESSION,
    chatId: groupId,
    text: text
  };

  const options = {
    method: "post",
    contentType: "application/json",
    muteHttpExceptions: true,
    headers: {
      Authorization: "Bearer " + WAHA_API_KEY,
      "X-Api-Key": WAHA_API_KEY
    },
    payload: JSON.stringify(payload)
  };

  const res = UrlFetchApp.fetch(url, options);
  const code = res.getResponseCode();
  const body = res.getContentText();

  Logger.log("WAHA code: " + code);
  Logger.log("WAHA body: " + body);

  if (code < 200 || code >= 300) {
    throw new Error("WAHA gagal. HTTP " + code + " | " + body);
  }

  let json = null;
  try { json = JSON.parse(body); } catch(e) {}

  return {
    ok: true,
    code: code,
    response: json || body
  };
}

function testWahaPermission(){
  const res = UrlFetchApp.fetch("http://149.28.151.94:3000", {
    method: "get",
    muteHttpExceptions: true
  });
  Logger.log(res.getResponseCode());
  Logger.log(res.getContentText());
}

function testSendWaha(){
  const pesan = "Test kirim WA dari Apps Script";
  const res = sendWahaGroupMessage_("120363407049370326@g.us", pesan);
  Logger.log(res);
}

function hapusRekapBySentId_(sentId){
  
  const sh = SpreadsheetApp.openById(SS_REKAP_ID).getSheetByName("PO Sby");

  const lastRow = sh.getLastRow();
  if (lastRow < 6) return;

  const data = sh.getRange(6, 5, lastRow - 5, 1).getValues(); // kolom E (NO.LHK)

  // kumpulkan baris yang harus dihapus
  let rowsToDelete = [];
  data.forEach((r, i) => {
    if (String(r[0]).trim().toLowerCase() === String(sentId).trim().toLowerCase()){
      rowsToDelete.push(i + 6);
    }
  });

  // hapus dari bawah ke atas (biar aman)
  rowsToDelete.reverse().forEach(row => {
    sh.deleteRow(row);
  });

  // 🔥 RENOMBER KOLOM A
  const last = sh.getLastRow();
  if (last < 6) return;

  const noRange = sh.getRange(6, 1, last - 5, 1);
  const newNo = [];
  for (let i = 0; i < last - 5; i++){
    newNo.push([270 + i]); // sesuaikan start NO kamu
  }
  noRange.setValues(newNo);
}

function getReviewRekapPo(poKind){
  
  const isLocation = String(poKind || '').trim().toUpperCase() === 'LOKASI';
  const isPinjam = String(poKind || '').trim().toUpperCase() === 'PINJAM';
  const sheetName = isLocation ? 'PO Lokasi' : (isPinjam ? 'PO Pinjam' : 'PO Sby');
  const sh = SpreadsheetApp.openById(SS_REKAP_ID).getSheetByName(sheetName);
  if (!sh) throw new Error('Sheet rekap "' + sheetName + '" tidak ditemukan');

  const lastRow = sh.getLastRow();
  if (lastRow < 6) return [];

  const values = sh.getRange(5, 1, lastRow - 4, 18).getDisplayValues();
  return values;
}

function updateRekapJumlahMasuk_(sentId, items, tanggal, poKind){
  
  const isLocation = String(poKind || '').toUpperCase() === 'LOKASI';
  const isPinjam = String(poKind || '').toUpperCase() === 'PINJAM';
  const rekapSheetName = isLocation ? 'PO Lokasi' : (isPinjam ? 'PO Pinjam' : 'PO Sby');
  const sh = SpreadsheetApp.openById(SS_REKAP_ID).getSheetByName(rekapSheetName);
  if (!sh) throw new Error('Sheet rekap "' + rekapSheetName + '" tidak ditemukan');

  const ssPo = SpreadsheetApp.openById(SS_ID);
  const sentItems = readPoItems_(ssPo, isLocation ? PO_LOKASI_SENT_ITEMS_SHEET : (isPinjam ? PO_PINJAM_SENT_ITEMS_SHEET : PO_SENT_ITEMS_SHEET), sentId);
  const shSentHead = ssPo.getSheetByName(isLocation ? PO_LOKASI_SENT_SHEET : (isPinjam ? PO_PINJAM_SENT_SHEET : PO_SENT_SHEET));
  const waktuInput = new Date();

  // Tanggal mengikuti pilihan pengguna, jam mengikuti saat tombol Input ditekan.
  let tanggalJamMasuk = new Date(waktuInput);
  const tanggalText = String(tanggal || "").trim();
  const dmy = tanggalText.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  const ymd = tanggalText.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (dmy) {
    tanggalJamMasuk.setFullYear(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  } else if (ymd) {
    tanggalJamMasuk.setFullYear(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
  } else if (tanggal) {
    const parsedTanggal = new Date(tanggal);
    if (!isNaN(parsedTanggal.getTime())) {
      tanggalJamMasuk.setFullYear(
        parsedTanggal.getFullYear(),
        parsedTanggal.getMonth(),
        parsedTanggal.getDate()
      );
    }
  }

  let poDate = new Date();
  if (shSentHead && shSentHead.getLastRow() >= 2) {
    const heads = shSentHead.getRange(2, 1, shSentHead.getLastRow() - 1, 3).getValues();
    const head = heads.find(r =>
      String(r[0] || "").trim().toLowerCase() === String(sentId).trim().toLowerCase()
    );
    if (head && head[2]) {
      const parsed = new Date(head[2]);
      if (!isNaN(parsed.getTime())) poDate = parsed;
    }
  }

  // Semua item pada satu kali klik Input harus ditulis sebagai satu kelompok.
  // Tentukan posisi sesudah baris terakhir PO ini, bukan sesudah masing-masing barang.
  let nextHistoryRow = 0;
  const rekapLastRow = sh.getLastRow();
  if (rekapLastRow >= 6) {
    const ids = sh.getRange(6, 5, rekapLastRow - 5, 1).getDisplayValues().flat();
    ids.forEach((value, i) => {
      if (
        String(value || "").trim().toLowerCase() ===
        String(sentId).trim().toLowerCase()
      ) {
        nextHistoryRow = i + 7;
      }
    });
  }

  items.forEach(it => {
    const kode = String(it.kode || "").trim();
    const qtyMasuk = Number(it.qtyMasuk || 0);
    if (!kode || qtyMasuk <= 0) return;

    const lastRow = sh.getLastRow();
    if (lastRow < 6) return;

    // Ambil baris terakhir untuk item ini. Baris terakhir adalah posisi
    // penerimaan terbaru apabila sebelumnya sudah pernah diinput.
    const data = sh.getRange(6, 5, lastRow - 5, 4).getDisplayValues();
    const cleanSentId = String(sentId).trim().toLowerCase();
    const cleanItemNama = String(it.nama || "").trim().toLowerCase();
    let row = 0;

    for (let i = 0; i < data.length; i++) {
      const rowNoLhk = String(data[i][0] || "").trim().toLowerCase(); // E
      const rowNama = String(data[i][3] || "").split('/')[0].trim().toLowerCase(); // H
      if (rowNoLhk === cleanSentId && rowNama === cleanItemNama) {
        row = i + 6;
      }
    }

    if (!row) {
      // Baris dasar rekap bisa hilang/berbeda ketika nomor PO lama pernah
      // dipakai ulang. Bangun kembali barisnya dari data PO terkirim.
      const poItem = sentItems.find(x =>
        String(x.kode || "").trim().toLowerCase() === kode.toLowerCase()
      );
      if (!poItem) {
        throw new Error(`Data PO terkirim untuk kode ${kode} tidak ditemukan`);
      }

      row = sh.getLastRow() + 1;
      const tz = Session.getScriptTimeZone() || "Asia/Jakarta";
      const bulan = Utilities.formatDate(poDate, tz, "MMMM");
      const tahun = Utilities.formatDate(poDate, tz, "yyyy");
      const day = poDate.getDate();
      const lastDay = new Date(poDate.getFullYear(), poDate.getMonth() + 1, 0).getDate();
      const laporan = day <= 10
        ? `01-10 ${bulan} ${tahun}`
        : day <= 20
          ? `11-20 ${bulan} ${tahun}`
          : `21-${lastDay} ${bulan} ${tahun}`;
      const noSebelumnya = Number(sh.getRange(row - 1, 1).getValue() || 0);
      const uraian = String(poItem.keterangan || "").trim()
        ? `${poItem.nama || ""}/${poItem.keterangan || ""}`
        : String(poItem.nama || "");

      sh.getRange(row, 1, 1, 18).setValues([[
        noSebelumnya + 1,                                      // A NO
        bulan,                                                 // B BULAN
        laporan,                                               // C LAPORAN
        Utilities.formatDate(poDate, tz, "d-MMM-yyyy HH:mm"),  // D TGL
        sentId,                                                // E NO. LHK
        poItem.pemesan || "-",                                 // F PEMESAN
        poItem.kodeLkh || "",                                  // G KODE LKH
        uraian,                                                // H URAIAN
        Number(poItem.qty || 0),                               // I JUMLAH
        poItem.sat || it.sat || "",                            // J SAT
        new Date(poDate),                                      // K TGL. PO
        poItem.masukHr || "",                                  // L PERMINTAAN
        "", "", "", "", "", ""                                 // M:R
      ]]);

      // Samakan tampilan baris baru dengan baris rekap sebelumnya.
      if (row > 6) {
        sh.getRange(row - 1, 1, 1, 18).copyTo(
          sh.getRange(row, 1, 1, 18),
          SpreadsheetApp.CopyPasteType.PASTE_FORMAT,
          false
        );
      }
    }

    const sudahPernahMasuk =
      String(sh.getRange(row, 13).getDisplayValue() || "").trim() !== "" ||
      Number(sh.getRange(row, 14).getValue() || 0) !== 0;

    if (sudahPernahMasuk) {
      // Penerimaan berikutnya harus menjadi riwayat baru, bukan menimpa
      // penerimaan sebelumnya. Semua barang pada transaksi yang sama ditempatkan
      // berurutan sebagai satu blok sesudah kelompok PO.
      SpreadsheetApp.flush();
      const sisaTerakhir = Math.max(0, Number(sh.getRange(row, 15).getValue() || 0));

      if (!nextHistoryRow) nextHistoryRow = sh.getLastRow() + 1;
      if (nextHistoryRow > sh.getMaxRows()) {
        sh.insertRowAfter(sh.getMaxRows());
      } else {
        sh.insertRowBefore(nextHistoryRow);
      }

      sh.getRange(row, 1, 1, 18).copyTo(
        sh.getRange(nextHistoryRow, 1, 1, 18),
        SpreadsheetApp.CopyPasteType.PASTE_NORMAL,
        false
      );
      row = nextHistoryRow;
      nextHistoryRow++;

      // I pada baris lanjutan menjadi jumlah/sisa terbaru sebelum penerimaan ini.
      sh.getRange(row, 9).setValue(sisaTerakhir);
      sh.getRange(row, 13, 1, 5).clearContent(); // M:Q dihitung ulang di bawah
    }

    if (tanggal) {
      sh.getRange(row, 13)
        .setValue(tanggalJamMasuk)
        .setNumberFormat("dd-mmm-yyyy (HH:mm)");
    }                                                              // M
    sh.getRange(row, 14).setValue(qtyMasuk);                       // N

    // O, P, Q = KEKURANGAN, KELEBIHAN, DEVIASI TERLAMBAT
    sh.getRange(row, 15).setFormula(`=I${row}-N${row}`);
    sh.getRange(row, 16).setFormula(`=MAX(0,N${row}-I${row})`);
    sh.getRange(row, 17).setFormula(
      `=IF(AND(ISNUMBER(M${row}),M${row}<>""), "(" & IF(M${row}-(K${row}+L${row})=0,"H", IF(M${row}-(K${row}+L${row})>0,"+"&(M${row}-(K${row}+L${row})),M${row}-(K${row}+L${row}))) & ")", "(" & IF(TODAY()-(K${row}+L${row})=0,"H", IF(TODAY()-(K${row}+L${row})>0,"+"&(TODAY()-(K${row}+L${row})),TODAY()-(K${row}+L${row}))) & ")")`
    );
  });
}

function getPemesanOptions() {
  
  try {
    const ss = SpreadsheetApp.openById(KARYAWAN_SS_ID);
    const sh = ss.getSheetByName("Data Karyawan");
    if (!sh) {
      const sheetNames = ss.getSheets().map(s => s.getName()).join(", ");
      return [{nama: "Sheet 'Data Karyawan' NOT FOUND. Available: " + sheetNames, jabatan: "Error"}];
    }

    const lastRow = sh.getLastRow();
    if (lastRow < 4) {
      return [{nama: "Data kosong (lastRow < 4)", jabatan: "Error"}];
    }

    // C = Nama, D = Jabatan
    const values = sh.getRange(4, 3, lastRow - 3, 2).getDisplayValues(); 

    return values
      .map(r => ({
        nama: String(r[0] || "").trim(),
        jabatan: String(r[1] || "").trim()
      }))
      .filter(x => x.nama && x.nama.indexOf("#VALUE") === -1);
  } catch(e) {
    return [{nama: "Error: " + String(e), jabatan: "Error"}];
  }
}

function getLokasiOptions() {
  
  try {
    const ss = SpreadsheetApp.openById(KARYAWAN_SS_ID);
    const sh = ss.getSheetByName("Lokasi");
    if (!sh) return [];
    
    const lastCol = sh.getLastColumn();
    if (lastCol < 2) return [];
    
    const values = sh.getRange(1, 2, 1, lastCol - 1).getDisplayValues()[0];
    return values.filter(v => v.trim() !== "");
  } catch (e) {
    Logger.log("Error getLokasiOptions: " + e.message);
    return [];
  }
}

function getPeruntukanOptions() {
  
  try {
    const ss = SpreadsheetApp.openById(KARYAWAN_SS_ID);
    const sh = ss.getSheetByName("Peruntukan");
    if (!sh) {
      const sheetNames = ss.getSheets().map(s => s.getName()).join(", ");
      return ["Sheet 'Peruntukan' NOT FOUND. Available: " + sheetNames];
    }

    const lastRow = sh.getLastRow();
    if (lastRow < 2) {
      return ["Data kosong (lastRow < 2)"];
    }

    const values = sh.getRange(2, 1, lastRow - 1, 1).getDisplayValues();

    const result = values
      .map(r => String(r[0] || "").trim())
      .filter(x => x !== "" && x.indexOf("#VALUE") === -1);

    return result;
  } catch(e) {
    return ["Error: " + String(e)];
  }
}

function getKeteranganOptions() {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sh = ss.getSheetByName("KETERANGAN");
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 1)
    .getDisplayValues()
    .flat()
    .map(v => String(v || "").trim())
    .filter(Boolean);
}

function getNamaTokoOptions() {
  
  try {
    const ss = SpreadsheetApp.openById(KARYAWAN_SS_ID);
    const sh = ss.getSheetByName('Nama Toko');
    if (!sh || sh.getLastRow() < 4) return [];
    const values = sh.getRange(4, 2, sh.getLastRow() - 3, 1)
      .getDisplayValues()
      .flat()
      .map(value => String(value || '').trim())
      .filter(Boolean);
    return [...new Set(values)];
  } catch(e) {
    return ["Error: " + String(e)];
  }
}

function normalizePhoneIndonesia_(value) {
  let phone = String(value || "").trim().replace(/[^\d+]/g, "");
  if (!phone) return "";
  if (phone.startsWith("+62")) phone = "0" + phone.slice(3);
  else if (phone.startsWith("62")) phone = "0" + phone.slice(2);
  else if (!phone.startsWith("0")) phone = "0" + phone;
  return phone;
}

function normalizeNopol_(value) {
  const compact = String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const match = compact.match(/^([A-Z]+)(\d+)([A-Z]+)$/);
  return match ? [match[1], match[2], match[3]].join(" ") : compact;
}

function getKaryawanPenerimaOptions() {
  
  try {
    const ss = SpreadsheetApp.openById(KARYAWAN_SS_ID);
    const sh = ss.getSheetByName('Data Karyawan');
    if (!sh) return [];

    const lastRow = sh.getLastRow();
    if (lastRow < 4) return [];

    // C = Nama Karyawan, R = No. HP, T = ID Karyawan.
    return sh.getRange(4, 3, lastRow - 3, 18)
      .getDisplayValues()
      .map(row => ({
        nama:String(row[0] || "").trim(),
        id:String(row[17] || "").trim(),
        hp:normalizePhoneIndonesia_(row[15])
      }))
      .filter(x => x.nama && x.nama.indexOf("#VALUE") === -1);
  } catch(e) {
    return [];
  }
}

function getDataLuarOptions() {
  const sourceId = "1KEX56T0Hje4Hv6uGYfEVw2F6xLqQf4ONNLc7Mj82Jnc";
  const sourceSs = SpreadsheetApp.openById(sourceId);
  const sh = sourceSs.getSheetByName("Data Luar");
  if (!sh || sh.getLastRow() < 4) return [];

  const rows = sh.getRange(4, 1, sh.getLastRow() - 3, 5).getDisplayValues(); // A:E
  const result = [];
  let currentNopol = "";
  let nextNumber = rows.reduce((max, row) => Math.max(max, Number(row[0]) || 0), 0) + 1;

  rows.forEach((row, index) => {
    const nopol = String(row[1] || "").trim();
    if (nopol) {
      if (!String(row[0] || "").trim()) {
        sh.getRange(index + 4, 1).setValue(nextNumber++);
      }
      currentNopol = nopol;
      // Nopol tanpa nama tetap dikirim agar langsung muncul di pilihan.
      if (!String(row[2] || "").trim()) result.push({ nopol:currentNopol, nama:"", hp:"" });
    }
    const nama = String(row[2] || "").trim();
    if (!currentNopol || !nama) return;
    result.push({
      nopol:currentNopol,
      nama:nama,
      hp:normalizePhoneIndonesia_(row[4])
    });
  });
  return result;
}

function addDataLuarOption(payload) {
  return addDataLuarFieldOption_(payload);
  // Implementasi lama tiga field dipertahankan sebagai referensi.
  payload = payload || {};
  const nopol = String(payload.nopol || "").trim().toUpperCase();
  const nama = String(payload.nama || "").trim();
  const confirmDuplicateName = payload.confirmDuplicateName === true;
  const hp = normalizePhoneIndonesia_(payload.hp);
  if (!nopol || !nama || !hp) {
    return { ok:false, msg:"Nopol, Nama Pengirim, dan No. HP wajib diisi." };
  }

  const sourceId = "1KEX56T0Hje4Hv6uGYfEVw2F6xLqQf4ONNLc7Mj82Jnc";
  const sh = SpreadsheetApp.openById(sourceId).getSheetByName("Data Luar");
  if (!sh) return { ok:false, msg:'Sheet "Data Luar" tidak ditemukan.' };

  const lastRow = Math.max(3, sh.getLastRow());
  const rows = lastRow >= 4 ? sh.getRange(4, 2, lastRow - 3, 4).getDisplayValues() : [];
  let activeNopol = "";
  const duplicate = rows.some(function(row) {
    if (String(row[0] || "").trim()) activeNopol = String(row[0]).trim();
    return activeNopol.toLowerCase() === nopol.toLowerCase() &&
      String(row[1] || "").trim().toLowerCase() === nama.toLowerCase() &&
      normalizePhoneIndonesia_(row[3]) === hp;
  });
  if (duplicate) return { ok:false, msg:"Data kendaraan/pengirim tersebut sudah ada." };

  const targetRow = lastRow + 1;
  sh.getRange(targetRow, 2).setValue(nopol); // B = Nopol
  sh.getRange(targetRow, 3).setValue(nama);  // C = Nama Sopir/Pengirim
  sh.getRange(targetRow, 5).setValue(hp);    // E = No. HP
  SpreadsheetApp.flush();
  return { ok:true, hp:hp, options:getDataLuarOptions() };
}

function addDataLuarFieldOption_(payload) {
  payload = payload || {};
  const type = String(payload.type || "").trim().toLowerCase();
  let value = String(payload.value || "").trim();
  const nopol = String(payload.nopol || "").trim().toUpperCase();
  const nama = String(payload.nama || "").trim();
  const phone = normalizePhoneIndonesia_(payload.phone);
  const confirmDuplicateName = payload.confirmDuplicateName === true;
  if (!['nopol', 'nama', 'hp'].includes(type) || !value) return { ok:false, msg:"Data tidak lengkap." };
  if (type === 'nama' && !phone) return { ok:false, msg:"No. HP Pengirim wajib diisi." };
  if (type === 'hp' && (!nopol || !nama)) return { ok:false, msg:"Pilih Nopol dan Nama Pengirim terlebih dahulu." };
  if (type === 'nopol') value = normalizeNopol_(value);
  if (type === 'hp') value = normalizePhoneIndonesia_(value);

  const sourceId = "1KEX56T0Hje4Hv6uGYfEVw2F6xLqQf4ONNLc7Mj82Jnc";
  const sh = SpreadsheetApp.openById(sourceId).getSheetByName("Data Luar");
  if (!sh) return { ok:false, msg:'Sheet "Data Luar" tidak ditemukan.' };
  const lastRow = Math.max(3, sh.getLastRow());
  const rows = lastRow >= 4 ? sh.getRange(4, 2, lastRow - 3, 4).getDisplayValues() : [];
  let activeNopol = "";

  if (type === 'nopol') {
    const exists = rows.some(row => normalizeNopol_(row[0]) === value);
    if (exists) return { ok:false, msg:"Nopol tersebut sudah ada." };
    const numbers = lastRow >= 4 ? sh.getRange(4, 1, lastRow - 3, 1).getValues().flat() : [];
    const nextNumber = numbers.reduce((max, item) => Math.max(max, Number(item) || 0), 0) + 1;
    sh.getRange(lastRow + 1, 1, 1, 2).setValues([[nextNumber, value]]);
  } else if (type === 'nama') {
    const names = rows.map(row => String(row[1] || '').trim()).filter(Boolean);
    const lowerNames = names.map(name => name.toLowerCase());
    const phoneExists = rows.some(row => normalizePhoneIndonesia_(row[3]) === phone);
    if (phoneExists) return { ok:false, msg:"No. HP tersebut sudah ada." };
    const exists = lowerNames.includes(value.toLowerCase());
    if (exists && !confirmDuplicateName) {
      let suffix = 1;
      let suggestedName = value + " -" + suffix;
      while (lowerNames.includes(suggestedName.toLowerCase())) {
        suffix++;
        suggestedName = value + " -" + suffix;
      }
      return { ok:false, needsNameConfirmation:true, suggestedName:suggestedName,
        msg:'Nama Sopir "' + value + '" sudah ada. Simpan sebagai "' + suggestedName + '"?' };
    }
    if (exists && confirmDuplicateName) {
      let suffix = 1;
      let suggestedName = value + " -" + suffix;
      while (lowerNames.includes(suggestedName.toLowerCase())) {
        suffix++;
        suggestedName = value + " -" + suffix;
      }
      value = suggestedName;
    }
    sh.getRange(lastRow + 1, 3, 1, 3).setValues([[value, "", phone]]);
  } else {
    const phoneExists = rows.some(row => normalizePhoneIndonesia_(row[3]) === value);
    if (phoneExists) return { ok:false, msg:"No. HP tersebut sudah ada." };
    let targetRow = null;
    rows.forEach(function(row, index) {
      if (String(row[0] || '').trim()) activeNopol = String(row[0]).trim();
      if (activeNopol.toLowerCase() === nopol.toLowerCase() &&
          String(row[1] || '').trim().toLowerCase() === nama.toLowerCase()) targetRow = index + 4;
    });
    if (!targetRow) return { ok:false, msg:"Data Nopol/Nama Pengirim tidak ditemukan." };
    sh.getRange(targetRow, 5).setValue(value);
  }

  return { ok:true, type:type, value:value, nopol:type === 'nopol' ? value : nopol,
    nama:type === 'nama' ? value : nama, hp:type === 'nama' ? phone : (type === 'hp' ? value : '') };
}

function addKeteranganOption(value) {
  const text = String(value || "").trim();
  if (!text) return { ok:false, msg:"Keterangan kosong" };
  const ss = SpreadsheetApp.openById(SS_ID);
  let sh = ss.getSheetByName("KETERANGAN");
  if (!sh) {
    sh = ss.insertSheet("KETERANGAN");
    sh.getRange(1, 1).setValue("KETERANGAN INUT BARANG");
  }
  const existing = sh.getLastRow() >= 2
    ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getDisplayValues().flat()
    : [];
  if (!existing.some(v => String(v || "").trim().toLowerCase() === text.toLowerCase())) {
    sh.getRange(sh.getLastRow() + 1, 1).setValue(text);
  }
  return { ok:true };
}

function updatePoKeterangan(payload) {
  ensurePoSheets_();

  payload = payload || {};
  const sentId = String(payload.sentId || "").trim();
  const items = Array.isArray(payload.items) ? payload.items : [];
  const isLocation = String(payload.poKind || '').toUpperCase() === 'LOKASI';
  const isPinjam = String(payload.poKind || '').toUpperCase() === 'PINJAM';
  if (!sentId) return { ok:false, msg:"Nomor PO kosong." };
  if (!items.length) return { ok:true, updated:0 };

  const clean = value => String(value || "").trim().toLowerCase();
  const itemMap = {};
  items.forEach(item => {
    const kode = clean(item.kode);
    if (!kode || Number(item.qtyMasuk || 0) !== 0) return;
    itemMap[kode] = {
      nama: clean(String(item.nama || "").split("/")[0]),
      keterangan: String(item.keterangan || "").trim()
    };
  });

  const targetCodes = Object.keys(itemMap);
  if (!targetCodes.length) return { ok:true, updated:0 };

  // Simpan pilihan pada data PO terkirim agar tetap tampil saat PO dibuka lagi.
  const ss = SpreadsheetApp.openById(SS_ID);
  const shItems = ss.getSheetByName(isLocation ? PO_LOKASI_SENT_ITEMS_SHEET : (isPinjam ? PO_PINJAM_SENT_ITEMS_SHEET : PO_SENT_ITEMS_SHEET));
  if (!shItems) return { ok:false, msg:"Sheet item PO terkirim tidak ditemukan." };

  const itemLastRow = shItems.getLastRow();
  if (itemLastRow >= 2) {
    const rows = shItems.getRange(2, 1, itemLastRow - 1, 11).getValues();
    let changed = false;
    rows.forEach(row => {
      const kode = clean(row[2]);
      if (clean(row[0]) === clean(sentId) && itemMap[kode]) {
        row[9] = itemMap[kode].keterangan;
        changed = true;
      }
    });
    if (changed) shItems.getRange(2, 1, rows.length, 11).setValues(rows);
  }

  // Isi kolom R (KETERANGAN) pada baris riwayat penerimaan terbaru.
  const rekapId = "1U6waJeIUpEBZq0zmOPsXgwEw-0mkMAXny55w9GCfn5k";
  const rekapName = isLocation ? 'PO Lokasi' : (isPinjam ? 'PO Pinjam' : 'PO Sby');
  const shRekap = SpreadsheetApp.openById(rekapId).getSheetByName(rekapName);
  if (!shRekap) return { ok:false, msg:'Sheet rekap "' + rekapName + '" tidak ditemukan.' };

  const lastRow = shRekap.getLastRow();
  if (lastRow < 6) return { ok:true, updated:0 };

  const rekapRows = shRekap.getRange(6, 5, lastRow - 5, 14).getDisplayValues();
  const latestRows = {};
  rekapRows.forEach((row, index) => {
    if (clean(row[0]) !== clean(sentId)) return; // E = nomor PO
    const nama = clean(String(row[3] || "").split("/")[0]); // H = uraian
    targetCodes.forEach(kode => {
      if (itemMap[kode].nama === nama) latestRows[kode] = index + 6;
    });
  });

  let updated = 0;
  targetCodes.forEach(kode => {
    const row = latestRows[kode];
    if (!row) return;
    shRekap.getRange(row, 18).setValue(itemMap[kode].keterangan);
    updated++;
  });

  return { ok:true, updated:updated };
}

function getPemesanLabel_(nama) {
  const list = getPemesanOptions();
  const found = list.find(x => String(x.nama).trim() === String(nama).trim());

  if (!found) return String(nama || "").trim();

  return found.jabatan
    ? `${found.nama} - ${found.jabatan}`
    : found.nama;
}

function addKodeLkhOption(value, keterangan) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sh = ss.getSheetByName("Kode LKH");
  if (!sh) return { ok:false, msg:"Sheet Kode LKH tidak ditemukan" };

  const lastRow = sh.getLastRow();
  let targetRow = 2;
  const values = sh.getRange(1, 1, Math.max(1, lastRow), 1).getValues().flat();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i] || "").trim() === "") {
      targetRow = i + 1;
      break;
    }
    if (i === values.length - 1) {
      targetRow = lastRow + 1;
    }
  }
  sh.getRange(targetRow, 1, 1, 2).setValues([[value, keterangan || ""]]);
  return { ok:true };
}

function addPemesanOption(value, jabatan) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sh = ss.getSheetByName("Kode LKH");
  if (!sh) return { ok:false, msg:"Sheet Kode LKH tidak ditemukan" };

  const lastRow = sh.getLastRow();
  let targetRow = 2;
  const values = sh.getRange(1, 4, Math.max(1, lastRow), 1).getValues().flat();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i] || "").trim() === "") {
      targetRow = i + 1;
      break;
    }
    if (i === values.length - 1) {
      targetRow = lastRow + 1;
    }
  }
  sh.getRange(targetRow, 4, 1, 2).setValues([[value, jabatan || ""]]);
  return { ok:true };
}

function addPeruntukanOption(value) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sh = ss.getSheetByName("Kode LKH");
  if (!sh) return { ok:false, msg:"Sheet Kode LKH tidak ditemukan" };

  const lastRow = sh.getLastRow();
  let targetRow = 2;
  const values = sh.getRange(1, 7, Math.max(1, lastRow), 1).getValues().flat();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i] || "").trim() === "") {
      targetRow = i + 1;
      break;
    }
    if (i === values.length - 1) {
      targetRow = lastRow + 1;
    }
  }
  sh.getRange(targetRow, 7).setValue(value);
  return { ok:true };
}

function getSheetByNameRobust_(ss, name) {
  let sh = ss.getSheetByName(name);
  if (sh) return sh;

  sh = ss.getSheetByName(name.trim());
  if (sh) return sh;

  const sheets = ss.getSheets();
  const searchName = name.toLowerCase().trim();
  for (let i = 0; i < sheets.length; i++) {
    const sName = sheets[i].getName().toLowerCase().trim();
    if (sName === searchName || sName.indexOf(searchName) !== -1 || searchName.indexOf(sName) !== -1) {
      return sheets[i];
    }
  }
  return null;
}

// force sync 1785926505784


module.exports = {
  doGet,
  include,
  getDashboardData,
  getQrBarangDetail,
  getPublicQrBarangData_,
  forceRefreshDashboardData,
  getInitData,
  getSheetLinks,
  getKodeLkhOptions,
  getDashboardData_,
  getPhotoMapByGudang_,
  getAlfaPhotoMap_,
  getPhotoFolderByGudang_,
  getAlfaPhotoFolder_,
  getPhotoMapCacheKey_,
  testFolderFotoAlfa,
  testFolderFotoSemuaGudang,
  uploadBarangPhoto_,
  updateBarangPhoto,
  deleteBarangPhoto,
  deleteBarangPhotoFiles_,
  updateBarangDetail,
  checkEditKodeBarang,
  getNextAvailableKodeBarang_,
  findGudangRowByKode_,
  prepareInsertGudangRow_,
  writeBarangDetailRow_,
  sortAndRefreshGudang_,
  renameOrMoveBarangPhotos_,
  getPhotoExtension_,
  sanitizeFileName_,
  safeCachePut_,
  mapHeader_,
  extractUrlFromCell_,
  toNumberSafe_,
  transaksiMasuk,
  transaksiKeluar,
  transaksiRusak,
  transaksiHilang,
  transaksiCore_,
  validateTransaksi_,
  updateStokGudang_,
  getSheetLinks_,
  getGudangPrefix_,
  findGudangDataLastRow_,
  findHeaderIndexesByText_,
  ensurePoSheets_,
  generatePoCustomId_,
  getPoDraftsAndSent,
  saveDraftPo,
  sendPo,
  sendPoLokasi,
  generatePoLokasiId_,
  normalizePoLokasiIds_,
  repairPoLokasiRekap,
  sendPoMoveDraft_,
  saveDraftPoCore_,
  deleteItemsById_,
  getDraftItems,
  getSentItems,
  getLocationSentItems,
  savePoCore_,
  readPoHead_,
  buildSatMap_,
  readPoItems_,
  getPoInputSummary_,
  getPoInputHistory,
  correctPoInputTransaction,
  findBarangByKode_,
  uploadFotosPenerimaan_,
  getPenerimaanPeriod_,
  getPenerimaanSequence_,
  inputSentToBarangMasuk,
  getNextPenerimaanNumbers,
  makePoLabel_,
  applyBanding_,
  deleteHeadById_,
  deletePoByMode,
  getNextKodeBarang,
  addBarangBaru,
  columnToLetter_,
  refreshGudangFormulas_,
  findHeaderColumnByWords_,
  refreshSemuaRumusStokGudang,
  findHeaderIndexesByText_,
  formatPoWhatsappMessage_,
  formatPoDraftWhatsappMessage_,
  sendWahaGroupMessage_,
  testWahaPermission,
  testSendWaha,
  hapusRekapBySentId_,
  getReviewRekapPo,
  updateRekapJumlahMasuk_,
  getPemesanOptions,
  getLokasiOptions,
  getPeruntukanOptions,
  getKeteranganOptions,
  getNamaTokoOptions,
  normalizePhoneIndonesia_,
  normalizeNopol_,
  getKaryawanPenerimaOptions,
  getDataLuarOptions,
  addDataLuarOption,
  addDataLuarFieldOption_,
  addKeteranganOption,
  updatePoKeterangan,
  getPemesanLabel_,
  addKodeLkhOption,
  addPemesanOption,
  addPeruntukanOption,
  getSheetByNameRobust_
};


function warmUpAllCaches() {
  SpreadsheetApp.openById(SS_ID);
  SpreadsheetApp.openById(KARYAWAN_SS_ID);
  SpreadsheetApp.openById(SS_REKAP_ID);
  return { ok: true };
}
