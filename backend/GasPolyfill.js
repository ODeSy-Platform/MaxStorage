const { google } = require('googleapis');
const deasync = require('deasync');

class GasPolyfill {
  constructor(auth) {
    this.sheets = google.sheets({ version: 'v4', auth });
    this.drive = google.drive({ version: 'v3', auth });
    
    this.SpreadsheetApp = new SpreadsheetAppProxy(this.sheets);
    this.DriveApp = new DriveAppProxy(this.drive);
    this.Utilities = new UtilitiesProxy();
    this.CacheService = new CacheServiceProxy();
    this.Session = new SessionProxy();
  }
}

class SpreadsheetAppProxy {
  constructor(sheetsApi) {
    this.sheetsApi = sheetsApi;
    this.CopyPasteType = { PASTE_NORMAL: 'PASTE_NORMAL', PASTE_VALUES: 'PASTE_VALUES' };
    this.BandingTheme = { LIGHT_GREY: 'LIGHT_GREY' };
  }
  
  openById(id) {
    const cacheFile = require('path').resolve(__dirname, 'ss_cache_' + id + '.json');
    let resData = null;
    
    try {
      if (require('fs').existsSync(cacheFile)) {
        const stats = require('fs').statSync(cacheFile);
        undefined
      }
    } catch (e) {}
    
    if (!resData) {
      let done = false, err;
      this.sheetsApi.spreadsheets.get({ 
        spreadsheetId: id, 
        includeGridData: true,
        fields: 'sheets(properties(sheetId,title),data(rowData(values(userEnteredValue,formattedValue))))'
      })
        .then(r => { resData = r.data; done = true; })
        .catch(e => { err = e; done = true; });
      deasync.loopWhile(() => !done);
      if (err) throw new Error(`SpreadsheetApp.openById failed: ${err.message}`);
      
      try { require('fs').writeFileSync(cacheFile, JSON.stringify(resData), 'utf8'); } catch (e) {}
    }
    
    return new SpreadsheetProxy(this.sheetsApi, id, resData);
  }
  
  flush() {
    // No-op in REST API, as writes are usually immediate
  }
}

class SpreadsheetProxy {
  constructor(sheetsApi, id, data) {
    this.sheetsApi = sheetsApi;
    this.id = id;
    this.data = data;
  }
  
  getSheetByName(name) {
    const sheet = this.data.sheets.find(s => s.properties.title === name);
    if (!sheet) return null;
    return new SheetProxy(this.sheetsApi, this.id, name, sheet.properties.sheetId, this.data);
  }
}

class SheetProxy {
  constructor(sheetsApi, ssId, name, sheetId, data) {
    this.sheetsApi = sheetsApi;
    this.ssId = ssId;
    this.name = name;
    this.sheetId = sheetId;
    this.data = data;
  }
  
  getLastRow() {
    const sheetData = this.getParent().data.sheets.find(s => s.properties.sheetId === this.sheetId);
    if (!sheetData || !sheetData.data || !sheetData.data[0].rowData) return 0;
    const rowData = sheetData.data[0].rowData;
    for (let i = rowData.length - 1; i >= 0; i--) {
      const row = rowData[i].values;
      if (row && row.some(col => col.formattedValue || col.userEnteredValue)) {
        return i + 1;
      }
    }
    return 0;
  }
  
  getMaxRows() {
    return this.getLastRow() + 100;
  }
  
  deleteRow(rowPosition) { return this; }
  insertRowsBefore(beforePosition, howMany) { return this; }
  insertRowBefore(beforePosition) { return this; }
  insertRowAfter(afterPosition) { return this; }
  insertColumnBefore(beforePosition) { return this; }
  setFrozenRows(rows) { return this; }
  getBandings() { return []; }
  getSheetId() { return this.sheetId; }
  getParent() { return new SpreadsheetProxy(this.sheetsApi, this.ssId, this.data); }
  
  getLastColumn() {
    const sheetData = this.getParent().data.sheets.find(s => s.properties.sheetId === this.sheetId);
    if (!sheetData || !sheetData.data || !sheetData.data[0].rowData) return 0;
    const rowData = sheetData.data[0].rowData;
    let maxCol = 0;
    for (const row of rowData) {
      if (row.values) {
        for (let i = row.values.length - 1; i >= 0; i--) {
          const col = row.values[i];
          if (col.formattedValue || col.userEnteredValue) {
            maxCol = Math.max(maxCol, i + 1);
            break;
          }
        }
      }
    }
    return maxCol;
  }
  
