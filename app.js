/* ===== دانش‌هاب — دانشنامه فنی شاتل ===== */
(function () {
  'use strict';
  const D = window.KMS_DATA;
  const byId = {};
  D.nodes.forEach(n => byId[n.id] = n);
  const domById = {};
  D.domains.forEach(d => domById[d.id] = d);

  // group indexes
  D.groups.forEach((g, i) => g.gi = i);
  const groupsByDom = {};
  D.domains.forEach(d => groupsByDom[d.id] = D.groups.filter(g => g.domain === d.id));
  const groupNodes = D.groups.map(g => D.nodes.filter(n => n.domain === g.domain && n.group === g.title));
  const groupTops = D.groups.map((g, i) => groupNodes[i].filter(n => !n.parent || !(byId[n.parent] && byId[n.parent].domain === g.domain && byId[n.parent].group === g.title)));
  const nodeGroup = {};
  D.groups.forEach((g, i) => groupNodes[i].forEach(n => nodeGroup[n.id] = i));
  const domCount = {};
  D.domains.forEach(d => domCount[d.id] = D.nodes.filter(n => n.domain === d.id).length);

  // ---- helpers ----
  const fa = n => Number(n || 0).toLocaleString('fa-IR');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function norm(s) {
    return String(s)
      .replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/ة/g, 'ه')
      .replace(/[أإآ]/g, 'ا').replace(/ؤ/g, 'و')
      .replace(/[\u064B-\u0652]/g, '')
      .replace(/\u200c/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  }
  function plain(html) {
    const t = document.createElement('textarea');
    t.innerHTML = html.replace(/<[^>]+>/g, ' ');
    return t.value.replace(/\s+/g, ' ').trim();
  }
  function chain(id) {
    const out = [];
    let cur = id;
    while (cur) { out.unshift(cur); cur = byId[cur].parent; }
    return out;
  }
  const ICONS = {
    cpu: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/></svg>',
    globe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    activity: '<svg viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
    file: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>',
    monitor: '<svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    archive: '<svg viewBox="0 0 24 24"><path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>',
    chev: '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
    steps: '<svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>',
    tree: '<svg viewBox="0 0 24 24"><path d="M12 3v6M12 9l-6 4M12 9l6 4M6 13v4M18 13v4"/><circle cx="12" cy="3" r="1.6"/><circle cx="6" cy="19" r="1.6"/><circle cx="18" cy="19" r="1.6"/></svg>'
  };
  const icon = n => ICONS[n] || ICONS.file;

  // ---- search index (archive excluded) ----
  const index = D.nodes.filter(n => n.domain !== 'archive').map(n => ({ id: n.id, name: norm(n.name), text: norm(plain(n.html)) }));
  function doSearch(q) {
    const words = norm(q).split(' ').filter(Boolean);
    if (!words.length) return [];
    const res = [];
    for (const it of index) {
      let score = 0, ok = true, pos = -1;
      for (const w of words) {
        const ni = it.name.indexOf(w), ti = it.text.indexOf(w);
        if (ni < 0 && ti < 0) { ok = false; break; }
        score += (ni >= 0 ? 20 : 0) + (ti >= 0 ? 1 : 0);
        if (pos < 0) pos = ti >= 0 ? ti : 0;
      }
      if (ok) res.push({ id: it.id, score, pos, text: it.text });
    }
    res.sort((a, b) => b.score - a.score || byId[b.id].views - byId[a.id].views);
    return res.slice(0, 80);
  }
  function snippet(text, q, pos) {
    const words = norm(q).split(' ').filter(Boolean);
    const start = Math.max(0, pos - 70);
    let s = (start > 0 ? '…' : '') + text.slice(start, start + 220) + (start + 220 < text.length ? '…' : '');
    s = esc(s);
    words.forEach(w => {
      s = s.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>');
    });
    return s;
  }

  // ---- network canvas ----
  let netRaf = null;
  function stopNet() { if (netRaf) { cancelAnimationFrame(netRaf); netRaf = null; } }
  function initNet() {
    stopNet();
    const cv = document.getElementById('net');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    let W, H, nodes = [];
    const N = 34, DIST = 130;
    function size() {
      const r = cv.parentElement.getBoundingClientRect();
      W = cv.width = Math.round(r.width);
      H = cv.height = Math.round(r.height);
    }
    function init() {
      size();
      nodes = Array.from({ length: N }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35,
        r: Math.random() * 1.8 + 1.2
      }));
    }
    function tick() {
      ctx.clearRect(0, 0, W, H);
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
      }
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < DIST) {
            ctx.strokeStyle = 'rgba(125,211,252,' + (0.35 * (1 - d / DIST)).toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke();
          }
        }
      }
      ctx.fillStyle = 'rgba(186,230,253,.8)';
      for (const n of nodes) { ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 6.283); ctx.fill(); }
      netRaf = requestAnimationFrame(tick);
    }
    init(); tick();
    window.addEventListener('resize', () => { if (document.getElementById('net')) { stopNet(); init(); tick(); } });
    document.addEventListener('visibilitychange', () => {
      if (!document.getElementById('net')) return;
      if (document.hidden) stopNet();
      else tick();
    });
  }

  // ---- renderers ----
  const main = document.getElementById('main');
  function crumbs(id) {
    const c = chain(id);
    return '<div class="crumbs">' + c.map((x, i) =>
      (i ? '<span class="sep">‹</span>' : '') +
      (i === c.length - 1 ? '<span>' + esc(byId[x].name) + '</span>' : '<a href="#/a/' + x + '">' + esc(byId[x].name) + '</a>')
    ).join('') + '</div>';
  }
  function domBadge(n) {
    const d = domById[n.domain];
    return '<span class="badge-dom" style="--c:' + d.color + '">' + esc(d.title) + '</span>';
  }
  function metaHtml(n) {
    let m = '<div class="meta">';
    m += '<span class="views">بازدید: <b>' + fa(n.views) + '</b></span>';
    if (n.rate) m += '<span>امتیاز: ' + esc(n.rate) + ' از ۵</span>';
    if (n.rescued) m += '<span class="badge-resc">نجات‌یافته از بایگانی</span>';
    (n.tags || []).forEach(t => m += '<span class="tag">' + esc(t) + '</span>');
    return m + '</div>';
  }
  function rowHtml(n, sub) {
    return '<a class="row" href="#/a/' + n.id + '"><div><span>' + esc(n.name) + '</span>' +
      (sub ? '<span class="sub">' + sub + '</span>' : '') + '</div><span class="vw">' + fa(n.views) + ' بازدید</span></a>';
  }
  function stepHtml(n, num) {
    const cross = n.domain !== byId[n.parent] ?.domain;
    return '<a class="step" href="#/a/' + n.id + '"><span class="num">' + fa(num) + '</span><span class="nm">' + esc(n.name) + '</span>' +
      (cross ? domBadge(n) : '') + ICONS.chev.replace('<svg', '<svg class="arr"') + '</a>';
  }

  function renderHome() {
    const live = D.nodes.filter(n => n.domain !== 'archive');
    const totalViews = live.reduce((s, n) => s + n.views, 0);
    const top = [...live].sort((a, b) => b.views - a.views).slice(0, 10);
    const cards = D.domains.map(d => {
      const gs = groupsByDom[d.id].length;
      return '<a class="card" style="--c:' + d.color + '" href="#/d/' + d.id + '"><div class="ic">' + icon(d.icon) + '</div><b>' + esc(d.title) + '</b><p>' + esc(d.desc) + '</p><span class="n">' + fa(domCount[d.id]) + ' مقاله • ' + fa(gs) + ' زیرشاخه</span></a>';
    }).join('');
    const chips = D.domains.filter(d => d.id !== 'archive').map(d => '<a href="#/d/' + d.id + '">' + esc(d.title) + '</a>').join('') + '<a href="#/tree">درخت کامل</a>';
    main.innerHTML = '<div class="fadein">' +
      '<div class="hero"><canvas id="net" aria-hidden="true"></canvas><div class="hero-inner">' +
      '<span class="hero-badge">دانشنامه داخلی شاتل</span>' +
      '<h1>همهٔ دانش فنی شاتل،<br><span class="grad">مرتب و یکپارچه.</span></h1>' +
      '<p>ساختار جدید دانشنامه در ۷ دامنه: تجهیزات و کانفیگ، سرویس‌ها، عیب‌یابی عمومی، فرآیندها و قوانین، سامانه‌ها، آموزش و بایگانی — با جستجوی آنی در متن همه مقالات.</p>' +
      '<div class="stats">' +
      '<div class="stat"><b>' + fa(live.length) + '</b><span>مقاله فعال</span></div>' +
      '<div class="stat"><b>' + fa(D.groups.length) + '</b><span>زیرشاخه مرتب</span></div>' +
      '<div class="stat"><b>' + fa(totalViews) + '</b><span>بازدید ثبت‌شده</span></div>' +
      '<div class="stat"><b>' + fa(D.nodes.filter(n => n.rescued).length) + '</b><span>نجات‌یافته از بایگانی</span></div>' +
      '</div>' +
      '<a class="cta" href="#/d/trouble">' + ICONS.activity + ' شروع عیب‌یابی</a>' +
      '<nav class="chips">' + chips + '</nav>' +
      '</div></div>' +
      '<h2 class="sec-title">دامنه‌ها</h2><div class="cards">' + cards + '</div>' +
      '<h2 class="sec-title">پربازدیدترین مقالات</h2><div class="toplist">' +
      top.map((n, i) => '<a href="#/a/' + n.id + '"><span class="rank">' + fa(i + 1) + '</span><span>' + esc(n.name) + '</span>' + domBadge(n) + '<span class="vw">' + fa(n.views) + ' بازدید</span></a>').join('') +
      '</div></div>';
    initNet();
  }

  function renderDomain(id) {
    const d = domById[id];
    if (!d) return render404();
    const gs = groupsByDom[id];
    const cnt = domCount[id];
    const views = D.nodes.filter(n => n.domain === id).reduce((s, n) => s + n.views, 0);
    const warn = id === 'archive' ? '<div class="arch-warn">این بخش شامل محتوای منسوخ است و از جستجو و صفحه اصلی حذف شده؛ فقط برای مراجعه تاریخی نگهداری می‌شود.</div>' : '';
    const cards = gs.map(g =>
      '<a class="card gcard" style="--c:' + d.color + '" href="#/g/' + g.gi + '"><b>' + esc(g.title) + '</b>' +
      '<span class="n"><span>' + fa(g.count) + ' مقاله</span><span>' + fa(g.views) + ' بازدید</span></span></a>'
    ).join('');
    main.innerHTML = '<div class="fadein">' + warn +
      '<div class="dom-head" style="--c:' + d.color + '"><span class="dic">' + icon(d.icon) + '</span><div>' +
      '<h1>' + esc(d.title) + '</h1><p>' + esc(d.desc) + '</p>' +
      '<div class="dst"><span><b>' + fa(cnt) + '</b> مقاله</span><span><b>' + fa(gs.length) + '</b> زیرشاخه</span><span><b>' + fa(views) + '</b> بازدید</span></div>' +
      '</div></div>' +
      '<h2 class="sec-title">زیرشاخه‌ها (به ترتیب بازدید)</h2><div class="cards">' + cards + '</div></div>';
  }

  function treeNode(id, inGroup) {
    const n = byId[id];
    const kids = (n.children || []).filter(c => inGroup ? (byId[c].domain === n.domain && byId[c].group === n.group) : true);
    const tg = kids.length ? '<button class="tg" data-t="' + id + '">+</button>' : '<span class="leaf-dot"></span>';
    return '<li><div class="trow">' + tg + '<a href="#/a/' + id + '">' + esc(n.name) + '</a><span class="vw">' + fa(n.views) + '</span></div>' +
      (kids.length ? '<ul hidden>' + kids.map(c => treeNode(c, inGroup)).join('') + '</ul>' : '') + '</li>';
  }
  function bindTree(scope) {
    scope.querySelector('.tree').addEventListener('click', e => {
      const b = e.target.closest('.tg');
      if (!b) return;
      const ul = b.closest('li').querySelector(':scope > ul');
      const open = !ul.hidden;
      ul.hidden = open;
      b.textContent = open ? '+' : '−';
    });
    const exp = scope.querySelector('#expAll'), col = scope.querySelector('#colAll');
    if (exp) exp.onclick = () => { scope.querySelectorAll('.tree ul').forEach(u => u.hidden = false); scope.querySelectorAll('.tg').forEach(b => b.textContent = '−'); };
    if (col) col.onclick = () => { scope.querySelectorAll('.tree ul').forEach(u => u.hidden = true); scope.querySelectorAll('.tg').forEach(b => b.textContent = '+'); };
  }

  function renderGroup(gi) {
    const g = D.groups[gi];
    if (!g) return render404();
    const d = domById[g.domain];
    const tops = groupTops[gi];
    const warn = g.domain === 'archive' ? '<div class="arch-warn">محتوای منسوخ — فقط برای مراجعه تاریخی.</div>' : '';
    main.innerHTML = '<div class="fadein">' + warn +
      '<div class="crumbs"><a href="#/">خانه</a><span class="sep">‹</span><a href="#/d/' + d.id + '">' + esc(d.title) + '</a><span class="sep">‹</span><span>' + esc(g.title) + '</span></div>' +
      '<div class="dom-head" style="--c:' + d.color + '"><span class="dic">' + icon(d.icon) + '</span><div>' +
      '<h1>' + esc(g.title) + '</h1><p>' + esc(d.title) + '</p>' +
      '<div class="dst"><span><b>' + fa(g.count) + '</b> مقاله</span><span><b>' + fa(g.views) + '</b> بازدید</span></div>' +
      '<div style="margin-top:12px;display:flex;gap:8px"><button class="hbtn" style="width:auto;padding:0 16px;font-family:inherit;font-size:13px" id="expAll">باز کردن همه</button>' +
      '<button class="hbtn" style="width:auto;padding:0 16px;font-family:inherit;font-size:13px" id="colAll">بستن همه</button></div>' +
      '</div></div>' +
      '<div class="tree" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:18px"><ul>' +
      tops.map(t => treeNode(t.id, true)).join('') + '</ul></div></div>';
    bindTree(main);
  }

  function renderArticle(id) {
    const n = byId[id];
    if (!n) return render404();
    const kids = n.children || [];
    let steps = '';
    if (kids.length) {
      steps = '<div class="steps-title">' + ICONS.steps + (n.html ? 'گام بعدی را انتخاب کنید' : 'این یک دسته است؛ ادامه دهید') + '</div><div class="steps">' +
        kids.map((c, i) => stepHtml(byId[c], i + 1)).join('') + '</div>';
    }
    const bodyHtml = n.html || (kids.length ? '' : '<p style="color:var(--muted)">محتوایی برای این صفحه ثبت نشده است.</p>');
    const back = n.parent ? '<a class="backstep" href="#/a/' + n.parent + '">' + ICONS.back + ' بازگشت به: ' + esc(byId[n.parent].name) + '</a>' : '';
    const gi = nodeGroup[id];
    const so = gi !== undefined ? groupNodes[gi].map(x => x.id) : [];
    const pi = so.indexOf(id);
    let pager = '<div class="pager">';
    pager += pi > 0 ? '<a href="#/a/' + so[pi - 1] + '"><small>قبلی</small>' + esc(byId[so[pi - 1]].name) + '</a>' : '<span style="flex:1"></span>';
    pager += pi >= 0 && pi < so.length - 1 ? '<a class="next" href="#/a/' + so[pi + 1] + '"><small>بعدی</small>' + esc(byId[so[pi + 1]].name) + '</a>' : '<span style="flex:1"></span>';
    pager += '</div>';
    const d = domById[n.domain];
    main.innerHTML = '<div class="fadein">' + crumbs(id) +
      '<div class="article-head"><h1>' + esc(n.name) + '</h1>' +
      '<div style="margin-bottom:8px"><a href="#/g/' + gi + '" style="margin-left:6px">' + domBadge(n) + '</a>' +
      '<span class="badge-dom" style="--c:' + d.color + '">' + esc(n.group) + '</span></div>' +
      metaHtml(n) + '</div>' +
      (bodyHtml ? '<div class="article-body">' + bodyHtml + '</div>' : '') + steps + back + pager + '</div>';
    main.querySelectorAll('.article-body img').forEach(img => {
      img.addEventListener('click', () => openLightbox(img.src));
    });
  }

  function renderSearch(q) {
    const res = doSearch(q);
    let body;
    if (!res.length) {
      body = '<div class="empty">نتیجه‌ای برای «' + esc(q) + '» یافت نشد.</div>';
    } else {
      body = '<div class="list">' + res.map(r => {
        const n = byId[r.id];
        return '<a class="row" href="#/a/' + n.id + '"><div style="min-width:0"><span>' + esc(n.name) + '</span> ' + domBadge(n) +
          '<div class="snippet">' + snippet(r.text, q, r.pos) + '</div></div>' +
          '<span class="vw">' + fa(n.views) + '</span></a>';
      }).join('') + '</div>';
    }
    main.innerHTML = '<div class="fadein"><div class="article-head"><h1>جستجو: ' + esc(q) + '</h1>' +
      '<p style="color:var(--muted);font-size:13px">' + fa(res.length) + ' نتیجه (بایگانی جستجو نمی‌شود)</p></div>' + body + '</div>';
  }

  function renderTree() {
    const roots = D.nodes.filter(n => !n.parent);
    main.innerHTML = '<div class="fadein"><div class="article-head"><h1>درخت کامل محتوا</h1>' +
      '<p style="color:var(--muted);font-size:13px">هر ' + fa(D.nodes.length) + ' گره با ساختار اصلی — دسته‌بندی جدید در صفحه هر مقاله نشان داده می‌شود</p>' +
      '<div style="margin-top:12px;display:flex;gap:8px"><button class="hbtn" style="width:auto;padding:0 16px;font-family:inherit;font-size:13px" id="expAll">باز کردن همه</button>' +
      '<button class="hbtn" style="width:auto;padding:0 16px;font-family:inherit;font-size:13px" id="colAll">بستن همه</button></div></div>' +
      '<div class="tree" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:18px"><ul>' +
      roots.map(r => treeNode(r.id, false)).join('') + '</ul></div></div>';
    bindTree(main);
  }

  function render404() {
    main.innerHTML = '<div class="empty">صفحه موردنظر یافت نشد.<br><a href="#/">بازگشت به خانه</a></div>';
  }

  // ---- sidebar ----
  function buildSidebar() {
    const aside = document.getElementById('sidebar');
    aside.innerHTML = '<div class="nav-title">ناوبری</div>' +
      '<a class="nav-item" href="#/" data-nav="home">' + ICONS.home.replace('<svg', '<svg style="width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2"') + ' خانه</a>' +
      D.domains.map(d => '<a class="nav-item" href="#/d/' + d.id + '" data-nav="' + d.id + '"><span class="dot" style="background:' + d.color + '"></span>' + esc(d.title) + '<span class="cnt">' + fa(domCount[d.id]) + '</span></a>').join('') +
      '<div class="nav-title">فهرست</div>' +
      '<a class="nav-item" href="#/tree" data-nav="tree">' + ICONS.tree.replace('<svg', '<svg style="width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2"') + ' درخت کامل محتوا</a>';
  }
  function setActive(key) {
    document.querySelectorAll('aside .nav-item').forEach(a => a.classList.toggle('active', a.dataset.nav === key));
  }

  // ---- router ----
  function route() {
    stopNet();
    const h = location.hash || '#/';
    const parts = h.replace(/^#\//, '').split('/');
    window.scrollTo({ top: 0 });
    document.getElementById('sidebar').classList.remove('open');
    if (parts[0] === '') { renderHome(); setActive('home'); document.title = 'دانش‌هاب | دانشنامه فنی شاتل'; }
    else if (parts[0] === 'd') { renderDomain(parts[1]); setActive(parts[1]); document.title = (domById[parts[1]] || {}).title + ' | دانش‌هاب'; }
    else if (parts[0] === 'g') {
      const g = D.groups[+parts[1]];
      renderGroup(+parts[1]); setActive(g ? g.domain : '');
      document.title = (g ? g.title : 'یافت نشد') + ' | دانش‌هاب';
    }
    else if (parts[0] === 'a') {
      renderArticle(parts[1]);
      const n = byId[parts[1]];
      setActive(n ? n.domain : '');
      document.title = (n ? n.name : 'یافت نشد') + ' | دانش‌هاب';
    }
    else if (parts[0] === 'search') { const q = decodeURIComponent(parts.slice(1).join('/') || ''); renderSearch(q); setActive(''); document.title = 'جستجو: ' + q + ' | دانش‌هاب'; document.getElementById('q').value = q; }
    else if (parts[0] === 'tree') { renderTree(); setActive('tree'); document.title = 'درخت محتوا | دانش‌هاب'; }
    else render404();
    document.getElementById('progress').style.width = '0';
  }

  // ---- events ----
  function openLightbox(src) {
    const lb = document.getElementById('lightbox');
    lb.querySelector('img').src = src;
    lb.classList.add('open');
  }
  document.getElementById('lightbox').addEventListener('click', function () { this.classList.remove('open'); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.getElementById('lightbox').classList.remove('open');
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); document.getElementById('q').focus(); }
  });
  document.getElementById('q').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.value.trim()) location.hash = '#/search/' + encodeURIComponent(e.target.value.trim());
  });
  document.getElementById('themeBtn').addEventListener('click', () => {
    const cur = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = cur;
    localStorage.setItem('danesh-theme', cur);
  });
  document.getElementById('menuBtn').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
  main.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (href.startsWith('#') && !href.startsWith('#/')) {
      e.preventDefault();
      const name = href.slice(1);
      const t = main.querySelector('[id="' + name + '"], [name="' + name + '"]');
      if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
  window.addEventListener('scroll', () => {
    const el = document.querySelector('.article-body');
    if (!el) return;
    const r = el.getBoundingClientRect();
    const total = r.height - window.innerHeight;
    const done = Math.min(Math.max(-r.top, 0), Math.max(total, 1));
    document.getElementById('progress').style.width = (total > 0 ? done / total * 100 : 0) + '%';
  });
  window.addEventListener('hashchange', route);

  // ---- init ----
  document.documentElement.dataset.theme = localStorage.getItem('danesh-theme') || 'light';
  buildSidebar();
  route();
})();