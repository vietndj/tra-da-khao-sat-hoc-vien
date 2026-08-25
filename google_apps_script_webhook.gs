/**
 * =========================================================================
 * GOOGLE APPS SCRIPT WEBHOOK: HỨNG DỮ LIỆU KHẢO SÁT & GOM ẢNH GOOGLE DRIVE
 * Bảng Khảo Sát & Ảnh Học Viên - VietMac (Trà Đá)
 * Spreadsheet ID: 1J9ZrjLxTba9R-wuet1n_J_hKcL0PVtQDD_ag65Ewx04
 * =========================================================================
 */

const SPREADSHEET_ID = "1J9ZrjLxTba9R-wuet1n_J_hKcL0PVtQDD_ag65Ewx04";
const TELEGRAM_BOT_TOKEN = "8964853536:AAHuRNm_hY-YQtveBD1HlmthN4I5xpVzM8U"; 
const TELEGRAM_CHAT_ID = "2050406425"; // Chat ID anh Việt
const MASTER_FOLDER_NAME = "Ảnh Kỷ Niệm Học Viên - Trà Đá VietMac";

/**
 * HÀM XÓA TOÀN BỘ DỮ LIỆU TEST VÀ THÊM FEEDBACK THẬT TỪ HỌC VIÊN NGÀNH PHÂN BÓN
 * -> Anh Việt chỉ cần chọn hàm này ở thanh menu Apps Script và bấm "Chạy" (Run) là xong ngay!
 */
function resetSheetWithRealFeedback() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName("Dữ Liệu Khảo Sát & Ảnh") || ss.getSheets()[0];
  
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
  
  // Dữ liệu feedback thật từ ảnh chụp
  const realRow = [
    "KS-2026-0001",
    "24/08/2026 23:16:30",
    "30 Ngày Học Làm Nội Dung Viral / Offline Thực Chiến",
    "Học viên ngành Phân Bón Nông Nghiệp",
    "0988***888",
    "Kinh doanh & Sản xuất Phân bón Nông nghiệp (Có rất nhiều cảnh đẹp và tư liệu thực tế nhưng trước đây chỉ biết giơ máy lên quay, chưa biết dựng).",
    "https://facebook.com/30ngayviral.fedu.vn",
    "Đang có ý định xây kênh, lướt Facebook tình cờ va vào video của anh Việt. Vào page xem tầm 5 clip là điền form đăng ký luôn. Có bạn gọi là em chốt đơn đi học luôn không cần tư vấn nhiều đâu ạ. Em thề là trước đây em không hề biết anh là ai luôn ấy :))) cũng không mất 7 tiếng để chốt đơn đâu. Em chỉ xem mỗi tầm 5 cái clip của anh thôi ý.",
    "• Video của anh Việt cực kỳ thực chiến, mộc mạc và đánh trúng tâm lý người làm kinh doanh.\n• Không cần đao to búa lớn hay kỹ xảo phức tạp, chỉ xem đúng 5 clip là thấy tin tưởng và quyết định đi học ngay.\n• Thậm chí lúc chốt đơn còn chưa cả theo dõi page thầy luôn haha!",
    "1 ảnh",
    "📁 Thư mục Drive: Ảnh Kỷ Niệm Học Viên - Trà Đá VietMac/Học Viên Phân Bón Nông Nghiệp - 0988***888/\n1. Screenshot 2026-08-24 at 23.16.25.png",
    ""
  ];
  
  sheet.appendRow(realRow);
  Logger.log("✅ ĐÃ XÓA TOÀN BỘ TEST VÀ NẠP FEEDBACK THẬT THÀNH CÔNG!");
  return "Đã xóa toàn bộ test và nạp feedback thật thành công!";
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(15000);
  
  try {
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
    
    // Nếu gọi lệnh reset từ webhook
    if (data.action === "reset_sheet") {
      const msg = resetSheetWithRealFeedback();
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: msg })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName("Dữ Liệu Khảo Sát & Ảnh") || ss.getSheets()[0];
    
    const lastRow = sheet.getLastRow();
    const responseId = "KS-2026-" + ("000" + lastRow).slice(-4);
    const timestamp = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");
    
    // 1. Tìm hoặc tự động tạo Thư mục mẹ duy nhất trên Google Drive của anh Việt
    let masterFolder;
    const existingFolders = DriveApp.getFoldersByName(MASTER_FOLDER_NAME);
    if (existingFolders.hasNext()) {
      masterFolder = existingFolders.next();
    } else {
      masterFolder = DriveApp.createFolder(MASTER_FOLDER_NAME);
      masterFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }
    
    // 2. Xử lý gom ảnh vào thư mục riêng của từng học viên bên trong Thư mục mẹ
    let driveFolderUrl = masterFolder.getUrl();
    let fileLinksText = "";
    let firstImageFormula = "";
    const photoCount = data.photoCount || (data.photos ? data.photos.length : 0);
    
    if (data.photos && Array.isArray(data.photos) && data.photos.length > 0) {
      try {
        const studentCleanName = (data.fullName || "HocVien").replace(/[\\/:*?"<>|]/g, "").trim();
        const subFolderName = `${studentCleanName} - ${data.phone || ""} - ${Utilities.formatDate(new Date(), "GMT+7", "dd-MM-yyyy HHmm")}`;
        const studentFolder = masterFolder.createFolder(subFolderName);
        studentFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        driveFolderUrl = studentFolder.getUrl();
        
        let linkItems = [`📁 Thư mục Drive: ${driveFolderUrl}`];
        
        data.photos.forEach((photo, idx) => {
          if (photo.data && typeof photo.data === "string" && photo.data.includes("base64,")) {
            const base64Data = photo.data.split("base64,")[1];
            const decoded = Utilities.base64Decode(base64Data);
            const fileName = photo.name || `anh_${idx + 1}.jpg`;
            const blob = Utilities.newBlob(decoded, "image/jpeg", fileName);
            const file = studentFolder.createFile(blob);
            file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            
            const fileUrl = file.getUrl();
            linkItems.push(`${idx + 1}. ${fileName}: ${fileUrl}`);
            
            if (idx === 0) {
              firstImageFormula = `=IMAGE("https://drive.google.com/uc?export=view&id=${file.getId()}")`;
            }
          } else if (photo.url) {
            linkItems.push(`${idx + 1}. Xem ảnh: ${photo.url}`);
          }
        });
        
        fileLinksText = linkItems.join("\n");
      } catch (err) {
        fileLinksText = "Lỗi lưu ảnh Drive: " + err.toString();
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
      fileLinksText || (photoCount > 0 ? `📁 Thư mục Drive: ${driveFolderUrl}` : "Không có ảnh"),
      firstImageFormula || ""
    ];
    
    sheet.appendRow(row);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      driveMasterFolder: masterFolder.getUrl(),
      driveFolder: driveFolderUrl,
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
  if (e && e.parameter && e.parameter.action === "reset_sheet") {
    const msg = resetSheetWithRealFeedback();
    return ContentService.createTextOutput(msg);
  }
  return ContentService.createTextOutput("Webhook Trà Đá VietMac is Ready!");
}
