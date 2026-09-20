import re

with open("index.html", "r") as f:
    content = f.read()

# 1. Hide Block 2 and remove required
# Find Khối 2 div
block2_start = content.find("<!-- KHỐI 2:")
if block2_start != -1:
    div_start = content.find('<div class="card-shell', block2_start)
    if div_start != -1:
        # replace class to add hidden
        content = content[:div_start] + content[div_start:].replace('<div class="card-shell rounded-3xl p-7 sm:p-10 space-y-6 reveal-on-scroll">', '<div class="card-shell rounded-3xl p-7 sm:p-10 space-y-6 reveal-on-scroll hidden">', 1)

# Remove required from impressedVideo
content = content.replace('<textarea id="impressedVideo" name="impressedVideo" rows="4" required', '<textarea id="impressedVideo" name="impressedVideo" rows="4"')

# 2. Refactor Block 4 into <details>
block4_old = """      <div class="card-shell rounded-3xl p-7 sm:p-10 space-y-6 reveal-on-scroll">
        <div class="flex items-center gap-3.5 border-b border-slate-800 pb-5">
          <div class="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-base flex-shrink-0">
            4
          </div>
          <div>
            <h3 class="font-bold text-lg sm:text-xl text-white">Cho em xin mấy kiểu ảnh kỷ niệm ở lớp nhé&nbsp;📸</h3>
            <p class="text-xs sm:text-sm text-slate-400 mt-0.5">Ảnh chụp ở chỗ học, lúc thực hành, hoặc ảnh chụp chung cùng nhau</p>
          </div>
        </div>"""

block4_new = """      <details class="card-shell rounded-3xl p-5 sm:p-7 reveal-on-scroll group cursor-pointer [&::-webkit-details-marker]:hidden">
        <summary class="flex items-center gap-3.5 outline-none select-none list-none">
          <div class="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-base flex-shrink-0 group-open:bg-amber-500/20 transition">
            <i data-lucide="image" class="w-4 h-4"></i>
          </div>
          <div class="flex-1">
            <h3 class="font-bold text-base sm:text-lg text-white">Nếu có ảnh thì gửi tặng em nhé (Không bắt buộc) 📸</h3>
            <p class="text-xs sm:text-sm text-slate-400 mt-0.5 group-open:hidden">Bấm vào đây để tải ảnh kỷ niệm ở lớp học</p>
          </div>
          <div class="text-slate-400 group-open:rotate-180 transition-transform duration-300">
            <i data-lucide="chevron-down" class="w-5 h-5"></i>
          </div>
        </summary>

        <div class="space-y-4 pt-5 mt-5 border-t border-slate-800 cursor-default">"""

if block4_old in content:
    content = content.replace(block4_old, block4_new)
    # Also need to close </details> instead of </div> for block 4.
    # We can do this by looking for the end of block 4.
    
    # Actually, let's just find the closing </div> of block 4 and replace with </details>
    # Since there are multiple </div>, we can just replace the specific one before <!-- Hidden Course Input -->
    
    end_block4 = """          </div>
        </div>
      </div>

      <!-- Hidden Course Input -->"""
    
    end_block4_new = """          </div>
        </div>
      </details>

      <!-- Hidden Course Input -->"""
    
    content = content.replace(end_block4, end_block4_new)

with open("index.html", "w") as f:
    f.write(content)

print("Updated index.html")
