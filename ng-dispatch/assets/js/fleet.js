/* Danh mục: phương tiện, tài xế, khách hàng */
(function () {
  const NG = window.NG;
  const { esc, $, $$ } = NG;
  const t = (x) => String(x).replace('.', ',');
  const LOADS = [1.5, 2.5, 3.5, 5, 8];
  const curTrip = (key, id) => NG.db().trips.find((x) => x[key] === id && x.status === 'dang_chay');
  const nextTrip = (key, id) => NG.db().trips.filter((x) => x[key] === id && ['ke_hoach', 'da_phan_cong', 'da_nhan'].includes(x.status)).sort((a, b) => (a.planStart > b.planStart ? 1 : -1))[0];
  const tripLink = (x) => (NG.can('chuyen-xe') ? '<a class="code" href="#/chuyen-xe/' + x.id + '">' + x.id + '</a>' : '<span class="code">' + x.id + '</span>');

  /* ---------- Phương tiện ---------- */
  NG.V['phuong-tien'] = function (el) {
    const d = NG.db(), canEdit = NG.may('fleet.edit');
    const month = NG.now().slice(0, 7);
    const mtrips = (v) => d.trips.filter((x) => x.vehicleId === v.id && x.endOdo && x.date.slice(0, 7) === month);
    el.innerHTML = '<div class="page-h"><div><h1>Phương tiện</h1><p>Đội xe, tải trọng, định mức nhiên liệu và lịch chạy</p></div>' + (canEdit ? '<button class="btn primary" id="add">+ Thêm xe</button>' : '') + '</div><section class="card"><div id="tb"></div></section>';
    const tb = NG.table($('#tb'), {
      rows: () => d.vehicles, sort: 'id', dir: 1,
      cols: [{ key: 'plate', label: 'Biển số', html: (v) => '<b>' + esc(v.plate) + '</b><div class="mut sm">' + v.id + ' · ' + v.year + '</div>' }, { key: 'type', label: 'Loại xe' }, { key: 'load', label: 'Tải trọng', num: true, html: (v) => t(v.load) + ' tấn' },
        { key: 'fuelNorm', label: 'Định mức', num: true, html: (v) => v.fuelNorm + ' l/100 km' }, { key: 'odo', label: 'Km đồng hồ', num: true, html: (v) => NG.num(v.odo) },
        { key: 'status', label: 'Tình trạng', html: (v) => NG.badge(v.status, NG.ST.vehicle) + (v.note ? '<div class="mut sm">' + esc(v.note) + '</div>' : '') },
        { key: 'cur', label: 'Chuyến hiện tại / kế tiếp', sortable: false, html: (v) => { const a = curTrip('vehicleId', v.id), n = nextTrip('vehicleId', v.id); return (a ? tripLink(a) + ' ' + NG.tbadge(a.status) : '<span class="mut">Không chạy</span>') + (n ? '<div class="sm mut">Kế tiếp: ' + n.id + ' · ' + NG.fmtDT(n.planStart) + '</div>' : ''); } },
        { key: 'm', label: 'Tháng này', num: true, sortVal: (v) => mtrips(v).length, html: (v) => { const a = mtrips(v); return a.length + ' chuyến<div class="mut sm">' + NG.num(a.reduce((s, x) => s + NG.tripKm(x), 0)) + ' km</div>'; } },
        { key: 'a', label: '', sortable: false, html: (v) => (canEdit ? '<button class="btn sm ghost" data-e="' + v.id + '">Sửa</button>' : '') }],
      after: (box) => $$('[data-e]', box).forEach((b) => b.onclick = () => edit(NG.vehicle(b.dataset.e)))
    });
    if ($('#add')) $('#add').onclick = () => edit(null);
    function edit(v) {
      const x = v || { plate: '', type: NG.VEHICLE_TYPES[0], load: 3.5, fuelNorm: 14, year: 2025, odo: 0, status: 'san_sang', note: '' };
      NG.modal(v ? 'Sửa xe ' + v.plate : 'Thêm xe', '<div class="fgrid"><div class="field"><label for="v_plate">Biển số <span class="rq">*</span></label><input class="input" id="v_plate" placeholder="51D-123.45" value="' + esc(x.plate) + '"></div>' +
        '<div class="field"><label for="v_type">Loại xe</label><select class="input" id="v_type">' + NG.VEHICLE_TYPES.map((y) => '<option' + (y === x.type ? ' selected' : '') + '>' + y + '</option>').join('') + '</select></div>' +
        '<div class="field"><label for="v_load">Tải trọng</label><select class="input" id="v_load">' + LOADS.map((y) => '<option value="' + y + '"' + (y === x.load ? ' selected' : '') + '>' + t(y) + ' tấn</option>').join('') + '</select></div>' +
        '<div class="field"><label for="v_fuelNorm">Định mức nhiên liệu (lít/100 km) <span class="rq">*</span></label><input class="input" id="v_fuelNorm" type="number" step="0.5" value="' + x.fuelNorm + '"></div>' +
        '<div class="field"><label for="v_year">Năm sản xuất <span class="rq">*</span></label><input class="input" id="v_year" inputmode="numeric" value="' + x.year + '"></div><div class="field"><label for="v_odo">Km đồng hồ hiện tại</label><input class="input" id="v_odo" type="number" value="' + x.odo + '"></div>' +
        '<div class="field"><label for="v_status">Tình trạng</label><select class="input" id="v_status">' + Object.entries(NG.ST.vehicle).map(([k, y]) => '<option value="' + k + '"' + (k === x.status ? ' selected' : '') + '>' + y.label + '</option>').join('') + '</select></div><div class="field"><label for="v_note">Ghi chú</label><input class="input" id="v_note" value="' + esc(x.note || '') + '"></div></div>', (bg) => {
        const g = (k) => bg.querySelector('#v_' + k).value.trim();
        const ok = NG.validate(bg, [['v_plate', (p) => (!/^\d{2}[A-Z]{1,2}-\d{3}\.\d{2}$/.test(p.toUpperCase()) ? 'Biển số theo dạng 51D-123.45.' : d.vehicles.some((y) => y.plate === p.toUpperCase() && y !== v) ? 'Biển số đã tồn tại.' : '')],
          ['v_fuelNorm', (y) => (!(+y >= 5 && +y <= 40) ? 'Định mức từ 5 đến 40 lít/100 km.' : '')], ['v_year', (y) => (+y < 2000 || +y > 2026 ? 'Năm sản xuất từ 2000 đến 2026.' : '')],
          ['v_status', (s) => (v && s !== 'san_sang' && (curTrip('vehicleId', v.id) || nextTrip('vehicleId', v.id)) ? 'Xe đang có chuyến được lập, cần đổi xe cho chuyến đó trước.' : '')]]);
        if (!ok) return false;
        const data = { plate: g('plate').toUpperCase(), type: g('type'), load: +g('load'), fuelNorm: +g('fuelNorm'), year: +g('year'), odo: +g('odo'), status: g('status'), note: g('note') };
        if (v) { Object.assign(v, data); NG.log('Sửa phương tiện', v.id); } else { const id = NG.nextId('vehicle', 'XE', 2); d.vehicles.push(Object.assign({ id }, data)); NG.log('Thêm phương tiện', id); }
        NG.save(); NG.toast('Đã lưu thông tin xe.'); tb.refresh();
      }, { okText: 'Lưu', wide: true });
    }
  };

  /* ---------- Tài xế ---------- */
  NG.V['tai-xe'] = function (el) {
    const d = NG.db(), canEdit = NG.may('fleet.edit');
    const month = NG.now().slice(0, 7);
    const drops = (x) => { const out = []; d.trips.filter((y) => y.driverId === x.id && y.date.slice(0, 7) === month).forEach((y) => y.stops.filter((s) => s.kind === 'giao' && (s.status === 'xong' || s.status === 'that_bai')).forEach((s) => out.push(s))); return out; };
    el.innerHTML = '<div class="page-h"><div><h1>Tài xế</h1><p>Hạng bằng lái, tình trạng làm việc, chuyến hiện tại và kết quả giao hàng trong tháng</p></div>' + (canEdit ? '<button class="btn primary" id="add">+ Thêm tài xế</button>' : '') + '</div><section class="card"><div id="tb"></div></section>';
    const tb = NG.table($('#tb'), {
      rows: () => d.drivers, sort: 'id', dir: 1,
      cols: [{ key: 'name', label: 'Tài xế', html: (x) => '<b>' + esc(x.name) + '</b><div class="mut sm">' + x.id + ' · ' + esc(x.phone) + '</div>' },
        { key: 'license', label: 'Hạng GPLX', html: (x) => x.license + '<div class="mut sm">' + (x.license === 'B2' ? 'Xe đến 3,5 tấn' : 'Xe trên 3,5 tấn') + '</div>' },
        { key: 'licenseExp', label: 'Hạn GPLX', html: (x) => NG.fmtD(x.licenseExp) + (x.licenseExp < NG.addDays(NG.today(), 90) ? ' <span class="pill amber">Sắp hết hạn</span>' : '') },
        { key: 'status', label: 'Tình trạng', html: (x) => NG.badge(x.status, NG.ST.driver) },
        { key: 'cur', label: 'Chuyến hiện tại / kế tiếp', sortable: false, html: (x) => { const a = curTrip('driverId', x.id), n = nextTrip('driverId', x.id); return (a ? tripLink(a) + ' ' + NG.tbadge(a.status) : '<span class="mut">Không chạy</span>') + (n ? '<div class="sm mut">Kế tiếp: ' + n.id + ' · ' + NG.fmtDT(n.planStart) + '</div>' : ''); } },
        { key: 'm', label: 'Giao trong tháng', num: true, sortVal: (x) => drops(x).length, html: (x) => { const a = drops(x), ok = a.filter((s) => s.status === 'xong'); return a.length + ' lượt' + (ok.length ? '<div class="sm mut">' + Math.round(ok.filter((s) => !NG.stopLate(s)).length * 100 / ok.length) + '% đúng hạn</div>' : ''); } },
        { key: 'a', label: '', sortable: false, html: (x) => (canEdit ? '<button class="btn sm ghost" data-e="' + x.id + '">Sửa</button>' : '') }],
      after: (box) => $$('[data-e]', box).forEach((b) => b.onclick = () => edit(NG.driver(b.dataset.e)))
    });
    if ($('#add')) $('#add').onclick = () => edit(null);
    function edit(x) {
      const v = x || { name: '', phone: '', license: 'C', licenseExp: NG.addDays(NG.today(), 1800), since: 2025, status: 'dang_lam' };
      NG.modal(x ? 'Sửa tài xế ' + x.id : 'Thêm tài xế', '<div class="fgrid"><div class="field full"><label for="t_name">Họ tên <span class="rq">*</span></label><input class="input" id="t_name" value="' + esc(v.name) + '"></div>' +
        '<div class="field"><label for="t_phone">Số điện thoại <span class="rq">*</span></label><input class="input" id="t_phone" value="' + esc(v.phone) + '"></div><div class="field"><label for="t_license">Hạng GPLX</label><select class="input" id="t_license">' + ['B2', 'C', 'FC'].map((y) => '<option' + (y === v.license ? ' selected' : '') + '>' + y + '</option>').join('') + '</select></div>' +
        '<div class="field"><label for="t_licenseExp">Hạn GPLX <span class="rq">*</span></label><input class="input" type="date" id="t_licenseExp" value="' + v.licenseExp + '"></div><div class="field"><label for="t_since">Năm vào nghề</label><input class="input" id="t_since" value="' + v.since + '"></div>' +
        '<div class="field"><label for="t_status">Tình trạng</label><select class="input" id="t_status">' + Object.entries(NG.ST.driver).map(([k, y]) => '<option value="' + k + '"' + (k === v.status ? ' selected' : '') + '>' + y.label + '</option>').join('') + '</select></div></div>', (bg) => {
        const g = (k) => bg.querySelector('#t_' + k).value.trim();
        const ok = NG.validate(bg, [['t_name', NG.req('họ tên')], ['t_phone', (p) => (!NG.phoneOk(p) ? 'Số điện thoại phải gồm 10–11 chữ số và bắt đầu bằng 0.' : d.drivers.some((y) => y.phone === NG.digits(p) && y !== x) ? 'Số điện thoại đã được dùng.' : '')],
          ['t_licenseExp', (y) => (!y ? 'Vui lòng nhập hạn GPLX.' : y < NG.today() ? 'Bằng lái đã hết hạn, không thể đưa vào điều phối.' : '')], ['t_since', (y) => (+y < 1980 || +y > 2026 ? 'Năm không hợp lệ.' : '')],
          ['t_status', (s) => (x && s !== 'dang_lam' && (curTrip('driverId', x.id) || nextTrip('driverId', x.id)) ? 'Tài xế đang có chuyến được lập, cần đổi tài xế cho chuyến đó trước.' : '')]]);
        if (!ok) return false;
        const data = { name: g('name'), phone: NG.digits(g('phone')), license: g('license'), licenseExp: g('licenseExp'), since: +g('since'), status: g('status') };
        if (x) { Object.assign(x, data); NG.log('Sửa tài xế', x.id); } else { const id = NG.nextId('driver', 'TX', 2); d.drivers.push(Object.assign({ id }, data)); NG.log('Thêm tài xế', id); }
        NG.save(); NG.toast('Đã lưu thông tin tài xế.'); tb.refresh();
      }, { okText: 'Lưu' });
    }
  };

  /* ---------- Khách hàng ---------- */
  NG.V['khach-hang'] = function (el) {
    const d = NG.db(), canEdit = NG.may('order.edit') || NG.role() === 'admin';
    el.innerHTML = '<div class="page-h"><div><h1>Khách hàng</h1><p>' + d.customers.filter((c) => c.active).length + ' khách hàng đang giao dịch · điểm lấy hàng mặc định khi tạo vận đơn</p></div>' + (canEdit ? '<button class="btn primary" id="add">+ Thêm khách hàng</button>' : '') + '</div>' +
      '<section class="card"><div class="filters"><input class="input search" id="q" placeholder="Tìm tên, mã số thuế, số điện thoại…" aria-label="Tìm kiếm"></div><div id="tb"></div></section>';
    const os = (c) => d.orders.filter((o) => o.customerId === c.id);
    const rate = (c) => { const a = os(c).filter((o) => o.deliveredAt); return a.length ? Math.round(a.filter((o) => o.deliveredAt <= o.deliverBy).length * 100 / a.length) : null; };
    const rows = () => { const q = $('#q').value.toLowerCase(); return d.customers.filter((c) => !q || [c.id, c.name, c.taxCode, c.phone, c.contact].join(' ').toLowerCase().includes(q)); };
    const tb = NG.table($('#tb'), {
      rows, sort: 'id', dir: 1,
      cols: [{ key: 'id', label: 'Mã', html: (c) => '<b class="mono">' + c.id + '</b>' }, { key: 'name', label: 'Khách hàng', html: (c) => esc(c.name) + '<div class="mut sm">Kho: ' + esc(c.address) + '</div>' },
        { key: 'contact', label: 'Liên hệ', html: (c) => esc(c.contact) + '<div class="mut sm">' + esc(c.phone) + '</div>' }, { key: 'goods', label: 'Hàng thường gửi', html: (c) => esc(c.goods || '—') + (c.cold ? ' <span class="pill" style="background:var(--info-soft);color:var(--info)">Giữ lạnh</span>' : '') },
        { key: 'n', label: 'Vận đơn', num: true, sortVal: (c) => os(c).length, html: (c) => (NG.can('van-don') ? '<a href="#/van-don?kh=' + c.id + '">' + os(c).length + '</a>' : os(c).length) },
        { key: 'r', label: 'Đúng hạn', num: true, sortVal: (c) => rate(c) || 0, html: (c) => (rate(c) == null ? '—' : rate(c) + '%') },
        { key: 'a', label: '', sortable: false, html: (c) => (canEdit ? '<button class="btn sm ghost" data-e="' + c.id + '">Sửa</button>' : '') }],
      after: (box) => $$('[data-e]', box).forEach((b) => b.onclick = () => edit(d.customers.find((c) => c.id === b.dataset.e)))
    });
    $('#q').addEventListener('input', tb.redraw);
    if ($('#add')) $('#add').onclick = () => edit(null);
    function edit(c) {
      const v = c || { name: '', short: '', contact: '', phone: '', email: '', address: '', taxCode: '', goods: '', cold: false };
      const f = (id, lb, rq, extra) => '<div class="field' + (extra || '') + '"><label for="c_' + id + '">' + lb + (rq ? ' <span class="rq">*</span>' : '') + '</label><input class="input" id="c_' + id + '" value="' + esc(v[id]) + '"></div>';
      NG.modal(c ? 'Sửa khách hàng ' + c.id : 'Thêm khách hàng', '<div class="fgrid">' + f('name', 'Tên khách hàng', 1, ' full') + f('short', 'Tên viết tắt') + f('taxCode', 'Mã số thuế') + f('contact', 'Người liên hệ', 1) + f('phone', 'Số điện thoại', 1) + f('email', 'Email') + f('goods', 'Hàng thường gửi') + f('address', 'Địa chỉ kho lấy hàng', 1, ' full') + '<label class="check full"><input type="checkbox" id="c_cold"' + (v.cold ? ' checked' : '') + '> Hàng cần giữ lạnh</label></div>', (bg) => {
        const g = (k) => bg.querySelector('#c_' + k).value.trim();
        const ok = NG.validate(bg, [['c_name', (x) => (x.length < 3 ? 'Vui lòng nhập tên khách hàng.' : '')],
          ['c_taxCode', (x) => (x && !/^\d{10}(\d{3})?$/.test(x) ? 'Mã số thuế gồm 10 hoặc 13 chữ số.' : x && d.customers.some((y) => y.taxCode === x && y !== c) ? 'Mã số thuế đã thuộc về khách hàng khác.' : '')],
          ['c_contact', NG.req('người liên hệ')], ['c_phone', (x) => (!NG.phoneOk(x) ? 'Số điện thoại phải gồm 10–11 chữ số và bắt đầu bằng 0.' : '')],
          ['c_email', (x) => (x && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x) ? 'Email không đúng định dạng.' : '')], ['c_address', NG.req('địa chỉ kho')]]);
        if (!ok) return false;
        const data = { name: g('name'), short: g('short') || g('name').replace(/^Công ty (TNHH|CP|Cổ phần)\s*/i, ''), taxCode: g('taxCode'), contact: g('contact'), phone: NG.digits(g('phone')), email: g('email'), goods: g('goods'), address: g('address'), cold: bg.querySelector('#c_cold').checked };
        if (c) { Object.assign(c, data); NG.log('Sửa khách hàng', c.id); } else { const id = NG.nextId('customer', 'KH', 3); d.customers.push(Object.assign({ id, active: true, createdAt: NG.now() }, data)); NG.log('Thêm khách hàng', id); }
        NG.save(); NG.toast(c ? 'Đã lưu thông tin khách hàng.' : 'Đã thêm khách hàng mới.'); tb.refresh();
      }, { wide: true, okText: 'Lưu' });
    }
  };
})();
