/* VimiGradient — app logic. MIT License. */
(function () {
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const clone = o => JSON.parse(JSON.stringify(o));
  const LOOP_PERIOD = Math.PI * 8; // shader motion repeats every 8π time units

  // ---------- i18n ----------
  let lang = 'en';
  try { lang = localStorage.getItem('vg-lang') || (navigator.language.startsWith('ru') ? 'ru' : 'en'); } catch (e) {}
  const tr = k => (VG.I18N[lang] && VG.I18N[lang][k]) || k;
  const enText = {};
  function applyLang() {
    $$('[data-i18n]').forEach(el => {
      const k = el.dataset.i18n;
      if (!(k in enText)) enText[k] = el.textContent;
      el.textContent = lang === 'en' ? enText[k] : (tr(k) !== k ? tr(k) : enText[k]);
    });
    $$('.slider').forEach(el => el.querySelector('.lbl').textContent = lang === 'en' ? el.dataset.label : tr(el.dataset.label));
    $('#btnLang').textContent = lang === 'en' ? 'RU' : 'EN';
    document.documentElement.lang = lang;
    updatePlayBtn();
  }
  const msg = k => lang === 'en' ? ({ copied: 'Copied', saved: 'Saved', rendering: 'Rendering…', done: 'Done',
    maxColors: 'Max 10 colors', minColors: 'At least 2 colors needed', pause: '⏸ Pause', play: '▶ Animate' })[k] : tr(k);

  function toast(t) {
    const el = $('#toast'); el.textContent = t; el.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('show'), 1800);
  }

  // ---------- state ----------
  let state = clone(VG.DEFAULTS);
  const fromHash = () => {
    if (!location.hash.startsWith('#s=')) return null;
    try { return JSON.parse(decodeURIComponent(escape(atob(location.hash.slice(3))))); } catch (e) { return null; }
  };
  const h = fromHash(); if (h) state = Object.assign(clone(VG.DEFAULTS), h);

  // ---------- undo ----------
  const hist = [clone(state)]; let hi = 0; let histTimer;
  function commit() {
    clearTimeout(histTimer);
    histTimer = setTimeout(() => {
      const s = JSON.stringify(state);
      if (JSON.stringify(hist[hi]) === s) return;
      hist.splice(hi + 1); hist.push(JSON.parse(s)); if (hist.length > 100) hist.shift(); hi = hist.length - 1;
    }, 250);
  }
  function undo(d) {
    const n = hi + d; if (n < 0 || n >= hist.length) return;
    hi = n; state = clone(hist[hi]); syncUI();
  }

  // ---------- renderer ----------
  const canvas = $('#gl');
  let R;
  try { R = new VG.Renderer(canvas); } catch (e) { document.body.innerHTML = '<p style="padding:40px">WebGL error: ' + e.message + '</p>'; return; }

  let playing = false, time = 0, last = performance.now(), dirty = true;
  function fit() {
    const wrap = $('#canvasWrap');
    const aw = wrap.clientWidth - 56, ah = wrap.clientHeight - 56;
    const k = Math.min(aw / state.width, ah / state.height);
    const cw = Math.max(40, Math.floor(state.width * k)), ch = Math.max(40, Math.floor(state.height * k));
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    const r = canvas.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
    const hd = $('#handles');
    Object.assign(hd.style, { left: r.left - wr.left + 'px', top: r.top - wr.top + 'px', width: cw + 'px', height: ch + 'px' });
    dirty = true; placeHandles();
  }
  function frame(now) {
    const dt = (now - last) / 1000; last = now;
    if (playing) { time += dt * state.speed * 4; dirty = true; }
    if (dirty) { R.render(state, time, state.width / canvas.width); dirty = false; }
    requestAnimationFrame(frame);
  }
  const redraw = () => { dirty = true; };

  // ---------- handles ----------
  const usesPoints = () => ['0', '2', '3', '5'].includes(String(state.mode));
  function buildHandles() {
    const hd = $('#handles'); hd.innerHTML = '';
    state.colors.forEach((c, i) => {
      const el = document.createElement('div');
      el.className = 'handle'; el.style.background = c.color; el.dataset.i = i;
      if (!usesPoints() || ((state.mode == 2 || state.mode == 3) && i > 0)) el.style.display = 'none';
      el.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        e.preventDefault(); el.setPointerCapture(e.pointerId); el.classList.add('active');
        const r = hd.getBoundingClientRect();
        const move = ev => {
          state.colors[i].x = Math.min(1.1, Math.max(-0.1, (ev.clientX - r.left) / r.width));
          state.colors[i].y = Math.min(1.1, Math.max(-0.1, (ev.clientY - r.top) / r.height));
          placeHandles(); updateXY(); redraw();
        };
        const up = () => { el.classList.remove('active'); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); commit(); };
        el.addEventListener('pointermove', move); el.addEventListener('pointerup', up);
      });
      el.addEventListener('contextmenu', e => { e.preventDefault(); removeColor(i); });
      hd.appendChild(el);
    });
    placeHandles();
  }
  function placeHandles() {
    $$('.handle').forEach(el => {
      const c = state.colors[+el.dataset.i]; if (!c) return;
      el.style.left = c.x * 100 + '%'; el.style.top = c.y * 100 + '%';
    });
  }
  canvas.addEventListener('dblclick', e => {
    const r = canvas.getBoundingClientRect();
    addColor(randomColor(), (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  });

  // ---------- colors ----------
  const rnd = (a, b) => a + Math.random() * (b - a);
  function hsl2hex(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))))).toString(16).padStart(2, '0');
    return '#' + f(0) + f(8) + f(4);
  }
  const randomColor = () => hsl2hex(rnd(0, 360), rnd(55, 95), rnd(40, 75));
  function randomPalette(n) {
    const base = rnd(0, 360);
    const scheme = Math.floor(rnd(0, 4)); // analogous, complementary, triadic, wild
    const out = [];
    for (let i = 0; i < n; i++) {
      let hue = scheme === 0 ? base + i * rnd(18, 35) : scheme === 1 ? base + (i % 2) * 180 + rnd(-20, 20)
        : scheme === 2 ? base + (i % 3) * 120 + rnd(-15, 15) : rnd(0, 360);
      const dark = Math.random() < 0.18;
      out.push(hsl2hex((hue + 360) % 360, rnd(50, 95), dark ? rnd(8, 22) : rnd(45, 80)));
    }
    return out;
  }
  function addColor(color, x, y) {
    if (state.colors.length >= VG.MAX_COLORS) return toast(msg('maxColors'));
    state.colors.push({ color, x: x ?? Math.random(), y: y ?? Math.random() });
    buildColors(); buildHandles(); redraw(); commit();
  }
  function removeColor(i) {
    if (state.colors.length <= 2) return toast(msg('minColors'));
    state.colors.splice(i, 1); buildColors(); buildHandles(); redraw(); commit();
  }
  function buildColors() {
    const list = $('#colorList'); list.innerHTML = '';
    state.colors.forEach((c, i) => {
      const row = document.createElement('div'); row.className = 'color-item';
      row.innerHTML = `<input type="color" value="${c.color}"><input type="text" value="${c.color}" maxlength="7"><span class="xy"></span>
        <button class="ghost" title="Duplicate">⧉</button><button class="ghost" title="Remove">✕</button>`;
      const [pick, txt] = row.querySelectorAll('input');
      const [dup, del] = row.querySelectorAll('button');
      const set = v => { c.color = v; pick.value = v; txt.value = v; const hEl = $$('.handle')[i]; if (hEl) hEl.style.background = v; redraw(); };
      pick.addEventListener('input', () => set(pick.value));
      pick.addEventListener('change', commit);
      txt.addEventListener('change', () => { let v = txt.value.trim(); if (!v.startsWith('#')) v = '#' + v; if (/^#[0-9a-f]{6}$/i.test(v)) { set(v.toLowerCase()); commit(); } else txt.value = c.color; });
      dup.onclick = () => addColor(c.color, Math.min(1, c.x + 0.08), Math.min(1, c.y + 0.08));
      del.onclick = () => removeColor(i);
      list.appendChild(row);
    });
    updateXY();
  }
  function updateXY() {
    $$('.color-item .xy').forEach((el, i) => { const c = state.colors[i]; if (c) el.textContent = `${Math.round(c.x * 100)}, ${Math.round(c.y * 100)}`; });
  }

  // ---------- sliders ----------
  $$('.slider').forEach(el => {
    const k = el.dataset.key;
    el.innerHTML = `<div class="top-l"><span class="lbl">${el.dataset.label}</span><b></b></div>
      <input type="range" min="${el.dataset.min}" max="${el.dataset.max}" step="${el.dataset.step}">`;
    const inp = el.querySelector('input'), out = el.querySelector('b');
    inp.addEventListener('input', () => { state[k] = +inp.value; out.textContent = fmt(+inp.value, el.dataset.step); redraw(); });
    inp.addEventListener('change', commit);
    inp.addEventListener('dblclick', () => { state[k] = VG.DEFAULTS[k]; syncUI(); commit(); });
    el._sync = () => { inp.value = state[k]; out.textContent = fmt(+state[k], el.dataset.step); };
  });
  const fmt = (v, step) => (+step >= 1 ? Math.round(v) : v.toFixed(step.split('.')[1].length > 2 ? 3 : 2));

  // ---------- simple inputs ----------
  const bindSel = (id, key) => $(id).addEventListener('change', e => { state[key] = e.target.value; if (key === 'mode') buildHandles(); redraw(); commit(); });
  bindSel('#mode', 'mode'); bindSel('#grainType', 'grainType');
  $('#grainAnim').addEventListener('change', e => { state.grainAnim = e.target.checked; redraw(); commit(); });
  $('#bgColor').addEventListener('input', e => { state.bg = e.target.value; redraw(); });
  $('#bgColor').addEventListener('change', commit);
  $('#showHandles').addEventListener('change', e => $('#handles').classList.toggle('hide', !e.target.checked));

  // ---------- size ----------
  const RATIOS = [['16:9', 1920, 1080], ['9:16', 1080, 1920], ['1:1', 2048, 2048], ['4:3', 2048, 1536],
    ['3:2', 2400, 1600], ['4:5', 1080, 1350], ['21:9', 2560, 1080], ['4K', 3840, 2160],
    ['MacBook', 3024, 1964], ['iPhone', 1179, 2556], ['Twitter', 1500, 500], ['A4', 2480, 3508]];
  RATIOS.forEach(([n, w, hh]) => {
    const b = document.createElement('button'); b.textContent = n; b.title = `${w}×${hh}`;
    b.onclick = () => { state.width = w; state.height = hh; syncUI(); fit(); commit(); };
    $('#ratios').appendChild(b);
  });
  ['w', 'h'].forEach(id => $('#' + id).addEventListener('change', e => {
    const v = Math.max(16, Math.min(R.maxSize || 8192, Math.round(+e.target.value || 16)));
    state[id === 'w' ? 'width' : 'height'] = v; syncUI(); fit(); commit();
  }));

  // ---------- presets ----------
  const thumbCanvas = document.createElement('canvas'); thumbCanvas.width = thumbCanvas.height = 96;
  let thumbR; try { thumbR = new VG.Renderer(thumbCanvas); } catch (e) {}
  function thumb(p) {
    if (!thumbR) return '';
    const s = Object.assign(clone(VG.DEFAULTS), clone(p)); s.width = s.height = 96;
    thumbR.render(s, 0, 1); return thumbCanvas.toDataURL();
  }
  const userPresets = () => { try { return JSON.parse(localStorage.getItem('vg-presets') || '[]'); } catch (e) { return []; } };
  function buildPresets() {
    const box = $('#presets'); box.innerHTML = '';
    const add = (p, user, idx) => {
      const b = document.createElement('button'); b.className = 'preset'; b.title = p.name || '';
      b.style.background = `url(${thumb(p)}) center/cover`;
      b.onclick = () => applyPreset(p);
      if (user) {
        const d = document.createElement('span'); d.className = 'del'; d.textContent = '✕';
        d.onclick = ev => { ev.stopPropagation(); const u = userPresets(); u.splice(idx, 1); localStorage.setItem('vg-presets', JSON.stringify(u)); buildPresets(); };
        b.appendChild(d);
      }
      box.appendChild(b);
    };
    userPresets().forEach((p, i) => add(p, true, i));
    VG.PRESETS.forEach(p => add(p, false));
  }
  function applyPreset(p) {
    const keep = { width: state.width, height: state.height, speed: state.speed };
    state = Object.assign(clone(VG.DEFAULTS), clone(p), keep);
    delete state.name; syncUI(); commit();
  }

  // ---------- randomize ----------
  function randomize() {
    const n = Math.floor(rnd(3, 7));
    const cols = randomPalette(n);
    state.colors = cols.map(c => ({ color: c, x: rnd(0.02, 0.98), y: rnd(0.02, 0.98) }));
    state.mode = Math.random() < 0.75 ? '0' : String(Math.floor(rnd(1, 6)));
    state.angle = Math.round(rnd(0, 360));
    state.softness = +rnd(1.4, 3.5).toFixed(2);
    state.warp = +rnd(0.15, 0.9).toFixed(2);
    state.warpScale = +rnd(0.8, 3).toFixed(2);
    state.swirl = Math.random() < 0.25 ? +rnd(-2.5, 2.5).toFixed(2) : 0;
    state.seed = +rnd(0, 100).toFixed(1);
    state.grain = +rnd(0.06, 0.25).toFixed(3);
    state.bg = hsl2hex(rnd(0, 360), rnd(20, 60), rnd(4, 14));
    syncUI(); commit();
  }

  // ---------- sync ----------
  function syncUI() {
    $$('.slider').forEach(el => el._sync());
    $('#mode').value = state.mode; $('#grainType').value = state.grainType;
    $('#grainAnim').checked = !!state.grainAnim; $('#bgColor').value = state.bg;
    $('#w').value = state.width; $('#h').value = state.height;
    $$('#ratios button').forEach(b => b.classList.toggle('on', b.title === `${state.width}×${state.height}`));
    buildColors(); buildHandles(); fit(); redraw();
  }

  // ---------- playback ----------
  function updatePlayBtn() { $('#btnPlay').textContent = playing ? msg('pause') : msg('play'); }
  $('#btnPlay').onclick = () => { playing = !playing; updatePlayBtn(); };

  // ---------- share / json / css ----------
  const encode = () => btoa(unescape(encodeURIComponent(JSON.stringify(state))));
  $('#btnShare').onclick = async () => {
    const url = location.href.split('#')[0] + '#s=' + encode();
    history.replaceState(null, '', url);
    try { await navigator.clipboard.writeText(url); toast(msg('copied')); } catch (e) { prompt('URL', url); }
  };
  const download = (blob, name) => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };
  const stamp = () => 'vimigradient-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  $('#btnSaveJson').onclick = () => download(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }), stamp() + '.json');
  $('#btnLoadJson').onclick = () => $('#fileJson').click();
  $('#fileJson').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try { state = Object.assign(clone(VG.DEFAULTS), JSON.parse(await f.text())); syncUI(); commit(); } catch (err) { toast('Invalid JSON'); }
    e.target.value = '';
  };
  $('#btnSavePreset').onclick = () => {
    const u = userPresets(); const p = clone(state); delete p.width; delete p.height;
    u.unshift(p); try { localStorage.setItem('vg-presets', JSON.stringify(u.slice(0, 40))); } catch (e) {}
    buildPresets(); toast(msg('saved'));
  };
  $('#btnCss').onclick = async () => {
    const layers = state.colors.map(c => `radial-gradient(at ${Math.round(c.x * 100)}% ${Math.round(c.y * 100)}%, ${c.color} 0px, transparent 55%)`);
    const css = `background-color: ${state.colors[0].color};\nbackground-image:\n  ${layers.join(',\n  ')};`;
    try { await navigator.clipboard.writeText(css); toast(msg('copied')); } catch (e) { prompt('CSS', css); }
  };

  // ---------- export ----------
  const dlg = $('#exportDlg');
  let tab = 'img';
  $$('.tab').forEach(t => t.onclick = () => {
    tab = t.dataset.tab;
    $$('.tab').forEach(x => x.classList.toggle('active', x === t));
    $$('.tabpane').forEach(p => p.classList.toggle('hidden', p.dataset.pane !== tab));
  });
  function exInfo() {
    const sc = +$('#exScale').value;
    let w = state.width * sc, hh = state.height * sc;
    const max = R.maxSize || 8192, k = Math.min(1, max / Math.max(w, hh));
    $('#exInfo').textContent = `${Math.round(w * k)} × ${Math.round(hh * k)} px` + (k < 1 ? ` (GPU limit ${max})` : '');
    $('#exQuality').disabled = $('#exFormat').value === 'png';
    $('#vInfo').textContent = window.MediaRecorder ? 'WebM (VP9/VP8), real-time recording' : 'MediaRecorder not supported in this browser';
  }
  ['#exScale', '#exFormat'].forEach(s => $(s).addEventListener('change', exInfo));
  $('#btnExport').onclick = () => { exInfo(); dlg.showModal(); };

  function offscreen(w, hh) {
    const c = document.createElement('canvas'); c.width = w; c.height = hh;
    return { c, r: new VG.Renderer(c) };
  }
  async function exportImage() {
    const sc = +$('#exScale').value, max = R.maxSize || 8192;
    let w = state.width * sc, hh = state.height * sc;
    const k = Math.min(1, max / Math.max(w, hh)); w = Math.round(w * k); hh = Math.round(hh * k);
    toast(msg('rendering'));
    await new Promise(r => setTimeout(r, 30));
    const { c, r } = offscreen(w, hh);
    r.render(state, time, state.width / w);
    const fmtv = $('#exFormat').value;
    c.toBlob(b => {
      if (!b) return toast('Export failed (image too large?)');
      download(b, stamp() + '.' + (fmtv === 'jpeg' ? 'jpg' : fmtv)); toast(msg('done'));
      r.gl.getExtension('WEBGL_lose_context')?.loseContext();
    }, 'image/' + fmtv, +$('#exQuality').value);
  }
  async function exportVideo() {
    if (!window.MediaRecorder) return toast('MediaRecorder not supported');
    const dur = Math.max(1, +$('#vDur').value), fps = +$('#vFps').value, side = +$('#vRes').value;
    const k = side / Math.max(state.width, state.height);
    const w = Math.round(state.width * k / 2) * 2, hh = Math.round(state.height * k / 2) * 2;
    const { c, r } = offscreen(w, hh);
    const stream = c.captureStream(fps);
    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find(m => MediaRecorder.isTypeSupported(m));
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: +$('#vBit').value * 1e6 });
    const chunks = []; rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    const prog = $('#vProg'), bar = prog.firstElementChild; prog.classList.remove('hidden');
    const btn = $('#doExport'); btn.disabled = true;
    const loop = $('#vLoop').checked, t0 = time;
    const done = new Promise(res => rec.onstop = res);
    rec.start(250);
    const start = performance.now();
    await new Promise(res => {
      const tick = () => {
        const el = (performance.now() - start) / 1000, p = Math.min(1, el / dur);
        const t = loop ? t0 + p * LOOP_PERIOD : t0 + el * state.speed * 4;
        r.render(state, t, state.width / w);
        bar.style.width = p * 100 + '%';
        if (p < 1) setTimeout(tick, 1000 / fps); else res();
      };
      tick();
    });
    rec.stop(); await done;
    download(new Blob(chunks, { type: mime }), stamp() + (mime.includes('mp4') ? '.mp4' : '.webm'));
    prog.classList.add('hidden'); bar.style.width = '0'; btn.disabled = false; toast(msg('done'));
    r.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
  // ---------- WebGL code export ----------
  function codeState() { const s = clone(state); s.speed = $('#cAnim').checked ? s.speed : 0; return s; }
  function runtime(sel) {
    return `${VG.RENDERER_SRC}
(function(){var S=${JSON.stringify(codeState())};var T=${time.toFixed(3)};
var c=document.querySelector(${JSON.stringify(sel)});var r=new VG.Renderer(c);var last=performance.now();
function fit(){var d=Math.min(devicePixelRatio||1,2);var w=Math.max(1,Math.round(c.clientWidth*d)),h=Math.max(1,Math.round(c.clientHeight*d));
if(c.width!==w||c.height!==h){c.width=w;c.height=h;draw();}}
function draw(){r.render(S,T,1);}
function loop(n){T+=(n-last)/1000*S.speed*4;last=n;fit();draw();if(S.speed>0)requestAnimationFrame(loop);}
addEventListener('resize',function(){fit();draw();});fit();draw();if(S.speed>0)requestAnimationFrame(loop);})();`;
  }
  function snippet() {
    const full = $('#cFull').checked;
    const css = full ? 'position:fixed;inset:0;width:100vw;height:100vh;z-index:-1;display:block' : 'width:100%;aspect-ratio:' + state.width + '/' + state.height + ';display:block';
    return `<!-- VimiGradient https://github.com -->\n<canvas id="vimigradient" style="${css}"></canvas>\n<script>\n${runtime('#vimigradient')}\n<\/script>`;
  }
  function updateCode() { $('#cOut').value = snippet(); }
  ['#cAnim', '#cFull'].forEach(s => $(s).addEventListener('change', updateCode));
  $('#cHtml').onclick = () => {
    const html = `<!doctype html>\n<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VimiGradient</title>\n<style>html,body{margin:0;height:100%;background:${state.colors[0].color}}</style></head>\n<body>\n${snippet()}\n</body></html>`;
    download(new Blob([html], { type: 'text/html' }), stamp() + '.html'); toast(msg('done'));
  };
  $('#cSnippet').onclick = async () => { try { await navigator.clipboard.writeText(snippet()); toast(msg('copied')); } catch (e) { $('#cOut').select(); } };
  $('#cJs').onclick = () => {
    const js = `// VimiGradient — usage: <canvas id="vimigradient"></canvas><script src="vimigradient.js"></script>\n${runtime('#vimigradient')}`;
    download(new Blob([js], { type: 'text/javascript' }), 'vimigradient.js'); toast(msg('done'));
  };
  $$('.tab').forEach(t => t.addEventListener('click', () => { if (t.dataset.tab === 'code') updateCode(); }));
  $('#doExport').onclick = () => (tab === 'img' ? exportImage() : tab === 'vid' ? exportVideo() : $('#cHtml').click());

  // ---------- buttons & keys ----------
  $('#btnRandom').onclick = randomize;
  $('#btnAddColor').onclick = () => addColor(randomColor());
  $('#btnShufflePos').onclick = () => { state.colors.forEach(c => { c.x = rnd(0.02, 0.98); c.y = rnd(0.02, 0.98); }); placeHandles(); updateXY(); redraw(); commit(); };
  $('#btnRandPalette').onclick = () => { const p = randomPalette(state.colors.length); state.colors.forEach((c, i) => c.color = p[i]); buildColors(); buildHandles(); redraw(); commit(); };
  $('#btnUndo').onclick = () => undo(-1); $('#btnRedo').onclick = () => undo(1);
  $('#btnLang').onclick = () => { lang = lang === 'en' ? 'ru' : 'en'; try { localStorage.setItem('vg-lang', lang); } catch (e) {} applyLang(); };
  document.addEventListener('keydown', e => {
    if (e.target.matches('input,select,textarea') || dlg.open) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(e.shiftKey ? 1 : -1); }
    else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); undo(1); }
    else if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); $('#btnExport').click(); }
    else if (!mod && e.key.toLowerCase() === 'r') randomize();
    else if (e.code === 'Space') { e.preventDefault(); $('#btnPlay').click(); }
  });
  window.addEventListener('resize', fit);
  new ResizeObserver(fit).observe($('#canvasWrap'));

  // ---------- init ----------
  buildPresets(); syncUI(); applyLang();
  requestAnimationFrame(frame);
})();
