/* Lập chuyến, danh sách và chi tiết chuyến xe, giám sát hành trình, xử lý sự cố */
(function () {
  const NG = window.NG;
  const { esc, $, $$ } = NG;
  const SPEED = 35; // km/giờ bình quân trong đô thị và vùng ven

  /* Ước tính lộ trình: lấy hàng trước theo khung giờ, giao sau theo hạn giao */
  NG.planStops = function (orders, start) {
    let clock = NG.addHours(start, 0.5);
    const out = [];
    orders.slice().sort((a, b) => (a.pickupFrom < b.pickupFrom ? -1 : 1)).forEach((o) => { if (clock < o.pickupFrom) clock = o.pickupFrom; out.push({ orderId: o.id, kind: 'lay', addr: o.attempts ? NG.DEPOT : o.pickupAddr, eta: clock }); clock = NG.addHours(clock, 0.4); });
    orders.slice().sort((a, b) => (a.deliverBy < b.deliverBy ? -1 : 1)).forEach((o) => { clock = NG.addHours(clock, o.km / SPEED * 0.7 + 0.3); out.push({ orderId: o.id, kind: 'giao', addr: o.dropAddr, eta: clock }); });
    const km = Math.round(orders.reduce((a, o) => a + o.km, 0) * 0.75 + 12);
    return { stops: out, end: NG.addHours(clock, 0.6), km };
  };
  /* Ước tính lại giờ đến cho các điểm theo thứ tự hiện có của chuyến */
  NG.etas = function (t) {
    let clock = NG.addHours(t.planStart, 0.5);
    return t.stops.map((s) => {
      const o = NG.order(s.orderId) || { km: 20, pickupFrom: clock };
      if (s.kind === 'lay') { if (clock < o.pickupFrom) clock = o.pickupFrom; const e = clock; clock = NG.addHours(clock, 0.4); return e; }
      clock = NG.addHours(clock, o.km / SPEED * 0.7 + 0.3); return clock;
    });
  };

  /* Kiểm tra ràng buộc khi lập hoặc đổi phân công chuyến */
  NG.checkPlan = function (orders, vehicleId, driverId, start, exceptTrip) {
    const err = [], warn = [];
    const v = NG.db().vehicles.find((x) => x.id === vehicleId), dr = NG.db().drivers.find((x) => x.id === driverId);
    const p = NG.planStops(orders, start || NG.now());
    const w = orders.reduce((a, o) => a + o.weight, 0);
    if (!orders.length) err.push('Chưa chọn vận đơn nào.');
    if (!v) err.push('Chưa chọn phương tiện.');
    if (!dr) err.push('Chưa chọn tài xế.');
    if (!start) err.push('Chưa nhập giờ xuất bến.');
    if (v) {
      if (v.status !== 'san_sang') err.push('Xe ' + v.plate + ' đang ' + NG.ST.vehicle[v.status].label.toLowerCase() + '.');
      if (w > v.load * 1000) err.push('Tổng khối lượng ' + NG.kg(w) + ' vượt tải trọng xe ' + NG.kg(v.load * 1000) + '.');
      if (orders.some((o) => o.cold) && v.type !== 'Xe đông lạnh') err.push('Có hàng cần giữ lạnh, phải dùng xe đông lạnh.');
      if (start) NG.busy('vehicleId', v.id, start, p.end, exceptTrip).forEach((t) => err.push('Xe ' + v.plate + ' trùng lịch với chuyến ' + t.id + ' (' + NG.hhmm(t.planStart) + '–' + NG.hhmm(t.planEnd) + ').'));
    }
    if (dr) {
      if (dr.status !== 'dang_lam') err.push('Tài xế ' + dr.name + ' đang nghỉ phép.');
      if (v && !NG.licenseOk(dr, v)) err.push('Tài xế ' + dr.name + ' có bằng ' + dr.license + ', không được lái xe trên 3,5 tấn.');
      if (dr.licenseExp < (start || NG.now()).slice(0, 10)) err.push('Bằng lái của tài xế ' + dr.name + ' đã hết hạn.');
      if (start) NG.busy('driverId', dr.id, start, p.end, exceptTrip).forEach((t) => err.push('Tài xế ' + dr.name + ' trùng lịch với chuyến ' + t.id + ' (' + NG.hhmm(t.planStart) + '–' + NG.hhmm(t.planEnd) + ').'));
    }
    if (start && start < NG.addHours(NG.now(), -0.25) && !exceptTrip) err.push('Giờ xuất bến đã qua.');
    p.stops.forEach((s) => { const o = orders.find((x) => x.id === s.orderId); if (s.kind === 'giao' && s.eta > o.deliverBy) warn.push('Vận đơn ' + o.id + ' dự kiến giao ' + NG.hhmm(s.eta) + ', trễ hơn hạn ' + NG.hhmm(o.deliverBy) + '.'); });
    if (v && w && w < v.load * 1000 * 0.4) warn.push('Hệ số sử dụng tải trọng chỉ ' + Math.round(w / v.load / 10) + '%, nên gom thêm vận đơn hoặc chọn xe nhỏ hơn.');
    return { err, warn, plan: p, weight: w, pct: v ? Math.round(w / v.load / 10) : 0 };
  };

  /* ================= LẬP CHUYẾN ================= */
  NG.V['lap-chuyen'] = function (el, r) {
    const d = NG.db();
    const date = r.q.get('ngay') || NG.today();
    const sel = new Set((r.q.get('chon') || '').split(',').filter(Boolean));
    const pool = d.orders.filter((o) => o.status === 'cho_xep_chuyen' && o.pickupFrom.slice(0, 10) === date).sort((a, b) => (a.pickupFrom < b.pickupFrom ? -1 : 1));
    const later = d.orders.filter((o) => o.status === 'cho_xep_chuyen' && o.pickupFrom.slice(0, 10) !== date).length;
    const failed = d.orders.filter((o) => o.status === 'giao_that_bai');
    const dayTrips = d.trips.filter((t) => t.date === date && t.status !== 'da_huy');
    const canPlan = NG.may('trip.plan');
    const defStart = (date === NG.today() ? NG.addHours(NG.now(), 1).slice(0, 14) + '00' : date + 'T07:30');
    el.innerHTML = '<div class="page-h"><div><h1>Lập chuyến xe</h1><p>Gom vận đơn có cùng ngày lấy hàng thành chuyến, chọn xe phù hợp tải trọng và tài xế không trùng lịch</p></div><div class="row"><label class="sm mut" for="day">Ngày lấy hàng</label><input class="input" type="date" id="day" value="' + date + '" style="width:auto"></div></div>' +
      (failed.length ? '<div class="alert bad" style="margin-bottom:14px">' + failed.length + ' vận đơn giao thất bại đang chờ xếp lại: ' + failed.map((o) => '<a href="#/van-don/' + o.id + '">' + o.id + '</a>').join(', ') + '. Mở vận đơn và chọn «Xếp lại» để đưa vào danh sách bên dưới.</div>' : '') +
      '<div class="grid g-plan"><section class="card"><div class="card-h"><h2>Vận đơn chờ xếp chuyến <span class="pill">' + pool.length + '</span></h2><span class="mut sm">' + (later ? later + ' vận đơn ở ngày khác' : '') + '</span></div>' +
      (pool.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th></th><th>Vận đơn</th><th>Lấy hàng</th><th>Giao đến · hạn</th><th class="num">Khối lượng</th></tr></thead><tbody>' +
        pool.map((o) => '<tr><td><input type="checkbox" class="pk" value="' + o.id + '"' + (sel.has(o.id) ? ' checked' : '') + (canPlan ? '' : ' disabled') + ' aria-label="Chọn ' + o.id + '"></td><td><a class="code" href="#/van-don/' + o.id + '">' + o.id + '</a><div class="mut sm">' + esc(NG.customer(o.customerId).short) + '</div></td><td class="nowrap">' + NG.hhmm(o.pickupFrom) + '–' + NG.hhmm(o.pickupTo) + '<div class="mut sm">' + esc((o.attempts ? 'Kho trung chuyển' : o.pickupAddr).split(',')[0]) + '</div></td><td>' + esc(o.dropAddr.split(',').slice(0, 2).join(',')) + '<div class="mut sm">Hạn ' + NG.hhmm(o.deliverBy) + ' · ' + o.km + ' km</div></td><td class="num">' + NG.kg(o.weight) + (o.cold ? '<div><span class="pill" style="background:var(--info-soft);color:var(--info)">Giữ lạnh</span></div>' : '') + (o.attempts ? '<div><span class="pill red">Giao lại</span></div>' : '') + '</td></tr>').join('') + '</tbody></table></div>'
        : '<p class="mut" style="padding:18px">Không có vận đơn nào chờ xếp chuyến trong ngày ' + NG.fmtD(date) + '.</p>') + '</section>' +
      '<section class="card"><div class="card-h"><h2>Thông tin chuyến</h2></div><div class="card-b form" id="pf">' +
      '<div class="field"><label for="veh">Phương tiện</label><select class="input" id="veh"><option value="">— Chọn xe —</option>' + d.vehicles.map((v) => '<option value="' + v.id + '"' + (v.status !== 'san_sang' ? ' disabled' : '') + '>' + esc(v.plate) + ' · ' + esc(v.type) + ' ' + String(v.load).replace('.', ',') + ' tấn' + (v.status !== 'san_sang' ? ' (' + NG.ST.vehicle[v.status].label + ')' : '') + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="drv">Tài xế</label><select class="input" id="drv"><option value="">— Chọn tài xế —</option>' + d.drivers.map((x) => '<option value="' + x.id + '"' + (x.status !== 'dang_lam' ? ' disabled' : '') + '>' + esc(x.name) + ' · bằng ' + x.license + (x.status !== 'dang_lam' ? ' (Nghỉ phép)' : '') + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="start">Giờ xuất bến</label><input class="input" type="datetime-local" id="start" value="' + defStart + '"></div>' +
      '<div id="chk"></div>' + (canPlan ? '<div class="row"><button class="btn ghost" id="mk0">Lưu kế hoạch</button><button class="btn primary" id="mk1">Tạo và giao tài xế</button></div>' : '<p class="mut sm">Bạn chỉ có quyền xem.</p>') + '</div></section></div>' +
      '<section class="card" style="margin-top:16px"><div class="card-h"><h2>Lịch chạy xe ngày ' + NG.fmtD(date) + '</h2><span class="mut sm">' + dayTrips.length + ' chuyến</span></div><div class="card-b">' + NG.gantt(date) + '</div></section>';
    $('#day').onchange = () => NG.go('#/lap-chuyen?ngay=' + $('#day').value);
    const chosen = () => $$('.pk:checked').map((x) => NG.order(x.value));
    const check = () => {
      const os = chosen();
      if (!os.length) { $('#chk').innerHTML = '<p class="mut sm">Chọn vận đơn ở bảng bên trái để xem tải trọng, lộ trình dự kiến và kiểm tra ràng buộc.</p>'; return null; }
      const c = NG.checkPlan(os, $('#veh').value, $('#drv').value, $('#start').value);
      const v = NG.vehicle($('#veh').value);
      $('#chk').innerHTML = '<div class="cap"><div class="row" style="justify-content:space-between"><span class="sm"><b>' + os.length + '</b> vận đơn · <b>' + NG.kg(c.weight) + '</b>' + (v.load ? ' / ' + NG.kg(v.load * 1000) : '') + '</span><b class="sm">' + (v.load ? c.pct + '%' : '') + '</b></div><div class="prog"><i style="width:' + Math.min(100, c.pct) + '%;background:' + (c.pct > 100 ? 'var(--bad)' : c.pct < 40 ? 'var(--warn)' : 'var(--ok)') + '"></i></div>' +
        '<p class="sm mut" style="margin-top:6px">Quãng đường dự kiến ' + c.plan.km + ' km · về bãi khoảng ' + NG.hhmm(c.plan.end) + '</p></div>' +
        '<ol class="plan-stops">' + c.plan.stops.map((s) => '<li class="' + s.kind + '"><b>' + NG.hhmm(s.eta) + '</b> ' + (s.kind === 'lay' ? 'Lấy' : 'Giao') + ' ' + s.orderId.slice(-4) + ' · ' + esc(s.addr.split(',')[0]) + '</li>').join('') + '</ol>' +
        c.err.map((x) => '<div class="alert bad sm" style="margin-top:6px">' + esc(x) + '</div>').join('') + c.warn.map((x) => '<div class="alert warn sm" style="margin-top:6px">' + esc(x) + '</div>').join('');
      return c;
    };
    ['veh', 'drv', 'start'].forEach((i) => $('#' + i).addEventListener('input', check));
    $$('.pk').forEach((x) => x.addEventListener('change', check));
    check();
    const make = (send) => {
      const os = chosen(); const c = check();
      if (!c) { NG.toast('Vui lòng chọn ít nhất một vận đơn.', 'bad'); return; }
      if (c.err.length) { NG.toast('Chưa thể tạo chuyến: ' + c.err[0], 'bad'); return; }
      const go = () => {
        const start = $('#start').value;
        const id = 'CX' + date.slice(2, 4) + date.slice(5, 7) + '-' + String(++d.seq.trip).padStart(3, '0');
        const u = NG.user().username;
        const t = { id, date, vehicleId: $('#veh').value, driverId: $('#drv').value, planStart: start, planEnd: c.plan.end, planKm: c.plan.km, status: 'ke_hoach', createdBy: u, createdAt: NG.now(), stops: c.plan.stops.map((s) => ({ id: id + (s.kind === 'lay' ? '-L' : '-G') + s.orderId.slice(-4), orderId: s.orderId, kind: s.kind, addr: s.addr, status: 'cho', arrivedAt: null, doneAt: null, pod: null, failReason: '' })), startOdo: null, endOdo: null, costs: [], incidents: [], recon: null, acceptedAt: null, note: '', history: [{ status: 'ke_hoach', at: NG.now(), by: u, note: 'Lập chuyến gồm ' + os.length + ' vận đơn' }] };
        os.forEach((o) => { o.tripId = id; NG.pushHistory(o, 'da_xep_chuyen', 'Xếp vào chuyến ' + id); });
        if (send) NG.pushHistory(t, 'da_phan_cong', 'Giao chuyến cho tài xế ' + NG.driver(t.driverId).name + ', xe ' + NG.vehicle(t.vehicleId).plate);
        d.trips.push(t); NG.log('Lập chuyến', id); NG.save();
        NG.toast('Đã tạo chuyến ' + id + (send ? ' và gửi đến ứng dụng tài xế.' : ' ở trạng thái kế hoạch.'));
        NG.go('#/chuyen-xe/' + id);
      };
      if (c.warn.length) NG.confirm('Xác nhận lập chuyến', 'Chuyến có ' + c.warn.length + ' cảnh báo:<ul>' + c.warn.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>Bạn vẫn muốn tạo chuyến?', go, { okText: 'Vẫn tạo chuyến' }); else go();
    };
    if ($('#mk0')) { $('#mk0').onclick = () => make(false); $('#mk1').onclick = () => make(true); }
  };

  /* ================= DANH SÁCH CHUYẾN ================= */
  NG.V['chuyen-xe'] = function (el, r) {
    if (r.parts[1]) return detail(el, NG.trip(r.parts[1]), r);
    const d = NG.db();
    el.innerHTML = '<div class="page-h"><div><h1>Chuyến xe</h1><p>Mỗi chuyến gồm một xe, một tài xế và nhiều điểm lấy, giao hàng</p></div><div class="row"><button class="btn ghost" id="xls">Xuất Excel</button>' + (NG.may('trip.plan') ? '<a class="btn primary" href="#/lap-chuyen">+ Lập chuyến</a>' : '') + '</div></div>' +
      '<section class="card"><div class="filters"><input class="input search" id="q" placeholder="Tìm mã chuyến, biển số, tài xế, mã vận đơn…" aria-label="Tìm kiếm"><select class="input" id="st" aria-label="Trạng thái"><option value="">Tất cả trạng thái</option>' + Object.entries(NG.ST.trip).map(([k, v]) => '<option value="' + k + '">' + v.label + '</option>').join('') + '</select>' +
      '<select class="input" id="vh" aria-label="Phương tiện"><option value="">Tất cả xe</option>' + d.vehicles.map((v) => '<option value="' + v.id + '">' + v.plate + '</option>').join('') + '</select><input class="input" type="date" id="dd" aria-label="Ngày"></div><div id="tb"></div></section>';
    if (r.q.get('st')) $('#st').value = r.q.get('st');
    const rows = () => { const q = $('#q').value.trim().toLowerCase(), st = $('#st').value, vh = $('#vh').value, dd = $('#dd').value; return d.trips.filter((t) => (!st || t.status === st) && (!vh || t.vehicleId === vh) && (!dd || t.date === dd) && (!q || [t.id, NG.vehicle(t.vehicleId).plate, NG.driver(t.driverId).name, t.stops.map((s) => s.orderId).join(' ')].join(' ').toLowerCase().includes(q))); };
    const tb = NG.table($('#tb'), {
      rows, sort: 'planStart', dir: -1, size: 12,
      cols: [
        { key: 'id', label: 'Mã chuyến', html: (t) => '<a class="code" href="#/chuyen-xe/' + t.id + '">' + t.id + '</a>' },
        { key: 'planStart', label: 'Xuất bến', html: (t) => '<span class="nowrap">' + NG.fmtDT(t.planStart) + '</span>' },
        { key: 'vehicleId', label: 'Xe', html: (t) => esc(NG.vehicle(t.vehicleId).plate) + '<div class="mut sm">' + String(NG.vehicle(t.vehicleId).load).replace('.', ',') + ' tấn</div>' },
        { key: 'driverId', label: 'Tài xế', html: (t) => esc(NG.driver(t.driverId).name), sortVal: (t) => NG.driver(t.driverId).name },
        { key: 'n', label: 'Vận đơn', num: true, html: (t) => NG.tripOrders(t).length, sortVal: (t) => NG.tripOrders(t).length },
        { key: 'load', label: 'Tải', num: true, html: (t) => NG.tripLoadPct(t) + '%', sortVal: NG.tripLoadPct },
        { key: 'prog', label: 'Điểm dừng', sortable: false, html: (t) => { const p = NG.tripProgress(t); return p.d + '/' + p.n + (t.stops.some((s) => s.status === 'that_bai') ? ' <span class="pill red">Có thất bại</span>' : ''); } },
        { key: 'status', label: 'Trạng thái', html: (t) => NG.tbadge(t.status) + (t.recon && t.recon.status === 'tra_lai' && t.status === 'hoan_thanh' ? '<div class="mut sm">Kế toán trả lại</div>' : '') }
      ]
    });
    ['q', 'st', 'vh', 'dd'].forEach((i) => $('#' + i).addEventListener('input', tb.redraw));
    $('#xls').onclick = () => NG.download('chuyen-xe.csv', [['Mã chuyến', 'Ngày', 'Xuất bến', 'Biển số', 'Tài xế', 'Số vận đơn', 'Khối lượng (kg)', 'Tải (%)', 'Km', 'Chi phí', 'Trạng thái']].concat(rows().map((t) => [t.id, NG.fmtD(t.date), NG.fmtDT(t.planStart), NG.vehicle(t.vehicleId).plate, NG.driver(t.driverId).name, NG.tripOrders(t).length, NG.tripWeight(t), NG.tripLoadPct(t), NG.tripKm(t), NG.tripCost(t), NG.ST.trip[t.status].label])));
  };

  function tripSteps(t) {
    const idx = NG.ST.trip[t.status].step;
    return '<div class="stepper s6">' + NG.TRIP_STEPS.map((s, i) => '<div class="step' + (i < idx || (i === idx && i === 5) ? ' done' : i === idx ? ' cur' : '') + '"><div class="c">' + (i < idx || (i === 5 && idx === 5) ? '✓' : i + 1) + '</div>' + s + '</div>').join('') + '</div>';
  }

  /* ================= CHI TIẾT CHUYẾN ================= */
  function detail(el, t, r) {
    if (!t) { el.innerHTML = '<p>Không tìm thấy chuyến xe.</p>'; return; }
    const v = NG.vehicle(t.vehicleId), dr = NG.driver(t.driverId);
    const tab = r.q.get('tab') || 'lo-trinh';
    const plan = NG.may('trip.plan');
    const notStarted = ['ke_hoach', 'da_phan_cong', 'da_nhan'].includes(t.status);
    const etas = NG.etas(t);
    const acts = [];
    if (plan && t.status === 'ke_hoach') acts.push('<button class="btn primary" data-a="send">Giao tài xế</button>');
    if (plan && notStarted) acts.push('<button class="btn ghost" data-a="assign">Đổi xe, tài xế, giờ</button>', '<button class="btn ghost" data-a="cancel" style="color:var(--bad)">Hủy chuyến</button>');
    if (NG.may('incident.handle') && t.status === 'dang_chay') acts.push('<button class="btn ghost" data-a="inc">Ghi nhận sự cố</button>');
    if (NG.may('recon') && t.status === 'hoan_thanh' && !t.recon) acts.push('<a class="btn primary" href="#/doi-soat/' + t.id + '">Đối soát chuyến</a>');
    const openInc = t.incidents.filter((i) => i.status !== 'da_xu_ly').length;
    const tabs = [['lo-trinh', 'Lộ trình, điểm dừng', t.stops.length], ['giao-nhan', 'Xác nhận giao nhận', t.stops.filter((s) => s.kind === 'giao' && s.status !== 'cho').length], ['su-co', 'Sự cố', t.incidents.length], ['chi-phi', 'Quãng đường, chi phí', t.costs.length], ['lich-su', 'Lịch sử', t.history.length]];
    el.innerHTML = '<div class="crumb"><a href="#/chuyen-xe">Chuyến xe</a> / ' + esc(t.id) + '</div><div class="page-h"><div><h1>Chuyến ' + esc(t.id) + ' ' + NG.tbadge(t.status) + '</h1><p>Ngày ' + NG.fmtD(t.date) + ' · xuất bến ' + NG.hhmm(t.planStart) + ' · lập bởi ' + esc(NG.who(t.createdBy)) + '</p></div><div class="row">' + acts.join('') + '</div></div>' +
      (t.rejected && t.status === 'da_phan_cong' ? '<div class="alert bad" style="margin-bottom:14px">Tài xế đã từ chối chuyến: ' + esc(t.rejected) + '. Vui lòng đổi tài xế khác.</div>' : '') +
      (openInc ? '<div class="alert warn" style="margin-bottom:14px">Chuyến có ' + openInc + ' sự cố chưa xử lý xong. <a href="#/chuyen-xe/' + t.id + '?tab=su-co">Xem sự cố</a></div>' : '') +
      (t.status === 'da_huy' ? '' : '<section class="card" style="margin-bottom:16px">' + tripSteps(t) + '</section>') +
      '<div class="kpis k5">' + [['Phương tiện', esc(v.plate), esc(v.type) + ' · ' + String(v.load).replace('.', ',') + ' tấn'], ['Tài xế', esc(dr.name.split(' ').slice(-2).join(' ')), 'Bằng ' + dr.license + ' · ' + esc(dr.phone)], ['Hàng trên xe', NG.kg(NG.tripWeight(t)), NG.tripOrders(t).length + ' vận đơn · tải ' + NG.tripLoadPct(t) + '%'], ['Quãng đường', NG.num(NG.tripKm(t)) + ' km', t.endOdo ? 'Theo đồng hồ km' : 'Kế hoạch'], ['Tiến độ', NG.tripProgress(t).d + '/' + NG.tripProgress(t).n, 'điểm dừng đã xong']].map((k) => '<div class="kpi"><div class="k-l">' + k[0] + '</div><div class="k-v sm2">' + k[1] + '</div><div class="k-s">' + k[2] + '</div></div>').join('') + '</div>' +
      '<section class="card"><div class="tabs">' + tabs.map((x) => '<button data-t="' + x[0] + '"' + (x[0] === tab ? ' class="on"' : '') + '>' + x[1] + '<span class="cnt">' + x[2] + '</span></button>').join('') + '</div><div id="tbody"></div></section>';
    $$('[data-t]').forEach((b) => b.onclick = () => NG.go('#/chuyen-xe/' + t.id + '?tab=' + b.dataset.t));
    const body = $('#tbody');
    if (tab === 'lo-trinh') {
      const canSort = plan && notStarted;
      body.innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Loại</th><th>Địa điểm</th><th>Vận đơn</th><th>Dự kiến</th><th>Thực tế</th><th>Trạng thái</th>' + (canSort ? '<th></th>' : '') + '</tr></thead><tbody>' +
        t.stops.map((s, i) => { const o = NG.order(s.orderId) || {}; return '<tr><td>' + (i + 1) + '</td><td>' + (s.kind === 'lay' ? '<span class="pill">Lấy hàng</span>' : '<span class="pill" style="background:var(--brand-soft);color:var(--brand)">Giao hàng</span>') + '</td><td>' + esc(s.addr) + (s.kind === 'giao' ? '<div class="mut sm">' + esc(o.receiver) + ' · ' + esc(o.receiverPhone) + '</div>' : '') + '</td><td><a class="code" href="#/van-don/' + s.orderId + '">' + s.orderId + '</a><div class="mut sm">' + NG.kg(o.weight || 0) + '</div></td><td class="nowrap">' + NG.hhmm(etas[i]) + (s.kind === 'giao' ? '<div class="mut sm">Hạn ' + NG.hhmm(o.deliverBy) + '</div>' : '') + '</td><td class="nowrap">' + (s.arrivedAt ? 'Đến ' + NG.hhmm(s.arrivedAt) : '—') + (s.doneAt ? '<div class="mut sm">Xong ' + NG.hhmm(s.doneAt) + '</div>' : '') + '</td><td>' + NG.badge(s.status, NG.ST.stop) + (NG.stopLate(s) ? ' <span class="pill red">Trễ</span>' : '') + (s.failReason ? '<div class="mut sm">' + esc(s.failReason) + '</div>' : '') + '</td>' +
          (canSort ? '<td class="nowrap"><button class="btn sm ghost" data-up="' + i + '"' + (i === 0 ? ' disabled' : '') + ' aria-label="Lên">▲</button> <button class="btn sm ghost" data-dn="' + i + '"' + (i === t.stops.length - 1 ? ' disabled' : '') + ' aria-label="Xuống">▼</button></td>' : '') + '</tr>'; }).join('') + '</tbody></table></div>' +
        (canSort ? '<p class="hint" style="padding:10px 16px">Điểm giao của một vận đơn phải nằm sau điểm lấy hàng của chính vận đơn đó.</p>' : '');
      const move = (i, dlt) => {
        const a = t.stops.slice(); const j = i + dlt; [a[i], a[j]] = [a[j], a[i]];
        const bad = a.some((s, k) => s.kind === 'giao' && a.findIndex((x) => x.orderId === s.orderId && x.kind === 'lay') > k);
        if (bad) { NG.toast('Không thể giao trước khi lấy hàng của cùng vận đơn.', 'bad'); return; }
        t.stops = a; const e = NG.etas(t); t.planEnd = NG.addHours(e[e.length - 1], 0.6);
        t.history.push({ status: t.status, at: NG.now(), by: NG.user().username, note: 'Đổi thứ tự điểm dừng' }); NG.save(); NG.render();
      };
      $$('[data-up]', body).forEach((b) => b.onclick = () => move(+b.dataset.up, -1));
      $$('[data-dn]', body).forEach((b) => b.onclick = () => move(+b.dataset.dn, 1));
    }
    if (tab === 'giao-nhan') {
      const ss = t.stops.filter((s) => s.kind === 'giao' && s.status !== 'cho');
      body.innerHTML = '<div class="card-b">' + (ss.length ? ss.map((s) => '<h3 style="margin-bottom:8px"><a class="code" href="#/van-don/' + s.orderId + '">' + s.orderId + '</a> · ' + esc(s.addr.split(',')[0]) + '</h3>' + NG.pod(s, t)).join('<hr class="sep">') : '<p class="mut">Chưa có điểm giao nào hoàn tất.</p>') + '</div>';
    }
    if (tab === 'su-co') {
      body.innerHTML = t.incidents.length ? t.incidents.slice().reverse().map((i) => incCard(t, i)).join('') : '<p class="mut" style="padding:18px">Chuyến không phát sinh sự cố.</p>';
      $$('[data-h]', body).forEach((b) => b.onclick = () => NG.handleIncident(t, t.incidents.find((x) => x.id === b.dataset.h)));
    }
    if (tab === 'chi-phi') body.innerHTML = '<div class="card-b">' + NG.costPanel(t) + '</div>';
    if (tab === 'lich-su') body.innerHTML = '<div class="card-b"><ul class="timeline">' + t.history.slice().reverse().map((h) => '<li><b>' + esc(h.note) + '</b><div class="t">' + NG.fmtDT(h.at) + ' · ' + esc(NG.who(h.by)) + '</div></li>').join('') + '</ul></div>';

    $$('[data-a]').forEach((b) => b.onclick = () => {
      const a = b.dataset.a;
      if (a === 'send') { const c = NG.checkPlan(NG.tripOrders(t), t.vehicleId, t.driverId, t.planStart, t.id); if (c.err.length) { NG.toast(c.err[0], 'bad'); return; } NG.pushHistory(t, 'da_phan_cong', 'Giao chuyến cho tài xế ' + dr.name + ', xe ' + v.plate); NG.log('Giao chuyến cho tài xế', t.id); NG.save(); NG.toast('Đã gửi chuyến đến ứng dụng tài xế ' + dr.name + '.'); NG.render(); }
      if (a === 'assign') NG.assignModal(t);
      if (a === 'cancel') NG.reasonModal('Hủy chuyến ' + t.id, 'Lý do hủy', (why) => { NG.tripOrders(t).forEach((o) => { if (o.status === 'da_xep_chuyen') { o.tripId = null; NG.pushHistory(o, 'cho_xep_chuyen', 'Chuyến ' + t.id + ' bị hủy, chờ xếp chuyến khác'); } }); NG.pushHistory(t, 'da_huy', 'Hủy chuyến: ' + why); NG.log('Hủy chuyến', t.id); NG.save(); NG.toast('Đã hủy chuyến, các vận đơn trở về Chờ xếp chuyến.'); NG.render(); });
      if (a === 'inc') NG.incidentModal(t, NG.user().username);
    });
  }

  /* Đổi xe, tài xế hoặc giờ xuất bến */
  NG.assignModal = function (t) {
    const d = NG.db();
    NG.modal('Đổi phân công chuyến ' + t.id, '<div class="form"><div class="field"><label for="a_v">Phương tiện</label><select class="input" id="a_v">' + d.vehicles.map((v) => '<option value="' + v.id + '"' + (v.id === t.vehicleId ? ' selected' : '') + (v.status !== 'san_sang' ? ' disabled' : '') + '>' + esc(v.plate) + ' · ' + esc(v.type) + ' ' + String(v.load).replace('.', ',') + ' tấn</option>').join('') + '</select></div>' +
      '<div class="field"><label for="a_d">Tài xế</label><select class="input" id="a_d">' + d.drivers.map((x) => '<option value="' + x.id + '"' + (x.id === t.driverId ? ' selected' : '') + (x.status !== 'dang_lam' ? ' disabled' : '') + '>' + esc(x.name) + ' · bằng ' + x.license + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="a_s">Giờ xuất bến</label><input class="input" type="datetime-local" id="a_s" value="' + t.planStart + '"></div><div id="a_c"></div></div>', (bg) => {
      const c = NG.checkPlan(NG.tripOrders(t), bg.querySelector('#a_v').value, bg.querySelector('#a_d').value, bg.querySelector('#a_s').value, t.id);
      if (c.err.length) { bg.querySelector('#a_c').innerHTML = c.err.map((x) => '<div class="alert bad sm" style="margin-top:6px">' + esc(x) + '</div>').join(''); return false; }
      const changedDriver = bg.querySelector('#a_d').value !== t.driverId;
      t.vehicleId = bg.querySelector('#a_v').value; t.driverId = bg.querySelector('#a_d').value; t.planStart = bg.querySelector('#a_s').value; t.planEnd = c.plan.end;
      const note = 'Đổi phân công: xe ' + NG.vehicle(t.vehicleId).plate + ', tài xế ' + NG.driver(t.driverId).name + ', xuất bến ' + NG.fmtDT(t.planStart);
      if (t.status !== 'ke_hoach' && (changedDriver || t.rejected)) { t.rejected = null; t.acceptedAt = null; NG.pushHistory(t, 'da_phan_cong', note + ' (gửi lại cho tài xế)'); } else t.history.push({ status: t.status, at: NG.now(), by: NG.user().username, note });
      NG.log('Đổi phân công chuyến', t.id); NG.save(); NG.toast('Đã cập nhật phân công chuyến ' + t.id + '.'); NG.render();
    }, { okText: 'Lưu' });
  };

  /* Thẻ sự cố */
  function incCard(t, i) {
    return '<div class="act"><span class="ai ' + (i.status === 'da_xu_ly' ? 'ok' : 'late') + '">' + NG.icon(i.status === 'da_xu_ly' ? 'check' : 'warn', 18) + '</span><div class="ab"><b>' + esc(i.type) + '</b> ' + NG.badge(i.status, NG.ST.incident) + ' <span class="mut sm">' + esc(i.id) + ' · chuyến ' + (NG.can('chuyen-xe') ? '<a href="#/chuyen-xe/' + t.id + '?tab=su-co">' + t.id + '</a>' : t.id) + '</span><small>' + NG.fmtDT(i.at) + ' · báo bởi ' + esc(NG.who(i.by)) + '</small><p>' + esc(i.desc) + '</p>' +
      (i.photo ? '<div class="proof-prev" style="margin-top:6px">' + NG.photoBox(i.photo) + '</div>' : '') +
      (i.result ? '<p style="margin-top:6px"><b>Hướng xử lý:</b> ' + esc(i.result) + ' <span class="mut sm">(' + esc(NG.who(i.handledBy)) + ' · ' + NG.fmtDT(i.handledAt) + ')</span></p>' : '') + '</div>' +
      (NG.may('incident.handle') && i.status !== 'da_xu_ly' ? '<button class="btn sm primary" data-h="' + i.id + '">Xử lý</button>' : '') + '</div>';
  }
  NG.incCard = incCard;

  /* Xử lý sự cố: điều phối, CSKH ghi hướng xử lý */
  NG.handleIncident = function (t, i) {
    NG.modal('Xử lý sự cố ' + i.id + ' · ' + i.type, '<p class="mut sm" style="margin-bottom:10px">' + esc(i.desc) + '</p><div class="form"><div class="field"><label for="h_a">Hướng xử lý</label><select class="input" id="h_a">' + ['Thông báo khách hàng, thỏa thuận giờ giao mới', 'Đổi thứ tự các điểm giao', 'Điều xe khác hỗ trợ trung chuyển', 'Gọi cứu hộ, sửa xe tại chỗ', 'Hướng dẫn tài xế chờ, tiếp tục hành trình', 'Khác'].map((x) => '<option>' + x + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="h_n">Ghi chú</label><textarea class="input" id="h_n">' + esc(i.result || '') + '</textarea></div><div class="field"><label for="h_s">Trạng thái sau xử lý</label><select class="input" id="h_s"><option value="dang_xu_ly"' + (i.status === 'moi' ? ' selected' : '') + '>Đang xử lý</option><option value="da_xu_ly"' + (i.status === 'dang_xu_ly' ? ' selected' : '') + '>Đã xử lý xong</option></select></div></div>', (bg) => {
      const a = bg.querySelector('#h_a').value, n = bg.querySelector('#h_n').value.trim();
      if (a === 'Khác' && !n) { NG.validate(bg, [['h_n', () => 'Vui lòng mô tả hướng xử lý.']]); return false; }
      i.result = a === 'Khác' ? n : a + (n ? '. ' + n : ''); i.status = bg.querySelector('#h_s').value; i.handledBy = NG.user().username; i.handledAt = NG.now();
      t.history.push({ status: t.status, at: NG.now(), by: NG.user().username, note: 'Xử lý sự cố ' + i.id + ': ' + i.result });
      NG.log('Xử lý sự cố', i.id + ' / ' + t.id); NG.save(); NG.toast('Đã cập nhật sự cố ' + i.id + '.'); NG.render();
    }, { okText: 'Lưu' });
  };

  /* Ghi nhận sự cố (dùng chung cho điều phối và tài xế) */
  NG.incidentModal = function (t, by, after) {
    NG.modal('Báo sự cố · chuyến ' + t.id, '<div class="form"><div class="field"><label for="i_t">Loại sự cố</label><select class="input" id="i_t">' + NG.INCIDENT_TYPES.map((x) => '<option>' + x + '</option>').join('') + '</select></div><div class="field"><label for="i_d">Mô tả <span class="rq">*</span></label><textarea class="input" id="i_d" placeholder="Ví dụ: kẹt xe tại cầu Đồng Nai, dự kiến trễ 30 phút"></textarea></div>' +
      '<div class="field"><label for="i_p">Ảnh hiện trường (không bắt buộc)</label><input class="input" type="file" id="i_p" accept="image/*"></div></div>', (bg) => {
      if (!NG.validate(bg, [['i_d', NG.req('mô tả sự cố')]])) return false;
      const save = (photo) => {
        const id = 'SC' + String(++NG.db().seq.incident).padStart(3, '0');
        const cur = NG.curStop(t);
        t.incidents.push({ id, at: NG.now(), type: bg.querySelector('#i_t').value, desc: bg.querySelector('#i_d').value.trim(), by, stopId: cur ? cur.id : null, status: 'moi', result: '', handledBy: null, handledAt: null, photo });
        t.history.push({ status: t.status, at: NG.now(), by, note: 'Báo sự cố ' + id + ': ' + bg.querySelector('#i_t').value });
        NG.log('Báo sự cố', id + ' / ' + t.id, by); NG.save(); NG.toast('Đã gửi sự cố ' + id + ' đến điều phối và CSKH.'); bg.remove(); (after || NG.render)();
      };
      const f = bg.querySelector('#i_p').files[0];
      if (f) NG.readImage(f, (data) => save({ name: f.name, data })); else save(null);
      return false;
    }, { okText: 'Gửi sự cố', danger: false });
  };

  /* Đọc ảnh và thu nhỏ trước khi lưu (FileReader + canvas) */
  NG.readImage = function (file, cb) {
    const fr = new FileReader();
    fr.onload = () => { const img = new Image(); img.onload = () => { const k = Math.min(1, 640 / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); cb(c.toDataURL('image/jpeg', 0.7)); }; img.onerror = () => cb(null); img.src = fr.result; };
    fr.readAsDataURL(file);
  };

  /* ================= GIÁM SÁT HÀNH TRÌNH ================= */
  let timer = null;
  NG.V['giam-sat'] = function (el, r) {
    clearInterval(timer);
    const d = NG.db();
    const tab = r.q.get('tab') || 'dang-chay';
    const running = d.trips.filter((t) => t.status === 'dang_chay');
    const upcoming = d.trips.filter((t) => ['da_phan_cong', 'da_nhan'].includes(t.status) && t.date === NG.today());
    const inc = [];
    d.trips.forEach((t) => t.incidents.forEach((i) => inc.push([t, i])));
    inc.sort((a, b) => (a[1].at < b[1].at ? 1 : -1));
    const issues = d.orders.filter((o) => o.status === 'giao_that_bai' || (['dang_giao', 'da_xep_chuyen'].includes(o.status) && NG.isLate(o)));
    el.innerHTML = '<div class="page-h"><div><h1>Giám sát hành trình</h1><p>Theo dõi tiến độ từng điểm dừng theo cập nhật của tài xế · tự làm mới mỗi 30 giây</p></div><span class="mut sm">Cập nhật lúc ' + NG.hhmm(NG.now()) + '</span></div>' +
      '<div class="kpis">' + [['Đang chạy', running.length, upcoming.length + ' chuyến chờ xuất bến hôm nay', ''], ['Điểm giao còn lại', running.reduce((a, t) => a + t.stops.filter((s) => s.kind === 'giao' && s.status === 'cho').length, 0), 'trên các chuyến đang chạy', 'amber'], ['Sự cố chưa xong', inc.filter((x) => x[1].status !== 'da_xu_ly').length, inc.filter((x) => x[1].status === 'moi').length + ' sự cố mới báo', 'red'], ['Trễ hạn, thất bại', issues.length, 'vận đơn cần báo khách', issues.length ? 'red' : 'green']].map((k) => '<div class="kpi ' + k[3] + '"><div class="k-l">' + k[0] + '</div><div class="k-v">' + k[1] + '</div><div class="k-s">' + k[2] + '</div></div>').join('') + '</div>' +
      '<section class="card"><div class="tabs">' + [['dang-chay', 'Chuyến đang chạy', running.length], ['su-co', 'Sự cố', inc.length], ['tre-han', 'Trễ hạn, giao thất bại', issues.length]].map((x) => '<button data-t="' + x[0] + '"' + (x[0] === tab ? ' class="on"' : '') + '>' + x[1] + '<span class="cnt">' + x[2] + '</span></button>').join('') + '</div><div id="gbody"></div></section>';
    $$('[data-t]').forEach((b) => b.onclick = () => NG.go('#/giam-sat?tab=' + b.dataset.t));
    const body = $('#gbody');
    if (tab === 'dang-chay') {
      body.innerHTML = '<div class="card-b mon">' + (running.concat(upcoming).length ? running.concat(upcoming).map(monCard).join('') : '<p class="mut">Hiện không có chuyến đang chạy.</p>') + '</div>';
      $$('[data-hi]', body).forEach((b) => b.onclick = () => { const [tid, iid] = b.dataset.hi.split('|'); const tt = NG.trip(tid); NG.handleIncident(tt, tt.incidents.find((x) => x.id === iid)); });
    }
    if (tab === 'su-co') {
      body.innerHTML = '<div class="filters"><select class="input" id="is" aria-label="Trạng thái sự cố"><option value="">Tất cả</option>' + Object.entries(NG.ST.incident).map(([k, v]) => '<option value="' + k + '">' + v.label + '</option>').join('') + '</select></div><div id="il"></div>';
      const draw = () => { const st = $('#is').value; const rows = inc.filter(([, i]) => !st || i.status === st).slice(0, 40); $('#il').innerHTML = rows.length ? rows.map(([t, i]) => incCard(t, i)).join('') : '<p class="mut" style="padding:18px">Không có sự cố.</p>'; $$('[data-h]', $('#il')).forEach((b) => { const x = inc.find(([, i]) => i.id === b.dataset.h); b.onclick = () => NG.handleIncident(x[0], x[1]); }); };
      $('#is').onchange = draw; draw();
    }
    if (tab === 'tre-han') {
      NG.table(body, {
        rows: () => issues, sort: 'deliverBy', dir: 1,
        cols: [{ key: 'id', label: 'Vận đơn', html: (o) => '<a class="code" href="#/van-don/' + o.id + '">' + o.id + '</a>' }, { key: 'customerId', label: 'Khách hàng', html: (o) => esc(NG.customer(o.customerId).short) + '<div class="mut sm">' + esc(NG.customer(o.customerId).phone) + '</div>' }, { key: 'receiver', label: 'Người nhận', html: (o) => esc(o.receiver) + '<div class="mut sm">' + esc(o.receiverPhone) + '</div>' }, { key: 'deliverBy', label: 'Hạn giao', html: (o) => NG.fmtDT(o.deliverBy) }, { key: 'tripId', label: 'Chuyến', html: (o) => esc(o.tripId || '—') }, { key: 'status', label: 'Tình trạng', html: (o) => NG.badge(o.status) + (o.status !== 'giao_that_bai' ? ' <span class="pill red">Trễ</span>' : '') }],
        empty: 'Không có vận đơn trễ hạn hoặc giao thất bại.'
      });
    }
    timer = setInterval(() => { if (location.hash.startsWith('#/giam-sat') && !document.querySelector('.modal-bg')) NG.render(); else if (!location.hash.startsWith('#/giam-sat')) clearInterval(timer); }, 30000);
  };

  function monCard(t) {
    const v = NG.vehicle(t.vehicleId), dr = NG.driver(t.driverId), p = NG.tripProgress(t), cur = t.status === 'dang_chay' ? NG.curStop(t) : null, etas = NG.etas(t);
    const open = t.incidents.filter((i) => i.status !== 'da_xu_ly');
    return '<article class="mcard"><div class="mc-h"><div><a class="code" href="#/' + (NG.can('chuyen-xe') ? 'chuyen-xe/' + t.id : 'giam-sat') + '">' + t.id + '</a> ' + NG.tbadge(t.status) + (NG.tripLate(t) ? ' <span class="pill red">Có điểm trễ</span>' : '') + (open.length ? ' <span class="pill amber">' + open.length + ' sự cố</span>' : '') + '<div class="mut sm">' + esc(v.plate) + ' · ' + esc(dr.name) + ' · ' + esc(dr.phone) + '</div></div><div class="mc-p"><b>' + p.d + '/' + p.n + '</b><span class="mut sm">điểm dừng</span></div></div>' +
      '<ol class="route">' + t.stops.map((s, i) => '<li class="' + s.status + (s === cur ? ' cur' : '') + (NG.stopLate(s) ? ' late' : '') + '" title="' + esc((s.kind === 'lay' ? 'Lấy hàng: ' : 'Giao hàng: ') + s.addr) + '"><i>' + (s.status === 'xong' ? '✓' : s.status === 'that_bai' ? '✕' : s.kind === 'lay' ? 'L' : 'G') + '</i><span>' + esc(s.addr.split(',')[0].replace(/^(Kho|Cửa hàng|Siêu thị|Nhà máy|Đại lý|Showroom|Nhà thuốc|Công trình)\s+/, '')) + '<small>' + (s.doneAt ? NG.hhmm(s.doneAt) : 'dự kiến ' + NG.hhmm(etas[i])) + '</small></span></li>').join('') + '</ol>' +
      (cur ? '<p class="sm"><b>' + (cur.status === 'da_den' ? 'Đang ở' : 'Đang đến') + ':</b> ' + (cur.kind === 'lay' ? 'lấy hàng tại ' : 'giao hàng tại ') + esc(cur.addr) + (cur.kind === 'giao' ? ' · hạn ' + NG.hhmm(NG.order(cur.orderId).deliverBy) : '') + '</p>' : '<p class="sm mut">Xuất bến dự kiến ' + NG.fmtDT(t.planStart) + '</p>') +
      open.map((i) => '<div class="alert warn sm" style="margin-top:8px"><b>' + esc(i.type) + ':</b> ' + esc(i.desc) + (NG.may('incident.handle') ? ' <button class="btn sm ghost" data-hi="' + t.id + '|' + i.id + '">Xử lý</button>' : '') + '</div>').join('') + '</article>';
  }
})();
