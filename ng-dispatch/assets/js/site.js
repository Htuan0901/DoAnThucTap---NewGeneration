/* Trang web công khai: số liệu, đội xe, tra cứu vận đơn theo từng điểm dừng */
(function () {
  const NG = window.NG;
  const { esc, $ } = NG;
  const d = NG.db(), C = NG.COMPANY;
  const th = NG.ls.get('ngd_theme', null); if (th) document.documentElement.dataset.theme = th;

  $('#burger').onclick = () => { const n = $('#snav'); n.classList.toggle('open'); $('#burger').setAttribute('aria-expanded', n.classList.contains('open')); };
  $('#snav').addEventListener('click', (e) => { if (e.target.tagName === 'A') $('#snav').classList.remove('open'); });

  /* Số liệu nổi bật lấy từ dữ liệu hệ thống */
  const since = NG.addDays(NG.today(), -30);
  const trips = d.trips.filter((t) => t.endOdo && t.date >= since);
  const drops = []; trips.forEach((t) => t.stops.filter((s) => s.kind === 'giao' && s.status === 'xong').forEach((s) => drops.push(s)));
  $('#f-trip').textContent = trips.length;
  $('#f-ok').textContent = drops.length ? Math.round(drops.filter((s) => !NG.stopLate(s)).length * 100 / drops.length) + '%' : '—';
  $('#f-veh').textContent = d.vehicles.filter((v) => v.status !== 'ngung').length;

  const types = {};
  d.vehicles.filter((v) => v.status !== 'ngung').forEach((v) => { types[v.type] = types[v.type] || []; types[v.type].push(v.load); });
  $('#fleet').innerHTML = Object.entries(types).map(([k, v]) => '<div><b>' + v.length + ' xe</b><strong>' + esc(k) + '</strong><p class="mut sm">Tải trọng ' + [...new Set(v)].sort((a, b) => a - b).map((x) => String(x).replace('.', ',')).join(', ') + ' tấn</p></div>').join('');
  $('#contact').innerHTML = [['Văn phòng', C.address], ['Hotline điều phối', '<a href="tel:' + NG.digits(C.phone) + '">' + C.phone + '</a> (6:00 – 21:00, kể cả thứ Bảy)'], ['Email', '<a href="mailto:' + C.email + '">' + C.email + '</a>'], ['Thông tin doanh nghiệp', 'Mã số thuế ' + C.tax + '<br>Thành lập ' + C.founded]].map((x) => '<div><b>' + x[0] + '</b><span class="mut">' + x[1] + '</span></div>').join('');
  $('#ft-name').textContent = C.name;
  $('#ft-info').innerHTML = esc(C.address) + '<br>Điện thoại: ' + C.phone + ' · Email: ' + C.email + '<br>Mã số thuế: ' + C.tax;

  /* Tra cứu: không hiển thị giá cước; biển số và tên tài xế được rút gọn */
  const sample = d.orders.find((o) => o.status === 'dang_giao') || d.orders.find((o) => o.status === 'da_giao');
  if (sample) $('#t-demo').innerHTML = 'Thử: mã <b>' + sample.id + '</b>, 4 số cuối <b>' + sample.receiverPhone.slice(-4) + '</b>';
  const mask = (p) => p.replace(/(\d{2}[A-Z]+-)\d(\d{2})\.(\d{2})/, '$1*$2.**');
  const S = ['Tiếp nhận', 'Xếp chuyến', 'Lấy hàng', 'Đang giao', 'Đã giao'];
  $('#tf').onsubmit = (e) => {
    e.preventDefault();
    const res = $('#t-res');
    if (!NG.validate($('#tf'), [['t-code', NG.req('mã vận đơn')], ['t-phone', (x) => (!/^\d{4}$/.test(x) ? 'Nhập đúng 4 chữ số.' : '')]])) { res.innerHTML = ''; return; }
    const code = $('#t-code').value.trim().toUpperCase(), ph = $('#t-phone').value.trim();
    const o = d.orders.find((x) => x.id === code);
    if (!o || (o.receiverPhone.slice(-4) !== ph && o.pickupPhone.slice(-4) !== ph)) { res.innerHTML = '<div class="alert bad">Không tìm thấy vận đơn phù hợp. Vui lòng kiểm tra lại mã và số điện thoại.</div>'; return; }
    const idx = { cho_xep_chuyen: 0, da_xep_chuyen: 1, dang_lay: 2, dang_giao: 3, da_giao: 4, giao_that_bai: 3, tra_hang: 3, da_huy: -1 }[o.status];
    const t = o.tripId ? NG.trip(o.tripId) : null;
    let pos = '';
    if (t && t.status === 'dang_chay') {
      const myDrop = t.stops.findIndex((s) => s.orderId === o.id && s.kind === 'giao');
      const cur = t.stops.findIndex((s) => s.status === 'cho' || s.status === 'da_den');
      if (myDrop >= 0 && cur >= 0 && cur <= myDrop && o.status !== 'da_giao') pos = '<dt>Vị trí xe</dt><dd>' + (cur === myDrop ? 'Xe đang đến điểm giao của bạn' : 'Còn ' + (myDrop - cur) + ' điểm dừng trước điểm giao của bạn') + '</dd>';
    }
    const drop = t ? t.stops.find((s) => s.orderId === o.id && s.kind === 'giao' && s.status === 'xong') : null;
    res.innerHTML = '<div class="row" style="justify-content:space-between"><b class="code">' + o.id + '</b>' + NG.badge(o.status) + '</div>' +
      (o.status === 'da_huy' ? '<div class="alert bad" style="margin-top:10px">Vận đơn đã hủy.</div>' : '<div class="stepper">' + S.map((s, i) => '<div class="step ' + (i < idx || o.status === 'da_giao' ? 'done' : i === idx ? 'cur' : '') + '"><div class="c">' + (i < idx || o.status === 'da_giao' ? '✓' : i + 1) + '</div>' + s + '</div>').join('') + '</div>') +
      (o.status === 'giao_that_bai' ? '<div class="alert warn sm">Lần giao trước chưa thành công. Bộ phận CSKH sẽ liên hệ để hẹn lại thời gian giao.</div>' : '') +
      '<dl class="kv sm" style="grid-template-columns:120px 1fr;margin-top:6px"><dt>Giao đến</dt><dd>' + esc(o.dropAddr) + '</dd><dt>Hạn giao</dt><dd>' + NG.fmtDT(o.deliverBy) + '</dd>' +
      (t && t.status !== 'da_huy' ? '<dt>Chuyến xe</dt><dd>' + t.id + ' · xe ' + mask(NG.vehicle(t.vehicleId).plate) + ' · tài xế ' + esc(NG.driver(t.driverId).name.split(' ').slice(-1)[0]) + '</dd>' : '') + pos +
      (drop ? '<dt>Đã giao</dt><dd>' + NG.fmtDT(drop.doneAt) + ' · người nhận ' + esc(drop.pod.name) + ' (đã ký xác nhận)</dd>' : '') + '</dl>';
  };
})();
