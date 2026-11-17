/* Khung ứng dụng: điều hướng, đăng nhập, thanh bên, thông báo, trang tổng quan */
(function () {
  const NG = window.NG;
  const { esc, $, $$ } = NG;
  NG.V = {};

  /* Biểu tượng (SVG nét) */
  const P = {
    'tong-quan': 'M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z',
    'van-don': 'M4 4h16v16H4zM8 8h8M8 12h8M8 16h5',
    'lap-chuyen': 'M4 6h10M4 12h7M4 18h10M17 9l3 3-3 3M14 12h6',
    'chuyen-xe': 'M2 15V6h12v9M14 9h4l4 4v2h-2M2 15h2M8 15h8M6 17a2 2 0 1 0 0-.1M18 17a2 2 0 1 0 0-.1',
    'giam-sat': 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 10a2 2 0 1 0 0-.1',
    'doi-soat': 'M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2zM9 8h6M9 12h6M9 16h3',
    'phuong-tien': 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-.1M17 19a2 2 0 1 0 0-.1',
    'tai-xe': 'M12 12a4 4 0 1 0 0-.1M5 21a7 7 0 0 1 14 0',
    'khach-hang': 'M16 19v-1a4 4 0 0 0-8 0v1M12 11a3 3 0 1 0 0-.1M20 19v-1a3 3 0 0 0-2-2.8M4 19v-1a3 3 0 0 1 2-2.8',
    'bao-cao': 'M4 20V10M10 20V4M16 20v-7M22 20H2',
    'quan-tri': 'M12 15a3 3 0 1 0 0-.1M4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4',
    'chuyen-cua-toi': 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 10a2 2 0 1 0 0-.1',
    bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 0 0 4 0',
    search: 'M11 18a7 7 0 1 0 0-.1M20 20l-4-4',
    menu: 'M4 7h16M4 12h16M4 17h16',
    warn: 'M12 3l10 18H2zM12 10v4M12 17v.5',
    check: 'M5 12l5 5 9-10'
  };
  NG.icon = (k, s) => '<svg class="ic" width="' + (s || 16) + '" height="' + (s || 16) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + (P[k] || '') + '"/></svg>';
  NG.MENU = {
    'tong-quan': 'Tổng quan', 'van-don': 'Vận đơn', 'lap-chuyen': 'Lập chuyến', 'chuyen-xe': 'Chuyến xe', 'giam-sat': 'Giám sát hành trình', 'doi-soat': 'Đối soát chuyến',
    'phuong-tien': 'Phương tiện', 'tai-xe': 'Tài xế', 'khach-hang': 'Khách hàng', 'bao-cao': 'Báo cáo', 'quan-tri': 'Quản trị', 'chuyen-cua-toi': 'Chuyến của tôi'
  };
  const GROUPS = [['', ['tong-quan']], ['Điều phối', ['van-don', 'lap-chuyen', 'chuyen-xe', 'giam-sat']], ['Kế toán', ['doi-soat']], ['Danh mục', ['phuong-tien', 'tai-xe', 'khach-hang']], ['Quản lý', ['bao-cao', 'quan-tri']]];

  /* Giao diện sáng/tối */
  const th = NG.ls.get('ngd_theme', null); if (th) document.documentElement.dataset.theme = th;
  NG.toggleTheme = function () {
    const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const nx = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = nx; NG.ls.set('ngd_theme', nx);
  };

  /* ---------- Điều hướng ---------- */
  NG.go = (h) => { if (location.hash === h) render(); else location.hash = h; };
  NG.route = () => { const h = (location.hash || '').replace(/^#\/?/, ''); const [path, q] = h.split('?'); return { parts: path.split('/').filter(Boolean).map(decodeURIComponent), q: new URLSearchParams(q || '') }; };

  function render() {
    $$('.menu-pop').forEach((m) => m.remove());
    const r = NG.route();
    const u = NG.checkSession();
    if (!u) {
      if (r.parts[0] !== 'dang-nhap') { location.replace('#/dang-nhap'); return; }
      return NG.V.login();
    }
    const role = NG.ROLES[u.role];
    const page = r.parts[0];
    if (!page || page === 'dang-nhap') { location.replace('#/' + role.menu[0]); return; }
    shell(u, page);
    const view = $('#view');
    if (!role.menu.includes(page)) {
      view.innerHTML = '<div class="card card-b" style="max-width:560px;margin:40px auto;text-align:center"><h2>Bạn không có quyền truy cập chức năng này</h2><p class="mut" style="margin:8px 0 16px">Vai trò ' + esc(role.label) + ' không được phân quyền vào mục «' + esc(NG.MENU[page] || page) + '».</p><a class="btn primary" href="#/' + role.menu[0] + '">Về trang chính</a></div>';
      return;
    }
    const fn = NG.V[page];
    document.title = (NG.MENU[page] || 'NG Dispatch') + ' · NG Dispatch';
    window.scrollTo(0, 0);
    if (fn) fn(view, r); else view.innerHTML = '<p>Đang xây dựng.</p>';
  }
  NG.render = render;
  window.addEventListener('hashchange', render);

  /* Gia hạn phiên khi thao tác; tự đăng xuất khi hết hạn */
  let lastTouch = 0;
  ['click', 'keydown'].forEach((ev) => document.addEventListener(ev, () => { if (Date.now() - lastTouch > 15000 && NG.user()) { lastTouch = Date.now(); if (!NG.checkSession()) render(); } }, true));
  setInterval(() => { if (NG.ls.get('ngd_session', null) && !NG.checkSession()) render(); }, 30000);
  window.addEventListener('storage', (e) => { if (e.key === 'ngd_db_v1') location.reload(); if (e.key === 'ngd_session' && !e.newValue) render(); });

  /* ---------- Khung trang sau khi đăng nhập ---------- */
  function shell(u, page) {
    const role = NG.ROLES[u.role];
    const n = NG.notifications(u);
    const init = u.name.split(' ').slice(-1)[0][0];
    if (u.role === 'taixe') {
      document.body.innerHTML = '<header class="drv-top"><a class="brand" href="#/chuyen-cua-toi"><img src="assets/img/logo.png" alt=""><span>NG Dispatch<small>ỨNG DỤNG TÀI XẾ</small></span></a><button class="user-chip" id="me" aria-haspopup="true"><span class="avatar">' + esc(init) + '</span></button></header><main class="drv" id="view"></main><div id="toasts" aria-live="polite"></div>';
    } else {
      const badge = { 'van-don': NG.db().orders.filter((o) => ['cho_xep_chuyen', 'giao_that_bai'].includes(o.status)).length, 'doi-soat': NG.db().trips.filter((t) => t.status === 'hoan_thanh' && !t.recon).length, 'giam-sat': NG.db().trips.reduce((a, t) => a + t.incidents.filter((i) => i.status === 'moi').length, 0) };
      document.body.innerHTML = '<div class="app"><aside class="side" id="side"><a class="brand" href="#/' + role.menu[0] + '"><img src="assets/img/logo.png" alt=""><span>NG Dispatch<small>ĐIỀU PHỐI · GIAO NHẬN</small></span></a><nav aria-label="Chức năng">' +
        GROUPS.map(([g, items]) => { const mine = items.filter((m) => role.menu.includes(m)); return mine.length ? (g ? '<div class="grp">' + g + '</div>' : '') + mine.map((m) => '<a href="#/' + m + '"' + (m === page ? ' class="on" aria-current="page"' : '') + '>' + NG.icon(m, 18) + NG.MENU[m] + (badge[m] ? '<span class="n">' + badge[m] + '</span>' : '') + '</a>').join('') : ''; }).join('') +
        '</nav><div class="side-foot">' + esc(NG.COMPANY.short) + ' · MST ' + NG.COMPANY.tax + '</div></aside>' +
        '<div class="main"><header class="topbar"><div class="topbar-in"><button class="icon-btn burger" id="burger" aria-label="Mở menu">' + NG.icon('menu', 20) + '</button>' +
        '<div class="gsearch"><label class="sr" for="gs" hidden>Tìm kiếm</label>' + NG.icon('search') + '<input class="input" id="gs" placeholder="Tìm mã vận đơn, mã chuyến, biển số…" autocomplete="off"><div class="gs-res" id="gsr" hidden></div></div>' +
        '<div class="top-actions"><button class="icon-btn" id="bell" aria-label="Thông báo">' + NG.icon('bell', 19) + (n.length ? '<span class="dot">' + n.length + '</span>' : '') + '</button>' +
        '<button class="user-chip" id="me" aria-haspopup="true"><span class="avatar">' + esc(init) + '</span><span class="who">' + esc(u.name) + '<small>' + esc(role.label) + '</small></span></button></div></div></header>' +
        '<main class="page" id="view"></main></div></div><div id="toasts" aria-live="polite"></div>';
      $('#burger').onclick = (e) => { e.stopPropagation(); $('#side').classList.toggle('open'); };
      document.addEventListener('click', (e) => { const sd = $('#side'); if (sd && sd.classList.contains('open') && !sd.contains(e.target)) sd.classList.remove('open'); });
      search();
      $('#bell').onclick = (e) => { e.stopPropagation(); pop('notif', '<div class="mp-h"><b>Thông báo</b> <span class="mut sm">(' + n.length + ')</span></div><div class="notif-list">' + (n.length ? n.map((x) => '<a class="notif" href="' + x.href + '">' + esc(x.text) + '<small>' + esc(x.sub) + '</small></a>').join('') : '<p class="mut" style="padding:14px">Không có việc cần xử lý.</p>') + '</div>'); };
    }
    $('#me').onclick = (e) => {
      e.stopPropagation();
      pop('me', '<div class="mp-h"><b>' + esc(u.name) + '</b><div class="mut sm">' + esc(u.username) + ' · ' + esc(role.label) + '</div></div>' +
        '<button data-a="pw">Đổi mật khẩu</button><button data-a="theme">Chuyển giao diện sáng/tối</button><a class="mi" href="index.html">Mở trang web công ty</a>' +
        '<button data-a="reset">Khôi phục dữ liệu mẫu</button><button data-a="out" style="color:var(--bad)">Đăng xuất</button>');
      const m = $('.menu-pop');
      m.querySelector('[data-a=pw]').onclick = changePw;
      m.querySelector('[data-a=theme]').onclick = () => { NG.toggleTheme(); m.remove(); };
      m.querySelector('[data-a=reset]').onclick = () => NG.confirm('Khôi phục dữ liệu mẫu', 'Toàn bộ dữ liệu đã thao tác trên trình duyệt này sẽ được thay bằng dữ liệu mẫu ban đầu. Bạn vẫn giữ phiên đăng nhập.', () => { NG.reset(); NG.toast('Đã khôi phục dữ liệu mẫu.'); render(); }, { danger: true, okText: 'Khôi phục' });
      m.querySelector('[data-a=out]').onclick = () => { NG.logout(); NG.go('#/dang-nhap'); };
    };
  }
  function pop(kind, html) {
    const ex = $('.menu-pop'); if (ex) { ex.remove(); if (ex.dataset.k === kind) return; }
    const d = document.createElement('div'); d.className = 'menu-pop'; d.dataset.k = kind; d.innerHTML = html;
    document.body.appendChild(d);
    setTimeout(() => document.addEventListener('click', function h(e) { if (!d.contains(e.target) || e.target.closest('a')) { d.remove(); document.removeEventListener('click', h); } }), 0);
  }
  /* Tìm nhanh vận đơn, chuyến, xe, khách hàng */
  function search() {
    const inp = $('#gs'), box = $('#gsr');
    inp.addEventListener('input', () => {
      const q = inp.value.trim().toLowerCase();
      if (q.length < 2) { box.hidden = true; return; }
      const d = NG.db(), out = [];
      if (NG.can('van-don')) d.orders.filter((o) => [o.id, o.receiver, NG.customer(o.customerId).short].join(' ').toLowerCase().includes(q)).slice(0, 5).forEach((o) => out.push(['#/van-don/' + o.id, o.id, NG.customer(o.customerId).short + ' · ' + NG.ST.order[o.status].label]));
      if (NG.can('chuyen-xe') || NG.can('giam-sat')) d.trips.filter((t) => [t.id, NG.vehicle(t.vehicleId).plate, NG.driver(t.driverId).name].join(' ').toLowerCase().includes(q)).slice(-5).reverse().forEach((t) => out.push(['#/chuyen-xe/' + t.id, t.id, NG.vehicle(t.vehicleId).plate + ' · ' + NG.driver(t.driverId).name + ' · ' + NG.ST.trip[t.status].label]));
      if (NG.can('phuong-tien')) d.vehicles.filter((v) => v.plate.toLowerCase().includes(q)).forEach((v) => out.push(['#/phuong-tien', v.plate, v.type + ' ' + String(v.load).replace('.', ',') + ' tấn']));
      box.innerHTML = out.length ? out.slice(0, 10).map((x) => '<a href="' + x[0] + '"><b>' + esc(x[1]) + '</b><small>' + esc(x[2]) + '</small></a>').join('') : '<a>Không tìm thấy kết quả</a>';
      box.hidden = false;
    });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const a = box.querySelector('a[href]'); if (a) location.hash = a.getAttribute('href'); } if (e.key === 'Escape') box.hidden = true; });
    document.addEventListener('click', (e) => { if (!e.target.closest('.gsearch')) box.hidden = true; });
  }
  function changePw() {
    NG.modal('Đổi mật khẩu', '<div class="form"><div class="field"><label for="p0">Mật khẩu hiện tại</label><input class="input" type="password" id="p0" autocomplete="current-password"></div><div class="field"><label for="p1">Mật khẩu mới</label><input class="input" type="password" id="p1" autocomplete="new-password"><span class="hint">Tối thiểu 6 ký tự, có cả chữ và số.</span></div><div class="field"><label for="p2">Nhập lại mật khẩu mới</label><input class="input" type="password" id="p2" autocomplete="new-password"></div></div>', (bg) => {
      const u = NG.user();
      const ok = NG.validate(bg, [['p0', (v) => (!v ? 'Vui lòng nhập mật khẩu hiện tại.' : NG.hash(v) !== u.pass ? 'Mật khẩu hiện tại không đúng.' : '')],
        ['p1', (v) => (v.length < 6 || !/\d/.test(v) || !/[a-zA-Z]/.test(v) ? 'Mật khẩu mới phải có ít nhất 6 ký tự, gồm chữ và số.' : '')],
        ['p2', (v) => (v !== bg.querySelector('#p1').value.trim() ? 'Mật khẩu nhập lại không khớp.' : '')]]);
      if (!ok) return false;
      u.pass = NG.hash(bg.querySelector('#p1').value.trim()); NG.save(); NG.log('Đổi mật khẩu', u.username); NG.toast('Đã đổi mật khẩu.');
    }, { okText: 'Lưu' });
  }

  /* ---------- Thông báo theo vai trò ---------- */
  NG.notifications = function (u) {
    const d = NG.db(), out = [], r = u.role, now = NG.now(), tm = NG.addDays(NG.today(), 1);
    const add = (text, sub, href) => out.push({ text, sub, href });
    const incidents = [];
    d.trips.forEach((t) => t.incidents.forEach((i) => incidents.push([t, i])));
    if (['dieuphoi', 'admin'].includes(r)) {
      d.orders.filter((o) => o.status === 'giao_that_bai').forEach((o) => add('Vận đơn ' + o.id + ' giao thất bại, cần xếp lại', NG.customer(o.customerId).short + ' · lần giao ' + o.attempts + '/' + NG.MAX_ATTEMPTS, '#/van-don/' + o.id));
      const wait = d.orders.filter((o) => o.status === 'cho_xep_chuyen' && o.pickupFrom.slice(0, 10) <= tm);
      if (wait.length) add(wait.length + ' vận đơn chờ xếp chuyến', 'Lấy hàng hôm nay và ngày mai', '#/lap-chuyen');
      d.trips.filter((t) => t.status === 'da_phan_cong' && t.rejected).forEach((t) => add('Tài xế từ chối chuyến ' + t.id, t.rejected, '#/chuyen-xe/' + t.id));
      d.trips.filter((t) => t.status === 'da_phan_cong' && !t.rejected && NG.addHours(t.history.slice(-1)[0].at, 0.5) < now).forEach((t) => add('Chuyến ' + t.id + ' quá 30 phút chưa được nhận', NG.driver(t.driverId).name + ' · xuất bến ' + NG.fmtDT(t.planStart), '#/chuyen-xe/' + t.id));
    }
    if (['dieuphoi', 'cskh', 'admin', 'giamdoc'].includes(r)) incidents.filter(([, i]) => i.status === 'moi').forEach(([t, i]) => add('Sự cố chuyến ' + t.id + ': ' + i.type, NG.fmtDT(i.at) + ' · ' + NG.who(i.by), '#/chuyen-xe/' + t.id + '?tab=su-co'));
    if (['cskh', 'kinhdoanh'].includes(r)) d.orders.filter((o) => o.status === 'giao_that_bai').forEach((o) => add('Báo khách: vận đơn ' + o.id + ' giao thất bại', NG.customer(o.customerId).short + ' · ' + o.receiver, '#/van-don/' + o.id));
    if (['cskh', 'giamdoc'].includes(r)) d.trips.filter((t) => t.status === 'dang_chay').forEach((t) => t.stops.filter((s) => s.kind === 'giao' && s.status !== 'xong' && s.status !== 'that_bai' && NG.stopLate(s)).forEach((s) => add('Vận đơn ' + s.orderId + ' đang trễ hạn giao', 'Chuyến ' + t.id + ' · hạn ' + NG.fmtDT(NG.order(s.orderId).deliverBy), '#/van-don/' + s.orderId)));
    if (['ketoan', 'admin'].includes(r)) d.trips.filter((t) => t.status === 'hoan_thanh' && !t.recon).forEach((t) => add('Chuyến ' + t.id + ' chờ đối soát', NG.vehicle(t.vehicleId).plate + ' · ' + NG.num(NG.tripKm(t)) + ' km', '#/doi-soat/' + t.id));
    if (r === 'giamdoc') d.trips.filter((t) => t.endOdo && t.date >= NG.addDays(NG.today(), -7) && NG.fuelOver(t) > NG.FUEL_TOLERANCE).forEach((t) => add('Chuyến ' + t.id + ' vượt định mức nhiên liệu ' + NG.fuelOver(t) + '%', NG.vehicle(t.vehicleId).plate + ' · ' + NG.driver(t.driverId).name, '#/chuyen-xe/' + t.id + '?tab=chi-phi'));
    if (r === 'taixe') {
      d.trips.filter((t) => t.driverId === u.driverId && t.status === 'da_phan_cong' && !t.rejected).forEach((t) => add('Chuyến mới ' + t.id + ' chờ bạn nhận', 'Xuất bến ' + NG.fmtDT(t.planStart), '#/chuyen-cua-toi'));
      d.trips.filter((t) => t.driverId === u.driverId && t.recon && t.recon.status === 'tra_lai').forEach((t) => add('Kế toán trả lại chi phí chuyến ' + t.id, t.recon.note, '#/chuyen-cua-toi?tab=xong'));
    }
    return out;
  };

  /* ---------- Biểu đồ lịch chạy xe trong ngày (Gantt) ---------- */
  NG.gantt = function (date, opt) {
    opt = opt || {};
    const d = NG.db();
    const trips = d.trips.filter((t) => t.date === date && t.status !== 'da_huy');
    const H0 = 6, H1 = 21, span = H1 - H0;
    const pos = (s) => { const h = +s.slice(11, 13) + +s.slice(14, 16) / 60 + (s.slice(0, 10) > date ? 24 : s.slice(0, 10) < date ? -24 : 0); return Math.max(0, Math.min(100, (h - H0) / span * 100)); };
    const vs = d.vehicles.filter((v) => v.status !== 'ngung');
    const nowP = NG.today() === date ? pos(NG.now()) : -1;
    const tone = { ke_hoach: 'off', da_phan_cong: 'wait', da_nhan: 'info', dang_chay: 'move', hoan_thanh: 'done', da_doi_soat: 'done' };
    let h = '<div class="gantt"><div class="g-row g-head"><div class="g-l">Phương tiện</div><div class="g-t">';
    for (let i = H0; i <= H1; i += 1) h += '<span style="left:' + ((i - H0) / span * 100) + '%">' + i + 'h</span>';
    h += '</div></div>';
    vs.forEach((v) => {
      const mine = trips.filter((t) => t.vehicleId === v.id);
      h += '<div class="g-row"><div class="g-l"><b>' + esc(v.plate) + '</b><small>' + esc(v.type.replace('Xe tải ', '')) + ' · ' + String(v.load).replace('.', ',') + ' t</small></div><div class="g-t">' +
        (v.status === 'bao_duong' ? '<div class="g-maint">Bảo dưỡng</div>' : '') +
        mine.map((t) => { const a = pos(t.planStart), b = pos(t.endAt || t.planEnd); return '<a class="g-bar t-' + tone[t.status] + '" href="' + (opt.href ? opt.href(t) : '#/chuyen-xe/' + t.id) + '" style="left:' + a + '%;width:' + Math.max(4, b - a) + '%" title="' + esc(t.id + ' · ' + NG.driver(t.driverId).name + ' · ' + NG.hhmm(t.planStart) + '–' + NG.hhmm(t.planEnd) + ' · ' + NG.ST.trip[t.status].label) + '"><b>' + t.id.slice(-3) + '</b> ' + esc(NG.driver(t.driverId).name.split(' ').slice(-1)[0]) + '</a>'; }).join('') +
        (nowP > 0 && nowP < 100 ? '<i class="g-now" style="left:' + nowP + '%"></i>' : '') + '</div></div>';
    });
    return h + '</div><div class="legend" style="padding:10px 0 0">' + [['off', 'Kế hoạch'], ['wait', 'Chờ tài xế nhận'], ['info', 'Tài xế đã nhận'], ['move', 'Đang chạy'], ['done', 'Hoàn thành']].map((x) => '<span><i class="lg t-' + x[0] + '"></i>' + x[1] + '</span>').join('') + (nowP > 0 ? '<span><i class="lg" style="background:var(--accent)"></i>Thời điểm hiện tại</span>' : '') + '</div>';
  };

  /* ---------- Đăng nhập ---------- */
  NG.V.login = function () {
    document.title = 'Đăng nhập · NG Dispatch';
    const flash = NG.ls.get('ngd_flash', ''); NG.ls.del('ngd_flash');
    const rem = NG.ls.get('ngd_remember', '');
    document.body.innerHTML = '<div class="login"><section class="login-art"><div><a class="brand" href="index.html"><img src="assets/img/logo.png" alt=""><span>NG Dispatch<small>NEW GENERATION</small></span></a></div>' +
      '<div><h1>Hệ thống điều phối và giao nhận hàng hóa</h1><p>Gom vận đơn thành chuyến, phân công xe và tài xế, theo dõi từng điểm dừng, xác nhận giao nhận và đối soát chi phí chuyến trên cùng một hệ thống.</p>' +
      '<ul><li><b>1</b>Điều phối lập chuyến theo tải trọng và lịch xe</li><li><b>2</b>Tài xế cập nhật điểm dừng, chụp ảnh và lấy chữ ký người nhận</li><li><b>3</b>Kế toán đối soát quãng đường, nhiên liệu và chi phí</li></ul></div>' +
      '<p class="sm" style="opacity:.7">' + esc(NG.COMPANY.name) + ' · MST ' + NG.COMPANY.tax + '</p>' +
      '<svg class="road" viewBox="0 0 200 80" fill="none" stroke="#fff" stroke-width="3"><path d="M10 50h90V18h40l22 18v14h-8"/><circle cx="40" cy="60" r="9"/><circle cx="140" cy="60" r="9"/></svg></section>' +
      '<section class="login-box"><form class="login-form form" id="lf" novalidate><div><h2>Đăng nhập</h2><p class="mut">Dành cho nhân viên và tài xế của công ty</p></div>' +
      (flash ? '<div class="alert warn" role="alert">' + esc(flash) + '</div>' : '') +
      '<div class="field"><label for="un">Tên đăng nhập</label><input class="input" id="un" autocomplete="username" value="' + esc(rem) + '"></div>' +
      '<div class="field"><label for="pw">Mật khẩu</label><div class="pw"><input class="input" id="pw" type="password" autocomplete="current-password"><button type="button" id="eye">Hiện</button></div></div>' +
      '<label class="check"><input type="checkbox" id="rm"' + (rem ? ' checked' : '') + '> Ghi nhớ tên đăng nhập</label>' +
      '<p class="form-err" id="le" hidden role="alert"></p><button class="btn primary" style="width:100%;min-height:44px">Đăng nhập</button>' +
      '<div class="demo">Tài khoản dùng thử (mật khẩu <b>123456</b>):<br>' + ['dieuphoi', 'taixe', 'ketoan', 'cskh', 'kinhdoanh', 'giamdoc', 'admin'].map((x) => '<button type="button" data-u="' + x + '">' + x + '</button>').join('') + '</div>' +
      '<p class="sm" style="text-align:center"><a href="index.html">← Về trang web công ty</a></p></form></section></div><div id="toasts"></div>';
    $('#eye').onclick = () => { const p = $('#pw'); p.type = p.type === 'password' ? 'text' : 'password'; $('#eye').textContent = p.type === 'password' ? 'Hiện' : 'Ẩn'; };
    $$('[data-u]').forEach((b) => b.onclick = () => { $('#un').value = b.dataset.u; $('#pw').value = '123456'; $('#pw').focus(); });
    $('#lf').onsubmit = (e) => {
      e.preventDefault();
      const le = $('#le'); le.hidden = true;
      if (!NG.validate($('#lf'), [['un', NG.req('tên đăng nhập')], ['pw', NG.req('mật khẩu')]])) return;
      const res = NG.login($('#un').value, $('#pw').value, $('#rm').checked);
      if (!res.ok) { le.textContent = res.msg; le.hidden = false; return; }
      location.hash = '#/' + NG.ROLES[res.user.role].menu[0];
      render();
    };
    if (!rem) $('#un').focus(); else $('#pw').focus();
  };

  /* ---------- Tổng quan ---------- */
  NG.V['tong-quan'] = function (el) {
    const u = NG.user(), d = NG.db(), role = u.role, T = NG.today();
    const todayTrips = d.trips.filter((t) => t.date === T && t.status !== 'da_huy');
    const running = d.trips.filter((t) => t.status === 'dang_chay');
    const since = NG.addDays(T, -30);
    const delivered = d.orders.filter((o) => o.deliveredAt && o.deliveredAt.slice(0, 10) >= since);
    const onTime = delivered.length ? Math.round(delivered.filter((o) => o.deliveredAt <= o.deliverBy).length * 100 / delivered.length) : 100;
    const done = d.trips.filter((t) => t.endOdo && t.date >= since);
    const util = done.length ? Math.round(done.reduce((a, t) => a + NG.tripLoadPct(t), 0) / done.length) : 0;
    const waitN = d.orders.filter((o) => o.status === 'cho_xep_chuyen').length, failN = d.orders.filter((o) => o.status === 'giao_that_bai').length;
    const openInc = d.trips.reduce((a, t) => a + t.incidents.filter((i) => i.status !== 'da_xu_ly').length, 0);
    const kp = [
      ['Chuyến xe hôm nay', todayTrips.length, running.length + ' đang chạy · ' + todayTrips.filter((t) => t.endOdo).length + ' đã về bãi', ''],
      ['Vận đơn chờ xếp chuyến', waitN + failN, failN ? failN + ' đơn giao thất bại cần xếp lại' : 'Không có đơn giao thất bại', failN ? 'red' : 'amber'],
      ['Giao đúng hạn (30 ngày)', onTime + '%', delivered.length + ' vận đơn đã giao', 'green'],
      NG.seePrice() ? ['Chi phí vận hành / km (30 ngày)', NG.num(done.reduce((a, t) => a + NG.tripCost(t), 0) / Math.max(1, done.reduce((a, t) => a + NG.tripKm(t), 0))) + ' đ', 'Hệ số tải trọng bình quân ' + util + '%', 'amber'] : ['Sự cố chưa xử lý xong', openInc, 'Hệ số tải trọng bình quân ' + util + '%', openInc ? 'red' : 'green']
    ];
    const todos = NG.notifications(u).slice(0, 7);
    const keys = ['cho_xep_chuyen', 'da_xep_chuyen', 'dang_giao', 'giao_that_bai'];
    const tc = { wait: 'var(--warn)', warn: 'var(--bad)', info: 'var(--info)', move: 'var(--move)', done: 'var(--ok)', off: 'var(--off)' };
    const cnt = keys.map((k) => ({ k, v: d.orders.filter((o) => o.status === k).length })).concat([{ k: 'da_giao', v: d.orders.filter((o) => o.status === 'da_giao' && o.deliveredAt && o.deliveredAt.slice(0, 10) === T).length, lbl: 'Đã giao hôm nay' }]);
    const mx = Math.max(...cnt.map((c) => c.v), 1);
    el.innerHTML = '<div class="page-h"><div><h1>Chào ' + esc(u.name.split(' ').slice(-1)[0]) + ', đây là tình hình điều phối hôm nay</h1><p>' + esc(NG.ROLES[role].label) + ' · ' + NG.fmtDT(NG.now()) + '</p></div>' +
      (NG.may('trip.plan') ? '<a class="btn primary" href="#/lap-chuyen">+ Lập chuyến</a>' : NG.may('order.edit') ? '<a class="btn primary" href="#/van-don/moi">+ Tạo vận đơn</a>' : '') + '</div>' +
      '<div class="kpis">' + kp.map((k) => '<div class="kpi ' + k[3] + '"><div class="k-l">' + k[0] + '</div><div class="k-v">' + k[1] + '</div><div class="k-s">' + k[2] + '</div></div>').join('') + '</div>' +
      '<div class="grid g-main"><div class="stack"><section class="card"><div class="card-h"><h2>Lịch chạy xe hôm nay</h2><span class="mut sm">' + NG.fmtD(T) + '</span></div><div class="card-b">' + NG.gantt(T, { href: (t) => (NG.can('chuyen-xe') ? '#/chuyen-xe/' + t.id : '#/giam-sat') }) + '</div></section>' +
      '<section class="card"><div class="card-h"><h2>Chuyến đang chạy</h2>' + (NG.can('giam-sat') ? '<a class="btn sm ghost" href="#/giam-sat">Giám sát hành trình</a>' : '') + '</div><div id="act"></div></section></div>' +
      '<div class="stack"><section class="card"><div class="card-h"><h2>Việc cần xử lý</h2><span class="pill' + (todos.length ? ' amber' : ' green') + '">' + NG.notifications(u).length + '</span></div><div>' +
      (todos.length ? todos.map((t) => '<a class="todo" href="' + t.href + '"><span class="ti">' + NG.icon('bell') + '</span><span class="tx">' + esc(t.text) + '<small>' + esc(t.sub) + '</small></span>›</a>').join('') : '<p class="mut" style="padding:16px 18px">Bạn đã xử lý hết công việc.</p>') + '</div></section>' +
      '<section class="card"><div class="card-h"><h2>Vận đơn theo trạng thái</h2></div><div class="card-b">' + cnt.map((c) => '<div class="hbar"><span>' + (c.lbl || NG.ST.order[c.k].label) + '</span><span class="tr"><span class="fl" style="display:block;width:' + (c.v * 100 / mx) + '%;background:' + tc[NG.ST.order[c.k].tone] + '"></span></span><b class="num">' + c.v + '</b></div>').join('') + '</div></section></div></div>';
    NG.table($('#act'), {
      rows: () => running, size: 6, sort: 'planStart', dir: 1,
      cols: [
        { key: 'id', label: 'Chuyến', html: (t) => (NG.can('chuyen-xe') ? '<a class="code" href="#/chuyen-xe/' + t.id + '">' + t.id + '</a>' : '<span class="code">' + t.id + '</span>') },
        { key: 'veh', label: 'Xe · Tài xế', sortable: false, html: (t) => esc(NG.vehicle(t.vehicleId).plate) + '<div class="mut sm">' + esc(NG.driver(t.driverId).name) + '</div>' },
        { key: 'prog', label: 'Tiến độ điểm dừng', sortable: false, html: (t) => { const p = NG.tripProgress(t); return '<div class="prog" style="width:120px"><i style="width:' + p.pct + '%"></i></div><span class="mut sm">' + p.d + '/' + p.n + ' điểm</span>'; } },
        { key: 'cur', label: 'Điểm kế tiếp', sortable: false, html: (t) => { const s = NG.curStop(t); return s ? (s.kind === 'lay' ? 'Lấy: ' : 'Giao: ') + esc(s.addr.split(',')[0]) : '—'; } },
        { key: 'late', label: '', sortable: false, html: (t) => (NG.tripLate(t) ? '<span class="pill red">Trễ</span>' : t.incidents.some((i) => i.status !== 'da_xu_ly') ? '<span class="pill amber">Sự cố</span>' : '<span class="pill green">Đúng tiến độ</span>') }
      ], empty: 'Hiện không có chuyến đang chạy.'
    });
  };

  document.addEventListener('DOMContentLoaded', render);
})();
