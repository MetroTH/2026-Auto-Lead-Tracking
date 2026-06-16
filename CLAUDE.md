# CLAUDE.md — 2026-Auto-Lead-Tracking (Monorepo)

## ภาพรวม

Monorepo รวม Google Apps Script ทั้งหมดสำหรับระบบ Lead Tracking ปี 2026 ของ MetroCAT

---

## โครงสร้าง Repo

| โฟลเดอร์ | ชื่อโปรเจกต์ | หน้าที่ |
|---|---|---|
| `db-from-respond-crm/` | DB_From_Respond_CRM | ดึงข้อมูล raw-respond (DB01) → Filter-raw-respond (DB02) |
| `invoicehead-detail-bi/` | Invoicehead-Detail-Bi | Sync Invoice จาก Raw-data + CRM |
| `leadcrm-google-sheet/` | Leadcrm-google-sheet | Sync Quotation + CRM เข้า Google Sheet |
| `meta-ads-sheets/` | Meta-Ads-Sheets | ดึง Meta Ads Insights เข้า Google Sheet ผ่าน Graph API |

แต่ละโฟลเดอร์มี `CLAUDE.md` อธิบายรายละเอียดของโปรเจกต์นั้นๆ แยกกัน

---

## Google Sheet File IDs (ใช้ร่วมกันหลาย script)

| ชื่อ | File ID |
|---|---|
| DB_From_Respond_CRM | `1Fq_Suvh1u-iTLzbIoyowiuXEHcKK1VtayDab2qO4Bwk` |
| From-Facebook Ads-Respon.io (DB01) | `19yN662iCppjMFJTONgZHpbQH4gOkUtDxUcvqYZyPcKw` |
| Quotation Detail-Bi | `14stvnZSD-WNp1N_bI-aEdJDb4IHplRkFiVh5WWwRwec` |
| Invoicehead-Detail-Bi | `1etfpucdZ66EixB_TPZNIUjd7nprnSB0myo_VCxWk_yk` |
| FBCampaignADS_Part | (Sheet ของ Meta Ads — owner: metrocatthailand@gmail.com) |

---

## หมายเหตุสำคัญ

- แต่ละโฟลเดอร์คือ Apps Script คนละโปรเจกต์ ไม่ขึ้นต่อกัน
- แก้ไขโค้ดในโฟลเดอร์ที่ต้องการ แล้ว copy ไปวางใน Google Apps Script Editor ของ Sheet ที่เกี่ยวข้อง
- ห้าม commit token / credentials ลง repo
