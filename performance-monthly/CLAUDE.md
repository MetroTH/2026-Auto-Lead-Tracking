# CLAUDE.md — Performance Monthly

## สถานะล่าสุด (อัปเดต 2026-06-17)

### ✅ ทดสอบผ่านแล้ว — ระบบพร้อมใช้งานจริง
- ทดสอบรัน Mode 1 จริง ข้อมูลถูกต้องครบทุกคอลัมน์ (A–P) แยกตามเดือน + แถว Other ✅
- Source B ดึงแบบรายเดือน (`time_increment: monthly`) แล้ว → Amount spent/Reach/ROAS
  กระจายถูกต้องตามแต่ละเดือน ไม่กองรวมเดือนเดียว ✅
- Format วันที่คอลัมน์ A (Jan-2026) และ C/D (yyyy-MM-dd) แสดงผลถูกต้องสม่ำเสมอ ✅

### ⏰ เวลา Trigger ทั้งระบบ (เรียงให้ข้อมูลไหลทันในวันเดียว)
| ลำดับ | Source | โปรเจกต์ | เวลา |
|---|---|---|---|
| 1 | A | db-from-respond-crm | 17:30 |
| 2 | B | meta-ads-sheets | 17:40 |
| 2 | D | leadcrm-google-sheet | 17:40 |
| 2 | E | invoicehead-detail-bi | 17:40 |
| 3 | F | performance-monthly | 18:00 (รันสุดท้าย) |

### ✅ แก้ Format วันที่
- คอลัมน์ A (Timestamp) และ C/D (Reporting starts/ends) ตั้ง `setNumberFormat('@')` (plain text)
  ก่อนเขียนค่า เพื่อกัน Google Sheets ตีความเป็นวันที่แล้วแสดงผลไม่ตรงกัน (เช่น "January-2026")
- เพิ่ม `formatDateStr_()` แปลงค่า Reporting starts/ends จาก Source B ให้เป็น `yyyy-MM-dd`
  เสมอ (เดิมใช้ `trimStr_` ซึ่งถ้าค่าเป็น Date object จะได้ string เวลาเต็มแบบ
  "Thu Jan 01 2026 15:00:00")

## สถานะก่อนหน้า (2026-06-16)

### ✅ สิ่งที่ทำแล้ว
- สร้าง `Code.gs` ครบทุกฟังก์ชัน (Mode 1 / Mode 2 / Trigger / onOpen)
- แก้ไข Source B: ชื่อชีต `FBADS` อยู่ในไฟล์เดียวกับ Performance (ไม่ต้อง File ID แยก)
- แก้ไข `parseDate_` รองรับ `dd/mm/yyyy` (Source A) และ `dd-MMM-yyyy`

### 🔄 สถานะการทดสอบ
- รัน Mode 1 ได้ข้อมูลครบ (May/June 2026 + แถว Other ต่อเดือน) ✅
- ตรวจ Column Index ทุก Source (A/B/D/E) ตรงกับ schema จริง ✅
- แก้ MQL(L)/Lead(M) ให้นับ respond_id แบบ distinct + ข้ามแถวไม่มี respond_id ✅
  (เดิมนับทุกแถว → Lead เกินจริงเพราะ D มีหลายแถวต่อ 1 respond_id ตาม Part No)
- QT(N)/Sales(O) = ผลรวมทุกแถว (ถูกต้อง เพราะรวมทุก Part/รายการ) ✅
- ROAS(P) = Sales/Amount Spent ต่อ Campaign, ถ้า spend=0/ว่าง → ปล่อยว่าง ✅

### 📌 หมายเหตุ Source B (สำคัญ!)
- Source B = ไฟล์ **FBCampaignADS_Part แยกต่างหาก** File ID `1-wZGx8GkBbnF24cC9TLOzIbZ0vhoPVxe8E_NohIzWfQ`
  (ไม่ใช่ไฟล์เดียวกับ Performance! แท็บ FBADS ในไฟล์ Performance เป็นสำเนาเก่า/ว่าง)
