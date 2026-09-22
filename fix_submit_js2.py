import re

with open("/Users/vietmac/Documents/CODE/tra-da-khao-sat-hoc-vien/api/submit.js", "r") as f:
    content = f.read()

# Replace the notes of newStudent
old_notes = "notes: `[Tạo tự động từ Form Trà Đá]\\nNghề nghiệp/Mảng KD: ${submission.profession || \"\"}`,"
new_notes = "notes: `[Tạo tự động từ Form Trà Đá]\\nNghề nghiệp/Mảng KD: ${submission.profession || \"\"}\\n\\n[PHẢN HỒI TRÀ ĐÁ]\\n- Hành trình: ${submission.journeyStory || \"Không có\"}\\n- Góp ý: ${submission.feedbackAll || \"Không có\"}`,"

content = content.replace(old_notes, new_notes)

with open("/Users/vietmac/Documents/CODE/tra-da-khao-sat-hoc-vien/api/submit.js", "w") as f:
    f.write(content)

