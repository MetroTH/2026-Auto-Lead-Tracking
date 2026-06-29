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
| `performance-monthly/` | Auto-Lead-Tracking-Performance | รวม Source A–E เป็น Dashboard Performance รายเดือน แยกตาม Campaign |

แต่ละโฟลเดอร์มี `CLAUDE.md` อธิบายรายละเอียดของโปรเจกต์นั้นๆ แยกกัน

---

## Google Sheet Files — ภาพรวมทั้งระบบ

### ไฟล์ข้อมูลหลัก (Shared)

| ชื่อไฟล์ | File ID | ใช้โดย |
|---|---|---|
| DB_From_Respond_CRM | `1Fq_Suvh1u-iTLzbIoyowiuXEHcKK1VtayDab2qO4Bwk` | leadcrm-google-sheet, invoicehead-detail-bi |
| From-Facebook Ads-Respon.io (DB01) | `19yN662iCppjMFJTONgZHpbQH4gOkUtDxUcvqYZyPcKw` | db-from-respond-crm, leadcrm-google-sheet |

### ไฟล์ประจำแต่ละ Script

| โฟลเดอร์ | ไฟล์ที่ Script deploy อยู่ | File ID |
|---|---|---|
| `db-from-respond-crm/` | DB_From_Respond_CRM | `1Fq_Suvh1u-iTLzbIoyowiuXEHcKK1VtayDab2qO4Bwk` |
| `leadcrm-google-sheet/` | Quotation Detail-Bi | `14stvnZSD-WNp1N_bI-aEdJDb4IHplRkFiVh5WWwRwec` |
| `invoicehead-detail-bi/` | Invoicehead-Detail-Bi | `1etfpucdZ66EixB_TPZNIUjd7nprnSB0myo_VCxWk_yk` |
| `meta-ads-sheets/` | FBCampaignADS_Part | (Active Spreadsheet — ไม่มี File ID แยก) |
| `performance-monthly/` | Auto-Lead-Tracking-Performance | `1GHdmsaWElEgJdbmtAkawV0g9qtQjIgOYcpKwVp-MyeU` |

### Sheet Names ในแต่ละไฟล์

**DB_From_Respond_CRM** (`1Fq_...`)
- `raw-respond` — ข้อมูลดิบจาก Respon.io (source)
- `Filter-raw-respond` — ข้อมูลที่กรองแล้ว (output ของ `db-from-respond-crm/`)

**From-Facebook Ads-Respon.io / DB01** (`19yN...`)
- `Raw-data` — Ads lead data (Timestamp, Campaign name, respond_id)

**Quotation Detail-Bi** (`14st...`)
- `Raw-data` — ข้อมูล Quotation ดิบ
- `Quotation` — output ของ `leadcrm-google-sheet/`

**Invoicehead-Detail-Bi** (`1etf...`)
- `Raw-data` — ข้อมูล Invoice ดิบ
- `Invoice` — output ของ `invoicehead-detail-bi/`

**FBCampaignADS_Part** (`1-wZGx8...` — Source B ของ performance-monthly)
- `Campaign_Monthly` — output ของ `meta-ads-sheets/` (รองรับชื่อแท็บ `FBCampaignADS_Part` / `FBADS` / `Campaign_Monthly`)

**Auto-Lead-Tracking-Performance** (`1GHdmsa...`)
- `Performance` — output ของ `performance-monthly/` (Dashboard รายเดือน คอลัมน์ A–R)

---

## Diagram การไหลของข้อมูล

```
DB01 (Facebook Ads — Raw-data)
  └─► db-from-respond-crm ──► Filter-raw-respond (DB_From_Respond_CRM) ─────┐ (A)
                                      │                                      │
                     ┌────────────────┴────────────────┐                    │
                     ▼                                 ▼                     │
            leadcrm-google-sheet            invoicehead-detail-bi           │
            (Quotation Detail-Bi)           (Invoicehead-Detail-Bi)         │
                     │ (D)                          │ (E)                    │
Meta Graph API ──► meta-ads-sheets ──► FBCampaignADS_Part (B)               │
                     │                              │                       │
                     └──────────────┬───────────────┴───────────────────────┘
                                    ▼
                          performance-monthly  ──►  Auto-Lead-Tracking-Performance
                          (รวม A,B,D,E → Sheet "Performance" รายเดือน × Campaign)
```

> **หมายเหตุลำดับการรัน:**
> 1. `db-from-respond-crm` ต้องรันก่อนเสมอ เพราะ `leadcrm-google-sheet` และ `invoicehead-detail-bi` ดึง `Filter-raw-respond` ที่เป็น output ของมัน
> 2. `performance-monthly` ต้องรัน **สุดท้าย** เพราะดึง Source A (Filter-raw-respond), B (FBCampaignADS_Part), D (Quotation), E (Invoice) มารวมกัน
> 3. เวลา Trigger เรียงให้ข้อมูลไหลทันในวันเดียว: A 17:30 → B/D/E 17:40 → F (performance-monthly) 18:00

---

## หมายเหตุสำคัญ

- แต่ละโฟลเดอร์คือ Apps Script คนละโปรเจกต์ ไม่ขึ้นต่อกัน
- แก้ไขโค้ดในโฟลเดอร์ที่ต้องการ แล้ว copy ไปวางใน Google Apps Script Editor ของ Sheet ที่เกี่ยวข้อง
- ห้าม commit token / credentials ลง repo
- owner: metrocatthailand@gmail.com
