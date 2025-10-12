// internal_key.js
// Khóa nội bộ cho app chạy phía client (KHÔNG PHẢI service role).
// Bạn có thể đổi chuỗi này tùy ý (ví dụ: Trung@123).

window.INTERNAL_API_KEY = "Trung@123";
console.log("[config] INTERNAL_API_KEY loaded:", typeof window.INTERNAL_API_KEY === "string");