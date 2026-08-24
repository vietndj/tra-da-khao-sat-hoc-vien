// Vercel Serverless Function: Real-time Survey & Photo Storage + NOVA Telegram Dispatcher
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8964853536:AAHuRNm_hY-YQtveBD1HlmthN4I5xpVzM8U";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "2050406425";

let submissions = [
  {
    responseId: "KS-2026-0001",
    submittedAt: "24/08/2026 08:15:20",
    course: "Lớp Offline Thực Chiến - Hà Nội",
    fullName: "Nguyễn Thu Trang",
    phone: "0912345678",
    profession: "Luật sư pháp chế (Chuẩn bị mở văn phòng luật riêng). Muốn làm case 45s như kênh tiktok.com/@luatsucuocsong. Cần AI bóc kịch bản và setup 2 góc máy.",
    channelLink: "https://facebook.com/thutrang.law\nhttps://tiktok.com/@thutrang_legal",
    journeyStory: "Lướt thấy video chia sẻ băm phân cảnh 3 tầng và góc nhìn AI thực chiến. Xem đúng 20s thấy nói quá mộc mạc nên đăng ký chuyển khoản luôn.",
    feedbackAll: "• Tư vấn: Nên báo rõ giảm 10% nhóm 2 người từ đầu.\n• 2 ngày học rất đã, tự tin cầm máy.\n• Hôm nào rảnh em mời anh ly cafe!",
    photoCount: 2,
    photos: [
      { name: "lop_hoc_thuc_hanh_quay_2_may.jpg", size: "185 KB" },
      { name: "anh_chup_chung_anh_viet.jpg", size: "210 KB" }
    ],
    driveUrl: "https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ_NguyenThuTrang"
  }
];

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
      `👉 <a href="https://trada.fedu.vn/excel"><b>Bấm để xem Bảng Quản Lý Trực Quan</b></a>`;

    // 1. Gửi tin nhắn Text tổng hợp
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
        if (p.data && p.data.startsWith('data:image')) {
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
    res.status(200).json({
      success: true,
      count: submissions.length,
      data: submissions,
      updatedAt: new Date().toISOString()
    });
    return;
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const count = submissions.length + 1;
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
        driveUrl: `https://drive.google.com/drive/folders/1_vietmac_${Date.now()}`
      };

      // Add to top of array for real-time live view
      submissions.unshift(newSub);

      // ASYNC BẮN TIN NHẮN VỀ BOT TELEGRAM NOVA-CORE CHO ANH VIỆT
      dispatchToTelegramNova(newSub).catch(e => console.error('Nova dispatch err:', e));

      res.status(200).json({
        success: true,
        message: 'Đã lưu phản hồi và bắn tin nhắn Telegram thành công!',
        item: newSub,
        totalCount: submissions.length,
        data: submissions
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.toString() });
    }
  }
}