  getRange(row, col, numRows = 1, numCols = 1) {
    if (typeof row === 'string') {
      return new RangeProxy(this.sheetsApi, this.ssId, this.name, row, null, this.data);
    }
    const a1Notation = 'A1:Z'; // Simplification, not used deeply if we have dims
    const dims = { row, col, numRows, numCols };
    return new RangeProxy(this.sheetsApi, this.ssId, this.name, a1Notation, dims, this.data);
  }
  
  _colToLetter(column) {
    let temp, letter = '';
    while (column > 0) {
      temp = (column - 1) % 26;
      letter = String.fromCharCode(temp + 65) + letter;
      column = (column - temp - 1) / 26;
    }
    return letter;
  }
}

class RangeProxy {
  constructor(sheetsApi, ssId, sheetName, a1Notation, dims = null, data = null) {
    this.sheetsApi = sheetsApi;
    this.ssId = ssId;
    this.sheetName = sheetName;
    this.a1Notation = a1Notation;
    this.dims = dims; // Optional numeric dimensions
    this.data = data;
  }
  
  _extractData(type) {
    const sht = new SheetProxy(this.sheetsApi, this.ssId, this.sheetName, null, this.data);
    const parent = sht.getParent();
    const sheetData = parent.data.sheets.find(s => s.properties.title === this.sheetName);
    
    let startRow = 0, startCol = 0, numRows = 1000, numCols = 26;
    if (this.dims) {
      startRow = this.dims.row - 1;
      startCol = this.dims.col - 1;
      numRows = this.dims.numRows;
      numCols = this.dims.numCols;
    } else {
      // Very naive A1 parser for fallback
      const match = this.a1Notation.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
      if (match) {
        startCol = this._letterToCol(match[1]) - 1;
        startRow = parseInt(match[2]) - 1;
        numCols = this._letterToCol(match[3]) - startCol;
        numRows = parseInt(match[4]) - startRow;
      }
    }
    
    const result = [];
    if (!sheetData || !sheetData.data || !sheetData.data[0].rowData) return result;
    const rowData = sheetData.data[0].rowData;
    
    for (let r = 0; r < numRows; r++) {
      const rowIdx = startRow + r;
      const rowVals = [];
      const cols = (rowData[rowIdx] && rowData[rowIdx].values) ? rowData[rowIdx].values : [];
      
      for (let c = 0; c < numCols; c++) {
        const colIdx = startCol + c;
        const cell = cols[colIdx];
        if (!cell) {
          rowVals.push("");
          continue;
        }
        
        if (type === 'formula' && cell.userEnteredValue && cell.userEnteredValue.formulaValue) {
          rowVals.push(cell.userEnteredValue.formulaValue);
        } else if (type === 'display' && cell.formattedValue !== undefined) {
          rowVals.push(cell.formattedValue);
        } else if (cell.userEnteredValue) {
          rowVals.push(cell.userEnteredValue.stringValue || cell.userEnteredValue.numberValue || cell.userEnteredValue.boolValue || "");
        } else {
          rowVals.push("");
        }
      }
      result.push(rowVals);
    }
    return result;
  }
  
  _letterToCol(letter) {
    let col = 0;
    for (let i = 0; i < letter.length; i++) {
      col = col * 26 + (letter.charCodeAt(i) - 64);
    }
    return col;
  }

  getValues() { return this._extractData('value'); }
  getDisplayValues() { return this._extractData('display'); }
  getFormulas() { return this._extractData('formula'); }
  
  getValue() {
    const vals = this.getValues();
    return vals.length > 0 && vals[0].length > 0 ? vals[0][0] : "";
  }
  
  setValues(values) {
    let done = false, err;
    this.sheetsApi.spreadsheets.values.update({
      spreadsheetId: this.ssId,
      range: `${this.sheetName}!${this.a1Notation}`,
      valueInputOption: 'USER_ENTERED',
      resource: { values }
    }).then(() => { done = true; }).catch(e => { err = e; done = true; });
    deasync.loopWhile(() => !done);
    if (err) throw err;
    return this;
  }
  
  setValue(val) {
    return this.setValues([[val]]);
  }
  
  clearContent() {
    let done = false, err;
    this.sheetsApi.spreadsheets.values.clear({
      spreadsheetId: this.ssId,
      range: `${this.sheetName}!${this.a1Notation}`,
    }).then(() => { done = true; }).catch(e => { err = e; done = true; });
    deasync.loopWhile(() => !done);
    if (err) throw err;
    return this;
  }
  
