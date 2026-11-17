/* Danh mục và dữ liệu mẫu của hệ thống NG Dispatch (Công ty TNHH Thương mại và Đầu tư New Generation) */
(function () {
  const NG = (window.NG = window.NG || {});

  NG.COMPANY = {
    name: 'Công ty TNHH Thương mại và Đầu tư New Generation',
    short: 'New Generation',
    tax: '0317780292',
    address: '514 Đường Nguyễn Xiển, Phường Long Bình, TP Hồ Chí Minh',
    phone: '0909 792 786',
    email: 'lienhe@newgeneration.vn',
    founded: '11/04/2023'
  };
  NG.DEPOT = 'Bãi xe công ty, 514 Nguyễn Xiển, Long Bình';
  NG.FUEL_PRICE = 20500; // đồng / lít dầu DO
  NG.FUEL_TOLERANCE = 10; // % vượt định mức cho phép

  /* Trạng thái vận đơn, chuyến xe, điểm dừng, sự cố */
  NG.ST = {
    order: {
      cho_xep_chuyen: { label: 'Chờ xếp chuyến', tone: 'wait' },
      da_xep_chuyen: { label: 'Đã xếp chuyến', tone: 'info' },
      dang_lay: { label: 'Đang lấy hàng', tone: 'move' },
      dang_giao: { label: 'Đang giao', tone: 'move' },
      da_giao: { label: 'Đã giao', tone: 'done' },
      giao_that_bai: { label: 'Giao thất bại', tone: 'warn' },
      tra_hang: { label: 'Hoàn trả hàng', tone: 'off' },
      da_huy: { label: 'Đã hủy', tone: 'off' }
    },
    trip: {
      ke_hoach: { label: 'Kế hoạch', tone: 'off', step: 0 },
      da_phan_cong: { label: 'Chờ tài xế nhận', tone: 'wait', step: 1 },
      da_nhan: { label: 'Tài xế đã nhận', tone: 'info', step: 2 },
      dang_chay: { label: 'Đang chạy', tone: 'move', step: 3 },
      hoan_thanh: { label: 'Chờ đối soát', tone: 'wait', step: 4 },
      da_doi_soat: { label: 'Đã đối soát', tone: 'done', step: 5 },
      da_huy: { label: 'Đã hủy', tone: 'off', step: -1 }
    },
    stop: {
      cho: { label: 'Chưa đến', tone: 'off' },
      da_den: { label: 'Đã đến', tone: 'info' },
      xong: { label: 'Hoàn tất', tone: 'done' },
      that_bai: { label: 'Thất bại', tone: 'warn' }
    },
    incident: {
      moi: { label: 'Mới báo', tone: 'warn' },
      dang_xu_ly: { label: 'Đang xử lý', tone: 'wait' },
      da_xu_ly: { label: 'Đã xử lý', tone: 'done' }
    },
    vehicle: { san_sang: { label: 'Sẵn sàng', tone: 'done' }, bao_duong: { label: 'Bảo dưỡng', tone: 'wait' }, ngung: { label: 'Ngừng hoạt động', tone: 'off' } },
    driver: { dang_lam: { label: 'Đang làm việc', tone: 'done' }, nghi: { label: 'Nghỉ phép', tone: 'off' } }
  };
  NG.TRIP_STEPS = ['Lập kế hoạch', 'Giao tài xế', 'Tài xế nhận', 'Đang chạy', 'Hoàn thành', 'Đối soát'];
  NG.TRIP_ACTIVE = ['da_phan_cong', 'da_nhan', 'dang_chay'];

  NG.VEHICLE_TYPES = ['Xe tải thùng kín', 'Xe tải thùng bạt', 'Xe tải có bửng nâng', 'Xe đông lạnh'];
  NG.COST_TYPES = ['Nhiên liệu', 'Phí cầu đường', 'Phí bốc xếp', 'Phí gửi xe, bến bãi', 'Chi phí khác'];
  NG.INCIDENT_TYPES = ['Kẹt xe, ùn tắc', 'Hàng chưa sẵn sàng', 'Người nhận vắng mặt', 'Xe hỏng dọc đường', 'Hàng hư hỏng, thiếu', 'Khác'];
  NG.FAIL_REASONS = ['Người nhận vắng mặt', 'Sai địa chỉ giao', 'Khách từ chối nhận hàng', 'Kho nhận đã đóng cửa', 'Khác'];
  NG.MAX_ATTEMPTS = 2;

  /* Vai trò (bảng VaiTro), các màn hình được truy cập và quyền thao tác */
  NG.ROLES = {
    admin: { label: 'Quản trị viên', desc: 'Quản lý tài khoản, phân quyền, danh mục và nhật ký hệ thống', menu: ['tong-quan', 'van-don', 'lap-chuyen', 'chuyen-xe', 'giam-sat', 'doi-soat', 'phuong-tien', 'tai-xe', 'khach-hang', 'bao-cao', 'quan-tri'], perms: ['order.edit', 'trip.plan', 'incident.handle', 'recon', 'fleet.edit', 'price'] },
    dieuphoi: { label: 'Điều phối viên', desc: 'Gom vận đơn thành chuyến, phân công xe và tài xế, giám sát hành trình, xử lý sự cố', menu: ['tong-quan', 'van-don', 'lap-chuyen', 'chuyen-xe', 'giam-sat', 'phuong-tien', 'tai-xe', 'bao-cao'], perms: ['trip.plan', 'incident.handle', 'fleet.edit'] },
    kinhdoanh: { label: 'Nhân viên kinh doanh', desc: 'Tạo vận đơn theo yêu cầu khách hàng, quản lý thông tin khách hàng', menu: ['tong-quan', 'van-don', 'khach-hang'], perms: ['order.edit', 'price'] },
    ketoan: { label: 'Kế toán', desc: 'Đối soát quãng đường, nhiên liệu và chi phí của từng chuyến xe, xem báo cáo chi phí', menu: ['tong-quan', 'chuyen-xe', 'doi-soat', 'bao-cao'], perms: ['recon', 'price'] },
    taixe: { label: 'Tài xế', desc: 'Nhận chuyến, cập nhật từng điểm dừng, xác nhận giao nhận, báo sự cố và khai chi phí', menu: ['chuyen-cua-toi'], perms: [] }
  };

  /* Dọn dữ liệu cũ: bỏ tài khoản thuộc vai trò đã lược bỏ (CSKH, Giám đốc). Trả về true nếu có thay đổi */
  NG.migrate = function (d) {
    const n = (d.users || []).length;
    d.users = (d.users || []).filter((u) => NG.ROLES[u.role]);
    let changed = d.users.length !== n;
    /* Bổ sung lại tài khoản kế toán nếu đã bị xóa ở bản 4 vai trò */
    if (!d.users.some((u) => u.role === 'ketoan')) {
      let k = 1; while (d.users.some((u) => u.id === 'ND' + String(k).padStart(2, '0'))) k++;
      d.users.push({ id: 'ND' + String(k).padStart(2, '0'), username: d.users.some((u) => u.username === 'ketoan') ? 'ketoan' + k : 'ketoan', name: 'Hoàng Thu Trang', role: 'ketoan', pass: NG.hash('123456'), phone: '0915938271', createdAt: '2026-06-01T08:00', locked: false });
      changed = true;
    }
    return changed;
  };

  NG.seed = function () {
    let s = 20261117;
    const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    const addH = (str, h) => { const d = new Date(str); d.setMinutes(d.getMinutes() + Math.round(h * 60)); return iso(d); };
    const NOW = new Date(); NOW.setSeconds(0, 0);
    const nowS = iso(NOW);
    const todayS = nowS.slice(0, 10);
    const day = (n) => { const d = new Date(todayS + 'T00:00'); d.setDate(d.getDate() + n); return iso(d).slice(0, 10); };

    const customers = [
      { id: 'KH001', name: 'Công ty TNHH Nội thất Gia Hưng', short: 'Nội thất Gia Hưng', contact: 'Lê Hoàng Nam', phone: '0903456789', email: 'nam.le@giahung.vn', address: '125 Nguyễn Xiển, Long Bình, TP Hồ Chí Minh', taxCode: '0315123456', goods: 'Bàn ghế, tủ gỗ đóng kiện' },
      { id: 'KH002', name: 'Công ty TNHH Điện máy Hòa Bình', short: 'Điện máy Hòa Bình', contact: 'Trương Văn Lực', phone: '0909668213', email: 'luc.tv@hoabinh.com.vn', address: 'Kho 88 Lý Thường Kiệt, Quận 10, TP Hồ Chí Minh', taxCode: '0312233445', goods: 'Máy lạnh, tủ lạnh' },
      { id: 'KH003', name: 'Công ty TNHH Minh Phát', short: 'Minh Phát', contact: 'Võ Thị Hạnh', phone: '0938112450', email: 'hanh.vo@minhphat.vn', address: '21 Võ Văn Ngân, Thủ Đức, TP Hồ Chí Minh', taxCode: '0316677889', goods: 'Linh kiện cơ khí' },
      { id: 'KH004', name: 'Công ty CP Bao bì Tân Tiến', short: 'Bao bì Tân Tiến', contact: 'Phạm Minh Châu', phone: '0912778034', email: 'chau.pm@tantien.vn', address: 'Lô C2, KCN Tân Tạo, Bình Tân, TP Hồ Chí Minh', taxCode: '0301234567', goods: 'Thùng carton, bao bì' },
      { id: 'KH005', name: 'Công ty CP Thực phẩm An Việt', short: 'Thực phẩm An Việt', contact: 'Đinh Thu Hà', phone: '0977205618', email: 'ha.dt@anviet.vn', address: '45 Kinh Dương Vương, Bình Tân, TP Hồ Chí Minh', taxCode: '0309988776', goods: 'Thực phẩm đông lạnh', cold: true },
      { id: 'KH006', name: 'Công ty TNHH Dệt may Phú Thịnh', short: 'Dệt may Phú Thịnh', contact: 'Lý Quốc Toàn', phone: '0918540377', email: 'toan.ly@phuthinh.vn', address: '12 Nguyễn Thị Thập, Quận 7, TP Hồ Chí Minh', taxCode: '0314455667', goods: 'Vải cuộn, phụ liệu may' },
      { id: 'KH007', name: 'Công ty TNHH VLXD Đại Phát', short: 'VLXD Đại Phát', contact: 'Huỳnh Tấn Lộc', phone: '0903914266', email: 'loc.ht@daiphat.vn', address: 'QL22, Xuân Thới Sơn, Hóc Môn, TP Hồ Chí Minh', taxCode: '0317788990', goods: 'Gạch ốp lát, xi măng' },
      { id: 'KH008', name: 'Công ty TNHH Dược phẩm Bình An', short: 'Dược Bình An', contact: 'Nguyễn Thị Mai', phone: '0935221904', email: 'mai.nt@binhan.vn', address: '7 Phan Văn Trị, Gò Vấp, TP Hồ Chí Minh', taxCode: '0318899001', goods: 'Dược phẩm cần giữ mát', cold: true }
    ].map((c) => Object.assign({ active: true, createdAt: '2026-06-01T09:00' }, c));

    const vehicles = [
      { id: 'XE01', plate: '51D-246.82', type: 'Xe tải thùng kín', load: 3.5, fuelNorm: 14, year: 2021, odo: 86420 },
      { id: 'XE02', plate: '51D-318.47', type: 'Xe tải thùng kín', load: 5, fuelNorm: 17, year: 2020, odo: 124310 },
      { id: 'XE03', plate: '51C-772.10', type: 'Xe tải thùng bạt', load: 8, fuelNorm: 22, year: 2019, odo: 198750 },
      { id: 'XE04', plate: '51D-105.63', type: 'Xe tải có bửng nâng', load: 2.5, fuelNorm: 13, year: 2022, odo: 54180 },
      { id: 'XE05', plate: '51D-552.09', type: 'Xe đông lạnh', load: 3.5, fuelNorm: 16, year: 2022, odo: 61230 },
      { id: 'XE06', plate: '51D-660.31', type: 'Xe tải thùng kín', load: 1.5, fuelNorm: 11, year: 2023, odo: 32940 },
      { id: 'XE07', plate: '51C-418.95', type: 'Xe tải thùng bạt', load: 5, fuelNorm: 18, year: 2018, odo: 231060 },
      { id: 'XE08', plate: '51D-903.72', type: 'Xe tải thùng kín', load: 8, fuelNorm: 21, year: 2021, odo: 142870 }
    ].map((v) => Object.assign({ status: 'san_sang', note: '' }, v));
    vehicles[6].status = 'bao_duong'; vehicles[6].note = 'Bảo dưỡng định kỳ 230.000 km';

    const drivers = [
      { id: 'TX01', name: 'Nguyễn Văn Thành', phone: '0908112233', license: 'C', licenseExp: '2029-05-12', since: 2019 },
      { id: 'TX02', name: 'Trần Quốc Huy', phone: '0912334455', license: 'C', licenseExp: '2028-11-03', since: 2020 },
      { id: 'TX03', name: 'Lê Minh Tâm', phone: '0933445566', license: 'FC', licenseExp: '2027-02-20', since: 2017 },
      { id: 'TX04', name: 'Phạm Đức Long', phone: '0977556677', license: 'C', licenseExp: '2030-08-15', since: 2021 },
      { id: 'TX05', name: 'Võ Thanh Sơn', phone: '0909667788', license: 'B2', licenseExp: '2031-01-09', since: 2022 },
      { id: 'TX06', name: 'Đỗ Hữu Phước', phone: '0918778899', license: 'FC', licenseExp: '2027-06-30', since: 2016 },
      { id: 'TX07', name: 'Bùi Anh Khoa', phone: '0938990011', license: 'B2', licenseExp: '2032-04-18', since: 2023 }
    ].map((d) => Object.assign({ status: 'dang_lam' }, d));
    drivers[6].status = 'nghi';

    const users = [
      { username: 'admin', name: 'Phan Gia Khang', role: 'admin' },
      { username: 'dieuphoi', name: 'Lê Quốc Bảo', role: 'dieuphoi' },
      { username: 'kinhdoanh', name: 'Trần Minh Anh', role: 'kinhdoanh' },
      { username: 'ketoan', name: 'Hoàng Thu Trang', role: 'ketoan' },
      { username: 'taixe', name: 'Nguyễn Văn Thành', role: 'taixe', driverId: 'TX01' },
      { username: 'taixe2', name: 'Trần Quốc Huy', role: 'taixe', driverId: 'TX02' }
    ].map((u, i) => Object.assign({ id: 'ND' + String(i + 1).padStart(2, '0'), pass: NG.hash('123456'), phone: '09' + String(10234567 + i * 1234567).slice(0, 8), createdAt: '2026-06-01T08:00', locked: false }, u));

    const DESTS = [
      ['Kho Sóng Thần, KCN Sóng Thần, Dĩ An, Bình Dương', 28], ['Cửa hàng 214 Đại lộ Bình Dương, Thủ Dầu Một', 35], ['Nhà máy KCN Amata, Biên Hòa, Đồng Nai', 32],
      ['Kho 18 Hùng Vương, TP Tân An, Long An', 45], ['Siêu thị 1058 Nguyễn Văn Linh, Quận 7', 22], ['Kho 55 Tỉnh lộ 8, Củ Chi', 48], ['Đại lý 300 đường 30/4, TP Tây Ninh', 95],
      ['Cửa hàng 72 Lê Hồng Phong, TP Vũng Tàu', 110], ['Showroom 401 Cộng Hòa, Tân Bình', 20], ['Nhà thuốc 156 Quang Trung, Gò Vấp', 18], ['Kho KCN Tân Hương, Châu Thành, Tiền Giang', 75], ['Công trình KCN Nhơn Trạch 3, Đồng Nai', 40]
    ];
    const RECEIVERS = [['Phạm Thị Lan', '0905123678'], ['Trần Văn Bình', '0913456120'], ['Ngô Gia Bảo', '0987001122'], ['Lê Thị Thu', '0938765432'], ['Hồ Văn Tài', '0909345612'], ['Vũ Thị Ngọc', '0916888123'], ['Đặng Minh Trí', '0932567810']];

    const orders = [], trips = [];
    let oSeq = 0, tSeq = 0, iSeq = 0;
    const mkOrder = (date, cu, retryOf) => {
      oSeq++;
      const dst = pick(DESTS);
      const rv = pick(RECEIVERS);
      const created = date < todayS ? addH(date + 'T09:00', -ri(18, 50)) : addH(nowS, -ri(2, 30));
      const pickupFrom = date + 'T' + String(ri(7, 9)).padStart(2, '0') + ':00';
      const weight = pick([400, 650, 900, 1200, 1500, 1800, 2200]);
      const o = {
        id: 'VD' + date.slice(2, 4) + date.slice(5, 7) + '-' + String(oSeq).padStart(4, '0'), customerId: cu.id, createdBy: 'kinhdoanh', createdAt: created < nowS ? created : addH(nowS, -1),
        pickupAddr: cu.address, pickupContact: cu.contact, pickupPhone: cu.phone, pickupFrom, pickupTo: addH(pickupFrom, 2),
        dropAddr: dst[0], km: dst[1], receiver: rv[0], receiverPhone: rv[1], deliverBy: addH(pickupFrom, 3 + Math.ceil(dst[1] / 30) + ri(1, 3)),
        goods: cu.goods, qty: ri(4, 40), unit: cu.cold ? 'thùng' : 'kiện', weight, cold: !!cu.cold, price: 900000 + dst[1] * 26000 + Math.round(weight / 100) * 18000,
        note: retryOf ? 'Giao lại lần 2 (lần 1 thất bại: ' + retryOf + ')' : '', status: 'cho_xep_chuyen', tripId: null, attempts: retryOf ? 1 : 0, deliveredAt: null,
        history: [{ status: 'cho_xep_chuyen', at: created < nowS ? created : addH(nowS, -1), by: 'kinhdoanh', note: retryOf ? 'Xếp lại để giao lần 2' : 'Tạo vận đơn' }]
      };
      orders.push(o);
      return o;
    };

    /* Tạo chuyến từ một nhóm vận đơn; stage: ke_hoach | da_phan_cong | da_nhan | dang_chay | hoan_thanh | da_doi_soat */
    const mkTrip = (date, grp, veh, drv, start, stage, opt) => {
      opt = opt || {};
      tSeq++;
      const id = 'CX' + date.slice(2, 4) + date.slice(5, 7) + '-' + String(tSeq).padStart(3, '0');
      const stops = [];
      grp.forEach((o) => stops.push({ id: id + '-L' + o.id.slice(-4), orderId: o.id, kind: 'lay', addr: o.attempts ? NG.DEPOT : o.pickupAddr, status: 'cho', arrivedAt: null, doneAt: null, pod: null, failReason: '' }));
      grp.slice().sort((a, b) => (a.deliverBy < b.deliverBy ? -1 : 1)).forEach((o) => stops.push({ id: id + '-G' + o.id.slice(-4), orderId: o.id, kind: 'giao', addr: o.dropAddr, status: 'cho', arrivedAt: null, doneAt: null, pod: null, failReason: '' }));
      const planKm = Math.round(grp.reduce((a, o) => a + o.km, 0) * 0.75 + 12);
      const dur = 1 + grp.length * 0.8 + planKm / 35;
      const t = { id, date, vehicleId: veh.id, driverId: drv.id, planStart: start, planEnd: addH(start, dur), planKm, status: 'ke_hoach', createdBy: 'dieuphoi', createdAt: addH(start, -ri(10, 16)), stops, startOdo: null, endOdo: null, costs: [], incidents: [], recon: null, acceptedAt: null, note: '', history: [] };
      t.history.push({ status: 'ke_hoach', at: t.createdAt, by: 'dieuphoi', note: 'Lập chuyến gồm ' + grp.length + ' vận đơn' });
      grp.forEach((o) => { o.tripId = id; o.status = 'da_xep_chuyen'; o.history.push({ status: 'da_xep_chuyen', at: t.createdAt, by: 'dieuphoi', note: 'Xếp vào chuyến ' + id }); });
      const order = ['ke_hoach', 'da_phan_cong', 'da_nhan', 'dang_chay', 'hoan_thanh', 'da_doi_soat'];
      const lv = order.indexOf(stage);
      if (lv >= 1) t.history.push({ status: 'da_phan_cong', at: addH(t.createdAt, 0.2), by: 'dieuphoi', note: 'Giao chuyến cho tài xế ' + drv.name + ', xe ' + veh.plate }), (t.status = 'da_phan_cong');
      if (lv >= 2) { t.acceptedAt = addH(t.createdAt, 0.2 + ri(5, 25) / 60); t.history.push({ status: 'da_nhan', at: t.acceptedAt, by: drv.id, note: 'Tài xế xác nhận nhận chuyến' }); t.status = 'da_nhan'; }
      if (lv >= 3) {
        t.startOdo = veh.odo; t.history.push({ status: 'dang_chay', at: addH(start, -0.2), by: drv.id, note: 'Xuất bến, số km đồng hồ ' + NG.num(veh.odo) }); t.status = 'dang_chay';
        const doneCount = lv >= 4 ? stops.length : (opt.done == null ? Math.ceil(stops.length / 2) : opt.done);
        let clock = start;
        stops.forEach((st, k) => {
          if (k >= doneCount) return;
          const o = orders.find((x) => x.id === st.orderId);
          clock = addH(clock, st.kind === 'lay' ? 0.35 + rnd() * 0.3 : 0.5 + o.km / 40 * (0.5 + rnd() * 0.4));
          if (clock > nowS) clock = addH(nowS, -(doneCount - k) * 0.3 - (lv >= 4 ? 0.8 : 0));
          st.arrivedAt = clock; st.doneAt = addH(clock, 0.25); st.status = 'xong';
          if (st.kind === 'lay') { o.status = 'dang_lay'; o.history.push({ status: 'dang_lay', at: st.arrivedAt, by: drv.id, note: 'Đến điểm lấy hàng' }); o.status = 'dang_giao'; o.history.push({ status: 'dang_giao', at: st.doneAt, by: drv.id, note: 'Đã lấy đủ ' + o.qty + ' ' + o.unit + ', bắt đầu giao' }); }
          else if (opt.fail && opt.fail === o) { st.status = 'that_bai'; st.failReason = 'Người nhận vắng mặt'; o.status = 'giao_that_bai'; o.attempts++; o.history.push({ status: 'giao_that_bai', at: st.doneAt, by: drv.id, note: 'Giao thất bại: Người nhận vắng mặt' }); }
          else {
            if (opt.late && opt.late === o) { st.arrivedAt = addH(o.deliverBy, 0.6); st.doneAt = addH(o.deliverBy, 0.9); }
            st.pod = { name: o.receiver, phone: o.receiverPhone, qty: o.qty, note: rnd() < 0.15 ? 'Thùng ngoài móp nhẹ, hàng bên trong nguyên vẹn' : '', photos: [{ name: 'anh-giao-hang.jpg', data: null }], sign: null, signed: true };
            o.status = 'da_giao'; o.deliveredAt = st.doneAt; o.attempts++; o.history.push({ status: 'da_giao', at: st.doneAt, by: drv.id, note: 'Giao thành công, người nhận ' + o.receiver });
          }
        });
        const cur = stops.find((x) => x.status === 'cho');
        if (cur && lv === 3 && opt.arrived) { cur.status = 'da_den'; cur.arrivedAt = addH(nowS, -0.1); }
        if (opt.incident) {
          iSeq++;
          t.incidents.push({ id: 'SC' + String(iSeq).padStart(3, '0'), at: opt.incident.at || addH(start, 1.2), type: opt.incident.type, desc: opt.incident.desc, by: drv.id, stopId: (cur || stops[stops.length - 1]).id, status: opt.incident.status || 'da_xu_ly', result: opt.incident.result || '', handledBy: opt.incident.status === 'moi' ? null : 'dieuphoi', handledAt: opt.incident.status === 'moi' ? null : addH(opt.incident.at || addH(start, 1.2), 0.3) });
        }
      }
      if (lv >= 4) {
        const last = stops.filter((x) => x.doneAt).map((x) => x.doneAt).sort().pop() || addH(start, dur);
        const km = Math.round(planKm * (0.95 + rnd() * 0.15));
        t.endOdo = t.startOdo + km; veh.odo = t.endOdo;
        t.history.push({ status: 'hoan_thanh', at: addH(last, 0.6) > nowS ? nowS : addH(last, 0.6), by: drv.id, note: 'Về bãi, số km đồng hồ ' + NG.num(t.endOdo) + ', khai chi phí chuyến' }); t.status = 'hoan_thanh';
        const over = opt.fuelOver || (rnd() < 0.07 ? 1.16 + rnd() * 0.1 : 0.93 + rnd() * 0.15);
        const at = addH(last, 0.6) > nowS ? nowS : addH(last, 0.6);
        t.costs.push({ id: id + '-C1', type: 'Nhiên liệu', amount: Math.round(km * veh.fuelNorm / 100 * NG.FUEL_PRICE * over / 1000) * 1000, note: 'Đổ dầu tại cây xăng ' + pick(['Petrolimex 24', 'Comeco Long Bình', 'PVOil Sóng Thần']), receipt: { name: 'hoa-don-xang-dau.jpg', data: null }, by: drv.id, at });
        if (grp.some((o) => o.km > 30)) t.costs.push({ id: id + '-C2', type: 'Phí cầu đường', amount: pick([35000, 52000, 70000, 105000]), note: 'Trạm thu phí ' + pick(['Xa lộ Hà Nội', 'cao tốc TP HCM – Trung Lương', 'BOT QL51']), receipt: { name: 've-cau-duong.jpg', data: null }, by: drv.id, at });
        if (rnd() < 0.35 || opt.noReceipt) t.costs.push({ id: id + '-C3', type: 'Phí bốc xếp', amount: pick([200000, 300000, 400000]), note: 'Thuê bốc xếp tại điểm giao', receipt: opt.noReceipt ? null : { name: 'bien-nhan-boc-xep.jpg', data: null }, by: drv.id, at });
        t.endAt = at;
      }
      if (lv >= 5) {
        const ok = !opt.returned;
        t.recon = { status: ok ? 'da_duyet' : 'tra_lai', by: 'ketoan', at: addH(t.endAt, ri(14, 30)), note: ok ? 'Khớp chứng từ' : 'Thiếu hóa đơn phí bốc xếp, đề nghị bổ sung' };
        if (ok) { t.history.push({ status: 'da_doi_soat', at: t.recon.at, by: 'ketoan', note: 'Duyệt đối soát chi phí ' + NG.num(t.costs.reduce((a, c) => a + c.amount, 0)) + ' đ' }); t.status = 'da_doi_soat'; }
        else { t.history.push({ status: 'hoan_thanh', at: t.recon.at, by: 'ketoan', note: 'Trả lại: ' + t.recon.note }); }
      }
      trips.push(t);
      return t;
    };

    const active = vehicles.filter((v) => v.status === 'san_sang');
    const workDrivers = drivers.filter((d) => d.status === 'dang_lam');
    const fits = (veh, grp) => grp.reduce((a, o) => a + o.weight, 0) <= veh.load * 1000 && (grp.some((o) => o.cold) ? veh.type === 'Xe đông lạnh' : veh.type !== 'Xe đông lạnh');
    let carry = [];

    /* Các ngày đã qua: chuyến đã hoàn thành và đối soát */
    for (let k = -52; k <= -1; k++) {
      const d = day(k);
      if (new Date(d + 'T00:00').getDay() === 0) continue;
      const pool = carry.map((o) => {
        const sh = (x) => d + x.slice(10);
        o.pickupFrom = sh(o.pickupFrom); o.pickupTo = sh(o.pickupTo); o.deliverBy = sh(o.deliverBy);
        o.status = 'cho_xep_chuyen'; o.tripId = null; o.note = 'Giao lại lần 2, hàng lấy từ kho trung chuyển';
        o.history.push({ status: 'cho_xep_chuyen', at: d + 'T06:30', by: 'dieuphoi', note: 'Xếp lại để giao lần 2' });
        return o;
      });
      carry = [];
      const n = ri(4, 7);
      for (let i = 0; i < n; i++) pool.push(mkOrder(d, pick(customers)));
      // Gom đơn thành chuyến
      const usedV = [], usedD = [];
      let slot = 0;
      while (pool.length) {
        const first = pool.shift();
        const vs = active.filter((v) => !usedV.includes(v.id) && fits(v, [first])).sort((a, b) => a.load - b.load);
        const veh = vs.length ? vs[Math.floor(rnd() * Math.min(3, vs.length))] : active.find((v) => fits(v, [first]));
        const grp = [first];
        for (let j = 0; j < pool.length && grp.length < 3; j++) if (fits(veh, grp.concat(pool[j]))) { grp.push(pool[j]); pool.splice(j, 1); j--; }
        const ds = workDrivers.filter((x) => !usedD.includes(x.id) && NG.licenseOk(x, veh));
        const drv = ds.length ? ds[Math.floor(rnd() * ds.length)] : workDrivers.find((x) => NG.licenseOk(x, veh));
        usedV.push(veh.id); usedD.push(drv.id);
        const start = d + 'T' + String(7 + (slot % 3)).padStart(2, '0') + ':' + pick(['00', '15', '30']);
        slot++;
        const opt = {};
        if (rnd() < 0.035) { opt.fail = grp[grp.length - 1]; }
        else if (rnd() < 0.1) opt.late = grp[0];
        if (rnd() < 0.14) opt.incident = { type: pick(['Kẹt xe, ùn tắc', 'Hàng chưa sẵn sàng', 'Kẹt xe, ùn tắc', 'Xe hỏng dọc đường']), desc: 'Báo từ ứng dụng tài xế', result: pick(['Đã báo khách, đồng ý giao trễ 30 phút', 'Điều phối đổi thứ tự điểm giao', 'Đã gọi cứu hộ, thay lốp tại chỗ']) };
        const stage = k >= -2 ? (rnd() < 0.6 ? 'hoan_thanh' : 'da_doi_soat') : 'da_doi_soat';
        if (stage === 'hoan_thanh' && k === -1 && rnd() < 0.3) opt.fuelOver = 1.22;
        if (k === -3 && slot === 1) opt.returned = true;
        if (k === -1 && slot === 1) { opt.fail = grp[grp.length - 1]; delete opt.late; }
        mkTrip(d, grp, veh, drv, start, stage, opt);
        if (opt.fail) { if (k < -2) carry.push(opt.fail); }
      }
    }

    /* Hôm nay: các chuyến ở nhiều trạng thái khác nhau */
    const T = todayS;
    const V = (id) => vehicles.find((v) => v.id === id), D = (id) => drivers.find((d) => d.id === id);
    const cu = (id) => customers.find((c) => c.id === id);
    const g = (ids) => ids.map((c) => mkOrder(T, cu(c)));
    const h0 = (dh) => addH(nowS, dh);
    mkTrip(T, g(['KH001', 'KH006']), V('XE02'), D('TX03'), h0(-6), 'hoan_thanh', { noReceipt: true });
    mkTrip(T, g(['KH002', 'KH003', 'KH004']), V('XE08'), D('TX01'), h0(-2.5), 'dang_chay', { done: 4, arrived: true, incident: { at: h0(-0.6), type: 'Kẹt xe, ùn tắc', desc: 'Ùn tắc cầu Đồng Nai, dự kiến trễ 40 phút', status: 'moi' } });
    mkTrip(T, g(['KH005', 'KH008']), V('XE05'), D('TX04'), h0(-1.5), 'dang_chay', { done: 3 });
    mkTrip(T, g(['KH007']), V('XE03'), D('TX06'), h0(-3), 'dang_chay', { done: 1, incident: { at: h0(-1.2), type: 'Hàng chưa sẵn sàng', desc: 'Kho chưa xuất kịp, chờ 45 phút', status: 'dang_xu_ly', result: 'Đã báo khách, lùi giờ giao 1 tiếng' } });
    mkTrip(T, g(['KH001', 'KH003']), V('XE01'), D('TX02'), h0(0.8), 'da_nhan');
    mkTrip(T, g(['KH004', 'KH006']), V('XE04'), D('TX01'), h0(3.5), 'da_phan_cong');
    mkTrip(T, g(['KH002']), V('XE06'), D('TX05'), h0(4), 'ke_hoach');
    // Vận đơn hôm nay, ngày mai chưa xếp chuyến
    g(['KH003', 'KH007', 'KH001']);
    const tm = day(1);
    ['KH002', 'KH004', 'KH005', 'KH006', 'KH008'].forEach((c) => mkOrder(tm, cu(c)));
    // Một đơn đã hủy
    const cx = mkOrder(tm, cu('KH003')); cx.status = 'da_huy'; cx.history.push({ status: 'da_huy', at: addH(nowS, -3), by: 'kinhdoanh', note: 'Hủy: khách hàng hoãn xuất hàng' });

    const logs = [];
    trips.slice(-14).forEach((t) => t.history.forEach((h) => logs.push({ at: h.at, user: h.by, action: h.note, object: t.id })));
    logs.sort((a, b) => (a.at < b.at ? 1 : -1));

    return { v: 1, customers, vehicles, drivers, users, orders, trips, logs: logs.slice(0, 150), seq: { order: oSeq, trip: tSeq, incident: iSeq, customer: customers.length, user: users.length, vehicle: vehicles.length, driver: drivers.length } };
  };
})();
