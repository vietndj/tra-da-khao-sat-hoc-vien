/**
 * =========================================================================
 * GOOGLE APPS SCRIPT WEBHOOK: HỨNG DỮ LIỆU KHẢO SÁT & ẢNH HỌC VIÊN ANH VIỆT (VIETMAC)
 * =========================================================================
 */

const TELEGRAM_BOT_TOKEN = "7953251433:AAGkI2t-lQv-X2yS8z58vI1KjW0y4FfV_hQ"; 
const TELEGRAM_CHAT_ID = "6190978939"; // Chat ID anh Việt

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
        "Link Thư Mục Ảnh (Drive)"
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
    
    // Xử lý lưu ảnh vào thư mục Google Drive (nếu có ảnh đính kèm)
    let driveFolderUrl = "";
    const photoCount = data.photoCount || (data.photos ? data.photos.length : 0);
    
    if (data.photos && data.photos.length > 0) {
      try {
        const folderName = `Anh_Hoc_Vien_${data.fullName || "Khach"}_${Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd_HHmmss")}`;
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
      photoCount,
      driveFolderUrl || (photoCount > 0 ? "Đã lưu ảnh trong payload" : "Không có ảnh")
    ];
    
    sheet.appendRow(row);
    
    // Gửi thông báo qua Telegram
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      sendTelegramAlert(data, timestamp, photoCount, driveFolderUrl);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Gửi khảo sát thành công! Em cảm ơn anh/chị rất nhiều.",
      responseId: responseId,
      photoCount: photoCount
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

function sendTelegramAlert(data, timestamp, photoCount, driveFolderUrl) {
  try {
    let text = `☕ *HỌC VIÊN VỪA GỬI CHIA SẺ TRÀ ĐÁ!*\n\n` +
      `👤 *Họ tên:* ${data.fullName || "Ẩn danh"}\n` +
      `📞 *Zalo:* ${data.phone || "Chưa có"}\n` +
      `💼 *Mảng KD & AI:* ${data.profession ? data.profession.substring(0, 150) + "..." : "Không rõ"}\n` +
      `🌐 *Link Kênh:* \n${data.channelLink || "Chưa gửi"}\n\n` +
      `🧭 *Hành trình xem video:* ${data.journeyStory ? data.journeyStory.substring(0, 150) + "..." : "Không rõ"}\n` +
      `📝 *Góp ý & Nhắn nhủ:* ${data.feedbackAll || "Không có"}\n` +
      `📸 *Ảnh kỷ niệm:* ${photoCount} ảnh ${driveFolderUrl ? `\n🔗 Link Drive: ${driveFolderUrl}` : ""}\n\n` +
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
