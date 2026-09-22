import re

with open("api/submit.js", "r") as f:
    content = f.read()

sync_function = """
// ============================================================================
// STU.FEDU.VN AUTO-SYNC
// ============================================================================
async function syncToStu(submission) {
  if (!GITHUB_TOKEN) return;
  try {
    const STU_REPO = "vietndj/stu.fedu.vn";
    const STU_PATH = "students.json";
    
    const res = await fetch(`https://api.github.com/repos/${STU_REPO}/contents/${STU_PATH}`, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'TraDa-App'
      }
    });
    
    if (!res.ok) return;
    
    const data = await res.json();
    const sha = data.sha;
    let students = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
    
    let found = false;
    const subName = (submission.fullName || "").trim().toLowerCase();
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
      
      students.unshift(newStudent);
      found = true;
    }
    
    if (found) {
      const contentBase64 = Buffer.from(JSON.stringify(students, null, 2)).toString('base64');
      await fetch(`https://api.github.com/repos/${STU_REPO}/contents/${STU_PATH}`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'TraDa-App',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `auto-sync: update survey feedback for ${submission.fullName}`,
          content: contentBase64,
          sha: sha
        })
      });
      console.log(`Auto-synced ${submission.fullName} to stu.fedu.vn`);
    }
  } catch (e) {
    console.error("Lỗi syncToStu:", e);
  }
}
"""

if "STU.FEDU.VN AUTO-SYNC" not in content:
    content = content.replace("module.exports = async (req, res) => {", sync_function + "\nmodule.exports = async (req, res) => {")
    
    old_call = "await Promise.allSettled([githubPromise, sheetsPromise, telegramPromise, emailPromise]);"
    new_call = """const stuPromise = syncToStu(newSub).catch(e => console.error(e));
      await Promise.allSettled([githubPromise, sheetsPromise, telegramPromise, emailPromise, stuPromise]);"""
    
    content = content.replace(old_call, new_call)
    
    with open("api/submit.js", "w") as f:
        f.write(content)
    print("Successfully patched api/submit.js")
else:
    print("Already patched")
