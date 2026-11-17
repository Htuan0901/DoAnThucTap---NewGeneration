/* Ứng dụng tài xế (giao diện di động): nhận chuyến, cập nhật điểm dừng, xác nhận giao nhận, sự cố, chi phí */
(function () {
  const NG = window.NG;
  const { esc, $, $$ } = NG;

  NG.V['chuyen-cua-toi'] = function (el, r) {
    const u = NG.user(), d = NG.db(), me = NG.driver(u.driverId);
    const tab = r.q.get('tab') || 'nay';
    const mine = d.trips.filter((t) => t.driverId === u.driverId);
    const act = mine.filter((t) => NG.TRIP_ACTIVE.includes(t.status) && !(t.status === 'da_phan_cong' && t.rejected)).sort((a, b) => (a.planStart > b.planStart ? 1 : -1));
    const done = mine.filter((t) => ['hoan_thanh', 'da_doi_soat'].includes(t.status)).sort((a, b) => (a.planStart < b.planStart ? 1 : -1)).slice(0, 12);
    const T = NG.today();
    const left = act.reduce((a, t) => a + t.stops.filter((s) => s.kind === 'giao' && (s.status === 'cho' || s.status === 'da_den')).length, 0);
    const okToday = mine.reduce((a, t) => a + t.stops.filter((s) => s.kind === 'giao' && s.status === 'xong' && s.doneAt && s.doneAt.slice(0, 10) === T).length, 0);
    const back = done.filter((t) => t.status === 'hoan_thanh' && t.recon && t.recon.status === 'tra_lai').length;
    el.innerHTML = '<div class="drv-h"><div class="row" style="justify-content:space-between"><div><div class="sm" style="opacity:.8">Xin chào</div><b style="font-size:18px">' + esc(me.name) + '</b><div class="sm" style="opacity:.8">Bằng ' + me.license + ' · ' + NG.fmtD(T) + '</div></div></div>' +
      '<div class="stats"><div><b>' + act.length + '</b><span>chuyến cần chạy</span></div><div><b>' + left + '</b><span>điểm giao còn lại</span></div><div><b>' + okToday + '</b><span>đã giao hôm nay</span></div></div></div>' +
      '<div class="seg" role="tablist"><button data-t="nay"' + (tab === 'nay' ? ' class="on"' : '') + '>Chuyến cần chạy (' + act.length + ')</button><button data-t="xong"' + (tab === 'xong' ? ' class="on"' : '') + '>Đã hoàn thành' + (back ? ' (' + back + ' trả lại)' : '') + '</button></div><div id="list"></div>';
    $$('[data-t]').forEach((b) => b.onclick = () => NG.go('#/chuyen-cua-toi?tab=' + b.dataset.t));
    const list = $('#list');
    list.innerHTML = tab === 'nay' ? (act.length ? act.map(card).join('') : '<div class="trip"><p class="mut">Bạn chưa có chuyến nào được giao. Điều phối sẽ gửi chuyến mới đến đây.</p></div>') : (done.length ? done.map(doneCard).join('') : '<div class="trip"><p class="mut">Chưa có chuyến hoàn thành.</p></div>');
    $$('[data-act]', list).forEach((b) => b.onclick = () => run(NG.trip(b.dataset.trip), b.dataset.act, b.dataset.stop));
  };

  function stopLine(s, i, etas) {
    const o = NG.order(s.orderId) || {};
    return '<li class="' + s.status + '"><i>' + (s.status === 'xong' ? '✓' : s.status === 'that_bai' ? '✕' : i + 1) + '</i><div><b>' + (s.kind === 'lay' ? 'Lấy hàng' : 'Giao hàng') + '</b> · ' + esc(s.addr) + '<small>' + (s.doneAt ? 'Xong ' + NG.hhmm(s.doneAt) : 'Dự kiến ' + NG.hhmm(etas[i])) + (s.kind === 'giao' ? ' · hạn ' + NG.hhmm(o.deliverBy) : '') + ' · ' + esc(s.orderId) + '</small></div></li>';
  }

  function card(t) {
    const v = NG.vehicle(t.vehicleId), etas = NG.etas(t), cur = NG.curStop(t), p = NG.tripProgress(t);
    const B = (a, label, cls, stop) => '<button class="btn ' + (cls || 'ghost') + '" data-act="' + a + '" data-trip="' + t.id + '"' + (stop ? ' data-stop="' + stop + '"' : '') + '>' + label + '</button>';
    let acts = '';
    if (t.status === 'da_phan_cong') acts = B('reject', 'Từ chối') + B('accept', 'Nhận chuyến', 'primary');
    if (t.status === 'da_nhan') acts = B('inc', 'Báo sự cố') + B('start', 'Xuất bến', 'primary');
    let curBox = '';
    if (t.status === 'dang_chay') {
      if (cur) {
        const o = NG.order(cur.orderId) || {};
        curBox = '<div class="cur-stop"><div class="mut sm">' + (cur.status === 'da_den' ? 'ĐANG Ở ĐIỂM' : 'ĐIỂM KẾ TIẾP') + ' · ' + (cur.kind === 'lay' ? 'LẤY HÀNG' : 'GIAO HÀNG') + '</div><b>' + esc(cur.addr) + '</b><div class="sm">' + (cur.kind === 'lay' ? esc(o.pickupContact) + ' · <a href="tel:' + o.pickupPhone + '">' + esc(o.pickupPhone) + '</a>' : esc(o.receiver) + ' · <a href="tel:' + o.receiverPhone + '">' + esc(o.receiverPhone) + '</a> · hạn ' + NG.hhmm(o.deliverBy)) + '</div><div class="sm mut">' + esc(cur.orderId) + ' · ' + esc(o.goods) + ' · ' + o.qty + ' ' + esc(o.unit) + ' · ' + NG.kg(o.weight) + '</div></div>';
        if (cur.status === 'cho') acts = B('inc', 'Báo sự cố') + B('arrive', 'Đã đến điểm', 'primary', cur.id);
        else if (cur.kind === 'lay') acts = B('inc', 'Báo sự cố') + B('picked', 'Đã lấy đủ hàng', 'primary', cur.id);
        else acts = B('fail', 'Giao thất bại', 'ghost', cur.id) + B('deliver', 'Giao thành công', 'primary', cur.id) + '<span class="full">' + B('inc', 'Báo sự cố') + '</span>';
      } else acts = B('inc', 'Báo sự cố') + B('finish', 'Về bãi, kết thúc chuyến', 'primary');
    }
    return '<article class="trip"><div class="row" style="justify-content:space-between"><b class="code">' + t.id + '</b>' + NG.tbadge(t.status) + '</div><div class="sm mut" style="margin-top:2px">' + esc(v.plate) + ' · ' + esc(v.type) + ' · xuất bến ' + NG.fmtDT(t.planStart) + '</div>' +
      (t.status === 'dang_chay' ? '<div class="prog" style="margin-top:10px"><i style="width:' + p.pct + '%"></i></div><div class="sm mut" style="margin-top:4px">' + p.d + '/' + p.n + ' điểm dừng</div>' : '') +
      curBox + '<ol class="dstops">' + t.stops.map((s, i) => stopLine(s, i, etas)).join('') + '</ol>' +
      t.incidents.filter((i) => i.status !== 'da_xu_ly').map((i) => '<div class="alert warn sm" style="margin-top:8px">Sự cố ' + esc(i.type) + ': ' + (i.result ? 'điều phối hướng dẫn ' + esc(i.result) : 'đang chờ điều phối xử lý') + '</div>').join('') +
      '<div class="acts">' + acts + '</div></article>';
  }

  function doneCard(t) {
    const back = t.status === 'hoan_thanh' && t.recon && t.recon.status === 'tra_lai';
    return '<article class="trip"><div class="row" style="justify-content:space-between"><b class="code">' + t.id + '</b>' + NG.tbadge(t.status) + '</div><div class="sm mut">' + NG.fmtD(t.date) + ' · ' + esc(NG.vehicle(t.vehicleId).plate) + ' · ' + NG.num(NG.tripKm(t)) + ' km · ' + t.stops.filter((s) => s.kind === 'giao' && s.status === 'xong').length + ' điểm giao</div>' +
      '<div class="sm" style="margin-top:6px">Chi phí đã khai: <b>' + NG.money(NG.tripCost(t)) + '</b></div>' +
      (back ? '<div class="alert bad sm" style="margin-top:8px">Kế toán trả lại: ' + esc(t.recon.note) + '</div><div class="acts"><button class="btn primary full" data-act="costs" data-trip="' + t.id + '">Bổ sung chi phí, chứng từ</button></div>' : '') + '</article>';
  }

  function stopOf(t, id) { return t.stops.find((s) => s.id === id); }
  const me = () => NG.user().driverId;
  const redraw = () => NG.render();

  function run(t, a, sid) {
    const by = me();
    const s = sid ? stopOf(t, sid) : null;
    const o = s ? NG.order(s.orderId) : null;
    if (a === 'accept') { t.acceptedAt = NG.now(); NG.pushHistory(t, 'da_nhan', 'Tài xế xác nhận nhận chuyến', by); NG.log('Nhận chuyến', t.id, by); NG.save(); NG.toast('Đã nhận chuyến ' + t.id + '.'); redraw(); }
    if (a === 'reject') NG.reasonModal('Từ chối chuyến ' + t.id, 'Lý do', (why) => { t.rejected = why; t.history.push({ status: t.status, at: NG.now(), by, note: 'Tài xế từ chối: ' + why }); NG.log('Từ chối chuyến', t.id, by); NG.save(); NG.toast('Đã gửi lý do từ chối đến điều phối.'); redraw(); }, { options: ['Xe gặp sự cố kỹ thuật', 'Không kịp giờ do chuyến trước', 'Lý do sức khỏe', 'Khác'], okText: 'Gửi' });
    if (a === 'start') {
      const v = NG.vehicle(t.vehicleId);
      NG.modal('Xuất bến · ' + t.id, '<div class="field"><label for="od">Số km trên đồng hồ xe ' + esc(v.plate) + ' <span class="rq">*</span></label><input class="input" id="od" type="number" inputmode="numeric" value="' + v.odo + '"><span class="hint">Lần ghi nhận gần nhất: ' + NG.num(v.odo) + ' km</span></div><label class="check" style="margin-top:10px"><input type="checkbox" id="ck"> Đã kiểm tra lốp, phanh, đèn và giấy tờ xe</label>', (bg) => {
        const val = +bg.querySelector('#od').value;
        if (!NG.validate(bg, [['od', (x) => (!x ? 'Vui lòng nhập số km.' : +x < v.odo ? 'Số km không được nhỏ hơn lần ghi nhận trước (' + NG.num(v.odo) + ').' : +x > v.odo + 2000 ? 'Số km chênh quá lớn so với lần trước, vui lòng kiểm tra lại.' : '')]])) return false;
        if (!bg.querySelector('#ck').checked) { NG.validate(bg, [['ck', () => 'Vui lòng xác nhận đã kiểm tra xe.']]); return false; }
        t.startOdo = val; v.odo = val; NG.pushHistory(t, 'dang_chay', 'Xuất bến, số km đồng hồ ' + NG.num(val), by); NG.log('Xuất bến', t.id, by); NG.save(); NG.toast('Chúc bạn thượng lộ bình an.'); redraw();
      }, { okText: 'Xuất bến', danger: false });
    }
    if (a === 'arrive') { s.status = 'da_den'; s.arrivedAt = NG.now(); if (s.kind === 'lay' && ['da_xep_chuyen', 'giao_that_bai', 'cho_xep_chuyen'].includes(o.status)) NG.pushHistory(o, 'dang_lay', 'Tài xế đến điểm lấy hàng', by); t.history.push({ status: t.status, at: NG.now(), by, note: 'Đến ' + (s.kind === 'lay' ? 'điểm lấy ' : 'điểm giao ') + s.addr.split(',')[0] }); NG.save(); redraw(); }
    if (a === 'picked') NG.modal('Xác nhận lấy hàng · ' + o.id, '<p class="sm">' + esc(o.goods) + '</p><div class="field" style="margin-top:10px"><label for="pq">Số lượng thực nhận (' + esc(o.unit) + ')</label><input class="input" id="pq" type="number" value="' + o.qty + '"></div><div class="field" style="margin-top:10px"><label for="pn">Ghi chú</label><input class="input" id="pn"></div>', (bg) => {
      const q = +bg.querySelector('#pq').value;
      if (!NG.validate(bg, [['pq', (x) => (!(+x > 0) ? 'Số lượng phải lớn hơn 0.' : '')]])) return false;
      s.status = 'xong'; s.doneAt = NG.now(); s.pod = { name: o.pickupContact, phone: o.pickupPhone, qty: q, note: bg.querySelector('#pn').value.trim(), photos: [], sign: null };
      NG.pushHistory(o, 'dang_giao', 'Đã lấy ' + q + ' ' + o.unit + (q !== o.qty ? ' (đơn ghi ' + o.qty + ')' : '') + ', bắt đầu giao', by);
      t.history.push({ status: t.status, at: NG.now(), by, note: 'Lấy hàng xong vận đơn ' + o.id }); NG.save(); NG.toast('Đã cập nhật lấy hàng.'); redraw();
    }, { okText: 'Xác nhận', danger: false });
    if (a === 'deliver') podModal(t, s, o, by);
    if (a === 'fail') NG.reasonModal('Giao thất bại · ' + o.id, 'Lý do', (why) => {
      s.status = 'that_bai'; s.doneAt = NG.now(); s.failReason = why; o.attempts++;
      NG.pushHistory(o, 'giao_that_bai', 'Giao thất bại lần ' + o.attempts + ': ' + why, by);
      t.history.push({ status: t.status, at: NG.now(), by, note: 'Giao thất bại vận đơn ' + o.id + ': ' + why });
      NG.log('Giao thất bại', o.id, by); NG.save(); NG.toast('Đã báo giao thất bại, hàng mang về kho trung chuyển.', 'warn'); redraw();
    }, { options: NG.FAIL_REASONS, okText: 'Xác nhận thất bại' });
    if (a === 'inc') NG.incidentModal(t, by, redraw);
    if (a === 'finish') costModal(t, by, true);
    if (a === 'costs') costModal(t, by, false);
  }

  /* Xác nhận giao hàng điện tử: ảnh + chữ ký người nhận */
  function podModal(t, s, o, by) {
    const bg = NG.modal('Xác nhận giao hàng · ' + o.id, '<div class="form"><div class="fgrid"><div class="field"><label for="g_n">Người nhận <span class="rq">*</span></label><input class="input" id="g_n" value="' + esc(o.receiver) + '"></div><div class="field"><label for="g_p">Số điện thoại</label><input class="input" id="g_p" value="' + esc(o.receiverPhone) + '"></div>' +
      '<div class="field"><label for="g_q">Số lượng giao (' + esc(o.unit) + ')</label><input class="input" id="g_q" type="number" value="' + o.qty + '"></div><div class="field"><label for="g_note">Ghi chú tình trạng hàng</label><input class="input" id="g_note"></div></div>' +
      '<div class="field"><label for="g_f">Ảnh giao hàng, phiếu giao nhận <span class="rq">*</span></label><input class="input" id="g_f" type="file" accept="image/*" multiple><div class="proof-prev" id="g_prev"></div></div>' +
      '<div class="field"><label>Chữ ký người nhận <span class="rq">*</span></label><canvas id="g_sig" class="sigpad" width="440" height="150" aria-label="Khung ký tên"></canvas><button type="button" class="btn sm ghost" id="g_clr" style="justify-self:start">Ký lại</button></div></div>', (bg) => {
      const ok = NG.validate(bg, [['g_n', NG.req('tên người nhận')], ['g_q', (x) => (!(+x > 0) ? 'Số lượng phải lớn hơn 0.' : '')], ['g_f', () => (!photos.length ? 'Cần ít nhất 1 ảnh giao hàng.' : '')]]);
      if (!ok) return false;
      if (!signed) { NG.toast('Vui lòng để người nhận ký vào khung chữ ký.', 'bad'); return false; }
      s.status = 'xong'; s.doneAt = NG.now(); if (!s.arrivedAt) s.arrivedAt = s.doneAt;
      s.pod = { name: bg.querySelector('#g_n').value.trim(), phone: bg.querySelector('#g_p').value.trim(), qty: +bg.querySelector('#g_q').value, note: bg.querySelector('#g_note').value.trim(), photos: photos.slice(), sign: cv.toDataURL('image/png'), signed: true };
      o.deliveredAt = s.doneAt; o.attempts++;
      NG.pushHistory(o, 'da_giao', 'Giao thành công, người nhận ' + s.pod.name, by);
      t.history.push({ status: t.status, at: NG.now(), by, note: 'Giao xong vận đơn ' + o.id });
      NG.log('Xác nhận giao hàng', o.id, by); NG.save(); NG.toast('Đã lưu biên bản giao nhận.'); NG.render();
    }, { okText: 'Hoàn tất giao hàng', danger: false });
    const photos = [];
    bg.querySelector('#g_f').onchange = (e) => { Array.from(e.target.files).slice(0, 4).forEach((f) => NG.readImage(f, (data) => { if (data) { photos.push({ name: f.name, data }); bg.querySelector('#g_prev').innerHTML = photos.map(NG.photoBox).join(''); } })); };
    const cv = bg.querySelector('#g_sig'), ctx = cv.getContext('2d');
    let drawing = false, signed = false;
    ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.strokeStyle = '#1b2a8a';
    const pt = (e) => { const r = cv.getBoundingClientRect(); const p = e.touches ? e.touches[0] : e; return [(p.clientX - r.left) * cv.width / r.width, (p.clientY - r.top) * cv.height / r.height]; };
    const down = (e) => { drawing = true; const [x, y] = pt(e); ctx.beginPath(); ctx.moveTo(x, y); e.preventDefault(); };
    const move = (e) => { if (!drawing) return; const [x, y] = pt(e); ctx.lineTo(x, y); ctx.stroke(); signed = true; e.preventDefault(); };
    const up = () => { drawing = false; };
    cv.addEventListener('mousedown', down); cv.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    cv.addEventListener('touchstart', down, { passive: false }); cv.addEventListener('touchmove', move, { passive: false }); cv.addEventListener('touchend', up);
    bg.querySelector('#g_clr').onclick = () => { ctx.clearRect(0, 0, cv.width, cv.height); signed = false; };
  }

  /* Kết thúc chuyến: km về bãi và các khoản chi phí kèm chứng từ */
  function costModal(t, by, finish) {
    const v = NG.vehicle(t.vehicleId);
    const rows = t.costs.length ? t.costs.map((c) => Object.assign({}, c)) : [{ type: 'Nhiên liệu', amount: '', note: '', receipt: null }, { type: 'Phí cầu đường', amount: '', note: '', receipt: null }];
    const bg = NG.modal((finish ? 'Kết thúc chuyến · ' : 'Bổ sung chi phí · ') + t.id, (finish ? '<div class="field"><label for="eo">Số km đồng hồ khi về bãi <span class="rq">*</span></label><input class="input" id="eo" type="number" inputmode="numeric" placeholder="Lúc xuất bến: ' + NG.num(t.startOdo) + '"><span class="hint">Quãng đường kế hoạch ' + t.planKm + ' km · định mức ' + v.fuelNorm + ' lít/100 km</span></div>' : (t.recon ? '<div class="alert warn sm">Kế toán yêu cầu: ' + esc(t.recon.note) + '</div>' : '')) +
      '<h3 style="margin:14px 0 8px">Chi phí trong chuyến</h3><div id="cr"></div><button type="button" class="btn sm ghost" id="addc">+ Thêm khoản chi</button><p class="hint" style="margin-top:8px">Khoản chi từ ' + NG.money(NG.RECEIPT_MIN) + ' phải chụp hóa đơn hoặc vé.</p>', (bg) => {
      let km = NG.tripKm(t);
      if (finish) {
        const eo = +bg.querySelector('#eo').value;
        if (!NG.validate(bg, [['eo', (x) => (!x ? 'Vui lòng nhập số km.' : +x <= t.startOdo ? 'Số km về bãi phải lớn hơn lúc xuất bến (' + NG.num(t.startOdo) + ').' : +x - t.startOdo > t.planKm * 3 ? 'Quãng đường gấp 3 lần kế hoạch, vui lòng kiểm tra lại.' : '')]])) return false;
        km = eo - t.startOdo;
      }
      const list = rows.filter((c) => c.amount !== '' && +c.amount > 0);
      if (!list.some((c) => c.type === 'Nhiên liệu')) { NG.toast('Vui lòng khai chi phí nhiên liệu của chuyến.', 'bad'); return false; }
      const miss = list.find((c) => +c.amount >= NG.RECEIPT_MIN && !c.receipt);
      if (miss) { NG.toast(miss.type + ' từ ' + NG.money(NG.RECEIPT_MIN) + ' cần ảnh chứng từ.', 'bad'); return false; }
      t.costs = list.map((c, i) => ({ id: t.id + '-C' + (i + 1), type: c.type, amount: +c.amount, note: c.note, receipt: c.receipt, by, at: NG.now() }));
      if (finish) { t.endOdo = +bg.querySelector('#eo').value; v.odo = t.endOdo; t.endAt = NG.now(); NG.pushHistory(t, 'hoan_thanh', 'Về bãi, số km đồng hồ ' + NG.num(t.endOdo) + ' (' + km + ' km), khai chi phí ' + NG.money(NG.tripCost(t)), by); }
      else { t.history.push({ status: t.status, at: NG.now(), by, note: 'Bổ sung chi phí, chứng từ theo yêu cầu kế toán' }); t.recon = null; }
      NG.log(finish ? 'Kết thúc chuyến' : 'Bổ sung chứng từ', t.id, by); NG.save(); NG.toast(finish ? 'Đã kết thúc chuyến, chuyển kế toán đối soát.' : 'Đã gửi lại cho kế toán.'); NG.render();
    }, { okText: finish ? 'Kết thúc chuyến' : 'Gửi lại kế toán', danger: false });
    const draw = () => {
      bg.querySelector('#cr').innerHTML = rows.map((c, i) => '<div class="cost-row"><select class="input" data-k="type" data-i="' + i + '" aria-label="Loại chi phí">' + NG.COST_TYPES.map((x) => '<option' + (x === c.type ? ' selected' : '') + '>' + x + '</option>').join('') + '</select><input class="input" data-k="amount" data-i="' + i + '" type="number" step="1000" placeholder="Số tiền" value="' + c.amount + '" aria-label="Số tiền"><input class="input" data-k="note" data-i="' + i + '" placeholder="Ghi chú" value="' + esc(c.note || '') + '" aria-label="Ghi chú">' +
        '<label class="btn sm ghost file-btn">' + (c.receipt ? '✓ ' + esc(c.receipt.name.slice(0, 14)) : 'Chụp chứng từ') + '<input type="file" accept="image/*" data-f="' + i + '" hidden></label><button type="button" class="icon-btn" data-del="' + i + '" aria-label="Xóa dòng">✕</button></div>').join('');
      $$('[data-k]', bg).forEach((x) => x.oninput = () => { rows[+x.dataset.i][x.dataset.k] = x.value; });
      $$('[data-f]', bg).forEach((x) => x.onchange = () => { const f = x.files[0]; if (f) NG.readImage(f, (data) => { rows[+x.dataset.f].receipt = { name: f.name, data }; draw(); }); });
      $$('[data-del]', bg.querySelector('#cr')).forEach((x) => x.onclick = (e) => { e.stopPropagation(); rows.splice(+x.dataset.del, 1); draw(); });
    };
    bg.querySelector('#addc').onclick = () => { rows.push({ type: 'Phí bốc xếp', amount: '', note: '', receipt: null }); draw(); };
    draw();
  }
})();
