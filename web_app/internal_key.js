// ======================== internal_key.js ========================

// 1) Khóa nội bộ để gửi vào header x-internal-key
window.getInternalKey = () => "Trung@123"; // đổi nếu bạn đặt giá trị khác trên server
// ./cod_config.js
// Lấy config qua /api/getConfig với header x-internal-key từ internal_key.js
// (internal_key.js đã patch fetch để Fallback LOCAL nếu API không có)

window.__CONFIG_READY = (async () => {
  // 1) Gọi API getConfig với khóa nội bộ
  const headers = { "Content-Type": "application/json" };
  try {
    if (typeof window.getInternalKey === "function") {
      headers["x-internal-key"] = String(window.getInternalKey() || "");
    }
  } catch {}

  let cfg;
  try {
    const resp = await fetch("/api/getConfig", { method: "GET", headers });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    cfg = await resp.json();
  } catch (e) {
    console.error("Không tải được /api/getConfig:", e);
    throw e;
  }

  // 2) Chuẩn hoá Supabase (server có thể trả: {url,key} hoặc {url,anon})
  const supaUrl = cfg?.url || cfg?.supabase?.url || "";
  const supaKey = cfg?.key || cfg?.anon || cfg?.supabase?.anon || "";

  if (!supaUrl || !supaKey) {
    throw new Error("Thiếu Supabase URL/Key từ getConfig");
  }

  // 3) Chuẩn hoá Map (2 kiểu: {mapUrl,mapSheet} hoặc {map:{APPS_URL,SHEET_ID,SHARED_SECRET}})
  const mapUrl   = cfg?.mapUrl || cfg?.map?.APPS_URL || "";
  const mapSheet = cfg?.mapSheet || cfg?.map?.SHEET_ID || "";
  const mapSecret= cfg?.map?.SHARED_SECRET || "";

  // 4) Gán global cho app_dh.js
  window.COD_BASE  = { url: supaUrl, key: supaKey };
  window.getConfig = (which) => ({ url: supaUrl, key: supaKey });
  window.MAP_CFG   = { url: mapUrl, sheet: mapSheet, secret: mapSecret };

  // 5) Trả object cho ai cần await
  return { supabase: { url: supaUrl, key: supaKey }, map: { url: mapUrl, sheet: mapSheet, secret: mapSecret } };
})();

// Ví dụ nơi khác cần chắc chắn có config:
// await window.__CONFIG_READY.catch(() => alert("Thiếu cấu hình Supabase"));

