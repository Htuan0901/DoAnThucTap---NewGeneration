/* Vận đơn: danh sách, tạo và sửa, chi tiết, xác nhận giao nhận, xếp lại khi giao thất bại */
(function () {
  const NG = window.NG;
  const { esc, $, $$ } = NG;

  NG.SIGN_SVG = '<svg viewBox="0 0 160 50" width="160" height="50" aria-label="Chữ ký người nhận"><path d="M8 34c10-18 18-22 22-12s-4 18 4 10 12-24 18-16-6 22 4 14 14-12 22-10 6 10 14 4 12-10 22-6 10 6 18 2" fill="none" stroke="#2a3a8c" stroke-width="2.2" stroke-linecap="round"/></svg>';
  NG.photoBox = (p) => (p.data ? '<img src="' + p.data + '" alt="' + esc(p.name) + '">' : '<span class="ph-ph" title="' + esc(p.name) + '"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M21 17l-5-5-8 7"/></svg>' + esc(p.name) + '</span>');

  NG.V['van-don'] = function (el, r) {
    const id = r.parts[1];
    if (id === 'moi') return form(el, null);
    if (id && r.parts[2] === 'sua') return form(el, NG.order(id));
    if (id) return detail(el, NG.order(id));
    list(el, r);
  };

  function list(el, r) {
    const d = NG.db();
    el.innerHTML = '<div class="page-h"><div><h1>Vận đơn</h1><p>Yêu cầu vận chuyển của khách hàng, là đầu vào để điều phối gom thành chuyến xe</p></div><div class="row"><button class="btn ghost" id="xls">Xuất Excel</button>' + (NG.may('order.edit') ? '<a class="btn primary" href="#/van-don/moi">+ Tạo vận đơn</a>' : '') + '</div></div>' +
      '<section class="card"><div class="filters"><input class="input search" id="q" placeholder="Tìm mã vận đơn, khách hàng, người nhận, địa chỉ…" aria-label="Tìm kiếm">' +
      '<select class="input" id="st" aria-label="Trạng thái"><option value="">Tất cả trạng thái</option><option value="can">Cần xếp chuyến</option>' + Object.entries(NG.ST.order).map(([k, v]) => '<option value="' + k + '">' + v.label + '</option>').join('') + '</select>' +
      '<select class="input" id="kh" aria-label="Khách hàng"><option value="">Tất cả khách hàng</option>' + d.customers.map((c) => '<option value="' + c.id + '">' + esc(c.short) + '</option>').join('') + '</select>' +
      '<input class="input" type="date" id="dd" aria-label="Ngày lấy hàng"></div><div id="tb"></div></section>';
    if (r.q.get('st')) $('#st').value = r.q.get('st');
    const rows = () => {
      const q = $('#q').value.trim().toLowerCase(), st = $('#st').value, kh = $('#kh').value, dd = $('#dd').value;
      return d.orders.filter((o) => (!st || (st === 'can' ? ['cho_xep_chuyen', 'giao_that_bai'].includes(o.status) : o.status === st)) && (!kh || o.customerId === kh) && (!dd || o.pickupFrom.slice(0, 10) === dd) &&
        (!q || [o.id, NG.customer(o.customerId).name, o.receiver, o.dropAddr, o.pickupAddr, o.tripId].join(' ').toLowerCase().includes(q)));
    };
    const tb = NG.table($('#tb'), {
      rows, sort: 'pickupFrom', dir: -1, size: 12,
      cols: [
        { key: 'id', label: 'Mã vận đơn', html: (o) => '<a class="code" href="#/van-don/' + o.id + '">' + o.id + '</a>' + (o.attempts && o.status !== 'da_giao' ? '<div class="mut sm">Lần giao ' + o.attempts + '</div>' : '') },
        { key: 'customerId', label: 'Khách hàng', html: (o) => esc(NG.customer(o.customerId).short), sortVal: (o) => NG.customer(o.customerId).short },
        { key: 'pickupFrom', label: 'Lấy hàng', html: (o) => '<span class="nowrap">' + NG.fmtD(o.pickupFrom) + '</span><div class="mut sm">' + NG.hhmm(o.pickupFrom) + '–' + NG.hhmm(o.pickupTo) + '</div>' },
        { key: 'dropAddr', label: 'Giao đến', html: (o) => esc(o.dropAddr.split(',').slice(0, 2).join(',')) + '<div class="mut sm">Hạn ' + NG.fmtDT(o.deliverBy) + (NG.isLate(o) ? ' <span class="pill red">Trễ</span>' : '') + '</div>' },
        { key: 'weight', label: 'Khối lượng', num: true, html: (o) => NG.kg(o.weight) + (o.cold ? '<div class="mut sm">Giữ lạnh</div>' : '') },
        { key: 'tripId', label: 'Chuyến', html: (o) => (o.tripId ? (NG.can('chuyen-xe') ? '<a class="code" href="#/chuyen-xe/' + o.tripId + '">' + o.tripId + '</a>' : '<span class="code">' + o.tripId + '</span>') : '<span class="mut">—</span>') },
        { key: 'status', label: 'Trạng thái', html: (o) => NG.badge(o.status) }
      ]
    });
    ['q', 'st', 'kh', 'dd'].forEach((i) => $('#' + i).addEventListener('input', tb.redraw));
    $('#xls').onclick = () => NG.download('van-don.csv', [['Mã vận đơn', 'Khách hàng', 'Lấy hàng từ', 'Địa chỉ lấy', 'Địa chỉ giao', 'Hạn giao', 'Khối lượng (kg)', 'Chuyến', 'Trạng thái', 'Thời điểm giao']].concat(rows().map((o) => [o.id, NG.customer(o.customerId).name, NG.fmtDT(o.pickupFrom), o.pickupAddr, o.dropAddr, NG.fmtDT(o.deliverBy), o.weight, o.tripId || '', NG.ST.order[o.status].label, o.deliveredAt ? NG.fmtDT(o.deliveredAt) : ''])));
  }

  function form(el, o) {
    if (!NG.may('order.edit')) { el.innerHTML = '<p>Bạn không có quyền tạo hoặc sửa vận đơn.</p>'; return; }
    if (o && o.status !== 'cho_xep_chuyen') { el.innerHTML = '<div class="alert warn">Chỉ sửa được vận đơn đang ở trạng thái Chờ xếp chuyến. Vận đơn ' + esc(o.id) + ' hiện ' + NG.ST.order[o.status].label.toLowerCase() + '.</div>'; return; }
    const d = NG.db();
    const tm = NG.addDays(NG.today(), 1);
    const v = o || { customerId: '', pickupAddr: '', pickupContact: '', pickupPhone: '', pickupFrom: tm + 'T08:00', pickupTo: tm + 'T10:00', dropAddr: '', km: '', receiver: '', receiverPhone: '', deliverBy: tm + 'T15:00', goods: '', qty: '', unit: 'kiện', weight: '', cold: false, price: '', note: '' };
    const f = (id, label, html, cls) => '<div class="field' + (cls ? ' ' + cls : '') + '"><label for="' + id + '">' + label + '</label>' + html + '</div>';
    const inp = (id, val, attr) => '<input class="input" id="' + id + '" value="' + esc(val) + '"' + (attr || '') + '>';
    el.innerHTML = '<div class="crumb"><a href="#/van-don">Vận đơn</a> / ' + (o ? esc(o.id) : 'Tạo mới') + '</div><div class="page-h"><div><h1>' + (o ? 'Sửa vận đơn ' + esc(o.id) : 'Tạo vận đơn') + '</h1><p>Thông tin lấy hàng, giao hàng và hàng hóa để điều phối xếp chuyến</p></div></div>' +
      '<form class="form" id="of" novalidate><section class="card"><div class="card-b form">' +
      '<fieldset><legend>Khách hàng và điểm lấy hàng</legend><div class="fgrid">' +
      f('o_customerId', 'Khách hàng <span class="rq">*</span>', '<select class="input" id="o_customerId"><option value="">— Chọn khách hàng —</option>' + d.customers.filter((c) => c.active).map((c) => '<option value="' + c.id + '"' + (c.id === v.customerId ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('') + '</select>', 'full') +
      f('o_pickupAddr', 'Địa chỉ lấy hàng <span class="rq">*</span>', inp('o_pickupAddr', v.pickupAddr), 'full') +
      f('o_pickupContact', 'Người giao hàng tại kho <span class="rq">*</span>', inp('o_pickupContact', v.pickupContact)) + f('o_pickupPhone', 'Số điện thoại <span class="rq">*</span>', inp('o_pickupPhone', v.pickupPhone, ' inputmode="tel"')) +
      f('o_pickupFrom', 'Lấy hàng từ <span class="rq">*</span>', inp('o_pickupFrom', v.pickupFrom, ' type="datetime-local"')) + f('o_pickupTo', 'Đến <span class="rq">*</span>', inp('o_pickupTo', v.pickupTo, ' type="datetime-local"')) + '</div></fieldset>' +
      '<fieldset><legend>Điểm giao hàng</legend><div class="fgrid">' + f('o_dropAddr', 'Địa chỉ giao hàng <span class="rq">*</span>', inp('o_dropAddr', v.dropAddr), 'full') +
      f('o_receiver', 'Người nhận <span class="rq">*</span>', inp('o_receiver', v.receiver)) + f('o_receiverPhone', 'Số điện thoại người nhận <span class="rq">*</span>', inp('o_receiverPhone', v.receiverPhone, ' inputmode="tel"')) +
      f('o_deliverBy', 'Hạn giao hàng <span class="rq">*</span>', inp('o_deliverBy', v.deliverBy, ' type="datetime-local"')) + f('o_km', 'Quãng đường ước tính (km) <span class="rq">*</span>', inp('o_km', v.km, ' type="number" min="1"')) + '</div></fieldset>' +
      '<fieldset><legend>Hàng hóa</legend><div class="fgrid c3">' + f('o_goods', 'Tên hàng <span class="rq">*</span>', inp('o_goods', v.goods), 'full') +
      f('o_qty', 'Số lượng <span class="rq">*</span>', inp('o_qty', v.qty, ' type="number" min="1"')) + f('o_unit', 'Đơn vị', '<select class="input" id="o_unit">' + ['kiện', 'thùng', 'pallet', 'cuộn', 'bao'].map((x) => '<option' + (x === v.unit ? ' selected' : '') + '>' + x + '</option>').join('') + '</select>') +
      f('o_weight', 'Khối lượng (kg) <span class="rq">*</span>', inp('o_weight', v.weight, ' type="number" min="1"')) +
      '<label class="check full"><input type="checkbox" id="o_cold"' + (v.cold ? ' checked' : '') + '> Hàng cần giữ lạnh (chỉ xếp được lên xe đông lạnh)</label>' +
      (NG.seePrice() ? f('o_price', 'Cước vận chuyển (đồng) <span class="rq">*</span>', inp('o_price', v.price, ' type="number" min="0" step="1000"')) : '') +
      f('o_note', 'Ghi chú', '<textarea class="input" id="o_note">' + esc(v.note) + '</textarea>', 'full') + '</div></fieldset>' +
      '</div></section><div class="row" style="justify-content:flex-end"><a class="btn ghost" href="#/van-don' + (o ? '/' + o.id : '') + '">Hủy</a><button class="btn primary">' + (o ? 'Lưu thay đổi' : 'Tạo vận đơn') + '</button></div></form>';
    $('#o_customerId').onchange = () => { const c = NG.customer($('#o_customerId').value); if (c && c.address) { if (!$('#o_pickupAddr').value) $('#o_pickupAddr').value = c.address; if (!$('#o_pickupContact').value) $('#o_pickupContact').value = c.contact; if (!$('#o_pickupPhone').value) $('#o_pickupPhone').value = c.phone; if (!$('#o_goods').value) $('#o_goods').value = c.goods || ''; $('#o_cold').checked = !!c.cold; } };
    $('#of').onsubmit = (e) => {
      e.preventDefault();
      const g = (k) => $('#o_' + k).value.trim();
      const maxLoad = Math.max(...d.vehicles.filter((x) => x.status !== 'ngung').map((x) => x.load)) * 1000;
      const coldMax = Math.max(0, ...d.vehicles.filter((x) => x.type === 'Xe đông lạnh').map((x) => x.load)) * 1000;
      const ok = NG.validate($('#of'), [
        ['o_customerId', (x) => (!x ? 'Vui lòng chọn khách hàng.' : '')], ['o_pickupAddr', NG.req('địa chỉ lấy hàng')], ['o_pickupContact', NG.req('người giao hàng')],
        ['o_pickupPhone', (x) => (!NG.phoneOk(x) ? 'Số điện thoại gồm 10–11 chữ số, bắt đầu bằng 0.' : '')],
        ['o_pickupFrom', (x) => (!x ? 'Vui lòng chọn thời gian lấy hàng.' : !o && x < NG.now() ? 'Thời gian lấy hàng phải sau thời điểm hiện tại.' : '')],
        ['o_pickupTo', (x) => (!x ? 'Vui lòng chọn thời gian.' : x <= g('pickupFrom') ? 'Khung giờ lấy hàng phải kết thúc sau giờ bắt đầu.' : '')],
        ['o_dropAddr', NG.req('địa chỉ giao hàng')], ['o_receiver', NG.req('người nhận')], ['o_receiverPhone', (x) => (!NG.phoneOk(x) ? 'Số điện thoại gồm 10–11 chữ số, bắt đầu bằng 0.' : '')],
        ['o_deliverBy', (x) => (!x ? 'Vui lòng chọn hạn giao.' : x <= g('pickupTo') ? 'Hạn giao phải sau khung giờ lấy hàng.' : '')],
        ['o_km', (x) => (!(+x > 0) ? 'Quãng đường phải lớn hơn 0.' : +x > 400 ? 'Công ty chỉ nhận tuyến dưới 400 km.' : '')],
        ['o_goods', NG.req('tên hàng')], ['o_qty', (x) => (!(+x > 0) ? 'Số lượng phải lớn hơn 0.' : '')],
        ['o_weight', (x) => (!(+x > 0) ? 'Khối lượng phải lớn hơn 0.' : +x > maxLoad ? 'Vượt tải trọng xe lớn nhất (' + NG.kg(maxLoad) + '). Vui lòng tách thành nhiều vận đơn.' : $('#o_cold').checked && +x > coldMax ? 'Hàng giữ lạnh tối đa ' + NG.kg(coldMax) + ' theo xe đông lạnh hiện có.' : '')],
        ['o_price', (x) => (!(+x >= 0) || x === '' ? 'Vui lòng nhập cước vận chuyển.' : '')]
      ]);
      if (!ok) return;
      const data = { customerId: g('customerId'), pickupAddr: g('pickupAddr'), pickupContact: g('pickupContact'), pickupPhone: NG.digits(g('pickupPhone')), pickupFrom: g('pickupFrom'), pickupTo: g('pickupTo'), dropAddr: g('dropAddr'), receiver: g('receiver'), receiverPhone: NG.digits(g('receiverPhone')), deliverBy: g('deliverBy'), km: +g('km'), goods: g('goods'), qty: +g('qty'), unit: g('unit'), weight: +g('weight'), cold: $('#o_cold').checked, note: g('note') };
      if (NG.seePrice()) data.price = +g('price');
      if (o) { Object.assign(o, data); o.history.push({ status: o.status, at: NG.now(), by: NG.user().username, note: 'Cập nhật thông tin vận đơn' }); NG.log('Sửa vận đơn', o.id); NG.save(); NG.toast('Đã lưu vận đơn ' + o.id + '.'); NG.go('#/van-don/' + o.id); return; }
      const id = 'VD' + data.pickupFrom.slice(2, 4) + data.pickupFrom.slice(5, 7) + '-' + String(++d.seq.order).padStart(4, '0');
      d.orders.push(Object.assign({ id, createdBy: NG.user().username, createdAt: NG.now(), status: 'cho_xep_chuyen', tripId: null, attempts: 0, deliveredAt: null, price: 0, history: [{ status: 'cho_xep_chuyen', at: NG.now(), by: NG.user().username, note: 'Tạo vận đơn' }] }, data));
      NG.log('Tạo vận đơn', id); NG.save(); NG.toast('Đã tạo vận đơn ' + id + '. Vận đơn chuyển sang điều phối để xếp chuyến.'); NG.go('#/van-don/' + id);
    };
  }

  /* Dòng tiến trình của vận đơn */
  function steps(o) {
    const S = ['Tạo vận đơn', 'Xếp chuyến', 'Lấy hàng', 'Đang giao', 'Đã giao'];
    const idx = { cho_xep_chuyen: 0, da_xep_chuyen: 1, dang_lay: 2, dang_giao: 3, da_giao: 4, giao_that_bai: 3, tra_hang: 3, da_huy: -1 }[o.status];
    return '<div class="stepper">' + S.map((s, i) => '<div class="step' + (i < idx || (i === idx && o.status === 'da_giao') ? ' done' : i === idx ? ' cur' : '') + '"><div class="c">' + (i < idx || o.status === 'da_giao' ? '✓' : i + 1) + '</div>' + s + '</div>').join('') + '</div>';
  }

  function detail(el, o) {
    if (!o) { el.innerHTML = '<p>Không tìm thấy vận đơn.</p>'; return; }
    const c = NG.customer(o.customerId);
    const trips = NG.db().trips.filter((t) => t.stops.some((s) => s.orderId === o.id));
    const t = o.tripId ? NG.trip(o.tripId) : null;
    const drop = trips.map((x) => x.stops.find((s) => s.orderId === o.id && s.kind === 'giao')).filter((s) => s && s.status !== 'cho');
    const canEdit = NG.may('order.edit') && o.status === 'cho_xep_chuyen';
    const canCancel = (NG.may('order.edit') || NG.may('trip.plan')) && (o.status === 'cho_xep_chuyen' || (o.status === 'da_xep_chuyen' && t && ['ke_hoach', 'da_phan_cong'].includes(t.status)));
    const canRe = NG.may('trip.plan') && o.status === 'giao_that_bai';
    el.innerHTML = '<div class="crumb"><a href="#/van-don">Vận đơn</a> / ' + esc(o.id) + '</div><div class="page-h"><div><h1>Vận đơn ' + esc(o.id) + ' ' + NG.badge(o.status) + '</h1><p>' + esc(c.name) + ' · tạo ' + NG.fmtDT(o.createdAt) + ' bởi ' + esc(NG.who(o.createdBy)) + '</p></div><div class="row">' +
      (canEdit ? '<a class="btn ghost" href="#/van-don/' + o.id + '/sua">Sửa</a>' : '') + (canCancel ? '<button class="btn ghost" id="cancel" style="color:var(--bad)">Hủy vận đơn</button>' : '') +
      (canRe ? (o.attempts < NG.MAX_ATTEMPTS ? '<button class="btn primary" id="re">Xếp lại để giao lần ' + (o.attempts + 1) + '</button>' : '') + '<button class="btn ghost" id="ret">Hoàn trả hàng cho khách</button>' : '') + '</div></div>' +
      (o.status === 'giao_that_bai' ? '<div class="alert bad" style="margin-bottom:14px">Giao thất bại lần ' + o.attempts + ': ' + esc((drop.slice(-1)[0] || {}).failReason || '') + '. ' + (o.attempts < NG.MAX_ATTEMPTS ? 'Điều phối cần xếp lại vào chuyến khác; CSKH thông báo và hẹn lại với người nhận.' : 'Đã giao tối đa ' + NG.MAX_ATTEMPTS + ' lần, chuyển sang hoàn trả hàng.') + '</div>' : '') +
      (o.status === 'da_huy' ? '' : '<section class="card" style="margin-bottom:16px">' + steps(o) + '</section>') +
      '<div class="grid g-main"><div class="stack"><section class="card"><div class="card-h"><h2>Lấy hàng và giao hàng</h2></div><div class="card-b grid g2">' +
      '<div><div class="mut sm" style="font-weight:700;margin-bottom:6px">ĐIỂM LẤY HÀNG</div><b>' + esc(o.pickupAddr) + '</b><p class="sm" style="margin-top:4px">' + esc(o.pickupContact) + ' · ' + esc(o.pickupPhone) + '</p><p class="sm mut">Khung giờ ' + NG.fmtDT(o.pickupFrom) + ' – ' + NG.hhmm(o.pickupTo) + '</p></div>' +
      '<div><div class="mut sm" style="font-weight:700;margin-bottom:6px">ĐIỂM GIAO HÀNG</div><b>' + esc(o.dropAddr) + '</b><p class="sm" style="margin-top:4px">' + esc(o.receiver) + ' · ' + esc(o.receiverPhone) + '</p><p class="sm mut">Hạn giao ' + NG.fmtDT(o.deliverBy) + ' · khoảng ' + o.km + ' km</p></div></div></section>' +
      '<section class="card"><div class="card-h"><h2>Xác nhận giao nhận</h2></div><div class="card-b">' + (drop.length ? drop.map((s) => pod(s, trips.find((x) => x.stops.includes(s)))).join('<hr class="sep">') : '<p class="mut">Chưa có thông tin giao nhận. Tài xế sẽ chụp ảnh và lấy chữ ký người nhận khi giao.</p>') + '</div></section>' +
      '<section class="card"><div class="card-h"><h2>Lịch sử xử lý</h2></div><div class="card-b"><ul class="timeline">' + o.history.slice().reverse().map((h) => '<li><b>' + esc(h.note) + '</b><div class="t">' + NG.fmtDT(h.at) + ' · ' + esc(NG.who(h.by)) + '</div></li>').join('') + '</ul></div></section></div>' +
      '<div class="stack"><section class="card"><div class="card-h"><h2>Hàng hóa</h2></div><div class="card-b"><dl class="kv"><dt>Tên hàng</dt><dd>' + esc(o.goods) + '</dd><dt>Số lượng</dt><dd>' + o.qty + ' ' + esc(o.unit) + '</dd><dt>Khối lượng</dt><dd>' + NG.kg(o.weight) + '</dd><dt>Yêu cầu</dt><dd>' + (o.cold ? 'Giữ lạnh, xe đông lạnh' : 'Thông thường') + '</dd>' + (NG.seePrice() ? '<dt>Cước vận chuyển</dt><dd>' + NG.money(o.price) + '</dd>' : '') + (o.note ? '<dt>Ghi chú</dt><dd>' + esc(o.note) + '</dd>' : '') + '</dl></div></section>' +
      '<section class="card"><div class="card-h"><h2>Chuyến xe</h2></div><div class="card-b">' + (trips.length ? trips.map((x) => '<div style="margin-bottom:10px"><a class="code" href="#/' + (NG.can('chuyen-xe') ? 'chuyen-xe/' + x.id : 'giam-sat') + '">' + x.id + '</a> ' + NG.tbadge(x.status) + '<p class="sm" style="margin-top:4px">' + esc(NG.vehicle(x.vehicleId).plate) + ' · ' + esc(NG.driver(x.driverId).name) + ' · ' + esc(NG.driver(x.driverId).phone) + '</p><p class="sm mut">Xuất bến ' + NG.fmtDT(x.planStart) + '</p></div>').join('') : '<p class="mut">Chưa được xếp vào chuyến nào.</p>' + (NG.may('trip.plan') && o.status === 'cho_xep_chuyen' ? '<a class="btn sm primary" style="margin-top:10px" href="#/lap-chuyen?ngay=' + o.pickupFrom.slice(0, 10) + '">Đến màn hình lập chuyến</a>' : '')) + '</div></section></div></div>';
    if ($('#cancel')) $('#cancel').onclick = () => NG.reasonModal('Hủy vận đơn ' + o.id, 'Lý do hủy', (why) => {
      if (t) { t.stops = t.stops.filter((s) => s.orderId !== o.id); t.history.push({ status: t.status, at: NG.now(), by: NG.user().username, note: 'Gỡ vận đơn ' + o.id + ' do khách hủy' }); if (!t.stops.length) NG.pushHistory(t, 'da_huy', 'Hủy chuyến vì không còn vận đơn'); }
      o.tripId = null; NG.pushHistory(o, 'da_huy', 'Hủy vận đơn: ' + why); NG.log('Hủy vận đơn', o.id); NG.save(); NG.toast('Đã hủy vận đơn ' + o.id + '.'); NG.render();
    });
    if ($('#re')) $('#re').onclick = () => NG.confirm('Xếp lại vận đơn ' + o.id, 'Vận đơn trở về trạng thái Chờ xếp chuyến để điều phối đưa vào chuyến giao lần ' + (o.attempts + 1) + '. Hàng sẽ được lấy tại kho trung chuyển của công ty.', () => {
      o.tripId = null; o.note = 'Giao lại lần ' + (o.attempts + 1) + ', hàng lấy từ kho trung chuyển'; NG.pushHistory(o, 'cho_xep_chuyen', 'Xếp lại để giao lần ' + (o.attempts + 1)); NG.log('Xếp lại vận đơn', o.id); NG.save(); NG.toast('Vận đơn ' + o.id + ' đã chuyển về Chờ xếp chuyến.'); NG.render();
    }, { okText: 'Xếp lại' });
    if ($('#ret')) $('#ret').onclick = () => NG.reasonModal('Hoàn trả hàng · ' + o.id, 'Ghi chú hoàn trả', (why) => { o.tripId = null; NG.pushHistory(o, 'tra_hang', 'Hoàn trả hàng cho khách: ' + why); NG.log('Hoàn trả vận đơn', o.id); NG.save(); NG.toast('Đã chuyển vận đơn sang hoàn trả hàng.'); NG.render(); });
  }

  /* Hiển thị biên bản giao nhận điện tử của một điểm giao */
  function pod(s, t) {
    if (s.status === 'that_bai') return '<div class="alert bad">Giao thất bại lúc ' + NG.fmtDT(s.doneAt) + ' (chuyến ' + esc(t.id) + '): ' + esc(s.failReason) + '</div>';
    if (s.status !== 'xong' || !s.pod) return '<p class="mut">Tài xế đã đến điểm giao lúc ' + NG.fmtDT(s.arrivedAt) + ', đang bàn giao hàng.</p>';
    const p = s.pod;
    return '<div class="grid g2"><dl class="kv"><dt>Người nhận</dt><dd>' + esc(p.name) + '</dd><dt>Số điện thoại</dt><dd>' + esc(p.phone) + '</dd><dt>Thời điểm giao</dt><dd>' + NG.fmtDT(s.doneAt) + (NG.stopLate(s) ? ' <span class="pill red">Trễ hạn</span>' : ' <span class="pill green">Đúng hạn</span>') + '</dd><dt>Số lượng nhận</dt><dd>' + p.qty + '</dd>' + (p.note ? '<dt>Ghi chú</dt><dd>' + esc(p.note) + '</dd>' : '') + '<dt>Chuyến</dt><dd>' + esc(t.id) + '</dd></dl>' +
      '<div><div class="mut sm" style="margin-bottom:6px">Ảnh giao hàng</div><div class="proof-prev">' + p.photos.map(NG.photoBox).join('') + '</div><div class="mut sm" style="margin:10px 0 4px">Chữ ký người nhận</div><div class="sign-box">' + (p.sign ? '<img src="' + p.sign + '" alt="Chữ ký người nhận">' : NG.SIGN_SVG) + '</div></div></div>';
  }
  NG.pod = pod;

  /* Hộp thoại nhập lý do */
  NG.reasonModal = function (title, label, onOk, opt) {
    opt = opt || {};
    NG.modal(title, (opt.intro ? '<p style="margin-bottom:10px">' + opt.intro + '</p>' : '') + (opt.options ? '<div class="field"><label for="rs_o">' + label + '</label><select class="input" id="rs_o">' + opt.options.map((x) => '<option>' + esc(x) + '</option>').join('') + '</select></div><div class="field" style="margin-top:10px"><label for="rs">Mô tả thêm</label><textarea class="input" id="rs"></textarea></div>' : '<div class="field"><label for="rs">' + label + ' <span class="rq">*</span></label><textarea class="input" id="rs"></textarea></div>'), (bg) => {
      const sel = bg.querySelector('#rs_o'), txt = bg.querySelector('#rs').value.trim();
      if (!sel && !NG.validate(bg, [['rs', NG.req(label.toLowerCase())]])) return false;
      if (sel && sel.value === 'Khác' && !txt) { NG.validate(bg, [['rs', () => 'Vui lòng mô tả lý do.']]); return false; }
      return onOk(sel ? sel.value + (txt ? ': ' + txt : '') : txt, sel ? sel.value : null, txt);
    }, { danger: opt.danger !== false, okText: opt.okText || 'Xác nhận' });
  };
})();
