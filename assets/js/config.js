/* ================================================================
   CẤU HÌNH CƠ SỞ DỮ LIỆU DÙNG CHUNG (Supabase)
   ----------------------------------------------------------------
   - Để trống hai giá trị dưới đây: website chạy như cũ, dữ liệu chỉ
     lưu trong trình duyệt của từng máy.
   - Điền địa chỉ dự án và khóa công khai của Supabase: mọi máy mở
     website đều dùng chung một cơ sở dữ liệu.
   Lấy hai giá trị này trong Supabase: Project Settings › API Keys
   (xem HUONG-DAN-CO-SO-DU-LIEU.md).
   ================================================================ */
window.NG_CONFIG = {
  SUPABASE_URL: 'https://egvclouttclfoxiyqzov.supabase.co',   // ví dụ: 'https://abcdxyzcompany.supabase.co'
  SUPABASE_KEY: 'sb_publishable_tX_nWFYiYCMYIeriAjI6VA_TPDmce_D'    // khóa publishable (sb_publishable_...) hoặc khóa anon (eyJ...)
};
