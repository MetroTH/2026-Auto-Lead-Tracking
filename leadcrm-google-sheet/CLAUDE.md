# CLAUDE.md — Leadcrm-google-sheet

## ภาพรวมโปรเจกต์

Google Apps Script สำหรับ sync ข้อมูล Quotation + CRM เข้า Google Sheet โดยอัตโนมัติ

---

## ไฟล์หลัก

- `Code.gs` — Google Apps Script หลัก (deploy ใน Google Apps Script Editor)
- `appsscript.json` — config ของ Apps Script

---

## Google Sheet File IDs

| ชื่อ | File ID | หมายเหตุ |
|------|---------|----------|
| Quotation Detail-Bi | `14stvnZSD-WNp1N_bI-aEdJDb4IHplRkFiVh5WWwRwec` | ไฟล์หลัก (Raw-data + Quotation sheet) |
| DB_From_Respond_CRM | `1Fq_Suvh1u-iTLzbIoyowiuXEHcKK1VtayDab2qO4Bwk` | ข้อมูล CRM จาก Respon.io |
| From-Facebook Ads-Respon.io (DB01) | `19yN662iCppjMFJTONgZHpbQH4gOkUtDxUcvqYZyPcKw` | Facebook Ads lead in |

---

## Sheet Names

| File | Sheet Name | ชื่อใช้ใน Code |
|------|-----------|----------------|
| Quotation Detail-Bi | `Raw-data` | RAWDATA_SHEET |
| Quotation Detail-Bi | `Quotation` | QUOTATION_SHEET (ปลายทาง) |
| DB_From_Respond_CRM | `Filter-raw-respond` | CRM_SHEET |
| DB01 Facebook Ads | `Raw-data` | CAMPAIGN_SHEET |

---

## โครงสร้างคอลัมน์

### Raw-data (Quotation Detail-Bi) — 0-based index
| Index | คอลัมน์ | ข้อมูล |
|-------|---------|--------|
| 0 | A | Quo. Date |
| 2 | C | Quotation No |
| 5 | F | Part No |
| 9 | J | Value |
| 10 | K | DCN |
| 11 | L | DCN Name |

### DB_From_Respond_CRM (Filter-raw-respond) — 0-based index
| Index | คอลัมน์ | ข้อมูล |
|-------|---------|--------|
| 1 | B | Account Number (match กับ DCN) |
| 2 | C | respond_id |
| 3 | D | Contact Date (lead in date) |
| 4 | E | Contact Name |
| 6 | G | Platform |
| 11 | L | Business Phone |
| 14 | O | Branch |
| 18 | S | Ad Product (สินค้าที่ลงโฆษณา) |
| 19 | T | Note1 |
| 31 | AF | Source |
| 32 | AG | Sub Source |
| 33 | AH | Ad campaign ID |
| 34 | AI | Campaign name |
| 35 | AJ | Ad group ID |
| 36 | AK | Ad ID |
| 37 | AL | Ad name |

### DB01 Facebook Ads (Raw-data) — 0-based index
| Index | คอลัมน์ | ข้อมูล |
|-------|---------|--------|
| 0 | A | Timestamp |
| 8 | I | Campaign name |
| 11 | L | respond_id |

---

## โครงสร้าง Output (Quotation sheet)

| คอลัมน์ | ข้อมูล | แหล่งที่มา |
|---------|--------|------------|
| A | Quo. Date (format yyyy-MM-dd) | Raw-data |
| B | Quotation No | Raw-data |
| C | Value | Raw-data |
| D | DCN | Raw-data |
| E | DCN Name | Raw-data |
| F | respond_id | CRM |
| G | Contact Name | CRM |
| H | Platform | CRM |
| I | Branch | CRM |
| J | Business Phone | CRM |
| K | Note | CRM |
| L | Ad Product | CRM |
| M | _dedup_key (ห้ามลบ) | สร้างโดย Script |
| N | Campaign name | DB01 Facebook Ads |

---

## Logic หลัก

### การ Match ข้อมูล
1. **Raw-data → CRM**: match `DCN == Account Number` เลือก CRM แถว contactDate ล่าสุดของแต่ละ DCN
2. **เงื่อนไข CRM**: ต้องมี `respond_id` เท่านั้น (แถวที่ respond_id ว่างจะถูกกรองออก)
3. **เงื่อนไขเวลา CRM**: `Quo.Date` ต้องอยู่ภายใน **4 เดือน** หลัง CRM contactDate (lead in)
4. **Campaign name**: match `respond_id` กับ DB01, เช็ค `Quo.Date` ภายใน **4 เดือน** หลัง DB01 Timestamp

### Dedup Key (คอลัมน์ M)
สร้างจาก: `Quotation|PartNo|Value|Date|DCN`
- ใช้ตรวจสอบว่าแถวนี้ sync ไปแล้วหรือยัง
- **ห้ามลบข้อมูลในคอลัมน์ M** แต่ซ่อนได้

---

## โหมดการทำงาน (Custom Menu "📋 CRM Sync")

| โหมด | ฟังก์ชัน | พฤติกรรม |
|------|----------|-----------|
| 1 Full Sync | `runFullSync()` | ล้างข้อมูลทั้งหมด แล้ว sync ใหม่ทั้งหมด |
| 2 Manual Sync | `runManualSync()` | เพิ่มเฉพาะแถวใหม่ที่ยังไม่มี |
| 3 Trigger | `createDailyTrigger()` | อัตโนมัติทุกวัน 17:40 Asia/Bangkok |
| - | `removeAllTriggers()` | ลบ trigger ทั้งหมด |

---

## วิธีใช้งาน

1. เปิด Google Sheet `Quotation Detail-Bi`
2. คลิก **Extensions → Apps Script**
3. วาง `Code.gs` ทั้งหมด → Save
4. Reload Google Sheet (F5)
5. เมนู **📋 CRM Sync** จะปรากฏ
6. ครั้งแรกต้องกด Allow permission
