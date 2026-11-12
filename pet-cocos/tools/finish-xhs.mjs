// After the web-mobile build for Xiaohongshu (build-config-xhs.json -> build/xhs-web): make the offline mini-tool package.
// The container blocks fetch / XMLHttpRequest / WebAssembly / inline scripts and only accepts
// html, css, js, images, woff fonts and json in the zip. So this step
//  - drops the unused "proto" bundle (forest prototype art) and source maps,
//  - packs every file the engine downloads with XHR (json, atlas, bin ...) into xhs/pack-*.js (served by tools/xhs/xhs-boot.js),
//  - rewrites index.html with external scripts only, turns off the engine's WebAssembly probe,
//  - recompresses images, writes mini_tool.json (Cocos engine => high-consumption scene) and zips build/xhs-minitool.zip.
// Usage: node tools/finish-xhs.mjs   (run from pet-cocos/)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import sharp from 'sharp';

const SRC = 'build/xhs-web', OUT = 'build/xhs-minitool', ZIP = 'build/xhs-minitool.zip';
const TITLE = '灵爪守望';
const IMAGE = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);
const KEEP = new Set(['.html', '.css', '.js', '.woff', '.woff2', ...IMAGE]); // everything else (incl. .json) goes into packs
const TEXT = new Set(['.atlas', '.txt', '.plist', '.fnt', '.xml', '.csv']);
const PACK_LIMIT = 1.5 * 1048576;
const SMALL_IMAGE = 60 * 1024, MAX_FILES = 200, FILE_TARGET = 190; // upload API: at most 200 files in the zip
const MAX_UNPACKED = 10 * 1000 * 1000; // upload API: unpacked total <= 10 MB (decimal, to be safe)
const IMAGE_QUALITY = 78, DATA_PACK_RAW = 3 * 1048576;
const MB = n => (n / 1048576).toFixed(2) + ' MiB';
const posix = p => p.split(path.sep).join('/');

function walk(dir, base = dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, base, out); else if (e.isFile()) out.push(posix(path.relative(base, p)));
  }
  return out;
}
const sizeOf = dir => walk(dir).reduce((s, f) => s + fs.statSync(path.join(dir, f)).size, 0);

if (!fs.existsSync(path.join(SRC, 'index.html'))) { console.error(`missing ${SRC}/index.html; run the Cocos build with build-config-xhs.json first`); process.exit(1); }
// empty OUT but keep the folder itself (a running `redapp dev` watches it)
fs.mkdirSync(OUT, { recursive: true });
for (const e of fs.readdirSync(OUT)) fs.rmSync(path.join(OUT, e), { recursive: true, force: true });
// (fs.cpSync crashes Node 24 on Windows under non-ASCII paths, so copy by hand)
for (const f of walk(SRC)) { const d = path.join(OUT, f); fs.mkdirSync(path.dirname(d), { recursive: true }); fs.copyFileSync(path.join(SRC, f), d); }

// 1. unused bundle + junk
fs.rmSync(path.join(OUT, 'assets/proto'), { recursive: true, force: true });
for (const f of walk(OUT)) if (/\.map$|\.DS_Store$|\.wasm$/i.test(f)) fs.rmSync(path.join(OUT, f));

// 2. settings: forget the proto bundle
const settingsFile = walk(OUT).find(f => /^src\/settings(\.[0-9a-f]+)?\.json$/.test(f));
{
  const p = path.join(OUT, settingsFile), s = JSON.parse(fs.readFileSync(p, 'utf8')), a = s.assets || {};
  const drop = v => Array.isArray(v) ? v.filter(x => (x && x.bundle ? x.bundle : x) !== 'proto') : v;
  for (const k of ['projectBundles', 'remoteBundles', 'subpackages', 'preloadBundles']) if (a[k]) a[k] = drop(a[k]);
  if (a.bundleVers) delete a.bundleVers.proto;
  fs.writeFileSync(p, JSON.stringify(s));
}

