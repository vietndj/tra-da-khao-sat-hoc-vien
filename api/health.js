// ============================================================================
// HEALTH CHECK ENDPOINT — Kiểm tra toàn bộ mắt xích hệ thống
// GET /api/health → JSON trạng thái từng service
// ============================================================================
const { google } = require('googleapis');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8392893959:AAF79Uc6dI4rliweE0BvhnBJ06eV5EJdi-Y";
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || "";
const GOOGLE_PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, '\n');
const GOOGLE_SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || "";
const GOOGLE_SHEET_NAME = process.env.GOOGLE_SHEET_NAME || "Dữ Liệu Khảo Sát";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const GITHUB_REPO = process.env.GITHUB_REPO || "vietndj/tra-da-khao-sat-hoc-vien";
const R2_PUBLIC_BASE = "https://pub-447bd44dfdac4938912655c855b8631c.r2.dev";

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const checks = {};
  const startTotal = Date.now();

  // === 1. CHECK GOOGLE SHEETS ===
  try {
    if (GOOGLE_CLIENT_EMAIL && GOOGLE_PRIVATE_KEY && GOOGLE_SPREADSHEET_ID) {
      const start = Date.now();
      const auth = new google.auth.JWT({
        email: GOOGLE_CLIENT_EMAIL,
        key: GOOGLE_PRIVATE_KEY,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
      const sheets = google.sheets({ version: 'v4', auth });
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_SPREADSHEET_ID,
        range: `${GOOGLE_SHEET_NAME}!A:A`,
      });
      const rowCount = (result.data.values || []).length;
      checks.google_sheet = {
        status: "✅ OK",
        latency: `${Date.now() - start}ms`,
        rows: rowCount > 0 ? rowCount - 1 : 0, // Trừ header
        sheet_id: GOOGLE_SPREADSHEET_ID.slice(0, 12) + '...',
        url: `https://docs.google.com/spreadsheets/d/${GOOGLE_SPREADSHEET_ID}/edit`
      };
    } else {
      checks.google_sheet = { status: "⚠️ NOT CONFIGURED", reason: "Missing env vars" };
    }
  } catch (e) {
    checks.google_sheet = { status: "❌ ERROR", reason: e.message.slice(0, 200) };
  }

  // === 2. CHECK GITHUB DATABASE ===
  try {
    if (GITHUB_TOKEN) {
      const start = Date.now();
      const r = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/data/submissions.json`, {
        headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'User-Agent': 'TraDa-Health' }
      });
      if (r.ok) {
        const data = await r.json();
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        const submissions = JSON.parse(content);
        const lastSub = submissions[0];
        checks.github_db = {
          status: "✅ OK",
          latency: `${Date.now() - start}ms`,
          rows: submissions.length,
          last_submission: lastSub ? {
            name: lastSub.fullName,
            time: lastSub.submittedAt,
          } : null
        };
      } else {
        checks.github_db = { status: "❌ ERROR", reason: `HTTP ${r.status}` };
      }
    } else {
      checks.github_db = { status: "⚠️ NOT CONFIGURED" };
    }
  } catch (e) {
    checks.github_db = { status: "❌ ERROR", reason: e.message.slice(0, 200) };
  }

  // === 3. CHECK CLOUDFLARE R2 CDN ===
  try {
    const start = Date.now();
    const r = await fetch(`${R2_PUBLIC_BASE}/tra-da-hoc-vien/test/anh_chup_lop_hoc_test.jpg`, { method: 'HEAD' });
    checks.cloudflare_r2 = {
      status: r.ok ? "✅ OK" : "❌ ERROR",
      latency: `${Date.now() - start}ms`,
      cdn_base: R2_PUBLIC_BASE
    };
  } catch (e) {
    checks.cloudflare_r2 = { status: "❌ ERROR", reason: e.message.slice(0, 200) };
  }

  // === 4. CHECK TELEGRAM BOT ===
  try {
    if (TELEGRAM_BOT_TOKEN) {
      const start = Date.now();
      const r = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);
      const data = await r.json();
      checks.telegram_bot = {
        status: data.ok ? "✅ OK" : "❌ ERROR",
        latency: `${Date.now() - start}ms`,
        bot_name: data.result ? `@${data.result.username}` : 'unknown'
      };
    } else {
      checks.telegram_bot = { status: "⚠️ NOT CONFIGURED" };
    }
  } catch (e) {
    checks.telegram_bot = { status: "❌ ERROR", reason: e.message.slice(0, 200) };
  }

  // === TỔNG KẾT ===
  const allOk = Object.values(checks).every(c => c.status.includes('✅'));
  const hasError = Object.values(checks).some(c => c.status.includes('❌'));

  res.status(200).json({
    status: allOk ? "ALL_SYSTEMS_GO ✅" : (hasError ? "SYSTEM_ERROR ❌" : "PARTIAL_CONFIG ⚠️"),
    total_latency: `${Date.now() - startTotal}ms`,
    checked_at: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
    checks
  });
};
