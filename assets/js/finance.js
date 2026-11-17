/* Đối soát chi phí chuyến và báo cáo hiệu suất điều phối */
(function () {
  const NG = window.NG;
  const { esc, $, $$ } = NG;
  NG.RECEIPT_MIN = 100000; // chi phí từ mức này phải có chứng từ

  /* Bảng quãng đường, định mức nhiên liệu và chi phí của chuyến */
  NG.costPanel = function (t) {
    const v = NG.vehicle(t.vehicleId);
    if (!t.endOdo) return '<p class="mut">Chuyến chưa kết thúc. Tài xế khai số km đồng hồ và chi phí khi về bãi.</p><dl class="kv" style="margin-top:12px"><dt>Quãng đường kế hoạch</dt><dd>' + NG.num(t.planKm) + ' km</dd><dt>Km đồng hồ lúc xuất bến</dt><dd>' + (t.startOdo ? NG.num(t.startOdo) : '—') + '</dd><dt>Định mức nhiên liệu xe</dt><dd>' + v.fuelNorm + ' lít/100 km</dd></dl>';
    const km = NG.tripKm(t), norm = NG.fuelNorm(t), fuel = NG.fuelCost(t), over = NG.fuelOver(t);
    const r = t.recon;
    return '<div class="grid g2"><div><h3 style="margin-bottom:10px">Quãng đường và nhiên liệu</h3><dl class="kv"><dt>Km đồng hồ xuất bến</dt><dd>' + NG.num(t.startOdo) + '</dd><dt>Km đồng hồ về bãi</dt><dd>' + NG.num(t.endOdo) + '</dd><dt>Quãng đường thực tế</dt><dd>' + NG.num(km) + ' km <span class="mut sm">(kế hoạch ' + t.planKm + ' km' + (km > t.planKm * 1.15 ? ', <b style="color:var(--bad)">vượt ' + Math.round((km / t.planKm - 1) * 100) + '%</b>' : '') + ')</span></dd>' +
      '<dt>Định mức xe</dt><dd>' + v.fuelNorm + ' lít/100 km × ' + NG.num(NG.FUEL_PRICE) + ' đ/lít</dd><dt>Nhiên liệu theo định mức</dt><dd>' + NG.money(norm) + '</dd><dt>Nhiên liệu thực chi</dt><dd>' + NG.money(fuel) + ' <span class="pill ' + (over > NG.FUEL_TOLERANCE ? 'red' : over > 0 ? 'amber' : 'green') + '">' + (over > 0 ? '+' : '') + over + '%</span></dd></dl>' +
      (over > NG.FUEL_TOLERANCE ? '<div class="alert bad sm" style="margin-top:10px">Nhiên liệu vượt định mức quá ' + NG.FUEL_TOLERANCE + '%. Kế toán cần ghi rõ lý do khi duyệt hoặc trả lại để tài xế giải trình.</div>' : '') + '</div>' +
      '<div><h3 style="margin-bottom:10px">Chi phí tài xế khai</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Khoản chi</th><th class="num">Số tiền</th><th>Chứng từ</th></tr></thead><tbody>' +
      t.costs.map((c) => '<tr><td>' + esc(c.type) + '<div class="mut sm">' + esc(c.note || '') + '</div></td><td class="num">' + NG.money(c.amount) + '</td><td>' + (c.receipt ? '<span class="pill green">' + esc(c.receipt.name) + '</span>' : c.amount >= NG.RECEIPT_MIN ? '<span class="pill red">Thiếu</span>' : '<span class="mut sm">Không bắt buộc</span>') + '</td></tr>').join('') +
      '<tr><td><b>Tổng cộng</b></td><td class="num"><b>' + NG.money(NG.tripCost(t)) + '</b></td><td class="mut sm">' + NG.num(Math.round(NG.tripCost(t) / Math.max(1, km))) + ' đ/km</td></tr></tbody></table></div>' +
      (r ? '<div class="alert ' + (r.status === 'da_duyet' ? 'ok' : 'warn') + ' sm" style="margin-top:12px">' + (r.status === 'da_duyet' ? 'Đã duyệt đối soát' : 'Đã trả lại cho tài xế') + ' bởi ' + esc(NG.who(r.by)) + ' lúc ' + NG.fmtDT(r.at) + (r.note ? ': ' + esc(r.note) : '') + '</div>' : '<p class="mut sm" style="margin-top:12px">Chưa đối soát.</p>') + '</div></div>';
  };

  /* Danh sách kiểm tra trước khi duyệt đối soát */
  NG.reconIssues = function (t) {
    const out = [];
    t.stops.filter((s) => s.status === 'cho' || s.status === 'da_den').forEach((s) => out.push(['bad', 'Điểm dừng ' + s.addr.split(',')[0] + ' chưa hoàn tất.']));
    t.stops.filter((s) => s.kind === 'giao' && s.status === 'xong' && !(s.pod && s.pod.name && (s.pod.photos.length || s.pod.signed || s.pod.sign))).forEach((s) => out.push(['bad', 'Vận đơn ' + s.orderId + ' thiếu bằng chứng giao hàng.']));
    t.costs.filter((c) => c.amount >= NG.RECEIPT_MIN && !c.receipt).forEach((c) => out.push(['bad', c.type + ' ' + NG.money(c.amount) + ' chưa có chứng từ.']));
    if (NG.fuelOver(t) > NG.FUEL_TOLERANCE) out.push(['warn', 'Nhiên liệu vượt định mức ' + NG.fuelOver(t) + '%.']);
    if (NG.tripKm(t) > t.planKm * 1.15) out.push(['warn', 'Quãng đường thực tế vượt kế hoạch ' + Math.round((NG.tripKm(t) / t.planKm - 1) * 100) + '%.']);
    t.stops.filter((s) => s.status === 'that_bai').forEach((s) => out.push(['warn', 'Vận đơn ' + s.orderId + ' giao thất bại: ' + s.failReason + '.']));
    return out;
  };

  NG.V['doi-soat'] = function (el, r) {
    const d = NG.db();
    if (r.parts[1]) return reconDetail(el, NG.trip(r.parts[1]));
    const tab = r.q.get('tab') || 'cho';
    const sets = { cho: d.trips.filter((t) => t.status === 'hoan_thanh' && !t.recon), 'tra-lai': d.trips.filter((t) => t.status === 'hoan_thanh' && t.recon && t.recon.status === 'tra_lai'), da: d.trips.filter((t) => t.status === 'da_doi_soat') };
    el.innerHTML = '<div class="page-h"><div><h1>Đối soát chuyến</h1><p>Kiểm tra quãng đường, nhiên liệu theo định mức và chứng từ chi phí của từng chuyến trước khi ghi nhận</p></div><button class="btn ghost" id="xls">Xuất Excel</button></div>' +
      '<section class="card"><div class="tabs">' + [['cho', 'Chờ đối soát'], ['tra-lai', 'Đã trả lại tài xế'], ['da', 'Đã đối soát']].map((x) => '<button data-t="' + x[0] + '"' + (x[0] === tab ? ' class="on"' : '') + '>' + x[1] + '<span class="cnt">' + sets[x[0]].length + '</span></button>').join('') + '</div><div id="tb"></div></section>';
    $$('[data-t]').forEach((b) => b.onclick = () => NG.go('#/doi-soat?tab=' + b.dataset.t));
    const rows = () => sets[tab];
    NG.table($('#tb'), {
      rows, sort: 'planStart', dir: tab === 'da' ? -1 : 1, size: 12,
      cols: [
        { key: 'id', label: 'Chuyến', html: (t) => '<a class="code" href="#/doi-soat/' + t.id + '">' + t.id + '</a><div class="mut sm">' + NG.fmtD(t.date) + '</div>' },
        { key: 'vehicleId', label: 'Xe · Tài xế', html: (t) => esc(NG.vehicle(t.vehicleId).plate) + '<div class="mut sm">' + esc(NG.driver(t.driverId).name) + '</div>' },
        { key: 'km', label: 'Km thực tế', num: true, html: (t) => NG.num(NG.tripKm(t)) + '<div class="mut sm">KH ' + t.planKm + '</div>', sortVal: NG.tripKm },
        { key: 'fuel', label: 'Nhiên liệu so định mức', num: true, html: (t) => { const o = NG.fuelOver(t); return '<span class="pill ' + (o > NG.FUEL_TOLERANCE ? 'red' : o > 0 ? 'amber' : 'green') + '">' + (o > 0 ? '+' : '') + o + '%</span>'; }, sortVal: NG.fuelOver },
        { key: 'cost', label: 'Tổng chi phí', num: true, html: (t) => NG.money(NG.tripCost(t)), sortVal: NG.tripCost },
        { key: 'chk', label: 'Kiểm tra', sortable: false, html: (t) => { const is = NG.reconIssues(t); const b = is.filter((x) => x[0] === 'bad').length, w = is.length - b; return b ? '<span class="pill red">' + b + ' lỗi</span>' : w ? '<span class="pill amber">' + w + ' lưu ý</span>' : '<span class="pill green">Đạt</span>'; } },
        { key: 'a', label: '', sortable: false, html: (t) => '<a class="btn sm ' + (tab === 'cho' ? 'primary' : 'ghost') + '" href="#/doi-soat/' + t.id + '">' + (tab === 'cho' ? 'Đối soát' : 'Xem') + '</a>' }
      ], empty: tab === 'cho' ? 'Không có chuyến chờ đối soát.' : 'Không có dữ liệu.'
    });
    $('#xls').onclick = () => NG.download('doi-soat-chuyen.csv', [['Chuyến', 'Ngày', 'Biển số', 'Tài xế', 'Km kế hoạch', 'Km thực tế', 'Nhiên liệu định mức', 'Nhiên liệu thực chi', 'Chênh lệch (%)', 'Tổng chi phí', 'Kết quả']].concat(rows().map((t) => [t.id, NG.fmtD(t.date), NG.vehicle(t.vehicleId).plate, NG.driver(t.driverId).name, t.planKm, NG.tripKm(t), NG.fuelNorm(t), NG.fuelCost(t), NG.fuelOver(t), NG.tripCost(t), t.recon ? (t.recon.status === 'da_duyet' ? 'Đã duyệt' : 'Trả lại') : 'Chờ'])));
  };

  function reconDetail(el, t) {
    if (!t) { el.innerHTML = '<p>Không tìm thấy chuyến.</p>'; return; }
    const is = NG.reconIssues(t);
    const bad = is.filter((x) => x[0] === 'bad');
    const can = NG.may('recon') && t.status === 'hoan_thanh' && !t.recon;
    el.innerHTML = '<div class="crumb"><a href="#/doi-soat">Đối soát chuyến</a> / ' + esc(t.id) + '</div><div class="page-h"><div><h1>Đối soát chuyến ' + esc(t.id) + ' ' + NG.tbadge(t.status) + '</h1><p>' + esc(NG.vehicle(t.vehicleId).plate) + ' · ' + esc(NG.driver(t.driverId).name) + ' · ngày ' + NG.fmtD(t.date) + ' · ' + NG.tripOrders(t).length + ' vận đơn</p></div><div class="row">' + (NG.can('chuyen-xe') ? '<a class="btn ghost" href="#/chuyen-xe/' + t.id + '">Xem chuyến</a>' : '') +
      (can ? '<button class="btn ghost" id="back" style="color:var(--bad)">Trả lại tài xế</button><button class="btn primary" id="ok"' + (bad.length ? ' disabled title="Còn lỗi cần xử lý"' : '') + '>Duyệt đối soát</button>' : '') + '</div></div>' +
      '<div class="grid g-main"><section class="card"><div class="card-h"><h2>Quãng đường và chi phí</h2></div><div class="card-b">' + NG.costPanel(t) + '</div></section>' +
      '<section class="card"><div class="card-h"><h2>Kiểm tra tự động</h2></div><div class="card-b">' + (is.length ? is.map((x) => '<div class="alert ' + x[0] + ' sm" style="margin-bottom:6px">' + esc(x[1]) + '</div>').join('') : '<div class="alert ok sm">Chuyến đạt tất cả điều kiện đối soát.</div>') +
      '<h3 style="margin:14px 0 8px">Điểm giao</h3>' + t.stops.filter((s) => s.kind === 'giao').map((s) => '<div class="row sm" style="justify-content:space-between;border-top:1px solid var(--line-2);padding:7px 0"><span><a class="code" href="#/van-don/' + s.orderId + '">' + s.orderId + '</a> ' + esc(s.addr.split(',')[0]) + '</span>' + NG.badge(s.status, NG.ST.stop) + '</div>').join('') + '</div></section></div>';
    if (!can) return;
    $('#ok').onclick = () => {
      const over = NG.fuelOver(t) > NG.FUEL_TOLERANCE;
      NG.modal('Duyệt đối soát chuyến ' + t.id, '<p>Tổng chi phí <b>' + NG.money(NG.tripCost(t)) + '</b> cho ' + NG.num(NG.tripKm(t)) + ' km.</p><div class="field" style="margin-top:10px"><label for="rn">Ghi chú' + (over ? ' (bắt buộc vì nhiên liệu vượt định mức) <span class="rq">*</span>' : '') + '</label><textarea class="input" id="rn"></textarea></div>', (bg) => {
        if (over && !NG.validate(bg, [['rn', NG.req('lý do chấp nhận vượt định mức')]])) return false;
        t.recon = { status: 'da_duyet', by: NG.user().username, at: NG.now(), note: bg.querySelector('#rn').value.trim() || 'Khớp chứng từ' };
        NG.pushHistory(t, 'da_doi_soat', 'Duyệt đối soát chi phí ' + NG.money(NG.tripCost(t)));
        NG.log('Duyệt đối soát chuyến', t.id); NG.save(); NG.toast('Đã duyệt đối soát chuyến ' + t.id + '.'); NG.go('#/doi-soat');
      }, { okText: 'Duyệt' });
    };
    $('#back').onclick = () => NG.reasonModal('Trả lại chuyến ' + t.id, 'Nội dung tài xế cần bổ sung', (why) => {
      t.recon = { status: 'tra_lai', by: NG.user().username, at: NG.now(), note: why };
      t.history.push({ status: t.status, at: NG.now(), by: NG.user().username, note: 'Trả lại đối soát: ' + why });
      NG.log('Trả lại đối soát', t.id); NG.save(); NG.toast('Đã trả lại, tài xế sẽ nhận thông báo để bổ sung.'); NG.go('#/doi-soat');
    }, { okText: 'Trả lại' });
  }

  /* ================= BÁO CÁO ================= */
  NG.V['bao-cao'] = function (el, r) {
    const d = NG.db();
    const to = r.q.get('den') || NG.today(), from = r.q.get('tu') || NG.addDays(to, -29);
    const trips = d.trips.filter((t) => t.date >= from && t.date <= to && t.endOdo);
    const orders = d.orders.filter((o) => o.deliveredAt && o.deliveredAt.slice(0, 10) >= from && o.deliveredAt.slice(0, 10) <= to);
    const drops = []; trips.forEach((t) => t.stops.filter((s) => s.kind === 'giao' && s.status !== 'cho').forEach((s) => drops.push([t, s])));
    const okDrops = drops.filter(([, s]) => s.status === 'xong');
    const onTime = okDrops.length ? Math.round(okDrops.filter(([, s]) => !NG.stopLate(s)).length * 100 / okDrops.length) : 0;
    const failPct = drops.length ? Math.round(drops.filter(([, s]) => s.status === 'that_bai').length * 1000 / drops.length) / 10 : 0;
    const km = trips.reduce((a, t) => a + NG.tripKm(t), 0), cost = trips.reduce((a, t) => a + NG.tripCost(t), 0);
    const util = trips.length ? Math.round(trips.reduce((a, t) => a + NG.tripLoadPct(t), 0) / trips.length) : 0;
    const rev = orders.reduce((a, o) => a + o.price, 0);
    const price = NG.seePrice();
    const kp = [['Chuyến hoàn thành', trips.length, NG.fmtD(from) + ' – ' + NG.fmtD(to), ''], ['Giao đúng hạn', onTime + '%', okDrops.length + ' điểm giao thành công', 'green'], ['Giao thất bại', String(failPct).replace('.', ',') + '%', drops.length + ' lượt giao', failPct > 3 ? 'red' : 'amber'], ['Hệ số tải bình quân', util + '%', NG.num(km) + ' km đã chạy', '']];
    if (price) kp.push(['Chi phí vận hành / km', NG.num(cost / Math.max(1, km)) + ' đ', 'Tổng ' + NG.money(cost), 'amber'], ['Doanh thu cước', NG.money(rev).replace(' đ', ''), 'đồng, ' + orders.length + ' vận đơn đã giao', 'green']);
    // Theo tuần
    const weeks = [];
    const base = new Date(to + 'T00:00'); base.setDate(base.getDate() - ((base.getDay() + 6) % 7));
    const iso = (x) => new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    for (let i = 7; i >= 0; i--) { const s = new Date(base); s.setDate(s.getDate() - i * 7); const e = new Date(s); e.setDate(e.getDate() + 7); const ts = d.trips.filter((t) => t.endOdo && t.date >= iso(s) && t.date < iso(e)); weeks.push({ k: iso(s).slice(8, 10) + '/' + iso(s).slice(5, 7), v: ts.length, hl: i === 0 }); }
    const byV = d.vehicles.map((v) => { const ts = trips.filter((t) => t.vehicleId === v.id); const k = ts.reduce((a, t) => a + NG.tripKm(t), 0); const f = ts.reduce((a, t) => a + NG.fuelCost(t), 0), n = ts.reduce((a, t) => a + NG.fuelNorm(t), 0); return { v, n: ts.length, km: k, fuel: f, norm: n, over: n ? Math.round((f - n) * 100 / n) : 0, util: ts.length ? Math.round(ts.reduce((a, t) => a + NG.tripLoadPct(t), 0) / ts.length) : 0 }; });
    const byD = d.drivers.map((x) => { const ts = trips.filter((t) => t.driverId === x.id); const ds = drops.filter(([t]) => t.driverId === x.id); const ok = ds.filter(([, s]) => s.status === 'xong'); return { x, n: ts.length, drops: ds.length, onTime: ok.length ? Math.round(ok.filter(([, s]) => !NG.stopLate(s)).length * 100 / ok.length) : 0, fail: ds.filter(([, s]) => s.status === 'that_bai').length, inc: ts.reduce((a, t) => a + t.incidents.length, 0), km: ts.reduce((a, t) => a + NG.tripKm(t), 0) }; });
    el.innerHTML = '<div class="page-h"><div><h1>Báo cáo hiệu suất điều phối</h1><p>Số chuyến, tỷ lệ giao đúng hạn, hệ số tải trọng và chi phí vận hành theo kỳ</p></div><div class="row no-print"><label class="sm mut" for="tu">Từ</label><input class="input" type="date" id="tu" value="' + from + '" style="width:auto"><label class="sm mut" for="den">đến</label><input class="input" type="date" id="den" value="' + to + '" style="width:auto"><button class="btn ghost" id="xls">Xuất Excel</button><button class="btn ghost" onclick="window.print()">In báo cáo</button></div></div>' +
      '<div class="print-only"><h2>' + esc(NG.COMPANY.name) + '</h2><p>Báo cáo hiệu suất điều phối từ ' + NG.fmtD(from) + ' đến ' + NG.fmtD(to) + '</p></div>' +
      '<div class="kpis">' + kp.map((k) => '<div class="kpi ' + k[3] + '"><div class="k-l">' + k[0] + '</div><div class="k-v">' + k[1] + '</div><div class="k-s">' + k[2] + '</div></div>').join('') + '</div>' +
      '<div class="grid g2"><section class="card"><div class="card-h"><h2>Số chuyến hoàn thành theo tuần</h2><span class="mut sm">8 tuần gần nhất</span></div><div class="card-b">' + NG.bars(weeks, { label: 'Số chuyến theo tuần' }) + '</div></section>' +
      '<section class="card"><div class="card-h"><h2>Hệ số sử dụng tải trọng theo xe</h2></div><div class="card-b">' + byV.map((x) => '<div class="hbar"><span>' + esc(x.v.plate) + '</span><span class="tr"><span class="fl" style="display:block;width:' + x.util + '%;background:' + (x.util >= 70 ? 'var(--ok)' : x.util >= 45 ? 'var(--brand)' : 'var(--warn)') + '"></span></span><b class="num">' + x.util + '%</b></div>').join('') + '</div></section></div>' +
      '<section class="card" style="margin-top:16px"><div class="card-h"><h2>Theo phương tiện</h2></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Biển số</th><th>Loại xe</th><th class="num">Số chuyến</th><th class="num">Km</th><th class="num">Tải bình quân</th>' + (price ? '<th class="num">Nhiên liệu định mức</th><th class="num">Nhiên liệu thực chi</th>' : '') + '<th class="num">Chênh lệch</th></tr></thead><tbody>' +
      byV.map((x) => '<tr><td><b>' + esc(x.v.plate) + '</b></td><td>' + esc(x.v.type) + ' ' + String(x.v.load).replace('.', ',') + ' t</td><td class="num">' + x.n + '</td><td class="num">' + NG.num(x.km) + '</td><td class="num">' + x.util + '%</td>' + (price ? '<td class="num">' + NG.money(x.norm) + '</td><td class="num">' + NG.money(x.fuel) + '</td>' : '') + '<td class="num"><span class="pill ' + (x.over > NG.FUEL_TOLERANCE ? 'red' : x.over > 0 ? 'amber' : 'green') + '">' + (x.over > 0 ? '+' : '') + x.over + '%</span></td></tr>').join('') + '</tbody></table></div></section>' +
      '<section class="card" style="margin-top:16px"><div class="card-h"><h2>Theo tài xế</h2></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tài xế</th><th class="num">Số chuyến</th><th class="num">Lượt giao</th><th class="num">Đúng hạn</th><th class="num">Thất bại</th><th class="num">Sự cố</th><th class="num">Km</th></tr></thead><tbody>' +
      byD.map((x) => '<tr><td><b>' + esc(x.x.name) + '</b><div class="mut sm">Bằng ' + x.x.license + '</div></td><td class="num">' + x.n + '</td><td class="num">' + x.drops + '</td><td class="num">' + (x.drops ? x.onTime + '%' : '—') + '</td><td class="num">' + x.fail + '</td><td class="num">' + x.inc + '</td><td class="num">' + NG.num(x.km) + '</td></tr>').join('') + '</tbody></table></div></section>';
    const upd = () => NG.go('#/bao-cao?tu=' + $('#tu').value + '&den=' + $('#den').value);
    $('#tu').onchange = upd; $('#den').onchange = upd;
    $('#xls').onclick = () => NG.download('bao-cao-dieu-phoi.csv', [['Biển số', 'Số chuyến', 'Km', 'Tải bình quân (%)', 'Nhiên liệu định mức', 'Nhiên liệu thực chi', 'Chênh lệch (%)']].concat(byV.map((x) => [x.v.plate, x.n, x.km, x.util, x.norm, x.fuel, x.over])).concat([[]], [['Tài xế', 'Số chuyến', 'Lượt giao', 'Đúng hạn (%)', 'Thất bại', 'Sự cố', 'Km']], byD.map((x) => [x.x.name, x.n, x.drops, x.onTime, x.fail, x.inc, x.km])));
  };
})();