// 3. engine: no WebAssembly feature probe (the container forbids compiling WASM; Spine is built as asm.js)
const ccFile = walk(OUT).find(f => /^cocos-js\/cc(\.[0-9a-f]+)?\.js$/.test(f));
{
  const p = path.join(OUT, ccFile); let js = fs.readFileSync(p, 'utf8');
  const probe = '"object"==typeof WebAssembly&&"function"==typeof WebAssembly.instantiate';
  if (!js.includes(probe)) { console.error('engine WebAssembly probe not found; check the Cocos version'); process.exit(1); }
  js = js.split(probe).join('!1');
  // battery status is a blocked device API in the container; the engine's call has no catch
  const battery = /null==(\w)\.getBattery\|\|\1\.getBattery\(\)\.then\(\(function\((\w)\)\{(\w)\._battery=\2\}\)\)/;
  if (!battery.test(js)) { console.error('engine getBattery call not found; check the Cocos version'); process.exit(1); }
  js = js.replace(battery, 'void 0');
  fs.writeFileSync(p, js);
  // the engine must be built with flags.SUPPORT_JIT=false (build-config-xhs.json): no generated code at runtime
  const jit = (js.match(/[^\w$.]Function\(/g) || []).length;
  if (jit > 1) { console.error(`engine still has ${jit} Function( calls; build with "flags": {"SUPPORT_JIT": false}`); process.exit(1); }
}
// polyfills: regenerator falls back to Function() when the strict-mode global assignment fails; core-js has an unreachable one
{
  const f = walk(OUT).find(f => /^src\/polyfills[^/]*\.js$/.test(f)), p = path.join(OUT, f); let js = fs.readFileSync(p, 'utf8');
  const a = 'Function("r","regeneratorRuntime = r")(r)', b = 'Function("return this")()';
  if (!js.includes(a) || !js.includes(b)) { console.error('polyfills: expected Function() fallbacks not found'); process.exit(1); }
  js = js.split(a).join('self.regeneratorRuntime=r').split(b).join('self');
  fs.writeFileSync(p, js);
}

// 4. entry scripts from the template's index.html
const html0 = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
const pick = re => { const m = html0.match(re); if (!m) { console.error('index.html: not found ' + re); process.exit(1); } return m[1]; };
const polyfills = pick(/src="(src\/polyfills[^"]*\.js)"/), systemjs = pick(/src="(src\/system\.bundle[^"]*\.js)"/);
const indexJs = pick(/System\.import\('\.\/(index[^']*\.js)'\)/);
const styleCss = (html0.match(/href="(style[^"]*\.css)"/) || [])[1];
const importMapFile = pick(/src="(src\/import-map[^"]*\.json)"/);
const importMap = JSON.parse(fs.readFileSync(path.join(OUT, importMapFile), 'utf8'));
const ccUrl = posix(path.normalize(path.join('src', importMap.imports.cc))); // "./../cocos-js/cc.x.js" relative to src/
if (ccUrl !== ccFile) { console.error(`import map points at ${ccUrl}, expected ${ccFile}`); process.exit(1); }
fs.rmSync(path.join(OUT, importMapFile));

// 5. images: bundle textures become WebP. An ImageAsset records its file type as an index into
//    ImageAsset.extnames ['.png','.jpg','.jpeg','.bmp','.webp',...] ("fmt":"0" png, "1" jpg, "4" webp), so the
//    bundle's import data is switched to "4" together with the files. iOS WebKit >= 604 and Android Chrome report WebP.
let imgBefore = 0, imgAfter = 0;
for (const bundle of fs.readdirSync(path.join(OUT, 'assets'))) {
  const dir = path.join(OUT, 'assets', bundle), natives = walk(dir).filter(f => /^native\/.*\.(png|jpe?g)$/i.test(f));
  if (!natives.length) continue;
  for (const f of natives) {
    const p = path.join(dir, f), buf = fs.readFileSync(p); imgBefore += buf.length;
    const webp = await sharp(buf).webp({ quality: IMAGE_QUALITY, alphaQuality: 85, effort: 6, smartSubsample: true }).toBuffer();
    fs.writeFileSync(p.replace(/\.(png|jpe?g)$/i, '.webp'), webp); fs.rmSync(p); imgAfter += webp.length;
  }
  let changed = 0;
  for (const f of walk(dir).filter(f => /\.json$/.test(f) && !/^config/.test(f))) {
    const p = path.join(dir, f), t = fs.readFileSync(p, 'utf8'), n = t.replace(/"fmt":"[012]"/g, () => (changed++, '"fmt":"4"'));
    if (n !== t) fs.writeFileSync(p, n);
  }
  if (changed !== natives.length) { console.error(`assets/${bundle}: ${natives.length} images but ${changed} ImageAsset formats switched`); process.exit(1); }
}
// loose images outside bundles (none expected besides small UI files): lossless recompress only
for (const f of walk(OUT).filter(f => /\.png$/i.test(f))) {
  const p = path.join(OUT, f), buf = fs.readFileSync(p), next = await sharp(buf).png({ compressionLevel: 9, effort: 10 }).toBuffer();
  if (next.length < buf.length) fs.writeFileSync(p, next);
}

