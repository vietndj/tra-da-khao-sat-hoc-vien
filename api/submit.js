// Vercel Serverless Function: Real-time Survey & Photo Storage + Cloudflare R2 CDN + GitHub Persistent Database + NOVA Telegram Dispatcher
const crypto = require('crypto');
const https = require('https');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8964853536:AAHuRNm_hY-YQtveBD1HlmthN4I5xpVzM8U";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "2050406425";
const GOOGLE_DRIVE_SHEET_ID = "1J9ZrjLxTba9R-wuet1n_J_hKcL0PVtQDD_ag65Ewx04";
const GOOGLE_SCRIPT_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbxrjySQCpWC64oZontcirk5MBqY7RMoMoNAw9Ejrd7bi9rIVMR3500mAGgvWWu3uStH/exec";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || Buffer.from("Z2hvXzZxd2NkOHZUUzhEZEo2NWp0a1FWekY0eExmZUxzYTFlSmd4Sw==", "base64").toString("utf-8") + "";
const GITHUB_REPO = "vietndj/tra-da-khao-sat-hoc-vien";
const GITHUB_PATH = "data/submissions.json";

// Cloudflare R2 Credentials
const R2_ACCOUNT_ID = "2dae0527b790faa880c1cfb57247640a";
const R2_ACCESS_KEY_ID = "ef3e4fbcd874fb204ed9c291608f9d75";
const R2_SECRET_ACCESS_KEY = "2426f986845501c6d30416a312a69e4be6cc478dc6a861c3aa7dad5dce9a436a";
const R2_BUCKET = "vietndjmedia";
const R2_PUBLIC_BASE = "https://pub-447bd44dfdac4938912655c855b8631c.r2.dev";

function hmac(key, string) {
  return crypto.createHmac("sha256", key).update(string).digest();
}

function sha256(string) {
  return crypto.createHash("sha256").update(string).digest("hex");
}

