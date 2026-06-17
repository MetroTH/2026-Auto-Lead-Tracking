/**
 * Sync Quotation (DB-Quotation 2) จาก Raw-data (DB-Quotation 1) + CRM (DB-CRM)
 *
 * โหมด 1 – Full Sync    : ล้างชีตแล้ว sync ทั้งหมดใหม่
 * โหมด 2 – Manual Sync  : เพิ่มเฉพาะแถวใหม่ที่ยังไม่มี (ไม่ซ้ำ)
 * โหมด 3 – Trigger      : รันอัตโนมัติทุกวัน 17:40 Asia/Bangkok (= โหมด 2)
 */

// ====== CONFIG ======
var QUOTATION_FILE_ID = '14stvnZSD-WNp1N_bI-aEdJDb4IHplRkFiVh5WWwRwec';
var CRM_FILE_ID       = '1Fq_Suvh1u-iTLzbIoyowiuXEHcKK1VtayDab2qO4Bwk';
var CAMPAIGN_FILE_ID  = '19yN662iCppjMFJTONgZHpbQH4gOkUtDxUcvqYZyPcKw'; // DB01 Facebook Ads

var RAWDATA_SHEET   = 'Raw-data';
var QUOTATION_SHEET = 'Quotation';
var CRM_SHEET       = 'Filter-raw-respond';
var CAMPAIGN_SHEET  = 'Raw-data'; // DB01 sheet name

// คอลัมน์ Raw-data (0-based)
var RAW = { quoDate: 0, quotation: 2, partNo: 5, value: 9, dcn: 10, dcnName: 11 };

// คอลัมน์ CRM (0-based)
var CRM = {
  accountNumber: 1,
  respondId: 2,
  contactDate: 3,
  contactName: 4,
  platform: 6,
  businessPhone: 11,
  branch: 14,
  adProduct: 18,
  note1: 19
};

// คอลัมน์ DB01 Facebook Ads (0-based)
var DB01 = {
  timestamp: 0,    // A
  campaignName: 8, // I
  respondId: 11    // L
};

var KEY_COL        = 13; // คอลัมน์ M (1-based) = dedup_key
var KEY_HEADER     = '_dedup_key';
var RESPOND_ID_COL = 6;  // คอลัมน์ F (1-based)

// ====== MENU ======

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📋 CRM Sync')
    .addItem('🔄 โหมด 1: Full Sync (ดึงทั้งหมดใหม่)', 'runFullSync')
    .addItem('➕ โหมด 2: Manual Sync (เพิ่มเฉพาะใหม่)', 'runManualSync')
    .addSeparator()
    .addItem('⏰ โหมด 3: ตั้ง Trigger อัตโนมัติ 17:40', 'createDailyTrigger')
    .addItem('🗑️ ลบ Trigger ทั้งหมด', 'removeAllTriggers')
    .addToUi();
}

// ====== MODE ENTRY POINTS ======

/** โหมด 1: ล้างชีตแล้ว sync ทั้งหมดจาก Raw-data ใหม่ */
function runFullSync() {
  var ui = SpreadsheetApp.getUi();
  var resp = ui.alert(
    'ยืนยัน Full Sync',
    'จะลบข้อมูลทั้งหมดในชีต "' + QUOTATION_SHEET + '" แล้ว sync ใหม่ทั้งหมด\nต้องการดำเนินการต่อไหม?',
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.Button.YES) return;
  syncQuotation_(true);
}

/** โหมด 2: เพิ่มเฉพาะแถวใหม่ที่ยังไม่มี */
function runManualSync() {
  syncQuotation_(false);
}

/** โหมด 3 (Trigger): เรียกแบบ incremental เหมือนโหมด 2 */
function syncQuotation() {
  syncQuotation_(false);
}

// ====== CORE SYNC ======

