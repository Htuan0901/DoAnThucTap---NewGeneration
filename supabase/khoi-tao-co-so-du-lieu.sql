-- =====================================================================
-- NG Dispatch · Khởi tạo cơ sở dữ liệu dùng chung trên Supabase (PostgreSQL)
-- Cách chạy: Supabase › SQL Editor › New query › dán toàn bộ tệp này › Run
-- Chạy lại nhiều lần không mất dữ liệu (chỉ tạo những gì còn thiếu).
-- =====================================================================

-- 1. Các bảng dữ liệu: mỗi dòng là một bản ghi, nội dung chi tiết lưu ở cột data (JSONB)
create table if not exists public.khach_hang  (id text primary key, stt integer not null default 0, data jsonb not null, updated_at timestamptz not null default now());
create table if not exists public.phuong_tien (id text primary key, stt integer not null default 0, data jsonb not null, updated_at timestamptz not null default now());
create table if not exists public.tai_xe      (id text primary key, stt integer not null default 0, data jsonb not null, updated_at timestamptz not null default now());
create table if not exists public.nguoi_dung  (id text primary key, stt integer not null default 0, data jsonb not null, updated_at timestamptz not null default now());
create table if not exists public.van_don     (id text primary key, stt integer not null default 0, data jsonb not null, updated_at timestamptz not null default now());
create table if not exists public.chuyen_xe   (id text primary key, stt integer not null default 0, data jsonb not null, updated_at timestamptz not null default now());
create table if not exists public.nhat_ky     (id text primary key, stt integer not null default 0, data jsonb not null, updated_at timestamptz not null default now());
create table if not exists public.he_thong    (id text primary key, stt integer not null default 0, data jsonb not null, updated_at timestamptz not null default now());

comment on table public.khach_hang  is 'Khách hàng';
comment on table public.phuong_tien is 'Phương tiện (xe tải): tải trọng, định mức nhiên liệu, tình trạng';
comment on table public.tai_xe      is 'Tài xế: hạng và hạn giấy phép lái xe';
comment on table public.nguoi_dung  is 'Tài khoản đăng nhập và vai trò (mật khẩu lưu dạng băm SHA-256)';
comment on table public.van_don     is 'Vận đơn: điểm lấy, điểm giao, hàng hóa, trạng thái, lịch sử';
comment on table public.chuyen_xe   is 'Chuyến xe: xe, tài xế, điểm dừng, xác nhận giao nhận, sự cố, chi phí, đối soát, lịch sử';
comment on table public.nhat_ky     is 'Nhật ký thao tác hệ thống';
comment on table public.he_thong    is 'Cấu hình chung: phiên bản dữ liệu, bộ đếm sinh mã';

create index if not exists van_don_trang_thai_idx on public.van_don ((data->>'status'));
create index if not exists chuyen_xe_ngay_idx     on public.chuyen_xe ((data->>'date'));

-- 2. Quyền truy cập cho website (khóa công khai). Bản đồ án cho phép đọc, ghi toàn bộ;
--    việc phân quyền theo vai trò do website kiểm soát.
do $$
declare t text;
begin
  foreach t in array array['khach_hang','phuong_tien','tai_xe','nguoi_dung','van_don','chuyen_xe','nhat_ky','he_thong'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "website_doc_ghi" on public.%I', t);
    execute format('create policy "website_doc_ghi" on public.%I for all to anon, authenticated using (true) with check (true)', t);
    execute format('grant select, insert, update, delete on public.%I to anon, authenticated', t);
  end loop;
end $$;

-- 3. Các khung nhìn (view) dạng cột để xem nhanh trong Table Editor và viết báo cáo
create or replace view public.v_van_don with (security_invoker = on) as
select id                          as ma_van_don,
       data->>'customerId'         as ma_khach_hang,
       data->>'status'             as trang_thai,
       data->>'goods'              as hang_hoa,
       (data->>'weight')::numeric  as khoi_luong_kg,
       (data->>'cold')::boolean    as giu_lanh,
       data->>'pickupAddr'         as diem_lay,
       data->>'dropAddr'           as diem_giao,
       data->>'receiver'           as nguoi_nhan,
       data->>'deliverBy'          as han_giao,
       data->>'deliveredAt'        as da_giao_luc,
       data->>'tripId'             as ma_chuyen,
       (data->>'attempts')::int    as so_lan_giao,
       updated_at                  as cap_nhat_luc
from public.van_don;

create or replace view public.v_chuyen_xe with (security_invoker = on) as
select id                                   as ma_chuyen,
       data->>'date'                        as ngay_chay,
       data->>'vehicleId'                   as ma_xe,
       data->>'driverId'                    as ma_tai_xe,
       data->>'status'                      as trang_thai,
       data->>'planStart'                   as xuat_ben_du_kien,
       data->>'planEnd'                     as ve_bai_du_kien,
       (data->>'planKm')::numeric           as km_ke_hoach,
       jsonb_array_length(coalesce(data->'stops', '[]'::jsonb)) as so_diem_dung,
       (data->>'startOdo')::numeric         as km_xuat_ben,
       (data->>'endOdo')::numeric           as km_ve_bai,
       updated_at                           as cap_nhat_luc
from public.chuyen_xe;

create or replace view public.v_diem_dung with (security_invoker = on) as
select c.id                         as ma_chuyen,
       s.ord                        as thu_tu,
       s.stop->>'id'                as ma_diem_dung,
       s.stop->>'orderId'           as ma_van_don,
       s.stop->>'kind'              as loai_diem,
       s.stop->>'addr'              as dia_chi,
       s.stop->>'status'            as trang_thai,
       s.stop->>'eta'               as gio_du_kien,
       s.stop->>'arrivedAt'         as gio_den,
       s.stop->>'doneAt'            as gio_xong,
       s.stop->'pod'->>'name'       as nguoi_ky_nhan,
       s.stop->>'failReason'        as ly_do_that_bai
from public.chuyen_xe c
cross join lateral jsonb_array_elements(coalesce(c.data->'stops', '[]'::jsonb)) with ordinality as s(stop, ord);

grant select on public.v_van_don, public.v_chuyen_xe, public.v_diem_dung to anon, authenticated;

-- Hoàn tất. Mở website: lần đầu website tự đưa dữ liệu mẫu vào các bảng trên.
