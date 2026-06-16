# CLAUDE.md — Invoicehead-Detail-Bi

## ภาพรวม

Google Apps Script สำหรับ Sync ข้อมูล Invoice จาก Raw-data + CRM (`Filter-raw-respond`) เข้าชีต `Invoice` โดยอัตโนมัติ

---

## ไฟล์หลัก

- `Code.gs` — Google Apps Script หลัก
- `appsscript.json` — config (timezone Asia/Bangkok, V8)

---

## Spreadsheet ที่เกี่ยวข้อง

| ชื่อ | File ID |
|---|---|
| Invoicehead-Detail-Bi (active spreadsheet) | `1etfpucdZ66EixB_TPZNIUjd7nprnSB0myo_VCxWk_yk` |
| DB_From_Respond_CRM (CRM source) | `1Fq_Suvh1u-iTLzbIoyowiuXEHcKK1VtayDab2qO4Bwk` |

---

## Sheet Names

| Sheet | หน้าที่ |
|---|---|
| `Raw-data` | ข้อมูล Invoice ต้นทาง |
| `Invoice` | ชีตปลายทาง (output) |
| `Filter-raw-respond` (ใน CRM file) | ข้อมูล CRM |

---

## โครงสร้างคอลัมน์ Raw-data (0-based)

| Index | ข้อมูล |
|---|---|
| 0 | Date |
| 1 | Invoice No |
| 4 | Channel |
| 7 | Region Invoice |
| 8 | CustNo |
| 9 | CustomerName |
| 10 | Total Sales |
| 27 | Vertical |
| 30 | Main SalesRep: Name |
| 32 | Main SalesRep: Region |
| 33 | Main SalesRep: Position |

## โครงสร้างคอลัมน์ CRM (Filter-raw-respond, 0-based)

| Index | ข้อมูล |
|---|---|
| 1 | Account Number (match กับ CustNo) |
| 2 | respond_id |
| 3 | Contact Date |
| 4 | Contact Name |
| 6 | Platform |
| 11 | Business Phone |
| 14 | Branch |
| 31 | Source (AF) |
| 32 | Sub Source (AG) |
| 34 | Campaign name (AI) |
| 37 | Ad name (AL) |

## โครงสร้าง Output (Invoice sheet) — 21 คอลัมน์

A=Date, B=Invoice No, C=CustNo, D=CustomerName, E=Total Sales, F=Channel, G=Region Invoice, H=Vertical, I=SalesRep Name, J=SalesRep Region, K=SalesRep Position, L=respond_id, M=Contact Name, N=Platform, O=Branch, P=Business Phone, Q=Source, R=Sub Source, S=Campaign name, T=Ad name, U=_dedup_key

---

## Logic หลัก

- match `CustNo == Account Number` เลือก CRM แถว contactDate ล่าสุด
- เงื่อนไข: ต้องมี respond_id และ Invoice Date ภายใน **4 เดือน** หลัง CRM contactDate
- Dedup key = `InvoiceNo|Date|CustNo` (คอลัมน์ U)

---

## โหมดการทำงาน (เมนู 🧾 Invoice Sync)

| โหมด | ฟังก์ชัน | พฤติกรรม |
|---|---|---|
| 1 | `runFullSync()` | ลบทั้งหมด sync ใหม่ |
| 2 | `runManualSync()` | เพิ่มเฉพาะแถวใหม่ |
| 3 (Trigger) | `syncInvoice()` | อัตโนมัติทุกวัน 06:00 Asia/Bangkok |

---

## วิธีใช้งาน

1. เปิด Google Sheet `Invoicehead-Detail-Bi`
2. Extensions → Apps Script → วาง `Code.gs` → Save
3. Reload Sheet → เมนู 🧾 Invoice Sync จะปรากฏ
4. ครั้งแรกต้องกด Allow permission
