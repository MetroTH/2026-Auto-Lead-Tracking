/**
 * Auto Lead Tracking — Monthly Performance
 * ---------------------------------------------------------------------------
 * ดึงข้อมูลจาก 5 แหล่ง (A–E) รวมไว้ใน Sheet F (Auto-Lead-Tracking-Performance)
 * แสดงผล Performance รายเดือน แยกตาม Campaign
 *
 * แหล่งข้อมูล:
 *   A = DB_From_Respond_CRM          → Filter-raw-respond
 *   B = FBCampaignADS_Part           → FBCampaignADS_Part (หรือ Campaign_Monthly)
 *   C = From-Facebook Ads-Respon.io  → Raw-data  (ใช้เป็น reference — ไม่โหลดโดยตรง)
 *   D = Quotation Detail-Bi          → Quotation
 *   E = Invoicehead-Detail-Bi        → Invoice
 *   F = Auto-Lead-Tracking-Performance (Active Spreadsheet ที่ Script นี้ deploy อยู่)
 *
 * โหมด:
 *   1 – Full     : ล้างชีต F แล้วสร้างใหม่ตั้งแต่ ม.ค. 2026 ถึงปัจจุบัน
 *   2 – Manual   : เพิ่มเฉพาะเดือนที่ยังไม่มีใน F + รีเฟรชเดือนปัจจุบัน
 *   3 – Trigger  : รันอัตโนมัติทุกวัน 18:00 Asia/Bangkok (ทำงานเหมือนโหมด 2)
 * ---------------------------------------------------------------------------
 */

/* ===================== CONFIG ===================== */
var CONFIG = {
  // ===== Spreadsheet IDs (Source) =====
  SS_A_ID: '1Fq_Suvh1u-iTLzbIoyowiuXEHcKK1VtayDab2qO4Bwk',   // DB_From_Respond_CRM
  SS_B_ID: '',   // FBADS — เว้นว่าง = อ่านจากไฟล์เดียวกับ Performance (Active Spreadsheet)
  SS_D_ID: '14stvnZSD-WNp1N_bI-aEdJDb4IHplRkFiVh5WWwRwec',   // Quotation Detail-Bi
  SS_E_ID: '1etfpucdZ66EixB_TPZNIUjd7nprnSB0myo_VCxWk_yk',   // Invoicehead-Detail-Bi

  // ===== Sheet Names =====
  SHEET_A:   'Filter-raw-respond',
  SHEET_B:   'FBADS',   // แท็บข้อมูล Campaign รายเดือน (อยู่ในไฟล์เดียวกับ Performance)
  SHEET_D:   'Quotation',
  SHEET_E:   'Invoice',
  SHEET_OUT: 'Performance',          // ชีต Output ใน F

  // ===== Column Indices — Source A (Filter-raw-respond, 0-based) =====
  // OUTPUT_COLUMNS (0–30) + ADS_COLUMNS (31–37)
  A_RESPOND_ID:    2,   // C  respond_id
  A_CONTACT_DATE:  3,   // D  ระบุวันและเวลาติดต่อ
  A_CAMPAIGN_NAME: 34,  // AI Campaign name (จาก Ads enrichment)

  // ===== Column Indices — Source B (FBCampaignADS_Part, 0-based) =====
  B_CAMPAIGN_NAME:   0,
  B_REPORTING_START: 2,
  B_REPORTING_END:   3,
  B_AMOUNT_SPENT:    4,
  B_REACH:           5,
  B_RESULTS:         7,
  B_MSG_CONV:        8,
  B_CLICKS:          9,
  B_CTR:             10,
  B_CPC:             11,

  // ===== Column Indices — Source D (Quotation, 0-based) =====
  D_DATE:          0,   // A  Quo. Date
  D_VALUE:         2,   // C  Value
  D_RESPOND_ID:    5,   // F  respond_id
  D_CAMPAIGN_NAME: 13,  // N  Campaign name

  // ===== Column Indices — Source E (Invoice, 0-based) =====
  E_DATE:          0,   // A  Date
  E_TOTAL_SALES:   4,   // E  Total Sales
  E_RESPOND_ID:    11,  // L  respond_id
  E_CAMPAIGN_NAME: 18,  // S  Campaign name

  // ===== ช่วงเวลา / Timezone =====
  TIMEZONE:        'Asia/Bangkok',
  MODE1_START_YEAR: 2026,
  MODE1_START_MONTH: 1,   // มกราคม (1-based)

  TRIGGER_HOUR:    18
};

