/**
 * ============================================================================
 *  KBM GENERUS MAGELANG BARAT — BACKEND (Google Apps Script + Google Sheets)
 * ============================================================================
 *  CARA PASANG:
 *  1. Buka https://sheet.new untuk membuat spreadsheet baru.
 *     Beri nama, misal: "DB KBM Generus Magelang Barat".
 *  2. Di spreadsheet itu, buka menu Extensions → Apps Script.
 *  3. Hapus semua isi editor, lalu tempel SELURUH isi file ini.
 *  4. Jalankan fungsi `setupSheets` sekali (pilih dari dropdown function lalu
 *     klik Run). Ini akan membuat semua tab & header otomatis + akun demo.
 *  5. Klik Deploy → New deployment → pilih tipe "Web app".
 *     - Execute as: Me
 *     - Who has access: Anyone
 *  6. Salin URL Web App yang muncul (diakhiri /exec), lalu tempel ke
 *     halaman "Hubungkan ke Google Sheets" pada aplikasi web-nya.
 *  7. Akun demo awal:
 *       Admin Master   -> username: admin       | password: admin123
 *       Admin Kelompok -> username: sukorejo     | password: admin123
 * ============================================================================
 */

const SHEET_NAMES = {
  USERS: 'Users',
  GROUPS: 'Groups',
  LEVELS: 'Levels',
  STUDENTS: 'Students',
  ATTENDANCE: 'Attendance',
  AUDIT: 'AuditLog',
};

const SCHEMAS = {
  Users: ['id','name','username','password_hash','role','group_id','status','created_at'],
  Groups: ['id','group_code','group_name','region','dusun','address','admin_name','admin_wa','status','created_at'],
  Levels: ['id','name','category','order_number'],
  Students: ['id','member_code','name','nickname','gender','birth_place','birth_date','address','wa','parent_name','parent_wa','group_id','level','class','status','photo_url','biometric_id','join_date','notes','created_at'],
  Attendance: ['id','generus_id','group_id','date','time','status','method','notes','recorded_by','created_at','updated_at'],
  AuditLog: ['id','user_id','user_name','action','table_name','record_id','description','created_at'],
};

// ---------------------------------------------------------------------------
// SETUP (jalankan sekali secara manual dari editor Apps Script)
// ---------------------------------------------------------------------------
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SCHEMAS).forEach(function (name) {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    sh.clear();
    sh.getRange(1, 1, 1, SCHEMAS[name].length).setValues([SCHEMAS[name]]);
    sh.setFrozenRows(1);
  });
  const def = ss.getSheetByName('Sheet1');
  if (def) ss.deleteSheet(def);

  // Data awal: level jenjang standar
  const levelSheet = ss.getSheetByName('Levels');
  const levels = [
    ['lv01','PAUD','CABERAWIT',1],['lv02','TK','CABERAWIT',2],
    ['lv03','Kelas 1','CABERAWIT',3],['lv04','Kelas 2','CABERAWIT',4],
    ['lv05','Kelas 3','CABERAWIT',5],['lv06','Kelas 4','CABERAWIT',6],
    ['lv07','Kelas 5','CABERAWIT',7],['lv08','Kelas 6','CABERAWIT',8],
    ['lv09','Pra Remaja Kelas 1','PRA REMAJA',9],['lv10','Pra Remaja Kelas 2','PRA REMAJA',10],
    ['lv11','Pra Remaja Kelas 3','PRA REMAJA',11],
    ['lv12','Remaja Kelas 1','REMAJA',12],['lv13','Remaja Kelas 2','REMAJA',13],
    ['lv14','Remaja Kelas 3','REMAJA',14],
    ['lv15','Mahasiswa','PRA NIKAH',15],['lv16','Non Mahasiswa','PRA NIKAH',16],
  ];
  levelSheet.getRange(2, 1, levels.length, 4).setValues(levels);

  // Kelompok contoh
  const groupSheet = ss.getSheetByName('Groups');
  const now = new Date().toISOString();
  groupSheet.getRange(2, 1, 1, 10).setValues([[
    'grp01','MGB-01','Kelompok Sukorejo','Magelang Barat','Sukorejo','Jl. Sukorejo No. 12',
    'Bu Sukorejo','628123456789','aktif', now
  ]]);

  // Akun demo
  const userSheet = ss.getSheetByName('Users');
  userSheet.getRange(2, 1, 2, 8).setValues([
    ['usr01','Admin Master','admin', hashPassword_('admin123'), 'admin_master', '', 'aktif', now],
    ['usr02','Admin Sukorejo','sukorejo', hashPassword_('admin123'), 'admin_kelompok', 'grp01', 'aktif', now],
  ]);

  SpreadsheetApp.getUi().alert('Setup selesai! Tab & akun demo sudah dibuat.');
}

