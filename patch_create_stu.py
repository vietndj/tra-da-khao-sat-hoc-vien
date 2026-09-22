import re

with open("api/submit.js", "r") as f:
    content = f.read()

new_logic = """
    let found = false;
    const subName = (submission.fullName || "").trim().toLowerCase();
    
    // Tìm theo tên hoặc SĐT
    const subPhone = (submission.phone || "").replace(/[^0-9]/g, '');
    for (let student of students) {
      const stuPhone = (student.phone || "").replace(/[^0-9]/g, '');
      if ((student.name || "").trim().toLowerCase() === subName || (subPhone && stuPhone && subPhone === stuPhone)) {
        if (submission.phone) student.phone = submission.phone;
        
        student.post_course_survey = {
          journeyStory: submission.journeyStory || "",
          feedbackAll: submission.feedbackAll || "",
          photos: submission.photos || []
        };
        
        const link = submission.channelLink || "";
        if (link && link !== "Chưa gửi link") {
          const existingUrls = (student.reference_channels || []).map(ch => ch.url);
          if (!existingUrls.includes(link)) {
            if (link.includes("facebook.com")) {
              student.facebook_url = link;
            } else {
              if (!student.reference_channels) student.reference_channels = [];
              student.reference_channels.push({
                name: "Kênh Gửi Từ Form Trà Đá",
                url: link,
                platform: link.includes("tiktok") ? "tiktok" : (link.includes("youtube") ? "youtube" : "other")
              });
            }
          }
        }
        
        found = true;
        break;
      }
    }
    
    // Nếu chưa tồn tại, tự động TẠO MỚI HỌC VIÊN
    if (!found) {
      const safeIdName = (submission.fullName || "new_student").toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const newId = `${safeIdName}_${Date.now().toString().slice(-4)}`;
      
      const newStudent = {
        id: newId,
        name: submission.fullName || "Học Viên Mới",
        class: submission.course || "Offline Thực Chiến",
        industry: "Khác",
        industry_slug: "other",
        phone: submission.phone || "",
        email: submission.email || "",
        facebook_url: null,
        reference_channels: [],
        completeness_score: 50,
        health_status: "healthy",
        notes: `[Tạo tự động từ Form Trà Đá]\\nNghề nghiệp/Mảng KD: ${submission.profession || ""}`,
        post_course_survey: {
          journeyStory: submission.journeyStory || "",
          feedbackAll: submission.feedbackAll || "",
          photos: submission.photos || []
        }
      };
      
      const link = submission.channelLink || "";
      if (link && link !== "Chưa gửi link") {
        if (link.includes("facebook.com")) {
          newStudent.facebook_url = link;
        } else {
          newStudent.reference_channels.push({
            name: "Kênh Gửi Từ Form Trà Đá",
            url: link,
            platform: link.includes("tiktok") ? "tiktok" : (link.includes("youtube") ? "youtube" : "other")
          });
        }
      }
      
      students.unshift(newStudent); // Thêm lên đầu danh sách
      found = true; // Set found to true to trigger save
    }
"""

content = re.sub(
    r"    let found = false;.*?    if \(found\) \{",
    new_logic.strip() + "\n    \n    if (found) {",
    content,
    flags=re.DOTALL
)

with open("api/submit.js", "w") as f:
    f.write(content)
print("Patched api/submit.js with auto-create student")
