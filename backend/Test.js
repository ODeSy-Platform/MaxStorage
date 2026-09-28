function updateModulesSheet_() {
  const ss = SpreadsheetApp.openById('1bM98ecqLd8mV0mez1TGftOwv9-l4fNTHmt527z9v03s');
  
  const sheetModules = ss.getSheetByName('MODULES');
  if (!sheetModules) return;
  
  // Create a map of module names to module IDs
  const modData = sheetModules.getDataRange().getValues();
  const modMap = {}; // name -> id
  // Skip header row
  for (let i = 1; i < modData.length; i++) {
    const id = String(modData[i][0]).trim();
    const name = String(modData[i][2]).trim();
    modMap[name] = id;
  }
  
  let sheet = ss.getSheetByName('SUBMODULES');
  if (!sheet) {
    sheet = ss.insertSheet('SUBMODULES');
    const headers = ['module_id', 'category', 'menu_name', 'url'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    
    // Default Data using actual IDs from the spreadsheet
    const gudangId = modMap['Gudang'] || 'MOD001';
    // If the user's spreadsheet actually contains 'Budidaya'
    const budidayaId = modMap['Budidaya'] || modMap['Pakan'] || 'MOD002';
    
    const data = [
      [gudangId, 'Aplikasi', 'PO/Keluar Masuk Barang', 'https://script.google.com/macros/s/xxx/exec?page=po'],
      [gudangId, 'Aplikasi', 'Pemakaian Barang', 'https://script.google.com/macros/s/xxx/exec?page=pemakaian'],
      [gudangId, 'Stok Opname (SO)', 'Stok Opname', 'https://script.google.com/macros/s/xxx/exec?page=so'],
      [gudangId, 'Laporan', 'Laporan Gudang', 'https://script.google.com/macros/s/xxx/exec?page=laporan_gudang'],
      
      [budidayaId, 'Aplikasi', 'Pakan Harian', 'https://script.google.com/macros/s/xxx/exec?page=pakan'],
      [budidayaId, 'Aplikasi', 'Saprotam Mingguan', 'https://script.google.com/macros/s/xxx/exec?page=saprotam'],
      [budidayaId, 'Laboratorium', 'Uji Lab', 'https://script.google.com/macros/s/xxx/exec?page=lab']
    ];
    
    sheet.getRange(2, 1, data.length, 4).setValues(data);
  } else {
    // If SUBMODULES exists but is empty or missing data, we can also overwrite it, but let's not touch if it exists.
  }
}

// touch