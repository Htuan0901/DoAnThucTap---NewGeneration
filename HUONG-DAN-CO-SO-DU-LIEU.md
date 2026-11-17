# Hướng dẫn nối website NG Dispatch với cơ sở dữ liệu dùng chung

Sau khi làm xong các bước dưới đây, dữ liệu của website được lưu trong cơ sở dữ liệu PostgreSQL trên **Supabase** (miễn phí). Mọi máy tính, điện thoại mở website đều thấy cùng một dữ liệu: máy A tạo vận đơn thì máy B thấy ngay khi chuyển trang, hoặc tự cập nhật sau tối đa 15 giây.

Website vẫn chạy trên **Netlify** như cũ, không cần máy chủ riêng. Toàn bộ thời gian làm khoảng 15 phút.

---

## Bước 1. Tạo dự án Supabase

1. Vào https://supabase.com và bấm **Start your project**. Đăng nhập bằng tài khoản GitHub để khỏi tạo tài khoản mới.
2. Bấm **New project** và điền:
   - **Name**: `ng-dispatch`
   - **Database Password**: bấm **Generate a password**, rồi chép mật khẩu ra một chỗ để giữ lại. Website không dùng mật khẩu này.
   - **Region**: chọn **Southeast Asia (Singapore)** để truy cập nhanh từ Việt Nam.
3. Bấm **Create new project** và chờ khoảng 1–2 phút để dự án khởi tạo xong.

## Bước 2. Tạo các bảng dữ liệu

1. Ở menu bên trái, chọn **SQL Editor**, rồi bấm **New query**.
2. Mở tệp `supabase/khoi-tao-co-so-du-lieu.sql` trong thư mục website (mở bằng Notepad là được). Chọn tất cả (Ctrl + A), sao chép, rồi dán vào ô soạn thảo của Supabase.
3. Bấm **Run**. Khi thấy dòng *Success. No rows returned* là bước này đã xong.
4. Kiểm tra lại ở **Table Editor**: phải có 8 bảng (`khach_hang`, `phuong_tien`, `tai_xe`, `nguoi_dung`, `van_don`, `chuyen_xe`, `nhat_ky`, `he_thong`) và 3 khung nhìn (`v_van_don`, `v_chuyen_xe`, `v_diem_dung`).

## Bước 3. Lấy địa chỉ dự án và khóa công khai

1. Bấm nút **Connect** ở đầu trang dự án, hoặc vào **Project Settings › API Keys**.
2. Chép hai giá trị sau:
   - **Project URL**, có dạng `https://abcdefghijk.supabase.co`
   - **Publishable key**, bắt đầu bằng `sb_publishable_...`. Nếu giao diện chỉ có khóa kiểu cũ thì dùng **anon public**, bắt đầu bằng `eyJ...`.

> ⚠️ Tuyệt đối **không** dùng khóa **secret** hay **service_role**. Website hiển thị công khai trên mạng nên chỉ được chứa khóa publishable hoặc anon.

## Bước 4. Điền cấu hình vào website

Mở tệp `assets/js/config.js` và điền hai giá trị vừa chép vào giữa hai dấu nháy:

```js
window.NG_CONFIG = {
  SUPABASE_URL: 'https://abcdefghijk.supabase.co',
  SUPABASE_KEY: 'sb_publishable_xxxxxxxxxxxxxxxx'
};
```

## Bước 5. Cập nhật lên GitHub và Netlify

**Nếu Netlify đang lấy code từ GitHub:**
1. Mở kho mã nguồn trên GitHub, bấm **Add file › Upload files**.
2. Kéo **toàn bộ nội dung** thư mục `ng-dispatch` của bản mới vào, gồm `index.html`, `app.html`, `assets`, `supabase` và các tệp hướng dẫn. GitHub sẽ ghi đè các tệp trùng tên.
3. Bấm **Commit changes**. Netlify sẽ tự triển khai lại sau khoảng 1 phút.

