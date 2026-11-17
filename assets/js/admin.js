/* Quản trị hệ thống: người dùng, vai trò, nhật ký */
(function () {
  const NG = window.NG;
  const { esc, $, $$ } = NG;

  NG.PERM_LABEL = { 'order.edit': 'Tạo, sửa vận đơn', 'trip.plan': 'Lập chuyến, phân công', 'incident.handle': 'Xử lý sự cố', recon: 'Đối soát chuyến', 'fleet.edit': 'Cập nhật xe, tài xế', price: 'Xem cước, chi phí' };
  NG.V['quan-tri'] = function (el, r) {
    const d = NG.db();
    const tab = r.q.get('tab') || 'nguoi-dung';
    el.innerHTML = '<div class="page-h"><div><h1>Quản trị hệ thống</h1><p>Tài khoản người dùng, phân quyền theo vai trò và nhật ký thao tác</p></div>' + (tab === 'nguoi-dung' ? '<button class="btn primary" id="add">+ Thêm người dùng</button>' : '') + '</div>' +
      '<section class="card"><div class="tabs">' + [['nguoi-dung', 'Người dùng', d.users.length], ['vai-tro', 'Vai trò và quyền', Object.keys(NG.ROLES).length], ['nhat-ky', 'Nhật ký hệ thống', d.logs.length]].map((x) => '<button data-t="' + x[0] + '"' + (x[0] === tab ? ' class="on"' : '') + '>' + x[1] + '<span class="cnt">' + x[2] + '</span></button>').join('') + '</div><div id="body"></div></section>';
    $$('[data-t]').forEach((b) => b.onclick = () => NG.go('#/quan-tri?tab=' + b.dataset.t));
    const body = $('#body');
    if (tab === 'nguoi-dung') users(body, d);
    if (tab === 'vai-tro') {
      const all = Object.keys(NG.MENU);
      body.innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Vai trò</th><th>Mô tả</th>' + all.map((m) => '<th style="text-align:center;font-size:11px">' + NG.MENU[m] + '</th>').join('') + '<th>Xem giá</th></tr></thead><tbody>' +
        Object.entries(NG.ROLES).map(([k, v]) => '<tr><td><b>' + esc(v.label) + '</b><div class="mut sm mono">' + k + '</div></td><td class="sm">' + esc(v.desc) + '</td>' + all.map((m) => '<td style="text-align:center">' + (v.menu.includes(m) ? '<span style="color:var(--ok)">●</span>' : '<span class="mut">–</span>') + '</td>').join('') + '<td class="sm">' + ((v.perms || []).map((p) => NG.PERM_LABEL[p] || p).join(', ') || '—') + '</td></tr>').join('') + '</tbody></table></div>';
    }
    if (tab === 'nhat-ky') {
      body.innerHTML = '<div class="filters"><input class="input search" id="q" placeholder="Tìm theo người dùng, thao tác, đối tượng…" aria-label="Tìm kiếm"><input class="input" type="date" id="dd" aria-label="Ngày"><button class="btn ghost sm" id="xls">Xuất Excel</button></div><div id="tb"></div>';
      const rows = () => { const q = $('#q').value.toLowerCase(), dd = $('#dd').value; return d.logs.filter((l) => (!dd || l.at.slice(0, 10) === dd) && (!q || [l.user, NG.who(l.user), l.action, l.object].join(' ').toLowerCase().includes(q))); };
      const tb = NG.table($('#tb'), { rows, size: 15, cols: [{ key: 'at', label: 'Thời gian', html: (l) => '<span class="nowrap">' + NG.fmtDT(l.at) + '</span>' }, { key: 'user', label: 'Người thực hiện', html: (l) => esc(NG.who(l.user)) + '<div class="mut sm mono">' + esc(l.user) + '</div>' }, { key: 'action', label: 'Thao tác' }, { key: 'object', label: 'Đối tượng' }], sort: 'at', dir: -1 });
      ['q', 'dd'].forEach((i) => $('#' + i).addEventListener('input', tb.redraw));
      $('#xls').onclick = () => NG.download('nhat-ky-he-thong.csv', [['Thời gian', 'Tài khoản', 'Thao tác', 'Đối tượng']].concat(rows().map((l) => [NG.fmtDT(l.at), l.user, l.action, l.object])));
    }
  };

  function users(body, d) {
    body.innerHTML = '<div class="filters"><input class="input search" id="q" placeholder="Tìm họ tên, tên đăng nhập…" aria-label="Tìm kiếm"><select class="input" id="rl" aria-label="Vai trò"><option value="">Tất cả vai trò</option>' + Object.entries(NG.ROLES).map(([k, v]) => '<option value="' + k + '">' + v.label + '</option>').join('') + '</select></div><div id="tb"></div>';
    const me = NG.user();
    const rows = () => { const q = $('#q').value.toLowerCase(), rl = $('#rl').value; return d.users.filter((u) => (!rl || u.role === rl) && (!q || [u.name, u.username, u.phone].join(' ').toLowerCase().includes(q))); };
    const tb = NG.table($('#tb'), {
      rows, sort: 'id', dir: 1,
      cols: [{ key: 'id', label: 'Mã', html: (u) => '<span class="mono">' + u.id + '</span>' }, { key: 'name', label: 'Họ tên', html: (u) => '<b>' + esc(u.name) + '</b><div class="mut sm">' + esc(u.phone) + '</div>' }, { key: 'username', label: 'Tên đăng nhập', html: (u) => '<span class="mono">' + esc(u.username) + '</span>' },
        { key: 'role', label: 'Vai trò', html: (u) => esc(NG.ROLES[u.role].label) + (u.driverId ? '<div class="mut sm">' + esc(NG.driver(u.driverId).name) + '</div>' : '') },
        { key: 'locked', label: 'Trạng thái', html: (u) => (u.locked ? '<span class="pill red">Đã khóa</span>' : '<span class="pill green">Hoạt động</span>') },
        { key: 'a', label: '', sortable: false, html: (u) => '<span class="row"><button class="btn sm ghost" data-e="' + u.id + '">Sửa</button><button class="btn sm ghost" data-r="' + u.id + '">Đặt lại mật khẩu</button>' + (u.username !== me.username ? '<button class="btn sm ' + (u.locked ? 'ghost' : 'ghost') + '" data-l="' + u.id + '">' + (u.locked ? 'Mở khóa' : 'Khóa') + '</button>' : '') + '</span>' }],
      after: (box) => {
        const find = (id) => d.users.find((u) => u.id === id);
        $$('[data-e]', box).forEach((b) => b.onclick = () => edit(find(b.dataset.e)));
        $$('[data-l]', box).forEach((b) => b.onclick = () => { const u = find(b.dataset.l); NG.confirm((u.locked ? 'Mở khóa' : 'Khóa') + ' tài khoản ' + u.username, u.locked ? 'Người dùng sẽ đăng nhập lại được.' : 'Người dùng sẽ bị đăng xuất ngay và không thể đăng nhập cho đến khi được mở khóa.', () => { u.locked = !u.locked; NG.save(); NG.log(u.locked ? 'Khóa tài khoản' : 'Mở khóa tài khoản', u.username); NG.toast('Đã cập nhật tài khoản ' + u.username + '.'); tb.refresh(); }, { danger: !u.locked, okText: u.locked ? 'Mở khóa' : 'Khóa' }); });
        $$('[data-r]', box).forEach((b) => b.onclick = () => { const u = find(b.dataset.r); NG.modal('Đặt lại mật khẩu · ' + u.username, '<div class="field"><label for="np">Mật khẩu mới</label><input class="input" id="np" value="123456"><span class="hint">Người dùng nên đổi mật khẩu sau khi đăng nhập.</span></div>', (bg) => { if (!NG.validate(bg, [['np', (x) => (x.length < 6 ? 'Mật khẩu tối thiểu 6 ký tự.' : '')]])) return false; u.pass = NG.hash(bg.querySelector('#np').value.trim()); NG.save(); NG.log('Đặt lại mật khẩu', u.username); NG.toast('Đã đặt lại mật khẩu cho ' + u.username + '.'); }, { okText: 'Lưu' }); });
      }
    });
    ['q', 'rl'].forEach((i) => $('#' + i).addEventListener('input', tb.redraw));
    $('#add').onclick = () => edit(null);
    function edit(u) {
      const v = u || { name: '', username: '', phone: '', role: 'kinhdoanh', driverId: '' };
      NG.modal(u ? 'Sửa người dùng ' + u.username : 'Thêm người dùng', '<div class="fgrid"><div class="field full"><label for="u_name">Họ tên <span class="rq">*</span></label><input class="input" id="u_name" value="' + esc(v.name) + '"></div>' +
        '<div class="field"><label for="u_username">Tên đăng nhập <span class="rq">*</span></label><input class="input" id="u_username" value="' + esc(v.username) + '"' + (u ? ' disabled' : '') + '></div><div class="field"><label for="u_phone">Số điện thoại <span class="rq">*</span></label><input class="input" id="u_phone" value="' + esc(v.phone) + '"></div>' +
        '<div class="field"><label for="u_role">Vai trò</label><select class="input" id="u_role">' + Object.entries(NG.ROLES).map(([k, x]) => '<option value="' + k + '"' + (k === v.role ? ' selected' : '') + '>' + x.label + '</option>').join('') + '</select></div>' +
        '<div class="field" id="dw"><label for="u_driver">Gắn với tài xế</label><select class="input" id="u_driver"><option value="">— Chọn —</option>' + d.drivers.map((x) => '<option value="' + x.id + '"' + (x.id === v.driverId ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select></div>' +
        (u ? '' : '<p class="hint full">Mật khẩu mặc định: 123456</p>') + '</div>', (bg) => {
        const g = (k) => bg.querySelector('#u_' + k).value.trim();
        const ok = NG.validate(bg, [['u_name', NG.req('họ tên')], ['u_username', (x) => (u ? '' : !/^[a-z0-9_.]{3,20}$/.test(x) ? 'Tên đăng nhập 3–20 ký tự, chỉ gồm chữ thường, số, dấu chấm, gạch dưới.' : d.users.some((y) => y.username === x) ? 'Tên đăng nhập đã tồn tại.' : '')],
          ['u_phone', (x) => (!NG.phoneOk(x) ? 'Số điện thoại phải gồm 10–11 chữ số và bắt đầu bằng 0.' : '')], ['u_driver', (x) => (g('role') === 'taixe' && !x ? 'Vui lòng chọn tài xế tương ứng.' : '')],
          ['u_role', (x) => (u && u.username === NG.user().username && x !== 'admin' ? 'Không thể tự bỏ quyền quản trị của chính mình.' : '')]]);
        if (!ok) return false;
        const data = { name: g('name'), phone: NG.digits(g('phone')), role: g('role'), driverId: g('role') === 'taixe' ? g('driver') : undefined };
        if (u) { Object.assign(u, data); NG.log('Cập nhật người dùng', u.username); } else { const id = NG.nextId('user', 'ND', 2); d.users.push(Object.assign({ id, username: g('username'), pass: NG.hash('123456'), createdAt: NG.now() }, data)); NG.log('Thêm người dùng', g('username')); }
        NG.save(); NG.toast('Đã lưu người dùng.'); tb.refresh();
      }, { okText: 'Lưu' });
      const sync = () => { $('#dw').hidden = $('#u_role').value !== 'taixe'; };
      $('#u_role').onchange = sync; sync();
    }
  }
})();
