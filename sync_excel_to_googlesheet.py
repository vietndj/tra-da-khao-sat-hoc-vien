import json
import urllib.request
import ssl
import sys
import os

def sync_to_google_sheet():
    ctx = ssl._create_unverified_context()
    file_id = "1IhJbansUgKT86TJ7Rq5cXEy7GGqaYOnmgqT6wQUEYxY"
    excel_path = "/Users/vietmac/Documents/CODE/tra-da-khao-sat-hoc-vien/Mau_Bang_Khao_Sat_Hoc_Vien_VietMac.xlsx"

    if not os.path.exists(excel_path):
        print(f"❌ Không tìm thấy file: {excel_path}")
        return False

    with open("/Users/vietmac/.config/rclone/rclone.conf") as f:
        text = f.read()

    access_token = None
    for line in text.splitlines():
        if line.startswith("token ="):
            token_data = json.loads(line[7:].strip())
            access_token = token_data.get("access_token")

    if not access_token:
        print("❌ Không tìm thấy access token trong rclone.conf")
        return False

    with open(excel_path, "rb") as f:
        file_bytes = f.read()

    url = f"https://www.googleapis.com/upload/drive/v3/files/{file_id}?uploadType=media"
    req = urllib.request.Request(
        url,
        data=file_bytes,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        },
        method="PATCH"
    )

    try:
        with urllib.request.urlopen(req, context=ctx) as res:
            data = json.loads(res.read().decode())
            print(f"✅ Đã đồng bộ thành công dữ liệu Excel lên Google Sheet: https://docs.google.com/spreadsheets/d/{file_id}/edit")
            return True
    except Exception as e:
        print(f"❌ Lỗi đồng bộ Google Sheet: {e}")
        return False

if __name__ == "__main__":
    sync_to_google_sheet()
