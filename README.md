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

`invoicehead-detail-bi` และ `leadcrm-google-sheet` ดึง raw จากไฟล์กลาง **Master Sales** ด้วย id
(แทป `Raw Invoice` / `Raw Quotation`) — **ก่อนวางข้อมูลอ่าน [`MASTER-SALES-GUIDE.md`](MASTER-SALES-GUIDE.md) ก่อนทุกครั้ง**
(ห้ามสลับคอลัมน์ / เปลี่ยนชื่อหัว / เปลี่ยนชื่อแทป)
