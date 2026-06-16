# CLAUDE.md — Performance Monthly

## ภาพรวม

Google Apps Script สำหรับดึงข้อมูลจาก 5 แหล่ง (A–E) รวมเป็น Dashboard Performance รายเดือน แยกตาม Campaign ลงใน Sheet F (Auto-Lead-Tracking-Performance)

---

## ไฟล์หลัก

- `Code.gs` — Google Apps Script หลัก
- `appsscript.json` — config (timezone Asia/Bangkok, V8)

---

## Deploy ที่ไหน

Script นี้ต้อง deploy ใน Google Sheet ชื่อ **Auto-Lead-Tracking-Performance** (Sheet F)
เพราะใช้ `SpreadsheetApp.getActiveSpreadsheet()` เป็น Output

---

## Spreadsheet ที่เกี่ยวข้อง

| ชื่อ (สัญลักษณ์) | File ID | Sheet |
|---|---|---|
| DB_From_Respond_CRM (A) | `1Fq_Suvh1u-iTLzbIoyowiuXEHcKK1VtayDab2qO4Bwk` | Filter-raw-respond |
| FBCampaignADS_Part (B) | **ต้องตั้งเอง** (ดูด้านล่าง) | FBCampaignADS_Part |
| Quotation Detail-Bi (D) | `14stvnZSD-WNp1N_bI-aEdJDb4IHplRkFiVh5WWwRwec` | Quotation |
| Invoicehead-Detail-Bi (E) | `1etfpucdZ66EixB_TPZNIUjd7nprnSB0myo_VCxWk_yk` | Invoice |
| Auto-Lead-Tracking-Performance (F) | Active Spreadsheet | Performance (output) |

---

## ตั้งค่า File ID ของ B (FBCampaignADS_Part)

เลือกอย่างใดอย่างหนึ่ง:

1. **แก้ใน Code.gs**: เปลี่ยน `SS_B_ID: ''` → ใส่ File ID ของ FBCampaignADS_Part
2. **Script Properties**: ไปที่ Project Settings → Script Properties → เพิ่ม `PERF_B_SS_ID` = File ID

---

## โครงสร้าง Output Sheet "Performance" — คอลัมน์ A–P

| คอลัมน์ | ชื่อ | แหล่งข้อมูล |
|---|---|---|
| A | Timestamp | เดือน-ปี เช่น Jan-2026 |
| B | Campaign name | B (FBCampaignADS_Part) + "Other" |
| C | Reporting starts | B |
| D | Reporting ends | B |
| E | Amount spent (THB)-FB | B |
| F | Reach | B |
| G | Results | B |
| H | Messaging conversations started | B |
| I | Clicks (all) | B |
| J | CTR (all) | B |
| K | CPC (all) | B |
| L | MQL | นับ respond_id จาก A (match campaign) |
| M | Lead | นับ respond_id จาก D (match campaign) |
| N | QT (Value) | ผลรวม Value จาก D (match campaign) |
| O | Sales | ผลรวม Total Sales จาก E (match campaign) |
| P | ROAS | O / E (Sales / Amount Spent) |

---

## Logic หลัก

### Campaign Matching (MQL / Lead / QT / Sales)
- แต่ละรายการใน A/D/E มี Campaign name
- ถ้า Campaign name ตรงกับ B ในเดือนเดียวกัน → เพิ่มค่าในแถว Campaign นั้น
- ถ้าไม่ตรง → เพิ่มค่าใน แถว "Other" ของเดือนนั้น

### Row "Other"
- ทุกเดือนจะมีแถว "Other" เป็นแถวสุดท้ายของเดือนนั้น
- รวบรวมข้อมูลที่ Campaign name ไม่ตรงกับ B

---

## โหมดการทำงาน (เมนู 📊 Performance)

| โหมด | ฟังก์ชัน | พฤติกรรม |
|---|---|---|
| 1 | `runMode1_Full()` | ล้าง Output ทั้งหมด สร้างใหม่ตั้งแต่ ม.ค. 2026 |
| 2 | `runMode2_Incremental()` | เพิ่มเฉพาะเดือนใหม่ + refresh เดือนปัจจุบัน |
| 3 (Trigger) | `runMode3_Trigger()` | อัตโนมัติทุกวัน 18:00 Asia/Bangkok |

---

## วิธีใช้งาน

1. เปิด Google Sheet **Auto-Lead-Tracking-Performance**
2. Extensions → Apps Script → วาง `Code.gs` → Save
3. ตั้งค่า `SS_B_ID` ใน CONFIG หรือ Script Properties
4. Reload Sheet → เมนู **📊 Performance** จะปรากฏ
5. ครั้งแรกกด **โหมด 1** เพื่อสร้างข้อมูลทั้งหมด
6. ครั้งต่อไปใช้ **โหมด 2** หรือตั้ง Trigger

---

## หมายเหตุ

- Source B ควรมีข้อมูลหลายเดือนสะสม (ถ้า MetaAdsToSheet เขียนทับทุกวัน ควรแก้ให้ append แทน)
- ถ้าเดือนใดไม่มีข้อมูล B คอลัมน์ C–K จะว่าง แต่ L–O ยังคำนวณได้
- ROAS = '' ถ้า Amount Spent = 0 หรือว่าง