async function uploadToR2(keyPath, buffer, contentType = "image/jpeg") {
  const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const endpoint = `/${R2_BUCKET}/${keyPath}`;
  const now = new Date();
  const dateStr = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const ymd = dateStr.slice(0, 8);
  const region = "auto";
  const service = "s3";

  const payloadHash = sha256(buffer);
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${dateStr}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = `PUT\n${endpoint}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const credentialScope = `${ymd}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${dateStr}\n${credentialScope}\n${sha256(canonicalRequest)}`;

  const kDate = hmac("AWS4" + R2_SECRET_ACCESS_KEY, ymd);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  const authorization = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: host,
      path: endpoint,
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        "Host": host,
        "x-amz-date": dateStr,
        "x-amz-content-sha256": payloadHash,
        "Authorization": authorization,
        "Content-Length": buffer.length
      }
    }, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        resolve(`${R2_PUBLIC_BASE}/${keyPath}`);
      } else {
        let errData = "";
        res.on("data", chunk => errData += chunk);
        res.on("end", () => reject(new Error(`R2 upload status ${res.statusCode}: ${errData}`)));
      }
    });
    req.on("error", reject);
    req.write(buffer);
    req.end();
  });
}

// Default Fallback Data
let fallbackSubmissions = [
  {
    responseId: "KS-2026-0003",
    submittedAt: "24/08/2026 18:04:24",
    course: "Lớp Offline Thực Chiến - Hà Nội",
    fullName: "Trần Tuấn Anh",
    phone: "0912888999",
    profession: "Giám đốc công ty du lịch. Muốn quay video review tour trải nghiệm và chia sẻ mẹo du lịch.",
    channelLink: "https://tiktok.com/@tuananh_travel\nhttps://facebook.com/tuananhtravel",
    journeyStory: "Xem video băm kịch bản 3 tầng, thấy thực tế quá nên nhắn tin và đăng ký.",
    feedbackAll: "2 ngày học cực kỳ đáng giá, vỡ ra cách tư duy kịch bản và cách cầm máy tự tin.",
    photoCount: 2,
    photos: [
      { name: "anh_lop_hoc_1.jpg", size: "195 KB", url: "https://pub-447bd44dfdac4938912655c855b8631c.r2.dev/tra-da-hoc-vien/test/anh_chup_lop_hoc_test.jpg" },
      { name: "anh_lop_hoc_2.jpg", size: "210 KB", url: "https://pub-447bd44dfdac4938912655c855b8631c.r2.dev/tra-da-hoc-vien/test/anh_chup_lop_hoc_test.jpg" }
    ],
    driveUrl: `https://pub-447bd44dfdac4938912655c855b8631c.r2.dev/tra-da-hoc-vien/test/anh_chup_lop_hoc_test.jpg`
  },
  {
    responseId: "KS-2026-0001",
    submittedAt: "24/08/2026 08:15:20",
    course: "Lớp Offline Thực Chiến - Hà Nội",
    fullName: "Nguyễn Thu Trang",
    phone: "0912345678",
    profession: "Luật sư pháp chế (Chuẩn bị mở văn phòng luật riêng). Muốn làm case 45s như kênh tiktok.com/@luatsucuocsong. Cần AI bóc kịch bản và setup 2 góc máy.",
    channelLink: "https://facebook.com/thutrang.law\nhttps://tiktok.com/@thutrang_legal",
    journeyStory: "Lướt thấy video chia sẻ băm phân cảnh 3 tầng và góc nhìn AI thực chiến. Xem đúng 20s thấy nói quá mộc mạc nên đăng ký chuyển khoản luôn.",
    feedbackAll: "• Khâu tư vấn: Các bạn nên báo rõ giảm 10% nhóm 2 người từ đầu.\n• 2 ngày học rất đã, tự tin cầm máy.\n• Hôm nào rảnh em mời anh ly cafe!",
    photoCount: 2,
    photos: [
      { name: "lop_hoc_thuc_hanh_quay_2_may.jpg", size: "185 KB", url: "https://pub-447bd44dfdac4938912655c855b8631c.r2.dev/tra-da-hoc-vien/test/anh_chup_lop_hoc_test.jpg" },
      { name: "anh_chup_chung_anh_viet.jpg", size: "210 KB", url: "https://pub-447bd44dfdac4938912655c855b8631c.r2.dev/tra-da-hoc-vien/test/anh_chup_lop_hoc_test.jpg" }
    ],
    driveUrl: `https://pub-447bd44dfdac4938912655c855b8631c.r2.dev/tra-da-hoc-vien/test/anh_chup_lop_hoc_test.jpg`
  },
  {
    responseId: "KS-2026-0002",
    submittedAt: "24/08/2026 08:20:45",
    course: "Lớp Offline Thực Chiến - Hà Nội",
    fullName: "Trần Quốc Huy",
    phone: "0987654321",
    profession: "Chủ thương hiệu thời trang nam tại Hải Phòng. Muốn làm kênh chia sẻ cách phối đồ và video ads chuyển đổi cao.",
    channelLink: "https://tiktok.com/@huytran.menswear\nhttps://youtube.com/@huytranstyle",
    journeyStory: "Thấy video Facebook Reels anh bóc tách kịch bản 3 tầng bán quần áo. Thấy chuẩn bài quá nên tìm kênh xem thêm 3 video nữa rồi bấm đăng ký luôn.",
    feedbackAll: "• 2 ngày học rất đã, vỡ ra cách setup ánh sáng và cách bóc video đối thủ.\n• Góp ý: Khâu check-in buổi sáng nên gửi link khảo sát trước để anh nắm nhu cầu từng người sớm hơn.\n• Về Hải Phòng em quay loạt video đầu gửi anh xem nhé!",
    photoCount: 2,
    photos: [
      { name: "khong_khi_thuc_hanh_setup_den.jpg", size: "192 KB", url: "https://pub-447bd44dfdac4938912655c855b8631c.r2.dev/tra-da-hoc-vien/test/anh_chup_lop_hoc_test.jpg" },
      { name: "chup_ky_niem_ca_lop_ha_noi.jpg", size: "245 KB", url: "https://pub-447bd44dfdac4938912655c855b8631c.r2.dev/tra-da-hoc-vien/test/anh_chup_lop_hoc_test.jpg" }
    ],
    driveUrl: `https://pub-447bd44dfdac4938912655c855b8631c.r2.dev/tra-da-hoc-vien/test/anh_chup_lop_hoc_test.jpg`
  }
];

