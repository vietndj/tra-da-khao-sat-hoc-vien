import json
import time
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from datetime import datetime

def run_simulation():
    print("🚀 [START] KÍCH HOẠT MÔ PHỎNG ĐIỀN FORM VÀ KIỂM THỬ DỮ LIỆU ĐẦU - CUỐI (E2E)")
    
    # 1. Danh sách học viên mô phỏng nộp form thực tế
    test_submissions = [
        {
            "course": "Offline Thực Chiến K12 - Hà Nội",
            "fullName": "Nguyễn Thu Trang",
            "phone": "0912345678",
            "profession": "Quản lý pháp chế MEDLATEC (Chuẩn bị mở cty luật riêng)",
            "channelLink": "https://facebook.com/thutrang.law",
            "source": "TikTok Video",
            "impressedVideo": "Quyết định đăng ký chỉ sau 20 giây xem video anh Việt nói về băm nhỏ phân cảnh và ứng dụng AI đa ngành",
            "bestValue": "Tư duy rất mới về ứng dụng AI, kỹ năng quay dựng và cách làm marketing đa ngành. Tự tin và định hướng rõ ràng hơn rất nhiều.",
            "feedbackOperation": "- Cần kiểm soát danh sách check-in vào lớp chặt chẽ hơn\n- Gửi link khảo sát ngắn trước buổi học\n- Thăm hỏi học viên vắng mặt hoặc về sớm\n- Dành 10p cuối giới thiệu gói nâng cao kèm ưu đãi tại lớp\n- Tư vấn rõ ưu đãi giảm 10% khi đăng ký nhóm 2 người",
            "rating": 10,
            "advancedNeeds": "AI Chuyên Sâu Tự Động Hóa Video, Xây Kênh Thương Hiệu Cá Nhân",
            "contactPreference": "Zalo",
            "personalMessage": "Giá trị Thầy mang lại là điều vô giá đối với Em ạ! Chúc Thầy và đội ngũ luôn giữ ngọn lửa nhiệt huyết."
        },
        {
            "course": "Offline Thực Chiến K12 - Hà Nội",
            "fullName": "Trần Quốc Huy",
            "phone": "0987654321",
            "profession": "Chủ chuỗi thời trang nam tại Hải Phòng",
            "channelLink": "https://tiktok.com/@huytran.menswear",
            "source": "Facebook Reels / Post",
            "impressedVideo": "Video bóc tách kịch bản 3 tầng bán quần áo không bị flop",
            "bestValue": "Nắm vững kỹ thuật setup 2 máy quay và cách nói chuyện tự nhiên trước ống kính",
            "feedbackOperation": "- Mong muốn có thêm buổi thực hành bối cảnh ngoại cảnh\n- Khâu tài liệu phát tay nên in sớm hơn",
            "rating": 9,
            "advancedNeeds": "Video Ads Bán Hàng Chuyển Đổi Cao",
            "contactPreference": "Zalo",
            "personalMessage": "Cảm ơn anh Việt nhiều, về Hải Phòng em sẽ bắt tay bấm máy quay ngay loạt video đầu tiên!"
        },
        {
            "course": "Online Video Masterclass K05",
            "fullName": "Lê Hoàng Minh",
            "phone": "0905123456",
            "profession": "Môi giới Bất động sản cao cấp TP.HCM",
            "channelLink": "https://youtube.com/@hoangminh.batdongsan",
            "source": "YouTube Video / Shorts",
            "impressedVideo": "Video hướng dẫn làm video BĐS không cần máy xịn, chỉ cần điện thoại và đèn",
            "bestValue": "Biết cách làm kịch bản đánh trúng nỗi đau người mua nhà và quy trình dựng video nhanh trong 15 phút",
            "feedbackOperation": "- Buổi Zoom nên tăng thêm thời lượng hỏi đáp 1-1\n- Gói nâng cao nên có nhóm hỗ trợ sửa video hàng tuần",
            "rating": 10,
            "advancedNeeds": "AI Chuyên Sâu Tự Động Hóa Video, Kèm 1-1 Setup Studio & Thực Chiến",
            "contactPreference": "Telegram",
            "personalMessage": "Mong anh sớm mở workshop trực tiếp tại Sài Gòn để anh em trong Nam được gặp anh!"
        }
    ]

    excel_file = "Mau_Bang_Khao_Sat_Hoc_Vien_VietMac.xlsx"
    wb = openpyxl.load_workbook(excel_file)
    ws_data = wb["Dữ Liệu Khảo Sát"]
    ws_crm = wb["CRM Kết Nối & Tặng Quà"]
    
    thin_border = Border(
        left=Side(style='thin', color='CBD5E1'),
        right=Side(style='thin', color='CBD5E1'),
        top=Side(style='thin', color='CBD5E1'),
        bottom=Side(style='thin', color='CBD5E1')
    )

    print(f"📊 Đang nạp {len(test_submissions)} bản ghi phản hồi vào Bảng Tính...")
    
    start_row = ws_data.max_row + 1
    for idx, sub in enumerate(test_submissions, start=1):
        resp_id = f"KS-2026-{start_row + idx - 1:04d}"
        time_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        
        row_data = [
            resp_id,
            time_str,
            sub["course"],
            sub["fullName"],
            sub["phone"],
            sub["profession"],
            sub["channelLink"],
            sub["source"],
            sub["impressedVideo"],
            sub["bestValue"],
            sub["feedbackOperation"],
            sub["rating"],
            sub["advancedNeeds"],
            sub["contactPreference"],
            sub["personalMessage"]
        ]
        
        ws_data.append(row_data)
        current_row = ws_data.max_row
        ws_data.row_dimensions[current_row].height = 48
        
        for col_idx in range(1, len(row_data) + 1):
            cell = ws_data.cell(row=current_row, column=col_idx)
            cell.font = Font(name="Arial", size=10)
            cell.alignment = Alignment(vertical="center", wrap_text=True)
            cell.border = thin_border
            if col_idx in [1, 2, 5, 12, 14]:
                cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            if col_idx == 12:
                cell.font = Font(name="Arial", size=11, bold=True, color="059669")

        # Cập nhật sang tab CRM
        crm_row_num = ws_crm.max_row + 1
        ws_crm.append([
            crm_row_num - 1,
            sub["fullName"],
            sub["profession"],
            sub["channelLink"],
            sub["phone"],
            f"Gói quà Prompt AI + {sub['advancedNeeds']}",
            "Đã tự động gắn tag & sẵn sàng gửi quà Zalo"
        ])
        ws_crm.row_dimensions[crm_row_num].height = 36
        for c in range(1, 8):
            c_cell = ws_crm.cell(row=crm_row_num, column=c)
            c_cell.font = Font(name="Arial", size=10)
            c_cell.alignment = Alignment(vertical="center", wrap_text=True)
            c_cell.border = thin_border
            if c in [1, 5, 7]:
                c_cell.alignment = Alignment(horizontal="center", vertical="center")

    wb.save(excel_file)
    print(f"✅ Đã lưu thành công dữ liệu vào {excel_file}")
    
    # 2. Kiểm thử xác thực lại dữ liệu vừa ghi
    wb_verify = openpyxl.load_workbook(excel_file)
    ws_v_data = wb_verify["Dữ Liệu Khảo Sát"]
    total_rows = ws_v_data.max_row - 1
    print(f"🔍 [KIỂM THỬ XÁC THỰC]: Tổng số phản hồi hiện có trong Sheet: {total_rows} bản ghi")
    
    # In ra terminal để nghiệm thu
    print("\n--- BẢN GHI VỪA CẬP NHẬT GẦN NHẤT ---")
    for r in range(max(2, ws_v_data.max_row - 2), ws_v_data.max_row + 1):
        name = ws_v_data.cell(row=r, column=4).value
        phone = ws_v_data.cell(row=r, column=5).value
        channel = ws_v_data.cell(row=r, column=7).value
        nps = ws_v_data.cell(row=r, column=12).value
        course = ws_v_data.cell(row=r, column=3).value
        print(f"📌 Dòng {r}: [{course}] - {name} ({phone}) | Kênh: {channel} | Điểm: {nps}/10 ⭐")

    return True

if __name__ == "__main__":
    run_simulation()