/* ===================== HEADER OUTPUT ===================== */
var OUTPUT_HEADER = [
  'Timestamp',                       // A
  'Campaign name',                   // B
  'Reporting starts',                // C
  'Reporting ends',                  // D
  'Amount spent (THB)-FB',           // E
  'Reach',                           // F
  'Results',                         // G
  'Messaging conversations started', // H
  'Clicks (all)',                    // I
  'CTR (all)',                       // J
  'CPC (all)',                       // K
  'MQL',                             // L
  'Lead',                            // M
  'QT (Value)',                      // N
  'Sales',                           // O
  'ROAS'                             // P
];

/* ===================== MENU ===================== */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📊 Performance')
    .addItem('โหมด 1: ดึงทั้งหมด (ตั้งแต่ ม.ค. 69)', 'runMode1_Full')
    .addItem('โหมด 2: ดึงเพิ่ม (Manual incremental)', 'runMode2_Incremental')
    .addSeparator()
    .addItem('ตั้ง Trigger รายวัน 18:00', 'installDailyTrigger')
    .addItem('ลบ Trigger รายวัน', 'removeDailyTrigger')
    .addToUi();
}

/* ===================== MODE ENTRY POINTS ===================== */

function runMode1_Full() {
  var result = buildPerformance_({ mode: 1 });
  notify_('โหมด 1 เสร็จสิ้น', 'สร้าง Performance ใหม่ทั้งหมด ' + result.rows + ' แถว (' + result.months + ' เดือน)');
}

function runMode2_Incremental() {
  var result = buildPerformance_({ mode: 2 });
  notify_('โหมด 2 เสร็จสิ้น', 'อัปเดต ' + result.months + ' เดือน รวม ' + result.rows + ' แถว');
}

function runMode3_Trigger() {
  buildPerformance_({ mode: 3 });
}

/* ===================== CORE ===================== */

