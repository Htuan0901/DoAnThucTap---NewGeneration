# NG Dispatch – Website và hệ thống điều phối, giao nhận hàng hóa

Công ty TNHH Thương mại và Đầu tư New Generation (MST 0317780292).

- `index.html`: trang web công ty (dịch vụ, quy trình giao nhận, đội xe, liên hệ, tra cứu vận đơn).
- `app.html`: hệ thống nội bộ (tổng quan, vận đơn, lập chuyến, chuyến xe, giám sát hành trình, đối soát chuyến, phương tiện, tài xế, khách hàng, báo cáo, quản trị) và ứng dụng tài xế.

Công nghệ: HTML5, CSS3, JavaScript thuần; mật khẩu băm SHA-256.

**Cơ sở dữ liệu dùng chung (bản mới):** khi điền `assets/js/config.js`, dữ liệu lưu trong PostgreSQL trên Supabase nên nhiều máy dùng chung một dữ liệu. Cách cài đặt xem `HUONG-DAN-CO-SO-DU-LIEU.md`; tệp tạo bảng là `supabase/khoi-tao-co-so-du-lieu.sql`. Để trống `config.js` thì website chạy như bản cũ, dữ liệu lưu bằng localStorage của từng trình duyệt. Dữ liệu mẫu được tạo theo ngày hiện tại nên luôn có chuyến đang chạy trong ngày.

## Chạy trên máy
Mở `index.html` bằng trình duyệt (Chrome, Edge), hoặc chạy `python -m http.server` trong thư mục này rồi mở http://localhost:8000.

## Đưa lên GitHub Pages
1. Tạo repository mới trên GitHub (Public), ví dụ `ng-dispatch`.
2. Add file › Upload files › kéo toàn bộ nội dung thư mục này vào (giữ nguyên thư mục `assets`) › Commit changes.
3. Settings › Pages › Source: Deploy from a branch › Branch `main`, thư mục `/ (root)` › Save.
4. Sau 1–2 phút trang chạy tại `https://<tên-tài-khoản>.github.io/ng-dispatch/`.

## Tài khoản dùng thử (mật khẩu 123456)
dieuphoi, kinhdoanh, taixe, taixe2, ketoan, admin.
Khôi phục dữ liệu mẫu: bấm tên người dùng góc phải › Khôi phục dữ liệu mẫu.