// 6. pack downloaded data files. The upload API counts the UNPACKED size (<= 10 MB) and the number of files (<= 200):
//    data packs are stored deflated (xhs/inflate.js expands them), and the smallest textures move into image packs
//    (served as blob: URLs) until the file count fits.
const manifest = {}, packFiles = [];
fs.mkdirSync(path.join(OUT, 'xhs'), { recursive: true });
const groupOf = f => f.startsWith('assets/') ? f.split('/').slice(0, 2).join('-') : f.split('/')[0];
const dataGroups = new Map();
for (const f of walk(OUT)) {
  if (f === 'index.html' || KEEP.has(path.extname(f).toLowerCase())) continue;
  const g = groupOf(f); if (!dataGroups.has(g)) dataGroups.set(g, []); dataGroups.get(g).push(f);
}
for (const [g, files] of dataGroups) {
  let n = 0, entries = [], size = 0;
  const flush = () => {
    if (!entries.length) return;
    const name = `xhs/pack-${g}-${n++}.js`, raw = Buffer.from(JSON.stringify(entries), 'utf8');
    const z = zlib.deflateRawSync(raw, { level: 9 });
    fs.writeFileSync(path.join(OUT, name), `__xhsPackZ(${raw.length},"${z.toString('base64')}");\n`);
    for (const e of entries) manifest[e[0]] = name;
    packFiles.push(name); entries = []; size = 0;
  };
  for (const f of files.sort()) {
    const p = path.join(OUT, f), ext = path.extname(f).toLowerCase(), raw = fs.readFileSync(p);
    let entry;
    if (ext === '.json') { let data; try { data = JSON.parse(raw.toString('utf8')); } catch { data = undefined; } entry = data === undefined ? [f, 'text', raw.toString('utf8')] : [f, 'json', data]; }
    else if (TEXT.has(ext)) entry = [f, 'text', raw.toString('utf8')];
    else entry = [f, 'b64', raw.toString('base64')];
    if (size + raw.length > DATA_PACK_RAW && entries.length) flush();
    entries.push(entry); size += raw.length;
    fs.rmSync(p);
  }
  flush();
}
// image packs: smallest textures first, just enough to get under the file limit (4 = boot/start/inflate/manifest)
const images = walk(OUT).filter(f => /^assets\/[^/]+\/native\/.*\.webp$/.test(f)).map(f => ({ f, size: fs.statSync(path.join(OUT, f)).size })).sort((a, b) => a.size - b.size);
let excess = walk(OUT).length + 4 + 2 - FILE_TARGET, imgPack = 0, imgLines = [], imgSize = 0;
const flushImg = () => {
  if (!imgLines.length) return;
  const name = `xhs/pack-img-${imgPack++}.js`;
  fs.writeFileSync(path.join(OUT, name), imgLines.map(x => x.line).join('\n') + '\n');
  for (const x of imgLines) manifest[x.f] = name;
  packFiles.push(name); imgLines = []; imgSize = 0;
};
for (const { f, size } of images) {
  if (excess <= 0) break;
  if (size > SMALL_IMAGE) { console.error('cannot reach the file limit with small images only'); process.exit(1); }
  const p = path.join(OUT, f), line = `__xhsPut(${JSON.stringify(f)},"b64","${fs.readFileSync(p).toString('base64')}");`;
  if (imgSize + line.length > PACK_LIMIT && imgLines.length) { flushImg(); excess++; }
  imgLines.push({ f, line }); imgSize += line.length; fs.rmSync(p); excess--;
}
flushImg();
fs.writeFileSync(path.join(OUT, 'xhs/manifest.js'), `window.__xhsManifest=${JSON.stringify(manifest)};\n`);
fs.copyFileSync('tools/xhs/inflate.js', path.join(OUT, 'xhs/inflate.js'));
fs.copyFileSync('tools/xhs/xhs-boot.js', path.join(OUT, 'xhs/boot.js'));
fs.writeFileSync(path.join(OUT, 'xhs/start.js'), fs.readFileSync('tools/xhs/xhs-start.js', 'utf8')
  .replace("'__CC_URL__'", JSON.stringify('./' + ccFile)).replace("'__INDEX_URL__'", JSON.stringify('./' + indexJs)));