function buildPerformance_(opts) {
  var mode = opts.mode;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10 * 60 * 1000)) {
    Logger.log('มีการรันอยู่แล้ว ข้ามรอบนี้');
    return { rows: 0, months: 0 };
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var outSheet = ss.getSheetByName(CONFIG.SHEET_OUT);
    if (!outSheet) outSheet = ss.insertSheet(CONFIG.SHEET_OUT);

    var now = new Date();
    var startDate = new Date(CONFIG.MODE1_START_YEAR, CONFIG.MODE1_START_MONTH - 1, 1);
    var currentMonthKey = getMonthKey_(now);

    // B (FBADS) อยู่ในไฟล์เดียวกับ Performance — ถ้าไม่กำหนด ใช้ Active Spreadsheet
    var bSsId = CONFIG.SS_B_ID
      || PropertiesService.getScriptProperties().getProperty('PERF_B_SS_ID')
      || ss.getId();

    // โหลดข้อมูลจากทุก Source
    Logger.log('กำลังโหลดข้อมูลจาก Source A...');
    var dataA = loadSheet_(CONFIG.SS_A_ID, CONFIG.SHEET_A);
    Logger.log('กำลังโหลดข้อมูลจาก Source B...');
    var dataB = loadSheet_(bSsId, CONFIG.SHEET_B);
    Logger.log('กำลังโหลดข้อมูลจาก Source D...');
    var dataD = loadSheet_(CONFIG.SS_D_ID, CONFIG.SHEET_D);
    Logger.log('กำลังโหลดข้อมูลจาก Source E...');
    var dataE = loadSheet_(CONFIG.SS_E_ID, CONFIG.SHEET_E);

    // สร้าง B Map: bMap[monthKey][campaignName] = { starts, ends, spend, reach, results, msgConv, clicks, ctr, cpc }
    var bMap = buildBMap_(dataB, startDate, now);

    // สร้าง Raw maps จาก A, D, E
    // rawCountMap[monthKey][campaignName] = count (respond_id)
    // rawSumMap[monthKey][campaignName] = sum (value/sales)
    var mqlRaw   = buildRawCountMap_(dataA, CONFIG.A_CONTACT_DATE, CONFIG.A_CAMPAIGN_NAME, startDate, now);
    var leadRaw  = buildRawCountMap_(dataD, CONFIG.D_DATE, CONFIG.D_CAMPAIGN_NAME, startDate, now);
    var qtRaw    = buildRawSumMap_(dataD, CONFIG.D_DATE, CONFIG.D_CAMPAIGN_NAME, CONFIG.D_VALUE, startDate, now);
    var salesRaw = buildRawSumMap_(dataE, CONFIG.E_DATE, CONFIG.E_CAMPAIGN_NAME, CONFIG.E_TOTAL_SALES, startDate, now);

    // รวบรวม Month Keys ทั้งหมดจากทุก Source
    var allMonthSet = {};
    [mqlRaw, leadRaw, qtRaw, salesRaw].forEach(function(rawMap) {
      Object.keys(rawMap).forEach(function(mk) { allMonthSet[mk] = true; });
    });
    Object.keys(bMap).forEach(function(mk) { allMonthSet[mk] = true; });

    var allMonthKeys = Object.keys(allMonthSet).sort();

    // กรอง Months ตาม Mode
    var existingMonthKeys = {};
    if (mode !== 1) {
      existingMonthKeys = readExistingMonths_(outSheet);
    }

    var monthsToProcess = allMonthKeys.filter(function(mk) {
      if (mode === 1) return true;
      // โหมด 2/3: ข้ามเดือนที่มีอยู่แล้ว ยกเว้นเดือนปัจจุบัน (refresh)
      return !existingMonthKeys[mk] || mk === currentMonthKey;
    });

    if (monthsToProcess.length === 0) {
      notify_('Performance', 'ไม่มีข้อมูลใหม่ — ข้อมูลเป็นปัจจุบันแล้ว');
      return { rows: 0, months: 0 };
    }

    // สร้าง Output Rows
    var outputRows = [];

    for (var mi = 0; mi < monthsToProcess.length; mi++) {
      var mk = monthsToProcess[mi];
      var monthLabel = getMonthLabel_(mk);
      var bMonthData = bMap[mk] || {};
      var bCampaigns = Object.keys(bMonthData).sort();

      // กระจาย Raw Maps ตาม Campaigns ใน B (ที่ไม่ Match → Other)
      var mqlDist   = distributeToOther_(mqlRaw[mk]   || {}, bCampaigns);
      var leadDist  = distributeToOther_(leadRaw[mk]  || {}, bCampaigns);
      var qtDist    = distributeToOther_(qtRaw[mk]    || {}, bCampaigns);
      var salesDist = distributeToOther_(salesRaw[mk] || {}, bCampaigns);

      // Rows สำหรับ Campaign แต่ละตัวจาก B
      for (var ci = 0; ci < bCampaigns.length; ci++) {
        var camp = bCampaigns[ci];
        var b = bMonthData[camp];
        var salesVal = salesDist[camp] !== undefined ? salesDist[camp] : '';
        var spendVal = b.spend !== '' && b.spend !== null && b.spend !== undefined ? b.spend : '';
        var roas = (salesVal !== '' && spendVal !== '' && spendVal !== 0)
          ? Math.round((salesVal / spendVal) * 100) / 100
          : '';

        outputRows.push([
          monthLabel,
          camp,
          b.starts,
          b.ends,
          spendVal,
          b.reach    !== undefined ? b.reach    : '',
          b.results  !== undefined ? b.results  : '',
          b.msgConv  !== undefined ? b.msgConv  : '',
          b.clicks   !== undefined ? b.clicks   : '',
          b.ctr      !== undefined ? b.ctr      : '',
          b.cpc      !== undefined ? b.cpc      : '',
          mqlDist[camp]  !== undefined ? mqlDist[camp]  : '',
          leadDist[camp] !== undefined ? leadDist[camp] : '',
          qtDist[camp]   !== undefined ? qtDist[camp]   : '',
          salesVal,
          roas
        ]);
      }

      // Row "Other" — รายการที่ Campaign ไม่ตรงกับ B
      var otherMql   = mqlDist['Other']   !== undefined ? mqlDist['Other']   : '';
      var otherLead  = leadDist['Other']  !== undefined ? leadDist['Other']  : '';
      var otherQt    = qtDist['Other']    !== undefined ? qtDist['Other']    : '';
      var otherSales = salesDist['Other'] !== undefined ? salesDist['Other'] : '';

      var parts     = mk.split('-');
      var mYear     = parseInt(parts[0], 10);
      var mMonth    = parseInt(parts[1], 10) - 1;
      var monthStart = new Date(mYear, mMonth, 1);
      var monthEnd   = new Date(mYear, mMonth + 1, 0);
      var otherStarts = Utilities.formatDate(monthStart, CONFIG.TIMEZONE, 'yyyy-MM-dd');
      var otherEnds   = Utilities.formatDate(monthEnd,   CONFIG.TIMEZONE, 'yyyy-MM-dd');

      outputRows.push([
        monthLabel,
        'Other',
        otherStarts,
        otherEnds,
        '', '', '', '', '', '', '',
        otherMql,
        otherLead,
        otherQt,
        otherSales,
        ''
      ]);
    }

    // เขียนลง Output Sheet
    if (mode === 1) {
      writeOutputFull_(outSheet, outputRows);
    } else {
      // ลบแถวของเดือนที่จะ refresh แล้ว append ใหม่
      removeMonthRows_(outSheet, monthsToProcess);
      appendOutput_(outSheet, outputRows);
    }

    Logger.log('เสร็จสิ้น: ' + outputRows.length + ' แถว, ' + monthsToProcess.length + ' เดือน');
    return { rows: outputRows.length, months: monthsToProcess.length };

  } finally {
    lock.releaseLock();
  }
}