function syncQuotation_(fullSync) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5 * 60 * 1000)) {
    Logger.log('มีการรันอยู่แล้ว ข้ามรอบนี้');
    return;
  }
  try {
    var quoSS    = SpreadsheetApp.openById(QUOTATION_FILE_ID);
    var rawSheet = quoSS.getSheetByName(RAWDATA_SHEET);
    var dstSheet = quoSS.getSheetByName(QUOTATION_SHEET);
    var crmSheet = SpreadsheetApp.openById(CRM_FILE_ID).getSheetByName(CRM_SHEET);

    if (!rawSheet || !dstSheet || !crmSheet) {
      throw new Error('หาชีตไม่เจอ: ตรวจชื่อชีต Raw-data / Quotation / Filter-raw-respond');
    }

    if (fullSync) {
      var lastRow = dstSheet.getLastRow();
      if (lastRow > 1) {
        dstSheet.deleteRows(2, lastRow - 1);
      }
    } else {
      cleanOldRows_(dstSheet);
    }

    ensureHeaderKey_(dstSheet);

    var campaignSheet = SpreadsheetApp.openById(CAMPAIGN_FILE_ID).getSheetByName(CAMPAIGN_SHEET);
    if (!campaignSheet) throw new Error('หาชีตไม่เจอ: ' + CAMPAIGN_SHEET + ' ใน DB01');

    var crmMap      = buildCrmMap_(crmSheet);
    var campaignMap = buildCampaignMap_(campaignSheet);
    var existingKeys = readExistingKeys_(dstSheet);
    var rawValues    = rawSheet.getDataRange().getValues();
    var newRows      = [];

    for (var i = 1; i < rawValues.length; i++) {
      var r         = rawValues[i];
      var quotation = trimStr_(r[RAW.quotation]);
      if (!quotation) continue;

      var quoDate = formatDate_(r[RAW.quoDate]);
      var partNo  = trimStr_(r[RAW.partNo]);
      var value   = r[RAW.value];
      var dcn     = trimStr_(r[RAW.dcn]);
      var dcnName = r[RAW.dcnName];

      var crm = crmMap[dcn.toUpperCase()] || null;

      if (!crm || trimStr_(crm.respondId) === '') continue;

      if (!isWithinMonths_(r[RAW.quoDate], crm._contactDate, 4)) continue;

      var key = buildKey_(quotation, partNo, value, quoDate, dcn);
      if (existingKeys.has(key)) continue;
      existingKeys.add(key);

      var respondIdStr  = trimStr_(crm.respondId);
      var campaignEntry = campaignMap[respondIdStr] || null;
      var campaignName  = '';
      if (campaignEntry && isWithinMonths_(r[RAW.quoDate], campaignEntry.timestamp, 4)) {
        campaignName = campaignEntry.campaignName;
      }

      newRows.push({
        sortDate: toDate_(quoDate),
        row: [
          quoDate,           // A
          quotation,         // B
          value,             // C
          dcn,               // D
          dcnName,           // E
          crm.respondId,     // F
          crm.contactName,   // G
          crm.platform,      // H
          crm.branch,        // I
          crm.businessPhone, // J
          crm.note,          // K
          crm.adProduct,     // L
          key,               // M _dedup_key
          campaignName       // N Campaign name
        ]
      });
    }

    if (newRows.length === 0) {
      Logger.log('ไม่มีแถวใหม่ (ข้อมูลเป็นปัจจุบันแล้ว)');
      showToast_('ไม่มีแถวใหม่ ข้อมูลเป็นปัจจุบันแล้ว');
      return;
    }

    newRows.sort(function(a, b) {
      return (a.sortDate ? a.sortDate.getTime() : 0) - (b.sortDate ? b.sortDate.getTime() : 0);
    });

    var output   = newRows.map(function(x) { return x.row; });
    var startRow = dstSheet.getLastRow() + 1;

    var needLastRow = startRow + output.length - 1;
    var maxRows = dstSheet.getMaxRows();
    if (needLastRow > maxRows) {
      dstSheet.insertRowsAfter(maxRows, needLastRow - maxRows);
    }
    if (dstSheet.getMaxColumns() < output[0].length) {
      dstSheet.insertColumnsAfter(dstSheet.getMaxColumns(), output[0].length - dstSheet.getMaxColumns());
    }

    var writeRange = dstSheet.getRange(startRow, 1, output.length, output[0].length);
    writeRange.setValues(output);

    dstSheet.getRange(startRow, 1, output.length, 1).setNumberFormat('yyyy-MM-dd');

    var msg = 'เพิ่มแถวใหม่ ' + output.length + ' แถว';
    Logger.log(msg + ' (เริ่มแถวที่ ' + startRow + ')');
    showToast_(msg);

  } finally {
    lock.releaseLock();
  }
}

// ====== CLEAN OLD ROWS ======

function cleanOldRows_(dstSheet) {
  var lastRow = dstSheet.getLastRow();
  if (lastRow < 2) return;

  var respondIds = dstSheet
    .getRange(2, RESPOND_ID_COL, lastRow - 1, 1)
    .getValues();

  for (var i = respondIds.length - 1; i >= 0; i--) {
    if (trimStr_(respondIds[i][0]) === '') {
      dstSheet.deleteRow(i + 2);
    }
  }
}

// ====== HELPERS ======

