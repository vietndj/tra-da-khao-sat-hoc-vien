/**
 * =========================================================================
 * GOOGLE APPS SCRIPT WEBHOOK: HỨNG DỮ LIỆU KHẢO SÁT & TỰ ĐỘNG TẠO FOLDER ẢNH GOOGLE DRIVE
 * Bảng Khảo Sát & Ảnh Học Viên - VietMac (Trà Đá)
 * Spreadsheet ID: 1J9ZrjLxTba9R-wuet1n_J_hKcL0PVtQDD_ag65Ewx04
 * =========================================================================
 */

const SPREADSHEET_ID = "1J9ZrjLxTba9R-wuet1n_J_hKcL0PVtQDD_ag65Ewx04";
const TELEGRAM_BOT_TOKEN = "8964853536:AAHuRNm_hY-YQtveBD1HlmthN4I5xpVzM8U"; 
const TELEGRAM_CHAT_ID = "2050406425"; // Chat ID anh Việt

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(15000);
  
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName("Dữ Liệu Khảo Sát & Ảnh") || ss.getSheets()[0];
    
    // Đảm bảo tiêu đề cột đầy đủ
    if (sheet.getLastRow() === 0) {
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
        "Số Lượng Ảnh",
        "Link Thư Mục & File Ảnh (Google Drive)",
        "Ảnh Thu Nhỏ (Preview)"
      ];
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length)
           .setBackground("#1E293B")
           .setFontColor("#FFFFFF")
           .setFontWeight("bold")
           .setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }
    
    let data = {};
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter || {};
      }
    } else {
      data = e.parameter || {};
    }
    
    const lastRow = sheet.getLastRow();
    const responseId = "KS-2026-" + ("000" + lastRow).slice(-4);
    const timestamp = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");
    
    // Xử lý tự động tạo thư mục trên Google Drive và lưu ảnh gốc
    let driveFolderUrl = "";
    let fileLinksText = "";
    let firstImageFormula = "";
    const photoCount = data.photoCount || (data.photos ? data.photos.length : 0);
    
    if (data.photos && Array.isArray(data.photos) && data.photos.length > 0) {
      try {
        const studentCleanName = (data.fullName || "HocVien").replace(/[\/\\:*?"<>|]/g, "").trim();
        const folderName = `Ảnh Học Viên - ${studentCleanName} - ${Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd_HHmmss")}`;
        const folder = DriveApp.createFolder(folderName);
        folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        driveFolderUrl = folder.getUrl();
        
        let linkItems = [`📁 Thư mục Drive: ${driveFolderUrl}`];
        
        data.photos.forEach((photo, idx) => {
          if (photo.data && typeof photo.data === 'string' && photo.data.includes("base64,")) {
            const base64Data = photo.data.split("base64,")[1];
            const decoded = Utilities.base64Decode(base64Data);
            const fileName = photo.name || `anh_ky_niem_${idx + 1}.jpg`;
            const blob = Utilities.newBlob(decoded, "image/jpeg", fileName);
            const file = folder.createFile(blob);
            file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            
            const fileUrl = file.getUrl();
            linkItems.push(`${idx + 1}. ${fileName}: ${fileUrl}`);
            
            if (idx === 0) {
              const fileId = file.getId();
              firstImageFormula = `=IMAGE("https://drive.google.com/uc?export=view&id=${fileId}")`;
            }
          }
        });
        
        fileLinksText = linkItems.join("\n");
      } catch (err) {
        fileLinksText = "Lỗi lưu ảnh Google Drive: " + err.toString();
      }
    }
    
    const row = [
      responseId,
      timestamp,
      data.course || "Khóa Offline Thực Chiến - Hà Nội",
      data.fullName || "",
      data.phone || "",
      data.profession || "",
      data.channelLink || "",
      data.journeyStory || data.impressedVideo || "",
      data.feedbackAll || "",
      photoCount > 0 ? (photoCount + " ảnh") : "0 ảnh",
      fileLinksText || (photoCount > 0 ? "Đã lưu trên hệ thống" : "Không có ảnh"),
      firstImageFormula || ""
    ];
    
    sheet.appendRow(row);
    
    // Gửi thông báo tức thì qua Telegram NOVA-CORE cho anh Việt
    sendTelegramAlert(data, timestamp, photoCount, driveFolderUrl);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Đã lưu vĩnh cửu vào Google Sheet và tải ảnh vào Drive thành công!",
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
  return ContentService.createTextOutput("Webhook Trà Đá VietMac is Ready!");
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
      `📸 <b>Ảnh kỷ niệm:</b> <b>${photoCount} ảnh</b> ${driveFolderUrl ? `\n📁 <b>Link Thư Mục Drive:</b> <a href="${driveFolderUrl}">Mở thư mục ảnh trên Drive</a>` : ""}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📊 <a href="https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit"><b>Mở Google Sheet trên Drive</b></a>\n` +
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
