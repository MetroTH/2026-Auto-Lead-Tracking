/**
 * Sync Invoice จาก Raw-data + CRM (DB-CRM)
 *
 * โหมด 1 – Full Sync    : ล้างชีตแล้ว sync ทั้งหมดใหม่
 * โหมด 2 – Manual Sync  : เพิ่มเฉพาะแถวใหม่ที่ยังไม่มี (ไม่ซ้ำ)
 * โหมด 3 – Trigger      : รันอัตโนมัติทุกวัน 06:00 Asia/Bangkok (= โหมด 2)
 */

// ====== CONFIG ======
var INVOICE_FILE_ID = '1etfpucdZ66EixB_TPZNIUjd7nprnSB0myo_VCxWk_yk';
var CRM_FILE_ID     = '1Fq_Suvh1u-iTLzbIoyowiuXEHcKK1VtayDab2qO4Bwk';

var RAWDATA_SHEET = 'Raw-data';
var INVOICE_SHEET = 'Invoice';
var CRM_SHEET     = 'Filter-raw-respond';

// คอลัมน์ Raw-data (0-based)
var RAW = {
  invDate:        0,  // A Date
  invoiceNo:      1,  // B Invoice No
  channel:        4,  // E Channel
  regionInv:      7,  // H Region Invoice
  custNo:         8,  // I CustNo
  custName:       9,  // J CustomerName
  totalSales:     10, // K Total Sales
  vertical:       27, // AB Vertical
  salesRepName:   30, // AE Main SalesRep : Name
  salesRepRegion: 32, // AG Main SalesRep : Region
  salesRepPos:    33  // AH Main SalesRep : Position
};

// คอลัมน์ CRM / Filter-raw-respond (0-based)
var CRM = {
  accountNumber: 1,
  respondId:     2,
  contactDate:   3,
  contactName:   4,
  platform:      6,
  businessPhone: 11,
  branch:        14,
  source:        31, // AF
  subSource:     32, // AG
  campaignName:  34, // AI
  adName:        37  // AL
};

var KEY_COL        = 21; // คอลัมน์ U (1-based) = dedup_key
var KEY_HEADER     = '_dedup_key';
var RESPOND_ID_COL = 12; // คอลัมน์ L (1-based) respond_id

// ====== MENU ======

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🧾 Invoice Sync')
    .addItem('🔄 โหมด 1: Full Sync (ดึงทั้งหมดใหม่)', 'runFullSync')
    .addItem('➕ โหมด 2: Manual Sync (เพิ่มเฉพาะใหม่)', 'runManualSync')
    .addSeparator()
    .addItem('⏰ โหมด 3: ตั้ง Trigger อัตโนมัติ 06:00', 'createDailyTrigger')
    .addItem('🗑️ ลบ Trigger ทั้งหมด', 'removeAllTriggers')
    .addToUi();
}

// ====== MODE ENTRY POINTS ======

function runFullSync() {
  var ui = SpreadsheetApp.getUi();
  var resp = ui.alert(
    'ยืนยัน Full Sync',
    'จะลบข้อมูลทั้งหมดในชีต "' + INVOICE_SHEET + '" แล้ว sync ใหม่ทั้งหมด\nต้องการดำเนินการต่อไหม?',
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.Button.YES) return;
  syncInvoice_(true);
}

function runManualSync() {
  syncInvoice_(false);
}

function syncInvoice() {
  syncInvoice_(false);
}

// ====== CORE SYNC ======

