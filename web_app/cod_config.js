// cod_config.js



// 2) Khai báo theo app — CHỈ KHÁC table
window.COD_CONFIGS = {
  index: { table: "kv_nhan_vien" },   // index.html (login/menu)
  cod:   { table: "don_hang_kiot_cod" },   // Quan_ly_COD.html
  check: { table: "don_hang" }        // don_hang.html
};

// 3) Helper: lấy config cuối cùng cho 1 app
window.getConfig = (name) => {
  const base = window.COD_BASE || {};
  const per  = (window.COD_CONFIGS || {})[name] || {};
  return { ...base, ...per }; // trộn: {url, key, table}
};