// ---------------------------------------------------------------------------
// ENTRY POINTS
// ---------------------------------------------------------------------------
function doGet(e) {
  return handleRequest_(e);
}
function doPost(e) {
  return handleRequest_(e);
}

function handleRequest_(e) {
  let body = {};
  try {
    if (e.postData && e.postData.contents) body = JSON.parse(e.postData.contents);
    else if (e.parameter && e.parameter.payload) body = JSON.parse(e.parameter.payload);
  } catch (err) {
    return jsonOut_({ ok: false, error: 'Payload tidak valid: ' + err.message });
  }
  const action = body.action || (e.parameter && e.parameter.action);
  const payload = body.payload || {};

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const result = routeAction_(action, payload);
    return jsonOut_({ ok: true, data: result });
  } catch (err) {
    return jsonOut_({ ok: false, error: err.message });
  } finally {
    lock.releaseLock();
  }
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function routeAction_(action, p) {
  switch (action) {
    case 'login': return login_(p.username, p.password);
    case 'bootstrap': return bootstrap_();

    case 'listGroups': return getAll_('Groups');
    case 'createGroup': return createRow_('Groups', p, p.actor);
    case 'updateGroup': return updateRow_('Groups', p.id, p, p.actor);
    case 'deleteGroup': return deleteRow_('Groups', p.id, p.actor);

    case 'listUsers': return getAll_('Users').map(stripPassword_);
    case 'createUser': p.password_hash = hashPassword_(p.password || '123456'); return stripPassword_(createRow_('Users', p, p.actor));
    case 'updateUser':
      if (p.password) p.password_hash = hashPassword_(p.password);
      return stripPassword_(updateRow_('Users', p.id, p, p.actor));
    case 'deleteUser': return deleteRow_('Users', p.id, p.actor);

    case 'listLevels': return getAll_('Levels');

    case 'listStudents': return getAll_('Students');
    case 'createStudent': return createRow_('Students', p, p.actor);
    case 'updateStudent': return updateRow_('Students', p.id, p, p.actor);
    case 'deleteStudent': return deleteRow_('Students', p.id, p.actor);

    case 'listAttendance': return listAttendance_(p);
    case 'saveAttendanceBulk': return saveAttendanceBulk_(p.records, p.actor);

    case 'listAuditLog': return getAll_('AuditLog').reverse().slice(0, 300);

    default: throw new Error('Aksi tidak dikenal: ' + action);
  }
}

// ---------------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------------
function login_(username, password) {
  const users = getAll_('Users');
  const hash = hashPassword_(password);
  const u = users.find(function (x) {
    return x.username === username && x.password_hash === hash && x.status === 'aktif';
  });
  if (!u) throw new Error('Username atau password salah.');
  writeAudit_(u.id, u.name, 'login', 'Users', u.id, 'Login ke sistem');
  return stripPassword_(u);
}

function hashPassword_(pw) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(pw));
  return digest.map(function (b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
}

function stripPassword_(u) {
  if (!u) return u;
  const copy = Object.assign({}, u);
  delete copy.password_hash;
  return copy;
}

function bootstrap_() {
  return {
    groups: getAll_('Groups'),
    levels: getAll_('Levels'),
    students: getAll_('Students'),
  };
}

// ---------------------------------------------------------------------------
// GENERIC SHEET CRUD
// ---------------------------------------------------------------------------
function getSheet_(name) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('Tab sheet "' + name + '" tidak ditemukan. Jalankan setupSheets().');
  return sh;
}

function getAll_(name) {
  const sh = getSheet_(name);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1)
    .filter(function (row) { return row.some(function (c) { return c !== ''; }); })
    .map(function (row) {
      const obj = {};
      headers.forEach(function (h, i) { obj[h] = row[i]; });
      return obj;
    });
}

function createRow_(name, data, actorName) {
  const sh = getSheet_(name);
  const headers = SCHEMAS[name];
  data.id = data.id || (name.substring(0,3).toLowerCase() + '_' + Utilities.getUuid().split('-')[0]);
  data.created_at = new Date().toISOString();
  const row = headers.map(function (h) { return data[h] !== undefined ? data[h] : ''; });
  sh.appendRow(row);
  writeAudit_(data.actor_id || '', actorName || 'system', 'create', name, data.id, 'Menambah data di ' + name);
  return data;
}

