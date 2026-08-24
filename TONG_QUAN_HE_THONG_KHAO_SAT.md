# 📊 TỔNG QUAN HỆ THỐNG KHẢO SÁT & KẾT NỐI HỌC VIÊN 7-LEVEL
**Dự án:** Trà Đá Sau Giờ Học (`tra-da-khao-sat-hoc-vien`)  
**Quản trị viên:** Nguyễn Đức Việt (VietMac)

---

## 1. CÁC ĐƯỜNG LINK TRỰC TIẾP (LIVE LINKS)

* 🌟 **Tên miền thương hiệu chính:** `https://trada.fedu.vn` *(hoặc `https://tra-da.fedu.vn`)*
* 🚀 **Link Vercel dự phòng:** `https://tra-da-khao-sat-hoc-vien.vercel.app`
* 🌐 **Link hệ thống Fedu:** `http://fedu.vn/tra-da-khao-sat-hoc-vien/`
* 🐙 **Mã nguồn GitHub:** `https://github.com/vietndj/tra-da-khao-sat-hoc-vien`

---

## 2. VỊ TRÍ LƯU TRỮ TRÊN MÁY TÍNH CỦA ANH

Toàn bộ hệ thống được đặt tại thư mục:  
📁 `/Users/vietmac/Documents/CODE/tra-da-khao-sat-hoc-vien/`

Các tệp tin quan trọng bên trong:
1. `index.html` / `tra-da-sau-gio-hoc.html`: Giao diện khảo sát web 7 tầng, có 2 câu thơ lục bát mở màn, lưu nháp tự động và pháo hoa chúc mừng.
2. `Mau_Bang_Khao_Sat_Hoc_Vien_VietMac.xlsx`: Bảng tính Excel quản lý dữ liệu (Tab Raw Data, Dashboard NPS và CRM Kết nối & Tặng quà).
3. `google_apps_script_webhook.gs`: Mã nguồn kết nối Google Sheets và tự động bắn thông báo qua Telegram khi có học viên nộp bài.
4. `simulate_survey_e2e.py`: Script tự động mô phỏng điền form và kiểm tra toàn vẹn dữ liệu.
5. `cf_subdomain.py`: Công cụ tự động tạo thêm subdomain Cloudflare & Vercel trong 1 giây.
6. `vercel.json`: Cấu hình routing cho server Vercel.

---

## 3. THÔNG TIN BẢO MẬT & TOKEN ĐÃ LƯU TRÊN HỆ THỐNG

Token Cloudflare của anh đã được lưu an toàn tại 2 vị trí bảo mật cục bộ (được gitignore để không lộ lên mạng):
* File 1: `/Users/vietmac/Documents/CODE/cloudflare_credentials.json`
* File 2: `~/.gemini/config/cloudflare_credentials.json`

Thông số Cloudflare đã cấu hình:
* **Account:** `Vietndj@gmail.com`
* **Zone fedu.vn ID:** `9c17d0cd27fc0acd753413b39be370a6`
* **DNS Records đã tạo:** `trada.fedu.vn` và `tra-da.fedu.vn` trỏ về `cname.vercel-dns.com`

---

## 4. CÁCH GỬI LINK CHO TỪNG KHÓA HỌC KHÁC NHAU

Hệ thống tự động phân loại học viên theo từng lớp bằng cách thêm đuôi `?course=...` vào link:

* **Offline Hà Nội:** `https://trada.fedu.vn/?course=Offline_K12_HaNoi`
* **Offline Sài Gòn:** `https://trada.fedu.vn/?course=Offline_K13_SaiGon`
* **Offline Hải Phòng:** `https://trada.fedu.vn/?course=Offline_HaiPhong`
* **Online Masterclass:** `https://trada.fedu.vn/?course=Online_Masterclass_K05`
* **AI Video Automation:** `https://trada.fedu.vn/?course=AI_Video_K01`

---

## 5. LỆNH TỰ ĐỘNG TẠO TÊN MIỀN CON MỚI TRONG TƯƠNG LAI

Bất kỳ khi nào anh muốn tạo một tên miền con mới (ví dụ: `ai.fedu.vn`, `bds.fedu.vn`, `landing.fedu.vn`), anh chỉ cần chạy 1 dòng lệnh:
```bash
python3 /Users/vietmac/Documents/CODE/cf_subdomain.py --sub [ten_mien_con] --project [ten_project_vercel]
```
Hệ thống sẽ tự động gọi Cloudflare tạo DNS và gán vào Vercel trong đúng 2 giây mà anh không cần mở web Cloudflare!
