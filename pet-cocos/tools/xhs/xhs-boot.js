/* Xiaohongshu mini-tool boot (runs before the Cocos engine).
 * The container blocks network requests (fetch / XMLHttpRequest), so every data file the engine would download
 * (json, atlas, bin ...) is shipped as a script pack: xhs-pack-N.js calls __xhsPut(path, kind, data).
 * This file swaps XMLHttpRequest / fetch for local versions that answer from those packs.
 * It also provides window.__xhsStore (a synchronous Storage backed by xhs.miniTool Storage) and reads the window info.
 * Classic script, ES2017 (Chrome 61). Generated packs: see tools/finish-xhs.mjs. */
(function () {
  'use strict';
  var w = window;
  w.__XHS_MINITOOL = true;

  /* readable errors in the container log (it serialises Error objects as {}) */
  function txt(x) { return x instanceof Error ? (x.name + ': ' + x.message + (x.stack ? '\n' + x.stack : '')) : (x && typeof x === 'object' && x.message ? String(x.message) : x); }
  var oe = console.error;
  console.error = function () { return oe.apply(console, Array.prototype.map.call(arguments, txt)); };
  w.addEventListener('error', function (ev) { console.error('[xhs] ' + ev.message + ' @ ' + ev.filename + ':' + ev.lineno, ev.error || ''); });
  w.addEventListener('unhandledrejection', function (ev) { console.error('[xhs] unhandled rejection', ev.reason); });

  /* ---------- packaged files ---------- */
  var MANIFEST = w.__xhsManifest || {}; // path -> pack script, written by finish-xhs.mjs into xhs-manifest.js
  var store = Object.create(null);
  var packs = Object.create(null);
  w.__xhsPut = function (path, kind, data) { store[path] = { kind: kind, data: data }; };
  /** deflated pack: base64 of raw DEFLATE over JSON [[path, kind, data], ...] (see xhs/inflate.js) */
  w.__xhsPackZ = function (rawLength, b64) {
    var bin = atob(b64), z = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) z[i] = bin.charCodeAt(i);
    var list = JSON.parse(new TextDecoder('utf-8').decode(w.__xhsInflate(z, rawLength)));
    for (var j = 0; j < list.length; j++) store[list[j][0]] = { kind: list[j][1], data: list[j][2] };
  };

  var baseDir = (function () {
    var href = String(location.href).split('#')[0].split('?')[0];
    return href.slice(0, href.lastIndexOf('/') + 1);
  })();
  function keyOf(url) {
    var abs;
    try { abs = new URL(String(url), baseDir).href; } catch (e) { return null; }
    abs = abs.split('#')[0].split('?')[0];
    if (abs.indexOf(baseDir) !== 0) return null;
    var k = abs.slice(baseDir.length);
    try { k = decodeURIComponent(k); } catch (e) { /* keep raw */ }
    return Object.prototype.hasOwnProperty.call(MANIFEST, k) ? k : null;
  }
  function loadPack(file) {
    if (packs[file]) return packs[file];
    packs[file] = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = file;
      s.onload = function () { resolve(); };
      s.onerror = function () { delete packs[file]; reject(new Error('pack load failed: ' + file)); };
      document.head.appendChild(s);
    });
    return packs[file];
  }
  function getEntry(key) {
    if (store[key]) return Promise.resolve(store[key]);
    return loadPack(MANIFEST[key]).then(function () {
      if (!store[key]) throw new Error('missing packaged file: ' + key);
      return store[key];
    });
  }
  function b64ToBuffer(b64) {
    var bin = atob(b64), n = bin.length, u8 = new Uint8Array(n);
    for (var i = 0; i < n; i++) u8[i] = bin.charCodeAt(i);
    return u8.buffer;
  }
  function asText(e) {
    if (e.kind === 'b64') { var u8 = new Uint8Array(b64ToBuffer(e.data)), s = ''; for (var i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return s; }
    return e.kind === 'json' ? JSON.stringify(e.data) : e.data;
  }
  function asType(e, type) {
    if (type === 'arraybuffer') return e.kind === 'b64' ? b64ToBuffer(e.data) : new TextEncoder().encode(asText(e)).buffer;
    if (type === 'blob') return new Blob([asType(e, 'arraybuffer')]);
    if (type === 'json') return e.kind === 'json' ? JSON.parse(JSON.stringify(e.data)) : JSON.parse(asText(e));
    return asText(e);
  }
  w.__xhsHasFile = function (url) { return keyOf(url) !== null; };
  /** small images are packed too (the container allows at most 200 files): hand them out as blob: URLs */
  w.__xhsImageURL = function (url) {
    var key = keyOf(url);
    if (key === null) return Promise.resolve(null);
    return getEntry(key).then(function (e) {
      var ext = key.slice(key.lastIndexOf('.') + 1).toLowerCase();
      var type = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/' + ext;
      return URL.createObjectURL(new Blob([b64ToBuffer(e.data)], { type: type }));
    });
  };

  /* ---------- XMLHttpRequest ---------- */
  var NativeXHR = w.XMLHttpRequest;
  function LocalXHR() {
    this.readyState = 0; this.status = 0; this.statusText = ''; this.response = null; this.responseText = '';
    this.responseType = ''; this.responseURL = ''; this.timeout = 0; this.withCredentials = false;
    this.onload = this.onerror = this.onprogress = this.onreadystatechange = this.ontimeout = this.onabort = this.onloadend = this.onloadstart = null;
    this._h = {}; this._url = ''; this._key = null; this._native = null; this._aborted = false;
  }
  LocalXHR.UNSENT = 0; LocalXHR.OPENED = 1; LocalXHR.HEADERS_RECEIVED = 2; LocalXHR.LOADING = 3; LocalXHR.DONE = 4;
  var P = LocalXHR.prototype;
  P.addEventListener = function (t, f) { (this._h[t] = this._h[t] || []).push(f); };
  P.removeEventListener = function (t, f) { var a = this._h[t]; if (a) { var i = a.indexOf(f); if (i >= 0) a.splice(i, 1); } };
  P._fire = function (t, ev) {
    ev = ev || { type: t, target: this, currentTarget: this, lengthComputable: false, loaded: 0, total: 0 };
    var f = this['on' + t]; if (typeof f === 'function') f.call(this, ev);
    var a = (this._h[t] || []).slice(); for (var i = 0; i < a.length; i++) a[i].call(this, ev);
  };
  P._state = function (s) { this.readyState = s; this._fire('readystatechange'); };
  P.open = function (method, url) {
    this._url = String(url); this._key = keyOf(url); this._aborted = false;
    if (this._key === null) console.error('[xhs] request for a file that is not packaged: ' + this._url);
    if (this._key === null && NativeXHR) {
      var self = this, x = this._native = new NativeXHR();
      x.open.apply(x, arguments);
      ['load', 'error', 'progress', 'timeout', 'abort', 'loadend', 'loadstart', 'readystatechange'].forEach(function (t) {
        x.addEventListener(t, function (ev) {
          self.readyState = x.readyState; self.status = x.status; self.statusText = x.statusText; self.responseURL = x.responseURL;
          if (x.readyState === 4) { try { self.response = x.response; } catch (e) { } try { self.responseText = x.responseType === '' || x.responseType === 'text' ? x.responseText : ''; } catch (e) { } }
          self._fire(t, ev);
        });
      });
      return;
    }
    this._state(1);
  };
  P.setRequestHeader = function () { if (this._native) this._native.setRequestHeader.apply(this._native, arguments); };
  P.overrideMimeType = function () { if (this._native) this._native.overrideMimeType.apply(this._native, arguments); };
  P.getResponseHeader = function (n) { if (this._native) return this._native.getResponseHeader(n); return null; };
  P.getAllResponseHeaders = function () { return this._native ? this._native.getAllResponseHeaders() : ''; };
  P.abort = function () { if (this._native) { this._native.abort(); return; } this._aborted = true; };
  P.send = function (body) {
    var self = this;
    if (this._native) { this._native.responseType = this.responseType; this._native.timeout = this.timeout; this._native.send(body); return; }
    if (this._key === null) { setTimeout(function () { self.status = 0; self._state(4); self._fire('error'); self._fire('loadend'); }, 0); return; }
    this._fire('loadstart');
    getEntry(this._key).then(function (e) {
      if (self._aborted) { self._fire('abort'); return; }
      self.responseURL = new URL(self._url, baseDir).href;
      self.response = asType(e, self.responseType || 'text');
      if (self.responseType === '' || self.responseType === 'text') self.responseText = self.response;
      self.status = 200; self.statusText = 'OK';
      self._state(2); self._state(3); self._state(4);
      self._fire('progress', { type: 'progress', target: self, lengthComputable: true, loaded: 1, total: 1 });
      self._fire('load'); self._fire('loadend');
    }, function (err) {
      console.error(err);
      self.status = 404; self._state(4); self._fire('error'); self._fire('loadend');
    });
  };
  w.XMLHttpRequest = LocalXHR;

  /* ---------- fetch ---------- */
  var nativeFetch = w.fetch;
  w.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || String(input);
    var key = keyOf(url);
    if (key === null) console.error('[xhs] fetch for a file that is not packaged: ' + url);
    if (key === null) return nativeFetch ? nativeFetch.apply(w, arguments) : Promise.reject(new TypeError('network unavailable'));
    return getEntry(key).then(function (e) {
      var body = e.kind === 'b64' ? b64ToBuffer(e.data) : asText(e);
      var type = e.kind === 'json' || /\.json$/i.test(key) ? 'application/json' : /\.js$/i.test(key) ? 'application/javascript' : 'application/octet-stream';
      return new Response(body, { status: 200, headers: { 'Content-Type': type } });
    });
  };

  /* ---------- storage (sync facade over xhs.miniTool Storage) ---------- */
  var STORAGE_MIN = 9460, mem = Object.create(null), useXhs = false, timers = Object.create(null);
  var ls = null;
  try { ls = w.localStorage; var t = '__xhs_t'; ls.setItem(t, '1'); ls.removeItem(t); } catch (e) { ls = null; }
  if (ls) { try { for (var i = 0; i < ls.length; i++) { var k = ls.key(i); mem[k] = ls.getItem(k); } } catch (e) { } }
  function mt() { return w.xhs && w.xhs.miniTool; }
  function flushKey(key) {
    timers[key] = null;
    var m = mt(); if (!useXhs || !m) return;
    try {
      var p = key in mem ? m.setStorage({ key: key, data: JSON.stringify(mem[key]) }) : m.removeStorage({ key: key });
      if (p && p.catch) p.catch(function (err) { console.warn('xhs storage write failed', key, err && err.errMsg); });
    } catch (err) { console.warn('xhs storage write failed', key, err); }
  }
  function queue(key) { if (!useXhs) return; if (timers[key]) clearTimeout(timers[key]); timers[key] = setTimeout(function () { flushKey(key); }, 300); }
  function flushAll() { for (var k in timers) if (timers[k]) { clearTimeout(timers[k]); flushKey(k); } }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flushAll(); });
  w.addEventListener('pagehide', flushAll);
  w.__xhsStore = {
    get length() { return Object.keys(mem).length; },
    key: function (i) { return Object.keys(mem)[i] || null; },
    getItem: function (k) { k = String(k); return k in mem ? mem[k] : null; },
    setItem: function (k, v) { k = String(k); v = String(v); mem[k] = v; if (ls) { try { ls.setItem(k, v); } catch (e) { } } queue(k); },
    removeItem: function (k) { k = String(k); delete mem[k]; if (ls) { try { ls.removeItem(k); } catch (e) { } } queue(k); },
    clear: function () { var ks = Object.keys(mem); for (var i = 0; i < ks.length; i++) this.removeItem(ks[i]); }
  };

  function buildVersion() {
    var xhs = w.xhs, lo = xhs && xhs.launchOptions, env = lo && lo.miniToolEnv;
    var v = Number(env && env.buildVersion) || 0;
    if (v) return Promise.resolve(v);
    var m = mt();
    if (!m || typeof m.getLaunchOptions !== 'function') return Promise.resolve(0);
    return m.getLaunchOptions().then(function (o) { return Number(o && o.miniToolEnv && o.miniToolEnv.buildVersion) || 0; }, function () { return 0; });
  }
  function withTimeout(p, ms) { return Promise.race([p, new Promise(function (r) { setTimeout(function () { r(null); }, ms); })]); }

  /** resolves once the save is loaded and the window info is known (or timed out); xhs-start.js waits for it */
  w.__xhsReady = withTimeout(buildVersion().then(function (bv) {
    var m = mt(), jobs = [];
    if (m && typeof m.getWindowInfo === 'function' && Math.floor(bv / 1000) >= 9490) {
      jobs.push(m.getWindowInfo().then(function (info) { w.__xhsWindowInfo = info; }, function () { }));
    }
    if (m && typeof m.getStorage === 'function' && typeof m.getStorageInfo === 'function' && Math.floor(bv / 1000) >= STORAGE_MIN) {
      jobs.push(m.getStorageInfo().then(function (info) {
        useXhs = true;
        var keys = (info && info.keys) || [];
        return Promise.all(keys.map(function (k) {
          return m.getStorage({ key: k }).then(function (r) {
            if (!r || r.data === null || r.data === undefined) return;
            try { var v = JSON.parse(r.data); if (typeof v === 'string') { mem[k] = v; if (ls) { try { ls.setItem(k, v); } catch (e) { } } } } catch (e) { }
          }, function () { });
        })).then(function () {
          // first run on a Storage-capable client: copy what only localStorage had
          Object.keys(mem).forEach(function (k) { if (keys.indexOf(k) < 0) queue(k); });
        });
      }, function () { useXhs = false; }));
    }
    return Promise.all(jobs);
  }), 3000).then(function () {
    if (w.__xhsWindowInfo) return;
    // clients before 9.49 have no getWindowInfo: keep clear of the status bar (CSS safe area) plus one row of
    // container buttons (back / share sit in a ~44px row below the status bar)
    var probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;left:0;top:0;width:1px;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)';
    document.body.appendChild(probe);
    var cs = getComputedStyle(probe), top = parseFloat(cs.paddingTop) || 0, bottom = parseFloat(cs.paddingBottom) || 0;
    probe.parentNode.removeChild(probe);
    var W = w.innerWidth, H = w.innerHeight, row = Math.max(top, 44) + 44;
    w.__xhsWindowInfo = { fallback: true, windowWidth: W, windowHeight: H, statusBarHeight: top,
      safeArea: { left: 0, top: top, right: W, bottom: H - bottom, width: W, height: H - top - bottom },
      menuButtons: { back: null, me: null, share: { left: W - 80, top: row - 38, right: W - 8, bottom: row, width: 72, height: 32 } } };
  });
})();
