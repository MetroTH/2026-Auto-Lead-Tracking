# Quotation + CRM Sync (Google Apps Script)

ดึงข้อมูลจาก `Raw-data` (DB-Quotation 1) + `Filter-raw-respond` (DB-CRM) มาประกอบลงชีต `Quotation` ในไฟล์ **Quotation Detail-Bi** อัตโนมัติทุกวัน 06:00 น. (Asia/Bangkok) แบบต่อท้าย ไม่ทับ ไม่ซ้ำ

## ไฟล์
- `Code.gs` — โค้ดหลัก
- `appsscript.json` — manifest (timezone = Asia/Bangkok)

## การทำงาน
- คัดลอกทุกแถวตาม Part No จาก `Raw-data` → `Quotation` (A=Quo.Date, B=Quotation, C=Value(YTD), D=DCN, E=DCN Name)
- เติม CRM (F=respond_id, G=Contact Name, H=Platform, I=Branch, J=Business Phone, K=Note, L=สินค้าที่ลงโฆษณา) โดย match `DCN == Account Number` เลือกแถววันที่ล่าสุดของ CRM
- กันซ้ำด้วย dedup key เก็บในคอลัมน์ M (`_dedup_key` = Quotation|PartNo|Value|QuoDate|DCN)

## ติดตั้ง (Paste เอง)
1. เปิดไฟล์ **Quotation Detail-Bi** บน Google Sheets
2. เมนู **Extensions → Apps Script**
3. ลบโค้ดเดิมใน `Code.gs` แล้ววางเนื้อหาจาก `Code.gs` ในรีโปนี้
4. (แนะนำ) เปิด manifest: ⚙️ **Project Settings → ติ๊ก "Show appsscript.json"** แล้ววางเนื้อหา `appsscript.json` (ให้ timezone = Asia/Bangkok)
5. กด **Save** 💾
6. เลือกฟังก์ชัน `syncQuotation` แล้วกด **Run** → อนุญาตสิทธิ์ (Authorize) ครั้งแรก (จะขอเข้าถึง Google Sheets ทั้งสองไฟล์)
7. เลือกฟังก์ชัน `createDailyTrigger` แล้วกด **Run** หนึ่งครั้ง เพื่อตั้งรันอัตโนมัติทุกวัน 06:00
8. ตรวจที่เมนู ⏰ **Triggers** ว่ามี `syncQuotation` รายวัน 06:00 หนึ่งตัว

## หมายเหตุ
- สคริปต์รันด้วยบัญชี Google ของคุณ จึงต้องมีสิทธิ์เข้าถึงทั้งสองไฟล์ (เป็นเจ้าของอยู่แล้ว)
- รัน `syncQuotation` ซ้ำได้เสมอ จะเพิ่มเฉพาะแถวใหม่ที่ยังไม่มี
- คอลัมน์ M เป็นคอลัมน์ช่วยกันซ้ำ ห้ามลบ (ซ่อนได้)
