# CLAUDE.md — Performance Monthly

## สถานะล่าสุด (อัปเดต 2026-06-17)

### ✅ แก้ Format วันที่ (ล่าสุด)
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

### ⚠️ สิ่งที่ต้องทำต่อ
1. Copy `Code.gs` เวอร์ชันใหม่วางใน Apps Script → Save → Reload Sheet
2. กดเมนู **📊 Performance → โหมด 1** เพื่อทดสอบ
3. ตรวจสอบว่าคอลัมน์ L–O (MQL/Lead/QT/Sales) มีข้อมูลถูกต้อง
4. หากคอลัมน์ L–O ยังว่าง ให้เช็ค format วันที่ใน Source A, D, E เพิ่มเติม

### 🔑 File IDs ที่ยืนยันแล้ว
| Source | File ID |
|---|---|
| A — Filter-raw-respond | `1Fq_Suvh1u-iTLzbIoyowiuXEHcKK1VtayDab2qO4Bwk` |
| B — FBCampaignADS_Part | `1-wZGx8GkBbnF24cC9TLOzIbZ0vhoPVxe8E_NohIzWfQ` (ไฟล์แยก) |
| D — Quotation | `14stvnZSD-WNp1N_bI-aEdJDb4IHplRkFiVh5WWwRwec` |
| E — Invoice | `1etfpucdZ66EixB_TPZNIUjd7nprnSB0myo_VCxWk_yk` |
| F — Performance | Active Spreadsheet `1-wZGx8GkBbnF24cC9TLOzIbZ0vhoPVxe8E_NohIzWfQ` |

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