function buildCampaignMap_(sheet) {
  var values = sheet.getDataRange().getValues();
  var map = {};
  for (var i = 1; i < values.length; i++) {
    var row       = values[i];
    var respondId = trimStr_(row[DB01.respondId]);
    if (!respondId) continue;

    var ts = row[DB01.timestamp] instanceof Date
      ? row[DB01.timestamp]
      : new Date(String(row[DB01.timestamp]).trim());

    var existing = map[respondId];
    if (existing && existing.timestamp && ts <= existing.timestamp) continue;

    map[respondId] = {
      timestamp:    isNaN(ts.getTime()) ? null : ts,
      campaignName: trimStr_(row[DB01.campaignName])
    };
  }
  return map;
}

function buildCrmMap_(crmSheet) {
  var values = crmSheet.getDataRange().getValues();
  var map = {};
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var acc = trimStr_(row[CRM.accountNumber]);
    if (!acc) continue;
    var accKey = acc.toUpperCase();
    var d      = parseCrmDate_(row[CRM.contactDate]);
    var dTime  = d ? d.getTime() : 0;
    var existing = map[accKey];
    if (existing && existing._dTime >= dTime) continue;
    map[accKey] = {
      _dTime: dTime,
      _contactDate: d,
      respondId: row[CRM.respondId],
      contactName: row[CRM.contactName],
      platform: row[CRM.platform],
      businessPhone: row[CRM.businessPhone],
      branch: row[CRM.branch],
      adProduct: row[CRM.adProduct],
      note: row[CRM.note1]
    };
  }
  return map;
}

function readExistingKeys_(dstSheet) {
  var set = new Set();
  var lastRow = dstSheet.getLastRow();
  if (lastRow < 2) return set;
  var keys = dstSheet.getRange(2, KEY_COL, lastRow - 1, 1).getValues();
  for (var i = 0; i < keys.length; i++) {
    var k = trimStr_(keys[i][0]);
    if (k) set.add(k);
  }
  return set;
}

function ensureHeaderKey_(dstSheet) {
  if (trimStr_(dstSheet.getRange(1, KEY_COL).getValue()) !== KEY_HEADER) {
    dstSheet.getRange(1, KEY_COL).setValue(KEY_HEADER);
  }
}

function buildKey_(quotation, partNo, value, quoDate, dcn) {
  return [quotation, partNo, normNum_(value), normDateKey_(quoDate), dcn].join('|');
}

function normNum_(v) {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'number') return String(v);
  var n = parseFloat(String(v).replace(/,/g, '').trim());
  return isNaN(n) ? String(v).trim() : String(n);
}

function normDateKey_(v) {
  var d = toDate_(v);
  if (d) return Utilities.formatDate(d, 'Asia/Bangkok', 'yyyy-MM-dd');
  return trimStr_(v);
}

function toDate_(v) {
  if (v instanceof Date) return v;
  if (!v) return null;
  var s = String(v).trim();
  var m = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (m) {
    var months = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5,
                   jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
    var mi = months[m[2].toLowerCase()];
    if (mi !== undefined) return new Date(parseInt(m[3], 10), mi, parseInt(m[1], 10));
  }
  var d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function parseCrmDate_(v) {
  if (v instanceof Date) return v;
  if (!v) return null;
  var s = String(v).trim();
  var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
  var d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function isWithinMonths_(quoDateRaw, leadInDate, months) {
  if (!leadInDate) return true;
  var qDate = toDate_(quoDateRaw);
  if (!qDate) return false;
  if (qDate < leadInDate) return false;
  var deadline = new Date(leadInDate.getTime());
  deadline.setMonth(deadline.getMonth() + months);
  return qDate <= deadline;
}

function formatDate_(v) {
  var d = toDate_(v);
  if (d) return Utilities.formatDate(d, 'Asia/Bangkok', 'yyyy-MM-dd');
  return trimStr_(v);
}

function trimStr_(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function showToast_(msg) {
  try {
    SpreadsheetApp.getActive().toast(msg, 'CRM Sync', 5);
  } catch (e) {}
}

// ====== TRIGGER ======

function createDailyTrigger() {
  removeAllTriggers();
  ScriptApp.newTrigger('syncQuotation')
    .timeBased()
    .everyDays(1)
    .atHour(17)
    .nearMinute(40)
    .create();
  Logger.log('ตั้ง trigger รายวัน 17:40 (Asia/Bangkok) เรียบร้อย');
  showToast_('ตั้ง Trigger อัตโนมัติ 17:40 น. เรียบร้อยแล้ว');
}

function removeAllTriggers() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'syncQuotation') {
      ScriptApp.deleteTrigger(t);
    }
  });
}
