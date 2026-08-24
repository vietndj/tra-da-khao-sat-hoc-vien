/**
 * =========================================================================
 * GOOGLE APPS SCRIPT WEBHOOK: HỨNG DỮ LIỆU KHẢO SÁT & ẢNH HỌC VIÊN ANH VIỆT (VIETMAC)
 * Kết nối trực tiếp Google Sheet + Google Drive + Bot Telegram NOVA-CORE
 * =========================================================================
 */

// Cấu hình Bot Telegram NOVA-CORE của anh Việt
const TELEGRAM_BOT_TOKEN = "8964853536:AAHuRNm_hY-YQtveBD1HlmthN4I5xpVzM8U"; 
const TELEGRAM_CHAT_ID = "2050406425"; // Chat ID anh Việt

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(15000);
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("Dữ Liệu Khảo Sát");
    
    if (!sheet) {
      sheet = ss.insertSheet("Dữ Liệu Khảo Sát");
      const headers = [
        "Mã Phản Hồi",
        "Thời Gian Gửi",
        "Khóa Học",
        "Họ Và Tên",
        "Số Zalo Hay Dùng",
        "Mảng Kinh Doanh & Định Hướng AI",
        "Link Kênh / Video / FB",
        "Hành Trình Biết Đến & Xem Video",
        "Góp Ý Thẳng Thắn & Lời Nhắn",
        "Số Lượng Ảnh Kỷ Niệm",
        "Link Thư Mục Ảnh (Google Drive)"
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
    
    const lastRow = sheet.getLastRow();
    const responseId = "KS-" + Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd") + "-" + ("000" + lastRow).slice(-3);
    const timestamp = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");
    
    // Xử lý tự động tạo thư mục trên Google Drive và lưu ảnh gốc
    let driveFolderUrl = "";
    const photoCount = data.photoCount || (data.photos ? data.photos.length : 0);
    
    if (data.photos && data.photos.length > 0) {
      try {
        const folderName = `Anh_Hoc_Vien_${(data.fullName || "HocVien").replace(/\s+/g, "_")}_${Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd_HHmmss")}`;
        const folder = DriveApp.createFolder(folderName);
        driveFolderUrl = folder.getUrl();
        
        data.photos.forEach((photo, idx) => {
          if (photo.data && photo.data.includes("base64,")) {
            const base64Data = photo.data.split("base64,")[1];
            const decoded = Utilities.base64Decode(base64Data);
            const blob = Utilities.newBlob(decoded, "image/jpeg", photo.name || `photo_${idx + 1}.jpg`);
            folder.createFile(blob);
          }
        });
      } catch (err) {
        driveFolderUrl = "Lỗi lưu ảnh Drive: " + err.toString();
      }
    }
    
    const row = [
      responseId,
      timestamp,
      data.course || "Khóa Offline Thực Chiến",
      data.fullName || "",
      data.phone || "",
      data.profession || "",
      data.channelLink || "",
      data.journeyStory || data.impressedVideo || "",
      data.feedbackAll || data.personalMessage || "",
      photoCount > 0 ? (photoCount + " ảnh") : "0 ảnh",
      driveFolderUrl || (photoCount > 0 ? "Đã lưu trong hệ thống" : "Không có ảnh")
    ];
    
    sheet.appendRow(row);
    
    // Gửi thông báo tức thì qua Telegram NOVA-CORE cho anh Việt
    sendTelegramAlert(data, timestamp, photoCount, driveFolderUrl);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Đã lưu vĩnh cửu vào Google Sheet thành công!",
      responseId: responseId,
      photoCount: photoCount,
      driveUrl: driveFolderUrl
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
  // Trả về dữ liệu JSON của toàn bộ Google Sheet để web đọc realtime
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Dữ Liệu Khảo Sát");
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ status: "empty", data: [] })).setMimeType(ContentService.MimeType.JSON);
    }
    const rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ status: "empty", data: [] })).setMimeType(ContentService.MimeType.JSON);
    }
    const headers = rows[0];
    const data = [];
    for (let i = 1; i < rows.length; i++) {
      const obj = {};
      headers.forEach((h, colIdx) => {
        obj[h] = rows[i][colIdx];
      });
      data.push(obj);
    }
    return ContentService.createTextOutput(JSON.stringify({ status: "success", data: data })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function sendTelegramAlert(data, timestamp, photoCount, driveFolderUrl) {
  try {
    const rawLinks = (data.channelLink || '').split('\n').filter(Boolean).map(l => "🔗 " + l).join('\n');
    
    const text = 
      `☕ <b>HỌC VIÊN VỪA GỬI PHẢN HỒI TRÀ ĐÁ!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 <b>Họ tên:</b> <b>${data.fullName || "Ẩn danh"}</b>\n` +
      `📞 <b>Số Zalo:</b> <a href="https://zalo.me/${data.phone}"><b>${data.phone || "Chưa có"}</b></a>\n` +
      `🎬 <b>Khóa học:</b> ${data.course || "Khóa Offline"}\n\n` +
      `💼 <b>Mảng Kinh Doanh & Định Hướng AI:</b>\n${data.profession || "Chưa chia sẻ"}\n\n` +
      (rawLinks ? `🌐 <b>Link Kênh / Profile:</b>\n${rawLinks}\n\n` : '') +
      `📍 <b>Hành trình biết đến:</b>\n<i>"${data.journeyStory || data.impressedVideo || "Không có"}"</i>\n\n` +
      `💬 <b>Góp ý & Lời nhắn:</b>\n${data.feedbackAll || "Không có"}\n\n` +
      `📸 <b>Ảnh kỷ niệm:</b> <b>${photoCount} ảnh</b> ${driveFolderUrl ? `\n📁 <b>Link Drive:</b> <a href="${driveFolderUrl}">Mở thư mục ảnh</a>` : ""}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `⏰ <i>${timestamp}</i>`;

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: "HTML",
        disable_web_page_preview: false
      }),
      muteHttpExceptions: true
    });
  } catch (err) {
    Logger.log("Telegram error: " + err);
  }
}