- ตั้งค่าแล้วใน `SS_B_ID`
- โค้ดรองรับชื่อแท็บหลายแบบ: `FBCampaignADS_Part` / `FBADS` / `Campaign_Monthly`
  และเลือกแท็บที่ **มีข้อมูลจริง** (มากกว่า 1 แถว) อัตโนมัติ

### 🔁 การบำรุงรักษา / ข้อควรรู้
1. ถ้าแก้โค้ด: Copy `Code.gs` วางใน Apps Script → Save → Reload Sheet → กดโหมด 1 ใหม่
2. Source B ต้องเป็นข้อมูล**รายเดือน** (meta-ads-sheets ใช้ `time_increment: monthly`)
   — ถ้าถอดออกจะรวมเป็นแถวเดียวทั้งช่วง ทำให้ Performance กองข้อมูลในเดือนเดียว
3. ข้อมูลก่อน ม.ค. 2026 จะถูกกรองทิ้งอัตโนมัติ (เริ่มนับจาก `MODE1_START_YEAR/MONTH`)
4. ROAS ว่าง = เดือนนั้นไม่มี Amount spent (B) หรือไม่มี Sales (E) ที่ match campaign

### 🔑 File IDs ที่ยืนยันแล้ว
| Source | File ID |
|---|---|
| A — Filter-raw-respond | `1Fq_Suvh1u-iTLzbIoyowiuXEHcKK1VtayDab2qO4Bwk` |
| B — FBCampaignADS_Part | `1-wZGx8GkBbnF24cC9TLOzIbZ0vhoPVxe8E_NohIzWfQ` (ไฟล์แยก) |
| D — Quotation | `14stvnZSD-WNp1N_bI-aEdJDb4IHplRkFiVh5WWwRwec` |
| E — Invoice | `1etfpucdZ66EixB_TPZNIUjd7nprnSB0myo_VCxWk_yk` |
| F — Performance | Active Spreadsheet (ไฟล์ Auto-Lead-Tracking-Performance ที่ Script deploy อยู่) |

---

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
| FBADS (B) | อยู่ในไฟล์เดียวกับ Performance | FBADS |
| Quotation Detail-Bi (D) | `14stvnZSD-WNp1N_bI-aEdJDb4IHplRkFiVh5WWwRwec` | Quotation |
| Invoicehead-Detail-Bi (E) | `1etfpucdZ66EixB_TPZNIUjd7nprnSB0myo_VCxWk_yk` | Invoice |
| Auto-Lead-Tracking-Performance (F) | Active Spreadsheet | Performance (output) |

---

## ตั้งค่า Source B (FBADS)

โดยปกติ **ไม่ต้องตั้งค่าอะไร** เพราะแท็บ `FBADS` อยู่ในไฟล์เดียวกับ Performance
Script จะอ่านจาก Active Spreadsheet ให้อัตโนมัติ

หาก FBADS ย้ายไปไฟล์อื่น ค่อยกำหนด File ID:
1. **แก้ใน Code.gs**: ใส่ค่า `SS_B_ID`
2. **Script Properties**: เพิ่ม `PERF_B_SS_ID` = File ID

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
- ทุกเดือนจะมีแถว "Other" ต่อจาก Campaign ทั้งหมดของเดือนนั้น
- รวบรวมข้อมูลที่ Campaign name ไม่ตรงกับ B

### Row "All Campaign" (แถวสรุปยอดรวมรายเดือน)
- แถวสุดท้ายของแต่ละเดือน ต่อจาก "Other" — สรุปยอดรวมทั้งเดือน (ทุก Campaign + Other)
- **E,F,G,H,I,N,O** = ผลรวม (sum) ของทั้งเดือน
- **L (MQL) / M (Lead)** = นับ respond_id แบบไม่ซ้ำ **ระดับทั้งเดือน** (ไม่เอาแต่ละ
  campaign มาบวกกัน เพราะ respond_id เดียวกันอาจอยู่หลาย campaign → จะเกินจริง)
- **J (CTR) / K (CPC)** = เว้นว่าง (เป็นอัตราส่วน รวมกันไม่ได้)
- **P (ROAS)** = Sales รวม ÷ Amount Spent รวม → ทำให้ ROAS ภาพรวมคำนวณได้แม้แถว Other
  ไม่มี Spent

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