function syncInvoice_(fullSync) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5 * 60 * 1000)) {
    Logger.log('มีการรันอยู่แล้ว ข้ามรอบนี้');
    return;
  }
  try {
    var invSS    = SpreadsheetApp.openById(INVOICE_FILE_ID);
    var rawSheet = invSS.getSheetByName(RAWDATA_SHEET);
    var dstSheet = invSS.getSheetByName(INVOICE_SHEET);
    var crmSheet = SpreadsheetApp.openById(CRM_FILE_ID).getSheetByName(CRM_SHEET);

    if (!rawSheet || !dstSheet || !crmSheet) {
      throw new Error('หาชีตไม่เจอ: ตรวจชื่อชีต Raw-data / Invoice / Filter-raw-respond');
    }

    if (fullSync) {
      var lastRow = dstSheet.getLastRow();
      if (lastRow > 1) dstSheet.deleteRows(2, lastRow - 1);
    } else {
      cleanOldRows_(dstSheet);
    }

    ensureHeaderKey_(dstSheet);

    var crmMap       = buildCrmMap_(crmSheet);
    var existingKeys = readExistingKeys_(dstSheet);
    var rawValues    = rawSheet.getDataRange().getValues();
    var newRows      = [];

    for (var i = 1; i < rawValues.length; i++) {
      var r         = rawValues[i];
      var invoiceNo = trimStr_(r[RAW.invoiceNo]);
      if (!invoiceNo) continue;

      var invDate    = formatDate_(r[RAW.invDate]);
      var custNo     = trimStr_(r[RAW.custNo]);
      var custName   = r[RAW.custName];
      var totalSales = r[RAW.totalSales];
      var channel    = r[RAW.channel];
      var regionInv  = r[RAW.regionInv];
      var vertical   = r[RAW.vertical];
      var srName     = r[RAW.salesRepName];
      var srRegion   = r[RAW.salesRepRegion];
      var srPos      = r[RAW.salesRepPos];

      var crm = crmMap[custNo.toUpperCase()] || null;
      if (!crm || trimStr_(crm.respondId) === '') continue;

      if (!isWithinMonths_(r[RAW.invDate], crm._contactDate, 4)) continue;

      var key = buildKey_(invoiceNo, invDate, custNo);
      if (existingKeys.has(key)) continue;
      existingKeys.add(key);

      newRows.push({
        sortDate: toDate_(invDate),
        row: [
          invDate,           // A Date
          invoiceNo,         // B Invoice No
          custNo,            // C CustNo
          custName,          // D CustomerName
          totalSales,        // E Total Sales
          channel,           // F Channel
          regionInv,         // G Region Invoice
          vertical,          // H Vertical
          srName,            // I Main SalesRep : Name
          srRegion,          // J Main SalesRep : Region
          srPos,             // K Main SalesRep : Position
          crm.respondId,     // L respond_id
          crm.contactName,   // M Contact Name
          crm.platform,      // N Platform
          crm.branch,        // O Branch
          crm.businessPhone, // P Business Phone
          crm.source,        // Q Source
          crm.subSource,     // R Sub Source
          crm.campaignName,  // S Campaign name
          crm.adName,        // T Ad name
          key                // U _dedup_key
        ]
      });
    }

    if (newRows.length === 0) {
      Logger.log('ไม่มีแถวใหม่');
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
    if (needLastRow > maxRows) dstSheet.insertRowsAfter(maxRows, needLastRow - maxRows);
    if (dstSheet.getMaxColumns() < output[0].length) {
      dstSheet.insertColumnsAfter(dstSheet.getMaxColumns(), output[0].length - dstSheet.getMaxColumns());
    }

    dstSheet.getRange(startRow, 1, output.length, output[0].length).setValues(output);
    dstSheet.getRange(startRow, 1, output.length, 1).setNumberFormat('yyyy-MM-dd');

    var msg = 'เพิ่มแถวใหม่ ' + output.length + ' แถว';
    Logger.log(msg);
    showToast_(msg);

  } finally {
    lock.releaseLock();
  }
}

// ====== CLEAN OLD ROWS ======

function cleanOldRows_(dstSheet) {
  var lastRow = dstSheet.getLastRow();
  if (lastRow < 2) return;
  var respondIds = dstSheet.getRange(2, RESPOND_ID_COL, lastRow - 1, 1).getValues();
  for (var i = respondIds.length - 1; i >= 0; i--) {
    if (trimStr_(respondIds[i][0]) === '') dstSheet.deleteRow(i + 2);
  }
}

// ====== HELPERS ======

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
      _dTime:        dTime,
      _contactDate:  d,
      respondId:     row[CRM.respondId],
      contactName:   row[CRM.contactName],
      platform:      row[CRM.platform],
      businessPhone: row[CRM.businessPhone],
      branch:        row[CRM.branch],
      source:        trimStr_(row[CRM.source]),
      subSource:     trimStr_(row[CRM.subSource]),
      campaignName:  trimStr_(row[CRM.campaignName]),
      adName:        trimStr_(row[CRM.adName])
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

function buildKey_(invoiceNo, invDate, custNo) {
  return [invoiceNo, normDateKey_(invDate), custNo].join('|');
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

function isWithinMonths_(invDateRaw, leadInDate, months) {
  if (!leadInDate) return true;
  var qDate = toDate_(invDateRaw);
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
    SpreadsheetApp.getActive().toast(msg, 'Invoice Sync', 5);
  } catch (e) {}
}

// ====== TRIGGER ======

function createDailyTrigger() {
  removeAllTriggers();
  ScriptApp.newTrigger('syncInvoice')
    .timeBased()
    .everyDays(1)
    .atHour(17)
    .nearMinute(40)
    .create();
  Logger.log('ตั้ง trigger รายวัน 17:40 เรียบร้อย');
  showToast_('ตั้ง Trigger อัตโนมัติ 17:40 น. เรียบร้อยแล้ว');
}

function removeAllTriggers() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'syncInvoice') ScriptApp.deleteTrigger(t);
  });
}
