// /api/getConfig.js
export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,x-internal-key");
  if (req.method === "OPTIONS") return res.status(204).end();

  // 🔒 Bắt buộc header khớp với INTERNAL_API_KEY trong ENV
  const clientKey = req.headers["x-internal-key"];
  const serverKey = process.env.INTERNAL_API_KEY || "";
  if (!clientKey || clientKey !== serverKey) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // 🔐 Đọc ENV từ Vercel
  const url       = process.env.SUPABASE_URL || "";
  const anon      = process.env.SUPABASE_ANON_KEY || "";
  const mapUrl    = process.env.link_map_apps_script || "";
  const mapSheet  = process.env.sheet_id_map || "";
  const mapSecret = process.env.MAP_SHARED_SECRET || "";

  if (!url || !anon)
    return res.status(500).json({ error: "Thiếu Supabase ENV" });
  if (!mapUrl || !mapSheet)
    return res.status(500).json({ error: "Thiếu Map ENV" });

  // ✅ Trả cấu hình về client
  return res.status(200).json({
    url,
    anon,
    map: { APPS_URL: mapUrl, SHEET_ID: mapSheet, SHARED_SECRET: mapSecret }
  });
}
