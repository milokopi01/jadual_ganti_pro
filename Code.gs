/**
 * SISTEM RELEF GURU - Google Apps Script
 * Cara guna:
 * 1. Buka Google Sheet baharu > Extensions > Apps Script.
 * 2. Tampal kod ini dalam Code.gs, dan cipta fail HTML bernama "index" (tampal index.html).
 * 3. Deploy > New deployment > Web app > Execute as: Me, Access: Anyone (atau dalam organisasi).
 * Rekod relef akan disimpan dalam helaian "REKOD_RELEF".
 */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Sistem Relef Guru')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function helaian_(nama, tajuk) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(nama);
  if (!sh) {
    sh = ss.insertSheet(nama);
    if (tajuk) {
      sh.appendRow(tajuk);
      sh.getRange(1, 1, 1, tajuk.length).setFontWeight('bold').setBackground('#0f5c4a').setFontColor('#ffffff');
      sh.setFrozenRows(1);
    }
  }
  return sh;
}

/** Simpan data jadual ASC (JSON) supaya semua pentadbir guna data yang sama */
function simpanDataAsc(json) {
  const sh = helaian_('DATA_ASC_JSON');
  sh.clear();
  const potong = 45000, bahagian = [];
  for (let i = 0; i < json.length; i += potong) bahagian.push([json.substring(i, i + potong)]);
  sh.getRange(1, 1, bahagian.length, 1).setValues(bahagian);
  return true;
}

function ambilDataAsc() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('DATA_ASC_JSON');
  if (!sh || sh.getLastRow() === 0) return '';
  return sh.getRange(1, 1, sh.getLastRow(), 1).getValues().map(r => r[0]).join('');
}

/** Simpan jadual relef bagi satu tarikh (rekod lama tarikh sama akan diganti) */
function simpanRelef(tarikh, baris) {
  const tajuk = ['Tarikh', 'Hari', 'Waktu', 'Kelas', 'Subjek', 'Guru Tidak Hadir', 'Guru Ganti', 'Singkatan', 'Disimpan Pada'];
  const sh = helaian_('REKOD_RELEF', tajuk);
  const data = sh.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    const t = data[i][0] instanceof Date ? Utilities.formatDate(data[i][0], Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(data[i][0]);
    if (t === tarikh) sh.deleteRow(i + 1);
  }
  const kini = new Date();
  const rows = baris.map(b => ["'" + tarikh, b.hari, b.waktu, b.kelas, b.subjek, b.guruAsal, b.namaPengganti || 'BELUM ADA', b.pengganti || '', kini]);
  if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, tajuk.length).setValues(rows);
  return rows.length;
}