/* ===================== DATA LOADERS ===================== */

function loadSheet_(ssId, sheetName) {
  var ss = SpreadsheetApp.openById(ssId);
  var sh = ss.getSheetByName(sheetName);
  if (!sh) throw new Error('ไม่พบชีต "' + sheetName + '" ใน Spreadsheet ID: ' + ssId);
  var data = sh.getDataRange().getValues();
  return data;
}

/* ===================== B MAP BUILDER ===================== */

/**
 * สร้าง Map จาก B (FBCampaignADS_Part)
 * bMap[monthKey][campaignName] = { starts, ends, spend, reach, results, msgConv, clicks, ctr, cpc }
 * grouping ตาม Reporting starts month
 */
function buildBMap_(dataB, startDate, now) {
  var bMap = {};
  if (!dataB || dataB.length < 2) return bMap;

  var header = dataB[0];
  var colMap = {};
  for (var i = 0; i < header.length; i++) {
    colMap[String(header[i]).trim()] = i;
  }

  // รองรับทั้งชื่อ header ตาม MetaAdsToSheet และ index จาก CONFIG
  for (var r = 1; r < dataB.length; r++) {
    var row = dataB[r];
    var campName = trimStr_(row[CONFIG.B_CAMPAIGN_NAME]);
    if (!campName) continue;

    var reportStart = parseDate_(row[CONFIG.B_REPORTING_START]);
    if (!reportStart) continue;
    if (reportStart < startDate || reportStart > now) continue;

    var mk = getMonthKey_(reportStart);
    if (!bMap[mk]) bMap[mk] = {};

    // ถ้าชื่อ Campaign ซ้ำใน B สำหรับเดือนเดียวกัน ให้ sum ค่า
    var existing = bMap[mk][campName];
    if (existing) {
      existing.spend   = numAdd_(existing.spend,   row[CONFIG.B_AMOUNT_SPENT]);
      existing.reach   = numAdd_(existing.reach,   row[CONFIG.B_REACH]);
      existing.results = numAdd_(existing.results, row[CONFIG.B_RESULTS]);
      existing.msgConv = numAdd_(existing.msgConv, row[CONFIG.B_MSG_CONV]);
      existing.clicks  = numAdd_(existing.clicks,  row[CONFIG.B_CLICKS]);
      // CTR/CPC: ใช้ค่าจาก row ล่าสุด (หรือ weighted — ใช้ค่าล่าสุดเพื่อความง่าย)
      if (row[CONFIG.B_REPORTING_END]) {
        var newEnd = parseDate_(row[CONFIG.B_REPORTING_END]);
        var existEnd = parseDate_(existing.ends);
        if (newEnd && existEnd && newEnd > existEnd) {
          existing.ends = trimStr_(row[CONFIG.B_REPORTING_END]);
          existing.ctr  = toNum_(row[CONFIG.B_CTR]);
          existing.cpc  = toNum_(row[CONFIG.B_CPC]);
        }
      }
    } else {
      bMap[mk][campName] = {
        starts:  trimStr_(row[CONFIG.B_REPORTING_START]),
        ends:    trimStr_(row[CONFIG.B_REPORTING_END]),
        spend:   toNum_(row[CONFIG.B_AMOUNT_SPENT]),
        reach:   toNum_(row[CONFIG.B_REACH]),
        results: toNum_(row[CONFIG.B_RESULTS]),
        msgConv: toNum_(row[CONFIG.B_MSG_CONV]),
        clicks:  toNum_(row[CONFIG.B_CLICKS]),
        ctr:     toNum_(row[CONFIG.B_CTR]),
        cpc:     toNum_(row[CONFIG.B_CPC])
      };
    }
  }

  return bMap;
}

