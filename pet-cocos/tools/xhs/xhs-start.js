/* Xiaohongshu mini-tool start (after polyfills + SystemJS). Replaces the inline System.import of the Cocos template.
 * __CC_URL__ / __INDEX_URL__ are filled in by tools/finish-xhs.mjs. Classic script, ES2017. */
(function () {
  'use strict';
  var w = window, S = w.System;
  var CC_URL = '__CC_URL__', INDEX_URL = '__INDEX_URL__';

  function notice(text) {
    var d = document.getElementById('xhs-notice');
    if (!d) {
      d = document.createElement('div'); d.id = 'xhs-notice';
      d.style.cssText = 'position:fixed;left:10%;right:10%;top:40%;padding:16px;border-radius:12px;background:#fffaf0;color:#3a3326;' +
        'font:16px/1.6 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;text-align:center;z-index:9999;box-shadow:0 6px 24px rgba(0,0,0,.2)';
      document.body.appendChild(d);
    }
    d.textContent = text;
  }

  // The import map is not used (it would be fetched); resolve the engine module name directly.
  var proto = Object.getPrototypeOf(S), resolve = proto.resolve;
  var ccHref = new URL(CC_URL, location.href).href;
  proto.resolve = function (id, parent) { return id === 'cc' ? ccHref : resolve.call(this, id, parent); };

  // WebGL budget: drawing buffer at most 1.5x device pixels.
  var dpr = w.devicePixelRatio || 1;
  if (dpr > 1.5) { try { Object.defineProperty(w, 'devicePixelRatio', { configurable: true, get: function () { return 1.5; } }); } catch (e) { } }

  var canvas = document.getElementById('GameCanvas');
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  var lost = 0;
  canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); lost++; notice(lost > 2 ? '画面多次中断，请退出后重新打开小工具' : '画面暂时中断，正在恢复…'); });
  canvas.addEventListener('webglcontextrestored', function () { var d = document.getElementById('xhs-notice'); if (d && lost <= 2) d.parentNode.removeChild(d); });

  var probe = document.createElement('canvas');
  if (!(probe.getContext('webgl') || probe.getContext('experimental-webgl'))) { notice('当前设备不支持 WebGL，暂时无法运行这个游戏'); return; }

  // packed images: the engine's image downloader gets a blob: URL instead of the (missing) file
  function hookImages(cc) {
    var dl = cc.assetManager.downloader, table = dl._downloaders;
    ['.webp', '.png', '.jpg', '.jpeg'].forEach(function (ext) {
      var original = table[ext];
      if (typeof original !== 'function') return;
      dl.register(ext, function (url, options, onComplete) {
        if (!w.__xhsHasFile(url)) return original(url, options, onComplete);
        w.__xhsImageURL(url).then(function (blobUrl) {
          original(blobUrl, options, function (err, img) { setTimeout(function () { URL.revokeObjectURL(blobUrl); }, 0); onComplete(err, img); });
        }, function (err) { onComplete(err); });
      });
    });
  }

  Promise.resolve(w.__xhsReady).then(function () { return S.import('cc'); }).then(function (cc) {
    hookImages(cc);
    return S.import(INDEX_URL);
  }).catch(function (err) {
    console.error(err); notice('游戏加载失败，请退出后重试');
  });
})();
