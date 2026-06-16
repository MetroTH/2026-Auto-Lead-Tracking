# 2026 Auto Lead Tracking — Monorepo

รวม Google Apps Script ทั้งหมดสำหรับระบบ Lead Tracking ปี 2026

## โครงสร้าง

| โฟลเดอร์ | คืออะไร |
|---|---|
| `db-from-respond-crm/` | ดึงข้อมูลจาก raw-respond → Filter-raw-respond (DB02) |
| `invoicehead-detail-bi/` | Sync Invoice จาก Raw-data + CRM |
| `leadcrm-google-sheet/` | Sync Quotation + CRM เข้า Google Sheet |
| `meta-ads-sheets/` | ดึง Meta Ads Insights เข้า Google Sheet ผ่าน Graph API |

## วิธีใช้งาน

แต่ละโฟลเดอร์มี `README.md` และ `CLAUDE.md` อธิบายการติดตั้งแยกกัน
