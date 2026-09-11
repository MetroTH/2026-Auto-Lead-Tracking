# 2026 Auto Lead Tracking — Monorepo

รวม Google Apps Script ทั้งหมดสำหรับระบบ Lead Tracking ปี 2026

## โครงสร้าง

| โฟลเดอร์ | คืออะไร |
|---|---|
| `db-from-respond-crm/` | ดึงข้อมูลจาก raw-respond → Filter-raw-respond (DB02) |
| `invoicehead-detail-bi/` | Sync Invoice จากไฟล์กลาง Master Sales (`Raw Invoice`) + CRM |
| `leadcrm-google-sheet/` | Sync Quotation จากไฟล์กลาง Master Sales (`Raw Quotation`) + CRM |
| `meta-ads-sheets/` | ดึง Meta Ads Insights เข้า Google Sheet ผ่าน Graph API |

## วิธีใช้งาน

แต่ละโฟลเดอร์มี `README.md` และ `CLAUDE.md` อธิบายการติดตั้งแยกกัน

## ⚠️ ไฟล์กลาง Master Sales

ดึง raw จากไฟล์กลาง (แยกเป็น 2 ไฟล์แล้ว เพราะชนลิมิตเซลล์):
- `leadcrm-google-sheet` → **Master Sale-raw quotation** `1g6E1TzJLNOhTE7BBZMGHAqBiHl-qwg9Aka2PdJ0hf2M` (แทป `Raw Quotation`)
- `invoicehead-detail-bi` → **Master Sales-raw invoice** `1IQNdDeBBcPyNpXJi-jnWrIf3d4y-xGozydYryQiHzzw` (แทป `Raw Invoice`)

**ก่อนวางข้อมูลอ่าน [`MASTER-SALES-GUIDE.md`](MASTER-SALES-GUIDE.md) ก่อนทุกครั้ง**
(ห้ามสลับคอลัมน์ / เปลี่ยนชื่อหัว / เปลี่ยนชื่อแทป)
