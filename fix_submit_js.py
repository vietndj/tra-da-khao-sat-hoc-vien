import re

with open("/Users/vietmac/Documents/CODE/tra-da-khao-sat-hoc-vien/api/submit.js", "r") as f:
    content = f.read()

# We want to change how syncToStu updates the student:
# We should append to student.notes
new_logic = """
        const feedbackText = `\\n\\n[PHẢN HỒI TRÀ ĐÁ]\\n- Hành trình: ${submission.journeyStory || "Không có"}\\n- Góp ý: ${submission.feedbackAll || "Không có"}`;
        
        if (!student.notes) student.notes = "";
        if (!student.notes.includes("[PHẢN HỒI TRÀ ĐÁ]")) {
            student.notes += feedbackText;
        } else {
            // Replace the old one if it exists? Or just leave it?
            // Actually, if it exists, maybe don't duplicate.
        }
        
        student.post_course_survey = {
"""

# Let's just do a string replacement in api/submit.js
if "[PHẢN HỒI TRÀ ĐÁ]" not in content:
    content = content.replace("student.post_course_survey = {", new_logic.strip() + "\n          journeyStory: submission.journeyStory || \"\",")
    with open("/Users/vietmac/Documents/CODE/tra-da-khao-sat-hoc-vien/api/submit.js", "w") as f:
        f.write(content)
    print("Patched api/submit.js to append notes")
else:
    print("Already patched api/submit.js")
