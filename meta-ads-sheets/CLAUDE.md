# CLAUDE.md — บริบทโปรเจกต์ Meta Ads → Google Sheet

## ภาพรวม
โปรเจกต์นี้คือ Google Apps Script ที่ดึงข้อมูล Meta Ads (Facebook) Insights
เข้า Google Sheet โดยตรงผ่าน Meta Graph API เพื่อหลีกเลี่ยงการใช้ LLM token
(แนวทางที่ประหยัดสุด — รันบน Google ไม่ผ่าน Claude)

## ไฟล์สำคัญ
- `meta-ads-sheets/MetaAdsToSheet.gs` — โค้ด Apps Script หลัก (source of truth)
- `meta-ads-sheets/README.md` — คู่มือตั้งค่า

## ข้อมูลคงที่
- Ad Account ID: `301660159574939` (Parts Cat Thailand by MetroCAT)
- Sheet ปลายทาง: `FBCampaignADS_Part` (owner: metrocatthailand@gmail.com)
- Meta Graph API version: `v23.0`

## โครงสร้างคอลัมน์ที่โค้ดเขียน (ระดับ Campaign รายเดือน)
Campaign name | Campaign ID | Reporting starts | Reporting ends |
Amount spent (THB)-FB | Reach | Result type | Results |
Messaging conversations started | Clicks (all) | CTR (all) | CPC (all)

## หมายเหตุการทำงาน
- `onOpen()` — สร้าง custom menu **📈 Meta Ads** เมื่อเปิด Sheet
- `runMonthly()` — ดึงข้อมูล**รายเดือน**ตั้งแต่ `HISTORY_START` (2026-01-01) ถึงวันนี้
  แล้วเขียนทับชีตด้วยข้อมูลครบทุกเดือน (ใช้เป็นรอบหลัก/ตั้ง Trigger)
- `runCustom(since, until)` — ดึงตามช่วงวันที่ (รูปแบบ yyyy-MM-dd)
- `runCustomPrompt()` — เมนูถามช่วงวันที่จากผู้ใช้แล้วเรียก `runCustom()`
- `createDailyTrigger()` — ตั้ง trigger รันทุกวัน 17:40
- `removeDailyTrigger()` — ลบ trigger รายวัน
- **สำคัญ**: ใช้ `time_increment: 'monthly'` ใน API → Meta คืน 1 แถวต่อแคมเปญต่อเดือน
  (Reporting starts/ends เป็นช่วงของแต่ละเดือน) เพื่อให้ `performance-monthly`
  จัดกลุ่มตามเดือนได้ถูกต้อง — ห้ามถอดออก ไม่งั้นจะรวมเป็นแถวเดียวทั้งช่วง

## เมนู 📈 Meta Ads
| รายการ | ฟังก์ชัน |
|---|---|
| ดึงข้อมูลรายเดือน (ตั้งแต่ ม.ค.) | `runMonthly()` |
| ดึงข้อมูลตามช่วงวันที่... | `runCustomPrompt()` |
| ตั้ง Trigger รายวัน 17:40 | `createDailyTrigger()` |
| ลบ Trigger รายวัน | `removeDailyTrigger()` |
- คอลัมน์ "Result type" ปัจจุบันเว้นว่าง (ยังไม่ map ตาม objective)
- Campaign ID นำหน้าด้วย ' กัน Sheet แปลงเป็น scientific notation

## สิ่งที่ผู้ใช้ต้องเตรียมเอง (ไม่อยู่ใน repo)
- Meta Access Token สิทธิ์ `ads_read` (แนะนำ System User Token ไม่หมดอายุ)
- เก็บใน Apps Script → Script Properties: `META_ACCESS_TOKEN`
- **ห้าม** เก็บ token ลง git

## งานที่อาจขยายต่อในอนาคต
- เพิ่มตารางระดับ Ad รายสัปดาห์ (มีคอลัมน์ Status / คำแนะนำ ในไฟล์ Sheet เดิม)
- map คอลัมน์ "Result type" อัตโนมัติตาม objective ของแต่ละแคมเปญ
