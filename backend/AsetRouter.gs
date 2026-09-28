/**
 * Fungsi ini digunakan untuk menampilkan Dashboard Aset
 * URL Apps Script nantinya akan menampilkan HTML dari Dashboard_Aset.html
 */
function doGet_Aset(e) {
  return HtmlService.createHtmlOutputFromFile('Frontend/Dashboard_Aset')
    .setTitle('Dashboard Manajemen Aset')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-width=1');
}
