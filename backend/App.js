/**
 * ODeSy - Portal Dashboard
 * File: App.gs
 * Fungsi: Menerima request HTTP (Web App) dan merender file HTML.
 */

function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'update_modules') {
    updateModulesSheet_();
    return ContentService.createTextOutput('✅ BERHASIL: Sheet SUBMODULES telah ditambahkan ke Spreadsheet Mas dengan struktur 3 Tingkat. Silakan cek Spreadsheet-nya sekarang!');
  }

  // Buka file Index.html dari folder Frontend
  const template = HtmlService.createTemplateFromFile('Frontend/Index');
  // Pass variables required by BootScreen
  template.appTitle = APP_TITLE;
  template.buildVersion = typeof APP_BUILD !== 'undefined' ? APP_BUILD : '1.0.0';
  template.logoDataUri = LOGO_DATA_URI;
  template.introVideoDataUri = INTRO_VIDEO_DATA_URI;
  template.awalTextDataUri = AWAL_TEXT_DATA_URI;

  // Render halaman
  return template.evaluate()
    .setTitle('ODeSy - Enterprise Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=1280, initial-scale=0.35, minimum-scale=0.1, maximum-scale=5.0, user-scalable=yes');
}

/**
 * Fungsi helper agar kita bisa memecah file HTML besar menjadi file kecil.
 * Memungkinkan pemanggilan <?!= include('Frontend/Styles'); ?> di dalam Index.html.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