  offset(rowOffset, colOffset, numRows, numCols) {
    if (!this.dims) throw new Error("offset not supported for string ranges yet");
    const newRow = this.dims.row + rowOffset;
    const newCol = this.dims.col + colOffset;
    const nr = numRows || this.dims.numRows;
    const nc = numCols || this.dims.numCols;
    const sht = new SheetProxy(this.sheetsApi, this.ssId, this.sheetName, null);
    return sht.getRange(newRow, newCol, nr, nc);
  }
  
  copyTo(destRange, options) {
    // Advanced copyTo - naive implementation for values only
    const vals = this.getValues();
    destRange.setValues(vals);
  }
  
  setBackground(color) { return this; }
  setFontWeight(weight) { return this; }
  applyRowBanding() { return this; }
}

class DriveAppProxy {
  constructor(driveApi) {
    this.driveApi = driveApi;
    this.Access = { ANYONE_WITH_LINK: 'ANYONE_WITH_LINK' };
    this.Permission = { VIEW: 'VIEW' };
  }
  getFolderById(id) {
    return new FolderProxy(this.driveApi, id);
  }
  getFoldersByName(name) {
    let done = false, files, err;
    this.driveApi.files.list({
      q: `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)'
    }).then(r => { files = r.data.files || []; done = true; })
      .catch(e => { err = e; done = true; });
    deasync.loopWhile(() => !done);
    if (err) throw err;
    
    let idx = 0;
    return {
      hasNext: () => idx < files.length,
      next: () => new FolderProxy(this.driveApi, files[idx++].id)
    };
  }
}

class FolderProxy {
  constructor(driveApi, id) {
    this.driveApi = driveApi;
    this.id = id;
  }
  createFile(blob) {
    // Simplified stub
    console.log("Mock createFile in folder", this.id);
    return new FileProxy(this.driveApi, "mock_file_id");
  }
  getFilesByName(name) {
    return { hasNext: () => false };
  }
  getFiles() {
    let done = false, resFiles = [], err;
    this.driveApi.files.list({
      q: `'${this.id}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, modifiedTime)',
      pageSize: 1000
    }).then(r => { resFiles = r.data.files || []; done = true; })
      .catch(e => { err = e; done = true; });
    deasync.loopWhile(() => !done);
    if (err) throw err;
    
    let index = 0;
    return {
      hasNext: () => index < resFiles.length,
      next: () => {
        const file = resFiles[index++];
        return {
          getName: () => file.name,
          getId: () => file.id,
          getMimeType: () => file.mimeType,
          getLastUpdated: () => new Date(file.modifiedTime || Date.now())
        };
      }
    };
  }
}

class FileProxy {
  constructor(driveApi, id) {
    this.driveApi = driveApi;
    this.id = id;
  }
  setSharing() { return this; }
  getUrl() { return `https://drive.google.com/file/d/${this.id}/view`; }
  setTrashed(val) { return this; }
}

class UtilitiesProxy {
  formatDate(date, tz, format) {
    // Simple mock using toISOString
    return date.toISOString();
  }
  newBlob(data, mime, name) {
    return { data, mime, name };
  }
}

class CacheServiceProxy {
  constructor() {
    this.cacheFile = require('path').resolve(__dirname, 'script_cache.json');
  }
  
  _load() {
    try {
      if (require('fs').existsSync(this.cacheFile)) {
        return JSON.parse(require('fs').readFileSync(this.cacheFile, 'utf8'));
      }
    } catch (e) {}
    return {};
  }
  
  _save(data) {
    try {
      require('fs').writeFileSync(this.cacheFile, JSON.stringify(data), 'utf8');
    } catch (e) {}
  }
  
  getScriptCache() {
    const self = this;
    return {
      get: (k) => {
        const data = self._load();
        const item = data[k];
        if (!item) return null;
        if (Date.now() > item.expiresAt) {
          delete data[k];
          self._save(data);
          return null;
        }
        return item.value;
      },
      put: (k, v, expirationInSeconds = 600) => {
        const data = self._load();
        data[k] = {
          value: v,
          expiresAt: Date.now() + (expirationInSeconds * 1000)
        };
        self._save(data);
      },
      remove: (k) => {
        const data = self._load();
        delete data[k];
        self._save(data);
      }
    };
  }
}

class SessionProxy {
  getActiveUser() {
    return { getEmail: () => "vps_admin@odesy.com" };
  }
}

module.exports = GasPolyfill;
