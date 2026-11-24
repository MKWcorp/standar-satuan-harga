// Demo SIM Standar Satuan Harga. Semua data tersimpan di browser (localStorage), bukan server.
(() => {
  const KEY = 'sim-ssh-demo-v4';
  const S = window.SEED;
  const MAX_USER = 100, MAX_APPROVAL = 2;

  const FIELDS = [
    { k: 'kelompok', label: 'Kode Kelompok', input: true, wajib: true, output: true },
    { k: 'barang', label: 'Barang', input: true, wajib: true, output: true, kunci: true },
    { k: 'spek', label: 'Spek', input: true, wajib: true, output: true },
    { k: 'satuan', label: 'Satuan', input: true, wajib: true, output: true },
    { k: 'harga', label: 'Harga Usulan', input: true, wajib: true, output: true, kunci: true, num: true },
    { k: 'rek1', label: 'Kode Rekening 1', input: true, wajib: true, output: true },
    { k: 'rek2', label: 'Kode Rekening 2', input: true, wajib: false, output: true },
    { k: 'tkdn', label: 'TKDN (%)', input: true, wajib: false, output: false, num: true },
  ];
  const TKDN = { Chromebook: 40, 'Meja siswa': 65, 'Kursi siswa': 65, 'Kursi kerja': 45, 'Lemari arsip besi': 55, 'Masker medis': 80, Laptop: 40, 'Personal computer': 40 };
  const OPD_REK = r => r.endsWith('0037') || r.endsWith('0034') ? 'dinkes' : r.startsWith('5.2.02.10') ? 'kominfo' : r.startsWith('5.2.02.05') ? 'setda'
    : r.endsWith('0004') ? 'dishub' : r.endsWith('0052') ? 'bappeda' : r.endsWith('0013') ? 'pupr' : 'disdik';

  // ---------- state ----------
  function seed() {
    const akun = S.opd.map(o => ({ id: o.id, instansi: o.nama, username: o.id, password: 'demo123', aktif: true }));
    const admin = [
      { id: 'sa', nama: 'Admin Sistem', peran: 'super', jabatan: 'Super Admin' },
      { id: 'ap1', nama: 'Sri Lestari', peran: 'approval', jabatan: 'Approval 1 (BPKAD)' },
      { id: 'ap2', nama: 'Agus Prasetyo', peran: 'approval', jabatan: 'Approval 2 (Bagian Pengadaan)' },
    ];
    const usulan = [];
    let seq = 0;
    const buat = (periode, opd, r, status, t0, catatan) => {
      seq++;
      const v = { kelompok: r.kode, barang: r.uraian, spek: r.spek, satuan: r.satuan, harga: r.harga, rek1: r.rek, rek2: '', tkdn: TKDN[r.uraian] ?? '' };
      const inst = akun.find(a => a.id === opd).instansi;
      const riwayat = [{ t: t0.toISOString(), oleh: inst, aksi: 'Membuat usulan' }];
      if (status !== 'draf') riwayat.push({ t: add(t0, 1), oleh: inst, aksi: 'Mengajukan usulan' });
      if (status === 'disetujui') riwayat.push({ t: add(t0, 3), oleh: 'Sri Lestari (Approval)', aksi: 'Menyetujui usulan' });
      if (status === 'revisi') riwayat.push({ t: add(t0, 2), oleh: 'Sri Lestari (Approval)', aksi: 'Mengembalikan untuk diperbaiki', catatan });
      if (status === 'ditolak') riwayat.push({ t: add(t0, 3), oleh: 'Agus Prasetyo (Approval)', aksi: 'Menolak usulan', catatan });
      usulan.push({ id: 'u' + seq, no: (periode === '2026' ? 'SSH26-' : 'SSH27-') + String(seq).padStart(4, '0'), periode, akun: opd, v, status, catatan: catatan || '', riwayat, dibuat: t0.toISOString(), diubah: riwayat[riwayat.length - 1].t });
    };
    S.katalog2026.forEach((r, i) => buat('2026', OPD_REK(r[6]), { kode: r[1], uraian: r[2], spek: r[3], satuan: r[4], harga: r[5], rek: r[6] }, 'disetujui', new Date(2025, 7, 4 + i % 20, 9 + i % 6, 12 + i)));
    S.usulan.forEach((r, i) => {
      const [opd, , kode, uraian, spek, satuan, harga, rek, , status, , catatan] = r;
      buat('2027', opd, { kode, uraian, spek, satuan, harga, rek }, status === 'proses' ? 'diajukan' : status, new Date(2026, 9, 3 + i % 20, 9 + i % 7, 10 + i), catatan);
    });
    return {
      userId: 'publik', akun, admin, seq,
      config: { metode: 'grid', fields: FIELDS.map(f => ({ ...f })), landing: { nama: 'Pemerintah Kabupaten Sukamaju', app: 'SIM Standar Satuan Harga', foto: null } },
      periode: [
        { id: '2026', nama: 'SSH Tahun Anggaran 2026', buka: '2025-08-01', tutup: '2025-09-30', status: 'ditetapkan' },
        { id: '2027', nama: 'SSH Tahun Anggaran 2027', buka: '2026-10-01', tutup: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10), status: 'dibuka' },
      ],
      usulan,
    };
  }
  function add(d, days) { const x = new Date(d); x.setDate(x.getDate() + days); x.setHours(8 + days % 8); return x.toISOString(); }

  let st;
  try { st = JSON.parse(localStorage.getItem(KEY)); } catch (e) { st = null; }
  if (!st || !st.usulan) st = seed();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { toast('Penyimpanan browser penuh atau diblokir.'); } };

  // ---------- util ----------
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rp = n => n === '' || n == null || isNaN(n) ? '-' : 'Rp' + Math.round(n).toLocaleString('id-ID');
  const pct = n => (n > 0 ? '+' : '') + n.toLocaleString('id-ID', { maximumFractionDigits: 1 }) + '%';
  const tgl = s => new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const jam = s => new Date(s).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const norm = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const F = () => st.config.fields;
  const fIn = () => F().filter(f => f.input);
  const fOut = () => F().filter(f => f.output);
  const nilai = (f, v) => f.k === 'harga' ? rp(v) : f.k === 'tkdn' && v !== '' && v != null ? v + '%' : (f.k === 'kelompok' || f.k.startsWith('rek')) && v ? `<span class="code">${esc(v)}</span>` : esc(v ?? '');

  function me() {
    if (st.userId === 'publik') return { id: 'publik', peran: 'publik', nama: 'Pengunjung', jabatan: 'tanpa login' };
    const a = st.admin.find(x => x.id === st.userId);
    if (a) return a;
    const u = st.akun.find(x => x.id === st.userId && x.aktif);
    return u ? { id: u.id, peran: 'user', nama: u.instansi, jabatan: 'Akun instansi (User)', akun: u.id } : (st.userId = 'publik', me());
  }
  const instansi = id => st.akun.find(a => a.id === id)?.instansi || id;
  const aktif = () => st.periode.find(p => p.status !== 'ditetapkan') || st.periode[st.periode.length - 1];
  const terbuka = p => p.status === 'dibuka' && new Date() <= new Date(p.tutup + 'T23:59:59');
  const sebelum = pid => { const i = st.periode.findIndex(p => p.id === pid); return i > 0 ? st.periode[i - 1] : null; };

  const STATUS = { draf: ['Draf', 'muted'], diajukan: ['Menunggu approval', 'info'], revisi: ['Dikembalikan', 'warn'], ditolak: ['Ditolak', 'crit'], disetujui: ['Disetujui', 'good'], nonaktif: ['Dinonaktifkan', 'muted'] };
  const badge = u => `<span class="badge ${STATUS[u.status][1]}">${STATUS[u.status][0]}</span>`;
  const cocok = (a, b) => norm(a.v.barang) === norm(b.v.barang) && norm(a.v.satuan) === norm(b.v.satuan);

  function kurang(u) { return fIn().filter(f => f.wajib && (u.v[f.k] === '' || u.v[f.k] == null || (f.num && !(+u.v[f.k] >= 0)))); }

  // Analisis harga otomatis: kolom wajib, kenaikan terhadap periode lalu, barang kembar antar instansi.
  function analisis(u) {
    const out = [];
    const miss = kurang(u);
    if (miss.length) out.push(['crit', 'Kolom wajib belum diisi: ' + miss.map(f => f.label).join(', ') + '.']);
    const h = +u.v.harga;
    const prev = sebelum(u.periode);
    const lalu = prev && st.usulan.find(x => x.periode === prev.id && x.status === 'disetujui' && cocok(x, u));
    if (lalu && h) {
      const d = (h / lalu.v.harga - 1) * 100;
      out.push([d > 10 ? 'warn' : 'ok', `Standar ${prev.nama}: ${rp(lalu.v.harga)}, usulan ini ${pct(d)}.`]);
    } else if (h) out.push(['info', 'Barang baru, belum ada di standar periode sebelumnya.']);
    const lain = st.usulan.filter(x => x.id !== u.id && x.periode === u.periode && x.status !== 'draf' && x.status !== 'ditolak' && x.status !== 'nonaktif' && cocok(x, u));
    if (lain.length && h) {
      const hs = lain.map(x => +x.v.harga);
      const beda = hs.some(x => Math.abs(x / h - 1) > 0.03);
      out.push([beda ? 'warn' : 'ok', `Barang sama diusulkan ${lain.length} instansi lain: ${lain.map(x => `${instansi(x.akun)} ${rp(x.v.harga)}`).join(', ')}.${beda ? ' Harga perlu diseragamkan.' : ''}`]);
    }
    return out;
  }
  const flagOf = u => { const a = analisis(u); return a.some(x => x[0] === 'crit') ? 'crit' : a.some(x => x[0] === 'warn') ? 'warn' : 'ok'; };

  function log(u, aksi, catatan) { const t = new Date().toISOString(); u.riwayat.push({ t, oleh: me().nama, aksi, catatan: catatan || '' }); u.diubah = t; }
  // undo: fungsi opsional, memunculkan tombol Urungkan di toast.
  function toast(msg, undo) {
    const t = $('#toast'); t.innerHTML = esc(msg) + (undo ? ' <button class="toast-undo">Urungkan</button>' : ''); t.hidden = false;
    if (undo) t.querySelector('button').addEventListener('click', () => { t.hidden = true; undo(); });
    clearTimeout(toast.h); toast.h = setTimeout(() => (t.hidden = true), undo ? 7000 : 2800);
  }
  // Hapus permanen hanya untuk draf/dikembalikan milik sendiri; yang sudah sah dinonaktifkan, bukan dihapus.
  function hapusUsulan(ids, after) {
    const buang = st.usulan.filter(u => ids.includes(u.id));
    if (!buang.length) return;
    st.usulan = st.usulan.filter(u => !ids.includes(u.id)); save(); navInput();
    toast(buang.length + ' usulan dihapus.', () => { st.usulan.push(...buang); save(); toast('Dikembalikan.'); route(); });
    after ? after() : route();
  }
  function baru(v) {
    st.seq++;
    const u = { id: 'u' + Date.now() + Math.random().toString(36).slice(2, 5), no: 'SSH' + aktif().id.slice(2) + '-' + String(st.seq).padStart(4, '0'), periode: aktif().id, akun: me().akun, v: { ...v }, status: 'draf', catatan: '', riwayat: [], dibuat: new Date().toISOString(), diubah: new Date().toISOString() };
    st.usulan.push(u); log(u, 'Membuat usulan'); return u;
  }
  function ajukan(u) { u.status = 'diajukan'; log(u, u.riwayat.some(r => r.aksi.startsWith('Mengembalikan')) ? 'Mengajukan ulang setelah perbaikan' : 'Mengajukan usulan'); }

  // ---------- Excel & PDF ----------
  function xlsx(rows, sheet, file) {
    if (!window.XLSX) { toast('Pustaka Excel belum termuat, coba lagi.'); return; }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = rows[0].map((_, i) => ({ wch: Math.min(48, Math.max(8, ...rows.map(r => String(r[i] ?? '').length))) }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, sheet); XLSX.writeFile(wb, file);
  }
  const rowsOut = (list, ts = true) => [['No', ...fOut().map(f => !ts && f.k === 'harga' ? 'Harga Satuan' : f.label), ...(ts ? ['Instansi', 'Status', 'Time Stamp'] : [])],
    ...list.map((u, i) => [i + 1, ...fOut().map(f => f.num ? (u.v[f.k] === '' ? '' : +u.v[f.k]) : u.v[f.k] ?? ''), ...(ts ? [instansi(u.akun), STATUS[u.status][0], jam(u.diubah)] : [])])];
  function bacaExcel(file, cb) {
    if (!window.XLSX) { toast('Pustaka Excel belum termuat, coba lagi.'); return; }
    const r = new FileReader();
    r.onload = e => { const wb = XLSX.read(e.target.result, { type: 'array' }); cb(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' })); };
    r.readAsArrayBuffer(file);
  }
  function cetak(list, judul, labelHarga = 'Harga Satuan (Rp)') {
    const L = st.config.landing, fo = fOut();
    $('#print').innerHTML = `<div class="pr-head"><div>LAMPIRAN</div><div>PERATURAN KEPALA DAERAH ${esc(L.nama.replace(/^Pemerintah\s+/i, '').toUpperCase())}</div><div>NOMOR ........ TAHUN ....</div><div>TENTANG ${esc(judul.toUpperCase())}</div></div>
      <table><thead><tr><th class="no">No</th>${fo.map(f => `<th class="${f.num ? 'r' : ''}">${esc(f.k === 'harga' ? labelHarga : f.label)}</th>`).join('')}</tr></thead><tbody>
      ${list.map((u, i) => `<tr><td>${i + 1}</td>${fo.map(f => `<td class="${f.num ? 'r' : f.k === 'kelompok' || f.k.startsWith('rek') ? 'kd' : ''}">${f.k === 'harga' ? Math.round(u.v.harga).toLocaleString('id-ID') : f.k === 'tkdn' && u.v.tkdn !== '' ? u.v.tkdn + '%' : esc(u.v[f.k] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table>
      <div class="pr-sign">${esc(L.nama.replace(/^Pemerintah\s+/i, '').toUpperCase())},<br><br><br><br>(..............................)</div>`;
    window.print();
  }

  // ---------- navigasi ----------
  const ICON = {
    dasbor: '<path d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z"/>',
    input: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z"/>',
    lokal: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    approval: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>',
    konsol: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    akun: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    periode: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    banding: '<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
    atur: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    cari: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    publik: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    rilis: '<path d="M12 8v4l3 2"/><circle cx="12" cy="12" r="9"/>',
  };
  const svg = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg>`;
  // Menu bertingkat: [key, label] = item tunggal, { g, ic, items } = grup dengan submenu.
  const RILIS_M = ['rilis', 'Catatan pembaruan'];
  const MENU = {
    publik: [['cari', 'Cari standar harga'], RILIS_M],
    user: [['dasbor', 'Dasbor'],
      { g: 'Usulan', ic: 'lokal', items: [['input', 'Input usulan'], ['lokal', 'Data usulan saya']] },
      { g: 'Portal publik', ic: 'publik', items: [['cari', 'Cari standar harga']] }, RILIS_M],
    approval: [['dasbor', 'Dasbor'],
      { g: 'Usulan', ic: 'lokal', items: [['approval', 'Approval'], ['konsol', 'Data konsolidasi'], ['banding', 'Analisis harga']] },
      { g: 'Pengaturan', ic: 'atur', items: [['akun', 'Direktori akun'], ['periode', 'Lock periode']] },
      { g: 'Portal publik', ic: 'publik', items: [['cari', 'Cari standar harga']] }, RILIS_M],
    super: [['dasbor', 'Dasbor'],
      { g: 'Pengaturan', ic: 'atur', items: [['atur', 'Konfigurasi'], ['periode', 'Lock periode']] },
      { g: 'Data', ic: 'konsol', items: [['konsol', 'Data konsolidasi']] },
      { g: 'Portal publik', ic: 'publik', items: [['cari', 'Cari standar harga']] }, RILIS_M],
  };
  const flat = peran => MENU[peran].flatMap(m => m.g ? m.items : [m]);
  const tutup = new Set();
  function renderNav(view, cnt) {
    const u = me(), aktifKey = view === 'detail' ? (u.peran === 'user' ? 'lokal' : 'approval') : view;
    const item = ([k, l], sub) => `<a class="nav-item ${sub ? 'sub' : ''} ${aktifKey === k ? 'on' : ''}" href="#/${k}">${sub ? '' : svg(k)}<span>${l}</span>${cnt[k] ? `<span class="count">${cnt[k]}</span>` : ''}</a>`;
    $('#nav').innerHTML = MENU[u.peran].map(m => {
      if (!m.g) return item(m);
      const isi = m.items.some(([k]) => k === aktifKey), buka = isi || !tutup.has(m.g), jml = m.items.reduce((a, [k]) => a + (cnt[k] || 0), 0);
      return `<div class="nav-grp ${buka ? 'open' : ''}"><button class="nav-item grp ${isi ? 'has' : ''}" data-g="${m.g}">${svg(m.ic)}<span>${m.g}</span>${jml ? `<span class="count">${jml}</span>` : ''}<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg></button>
        <div class="nav-sub">${m.items.map(x => item(x, true)).join('')}</div></div>`;
    }).join('');
    $$('[data-g]').forEach(b => b.addEventListener('click', () => { const g = b.dataset.g; tutup.has(g) ? tutup.delete(g) : tutup.add(g); b.parentElement.classList.toggle('open'); }));
  }
  const TITLE = { dasbor: 'Dasbor', input: 'Input usulan', lokal: 'Data usulan saya', approval: 'Approval usulan', konsol: 'Data konsolidasi', akun: 'Direktori akun', periode: 'Lock periode', banding: 'Analisis harga', atur: 'Konfigurasi', cari: 'Cari standar harga', detail: 'Detail usulan', rilis: 'Catatan pembaruan' };
  const VIEW = {};
  function navInput() {
    const a = document.querySelector('.nav-item[href="#/input"]'); if (!a || !me().akun) return;
    const n = st.usulan.filter(x => x.akun === me().akun && x.periode === aktif().id && (x.status === 'draf' || x.status === 'revisi')).length;
    let c = a.querySelector('.count'); if (!c) { c = document.createElement('span'); c.className = 'count'; a.appendChild(c); }
    c.textContent = n; c.hidden = !n;
  }
  const BIND = {};

  function route() {
    const u = me();
    const allowed = flat(u.peran).map(m => m[0]);
    let [view, arg] = location.hash.replace(/^#\/?/, '').split('/');
    if (!(allowed.includes(view) || (view === 'detail' && u.peran !== 'publik'))) view = allowed[0];
    const cnt = { approval: st.usulan.filter(x => x.status === 'diajukan').length, input: u.akun ? st.usulan.filter(x => x.akun === u.akun && x.periode === aktif().id && (x.status === 'draf' || x.status === 'revisi')).length : 0, rilis: rilisBaru() ? 'baru' : 0 };
    renderNav(view, cnt);
    const L = st.config.landing;
    $('#brandName').textContent = L.app; $('#brandSub').textContent = L.nama;
    $('#title').textContent = TITLE[view];
    $('#crumb').textContent = u.peran === 'publik' ? 'Tanpa login, siapa pun bisa mencari standar harga yang sudah disetujui' : `${u.nama} · ${u.jabatan}`;
    const p = aktif();
    $('#period').innerHTML = `${esc(p.nama)} <span class="dot ${terbuka(p) ? 'on' : ''}"></span> ${terbuka(p) ? 'dibuka s.d. ' + tgl(p.tutup) : 'terkunci'}`;
    document.body.dataset.peran = u.peran;
    $('#view').innerHTML = VIEW[view](arg);
    BIND[view] && BIND[view](arg);
    window.scrollTo(0, 0);
    document.body.classList.remove('nav-open');
  }
  const tile = (l, v, s, c = '') => `<div class="card tile ${c}"><div class="tile-l">${l}</div><div class="tile-v">${v}</div><div class="tile-s">${esc(s)}</div></div>`;
  const sisaHari = p => Math.max(0, Math.ceil((new Date(p.tutup + 'T23:59:59') - new Date()) / 864e5));

  // ---------- tabel usulan ----------
  function tabel(list, o = {}) {
    if (!list.length) return `<div class="empty card">${o.kosong || 'Belum ada data.'}</div>`;
    const fo = fOut().filter(f => !(o.ringkas && ['spek', 'satuan', 'rek2'].includes(f.k)));
    const sel = o.pilih ? `<div class="selbar" id="selbar" hidden><b id="selN"></b><span class="sub">dipilih</span><span class="grow"></span><button class="btn sm" id="selBatal">Batalkan pilihan</button><button class="btn sm primary" id="selOk">✓ Setujui semua yang dipilih</button></div>` : '';
    return `${sel}<div class="tbl-wrap"><table class="tbl ${o.klik === false ? '' : 'hover'}"><thead><tr>
      ${o.pilih ? '<th style="width:34px"><input type="checkbox" id="pilihSemua"></th>' : ''}<th class="rn">#</th>${o.instansi ? '<th>Instansi</th>' : ''}
      ${fo.map(f => `<th class="${f.num ? 'r' : ''}">${esc(f.label)}</th>`).join('')}
      ${o.analisis ? '<th>Analisis</th>' : ''}<th>Status</th>${o.aksi ? '<th class="r">Aksi</th>' : '<th>Time stamp</th>'}</tr></thead><tbody>
      ${list.map((x, i) => `<tr ${o.klik === false ? '' : `data-go="#/detail/${x.id}"`}>
        ${o.pilih ? `<td data-stop><input type="checkbox" class="pilih" value="${x.id}"></td>` : ''}<td class="rn">${i + 1}</td>${o.instansi ? `<td class="nowrap">${esc(singkat(instansi(x.akun)))}</td>` : ''}
        ${fo.map(f => `<td class="${f.num ? 'r nowrap' : ''}">${o.ringkas && f.k === 'harga' && x.v.satuan ? `${rp(x.v.harga)}<div class="sub">/${esc(x.v.satuan)}</div>` : f.k === 'barang' ? `<span class="strong">${esc(x.v.barang)}</span>${o.ringkas && x.v.spek ? `<div class="sub clamp">${esc(x.v.spek)}</div>` : ''}` : nilai(f, x.v[f.k])}</td>`).join('')}
        ${o.analisis ? `<td>${{ ok: '<span class="flag ok">wajar</span>', warn: '<span class="flag warn">perlu cek</span>', crit: '<span class="flag crit">tidak lengkap</span>' }[flagOf(x)]}</td>` : ''}
        <td>${badge(x)}</td>${o.aksi ? '' : `<td class="sub nowrap">${jam(x.diubah)}</td>`}
        ${o.aksi ? `<td class="r nowrap" data-stop><button class="ib ok" data-ok="${x.id}" title="Setujui">✓</button><button class="ib no" data-no="${x.id}" title="Tolak atau kembalikan (perlu catatan)">✕</button></td>` : ''}</tr>`).join('')}</tbody></table>
      <div class="tbl-foot">Menampilkan ${list.length} baris</div></div>`;
  }
  const singkat = n => n.replace(/^Dinas\s+/, 'Dinas ').replace(/Pekerjaan Umum dan Penataan Ruang/, 'PUPR').replace(/Komunikasi dan Informatika/, 'Kominfo').replace(/Pendidikan dan Kebudayaan/, 'Pendidikan').replace(/^Badan Perencanaan Pembangunan Daerah$/, 'Bappeda');
  const bindTabel = () => $$('tr[data-go]').forEach(tr => tr.addEventListener('click', e => { if (!e.target.closest('[data-stop]')) location.hash = tr.dataset.go; }));

  // ---------- dasbor ----------
  VIEW.dasbor = () => {
    const u = me(), p = aktif(), cur = st.usulan.filter(x => x.periode === p.id);
    if (u.peran === 'user') {
      const m = cur.filter(x => x.akun === u.akun), n = s => m.filter(x => x.status === s).length;
      return `<div class="grid g4">${tile('Draf', n('draf'), 'belum diajukan', n('draf') ? 'accent' : '')}${tile('Menunggu approval', n('diajukan'), '')}${tile('Disetujui', n('disetujui'), '')}${tile('Dikembalikan / ditolak', n('revisi') + n('ditolak'), n('revisi') ? n('revisi') + ' perlu diperbaiki' : '', n('revisi') ? 'warn' : '')}</div>
        <div class="card mt hero-cta"><div><h3>${esc(p.nama)}</h3><div class="sub">${terbuka(p) ? `Pengusulan dibuka sampai ${tgl(p.tutup)}, sisa ${sisaHari(p)} hari.` : 'Periode pengusulan sedang dikunci oleh admin. Usulan tidak bisa ditambah atau diubah.'}</div></div>
        ${terbuka(p) ? `<a class="btn primary" href="#/input">Input usulan (${st.config.metode === 'grid' ? 'mode grid' : 'mode form'})</a>` : ''}</div>
        ${n('revisi') ? `<h3 class="sec">Perlu diperbaiki</h3><div class="card revlist">${m.filter(x => x.status === 'revisi').map(x => `<div class="rv"><div><b>${esc(x.v.barang)}</b> <span class="sub">${rp(x.v.harga)}/${esc(x.v.satuan)}</span><div class="note warn">Catatan approval: ${esc(x.catatan)}</div></div>
          ${terbuka(p) ? `<a class="btn primary sm" href="#/input${st.config.metode === 'form' ? '/' + x.id : ''}">Perbaiki</a>` : ''}</div>`).join('')}</div>` : ''}`;
    }
    if (u.peran === 'super') {
      return `<div class="grid g4">${tile('Akun user', st.akun.length + ' / ' + MAX_USER, 'akun instansi')}${tile('Akun approval', st.admin.filter(a => a.peran === 'approval').length + ' / ' + MAX_APPROVAL, '')}${tile('Metode input', st.config.metode === 'grid' ? 'Grid' : 'Form', 'berlaku untuk semua user')}${tile('Kolom aktif', fIn().length + ' / ' + F().length, F().filter(f => f.wajib && f.input).length + ' wajib diisi')}</div>
        <div class="grid g2 mt"><a class="card linkcard" href="#/atur"><h3>Konfigurasi</h3><div class="sub">Metode input (grid atau form), konfigurasi kolom, halaman depan, cadangan dan migrasi data.</div></a>
        <a class="card linkcard" href="#/periode"><h3>Lock periode</h3><div class="sub">${esc(p.nama)}: ${terbuka(p) ? 'dibuka s.d. ' + tgl(p.tutup) : 'terkunci'}.</div></a></div>`;
    }
    const n = s => cur.filter(x => x.status === s).length;
    const per = st.akun.map(a => { const l = cur.filter(x => x.akun === a.id && x.status !== 'draf'); return { a, total: l.length, ok: l.filter(x => x.status === 'disetujui').length, tunggu: l.filter(x => x.status === 'diajukan').length }; });
    const belum = per.filter(r => !r.total).length;
    return `<div class="grid g4">${tile('Menunggu approval', n('diajukan'), 'dari semua instansi', n('diajukan') ? 'accent' : '')}${tile('Disetujui', n('disetujui'), 'periode ' + p.id)}${tile('Instansi sudah mengusulkan', (per.length - belum) + ' / ' + per.length, belum ? belum + ' instansi belum mengusulkan' : 'lengkap')}${tile('Sisa waktu pengusulan', terbuka(p) ? sisaHari(p) + ' hari' : 'terkunci', 'tutup ' + tgl(p.tutup))}</div>
      <div class="card mt"><div class="card-h"><h3>Progres per instansi</h3><a class="link" href="#/approval">Buka antrean approval</a></div>
      <table class="tbl"><thead><tr><th>Instansi</th><th class="r">Diajukan</th><th class="r">Menunggu</th><th class="r">Disetujui</th><th style="width:30%">Progres</th></tr></thead><tbody>
      ${per.map(r => `<tr><td>${esc(r.a.instansi)}</td><td class="r">${r.total}</td><td class="r">${r.tunggu}</td><td class="r">${r.ok}</td><td>${r.total ? `<div class="bar"><span style="width:${r.ok / r.total * 100}%"></span></div>` : '<span class="flag warn">belum mengusulkan</span>'}</td></tr>`).join('')}</tbody></table></div>`;
  };

  // ---------- input usulan (grid / form) ----------
  const editable = x => x.akun === me().akun && x.periode === aktif().id && (x.status === 'draf' || x.status === 'revisi');
  VIEW.input = arg => {
    const p = aktif();
    const head = `<div class="mode-note"><span class="badge info">Mode ${st.config.metode === 'grid' ? 'Grid' : 'Form'}</span> diatur Super Admin. ${st.config.metode === 'grid' ? 'Ketik langsung di tabel atau salin blok dari Excel lalu tempel (Ctrl+V).' : 'Isi satu barang per formulir.'}</div>`;
    if (!terbuka(p)) return head + `<div class="empty card">🔒 ${esc(p.nama)} sedang dikunci admin. Usulan tidak bisa ditambah atau diubah.</div>`;
    const mine = st.usulan.filter(editable).sort((a, b) => a.dibuat.localeCompare(b.dibuat));
    const terkirim = st.usulan.filter(x => x.akun === me().akun && x.periode === p.id && !editable(x));
    const tools = `<div class="toolbar"><label class="btn">Impor Excel usulan<input type="file" id="impor" accept=".xlsx,.xls,.csv" hidden></label><button class="btn" id="template">Unduh template</button>`;
    if (st.config.metode === 'grid') {
      const fi = fIn();
      const row = x => `<tr data-id="${x ? x.id : ''}" class="${x && x.status === 'revisi' ? 'rev' : ''}"><td class="rn"></td><td data-stop><input type="checkbox" class="pilih"></td>
        ${fi.map(f => `<td><input class="cell ${f.num ? 'r' : ''}" data-k="${f.k}" ${f.num ? 'inputmode="numeric"' : ''} value="${esc(x ? x.v[f.k] : '')}"></td>`).join('')}
        <td class="nowrap">${x ? badge(x) : '<span class="sub">baru</span>'}${x && x.status === 'revisi' ? `<div class="sub catat" title="${esc(x.catatan)}">${esc(x.catatan)}</div>` : ''}</td><td><button class="btn sm ghost" data-del title="Hapus baris">×</button></td></tr>`;
      return head + tools + `<span class="grow"></span><span class="sub" id="simpanInfo">Tersimpan otomatis sebagai draf</span><button class="btn danger" id="hapusPilih" disabled>Hapus yang dicentang</button><button class="btn primary" id="kirim">Ajukan yang dicentang</button></div>
        <div class="tbl-wrap grid-wrap"><table class="tbl sheet"><thead><tr><th class="rn"></th><th style="width:30px"><input type="checkbox" id="pilihSemua"></th>${fi.map(f => `<th class="${f.num ? 'r' : ''}">${esc(f.label)}${f.wajib ? ' <span class="req">*</span>' : ''}</th>`).join('')}<th>Status</th><th></th></tr></thead>
        <tbody id="sheet">${mine.map(row).join('')}${Array.from({ length: Math.max(3, 8 - mine.length) }, () => row()).join('')}</tbody></table>
        <div class="grid-foot"><button class="btn sm ghost" id="tambah1">+ Tambah baris</button><button class="btn sm ghost" id="tambah">+ Tambah 10 baris</button><span class="grow"></span><span class="sub" id="nBaris"></span></div></div>
        <template id="rowTpl">${row()}</template>
        ${terkirim.length ? `<h3 class="sec">Sudah diajukan periode ini</h3>${tabel(terkirim, { ringkas: true })}` : ''}`;
    }
    const x = arg ? st.usulan.find(u => u.id === arg && editable(u)) : null;
    return head + tools + '</div>' + `<div class="grid g21">
      <form class="card form" id="frm"><div class="card-h"><h3>${x ? 'Ubah usulan ' + x.no : 'Usulan baru'}</h3>${x ? badge(x) : ''}</div>
        ${x && x.status === 'revisi' ? `<div class="note warn">Catatan approval: ${esc(x.catatan)}</div>` : ''}
        ${fIn().map(f => `<label class="lbl">${esc(f.label)}${f.wajib ? ' <span class="req">*</span>' : ' <span class="sub">(opsional)</span>'}</label><input class="inp ${f.k.startsWith('rek') || f.k === 'kelompok' ? 'mono' : ''}" name="${f.k}" ${f.num ? 'type="number"' : ''} value="${esc(x ? x.v[f.k] : '')}">`).join('')}
        <div class="btns"><button type="button" class="btn" data-s="draf">Simpan draf</button><button type="button" class="btn primary" data-s="ajukan">Ajukan</button>${x ? `<a class="btn ghost" href="#/input">Batal</a><span class="grow"></span><button type="button" class="btn danger" data-hapus="${x.id}">Hapus usulan</button>` : ''}</div>
      </form>
      <div class="card sticky"><div class="card-h"><h3>Analisis otomatis</h3><small>saat mengetik</small></div><ul class="checks" id="cekLive"></ul></div></div>
      <h3 class="sec">Draf dan usulan yang dikembalikan</h3>${mine.length ? `<div class="tbl-wrap"><table class="tbl hover"><tbody>${mine.map(m => `<tr data-go="#/input/${m.id}"><td class="strong">${esc(m.v.barang)}</td><td>${esc(m.v.spek)}</td><td class="r">${rp(m.v.harga)}</td><td>${badge(m)}</td><td class="r" data-stop><button class="btn sm ghost" data-hapus="${m.id}" title="Hapus usulan">×</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty card">Tidak ada draf.</div>'}
      ${terkirim.length ? `<h3 class="sec">Sudah diajukan periode ini</h3>${tabel(terkirim, { ringkas: true })}` : ''}`;
  };
  BIND.input = arg => {
    bindTabel();
    $('#template')?.addEventListener('click', () => xlsx([fIn().map(f => f.label), ['1.1.7.01.01.01.001', 'Contoh: Ballpoint', 'Tinta hitam 0,5 mm, isi 12', 'Pak', 32000, '5.1.02.01.01.0024', '', ''].slice(0, fIn().length)], 'Usulan', 'template-usulan.xlsx'));
    $('#impor')?.addEventListener('change', e => {
      const f = e.target.files[0]; if (!f) return;
      bacaExcel(f, rows => {
        const head = rows[0].map(norm), fi = fIn();
        const map = fi.map(fd => head.findIndex(h => h === norm(fd.label) || h === fd.k || h.startsWith(norm(fd.label).split(' (')[0])));
        let n = 0;
        rows.slice(1).filter(r => r.some(c => String(c).trim())).forEach(r => {
          const v = {}; fi.forEach((fd, i) => { const c = map[i] >= 0 ? r[map[i]] : ''; v[fd.k] = fd.num ? (c === '' ? '' : +String(c).replace(/[^\d.]/g, '')) : String(c).trim(); });
          baru(v); n++;
        });
        save(); toast(n + ' baris diimpor sebagai draf.'); route();
      });
    });
    if (st.config.metode === 'grid') bindGrid(); else bindForm(arg);
  };
  function bindGrid() {
    const body = $('#sheet'); if (!body) return;
    const hitung = () => { [...body.children].forEach((t, i) => (t.firstElementChild.textContent = i + 1)); const n = $$('#sheet tr').filter(t => t.dataset.id).length; $('#nBaris').textContent = `${n} baris terisi · ${body.children.length} baris`; };
    const ambil = tr => { const v = {}; tr.querySelectorAll('.cell').forEach(c => { const f = F().find(z => z.k === c.dataset.k); v[c.dataset.k] = f.num ? (c.value.trim() === '' ? '' : +c.value.replace(/[^\d.]/g, '')) : c.value.trim(); }); return v; };
    const simpan = tr => {
      const v = ambil(tr), kosong = Object.values(v).every(x => x === '');
      let x = st.usulan.find(u => u.id === tr.dataset.id);
      if (!x && kosong) return;
      if (!x) { x = baru(v); tr.dataset.id = x.id; tr.lastElementChild.previousElementSibling.innerHTML = badge(x); }
      else { x.v = { ...x.v, ...v }; x.diubah = new Date().toISOString(); }
      tr.querySelectorAll('.cell').forEach(c => c.classList.remove('err'));
      tr.classList.add('dirty');
      save(); navInput(); $('#simpanInfo').textContent = 'Tersimpan ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };
    body.addEventListener('change', e => { if (e.target.classList.contains('cell')) simpan(e.target.closest('tr')); });
    // Baris dibuang dari DOM tanpa render ulang supaya posisi scroll tidak lompat.
    const buang = trs => {
      const ids = trs.map(tr => tr.dataset.id).filter(Boolean);
      trs.forEach(tr => tr.remove()); hitung(); upd();
      if (ids.length) hapusUsulan(ids, () => {});
    };
    body.addEventListener('click', e => { if (e.target.closest('[data-del]')) buang([e.target.closest('tr')]); });
    const tambah = n => { for (let i = 0; i < n; i++) body.insertAdjacentHTML('beforeend', $('#rowTpl').innerHTML); };
    $('#tambah').addEventListener('click', () => { tambah(10); hitung(); }); $('#tambah1').addEventListener('click', () => { tambah(1); hitung(); });
    body.addEventListener('change', hitung); hitung();
    // Tempel blok dari Excel/Sheets: baris dipisah newline, kolom dipisah tab.
    body.addEventListener('paste', e => {
      const cell = e.target.closest('.cell'); if (!cell) return;
      const text = e.clipboardData.getData('text/plain');
      if (!/[\t\n]/.test(text.trim())) return;
      e.preventDefault();
      const data = text.replace(/\r/g, '').replace(/\n$/, '').split('\n').map(l => l.split('\t'));
      const keys = fIn().map(f => f.k), c0 = keys.indexOf(cell.dataset.k);
      let tr = cell.closest('tr');
      const rows = [...body.children], r0 = rows.indexOf(tr);
      if (rows.length - r0 < data.length) tambah(data.length - (rows.length - r0));
      const all = [...body.children];
      data.forEach((line, i) => {
        const t = all[r0 + i];
        line.forEach((val, j) => { const k = keys[c0 + j]; const inp = k && t.querySelector(`[data-k="${k}"]`); if (inp) inp.value = val.trim(); });
        simpan(t);
      });
      hitung(); toast(data.length + ' baris ditempel dari clipboard.');
    });
    function upd() {
      const n = $$('#sheet .pilih:checked').length;
      $('#kirim').textContent = n ? `Ajukan ${n} baris` : 'Ajukan yang dicentang';
      $('#hapusPilih').textContent = n ? `Hapus ${n} baris` : 'Hapus yang dicentang'; $('#hapusPilih').disabled = !n;
      $$('#sheet .pilih').forEach(c => c.closest('tr').classList.toggle('picked', c.checked));
    }
    body.addEventListener('change', e => e.target.classList.contains('pilih') && upd());
    $('#pilihSemua').addEventListener('change', e => { $$('#sheet .pilih').forEach(c => (c.checked = e.target.checked)); upd(); });
    $('#hapusPilih').addEventListener('click', () => { buang($$('#sheet .pilih:checked').map(c => c.closest('tr'))); $('#pilihSemua').checked = false; });
    $('#kirim').addEventListener('click', () => {
      const trs = $$('#sheet .pilih:checked').map(c => c.closest('tr')).filter(tr => tr.dataset.id);
      if (!trs.length) { toast('Centang baris yang sudah terisi dulu.'); return; }
      let ok = 0, gagal = 0;
      trs.forEach(tr => {
        const x = st.usulan.find(u => u.id === tr.dataset.id), miss = kurang(x);
        if (miss.length) { gagal++; miss.forEach(f => tr.querySelector(`[data-k="${f.k}"]`)?.classList.add('err')); } else { ajukan(x); ok++; }
      });
      save();
      if (gagal) { toast(`${ok} diajukan, ${gagal} baris belum lengkap (ditandai merah).`); if (ok) setTimeout(route, 1800); } else { toast(ok + ' usulan diajukan ke approval.'); route(); }
    });
  }
  function bindForm(arg) {
    const frm = $('#frm'); if (!frm) return;
    const ambil = () => { const v = {}; fIn().forEach(f => { const c = frm.elements[f.k].value.trim(); v[f.k] = f.num ? (c === '' ? '' : +c) : c; }); return v; };
    const live = () => { const v = ambil(); $('#cekLive').innerHTML = v.barang || v.harga ? analisis({ id: arg || '_', periode: aktif().id, v }).map(c => `<li class="${c[0]}">${esc(c[1])}</li>`).join('') : '<li class="info">Isi barang dan harga untuk melihat analisis.</li>'; };
    frm.addEventListener('input', live); live();
    $$('[data-hapus]').forEach(b => b.addEventListener('click', () => { if (location.hash !== '#/input') history.replaceState(null, '', '#/input'); hapusUsulan([b.dataset.hapus]); }));
    $$('[data-s]').forEach(b => b.addEventListener('click', () => {
      const v = ambil();
      if (!v.barang) { toast('Isi nama barang dulu.'); return; }
      let x = arg && st.usulan.find(u => u.id === arg);
      if (x) { x.v = v; log(x, 'Mengubah usulan'); } else x = baru(v);
      if (b.dataset.s === 'ajukan') {
        const miss = kurang(x);
        if (miss.length) { save(); toast('Lengkapi: ' + miss.map(f => f.label).join(', ')); miss.forEach(f => frm.elements[f.k].classList.add('err')); location.hash = '#/input/' + x.id; return; }
        ajukan(x); toast('Usulan diajukan ke approval.');
      } else toast('Draf tersimpan.');
      save(); location.hash = '#/input'; route();
    }));
  }

  // ---------- data lokal (user) ----------
  VIEW.lokal = () => `<div class="toolbar"><select id="lPer" class="inp">${st.periode.map(p => `<option value="${p.id}" ${p.id === aktif().id ? 'selected' : ''}>${esc(p.nama)}</option>`).join('')}</select>
    <select id="lSt" class="inp"><option value="">Semua status</option>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}</select><span class="grow"></span>
    <button class="btn" id="lXls">Ekspor Excel</button><button class="btn" id="lPdf">Ekspor PDF</button></div><div id="lHasil"></div>`;
  BIND.lokal = () => {
    const f = () => { const l = st.usulan.filter(x => x.akun === me().akun && x.periode === $('#lPer').value && (!$('#lSt').value || x.status === $('#lSt').value)); $('#lHasil').innerHTML = tabel(l, { kosong: 'Belum ada usulan di periode ini.' }); bindTabel(); return l; };
    $('#lPer').addEventListener('change', f); $('#lSt').addEventListener('change', f); f();
    $('#lXls').addEventListener('click', () => xlsx(rowsOut(f()), 'Usulan', `usulan-${me().akun}-${$('#lPer').value}.xlsx`));
    $('#lPdf').addEventListener('click', () => cetak(f(), 'Usulan Standar Satuan Harga ' + instansi(me().akun), 'Harga Usulan (Rp)'));
  };

  // ---------- approval ----------
  VIEW.approval = () => {
    const q = st.usulan.filter(x => x.status === 'diajukan');
    const nWarn = q.filter(x => flagOf(x) !== 'ok').length;
    return `<div class="page-head"><p class="lead">Usulan dari semua instansi yang menunggu keputusan. Kolom <b>Analisis</b> membandingkan harga dengan standar periode lalu dan dengan usulan instansi lain.</p>
      <button class="btn primary" id="okWajar" ${q.length - nWarn ? '' : 'disabled'}>✓ Setujui semua yang wajar (${q.length - nWarn})</button></div>
      <div class="chips"><div class="chip-in"><span>🔍</span><input id="aCari" placeholder="Cari barang"></div>
      <select id="aOpd" class="chip"><option value="">Instansi: semua</option>${st.akun.map(a => `<option value="${a.id}">${esc(singkat(a.instansi))}</option>`).join('')}</select>
      <select id="aFlag" class="chip"><option value="">Analisis: semua</option><option value="ok">Wajar</option><option value="warn">Perlu cek</option></select>
      <span class="grow"></span><span class="sub">${q.length} menunggu · ${nWarn} perlu dicek</span></div>
      <div id="aHasil"></div>`;
  };
  BIND.approval = () => {
    const setujui = ids => { ids.forEach(id => { const x = st.usulan.find(u => u.id === id); x.status = 'disetujui'; log(x, ids.length > 1 ? 'Menyetujui usulan (persetujuan massal)' : 'Menyetujui usulan'); }); save(); toast(ids.length + ' usulan disetujui.'); route(); };
    const pasang = () => {
      bindTabel();
      const upd = () => { const n = $$('.pilih:checked').length; $('#selbar') && ($('#selbar').hidden = !n); $('#selN') && ($('#selN').textContent = n); $$('.pilih').forEach(c => c.closest('tr').classList.toggle('picked', c.checked)); };
      $$('.pilih').forEach(c => c.addEventListener('change', upd));
      $('#pilihSemua')?.addEventListener('change', e => { $$('.pilih').forEach(c => (c.checked = e.target.checked)); upd(); });
      $('#selBatal')?.addEventListener('click', () => { $$('.pilih').forEach(c => (c.checked = false)); $('#pilihSemua').checked = false; upd(); });
      $('#selOk')?.addEventListener('click', () => setujui($$('.pilih:checked').map(c => c.value)));
      $$('[data-ok]').forEach(b => b.addEventListener('click', () => setujui([b.dataset.ok])));
      $$('[data-no]').forEach(b => b.addEventListener('click', () => { location.hash = '#/detail/' + b.dataset.no; setTimeout(() => $('#catatan')?.focus(), 80); }));
    };
    const f = () => { const o = $('#aOpd').value, g = $('#aFlag').value, q = norm($('#aCari').value); $('#aHasil').innerHTML = tabel(st.usulan.filter(x => x.status === 'diajukan' && (!o || x.akun === o) && (!g || flagOf(x) === g) && (!q || norm(x.v.barang + ' ' + x.v.spek).includes(q))), { pilih: true, instansi: true, analisis: true, ringkas: true, aksi: true, kosong: 'Tidak ada usulan yang menunggu. Semua beres.' }); pasang(); };
    ['#aOpd', '#aFlag', '#aCari'].forEach(s => $(s).addEventListener('input', f)); f();
    $('#okWajar').addEventListener('click', () => setujui(st.usulan.filter(x => x.status === 'diajukan' && flagOf(x) === 'ok').map(x => x.id)));
  };

  // ---------- detail ----------
  VIEW.detail = id => {
    const x = st.usulan.find(u => u.id === id), u = me();
    if (!x || (u.peran === 'user' && x.akun !== u.akun)) return '<div class="empty card">Usulan tidak ditemukan.</div>';
    const bisaPutus = u.peran === 'approval' && x.status === 'diajukan';
    return `<a href="javascript:history.back()" class="back">← Kembali</a>
      <div class="detail-head"><div><div class="mono sub">${x.no} · ${esc(st.periode.find(p => p.id === x.periode)?.nama)}</div><h2>${esc(x.v.barang)}</h2><div class="sub">${esc(instansi(x.akun))}</div></div>${badge(x)}</div>
      <div class="grid g21 mt"><div>
        <div class="card"><div class="card-h"><h3>Isian usulan</h3></div><dl class="dl">${F().filter(f => f.input || f.output).map(f => `<dt>${esc(f.label)}</dt><dd class="${f.k === 'harga' ? 'big' : f.k.startsWith('rek') || f.k === 'kelompok' ? 'mono' : ''}">${nilai(f, x.v[f.k]) || '<span class="sub">-</span>'}</dd>`).join('')}<dt>Time stamp</dt><dd>${jam(x.diubah)}</dd></dl></div>
        <div class="card mt"><div class="card-h"><h3>Time log</h3><small>${x.riwayat.length} catatan</small></div>
          <ol class="timeline">${[...x.riwayat].reverse().map(r => `<li><div class="tl-t">${jam(r.t)}</div><div><b>${esc(r.aksi)}</b><div class="sub">${esc(r.oleh)}</div>${r.catatan ? `<div class="tl-note">${esc(r.catatan)}</div>` : ''}</div></li>`).join('')}</ol></div>
      </div><div>
        <div class="card"><div class="card-h"><h3>Analisis otomatis</h3></div><ul class="checks">${analisis(x).map(c => `<li class="${c[0]}">${esc(c[1])}</li>`).join('')}</ul></div>
        ${bisaPutus ? `<div class="card mt act"><div class="card-h"><h3>Keputusan approval</h3></div>
          <label class="lbl">Harga disetujui <span class="sub">(boleh dikoreksi)</span></label><input class="inp" id="hargaOk" type="number" value="${x.v.harga}">
          <label class="lbl">Catatan <span class="sub">(wajib bila dikembalikan atau ditolak)</span></label><textarea class="inp" id="catatan" rows="3"></textarea>
          <div class="btns"><button class="btn primary" data-a="setuju">Setujui</button><button class="btn" data-a="revisi">Kembalikan</button><button class="btn danger" data-a="tolak">Tolak</button></div></div>` : ''}
        ${u.peran === 'user' && editable(x) && terbuka(aktif()) ? `<div class="card mt act">${x.status === 'revisi' ? `<div class="note warn">Catatan approval: ${esc(x.catatan)}</div>` : ''}<div class="btns"><a class="btn primary" href="#/input${st.config.metode === 'form' ? '/' + x.id : ''}">Perbaiki di input usulan</a><button class="btn danger" id="dHapus">Hapus usulan</button></div></div>` : ''}
        ${u.peran === 'user' && x.akun === u.akun && x.status === 'diajukan' && x.periode === aktif().id && terbuka(aktif()) ? `<div class="card mt act"><div class="card-h"><h3>Belum diputuskan approval</h3></div><div class="sub">Usulan yang sudah diajukan tidak bisa dihapus. Tarik kembali menjadi draf bila ingin mengubah atau menghapusnya.</div><div class="btns"><button class="btn" id="dTarik">Tarik kembali ke draf</button></div></div>` : ''}
        ${u.peran === 'approval' && x.status === 'disetujui' ? `<div class="card mt act"><div class="card-h"><h3>Nonaktifkan dari standar harga</h3></div><div class="sub">Item yang sudah disetujui tidak dihapus. Bila dinonaktifkan, item hilang dari pencarian publik dan lampiran, tetapi riwayatnya tetap tersimpan.</div>
          <label class="lbl">Alasan <span class="req">*</span></label><textarea class="inp" id="alasan" rows="2" placeholder="Misal: barang tidak diproduksi lagi"></textarea><div class="btns"><button class="btn danger" id="dNonaktif">Nonaktifkan</button></div></div>` : ''}
        ${u.peran === 'approval' && x.status === 'nonaktif' ? `<div class="card mt act"><div class="note warn">Dinonaktifkan: ${esc(x.catatan)}</div><div class="btns"><button class="btn" id="dAktif">Aktifkan kembali</button></div></div>` : ''}
      </div></div>`;
  };
  BIND.detail = id => {
    const x = st.usulan.find(u => u.id === id); if (!x) return;
    $('#dHapus')?.addEventListener('click', () => { history.replaceState(null, '', '#/lokal'); hapusUsulan([x.id]); });
    $('#dTarik')?.addEventListener('click', () => { x.status = 'draf'; log(x, 'Menarik kembali usulan menjadi draf'); save(); toast('Usulan kembali menjadi draf.'); route(); });
    $('#dNonaktif')?.addEventListener('click', () => {
      const a = $('#alasan').value.trim();
      if (!a) { $('#alasan').classList.add('err'); $('#alasan').focus(); toast('Isi alasan supaya tercatat di time log.'); return; }
      x.status = 'nonaktif'; x.catatan = a; log(x, 'Menonaktifkan dari standar harga', a); save(); toast('Dinonaktifkan, tidak tampil lagi di pencarian publik.'); route();
    });
    $('#dAktif')?.addEventListener('click', () => { x.status = 'disetujui'; x.catatan = ''; log(x, 'Mengaktifkan kembali ke standar harga'); save(); toast('Aktif kembali di standar harga.'); route(); });
    $$('[data-a]').forEach(b => b.addEventListener('click', () => {
      const a = b.dataset.a, cat = $('#catatan').value.trim();
      if (a !== 'setuju' && !cat) { $('#catatan').classList.add('err'); $('#catatan').focus(); toast('Isi catatan supaya instansi tahu alasannya.'); return; }
      if (a === 'setuju') {
        const h = +$('#hargaOk').value; let c = cat;
        if (h && h !== +x.v.harga) { c = `Harga dikoreksi ${rp(x.v.harga)} menjadi ${rp(h)}. ${cat}`.trim(); x.v.harga = h; }
        x.status = 'disetujui'; log(x, 'Menyetujui usulan', c); toast('Disetujui, tampil di pencarian publik.');
      } else { x.status = a === 'revisi' ? 'revisi' : 'ditolak'; x.catatan = cat; log(x, a === 'revisi' ? 'Mengembalikan untuk diperbaiki' : 'Menolak usulan', cat); toast(a === 'revisi' ? 'Dikembalikan ke instansi.' : 'Usulan ditolak.'); }
      save(); history.back();
    }));
  };

  // ---------- konsolidasi ----------
  VIEW.konsol = () => `<p class="lead">Seluruh usulan semua instansi dalam satu tabel. Bisa disaring, diekspor ke Excel, atau dicetak sebagai lampiran (A4 potret).</p>
    <div class="toolbar"><select id="kPer" class="inp">${st.periode.map(p => `<option value="${p.id}" ${p.id === aktif().id ? 'selected' : ''}>${esc(p.nama)}</option>`).join('')}</select>
    <select id="kOpd" class="inp"><option value="">Semua instansi</option>${st.akun.map(a => `<option value="${a.id}">${esc(a.instansi)}</option>`).join('')}</select>
    <select id="kSt" class="inp"><option value="">Semua status (kecuali draf)</option>${Object.entries(STATUS).filter(s => s[0] !== 'draf').map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}</select>
    <input id="kCari" class="inp grow" placeholder="Cari barang, spek, atau kode"><button class="btn" id="kXls">Ekspor Excel</button><button class="btn" id="kPdf">Lampiran PDF</button></div><div id="kHasil"></div>`;
  BIND.konsol = () => {
    const f = () => {
      const q = norm($('#kCari').value);
      const l = st.usulan.filter(x => x.periode === $('#kPer').value && x.status !== 'draf' && (!$('#kOpd').value || x.akun === $('#kOpd').value) && (!$('#kSt').value || x.status === $('#kSt').value) && (!q || norm(Object.values(x.v).join(' ')).includes(q)));
      $('#kHasil').innerHTML = `<div class="sub" style="margin-bottom:8px">${l.length} baris</div>` + tabel(l, { instansi: true, ringkas: true, kosong: 'Tidak ada data.' }); bindTabel(); return l;
    };
    ['#kPer', '#kOpd', '#kSt', '#kCari'].forEach(s => $(s).addEventListener('input', f)); f();
    $('#kXls').addEventListener('click', () => xlsx(rowsOut(f()), 'Konsolidasi', `konsolidasi-ssh-${$('#kPer').value}.xlsx`));
    $('#kPdf').addEventListener('click', () => { const l = f().filter(x => x.status === 'disetujui'); if (!l.length) return toast('Belum ada usulan disetujui untuk dicetak.'); cetak(l, 'Standar Satuan Harga ' + st.periode.find(p => p.id === $('#kPer').value).nama.replace('SSH ', '')); });
  };

  // ---------- direktori akun ----------
  VIEW.akun = () => {
    const ap = st.admin.filter(a => a.peran === 'approval');
    return `<div class="grid g21"><div>
      <div class="card"><div class="card-h"><h3>Akun user (instansi)</h3><small>${st.akun.length} / ${MAX_USER}</small></div>
        <div class="toolbar"><label class="btn primary">Impor dari Excel<input type="file" id="aImpor" accept=".xlsx,.xls,.csv" hidden></label><button class="btn" id="aTpl">Unduh template</button><span class="sub">Kolom: Nama Instansi, Password</span></div>
        <table class="tbl"><thead><tr><th>Nama instansi</th><th>Username</th><th>Password</th><th class="r">Usulan</th><th>Status</th><th></th></tr></thead><tbody>
        ${st.akun.map(a => `<tr><td class="strong">${esc(a.instansi)}</td><td class="mono">${esc(a.username)}</td><td class="mono">••••••</td><td class="r">${st.usulan.filter(x => x.akun === a.id).length}</td>
          <td><span class="badge ${a.aktif ? 'good' : 'muted'}">${a.aktif ? 'aktif' : 'nonaktif'}</span></td><td class="nowrap"><button class="btn sm" data-reset="${a.id}">Reset sandi</button> <button class="btn sm ghost" data-toggle="${a.id}">${a.aktif ? 'Nonaktifkan' : 'Aktifkan'}</button>${st.usulan.some(x => x.akun === a.id) ? '' : ` <button class="btn sm ghost" data-hapusakun="${a.id}" title="Hanya untuk akun yang belum punya usulan">Hapus</button>`}</td></tr>`).join('')}</tbody></table>
        <div class="sub mt">Akun yang sudah punya usulan hanya bisa dinonaktifkan, supaya riwayat usulannya tetap utuh. Tombol Hapus muncul untuk akun yang belum pernah mengusulkan, misalnya salah impor.</div>
      </div></div>
      <div class="card"><div class="card-h"><h3>Akun approval</h3><small>${ap.length} / ${MAX_APPROVAL}</small></div>
        <table class="tbl"><tbody>${ap.map(a => `<tr><td class="strong">${esc(a.nama)}<div class="sub">${esc(a.jabatan)}</div></td></tr>`).join('')}</tbody></table>
        <div class="sub mt">Batas akun (2 approval, 100 user) bisa disesuaikan.</div></div></div>`;
  };
  BIND.akun = () => {
    $('#aTpl').addEventListener('click', () => xlsx([['Nama Instansi', 'Password'], ['Dinas Sosial', 'rahasia123'], ['Dinas Pertanian', 'rahasia456']], 'Akun', 'template-akun-instansi.xlsx'));
    $('#aImpor').addEventListener('change', e => {
      const f = e.target.files[0]; if (!f) return;
      bacaExcel(f, rows => {
        let n = 0, lewat = 0;
        rows.slice(1).forEach(r => {
          const nama = String(r[0] || '').trim(); if (!nama) return;
          if (st.akun.length >= MAX_USER || st.akun.some(a => norm(a.instansi) === norm(nama))) { lewat++; return; }
          const un = nama.toLowerCase().replace(/^(dinas|badan|kantor)\s+/, '').replace(/[^a-z0-9]+/g, '').slice(0, 16) || 'instansi' + st.akun.length;
          st.akun.push({ id: 'a' + Date.now() + n, instansi: nama, username: un, password: String(r[1] || 'demo123'), aktif: true }); n++;
        });
        save(); fillRole(); toast(`${n} akun ditambahkan${lewat ? `, ${lewat} dilewati (duplikat atau melebihi batas)` : ''}.`); route();
      });
    });
    $$('[data-reset]').forEach(b => b.addEventListener('click', () => toast('Sandi baru dikirim ke instansi (simulasi).')));
    $$('[data-toggle]').forEach(b => b.addEventListener('click', () => { const a = st.akun.find(x => x.id === b.dataset.toggle); a.aktif = !a.aktif; save(); fillRole(); toast(a.aktif ? 'Akun diaktifkan kembali.' : 'Akun dinonaktifkan, tidak bisa login.'); route(); }));
    $$('[data-hapusakun]').forEach(b => b.addEventListener('click', () => {
      const i = st.akun.findIndex(x => x.id === b.dataset.hapusakun), a = st.akun[i];
      st.akun.splice(i, 1); save(); fillRole(); route();
      toast(`Akun ${a.instansi} dihapus.`, () => { st.akun.splice(i, 0, a); save(); fillRole(); toast('Dikembalikan.'); route(); });
    }));
  };

  // ---------- lock periode ----------
  VIEW.periode = () => `<p class="lead">Admin menentukan kapan pengusulan dibuka dan ditutup. Lewat tanggal tutup, sistem otomatis mengunci input. Periode yang <b>ditetapkan</b> menjadi standar resmi dan arsipnya tetap bisa dicari publik.</p>
    <div class="card"><table class="tbl"><thead><tr><th>Periode</th><th>Buka</th><th>Tutup</th><th>Status</th><th class="r">Usulan</th><th></th></tr></thead><tbody>
    ${st.periode.map(p => `<tr><td class="strong">${esc(p.nama)}</td><td><input type="date" class="inp sm" data-buka="${p.id}" value="${p.buka}" ${p.status === 'ditetapkan' ? 'disabled' : ''}></td><td><input type="date" class="inp sm" data-tutup="${p.id}" value="${p.tutup}" ${p.status === 'ditetapkan' ? 'disabled' : ''}></td>
      <td><span class="badge ${p.status === 'ditetapkan' ? 'muted' : terbuka(p) ? 'good' : 'warn'}">${p.status === 'ditetapkan' ? 'ditetapkan' : terbuka(p) ? 'dibuka' : 'terkunci'}</span></td><td class="r">${st.usulan.filter(x => x.periode === p.id && x.status !== 'draf').length}</td>
      <td class="nowrap">${p.status === 'ditetapkan' ? '' : `${p.status === 'dibuka' ? `<button class="btn sm" data-p="${p.id}" data-to="dikunci">🔒 Kunci sekarang</button>` : `<button class="btn sm" data-p="${p.id}" data-to="dibuka">Buka kembali</button>`} <button class="btn sm" data-p="${p.id}" data-to="ditetapkan">Tetapkan</button>${st.usulan.some(x => x.periode === p.id) ? '' : ` <button class="btn sm ghost" data-hapusper="${p.id}">Hapus</button>`}`}</td></tr>`).join('')}
    </tbody></table><div class="btns"><button class="btn" id="pBaru">+ Periode baru</button></div>
    <div class="sub mt">Periode yang sudah ditetapkan tidak bisa dihapus karena menjadi dasar peraturan kepala daerah. Periode yang belum berisi usulan boleh dihapus, misalnya salah buat.</div></div>`;
  BIND.periode = () => {
    $$('[data-p]').forEach(b => b.addEventListener('click', () => {
      const p = st.periode.find(x => x.id === b.dataset.p);
      if (b.dataset.to === 'ditetapkan' && st.usulan.some(x => x.periode === p.id && x.status === 'diajukan')) return toast('Masih ada usulan menunggu approval di periode ini.');
      p.status = b.dataset.to; save(); toast({ dikunci: 'Periode dikunci. Instansi tidak bisa input.', dibuka: 'Periode dibuka kembali.', ditetapkan: 'Periode ditetapkan.' }[p.status]); route();
    }));
    $$('[data-buka],[data-tutup]').forEach(i => i.addEventListener('change', () => { const p = st.periode.find(x => x.id === (i.dataset.buka || i.dataset.tutup)); p[i.dataset.buka ? 'buka' : 'tutup'] = i.value; save(); route(); }));
    $$('[data-hapusper]').forEach(b => b.addEventListener('click', () => {
      const i = st.periode.findIndex(x => x.id === b.dataset.hapusper), p = st.periode[i];
      st.periode.splice(i, 1); save(); route();
      toast(`${p.nama} dihapus.`, () => { st.periode.splice(i, 0, p); save(); toast('Dikembalikan.'); route(); });
    }));
    $('#pBaru').addEventListener('click', () => {
      if (st.periode.some(p => p.status !== 'ditetapkan')) return toast('Tetapkan periode berjalan dulu sebelum membuat periode baru.');
      const y = +st.periode[st.periode.length - 1].id + 1;
      st.periode.push({ id: String(y), nama: 'SSH Tahun Anggaran ' + y, buka: new Date().toISOString().slice(0, 10), tutup: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10), status: 'dibuka' }); save(); route();
    });
  };

  // ---------- analisis harga ----------
  VIEW.banding = () => {
    const p = aktif(), prev = sebelum(p.id);
    const cur = st.usulan.filter(x => x.periode === p.id && (x.status === 'diajukan' || x.status === 'disetujui'));
    const lama = prev ? st.usulan.filter(x => x.periode === prev.id && x.status === 'disetujui') : [];
    const ubah = cur.map(x => { const a = lama.find(y => cocok(x, y)); return a ? { x, a, d: (x.v.harga / a.v.harga - 1) * 100 } : null; }).filter(Boolean).sort((a, b) => b.d - a.d);
    const grup = {};
    cur.forEach(x => { const k = norm(x.v.barang) + '|' + norm(x.v.satuan); (grup[k] = grup[k] || []).push(x); });
    const kembar = Object.values(grup).filter(g => g.length > 1);
    const maxD = Math.max(1, ...ubah.map(r => Math.abs(r.d)));
    return `<p class="lead">Membantu approval melihat harga yang naik tidak wajar dan barang yang sama diusulkan beberapa instansi dengan harga berbeda.</p>
      <div class="grid g4">${tile('Dibandingkan dengan', prev ? prev.id : '-', prev ? prev.nama : '')}${tile('Rata-rata perubahan', ubah.length ? pct(ubah.reduce((s, r) => s + r.d, 0) / ubah.length) : '-', ubah.length + ' barang yang ada di kedua periode')}${tile('Naik lebih dari 10%', ubah.filter(r => r.d > 10).length, 'perlu perhatian', ubah.some(r => r.d > 10) ? 'warn' : '')}${tile('Barang kembar antar instansi', kembar.length, 'diusulkan lebih dari 1 instansi')}</div>
      <div class="grid g21 mt"><div class="card"><div class="card-h"><h3>Perubahan harga terhadap ${prev ? esc(prev.nama) : '-'}</h3></div>
        <table class="tbl"><thead><tr><th>Barang</th><th>Instansi</th><th class="r">Lalu</th><th class="r">Usulan</th><th style="width:28%">Perubahan</th></tr></thead><tbody>
        ${ubah.map(r => `<tr data-go="#/detail/${r.x.id}" class="click"><td class="strong">${esc(r.x.v.barang)}<div class="sub">${esc(r.x.v.satuan)}</div></td><td class="sub">${esc(instansi(r.x.akun))}</td><td class="r nowrap">${rp(r.a.v.harga)}</td><td class="r nowrap">${rp(r.x.v.harga)}</td>
          <td><div class="dbar"><span class="${r.d > 10 ? 'hi' : r.d > 0 ? 'up' : 'down'}" style="width:${Math.abs(r.d) / maxD * 66}%"></span><b>${pct(r.d)}</b></div></td></tr>`).join('')}</tbody></table></div>
      <div class="card"><div class="card-h"><h3>Barang sama, harga berbeda</h3></div>
        ${kembar.length ? kembar.map(g => `<div class="kembar"><b>${esc(g[0].v.barang)}</b> <span class="sub">/${esc(g[0].v.satuan)}</span>${g.map(x => `<div class="kr"><span>${esc(instansi(x.akun))}</span><span>${rp(x.v.harga)}</span></div>`).join('')}</div>`).join('') : '<div class="empty">Tidak ada.</div>'}</div></div>`;
  };
  BIND.banding = bindTabel;

  // ---------- konfigurasi (super admin) ----------
  VIEW.atur = () => {
    const c = st.config;
    return `<div class="grid g2">
      <div class="card"><div class="card-h"><h3>Metode input</h3><small>berlaku untuk semua user</small></div>
        <div class="seg"><label class="${c.metode === 'grid' ? 'on' : ''}"><input type="radio" name="metode" value="grid" ${c.metode === 'grid' ? 'checked' : ''}><b>Grid</b><span>Tabel seperti Excel, bisa tempel banyak baris dari clipboard.</span></label>
        <label class="${c.metode === 'form' ? 'on' : ''}"><input type="radio" name="metode" value="form" ${c.metode === 'form' ? 'checked' : ''}><b>Form</b><span>Satu formulir per barang, cocok untuk pengguna awam.</span></label></div>
        <div class="sub mt">Hanya satu yang aktif. Coba ganti, lalu masuk sebagai instansi untuk melihat bedanya.</div></div>
      <div class="card"><div class="card-h"><h3>Halaman depan</h3><small>landing page</small></div>
        <label class="lbl">Nama instansi pemda</label><input class="inp" id="lNama" value="${esc(c.landing.nama)}">
        <label class="lbl">Nama aplikasi</label><input class="inp" id="lApp" value="${esc(c.landing.app)}">
        <label class="lbl">Foto/gambar latar</label><div class="toolbar"><label class="btn">Pilih gambar<input type="file" id="lFoto" accept="image/*" hidden></label>${c.landing.foto ? '<button class="btn ghost" id="lHapus">Hapus gambar</button>' : '<span class="sub">belum ada, memakai warna</span>'}</div>
        <button class="btn primary" id="lSimpan">Simpan</button></div>
      <div class="card span2"><div class="card-h"><h3>Konfigurasi kolom</h3><small>field configuration</small></div>
        <table class="tbl"><thead><tr><th>Kolom</th><th>Label</th><th class="c">Tampil di input</th><th class="c">Wajib diisi</th><th class="c">Tampil di output / lampiran</th></tr></thead><tbody>
        ${c.fields.map((f, i) => `<tr><td class="mono sub">${f.k}</td><td><input class="inp sm" data-fl="${i}" value="${esc(f.label)}"></td>
          <td class="c"><input type="checkbox" data-fi="${i}" ${f.input ? 'checked' : ''} ${f.kunci ? 'disabled' : ''}></td><td class="c"><input type="checkbox" data-fw="${i}" ${f.wajib ? 'checked' : ''} ${f.kunci || !f.input ? 'disabled' : ''}></td><td class="c"><input type="checkbox" data-fo="${i}" ${f.output ? 'checked' : ''} ${f.kunci ? 'disabled' : ''}></td></tr>`).join('')}</tbody></table>
        <div class="sub mt">Barang dan Harga Usulan selalu wajib. Kolom Time Stamp, Instansi, dan Status ditambahkan otomatis pada output. Di sistem jadi admin juga bisa menambah kolom baru.</div></div>
      <div class="card span2"><div class="card-h"><h3>Cadangan dan migrasi</h3><small>pindah hosting tanpa kehilangan data</small></div>
        <div class="toolbar"><button class="btn" id="bUnduh">Unduh cadangan lengkap (.json)</button><label class="btn">Pulihkan dari cadangan<input type="file" id="bPulih" accept=".json" hidden></label></div>
        <div class="sub">Seluruh data (akun, konfigurasi, periode, usulan, time log) dikemas satu berkas. Di sistem jadi dilengkapi pencadangan otomatis harian.</div></div></div>`;
  };
  BIND.atur = () => {
    $$('[name=metode]').forEach(r => r.addEventListener('change', () => { st.config.metode = r.value; save(); toast('Metode input: ' + (r.value === 'grid' ? 'Grid' : 'Form') + '.'); route(); }));
    const fs = st.config.fields;
    $$('[data-fl]').forEach(i => i.addEventListener('change', () => { fs[i.dataset.fl].label = i.value.trim() || fs[i.dataset.fl].label; save(); toast('Label disimpan.'); }));
    $$('[data-fi]').forEach(i => i.addEventListener('change', () => { const f = fs[i.dataset.fi]; f.input = i.checked; if (!i.checked) f.wajib = false; save(); route(); }));
    $$('[data-fw]').forEach(i => i.addEventListener('change', () => { fs[i.dataset.fw].wajib = i.checked; save(); toast('Disimpan.'); }));
    $$('[data-fo]').forEach(i => i.addEventListener('change', () => { fs[i.dataset.fo].output = i.checked; save(); toast('Disimpan.'); }));
    let foto = st.config.landing.foto;
    $('#lFoto').addEventListener('change', e => {
      const f = e.target.files[0]; if (!f) return;
      const img = new Image(); img.onload = () => { const cv = document.createElement('canvas'), s = Math.min(1, 1400 / img.width); cv.width = img.width * s; cv.height = img.height * s; cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); foto = cv.toDataURL('image/jpeg', 0.78); toast('Gambar siap, klik Simpan.'); };
      img.src = URL.createObjectURL(f);
    });
    $('#lHapus')?.addEventListener('click', () => { st.config.landing.foto = null; save(); route(); });
    $('#lSimpan').addEventListener('click', () => { Object.assign(st.config.landing, { nama: $('#lNama').value.trim(), app: $('#lApp').value.trim(), foto }); save(); toast('Halaman depan diperbarui. Lihat sebagai Pengunjung.'); route(); });
    $('#bUnduh').addEventListener('click', () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(st, null, 1)], { type: 'application/json' })); a.download = 'cadangan-sim-ssh-' + new Date().toISOString().slice(0, 10) + '.json'; a.click(); });
    $('#bPulih').addEventListener('change', e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { try { const d = JSON.parse(t); if (!d.usulan || !d.config) throw 0; st = d; save(); fillRole(); toast('Data dipulihkan.'); route(); } catch (er) { toast('Berkas cadangan tidak valid.'); } }); });
  };

  // ---------- portal publik ----------
  VIEW.cari = () => {
    const L = st.config.landing, pubs = st.periode.filter(p => st.usulan.some(x => x.periode === p.id && x.status === 'disetujui')).reverse();
    return `<div class="hero" ${L.foto ? `style="background-image:linear-gradient(rgba(6,40,30,.55),rgba(6,40,30,.7)),url(${L.foto})"` : ''}>
        <div class="hero-in"><div class="hero-k">${esc(L.nama)}</div><h2>${esc(L.app)}</h2><p>Cari standar harga barang yang sudah disetujui. Terbuka untuk umum, tanpa login.</p>
        <div class="hero-demo">Demo dengan data fiktif, bukan situs resmi pemerintah daerah</div><div class="hero-search"><span class="hs-ic">🔍</span><input id="pCari" placeholder="Ketik nama barang, misal: kertas, laptop, masker" autofocus></div></div></div>
      <div class="toolbar mt"><div class="tabs" id="pPer">${pubs.map((p, i) => `<button class="tab ${p.status === 'ditetapkan' && !pubs.slice(0, i).some(q => q.status === 'ditetapkan') ? 'on' : ''}" data-v="${p.id}">${p.id === st.periode[st.periode.length - 1].id && p.status !== 'ditetapkan' ? 'TA ' + p.id + ' · berjalan' : 'TA ' + p.id}</button>`).join('')}</div><span class="sub" id="pInfo"></span><span class="grow"></span><button class="btn" id="pXls">Unduh Excel</button><button class="btn" id="pPdf">Unduh PDF</button></div><div id="pHasil"></div>`;
  };
  BIND.cari = () => {
    const fo = () => fOut().filter(f => f.k !== 'harga');
    const f = () => {
      const q = norm($('#pCari').value), pid = ($('#pPer .tab.on') || $('#pPer .tab')).dataset.v;
      const l = st.usulan.filter(x => x.periode === pid && x.status === 'disetujui' && (!q || q.split(' ').every(w => norm(Object.values(x.v).join(' ')).includes(w)))).sort((a, b) => String(a.v.kelompok).localeCompare(String(b.v.kelompok)));
      $('#pInfo').textContent = `${l.length} barang ditemukan`;
      $('#pHasil').innerHTML = l.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>No</th>${fo().map(c => `<th>${esc(c.label)}</th>`).join('')}<th class="r">Harga satuan</th></tr></thead><tbody>
        ${l.map((x, i) => `<tr><td class="sub">${i + 1}</td>${fo().map(c => `<td class="${c.k === 'barang' ? 'strong' : c.k.startsWith('rek') || c.k === 'kelompok' ? 'mono' : ''}">${nilai(c, x.v[c.k])}</td>`).join('')}<td class="r nowrap strong">${rp(x.v.harga)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty card">Tidak ada barang yang cocok.</div>';
      return l;
    };
    $('#pCari').addEventListener('input', f); $$('#pPer .tab').forEach(t => t.addEventListener('click', () => { $$('#pPer .tab').forEach(x => x.classList.toggle('on', x === t)); f(); })); f();
    const pid = () => ($('#pPer .tab.on') || $('#pPer .tab')).dataset.v;
    $('#pXls').addEventListener('click', () => xlsx(rowsOut(f(), false), 'Standar Harga', `standar-harga-${pid()}.xlsx`));
    $('#pPdf').addEventListener('click', () => cetak(f(), 'Standar Satuan Harga ' + st.periode.find(p => p.id === pid()).nama.replace('SSH ', '')));
  };

  // ---------- catatan pembaruan ----------
  // Entri terbaru di atas. Versi pertama yang belum dilihat memunculkan penanda "baru" di menu.
  const RILIS = [
    { v: '1.1', t: '2026-11-19', judul: 'Hapus dan nonaktifkan data', isi: [
      ['baru', 'User: hapus banyak baris sekaligus di mode Grid (centang, lalu "Hapus yang dicentang").'],
      ['baru', 'User: hapus usulan di mode Form, dari daftar draf maupun dari formulir ubah.'],
      ['baru', 'User: usulan yang sudah diajukan bisa ditarik kembali menjadi draf selama belum diputuskan approval.'],
      ['baru', 'Approval: nonaktifkan item yang sudah disetujui dengan alasan wajib. Item hilang dari pencarian publik dan lampiran, riwayatnya tetap ada, dan bisa diaktifkan kembali.'],
      ['baru', 'Approval: hapus akun instansi yang belum punya usulan (misalnya salah impor) dan hapus periode yang masih kosong.'],
      ['baru', 'Setiap penghapusan bisa diurungkan lewat tombol "Urungkan" yang muncul beberapa detik.'],
      ['perbaikan', 'Akun instansi yang dinonaktifkan langsung hilang dari pilihan login tanpa perlu memuat ulang halaman.'],
      ['aturan', 'Data yang sudah sah tidak pernah dihapus permanen: usulan yang disetujui dinonaktifkan, akun yang punya usulan dinonaktifkan, periode yang ditetapkan dikunci.'],
    ] },
    { v: '1.0', t: '2026-11-19', judul: 'Demo pertama', isi: [
      ['baru', 'Tiga peran: Super Admin, Approval (maks. 2 akun), User instansi (maks. 100 akun), ditambah portal publik tanpa login.'],
      ['baru', 'Input usulan mode Grid (tempel dari Excel) atau mode Form, dipilih Super Admin. Impor dan template Excel.'],
      ['baru', 'Approval satu jenjang: setujui dengan koreksi harga, kembalikan, atau tolak dengan catatan. Setujui massal untuk usulan yang wajar.'],
      ['baru', 'Data konsolidasi, ekspor Excel, lampiran PDF A4 potret, lock periode, time log per usulan.'],
      ['baru', 'Konfigurasi kolom, halaman depan (foto dan nama pemda), cadangan dan pemulihan data untuk pindah hosting.'],
      ['baru', 'Analisis harga otomatis: kenaikan terhadap periode lalu dan barang sama yang diusulkan beberapa instansi dengan harga berbeda.'],
    ] },
  ];
  const SEEN = 'sim-ssh-rilis-dilihat';
  const rilisBaru = () => { try { return localStorage.getItem(SEEN) !== RILIS[0].v; } catch (e) { return false; } };
  VIEW.rilis = () => `<p class="lead">Perubahan demo dari waktu ke waktu.</p>
    <div class="rilis">${RILIS.map(r => `<div class="card rl"><div class="rl-h"><span class="rl-v">v${r.v}</span><h3>${esc(r.judul)}</h3><span class="sub">${tgl(r.t)}</span></div>
      <ul>${r.isi.map(([k, s]) => `<li><span class="rl-k ${k}">${k}</span><span>${esc(s)}</span></li>`).join('')}</ul></div>`).join('')}</div>`;
  BIND.rilis = () => { try { localStorage.setItem(SEEN, RILIS[0].v); } catch (e) { /* tanpa penyimpanan, penanda tetap muncul */ } $('.nav-item[href="#/rilis"] .count')?.remove(); };

  // ---------- init ----------
  const sel = $('#role');
  function fillRole() {
    sel.innerHTML = `<option value="publik">Pengunjung umum (tanpa login)</option><optgroup label="Admin">${st.admin.map(a => `<option value="${a.id}">${esc(a.jabatan)} · ${esc(a.nama)}</option>`).join('')}</optgroup>
      <optgroup label="User (akun instansi)">${st.akun.filter(a => a.aktif).map(a => `<option value="${a.id}">${esc(a.instansi)}</option>`).join('')}</optgroup>`;
    sel.value = st.userId;
  }
  const hint = () => ($('#roleHint').textContent = {
    publik: 'Mencari standar harga yang sudah disetujui, tanpa login.',
    super: 'Super Admin: metode input, konfigurasi kolom, halaman depan, migrasi data.',
    approval: 'Approval (maks. 2 akun): menyetujui usulan, direktori akun, data konsolidasi.',
    user: 'User (maks. 100 akun): input usulan dan melihat data usulannya sendiri.',
  }[me().peran]);
  sel.addEventListener('change', () => { st.userId = sel.value; save(); hint(); location.hash = '#/' + flat(me().peran)[0][0]; route(); });
  fillRole(); hint();
  $('#reset').addEventListener('click', () => { st = seed(); save(); fillRole(); hint(); toast('Data demo dikembalikan ke awal.'); location.hash = '#/cari'; route(); });
  $('#menuBtn').addEventListener('click', () => document.body.classList.toggle('nav-open'));
  window.addEventListener('hashchange', route);
  route();
})();
