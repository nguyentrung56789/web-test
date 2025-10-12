// cod_config.js
// Cấu hình Supabase cho client (dùng anon key).
// Thay các giá trị bên dưới bằng của bạn.

window.COD_BASE = {
  url: "https://YOUR_PROJECT_ID.supabase.co",
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5d3RnZHRzeGFqY3psanNwd3hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3MzI1NjQsImV4cCI6MjA3MjMwODU2NH0.FZ6z6kfUWyf8l7WnA5J1wkrAy7KjpU6VT65EdyXCka8"
};

// Kiểm tra nhanh khi load file
console.log("[config] COD_BASE loaded:", !!(window.COD_BASE && window.COD_BASE.url && window.COD_BASE.key));