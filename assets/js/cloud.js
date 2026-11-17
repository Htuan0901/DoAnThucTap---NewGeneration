/* Đồng bộ dữ liệu với cơ sở dữ liệu dùng chung (Supabase / PostgreSQL)
   - Mỗi nhóm dữ liệu là một bảng: khach_hang, phuong_tien, tai_xe, nguoi_dung, van_don, chuyen_xe, nhat_ky, he_thong.
   - Mỗi bản ghi là một dòng: id (khóa chính), data (nội dung JSON), stt (thứ tự), updated_at.
   - Khi lưu: chỉ gửi các bản ghi đã thay đổi. Khi chuyển trang và định kỳ 15 giây: tải dữ liệu mới từ máy khác. */
(function () {
  const NG = window.NG;
  const CFG = window.NG_CONFIG || {};
  const URL0 = String(CFG.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const KEY = String(CFG.SUPABASE_KEY || '').trim();
  NG.cloudOn = !!(URL0 && KEY);
  if (!NG.cloudOn) return;

  const TABLES = { customers: 'khach_hang', vehicles: 'phuong_tien', drivers: 'tai_xe', users: 'nguoi_dung', orders: 'van_don', trips: 'chuyen_xe', logs: 'nhat_ky' };
  const META = 'he_thong';
  const API = URL0 + '/rest/v1/';
  const headers = (extra) => {
    const h = { apikey: KEY, 'Content-Type': 'application/json' };
    if (KEY.startsWith('eyJ')) h.Authorization = 'Bearer ' + KEY;   // khóa anon kiểu cũ (JWT)
    return Object.assign(h, extra || {});
  };
  async function req(method, path, body, extra) {
    const r = await fetch(API + path, { method, headers: headers(extra), body: body == null ? undefined : JSON.stringify(body), cache: 'no-store' });
    if (!r.ok) { const t = await r.text().catch(() => ''); const e = new Error('HTTP ' + r.status + ' ' + t.slice(0, 300)); e.status = r.status; throw e; }
    return r.status === 204 ? null : r.json().catch(() => null);
  }
  async function getAll(table) {
    const out = [];
    for (let from = 0; ; from += 1000) {
      const rows = await req('GET', table + '?select=id,stt,data&order=stt.asc,id.asc&limit=1000&offset=' + from);
      out.push(...rows);
      if (rows.length < 1000) return out;
    }
  }
  const inList = (ids) => 'in.(' + ids.map((x) => '"' + String(x).replace(/["\\]/g, '\\$&') + '"').join(',') + ')';

  /* ---------- Trạng thái kết nối (góc dưới màn hình) ---------- */
  let chip = null;
  function status(text, tone) {
    if (!document.body) return;
    if (!chip) {
      chip = document.createElement('div');
      chip.setAttribute('role', 'status');
      chip.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:9999;font:12px/1.2 system-ui,sans-serif;padding:6px 10px;border-radius:14px;box-shadow:0 1px 4px rgba(0,0,0,.2);pointer-events:none;transition:opacity .3s';
      document.body.appendChild(chip);
    }
    const c = { ok: ['#e7f6ec', '#17663a'], busy: ['#fff4dc', '#7a5300'], err: ['#fde8e8', '#a11d1d'] }[tone || 'ok'];
    chip.style.background = c[0]; chip.style.color = c[1]; chip.textContent = text; chip.style.opacity = '1';
    clearTimeout(chip._t);
    if (tone === 'ok') chip._t = setTimeout(() => { chip.style.opacity = '0'; }, 2500);
  }
  function overlay(on, msg) {
    let o = document.getElementById('ng-cloud-loading');
    if (!on) { if (o) o.remove(); return; }
    if (!o) {
      o = document.createElement('div'); o.id = 'ng-cloud-loading';
      o.style.cssText = 'position:fixed;inset:0;z-index:9998;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.92);font:15px system-ui,sans-serif;color:#1b2155;text-align:center;padding:24px';
      (document.body || document.documentElement).appendChild(o);
    }
    o.innerHTML = msg;
  }

  /* ---------- Ảnh chụp dữ liệu đã đồng bộ (để biết bản ghi nào thay đổi) ---------- */
  const snap = {};      // snap[table][id] = chuỗi JSON đã có trên máy chủ
  let metaSnap = '';
  /* Chuỗi JSON có khóa sắp xếp cố định (PostgreSQL jsonb đổi thứ tự khóa khi lưu) */
  const canon = (v) => (Array.isArray(v) ? '[' + v.map(canon).join(',') + ']' : v && typeof v === 'object' ? '{' + Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}' : JSON.stringify(v === undefined ? null : v));
  const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  function ensureLogIds(d) { (d.logs || []).forEach((l) => { if (!l._id) { l._id = 'NK' + rid(); l._ts = Math.floor(Date.now() / 1000) - 1.7e9; } }); }
  const idOf = (coll, rec) => (coll === 'logs' ? rec._id : rec.id);

  function buildChanges(d) {
    ensureLogIds(d);
    const ups = {}, dels = {};
    for (const [coll, table] of Object.entries(TABLES)) {
      const arr = d[coll] || [], seen = new Set(), s = snap[table] || (snap[table] = {});
      arr.forEach((rec, i) => {
        const id = idOf(coll, rec); seen.add(id);
        const js = canon(rec);
        if (s[id] !== js) (ups[table] = ups[table] || []).push({ id, stt: coll === 'logs' ? (rec._ts || 0) : i, data: rec, _js: js });
      });
      Object.keys(s).forEach((id) => { if (!seen.has(id)) (dels[table] = dels[table] || []).push(id); });
    }
    const meta = canon({ v: d.v, seq: d.seq });
    return { ups, dels, meta: meta !== metaSnap ? meta : null };
  }

  /* ---------- Gửi thay đổi lên máy chủ ---------- */
  let timer = null, pushing = null, dirty = false;
  async function push() {
    const d = NG.db();
    const { ups, dels, meta } = buildChanges(d);
    const n = Object.values(ups).reduce((a, x) => a + x.length, 0) + Object.values(dels).reduce((a, x) => a + x.length, 0) + (meta ? 1 : 0);
    if (!n) return;
    status('Đang lưu lên cơ sở dữ liệu…', 'busy');
    for (const [table, rows] of Object.entries(ups)) {
      for (let i = 0; i < rows.length; i += 200) {
        const part = rows.slice(i, i + 200);
        await req('POST', table + '?on_conflict=id', part.map((r) => ({ id: r.id, stt: r.stt, data: r.data, updated_at: new Date().toISOString() })), { Prefer: 'resolution=merge-duplicates,return=minimal' });
        part.forEach((r) => { snap[table][r.id] = r._js; });
      }
    }
    for (const [table, ids] of Object.entries(dels)) {
      for (let i = 0; i < ids.length; i += 100) {
        const part = ids.slice(i, i + 100);
        await req('DELETE', table + '?id=' + encodeURIComponent(inList(part)), null, { Prefer: 'return=minimal' });
        part.forEach((id) => { delete snap[table][id]; });
      }
    }
    if (meta) {
      await req('POST', META + '?on_conflict=id', [{ id: 'cau_hinh', stt: 0, data: JSON.parse(meta), updated_at: new Date().toISOString() }], { Prefer: 'resolution=merge-duplicates,return=minimal' });
      metaSnap = meta;
    }
    status('Đã lưu vào cơ sở dữ liệu', 'ok');
  }
  function flush() {
    clearTimeout(timer); timer = null;
    if (pushing) return pushing.then(() => (dirty ? flush() : undefined));
    dirty = false;
    pushing = push().catch((e) => { dirty = true; console.error('[NG cloud] lưu lỗi', e); status('Chưa lưu được lên cơ sở dữ liệu, sẽ thử lại…', 'err'); })
      .finally(() => { pushing = null; });
    return pushing;
  }
  NG.onSave = function () { dirty = true; clearTimeout(timer); timer = setTimeout(flush, 250); };
  window.addEventListener('beforeunload', (e) => { if (dirty || pushing) { flush(); e.preventDefault(); e.returnValue = ''; } });

  /* ---------- Tải dữ liệu từ máy chủ ---------- */
  async function pull() {
    const res = {};
    await Promise.all(Object.values(TABLES).concat(META).map(async (t) => { res[t] = await getAll(t); }));
    return res;
  }
  function apply(res, d) {
    let changed = false;
    const m = (res[META] || []).find((r) => r.id === 'cau_hinh');
    if (m) {
      const seq = Object.assign({}, d.seq || {});
      Object.entries(m.data.seq || {}).forEach(([k, v]) => { seq[k] = Math.max(seq[k] || 0, v); });
      d.v = m.data.v || 1; d.seq = seq; metaSnap = canon({ v: m.data.v, seq: m.data.seq });
      if (canon({ v: d.v, seq }) !== metaSnap) dirty = true;   // máy này có số thứ tự lớn hơn
    }
    for (const [coll, table] of Object.entries(TABLES)) {
      const rows = res[table] || [];
      const s = {}, arr = [];
      rows.forEach((r) => {
        if (coll === 'logs') r.data._id = r.id;
        const js = canon(r.data);
        s[r.id] = js;
        arr.push(r.data);
      });
      if (coll === 'logs') arr.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : (b._ts || 0) - (a._ts || 0)));
      const old = snap[table] || {};
      const same = Object.keys(old).length === rows.length && rows.every((r) => old[r.id] === s[r.id]);
      if (!same) { changed = true; d[coll] = arr; }
      snap[table] = s;
    }
    return changed;
  }

  /* Đồng bộ: gửi thay đổi còn chờ, sau đó tải dữ liệu mới; trả về true nếu có dữ liệu mới từ máy khác */
  let syncing = null;
  NG.sync = function () {
    if (syncing) return syncing;
    syncing = (async () => {
      try {
        await flush();
        const res = await pull();
        const d = NG.db();
        const changed = apply(res, d);
        if (changed) NG._setDB(d);
        if (dirty) NG.onSave();
        return changed;
      } catch (e) { console.error('[NG cloud] tải lỗi', e); status('Mất kết nối cơ sở dữ liệu', 'err'); return false; }
      finally { syncing = null; }
    })();
    return syncing;
  };

  /* ---------- Khởi động: tải toàn bộ dữ liệu trước khi hiển thị ---------- */
  NG.ready = (async () => {
    const show = () => overlay(true, '<div><b>Đang tải dữ liệu từ cơ sở dữ liệu…</b><br><span style="opacity:.7">Hệ thống dùng chung dữ liệu cho mọi máy</span></div>');
    if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
    try {
      const res = await pull();
      const empty = Object.values(TABLES).every((t) => !(res[t] || []).length);
      if (empty) {
        /* Cơ sở dữ liệu mới tạo: đưa dữ liệu mẫu lên lần đầu */
        overlay(true, '<div><b>Cơ sở dữ liệu đang trống.</b><br>Đang tạo dữ liệu mẫu ban đầu, vui lòng chờ…</div>');
        const d = NG.seed();
        Object.keys(TABLES).forEach((c) => { snap[TABLES[c]] = {}; });
        NG._setDB(d);
        dirty = true; await flush();
        if (dirty) throw new Error('Không ghi được dữ liệu mẫu lên cơ sở dữ liệu. Kiểm tra lại bước chạy tệp SQL.');
      } else {
        const d = { v: 1, seq: {} };
        Object.keys(TABLES).forEach((c) => { d[c] = []; });
        apply(res, d);
        NG._setDB(d);
      }
      overlay(false);
      status('Đã kết nối cơ sở dữ liệu', 'ok');
    } catch (e) {
      console.error('[NG cloud] khởi động lỗi', e);
      overlay(true, '<div style="max-width:520px"><b style="color:#a11d1d">Không kết nối được cơ sở dữ liệu.</b><br><span style="opacity:.8">' + NG.esc(e.message || String(e)) +
        '</span><br><br>Kiểm tra SUPABASE_URL, SUPABASE_KEY trong tệp assets/js/config.js và đã chạy tệp supabase/khoi-tao-co-so-du-lieu.sql.<br><br><button onclick="location.reload()" style="padding:8px 16px;border-radius:8px;border:1px solid #1b2155;background:#1b2155;color:#fff;cursor:pointer">Thử lại</button></div>');
      throw e;
    }
  })();

  /* ---------- Tự cập nhật dữ liệu từ máy khác mỗi 15 giây ---------- */
  const busyUI = () => document.querySelector('.modal-bg') || ['INPUT', 'TEXTAREA', 'SELECT'].includes((document.activeElement || {}).tagName) || document.hidden;
  NG.ready.then(() => {
    setInterval(() => {
      if (busyUI() || !NG.render || !NG.user || !NG.user()) return;
      NG.sync().then((changed) => { if (changed && !busyUI()) { const y = window.scrollY; NG.render(); window.scrollTo(0, y); } });
    }, 15000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && NG.render && NG.user && NG.user()) NG.sync().then((c) => { if (c && !busyUI()) NG.render(); }); });
  }, () => {});
})();
