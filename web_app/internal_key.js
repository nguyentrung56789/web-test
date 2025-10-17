// ======================== internal_key.js ========================
// 1️⃣ Khóa nội bộ để xác thực khi gọi /api/getConfig (trùng INTERNAL_API_KEY trên Vercel)
window.getInternalKey = () => "Trung@123";

// 2️⃣ Tự động gọi getConfig từ server → gán global COD_BASE / MAP_CFG
window.__CONFIG_READY = (async () => {
  const headers = { "Content-Type": "application/json" };
  headers["x-internal-key"] = window.getInternalKey();

  try {
    const resp = await fetch("/api/getConfig", { method: "GET", headers });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const cfg = await resp.json();

    const supaUrl  = cfg?.url || "";
    const supaKey  = cfg?.anon || cfg?.key || "";
    const mapUrl   = cfg?.map?.APPS_URL || "";
    const mapSheet = cfg?.map?.SHEET_ID || "";
    const mapSecret= cfg?.map?.SHARED_SECRET || "";

    if (!supaUrl || !supaKey) throw new Error("Thiếu Supabase key từ getConfig");

    // ✅ Gán global để app_dh.js & cod_config.js sử dụng
    window.COD_BASE  = { url: supaUrl, key: supaKey };
    window.getConfig = () => ({ url: supaUrl, key: supaKey });
    window.MAP_CFG   = { url: mapUrl, sheet: mapSheet, secret: mapSecret };

    console.log("✅ Đã lấy key từ getConfig (server) thành công");
    return { supabase: window.COD_BASE, map: window.MAP_CFG };

  } catch (err) {
    console.error("⚠️ Không lấy được /api/getConfig:", err);
    throw err;
  }
})();