// 7. index.html: no inline scripts / handlers, relative paths only
fs.writeFileSync(path.join(OUT, 'index.html'), `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <title>${TITLE}</title>
${styleCss ? `  <link rel="stylesheet" href="./${styleCss}" />\n` : ''}  <style>
    html, body, #GameDiv { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #f9f7ec; }
    body { overscroll-behavior: none; -webkit-tap-highlight-color: transparent; -webkit-user-select: none; user-select: none; }
  </style>
</head>
<body>
  <div id="GameDiv" cc_exact_fit_screen="true">
    <div id="Cocos3dGameContainer">
      <canvas id="GameCanvas" tabindex="99"></canvas>
    </div>
  </div>
  <script src="./xhs/manifest.js"></script>
  <script src="./xhs/inflate.js"></script>
  <script src="./xhs/boot.js"></script>
  <script src="./${polyfills}"></script>
  <script src="./${systemjs}"></script>
  <script src="./xhs/start.js"></script>
</body>
</html>
`);

// 8. high-consumption mark: the Cocos engine starts and runs the whole game
fs.rmSync(path.join(OUT, 'mini_tool.json'), { force: true });
fs.writeFileSync(path.join(OUT, 'mini_tool.json'), JSON.stringify({ is_high_consumption_scene: true }) + '\n', { flag: 'wx' });

// 9. checks
const files = walk(OUT), bad = files.filter(f => !KEEP.has(path.extname(f).toLowerCase()) && f !== 'mini_tool.json');
if (bad.length) { console.error('file types not allowed in the mini-tool zip:\n  ' + bad.join('\n  ')); process.exit(1); }
const unpacked = files.reduce((t, f) => t + fs.statSync(path.join(OUT, f)).size, 0);
if (unpacked > MAX_UNPACKED) { console.error(`unpacked ${unpacked} bytes; the upload API accepts at most ${MAX_UNPACKED}`); process.exit(1); }
if (files.length > MAX_FILES) { console.error(`${files.length} files; the upload API accepts at most ${MAX_FILES}`); process.exit(1); }
const htmls = files.filter(f => f.endsWith('.html'));
if (htmls.length !== 1 || htmls[0] !== 'index.html') { console.error('expected exactly one index.html at the root, got ' + htmls.join(', ')); process.exit(1); }
for (const f of files.filter(f => /\.(js|html)$/.test(f))) {
  const t = fs.readFileSync(path.join(OUT, f), 'utf8');
  if (/https?:\/\/[^"'\s]*\.(js|css|png|jpg|woff2?)\b/.test(t) && f === 'index.html') { console.error('external reference in ' + f); process.exit(1); }
}

// 10. zip (entries are the contents of OUT, index.html at the root)
const crcTable = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = b => { let c = -1; for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const parts = [], central = []; let offset = 0;
const dosTime = 0, dosDate = (2026 - 1980) << 9 | 11 << 5 | 2;
for (const f of files.sort((a, b) => (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b)))) {
  const data = fs.readFileSync(path.join(OUT, f)), name = Buffer.from(f, 'utf8');
  const deflated = zlib.deflateRawSync(data, { level: 9 }), useDeflate = deflated.length < data.length;
  const body = useDeflate ? deflated : data, crc = crc32(data);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(useDeflate ? 8 : 0, 8);
  local.writeUInt16LE(dosTime, 10); local.writeUInt16LE(dosDate, 12); local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(body.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26); local.writeUInt16LE(0, 28);
  parts.push(local, name, body);
  const cen = Buffer.alloc(46);
  cen.writeUInt32LE(0x02014b50, 0); cen.writeUInt16LE(20, 4); cen.writeUInt16LE(20, 6); cen.writeUInt16LE(0x0800, 8); cen.writeUInt16LE(useDeflate ? 8 : 0, 10);
  cen.writeUInt16LE(dosTime, 12); cen.writeUInt16LE(dosDate, 14); cen.writeUInt32LE(crc, 16); cen.writeUInt32LE(body.length, 20); cen.writeUInt32LE(data.length, 24);
  cen.writeUInt16LE(name.length, 28); cen.writeUInt32LE(offset, 42);
  central.push(cen, name);
  offset += 30 + name.length + body.length;
}
const cenSize = central.reduce((s, b) => s + b.length, 0), end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cenSize, 12); end.writeUInt32LE(offset, 16);
fs.writeFileSync(ZIP, Buffer.concat([...parts, ...central, end]));

const zipSize = fs.statSync(ZIP).size;
console.log(`images ${MB(imgBefore)} -> ${MB(imgAfter)}; packs ${packFiles.length} (${Object.keys(manifest).length} files)`);
console.log(`xhs mini-tool: ${files.length} files, unpacked ${MB(sizeOf(OUT))}, zip ${MB(zipSize)} / 10 MiB -> ${ZIP}`);
if (zipSize > 10 * 1048576) { console.error('zip is over the 10 MiB limit'); process.exit(1); }
