# 🇰🇷 งานเกาหลี — Gamified Korean Study App

**เป้าหมาย**: สอบภาษาเกาหลี EPS-TOPIK ผ่านกรมแรงงาน → ไปทำงานเกาหลี

**แนวคิด**: Gamification สร้างนิสัย (ไม่ใช่แรงบันดาลใจชั่วคราว) — เรียนภาษาให้เหมือนเล่นเกม

## กลไกหลัก

| ระบบ | รายละเอียด |
|------|-----------|
| **เหรียญ** 🪙 | จดบันทึกเรียน → ได้เหรียญ |
| **ร้านค้า** 🏪 | ใช้เหรียญ "ซื้อ" ของกินโปรดก่อนถึงจะกินได้ |
| **Streak** 🔥 | เรียนติดต่อกัน → โบนัสเพิ่ม |
| **Weekly Quest** 📋 | ภารกิจรายสัปดาห์ → เหรียญโบนัส |
| **AI Assistant** 🧠 | "คุณลุงซอ" คอยตรวจ ให้กำลังใจ |

## Tech Stack (ฟรีทั้งหมด)

- **Frontend**: HTML + Tailwind CSS + Vanilla JS
- **Deploy**: Vercel (ฟรี)
- **Data**: GitHub Repo (ไฟล์ .md)
- **Sync**: GitHub Actions / localStorage

## โครงสร้าง

```
งานเกาหลี/
├── index.html          # Dashboard หลัก
├── log.html            # หน้าจดบันทึกการเรียน
├── shop.html           # ร้านค้า
├── quests.html         # เควสรายสัปดาห์
├── stats.html          # สถิติ + Progress
├── js/
│   ├── app.js          # Main logic
│   ├── data.js         # Data management
│   └── shop.js         # Shop logic
├── css/
│   └── style.css
├── data/               # ไฟล์ .md สำหรับ GitHub
└── README.md
```

---

*โปรเจกต์นี้ไอเดียจากคลิป ลงทุน DIY — ปรับจากการออกกำลังกาย → เรียนภาษาเกาหลี*

**สถานะ**: ✅ Deployed!  [ngan-kaoli.vercel.app](https://ngan-kaoli.vercel.app)

## Live

| | |
|---|---|
| **🌐 เว็บ** | [ngan-kaoli.vercel.app](https://ngan-kaoli.vercel.app) |
| **📦 GitHub** | [github.com/ski539181/ngan-kaoli](https://github.com/ski539181/ngan-kaoli) |
| **⚡ Deploy** | Vercel (ฟรี)
