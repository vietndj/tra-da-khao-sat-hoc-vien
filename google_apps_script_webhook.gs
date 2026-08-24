/**
 * =========================================================================
 * GOOGLE APPS SCRIPT WEBHOOK: HỨNG DỮ LIỆU KHẢO SÁT HỌC VIÊN ANH VIỆT (VIETMAC)
 * =========================================================================
 * 
 * HƯỚNG DẪN CÀI ĐẶT 1 LẦN (DÙNG MÃI MÃI CHO MỌI KHÓA HỌC):
 * 1. Mở Google Sheet (Tạo mới hoặc dùng file Mau_Bang_Khao_Sat_Hoc_Vien_VietMac).
 * 2. Trên thanh menu, chọn: Tiện ích mở rộng (Extensions) -> Apps Script.
 * 3. Xóa hết code cũ, dán toàn bộ đoạn code bên dưới vào.
 * 4. Bấm "Triển khai" (Deploy) -> "Tùy chọn triển khai mới" (New deployment).
 * 5. Chọn loại: "Ứng dụng web" (Web App).
 *    - Mô tả: "Webhook Khao Sat Hoc Vien"
 *    - Thực thi dưới dạng (Execute as): "Tôi" (Me)
 *    - Ai có quyền truy cập (Who has access): "Bất kỳ ai" (Anyone - Không cần đăng nhập)
 * 6. Bấm "Triển khai", cấp quyền truy cập của Google.
 * 7. Copy "URL Ứng dụng web" (Web App URL) và dán vào biến `GOOGLE_SHEET_WEBHOOK_URL` trong file `anh-viet-hoi-moi-nguoi.html`.
 * =========================================================================
 */

// CẤU HÌNH TÙY CHỌN BẮN THÔNG BÁO TELEGRAM (NẾU CÓ)
const TELEGRAM_BOT_TOKEN = "7953251433:AAGkI2t-lQv-X2yS8z58vI1KjW0y4FfV_hQ"; // Hoặc để trống nếu không dùng
const TELEGRAM_CHAT_ID = "6190978939"; // Chat ID của anh Việt

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000); // Tránh ghi đè khi nhiều học viên nộp cùng lúc
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("Dữ Liệu Khảo Sát");
    
    // Nếu chưa có sheet, tự động tạo sheet và thêm tiêu đề đẹp
    if (!sheet) {
      sheet = ss.insertSheet("Dữ Liệu Khảo Sát");
      const headers = [
        "Mã Phản Hồi",
        "Thời Gian Gửi",
        "Khóa Học",
        "Họ Và Tên",
        "Số Điện Thoại / Zalo",
        "Nghề Nghiệp / Dự Án",
        "Link Kênh / Profile",
        "Nguồn Biết Đến",
        "Video Ấn Tượng Nhất",
        "Điều Tâm Đắc Nhất",
        "Góp Ý Vận Hành & Lớp Học",
        "Điểm Đánh Giá (1-10)",
        "Nhu Cầu Khóa Nâng Cao",
        "Kênh Liên Hệ Ưu Tiên",
        "Lời Nhắn Nhủ Riêng"
      ];
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length)
           .setBackground("#1E293B")
           .setFontColor("#FFFFFF")
           .setFontWeight("bold")
           .setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }
    
    let data;
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter;
      }
    } else {
      data = e.parameter || {};
    }
    
    // Sinh mã phản hồi tự động
    const lastRow = sheet.getLastRow();
    const responseId = "KS-" + Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd") + "-" + ("000" + lastRow).slice(-3);
    const timestamp = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");
    
    const row = [
      responseId,
      timestamp,
      data.course || "Offline Thực Chiến",
      data.fullName || "",
      data.phone || "",
      data.profession || "",
      data.channelLink || "",
      data.source || "",
      data.impressedVideo || "",
      data.bestValue || "",
      data.feedbackOperation || "",
      data.rating || 10,
      data.advancedNeeds || "",
      data.contactPreference || "Zalo",
      data.personalMessage || ""
    ];
    
    sheet.appendRow(row);
    
    // Tự động gửi thông báo qua Telegram cho anh Việt (nếu cấu hình)
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID && !TELEGRAM_BOT_TOKEN.includes("...")) {
      sendTelegramAlert(data, timestamp);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Gửi khảo sát thành công! Cảm ơn bạn rất nhiều.",
      responseId: responseId
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    message: "VietMac Survey Webhook is live & ready!"
  })).setMimeType(ContentService.MimeType.JSON);
}

function sendTelegramAlert(data, timestamp) {
  try {
    const text = `🎉 *HỌC VIÊN VỪA GỬI KHẢO SÁT MỚI!*\n\n` +
      `👤 *Học viên:* ${data.fullName || "Ẩn danh"}\n` +
      `📞 *SĐT/Zalo:* ${data.phone || "Chưa có"}\n` +
      `💼 *Nghề nghiệp:* ${data.profession || "Không rõ"}\n` +
      `🌐 *Link Kênh:* ${data.channelLink || "Chưa gửi"}\n` +
      `🎯 *Nguồn:* ${data.source || "Tự biết"}\n` +
      `⭐ *Đánh giá:* ${data.rating || 10}/10 sao\n` +
      `💡 *Tâm đắc:* ${data.bestValue || "Tuyệt vời"}\n` +
      `📝 *Góp ý vận hành:* ${data.feedbackOperation || "Không có"}\n` +
      `🚀 *Quan tâm nâng cao:* ${data.advancedNeeds || "Chưa chọn"}\n` +
      `💌 *Nhắn nhủ:* "${data.personalMessage || ""}"\n\n` +
      `⏰ _${timestamp}_`;

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: "Markdown"
      }),
      muteHttpExceptions: true
    });
  } catch (err) {
    Logger.log("Telegram error: " + err);
  }
}
