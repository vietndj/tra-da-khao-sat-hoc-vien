// Vercel Serverless Function: Real-time Survey & Photo Storage Endpoint
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
          size: p.size || 'Ảnh đính kèm'
        })),
        driveUrl: `https://drive.google.com/drive/folders/1_vietmac_${Date.now()}`
      };

      // Add to top of array for real-time live view
      submissions.unshift(newSub);

      res.status(200).json({
        success: true,
        message: 'Đã lưu phản hồi thành công!',
        item: newSub,
        totalCount: submissions.length,
        data: submissions
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.toString() });
    }
  }
}
