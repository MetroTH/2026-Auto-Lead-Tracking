/**
 * MetaAdsToSheet.gs
 * ดึงข้อมูล Meta Ads (Facebook) Insights ระดับ Campaign เข้า Google Sheet
 * โดยตรงผ่าน Meta Graph API — ไม่ใช้ LLM token (ฟรีหลังตั้งค่าเสร็จ)
 *
 * วิธีใช้:
 *  1) เปิด Google Sheet "FBCampaignADS_Part" -> Extensions -> Apps Script
 *  2) วางไฟล์นี้ทั้งหมด
 *  3) ตั้งค่า Script Properties (Project Settings -> Script Properties):
 *        META_ACCESS_TOKEN = <System User Token สิทธิ์ ads_read>
 *        AD_ACCOUNT_ID     = 301660159574939
 *        SHEET_NAME        = ชื่อแท็บที่จะเขียน (เช่น Campaign_Monthly)
 *  4) รันฟังก์ชัน runMonthly() ครั้งแรกเพื่อ authorize
 *  5) ตั้ง Trigger อัตโนมัติด้วย createDailyTrigger() (รันวันละครั้ง)
 */

// ====== CONFIG ======
const GRAPH_VERSION = 'v23.0';

function getConfig_() {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('META_ACCESS_TOKEN');
  const adAccountId = props.getProperty('AD_ACCOUNT_ID');
  const sheetName = props.getProperty('SHEET_NAME') || 'Campaign_Monthly';
  if (!token) throw new Error('ยังไม่ได้ตั้งค่า META_ACCESS_TOKEN ใน Script Properties');
  if (!adAccountId) throw new Error('ยังไม่ได้ตั้งค่า AD_ACCOUNT_ID ใน Script Properties');
  return { token: token, adAccountId: adAccountId, sheetName: sheetName };
}

// ====== ENTRY POINTS ======

/** ดึงข้อมูลเดือนปัจจุบัน (ตั้งแต่วันที่ 1 ถึงวันนี้) */
function runMonthly() {
  const now = new Date();
  const tz = Session.getScriptTimeZone();
  const since = Utilities.formatDate(new Date(now.getFullYear(), now.getMonth(), 1), tz, 'yyyy-MM-dd');
  const until = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
  fetchAndWrite_(since, until);
}

/** ดึงข้อมูลตามช่วงวันที่กำหนดเอง เช่น runCustom('2026-01-01','2026-05-31') */
function runCustom(since, until) {
  fetchAndWrite_(since, until);
}

// ====== CORE ======

function fetchAndWrite_(since, until) {
  const cfg = getConfig_();
  const rows = fetchInsights_(cfg, since, until);
  writeToSheet_(cfg.sheetName, rows);
  Logger.log('เขียนข้อมูล %s แถว ช่วง %s ถึง %s', rows.length, since, until);
}

function fetchInsights_(cfg, since, until) {
  const fields = [
    'campaign_name',
    'campaign_id',
    'date_start',
    'date_stop',
    'spend',
    'reach',
    'actions',
    'clicks',
    'ctr',
    'cpc'
  ].join(',');

  const base = 'https://graph.facebook.com/' + GRAPH_VERSION +
    '/act_' + cfg.adAccountId + '/insights';

  const params = {
    level: 'campaign',
    fields: fields,
    time_range: JSON.stringify({ since: since, until: until }),
    limit: '500',
    access_token: cfg.token
  };

  let url = base + '?' + Object.keys(params)
    .map(function (k) { return k + '=' + encodeURIComponent(params[k]); })
    .join('&');

  const out = [];
  let guard = 0;
  while (url && guard < 50) {
    guard++;
    const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const code = resp.getResponseCode();
    const body = JSON.parse(resp.getContentText());
    if (code !== 200) {
      throw new Error('Meta API error ' + code + ': ' + (body.error && body.error.message));
    }
    (body.data || []).forEach(function (d) { out.push(mapRow_(d)); });
    url = body.paging && body.paging.next ? body.paging.next : null;
  }
  return out;
}

function getAction_(actions, type) {
  if (!actions) return '';
  for (let i = 0; i < actions.length; i++) {
    if (actions[i].action_type === type) return actions[i].value;
  }
  return '';
}

function mapRow_(d) {
  const msg = getAction_(d.actions,
    'onsite_conversion.messaging_conversation_started_7d');
  return [
    d.campaign_name || '',
    "'" + (d.campaign_id || ''),
    d.date_start || '',
    d.date_stop || '',
    num_(d.spend),
    num_(d.reach),
    '',
    msg !== '' ? num_(msg) : '',
    msg !== '' ? num_(msg) : '',
    num_(d.clicks),
    num_(d.ctr),
    num_(d.cpc)
  ];
}

function num_(v) {
  if (v === undefined || v === null || v === '') return '';
  const n = Number(v);
  return isNaN(n) ? v : n;
}

function writeToSheet_(sheetName, rows) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(sheetName);
  if (!sh) sh = ss.insertSheet(sheetName);

  const header = [
    'Campaign name', 'Campaign ID', 'Reporting starts', 'Reporting ends',
    'Amount spent (THB)-FB', 'Reach', 'Result type', 'Results',
    'Messaging conversations started', 'Clicks (all)', 'CTR (all)', 'CPC (all)'
  ];

  sh.clear();
  sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
  if (rows.length) {
    sh.getRange(2, 1, rows.length, header.length).setValues(rows);
  }
  sh.setFrozenRows(1);
}

// ====== TRIGGER ======

function createDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'runMonthly') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('runMonthly')
    .timeBased()
    .everyDays(1)
    .atHour(7)
    .create();
  Logger.log('ตั้ง trigger รายวันเรียบร้อย (07:00)');
}
