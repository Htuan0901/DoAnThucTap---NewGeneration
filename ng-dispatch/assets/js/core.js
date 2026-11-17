/* Lõi hệ thống: lưu trữ, xác thực, phân quyền, nhật ký và các thành phần giao diện dùng chung */
(function () {
  const NG = (window.NG = window.NG || {});

  /* ---------- Mã hóa mật khẩu (SHA-256) ---------- */
  NG.hash = function (msg) {
    function r(n, x) { return (x >>> n) | (x << (32 - n)); }
    const K = [], H = [];
    let p = 2, c = 0;
    const isP = (n) => { for (let f = 2; f * f <= n; f++) if (n % f === 0) return false; return true; };
    const frac = (x) => ((x - Math.floor(x)) * 4294967296) | 0;
    while (c < 64) { if (isP(p)) { if (c < 8) H[c] = frac(Math.pow(p, 1 / 2)); K[c] = frac(Math.pow(p, 1 / 3)); c++; } p++; }
    const bytes = unescape(encodeURIComponent(msg));
    const words = [];
    const bl = bytes.length * 8;
    for (let i = 0; i < bytes.length; i++) words[i >> 2] |= bytes.charCodeAt(i) << (24 - (i % 4) * 8);
    words[bl >> 5] |= 0x80 << (24 - (bl % 32));
    words[(((bl + 64) >> 9) << 4) + 15] = bl;
    const h = H.slice();
    for (let j = 0; j < words.length; j += 16) {
      const w = words.slice(j, j + 16).map((x) => x | 0);
      const o = h.slice();
      for (let i = 0; i < 64; i++) {
        if (i >= 16) {
          const a = w[i - 15], b = w[i - 2];
          w[i] = (w[i - 16] + (r(7, a) ^ r(18, a) ^ (a >>> 3)) + w[i - 7] + (r(17, b) ^ r(19, b) ^ (b >>> 10))) | 0;
        }
        const e = h[4], t1 = (h[7] + (r(6, e) ^ r(11, e) ^ r(25, e)) + ((e & h[5]) ^ (~e & h[6])) + K[i] + w[i]) | 0;
        const a = h[0], t2 = ((r(2, a) ^ r(13, a) ^ r(22, a)) + ((a & h[1]) ^ (a & h[2]) ^ (h[1] & h[2]))) | 0;
        h.unshift((t1 + t2) | 0); h[4] = (h[4] + t1) | 0; h.pop();
      }
      for (let i = 0; i < 8; i++) h[i] = (h[i] + o[i]) | 0;
    }
    return h.map((x) => ('00000000' + (x >>> 0).toString(16)).slice(-8)).join('');
  };

  /* ---------- Lưu trữ ---------- */
  const KEY = 'ngd_db_v1';
  NG.ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* bộ nhớ trình duyệt bị chặn */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* bỏ qua */ } }
  };
  let DB = null;
  NG.db = function () {
    if (!DB) { DB = NG.ls.get(KEY, null); if (!DB || DB.v !== 1) { DB = NG.seed(); NG.save(); } }
    return DB;
  };
  NG.save = function () { NG.ls.set(KEY, DB); };
  NG.reset = function () { DB = NG.seed(); NG.save(); };
  NG.nextId = function (kind, prefix, pad) { const d = NG.db(); d.seq[kind] = (d.seq[kind] || 0) + 1; return prefix + String(d.seq[kind]).padStart(pad, '0'); };

  /* ---------- Tiện ích ---------- */
  NG.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  NG.now = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
  NG.fmtDT = (s) => (s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) + (s.length > 10 ? ' ' + s.slice(11, 16) : '') : '—');
  NG.fmtD = (s) => (s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : '—');
  NG.money = (n) => (n == null ? '—' : Math.round(n).toLocaleString('vi-VN') + ' đ');
  NG.num = (n) => Math.round(n).toLocaleString('vi-VN');
  NG.digits = (s) => String(s || '').replace(/\D/g, '');
  NG.phoneOk = (s) => /^0\d{9,10}$/.test(NG.digits(s)) && NG.digits(s).length === String(s).replace(/[\s.]/g, '').length;
  NG.customer = (id) => NG.db().customers.find((c) => c.id === id) || { name: id, short: id };
  NG.vehicle = (id) => NG.db().vehicles.find((v) => v.id === id) || { plate: '—', type: '', load: 0 };
  NG.driver = (id) => NG.db().drivers.find((d) => d.id === id) || { name: '—' };
  NG.order = (id) => NG.db().orders.find((o) => o.id === id);
  NG.trip = (id) => NG.db().trips.find((t) => t.id === id);
  NG.who = function (by) {
    if (!by) return '—';
    if (by === 'he-thong') return 'Hệ thống';
    if (by === 'khach-hang') return 'Khách hàng';
    const u = NG.db().users.find((x) => x.username === by); if (u) return u.name;
    const d = NG.db().drivers.find((x) => x.id === by); return d ? d.name + ' (tài xế)' : by;
  };
  NG.badge = (st, map) => { const s = (map || NG.ST.order)[st] || { label: st, tone: 'off' }; return '<span class="badge t-' + s.tone + '">' + s.label + '</span>'; };
  NG.tbadge = (st) => NG.badge(st, NG.ST.trip);
  NG.kg = (n) => (n >= 1000 ? (Math.round(n / 100) / 10).toLocaleString('vi-VN') + ' tấn' : NG.num(n) + ' kg');
  NG.today = () => NG.now().slice(0, 10);
  NG.addDays = (d, n) => { const x = new Date(d.slice(0, 10) + 'T00:00'); x.setDate(x.getDate() + n); return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  NG.addHours = (s, h) => { const x = new Date(s); x.setMinutes(x.getMinutes() + Math.round(h * 60)); return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
  NG.hhmm = (s) => (s ? s.slice(11, 16) : '—');

  /* ---------- Nghiệp vụ chuyến xe ---------- */
  NG.tripOrders = (t) => [...new Set(t.stops.map((s) => s.orderId))].map(NG.order).filter(Boolean);
  NG.tripWeight = (t) => NG.tripOrders(t).reduce((a, o) => a + o.weight, 0);
  NG.tripLoadPct = (t) => Math.round(NG.tripWeight(t) / (NG.vehicle(t.vehicleId).load * 1000) * 100);
  NG.tripProgress = (t) => { const n = t.stops.length, d = t.stops.filter((s) => s.status === 'xong' || s.status === 'that_bai').length; return { n, d, pct: n ? Math.round(d * 100 / n) : 0 }; };
  NG.curStop = (t) => t.stops.find((s) => s.status === 'cho' || s.status === 'da_den');
  NG.tripKm = (t) => (t.endOdo && t.startOdo ? t.endOdo - t.startOdo : t.planKm);
  NG.tripCost = (t) => t.costs.reduce((a, c) => a + c.amount, 0);
  NG.fuelCost = (t) => t.costs.filter((c) => c.type === 'Nhiên liệu').reduce((a, c) => a + c.amount, 0);
  /* Định mức nhiên liệu = km × định mức (lít/100 km) × đơn giá dầu */
  NG.fuelNorm = (t) => Math.round(NG.tripKm(t) * NG.vehicle(t.vehicleId).fuelNorm / 100 * NG.FUEL_PRICE);
  NG.fuelOver = (t) => { const n = NG.fuelNorm(t); return n ? Math.round((NG.fuelCost(t) - n) * 100 / n) : 0; };
  /* Điểm giao trễ: hoàn tất sau hạn giao, hoặc chưa giao mà đã quá hạn */
  NG.stopLate = (s) => { const o = NG.order(s.orderId); if (!o || s.kind !== 'giao') return false; return s.doneAt ? s.status === 'xong' && s.doneAt > o.deliverBy : s.status !== 'that_bai' && NG.now() > o.deliverBy; };
  NG.tripLate = (t) => t.stops.some(NG.stopLate);
  NG.isLate = (o) => (o.deliveredAt ? o.deliveredAt > o.deliverBy : ['da_xep_chuyen', 'dang_lay', 'dang_giao'].includes(o.status) && NG.now() > o.deliverBy);
  NG.pushHistory = function (obj, status, note, by) {
    obj.history.push({ status, at: NG.now(), by: by || (NG.user() || {}).username || 'he-thong', note });
    obj.status = status;
  };
  /* Kiểm tra trùng lịch xe, tài xế (khoảng thời gian kế hoạch giao nhau) */
  NG.busy = function (kind, id, start, end, exceptTrip) {
    return NG.db().trips.filter((t) => t.id !== exceptTrip && !['da_huy', 'hoan_thanh', 'da_doi_soat'].includes(t.status) && t[kind] === id && t.planStart < end && start < t.planEnd);
  };
  /* Bằng lái phù hợp tải trọng: B2 đến 3,5 tấn; C và FC trên 3,5 tấn */
  NG.licenseOk = (drv, veh) => (veh.load <= 3.5 ? true : ['C', 'FC'].includes(drv.license));

  /* ---------- Phiên đăng nhập và phân quyền ---------- */
  const SKEY = 'ngd_session';
  const IDLE = 30 * 60 * 1000;
  NG.user = function () {
    const s = NG.ls.get(SKEY, null);
    if (!s) return null;
    const u = NG.db().users.find((x) => x.username === s.username);
    if (!u) return null;
    return u;
  };
  NG.login = function (username, pass, remember) {
    const tries = NG.ls.get('ngd_tries', {});
    const t = tries[username] || { n: 0, until: 0 };
    if (t.until > Date.now()) return { ok: false, msg: 'Tài khoản tạm khóa do nhập sai nhiều lần. Vui lòng thử lại sau ' + Math.ceil((t.until - Date.now()) / 1000) + ' giây.' };
    const u = NG.db().users.find((x) => x.username === username.trim());
    if (!u || u.pass !== NG.hash(pass)) {
      t.n++; if (t.n >= 5) { t.until = Date.now() + 60000; t.n = 0; }
      tries[username] = t; NG.ls.set('ngd_tries', tries);
      NG.log('Đăng nhập thất bại', username || '(trống)', 'khach');
      return { ok: false, msg: 'Tên đăng nhập hoặc mật khẩu chưa chính xác.' };
    }
    if (u.locked) return { ok: false, msg: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.' };
    delete tries[username]; NG.ls.set('ngd_tries', tries);
    NG.ls.set(SKEY, { username: u.username, at: Date.now() });
    if (remember) NG.ls.set('ngd_remember', u.username); else NG.ls.del('ngd_remember');
    NG.log('Đăng nhập', u.username, u.username);
    return { ok: true, user: u };
  };
  NG.logout = function (msg) {
    const u = NG.user(); if (u && !msg) NG.log('Đăng xuất', u.username, u.username);
    NG.ls.del(SKEY);
    if (msg) NG.ls.set('ngd_flash', msg);
  };
  /* Kiểm tra phiên: hết hạn sau 30 phút không thao tác, tài khoản bị khóa thì kết thúc ngay */
  NG.checkSession = function () {
    const s = NG.ls.get(SKEY, null);
    if (!s) return null;
    const u = NG.user();
    if (!u) { NG.ls.del(SKEY); return null; }
    if (u.locked) { NG.logout('Tài khoản đã bị khóa trong lúc đang sử dụng. Vui lòng liên hệ quản trị viên.'); return null; }
    if (Date.now() - s.at > IDLE) { NG.logout('Phiên làm việc đã hết hạn do không thao tác trong 30 phút. Vui lòng đăng nhập lại.'); return null; }
    s.at = Date.now(); NG.ls.set(SKEY, s);
    return u;
  };
  NG.can = (page) => { const u = NG.user(); return !!u && NG.ROLES[u.role].menu.includes(page); };
  NG.may = (perm) => { const u = NG.user(); return !!u && (NG.ROLES[u.role].perms || []).includes(perm); };
  NG.role = () => (NG.user() || {}).role;
  NG.seePrice = () => NG.may('price');

  /* ---------- Nhật ký hệ thống ---------- */
  NG.log = function (action, object, user) {
    const d = NG.db();
    d.logs.unshift({ at: NG.now(), user: user || (NG.user() || {}).username || 'khach', action, object: object || '' });
    if (d.logs.length > 400) d.logs.length = 400;
    NG.save();
  };
  /* ---------- Thành phần giao diện ---------- */
  NG.$ = (s, r) => (r || document).querySelector(s);
  NG.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  NG.toast = function (msg, tone) {
    let box = NG.$('#toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
    const t = document.createElement('div');
    t.className = 'toast ' + (tone || 'ok'); t.setAttribute('role', 'status'); t.textContent = msg;
    box.appendChild(t); setTimeout(() => t.remove(), 4200);
  };
  /* Hộp thoại: fields = html; onOk(root) trả về false để giữ hộp thoại mở */
  NG.modal = function (title, body, onOk, opt) {
    opt = opt || {};
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = '<div class="modal' + (opt.wide ? ' wide' : '') + '" role="dialog" aria-modal="true" aria-label="' + NG.esc(title) + '"><div class="modal-h"><h3>' + NG.esc(title) + '</h3><button class="icon-btn" data-x aria-label="Đóng">✕</button></div>' +
      '<div class="modal-b">' + body + '<p class="form-err" data-err hidden></p></div><div class="modal-f">' +
      (opt.noCancel ? '' : '<button class="btn ghost" data-x>' + (opt.cancelText || 'Hủy') + '</button>') +
      (onOk ? '<button class="btn ' + (opt.danger ? 'danger' : 'primary') + '" data-ok>' + (opt.okText || 'Xác nhận') + '</button>' : '') + '</div></div>';
    document.body.appendChild(bg);
    const close = () => bg.remove();
    bg.addEventListener('click', (e) => { if (e.target === bg || e.target.closest('[data-x]')) close(); });
    const ok = bg.querySelector('[data-ok]');
    if (ok) ok.addEventListener('click', () => {
      const err = bg.querySelector('[data-err]'); err.hidden = true;
      const res = onOk(bg, (m) => { err.textContent = m; err.hidden = false; });
      if (res !== false) close();
    });
    const f = bg.querySelector('input,select,textarea'); if (f) setTimeout(() => f.focus(), 30);
    return bg;
  };
  NG.confirm = (title, msg, onOk, opt) => NG.modal(title, '<p>' + msg + '</p>', () => { onOk(); }, opt);

  /* Bảng có tìm kiếm, sắp xếp, phân trang */
  NG.table = function (el, cfg) {
    const st = { page: 1, sort: cfg.sort || null, dir: cfg.dir || -1 };
    function draw() {
      let rows = cfg.rows().slice();
      if (st.sort) { const c = cfg.cols.find((x) => x.key === st.sort); const v = (c && c.sortVal) || ((r) => r[st.sort]); rows.sort((a, b) => (v(a) > v(b) ? 1 : v(a) < v(b) ? -1 : 0) * st.dir); }
      const size = cfg.size || 10, pages = Math.max(1, Math.ceil(rows.length / size));
      if (st.page > pages) st.page = pages;
      const view = rows.slice((st.page - 1) * size, st.page * size);
      el.innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + cfg.cols.map((c) => '<th' + (c.num ? ' class="num"' : '') + '>' + (c.sortable !== false && c.key ? '<button class="th-sort" data-k="' + c.key + '">' + c.label + (st.sort === c.key ? (st.dir > 0 ? ' ▲' : ' ▼') : '') + '</button>' : c.label) + '</th>').join('') + '</tr></thead><tbody>' +
        (view.length ? view.map((r) => '<tr' + (cfg.rowAttr ? cfg.rowAttr(r) : '') + '>' + cfg.cols.map((c) => '<td' + (c.num ? ' class="num"' : '') + '>' + (c.html ? c.html(r) : NG.esc(r[c.key])) + '</td>').join('') + '</tr>').join('') : '<tr><td colspan="' + cfg.cols.length + '" class="empty">' + (cfg.empty || 'Không có dữ liệu phù hợp.') + '</td></tr>') +
        '</tbody></table></div><div class="pager"><span>' + (rows.length ? 'Hiển thị ' + ((st.page - 1) * size + 1) + '–' + Math.min(st.page * size, rows.length) + ' trong ' + rows.length : '0 kết quả') + '</span><span class="pg-btns"><button class="btn sm ghost" data-p="-1"' + (st.page <= 1 ? ' disabled' : '') + '>‹ Trước</button><b>' + st.page + '/' + pages + '</b><button class="btn sm ghost" data-p="1"' + (st.page >= pages ? ' disabled' : '') + '>Sau ›</button></span></div>';
      NG.$$('.th-sort', el).forEach((b) => b.onclick = () => { if (st.sort === b.dataset.k) st.dir = -st.dir; else { st.sort = b.dataset.k; st.dir = 1; } draw(); });
      NG.$$('[data-p]', el).forEach((b) => b.onclick = () => { st.page += +b.dataset.p; draw(); });
      if (cfg.after) cfg.after(el);
    }
    draw();
    return { redraw: () => { st.page = 1; draw(); }, refresh: draw };
  };

  /* Kiểm tra biểu mẫu: rules = [[id, fn(value) -> thông báo lỗi | '']] */
  NG.validate = function (root, rules) {
    let first = null;
    NG.$$('.f-err', root).forEach((e) => e.remove());
    NG.$$('.invalid', root).forEach((e) => e.classList.remove('invalid'));
    rules.forEach(([id, fn]) => {
      const el = root.querySelector('#' + id); if (!el) return;
      const m = fn(el.value.trim(), el);
      if (m) {
        el.classList.add('invalid'); el.setAttribute('aria-invalid', 'true');
        const s = document.createElement('div'); s.className = 'f-err'; s.textContent = m;
        (el.closest('.field') || el.parentNode).appendChild(s);
        if (!first) first = el;
      } else el.removeAttribute('aria-invalid');
    });
    if (first) first.focus();
    return !first;
  };
  NG.req = (label) => (v) => (v ? '' : 'Vui lòng nhập ' + label + '.');

  /* Tải tệp (CSV mở được bằng Excel) */
  NG.download = function (name, rows) {
    const csv = '﻿' + rows.map((r) => r.map((c) => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
  };

  /* Biểu đồ cột SVG */
  NG.bars = function (data, opt) {
    opt = opt || {};
    const W = 560, H = 220, L = 44, B = 34, T = 14;
    const max = Math.max(1, ...data.map((d) => d.v));
    const step = Math.pow(10, Math.floor(Math.log10(max))); const top = Math.ceil(max / step) * step;
    const bw = (W - L - 10) / data.length;
    let g = '';
    for (let i = 0; i <= 4; i++) { const y = T + (H - T - B) * (1 - i / 4); g += '<line x1="' + L + '" x2="' + (W - 6) + '" y1="' + y + '" y2="' + y + '" class="grid"/><text x="' + (L - 6) + '" y="' + (y + 4) + '" text-anchor="end" class="ax">' + (opt.fmt ? opt.fmt(top * i / 4) : NG.num(top * i / 4)) + '</text>'; }
    data.forEach((d, i) => {
      const h = (H - T - B) * d.v / top, x = L + i * bw + bw * 0.18, y = H - B - h;
      g += '<rect x="' + x + '" y="' + y + '" width="' + bw * 0.64 + '" height="' + Math.max(h, 0) + '" rx="3" class="bar' + (d.hl ? ' hl' : '') + '"><title>' + NG.esc(d.k + ': ' + (opt.fmt ? opt.fmt(d.v) : d.v)) + '</title></rect>' +
        '<text x="' + (x + bw * 0.32) + '" y="' + (H - B + 16) + '" text-anchor="middle" class="ax">' + NG.esc(d.k) + '</text>' +
        (d.v ? '<text x="' + (x + bw * 0.32) + '" y="' + (y - 4) + '" text-anchor="middle" class="val">' + (opt.short ? opt.short(d.v) : d.v) + '</text>' : '');
    });
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + NG.esc(opt.label || 'Biểu đồ') + '">' + g + '</svg>';
  };
})();