> Có thể sửa `config.js` ngay trên GitHub: mở `assets/js/config.js`, bấm biểu tượng bút chì, dán hai giá trị, rồi **Commit changes**.

**Nếu đang kéo thả thư mục lên Netlify:** vào trang dự án trên Netlify, mở mục **Deploys**, rồi kéo thả thư mục `ng-dispatch` đã điền cấu hình vào ô thả.

## Bước 6. Mở website lần đầu

1. Mở địa chỉ website, ví dụ `https://doanthuctap-hoangtuan.netlify.app/app.html`.
2. Lần đầu tiên, màn hình hiện *Cơ sở dữ liệu đang trống… Đang tạo dữ liệu mẫu*. Website tự đưa khoảng 260 vận đơn, 136 chuyến xe và các danh mục vào cơ sở dữ liệu. Việc này mất vài giây.
3. Đăng nhập như cũ. Các tài khoản dùng thử đều có mật khẩu `123456`: `dieuphoi`, `kinhdoanh`, `taixe`, `ketoan`, `admin`.
4. Để kiểm tra, mở website trên máy thứ hai hoặc trên điện thoại. Sửa một khách hàng ở máy này, rồi chuyển trang ở máy kia: thông tin đã đổi theo.

Ở góc dưới bên trái màn hình có một nhãn nhỏ báo trạng thái: *Đã lưu vào cơ sở dữ liệu*, *Đang lưu…* hoặc *Mất kết nối*.

## Xem dữ liệu trong Supabase

Vào **Table Editor**:
- Các bảng chính (`van_don`, `chuyen_xe`, …) có mỗi dòng là một bản ghi. Cột `data` chứa toàn bộ thông tin dạng JSON.
- Các khung nhìn `v_van_don`, `v_chuyen_xe`, `v_diem_dung` tách thông tin thành từng cột như mã, trạng thái, hạn giao, tài xế, điểm dừng…, tiện để xem và chụp hình đưa vào báo cáo.

## Lưu ý

- **Khôi phục dữ liệu mẫu** (menu tài khoản › Khôi phục dữ liệu mẫu) bây giờ thay dữ liệu của **mọi máy**. Chỉ dùng khi muốn làm lại từ đầu.
- Gói miễn phí của Supabase **tạm dừng dự án sau 7 ngày không có ai truy cập**. Khi đó website báo *Không kết nối được cơ sở dữ liệu*. Vào trang Supabase và bấm **Restore project** là chạy lại, dữ liệu vẫn còn.
- Bản này phục vụ đồ án: website tự kiểm soát quyền theo vai trò, còn khóa công khai cho phép đọc và ghi các bảng. Khi đưa vào sử dụng chính thức cần bổ sung đăng nhập qua Supabase Auth và chính sách bảo mật theo từng vai trò (Row Level Security).
- Muốn quay lại chạy riêng trên từng máy như bản cũ thì xóa trắng hai giá trị trong `config.js`.

## Cách hoạt động (để viết báo cáo)

- `assets/js/config.js`: chứa địa chỉ dự án Supabase và khóa công khai.
- `assets/js/cloud.js`: lớp đồng bộ dữ liệu, gồm các việc sau:
  - Khi mở website, tải toàn bộ dữ liệu từ 8 bảng trước khi hiển thị.
  - Mỗi lần người dùng lưu, so sánh với lần đồng bộ trước và chỉ gửi những bản ghi đã thay đổi. Việc gửi dùng giao diện REST của Supabase (PostgREST), thao tác `upsert` theo khóa chính `id`.
  - Khi chuyển trang, khi quay lại cửa sổ trình duyệt và định kỳ 15 giây, tải dữ liệu mới từ máy khác.
  - Bộ đếm sinh mã vận đơn và chuyến xe lưu ở bảng `he_thong`, luôn lấy giá trị lớn nhất giữa các máy.
- `supabase/khoi-tao-co-so-du-lieu.sql`: tạo bảng, chỉ mục, chính sách truy cập và khung nhìn.
