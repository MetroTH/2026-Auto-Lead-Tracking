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
- `runMonthly()` — ดึงเดือนปัจจุบัน (วันที่ 1 ถึงวันนี้)
- `runCustom(since, until)` — ดึงตามช่วงวันที่ (รูปแบบ yyyy-MM-dd)
- `createDailyTrigger()` — ตั้ง trigger รันทุกวัน 23:55
- คอลัมน์ "Result type" ปัจจุบันเว้นว่าง (ยังไม่ map ตาม objective)
- Campaign ID นำหน้าด้วย ' กัน Sheet แปลงเป็น scientific notation

## สิ่งที่ผู้ใช้ต้องเตรียมเอง (ไม่อยู่ใน repo)
- Meta Access Token สิทธิ์ `ads_read` (แนะนำ System User Token ไม่หมดอายุ)
- เก็บใน Apps Script → Script Properties: `META_ACCESS_TOKEN`
- **ห้าม** เก็บ token ลง git

## งานที่อาจขยายต่อในอนาคต
- เพิ่มตารางระดับ Ad รายสัปดาห์ (มีคอลัมน์ Status / คำแนะนำ ในไฟล์ Sheet เดิม)
- map คอลัมน์ "Result type" อัตโนมัติตาม objective ของแต่ละแคมเปญ
