import os
import time
import json
from playwright.sync_api import sync_playwright

def run_real_browser_simulation():
    artifacts_dir = "/Users/vietmac/.gemini/antigravity/brain/5440c8ec-5ac4-44c3-80fe-3bae647c1a30"
    os.makedirs(artifacts_dir, exist_ok=True)
    
    # 1. Tạo 1 file ảnh test thực tế
    test_img_path = "/tmp/anh_chup_lop_hoc_test.jpg"
    from PIL import Image, ImageDraw, ImageFont
    img = Image.new("RGB", (600, 400), color=(15, 23, 42))
    d = ImageDraw.Draw(img)
    d.rectangle([(20, 20), (580, 380)], outline=(245, 158, 11), width=4)
    d.text((40, 160), "ANH CHUP LOP HOC THUC TE", fill=(255, 255, 255))
    d.text((40, 200), "Lop Offline VietMac - 24/08/2026", fill=(245, 158, 11))
    img.save(test_img_path, "JPEG")

    with sync_playwright() as p:
        print("🚀 [1/6] Khởi động trình duyệt Google Chrome thật...")
        browser = p.chromium.launch(channel="chrome", headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 900},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()

        # 2. Truy cập web live
        print("🌐 [2/6] Đang mở trang web thật: https://trada.fedu.vn ...")
        page.goto("https://trada.fedu.vn", wait_until="networkidle")
        time.sleep(1)
        
        # Chụp ảnh trang trước khi điền
        screenshot1 = os.path.join(artifacts_dir, "sim_1_trang_chu.png")
        page.screenshot(path=screenshot1)
        print(f"📸 Đã chụp màn hình trước khi điền: {screenshot1}")

        # 3. Thao tác điền form thật trên giao diện
        print("✍️ [3/6] Nhập dữ liệu học viên thật vào các ô input...")
        page.fill("#fullName", "Nguyễn Hoàng Nam (Test Trình Duyệt Thật)")
        page.fill("#phone", "0966888999")
        page.fill("#profession", "Chủ chuỗi nha khoa thẩm mỹ tại Hà Nội. Muốn xây kênh chia sẻ kiến thức nha khoa không đau và bọc sứ thẩm mỹ. Đang bí phần hook 3s đầu.")
        
        # Nhập link 1
        page.fill(".channel-link-input", "https://tiktok.com/@nam.nhakhoa")
        
        # Bấm nút thêm link khác
        page.click("button:has-text('+ Thêm link khác')")
        time.sleep(0.5)
        link_inputs = page.query_selector_all(".channel-link-input")
        if len(link_inputs) > 1:
            link_inputs[1].fill("https://facebook.com/namdental.clinic")
        
        page.fill("#impressedVideo", "Lướt thấy video anh chia sẻ bóc kịch bản 3 tầng trên TikTok. Xem cuốn quá nên xem tiếp 4 video rồi nhắn tin đăng ký chuyển khoản luôn.")
        page.fill("#feedbackAll", "2 ngày học rất đã, vỡ ra cách setup 2 góc máy và tư duy băm cảnh. Hôm nào rảnh em mời anh ly cafe nhé!")

        # Upload ảnh thật
        print("🖼️ Đính kèm ảnh kỷ niệm thật vào Dropzone...")
        file_input = page.query_selector("#imageFileInput")
        file_input.set_input_files(test_img_path)
        time.sleep(1)

        # Chụp ảnh form sau khi đã điền đầy đủ
        screenshot2 = os.path.join(artifacts_dir, "sim_2_form_da_dien.png")
        page.screenshot(path=screenshot2)
        print(f"📸 Đã chụp màn hình form đầy đủ: {screenshot2}")

        # 4. Bấm nút Submit thật trên trình duyệt
        print("📤 [4/6] Click nút [Gửi chia sẻ cho em]...")
        page.click("#btn-submit")
        
        # Chờ màn hình cảm ơn xuất hiện
        page.wait_for_selector("#success-container:not(.hidden)", timeout=15000)
        time.sleep(2)

        # Chụp ảnh màn hình cảm ơn
        screenshot3 = os.path.join(artifacts_dir, "sim_3_man_hinh_cam_on.png")
        page.screenshot(path=screenshot3)
        print(f"📸 Đã chụp màn hình cảm ơn: {screenshot3}")

        # 5. Mở trang Quản Trị /excel để kiểm tra bản ghi vừa nộp
        print("📊 [5/6] Mở trang Quản Trị https://trada.fedu.vn/excel ...")
        page.goto("https://trada.fedu.vn/excel", wait_until="networkidle")
        time.sleep(3)

        # Kiểm tra xem tên học viên có xuất hiện trên thẻ đầu tiên không
        content = page.content()
        has_new_student = "Nguyễn Hoàng Nam" in content
        print(f"🔍 Kiểm tra bản ghi mới trên bảng quản trị: {'✅ TÌM THẤY' if has_new_student else '❌ CHƯA THẤY'}")

        # Chụp ảnh trang quản trị cards view
        screenshot4 = os.path.join(artifacts_dir, "sim_4_bang_quan_ly_cards.png")
        page.screenshot(path=screenshot4, full_page=True)
        print(f"📸 Đã chụp toàn bộ bảng quản trị: {screenshot4}")

        browser.close()
        print("🎉 [6/6] Hoàn tất toàn bộ quy trình mô phỏng trên trình duyệt thật 100%!")

if __name__ == "__main__":
    run_real_browser_simulation()