function findRowIndex_(sh, id) {
  const values = sh.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === id) return i + 1; // 1-indexed sheet row
  }
  return -1;
}

function updateRow_(name, id, data, actorName) {
  const sh = getSheet_(name);
  const headers = SCHEMAS[name];
  const rowIdx = findRowIndex_(sh, id);
  if (rowIdx === -1) throw new Error('Data dengan id ' + id + ' tidak ditemukan di ' + name);
  const current = {};
  const currentValues = sh.getRange(rowIdx, 1, 1, headers.length).getValues()[0];
  headers.forEach(function (h, i) { current[h] = currentValues[i]; });
  const merged = Object.assign({}, current, data);
  if (headers.indexOf('updated_at') > -1) merged.updated_at = new Date().toISOString();
  const row = headers.map(function (h) { return merged[h] !== undefined ? merged[h] : ''; });
  sh.getRange(rowIdx, 1, 1, headers.length).setValues([row]);
  writeAudit_(data.actor_id || '', actorName || 'system', 'update', name, id, 'Mengubah data di ' + name);
  return merged;
}

function deleteRow_(name, id, actorName) {
  const sh = getSheet_(name);
  const rowIdx = findRowIndex_(sh, id);
  if (rowIdx === -1) throw new Error('Data dengan id ' + id + ' tidak ditemukan di ' + name);
  sh.deleteRow(rowIdx);
  writeAudit_('', actorName || 'system', 'delete', name, id, 'Menghapus data di ' + name);
  return { id: id, deleted: true };
}

// ---------------------------------------------------------------------------
// ATTENDANCE
// ---------------------------------------------------------------------------
function listAttendance_(filter) {
  let rows = getAll_('Attendance');
  if (filter.date) rows = rows.filter(function (r) { return r.date === filter.date; });
  if (filter.group_id) rows = rows.filter(function (r) { return r.group_id === filter.group_id; });
  if (filter.from) rows = rows.filter(function (r) { return r.date >= filter.from; });
  if (filter.to) rows = rows.filter(function (r) { return r.date <= filter.to; });
  if (filter.generus_id) rows = rows.filter(function (r) { return r.generus_id === filter.generus_id; });
  return rows;
}

// Satu generus hanya boleh punya satu absensi per tanggal -> upsert
function saveAttendanceBulk_(records, actorName) {
  const sh = getSheet_('Attendance');
  const values = sh.getDataRange().getValues();
  const headers = values[0];
  const idIdx = headers.indexOf('id');
  const genIdx = headers.indexOf('generus_id');
  const dateIdx = headers.indexOf('date');

  const existingKey = {}; // "generusId|date" -> rowNumber
  for (let i = 1; i < values.length; i++) {
    const key = values[i][genIdx] + '|' + values[i][dateIdx];
    if (values[i][idIdx]) existingKey[key] = i + 1;
  }

  const now = new Date().toISOString();
  const results = [];
  records.forEach(function (rec) {
    const key = rec.generus_id + '|' + rec.date;
    const rowData = {
      id: rec.id || ('att_' + Utilities.getUuid().split('-')[0]),
      generus_id: rec.generus_id,
      group_id: rec.group_id,
      date: rec.date,
      time: rec.time || Utilities.formatDate(new Date(), 'Asia/Jakarta', 'HH:mm'),
      status: rec.status,
      method: rec.method || 'manual',
      notes: rec.notes || '',
      recorded_by: rec.recorded_by || actorName || '',
      created_at: now,
      updated_at: now,
    };
    const row = SCHEMAS.Attendance.map(function (h) { return rowData[h] !== undefined ? rowData[h] : ''; });
    if (existingKey[key]) {
      sh.getRange(existingKey[key], 1, 1, headers.length).setValues([row]);
    } else {
      sh.appendRow(row);
    }
    results.push(rowData);
  });
  writeAudit_('', actorName || 'system', 'update', 'Attendance', records.length + ' data', 'Menyimpan absensi (' + records.length + ' generus)');
  return results;
}

// ---------------------------------------------------------------------------
// AUDIT LOG
// ---------------------------------------------------------------------------
function writeAudit_(userId, userName, action, table, recordId, description) {
  const sh = getSheet_('AuditLog');
  sh.appendRow([
    'log_' + Utilities.getUuid().split('-')[0],
    userId || '', userName || 'system', action, table, recordId,
    description, new Date().toISOString(),
  ]);
}
