# Meta Ads → Google Sheet (Apps Script)

ดึงข้อมูล Meta Ads (Facebook) Insights เข้า Google Sheet โดยตรงผ่าน Meta Graph API
ทำงานบน Google Apps Script — **ไม่เสีย LLM token** หลังตั้งค่าเสร็จ

> 📦 โฟลเดอร์นี้เป็นชุดแยกพกพาได้ (self-contained) — คัดลอกทั้งโฟลเดอร์ไปวางใน repo ใหม่ได้เลย

## ไฟล์ในโฟลเดอร์
| ไฟล์ | คืออะไร |
|---|---|
| `MetaAdsToSheet.gs` | โค้ด Apps Script หลัก |
| `README.md` | คู่มือนี้ |
| `CLAUDE.md` | บริบทสำหรับ AI (Claude) โหลดอัตโนมัติเวลามาแก้ไขรอบหน้า |

## ข้อมูลโปรเจกต์
- **Ad Account ID:** `301660159574939` (Parts Cat Thailand by MetroCAT)
- **Sheet ปลายทาง:** `FBCampaignADS_Part`
- **Owner:** metrocatthailand@gmail.com

## วิธีตั้งค่า (ครั้งเดียว)

### 1. สร้าง Meta Access Token (สิทธิ์ `ads_read`)
แนะนำ **System User Token** (ไม่หมดอายุ):
1. เข้า business.facebook.com → **Business Settings**
2. **Users → System Users** → สร้าง/เลือก user
3. **Generate Token** → เลือก App + ติ๊กสิทธิ์ `ads_read` → คัดลอก

### 2. วางโค้ดลง Apps Script
- เปิด Sheet `FBCampaignADS_Part` → **Extensions → Apps Script**
- วางเนื้อหา `MetaAdsToSheet.gs` ทั้งหมด

### 3. ตั้งค่า Script Properties
**Project Settings → Script Properties** เพิ่ม:
| Key | Value |
|---|---|
| `META_ACCESS_TOKEN` | (token จากขั้นตอน 1) |
| `AD_ACCOUNT_ID` | `301660159574939` |
| `SHEET_NAME` | `Campaign_Monthly` |

### 4. รัน + ตั้งเวลา
- รัน `runMonthly()` 1 ครั้ง (เพื่อ authorize)
- รัน `createDailyTrigger()` → ดึงอัตโนมัติทุกวัน 07:00

## ⚠️ ความปลอดภัย
- **ห้าม** commit `META_ACCESS_TOKEN` ลง git — เก็บใน Script Properties เท่านั้น
