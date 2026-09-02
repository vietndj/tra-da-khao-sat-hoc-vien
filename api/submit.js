// ============================================================================
// Vercel Serverless Function v2.0
// Google Sheets API (Service Account) + Cloudflare R2 CDN + Telegram NOVA
// Không cần Google Apps Script, không cần thao tác thủ công
// ============================================================================
const crypto = require('crypto');
const https = require('https');
const { google } = require('googleapis');

// === CẤU HÌNH ===
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8392893959:AAF79Uc6dI4rliweE0BvhnBJ06eV5EJdi-Y";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "2050406425";

// Google Sheets API - Service Account (tự động, không cần Apps Script)
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || "form-feedback-offline@vietndj-git-cms.iam.gserviceaccount.com";
const GOOGLE_PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, '\n');
const GOOGLE_SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || "1J9ZrjLxTba9R-wuet1n_J_hKcL0PVtQDD_ag65Ewx04";
const GOOGLE_SHEET_NAME = process.env.GOOGLE_SHEET_NAME || "Dữ Liệu Khảo Sát";

// GitHub Persistent Storage
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const GITHUB_REPO = process.env.GITHUB_REPO || "vietndj/tra-da-khao-sat-hoc-vien";
const GITHUB_PATH = "data/submissions.json";

// Cloudflare R2 CDN
const R2_ACCOUNT_ID = "2dae0527b790faa880c1cfb57247640a";
const R2_ACCESS_KEY_ID = "ef3e4fbcd874fb204ed9c291608f9d75";
const R2_SECRET_ACCESS_KEY = "2426f986845501c6d30416a312a69e4be6cc478dc6a861c3aa7dad5dce9a436a";
const R2_BUCKET = "vietndjmedia";
const R2_PUBLIC_BASE = "https://pub-447bd44dfdac4938912655c855b8631c.r2.dev";

// ============================================================================
// GOOGLE SHEETS API — Ghi trực tiếp qua Service Account, không cần Apps Script
// ============================================================================
let _sheetsClient = null;
function getGoogleSheetsClient() {
  if (_sheetsClient) return _sheetsClient;
  if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) return null;
  try {
    const auth = new google.auth.JWT({
      email: GOOGLE_CLIENT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    _sheetsClient = google.sheets({ version: 'v4', auth });
    return _sheetsClient;
  } catch (e) {
    console.error('Google Sheets auth error:', e.message);
    return null;
  }
}

async function appendToGoogleSheet(submission) {
  const sheets = getGoogleSheetsClient();
  if (!sheets || !GOOGLE_SPREADSHEET_ID) {
    console.warn('Google Sheets not configured, skipping');
    return { success: false, reason: 'not_configured' };
  }

  try {
    // Chuẩn bị dữ liệu 12 cột giống cấu trúc cũ
    const photoUrls = (submission.photos || []).map(p => p.url).filter(Boolean);
    const photoLinksText = photoUrls.length > 0
      ? photoUrls.map((u, i) => `Ảnh ${i + 1}: ${u}`).join('\n')
      : 'Không có ảnh';
    
    // Công thức IMAGE() cho ảnh đầu tiên (hiển thị thumbnail trong Google Sheet)
    const imageFormula = photoUrls.length > 0
      ? `=IMAGE("${photoUrls[0]}")`
      : '';

    const rowValues = [
      submission.responseId,                                  // Cột A: Mã Phản Hồi
      submission.submittedAt,                                 // Cột B: Thời Gian Gửi
      submission.course,                                      // Cột C: Khóa Học
      submission.fullName,                                    // Cột D: Họ Và Tên
      submission.phone,                                       // Cột E: Số Zalo
      submission.profession,                                  // Cột F: Mảng KD & Định Hướng AI
      submission.channelLink,                                 // Cột G: Link Kênh
      submission.journeyStory,                                // Cột H: Hành Trình Biết Đến
      submission.feedbackAll,                                 // Cột I: Góp Ý Thẳng Thắn
      `${submission.photoCount || 0} ảnh`,                    // Cột J: Số Lượng Ảnh
      photoLinksText,                                         // Cột K: Link Ảnh HD (R2 CDN)
      imageFormula                                            // Cột L: Ảnh Preview
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SPREADSHEET_ID,
      range: `${GOOGLE_SHEET_NAME}!A:L`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [rowValues] }
    });

    return { success: true };
  } catch (e) {
    console.error('Google Sheets append error:', e.message);
    return { success: false, reason: e.message };
  }
}

// ============================================================================
// CLOUDFLARE R2 CDN — Upload ảnh qua AWS SigV4 thuần crypto
// ============================================================================
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
      hostname: host, path: endpoint, method: "PUT",
      headers: {
        "Content-Type": contentType, "Host": host,
        "x-amz-date": dateStr, "x-amz-content-sha256": payloadHash,
        "Authorization": authorization, "Content-Length": buffer.length
      }
    }, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        resolve(`${R2_PUBLIC_BASE}/${keyPath}`);
      } else {
        let errData = "";
        res.on("data", chunk => errData += chunk);
        res.on("end", () => reject(new Error(`R2 ${res.statusCode}: ${errData}`)));
      }
    });
    req.on("error", reject);
    req.write(buffer);
    req.end();
  });
}

// ============================================================================
// GITHUB PERSISTENT DATABASE — Lưu trữ JSON vĩnh cửu trong repo
// ============================================================================
let fallbackSubmissions = [];

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
    console.error("GitHub fetch error:", e.message);
  }
  return { list: fallbackSubmissions, sha: null };
}

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
    console.error("GitHub save error:", e.message);
  }
}

