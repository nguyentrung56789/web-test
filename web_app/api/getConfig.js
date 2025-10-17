// web_dong_hang/api/getConfig.js
export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,x-internal-key"); // ← thêm dòng này
  if (req.method === "OPTIONS") return res.status(204).end();

  const url  = process.env.SUPABASE_URL || "";
  const anon = process.env.SUPABASE_ANON_KEY || "";
  const mapUrl   = process.env.link_map_apps_script || "";
  const mapSheet = process.env.sheet_id_map || "";

  if (!url || !anon) {
    return res.status(500).json({ error: "Thiếu Supabase ENV", url: !!url, anon: !!anon });
  }
  if (!mapUrl || !mapSheet) {
    return res.status(500).json({ error: "Thiếu Map ENV", mapUrl: !!mapUrl, mapSheet: !!mapSheet });
  }

  return res.status(200).json({
    url,
    anon,
    map: { APPS_URL: mapUrl, SHEET_ID: mapSheet }
  });
}