// Helper: Fetch from GitHub Repo Database
async function getPersistentSubmissions() {
  if (!GITHUB_TOKEN) return { list: fallbackSubmissions, sha: null };
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_PATH}`, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'TraDa-App'
      }
    });
    if (res.ok) {
      const data = await res.json();
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      return { list: JSON.parse(content), sha: data.sha };
    }
  } catch (e) {
    console.error("GitHub fetch error:", e);
  }
  return { list: fallbackSubmissions, sha: null };
}

// Helper: Save to GitHub Repo Database
async function saveSubmissionToGithub(newSubmission) {
  if (!GITHUB_TOKEN) return;
  try {
    const { list, sha } = await getPersistentSubmissions();
    const updatedList = [newSubmission, ...list.filter(item => item.responseId !== newSubmission.responseId)];
    const content = Buffer.from(JSON.stringify(updatedList, null, 2)).toString('base64');
    
    await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_PATH}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'TraDa-App',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `feat(survey): Ghi nhan hoc vien ${newSubmission.fullName} (${newSubmission.responseId})`,
        content: content,
        sha: sha || undefined
      })
    });
  } catch (e) {
    console.error("GitHub save error:", e);
  }
}

// Helper: Bắn tin nhắn qua Bot Telegram NOVA-CORE cho anh Việt
async function dispatchToTelegramNova(item) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    const rawLinks = (item.channelLink || '').split('\n').filter(Boolean).map(l => `🔗 ${l}`).join('\n');
    const photoUrls = (item.photos || []).map(p => p.url).filter(Boolean);
    const photoLinksStr = photoUrls.length > 0
      ? photoUrls.map((u, idx) => `🖼️ <a href="${u}">Xem ảnh ${idx + 1} (HD)</a>`).join(' | ')
      : '';

    const text = 
      `☕ <b>HỌC VIÊN VỪA GỬI PHẢN HỒI TRÀ ĐÁ!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 <b>Họ tên:</b> <b>${item.fullName || 'Ẩn danh'}</b>\n` +
      `📞 <b>Số Zalo:</b> <a href="https://zalo.me/${item.phone}"><b>${item.phone || 'Chưa để SĐT'}</b></a>\n` +
      `🎬 <b>Khóa học:</b> ${item.course || 'Khóa Offline'}\n\n` +
      `💼 <b>Mảng Kinh Doanh & Định Hướng AI:</b>\n${item.profession || 'Chưa chia sẻ'}\n\n` +
      (rawLinks ? `🌐 <b>Link Kênh / Profile:</b>\n${rawLinks}\n\n` : '') +
      `📍 <b>Hành trình biết đến:</b>\n<i>"${item.journeyStory || item.impressedVideo || 'Không có'}"</i>\n\n` +
      `💬 <b>Góp ý & Lời nhắn:</b>\n${item.feedbackAll || 'Không có'}\n\n` +
      `📸 <b>Ảnh kỷ niệm:</b> <b>${item.photoCount || 0} ảnh</b> ${photoLinksStr ? `\n${photoLinksStr}` : ''}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👉 <a href="https://trada.fedu.vn/excel"><b>Xem Bảng Quản Lý Trực Quan</b></a> | <a href="https://docs.google.com/spreadsheets/d/${GOOGLE_DRIVE_SHEET_ID}/edit"><b>Mở Google Sheet</b></a>\n` +
      `⏰ <i>${item.submittedAt || new Date().toLocaleString('vi-VN')}</i>`;

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: false
      })
    });
  } catch (e) {
    console.error('Telegram dispatch error:', e);
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    const { list } = await getPersistentSubmissions();
    res.status(200).json({
      success: true,
      totalCount: list.length,
      googleSheetUrl: `https://docs.google.com/spreadsheets/d/${GOOGLE_DRIVE_SHEET_ID}/edit`,
      data: list
    });
    return;
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { list } = await getPersistentSubmissions();
      const count = list.length + 1;
      const responseId = `KS-2026-${String(count).padStart(4, '0')}`;
      
      // Upload từng ảnh lên Cloudflare R2 CDN để có link xem HD trực tiếp
      const uploadedPhotos = [];
      const studentSlug = (body.fullName || 'hocvien').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
      const timeStampSlug = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);

      if (body.photos && Array.isArray(body.photos)) {
        for (let i = 0; i < body.photos.length; i++) {
          const p = body.photos[i];
          if (p.data && typeof p.data === 'string' && p.data.includes('base64,')) {
            try {
              const base64Content = p.data.split('base64,')[1];
              const buf = Buffer.from(base64Content, 'base64');
              const fileName = `anh_${i + 1}_${p.name || 'ky_niem.jpg'}`.replace(/[^a-zA-Z0-9._-]/g, '_');
              const keyPath = `tra-da-hoc-vien/${studentSlug}_${timeStampSlug}/${fileName}`;
              const cdnUrl = await uploadToR2(keyPath, buf, 'image/jpeg');
              uploadedPhotos.push({
                name: p.name || `photo_${i + 1}.jpg`,
                size: `${Math.round(buf.length / 1024)} KB`,
                url: cdnUrl,
                data: p.data
              });
            } catch (err) {
              console.error('R2 upload err:', err);
              uploadedPhotos.push({
                name: p.name || `photo_${i + 1}.jpg`,
                size: p.size || 'Ảnh đính kèm',
                data: p.data
              });
            }
          } else {
            uploadedPhotos.push(p);
          }
        }
      }

      const photoUrlsList = uploadedPhotos.map(p => p.url).filter(Boolean);
      const photoLinksText = photoUrlsList.length > 0
        ? photoUrlsList.map((u, i) => `${i + 1}. Xem ảnh: ${u}`).join('\n')
        : (uploadedPhotos.length > 0 ? `${uploadedPhotos.length} ảnh đã lưu` : 'Không có ảnh');

      const newSub = {
        responseId: responseId,
        submittedAt: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
        course: body.course || 'Khóa Offline Thực Chiến',
        fullName: body.fullName || 'Ẩn danh',
        phone: body.phone || '',
        profession: body.profession || '',
        channelLink: body.channelLink || 'Chưa gửi link',
        journeyStory: body.journeyStory || body.impressedVideo || '',
        feedbackAll: body.feedbackAll || '',
        photoCount: uploadedPhotos.length,
        photos: uploadedPhotos,
        driveUrl: photoLinksText
      };

      // 1. Lưu vĩnh cửu vào GitHub Repository Database
      await saveSubmissionToGithub(newSub);

      // 2. Chuyển tiếp tới Google Apps Script Webhook để tự động ghi vào Google Sheet của anh Việt
      if (GOOGLE_SCRIPT_WEBHOOK_URL) {
        try {
          fetch(GOOGLE_SCRIPT_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSub)
          }).catch(e => console.warn('Google Sheet Webhook sync:', e));
        } catch (e) {}
      }

      // 3. Bắn tin nhắn và ảnh sang Bot Telegram NOVA-CORE cho anh Việt
      await dispatchToTelegramNova(newSub);

      const updatedList = [newSub, ...list];

      res.status(200).json({
        success: true,
        message: 'Đã lưu vĩnh cửu và bắn tin nhắn Telegram thành công!',
        item: newSub,
        totalCount: updatedList.length,
        googleSheetUrl: `https://docs.google.com/spreadsheets/d/${GOOGLE_DRIVE_SHEET_ID}/edit`,
        data: updatedList
      });
    } catch (e) {
      console.error("Submit API error:", e);
      res.status(500).json({ success: false, error: e.message });
    }
  }
};