// ============================================================================
// TELEGRAM NOVA-CORE — Bắn tin nhắn (CHỈ từ server, không trùng lặp)
// ============================================================================
async function dispatchToTelegramNova(item) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    const rawLinks = (item.channelLink || '').split('\n').filter(Boolean).map(l => `🔗 ${l}`).join('\n');
    const photoUrls = (item.photos || []).map(p => p.url).filter(Boolean);
    const photoLinksStr = photoUrls.length > 0
      ? photoUrls.map((u, idx) => `🖼️ <a href="${u}">Xem ảnh ${idx + 1} (HD)</a>`).join(' | ')
      : '';

    const sheetUrl = GOOGLE_SPREADSHEET_ID
      ? `https://docs.google.com/spreadsheets/d/${GOOGLE_SPREADSHEET_ID}/edit`
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
      `👉 <a href="https://trada.fedu.vn/excel"><b>Bảng Quản Lý</b></a>` +
      (sheetUrl ? ` | <a href="${sheetUrl}"><b>Google Sheet</b></a>` : '') +
      `\n⏰ <i>${item.submittedAt || new Date().toLocaleString('vi-VN')}</i>`;

    const cleanPhone = (item.phone || '').replace(/[^0-9]/g, '');
    const inlineKeyboard = [
      [
        ...(cleanPhone ? [{ text: "💬 Nhắn Zalo", url: `https://zalo.me/${cleanPhone}` }] : []),
        { text: "🌐 Xem Bảng Live", url: "https://trada.fedu.vn/excel" }
      ]
    ];
    if (sheetUrl) {
      inlineKeyboard.push([{ text: "📊 Mở Google Sheet (Drive)", url: sheetUrl }]);
    }

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
        reply_markup: {
          inline_keyboard: inlineKeyboard
        }
      })
    });
  } catch (e) {
    console.error('Telegram dispatch error:', e.message);
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // === GET: Trả danh sách submissions ===
  if (req.method === 'GET') {
    const { list } = await getPersistentSubmissions();
    const sheetUrl = GOOGLE_SPREADSHEET_ID
      ? `https://docs.google.com/spreadsheets/d/${GOOGLE_SPREADSHEET_ID}/edit`
      : '';
    return res.status(200).json({
      success: true,
      totalCount: list.length,
      googleSheetUrl: sheetUrl,
      data: list
    });
  }

  // === POST: Nhận submission mới ===
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { list } = await getPersistentSubmissions();
      const count = list.length + 1;
      const responseId = `KS-2026-${String(count).padStart(4, '0')}`;

      // 1. Upload ảnh lên Cloudflare R2 CDN
      const uploadedPhotos = [];
      const studentSlug = (body.fullName || 'hocvien').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
      const timeStampSlug = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);

      if (body.photos && Array.isArray(body.photos)) {
        for (let i = 0; i < body.photos.length; i++) {
          const p = body.photos[i];
          if (p.data && typeof p.data === 'string' && p.data.includes('base64,')) {
            try {
              const base64Content = p.data.split('base64,')[1];
              const buf = Buffer.from(base64Content, 'base64');
              const fileName = `anh_${i + 1}_${(p.name || 'ky_niem.jpg').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
              const keyPath = `tra-da-hoc-vien/${studentSlug}_${timeStampSlug}/${fileName}`;
              const cdnUrl = await uploadToR2(keyPath, buf, 'image/jpeg');
              uploadedPhotos.push({
                name: p.name || `photo_${i + 1}.jpg`,
                size: `${Math.round(buf.length / 1024)} KB`,
                url: cdnUrl
              });
            } catch (err) {
              console.error('R2 upload err:', err.message);
              uploadedPhotos.push({ name: p.name || `photo_${i + 1}.jpg`, size: p.size || '?' });
            }
          } else {
            uploadedPhotos.push(p);
          }
        }
      }

      const newSub = {
        responseId,
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
        driveUrl: uploadedPhotos.map(p => p.url).filter(Boolean).join('\n') || 'Không có ảnh'
      };

      // 2. Lưu vào GitHub (fire-and-forget, không block response)
      const githubPromise = saveSubmissionToGithub(newSub).catch(e => console.error('GitHub:', e.message));

      // 3. Ghi vào Google Sheet (Service Account, tự động, không cần Apps Script!)
      const sheetsPromise = appendToGoogleSheet(newSub).catch(e => console.error('Sheets:', e.message));

      // 4. Bắn Telegram (CHỈ 1 LẦN từ server, không bắn từ client nữa)
      const telegramPromise = dispatchToTelegramNova(newSub).catch(e => console.error('TG:', e.message));

      // Chờ tất cả hoàn thành song song
      await Promise.allSettled([githubPromise, sheetsPromise, telegramPromise]);

      return res.status(200).json({
        success: true,
        message: 'Đã lưu thành công vào Google Sheet + GitHub + Telegram!',
        item: newSub,
        totalCount: list.length + 1,
        googleSheetUrl: GOOGLE_SPREADSHEET_ID
          ? `https://docs.google.com/spreadsheets/d/${GOOGLE_SPREADSHEET_ID}/edit`
          : ''
      });
    } catch (e) {
      console.error("Submit API error:", e);
      return res.status(500).json({ success: false, error: e.message });
    }
  }
};