/* ===================== RAW COUNT / SUM MAP BUILDERS ===================== */

/**
 * นับ respond_id จากข้อมูล Source
 * return: rawCountMap[monthKey][campaignName] = count
 */
function buildRawCountMap_(data, dateColIdx, campColIdx, startDate, now) {
  var map = {};
  if (!data || data.length < 2) return map;

  for (var r = 1; r < data.length; r++) {
    var row  = data[r];
    var date = parseDate_(row[dateColIdx]);
    if (!date || date < startDate || date > now) continue;

    var mk   = getMonthKey_(date);
    var camp = trimStr_(row[campColIdx]) || '';

    if (!map[mk]) map[mk] = {};
    map[mk][camp] = (map[mk][camp] || 0) + 1;
  }
  return map;
}

/**
 * หาผลรวมของ valueCol จากข้อมูล Source
 * return: rawSumMap[monthKey][campaignName] = sum
 */
function buildRawSumMap_(data, dateColIdx, campColIdx, valueColIdx, startDate, now) {
  var map = {};
  if (!data || data.length < 2) return map;

  for (var r = 1; r < data.length; r++) {
    var row  = data[r];
    var date = parseDate_(row[dateColIdx]);
    if (!date || date < startDate || date > now) continue;

    var mk   = getMonthKey_(date);
    var camp = trimStr_(row[campColIdx]) || '';
    var val  = parseFloat(row[valueColIdx]);
    if (isNaN(val)) continue;

    if (!map[mk]) map[mk] = {};
    map[mk][camp] = (map[mk][camp] || 0) + val;
  }
  return map;
}

/* ===================== DISTRIBUTE TO OTHER ===================== */

/**
 * กระจายค่าใน rawMap ไปยัง Campaign ที่รู้จัก (knownCampaigns)
 * ที่เหลือรวมไว้ใน 'Other'
 */
function distributeToOther_(rawMap, knownCampaigns) {
  var knownSet = {};
  knownCampaigns.forEach(function(c) { knownSet[c] = true; });

  var result = {};
  var otherTotal = 0;
  var hasOther = false;

  Object.keys(rawMap).forEach(function(camp) {
    var val = rawMap[camp];
    if (knownSet[camp]) {
      result[camp] = val;
    } else {
      otherTotal += val;
      hasOther = true;
    }
  });

  if (hasOther) result['Other'] = otherTotal;
  return result;
}

/* ===================== OUTPUT WRITERS ===================== */

function writeOutputFull_(outSheet, outputRows) {
  outSheet.clearContents();
  outSheet.getRange(1, 1, 1, OUTPUT_HEADER.length).setValues([OUTPUT_HEADER]).setFontWeight('bold');
  outSheet.setFrozenRows(1);
  if (outputRows.length === 0) return;
  outSheet.getRange(2, 1, outputRows.length, OUTPUT_HEADER.length).setValues(outputRows);
  // Format ROAS column P (index 15) as number 2 decimal
  outSheet.getRange(2, 16, outputRows.length, 1).setNumberFormat('0.00');
}

function appendOutput_(outSheet, outputRows) {
  if (outputRows.length === 0) return;
  var lastRow = outSheet.getLastRow();
  if (lastRow < 1) {
    // ยังไม่มี header
    outSheet.getRange(1, 1, 1, OUTPUT_HEADER.length).setValues([OUTPUT_HEADER]).setFontWeight('bold');
    outSheet.setFrozenRows(1);
    lastRow = 1;
  }
  var startRow = lastRow + 1;
  outSheet.getRange(startRow, 1, outputRows.length, OUTPUT_HEADER.length).setValues(outputRows);
  outSheet.getRange(startRow, 16, outputRows.length, 1).setNumberFormat('0.00');
}

