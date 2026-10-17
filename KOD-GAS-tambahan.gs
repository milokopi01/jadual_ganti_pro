// Tambah fungsi ini ke dalam Code.gs (Google Apps Script) supaya butang
// "Ambil dari Google Drive" boleh terus membaca fail aSc dari Drive anda.
function ambilFailDrive(id) {
  var blob = DriveApp.getFileById(id).getBlob();
  if (blob.getContentType() === MimeType.GOOGLE_SHEETS) {
    var url = 'https://docs.google.com/spreadsheets/d/' + id + '/export?format=xlsx';
    blob = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } }).getBlob();
  }
  return Utilities.base64Encode(blob.getBytes());
}
