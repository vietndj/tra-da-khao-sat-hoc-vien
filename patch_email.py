import re

with open("index.html", "r") as f:
    content = f.read()

# Fix saveDraft
content = content.replace(
    "phone: document.getElementById('phone').value,",
    "phone: document.getElementById('phone').value,\n        email: document.getElementById('email').value,"
)

# Fix restoreDraft
content = content.replace(
    "if (d.phone) document.getElementById('phone').value = d.phone;",
    "if (d.phone) document.getElementById('phone').value = d.phone;\n        if (d.email) document.getElementById('email').value = d.email;"
)

# Fix payload
content = content.replace(
    "phone: document.getElementById('phone').value.trim(),",
    "phone: document.getElementById('phone').value.trim(),\n        email: document.getElementById('email').value.trim(),"
)

with open("index.html", "w") as f:
    f.write(content)

print("Patched index.html")
