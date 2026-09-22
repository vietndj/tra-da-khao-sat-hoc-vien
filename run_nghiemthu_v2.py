import os
import time
import json
from playwright.sync_api import sync_playwright

def run():
    artifacts_dir = "/Users/vietmac/.gemini/antigravity/brain/9251dee1-fbd6-4ff1-8459-489624eec3f8"
    os.makedirs(artifacts_dir, exist_ok=True)
    
    test_img_path = "/tmp/anh_chup_lop_hoc_test.jpg"
    from PIL import Image, ImageDraw, ImageFont
    img = Image.new("RGB", (600, 400), color=(15, 23, 42))
    d = ImageDraw.Draw(img)
    d.rectangle([(20, 20), (580, 380)], outline=(245, 158, 11), width=4)
    d.text((40, 160), "ANH CHUP LOP HOC THUC TE", fill=(255, 255, 255))
    d.text((40, 200), "Lop Offline VietMac - K3", fill=(245, 158, 11))
    img.save(test_img_path, "JPEG")

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 900}
        )
        page = context.new_page()

        page.goto("https://trada.fedu.vn", wait_until="networkidle")
        time.sleep(1)
        
        page.fill("#fullName", "Nguyễn Học Viên (NGHIỆM THU)")
        page.fill("#phone", "0999888777")
        page.fill("#email", "test_nghiemthu@fedu.vn")
        page.fill("#profession", "Test form update. Chủ doanh nghiệp cần check automation.")
        
        page.fill(".channel-link-input", "https://tiktok.com/@nghiemthu.test")
        
        # impressedVideo is hidden so we skip it to prevent Playwright error.
        page.fill("#feedbackAll", "Đã test xong UI mới: Form ngắn gọn, email thông báo trên success screen hoạt động tốt!")

        # Mở accordion ảnh
        try:
            page.click("summary:has-text('Nếu có ảnh thì gửi tặng em nhé')")
            time.sleep(0.5)
        except:
            pass

        file_input = page.query_selector("#imageFileInput")
        file_input.set_input_files(test_img_path)
        time.sleep(1)

        page.screenshot(path=os.path.join(artifacts_dir, "nghiemthu_1_form.png"))

        page.click("#btn-submit")
        page.wait_for_selector("#success-container:not(.hidden)", timeout=15000)
        time.sleep(2)
        
        page.screenshot(path=os.path.join(artifacts_dir, "nghiemthu_2_success.png"))

        page.goto("https://trada.fedu.vn/excel", wait_until="networkidle")
        time.sleep(3)
        page.screenshot(path=os.path.join(artifacts_dir, "nghiemthu_3_dashboard.png"), full_page=True)

        browser.close()
        print("Done NGHIEM THU!")

if __name__ == "__main__":
    run()