/**
 * ลบแถวที่ Col A (Timestamp/monthLabel) ตรงกับ monthLabels ที่ต้องการ refresh
 */
function removeMonthRows_(outSheet, monthKeys) {
  var lastRow = outSheet.getLastRow();
  if (lastRow < 2) return;

  var monthLabelSet = {};
  monthKeys.forEach(function(mk) { monthLabelSet[getMonthLabel_(mk)] = true; });

  var colA = outSheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = colA.length - 1; i >= 0; i--) {
    var label = trimStr_(colA[i][0]);
    if (monthLabelSet[label]) {
      outSheet.deleteRow(i + 2);
    }
  }
}

/**
 * อ่าน Month Labels ที่มีอยู่ใน Output Sheet
 * return: { 'YYYY-MM': true, ... }
 */
function readExistingMonths_(outSheet) {
  var result = {};
  var lastRow = outSheet.getLastRow();
  if (lastRow < 2) return result;

  var colA = outSheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < colA.length; i++) {
    var label = trimStr_(colA[i][0]);
    if (!label) continue;
    var mk = monthLabelToKey_(label);
    if (mk) result[mk] = true;
  }
  return result;
}

/* ===================== HELPERS ===================== */

/** แปลง Date เป็น 'YYYY-MM' */
function getMonthKey_(date) {
  return Utilities.formatDate(date, CONFIG.TIMEZONE, 'yyyy-MM');
}

/** แปลง 'YYYY-MM' เป็น 'Jan-2026' */
function getMonthLabel_(monthKey) {
  var parts = monthKey.split('-');
  var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
  return Utilities.formatDate(d, CONFIG.TIMEZONE, 'MMM-yyyy');
}

/** แปลง 'Jan-2026' กลับเป็น '2026-01' */
function monthLabelToKey_(label) {
  if (!label) return null;
  var d = new Date(label + ' 1');
  if (!isNaN(d.getTime())) {
    return Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM');
  }
  // fallback parse 'MMM-yyyy'
  var m = String(label).match(/^([A-Za-z]{3})-(\d{4})$/);
  if (!m) return null;
  var months = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6,
                 jul:7, aug:8, sep:9, oct:10, nov:11, dec:12 };
  var mo = months[m[1].toLowerCase()];
  if (!mo) return null;
  return m[2] + '-' + (mo < 10 ? '0' : '') + mo;
}

function parseDate_(value) {
  if (!value && value !== 0) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    var ms = Math.round((value - 25569) * 86400 * 1000);
    var d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  var s = String(value).trim();
  if (!s) return null;

  // dd/mm/yyyy [hh:mm[:ss]] (รูปแบบของ Source A — Contact date)
  var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    var d1 = new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
    return isNaN(d1.getTime()) ? null : d1;
  }

  // dd-MMM-yyyy (เช่น 5-Jan-2026)
  var m2 = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (m2) {
    var months = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5,
                   jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
    var mi = months[m2[2].toLowerCase()];
    if (mi !== undefined) {
      var d2 = new Date(+m2[3], mi, +m2[1]);
      return isNaN(d2.getTime()) ? null : d2;
    }
  }

  var d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function toNum_(v) {
  if (v === '' || v === null || v === undefined) return '';
  var n = Number(v);
  return isNaN(n) ? '' : n;
}

function numAdd_(existing, newVal) {
  var n = Number(newVal);
  if (isNaN(n)) return existing;
  var e = Number(existing);
  return isNaN(e) ? n : e + n;
}

function trimStr_(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function notify_(title, msg) {
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast(msg, title, 6);
  } catch (e) { /* trigger mode — ไม่มี UI */ }
  Logger.log('[' + title + '] ' + msg);
}

/* ===================== TRIGGER MANAGEMENT ===================== */

function installDailyTrigger() {
  removeDailyTrigger();
  ScriptApp.newTrigger('runMode3_Trigger')
    .timeBased()
    .everyDays(1)
    .atHour(CONFIG.TRIGGER_HOUR)
    .inTimezone(CONFIG.TIMEZONE)
    .create();
  notify_('ตั้ง Trigger สำเร็จ', 'ดึงข้อมูล Performance ทุกวัน เวลา ' + CONFIG.TRIGGER_HOUR + ':00 (' + CONFIG.TIMEZONE + ')');
}

function removeDailyTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'runMode3_Trigger') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}
