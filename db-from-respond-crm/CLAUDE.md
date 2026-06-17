# CLAUDE.md — DB_From_Respond_CRM

## ภาพรวม

Google Apps Script สำหรับดึงข้อมูลจากชีต `raw-respond` (DB01) ไปยังชีต `Filter-raw-respond` (DB02) โดยจัดกลุ่มตาม respond_id + วันที่ แบบไม่ซ้ำ

---

## ไฟล์หลัก

- `Code.gs` — Google Apps Script หลัก
- `appsscript.json` — config (timezone Asia/Bangkok, V8)

---

## Spreadsheet ที่เกี่ยวข้อง

| ชื่อ | File ID / Sheet |
|---|---|
| DB_From_Respond_CRM (active spreadsheet) | `1Fq_Suvh1u-iTLzbIoyowiuXEHcKK1VtayDab2qO4Bwk` |
| Source sheet | `raw-respond` |
| Target sheet | `Filter-raw-respond` |
| Ads spreadsheet (DB01) | `19yN662iCppjMFJTONgZHpbQH4gOkUtDxUcvqYZyPcKw` — sheet `Raw-data` |

---

## โครงสร้าง Output (Filter-raw-respond) — คอลัมน์ A–AL

- A–AE: ข้อมูลจาก raw-respond (Task_ID, Account Number, respond_id, ชื่อ, Platform, ฯลฯ)
- AF–AL: ข้อมูลจาก Ads sheet (Source, Sub Source, Ad campaign ID, Campaign name, Ad group ID, Ad ID, Ad name)

---

## Logic หลัก

- จัดกลุ่มตาม `respond_id + วันที่` เลือก row ที่ Task_ID ใหม่ที่สุดในวันนั้น
- Enrich ด้วย Ads ที่ใกล้ที่สุดใน ±7 วัน (นับจาก Ad Timestamp)
- เรียงผลลัพธ์ตาม Task_ID เก่า → ใหม่

---

## โหมดการทำงาน (เมนู 🔄 Respond CRM)

| โหมด | ฟังก์ชัน | พฤติกรรม |
|---|---|---|
| 1 | `runMode1_Full()` | ดึงทั้งหมด เขียนทับ DB02 |
| 2 | `runMode2_Incremental()` | ดึงเพิ่มเฉพาะที่ใหม่กว่าล่าสุด |
| 3 (Trigger) | `runMode3_Trigger()` | อัตโนมัติทุกวัน 17:30 Asia/Bangkok |

---

## วิธีใช้งาน

1. เปิด Google Sheet `DB_From_Respond_CRM`
2. Extensions → Apps Script → วาง `Code.gs` → Save
3. Reload Sheet → เมนู 🔄 Respond CRM จะปรากฏ
4. ครั้งแรกต้องกด Allow permission
