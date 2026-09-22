import re

with open("api/submit.js", "r") as f:
    content = f.read()

# Create syncToStu function
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
    
    if (!res.ok) {
      console.log("Không thể fetch stu.fedu.vn:", await res.text());
      return;
    }
    
    const data = await res.json();
    const sha = data.sha;
    let students = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
    
    let found = false;
    const subName = (submission.fullName || "").trim().toLowerCase();
    
    for (let student of students) {
      if ((student.name || "").trim().toLowerCase() === subName) {
        if (submission.phone) {
          student.phone = submission.phone;
        }
        
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
                platform: link.includes("tiktok") ? "tiktok" : "other"
              });
            }
          }
        }
        
        found = true;
        break;
      }
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
    # insert before module.exports
    content = content.replace("module.exports = async function", sync_function + "\nmodule.exports = async function")
    
    # insert call inside the POST handler
    trigger_code = """
      await Promise.all([
        saveSubmissionToGithub(submission).catch(e => console.error("GitHub Err:", e)),
        saveSubmissionToGoogleSheet(submission).catch(e => console.error("Sheet Err:", e)),
        sendTelegramNotification(submission).catch(e => console.error("Tele Err:", e)),
        sendCourseActivationEmail(submission.email).catch(e => console.error("Email Err:", e)),
        syncToStu(submission).catch(e => console.error("Stu Sync Err:", e))
      ]);"""
      
    old_trigger_code = """
      await Promise.all([
        saveSubmissionToGithub(submission).catch(e => console.error("GitHub Err:", e)),
        saveSubmissionToGoogleSheet(submission).catch(e => console.error("Sheet Err:", e)),
        sendTelegramNotification(submission).catch(e => console.error("Tele Err:", e)),
        sendCourseActivationEmail(submission.email).catch(e => console.error("Email Err:", e))
      ]);"""
      
    content = content.replace(old_trigger_code, trigger_code)
    
    with open("api/submit.js", "w") as f:
        f.write(content)
    print("Patched api/submit.js with STU sync")
else:
    print("Already patched")
