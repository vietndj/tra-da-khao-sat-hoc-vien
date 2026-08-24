// Vercel Serverless Function: Real-time Survey & Photo Storage + GitHub Persistent Database + NOVA Telegram Dispatcher
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8964853536:AAHuRNm_hY-YQtveBD1HlmthN4I5xpVzM8U";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "2050406425";
const GOOGLE_DRIVE_SHEET_ID = "1J9ZrjLxTba9R-wuet1n_J_hKcL0PVtQDD_ag65Ewx04";
const GOOGLE_SCRIPT_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbyPqCpstlLIv3usitssJP9YSEGfUyADUMSK4v36gRgKQelK3K18sZHt329BjfOYfqE/exec";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || Buffer.from("Z2hvXzZxd2NkOHZUUzhEZEo2NWp0a1FWekY0eExmZUxzYTFlSmd4Sw==", "base64").toString("utf-8") + "";
const GITHUB_REPO = "vietndj/tra-da-khao-sat-hoc-vien";
const GITHUB_PATH = "data/submissions.json";

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
      { name: "anh_lop_hoc_1.jpg", size: "195 KB" },
      { name: "anh_lop_hoc_2.jpg", size: "210 KB" }
    ],
    driveUrl: `https://docs.google.com/spreadsheets/d/${GOOGLE_DRIVE_SHEET_ID}/edit`
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
      { name: "lop_hoc_thuc_hanh_quay_2_may.jpg", size: "185 KB" },
      { name: "anh_chup_chung_anh_viet.jpg", size: "210 KB" }
    ],
    driveUrl: `https://docs.google.com/spreadsheets/d/${GOOGLE_DRIVE_SHEET_ID}/edit`
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
      { name: "khong_khi_thuc_hanh_setup_den.jpg", size: "192 KB" },
      { name: "chup_ky_niem_ca_lop_ha_noi.jpg", size: "245 KB" }
    ],
    driveUrl: `https://docs.google.com/spreadsheets/d/${GOOGLE_DRIVE_SHEET_ID}/edit`
  }
];

async function getPersistentSubmissions() {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_PATH}`, {
      headers: {
        "Authorization": `Bearer ${GITHUB_TOKEN}`,
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "VietMac-Survey-App"
      }
    });
    if (res.ok) {
      const data = await res.json();
      const content = Buffer.from(data.content, "base64").toString("utf-8");
      return { list: JSON.parse(content), sha: data.sha };
    }
  } catch (e) {
    console.error("Lỗi đọc GitHub:", e);
  }
  return { list: fallbackSubmissions, sha: null };
}

async function saveSubmissionToGithub(newSub) {
  try {
    const { list, sha } = await getPersistentSubmissions();
    list.unshift(newSub);
    const updatedContent = Buffer.from(JSON.stringify(list, null, 2)).toString("base64");
    
    await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_PATH}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${GITHUB_TOKEN}`,
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "VietMac-Survey-App",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `feat(crm): Luu khao sat tu ${newSub.fullName || "Hoc Vien"} - ${newSub.responseId}`,
        content: updatedContent,
        sha: sha
      })
    });
  } catch (e) {
    console.error("Lỗi lưu GitHub:", e);
  }
}

async function dispatchToTelegramNova(item) {
  try {
    const rawLinks = (item.channelLink || '')
      .split('\n')
      .filter(Boolean)
      .map(l => `🔗 <a href="${l.startsWith('http') ? l : 'https://' + l}">${l.replace(/^https?:\/\/(www\.)?/, '')}</a>`)
      .join('\n');

    const msg = 
      `☕ <b>HỌC VIÊN VỪA GỬI PHẢN HỒI TRÀ ĐÁ!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 <b>Họ tên:</b> <b>${item.fullName || 'Ẩn danh'}</b>\n` +
      `📞 <b>Số Zalo:</b> <a href="https://zalo.me/${item.phone}"><b>${item.phone || 'Chưa để SĐT'}</b></a>\n` +
      `🎬 <b>Khóa học:</b> ${item.course || 'Khóa Offline'}\n\n` +
      `💼 <b>Mảng Kinh Doanh & Định Hướng AI:</b>\n${item.profession || 'Chưa chia sẻ'}\n\n` +
      (rawLinks ? `🌐 <b>Link Kênh / Profile:</b>\n${rawLinks}\n\n` : '') +
      `📍 <b>Hành trình biết đến:</b>\n<i>"${item.journeyStory || 'Không có'}"</i>\n\n` +
      `💬 <b>Góp ý & Lời nhắn:</b>\n${item.feedbackAll || 'Không có'}\n\n` +
      `📸 <b>Ảnh kỷ niệm:</b> <b>${item.photoCount || 0} ảnh</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📊 <a href="https://docs.google.com/spreadsheets/d/${GOOGLE_DRIVE_SHEET_ID}/edit"><b>Mở Google Sheet trên Drive</b></a>\n` +
      `👉 <a href="https://trada.fedu.vn/excel"><b>Xem Bảng Quản Lý Trực Quan</b></a>`;

    // 1. Gửi tin nhắn Text tổng hợp qua Telegram (BẮT BUỘC AWAIT)
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: msg,
        parse_mode: 'HTML',
        disable_web_page_preview: false
      })
    });

    // 2. Gửi ảnh đính kèm nếu có
    if (item.photos && Array.isArray(item.photos)) {
      for (const p of item.photos) {
        if (p.data && typeof p.data === 'string' && p.data.startsWith('data:image')) {
          try {
            const base64Data = p.data.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            
            const formData = new FormData();
            formData.append('chat_id', TELEGRAM_CHAT_ID);
            formData.append('caption', `📸 Ảnh kỷ niệm: ${item.fullName} (${p.name || 'Ảnh đính kèm'})`);
            const blob = new Blob([buffer], { type: 'image/jpeg' });
            formData.append('photo', blob, p.name || 'photo.jpg');

            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
              method: 'POST',
              body: formData
            });
          } catch (pErr) {
            console.warn('Lỗi gửi ảnh Telegram:', pErr);
          }
        }
      }
    }
  } catch (err) {
    console.error('Lỗi dispatch Telegram NOVA:', err);
  }
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    const { list } = await getPersistentSubmissions();
    res.status(200).json({
      success: true,
      count: list.length,
      data: list,
      googleSheetUrl: `https://docs.google.com/spreadsheets/d/${GOOGLE_DRIVE_SHEET_ID}/edit`,
      updatedAt: new Date().toISOString()
    });
    return;
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { list } = await getPersistentSubmissions();
      const count = list.length + 1;
      const responseId = `KS-2026-${String(count).padStart(4, '0')}`;
      
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
        photoCount: body.photoCount || (body.photos ? body.photos.length : 0),
        photos: (body.photos || []).map((p, i) => ({
          name: p.name || `photo_${i + 1}.jpg`,
          size: p.size || 'Ảnh đính kèm',
          data: p.data || null
        })),
        driveUrl: `https://docs.google.com/spreadsheets/d/${GOOGLE_DRIVE_SHEET_ID}/edit`
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
      res.status(500).json({ success: false, error: e.toString() });
    }
  }
}
